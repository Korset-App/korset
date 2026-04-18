import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join as pathJoin } from 'path'
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: pathJoin(__dirname, '..', '.env.local') })
import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL
} = process.env

const CONCURRENCY = 5
const BATCH_SIZE = 100
const DRY_RUN = process.argv.includes('--dry-run')
const DATA_DIR = 'data/r2-migration'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error('Missing R2 credentials')
  process.exit(1)
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
})

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const CONTENT_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif'
}

async function verifyBucket() {
  try {
    await r2.send(new HeadBucketCommand({ Bucket: R2_BUCKET }))
    console.log(`R2 bucket "${R2_BUCKET}" accessible`)
  } catch (err) {
    console.error(`R2 bucket "${R2_BUCKET}" not accessible:`, err.message)
    process.exit(1)
  }
}

function inferSource(url) {
  if (!url) return null
  if (url.includes('openfoodfacts.org')) return 'openfoodfacts'
  if (url.includes('cdn-kaspi.kz')) return 'kaspi'
  if (url.includes('arbuz.kz')) return 'arbuz'
  if (url.includes('ean-db.com')) return 'ean-db'
  if (url.includes('/products/')) return 'local'
  if (url.includes('cdn.korset.app')) return 'r2'
  return 'other'
}

function buildR2Key(ean, type, ext) {
  return `products/${ean}/${type}.${ext}`
}

function getExtFromUrl(url) {
  if (!url) return 'jpg'
  const match = url.match(/\.(png|jpe?g|gif|webp|avif)(?:\?|$)/i)
  if (match) return match[1].toLowerCase().replace('jpeg', 'jpg')
  return 'jpg'
}

function getPublicUrl(r2Key) {
  return `${R2_PUBLIC_URL}/${r2Key}`
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function downloadImage(url, timeout = 15000) {
  if (!url) return null
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeout)
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.startsWith('image/') && !ct.startsWith('application/octet-stream')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 100) return null
    return buf
  } catch {
    return null
  }
}

async function uploadToR2(key, body, ext) {
  const ct = CONTENT_TYPES[ext] || 'image/jpeg'
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: ct
  }))
}

function alreadyOnR2(url) {
  return url && url.includes('cdn.korset.app')
}

async function migrateImage(ean, url, type) {
  if (!url || alreadyOnR2(url)) return null

  const ext = getExtFromUrl(url)
  const r2Key = buildR2Key(ean, type, ext)
  const publicUrl = getPublicUrl(r2Key)
  const source = inferSource(url)

  if (DRY_RUN) {
    console.log(`  [DRY] ${ean} ${type}: ${url.substring(0, 60)}... → ${r2Key}`)
    return { r2Key, publicUrl, source, dryRun: true }
  }

  const buf = await downloadImage(url)
  if (!buf) {
    console.log(`  [SKIP] ${ean} ${type}: download failed — ${url.substring(0, 50)}`)
    return null
  }

  try {
    await uploadToR2(r2Key, buf, ext)
    return { r2Key, publicUrl, source, size: buf.length, dryRun: false }
  } catch (err) {
    console.error(`  [ERR] ${ean} ${type}: upload failed — ${err.message}`)
    return null
  }
}

async function processProduct(product) {
  const ean = product.ean
  const updates = {}

  if (product.image_url) {
    const r = await migrateImage(ean, product.image_url, 'main')
    if (r) {
      updates.image_url = r.publicUrl
      updates.r2_key = r.r2Key
      updates.image_source = r.source
    }
  }

  if (product.image_ingredients_url) {
    const r = await migrateImage(ean, product.image_ingredients_url, 'ingredients')
    if (r) updates.image_ingredients_url = r.publicUrl
  }

  if (product.image_nutrition_url) {
    const r = await migrateImage(ean, product.image_nutrition_url, 'nutrition')
    if (r) updates.image_nutrition_url = r.publicUrl
  }

  if (product.images && Array.isArray(product.images)) {
    const migrated = []
    for (let i = 0; i < Math.min(product.images.length, 3); i++) {
      const r = await migrateImage(ean, product.images[i], `gallery-${i}`)
      if (r) migrated.push(r.publicUrl)
    }
    if (migrated.length > 0) updates.images = migrated
  }

  if (!DRY_RUN && Object.keys(updates).length > 0) {
    const { error } = await sb
      .from('global_products')
      .update(updates)
      .eq('id', product.id)

    if (error) {
      console.error(`  [DB-ERR] ${ean}: ${error.message}`)
      return { error: error.message }
    }
  }

  return updates
}

async function run() {
  console.log('═══════════════════════════════════════════')
  console.log('  R2 Image Migration — Körset')
  console.log(`  Mode:      ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`  Bucket:    ${R2_BUCKET}`)
  console.log(`  CDN URL:   ${R2_PUBLIC_URL}`)
  console.log('═══════════════════════════════════════════\n')

  await verifyBucket()

  let offset = 0
  let total = 0
  let migrated = 0
  let skipped = 0
  let failed = 0
  let alreadyR2 = 0
  const log = []

  while (true) {
    const { data, error } = await sb
      .from('global_products')
      .select('id, ean, image_url, image_ingredients_url, image_nutrition_url, images')
      .eq('is_active', true)
      .not('image_url', 'is', null)
      .range(offset, offset + BATCH_SIZE - 1)
      .order('ean')

    if (error) {
      console.error('DB query error:', error.message)
      break
    }
    if (!data || data.length === 0) break

    console.log(`\nBatch ${offset}-${offset + data.length - 1} (${data.length} products)`)

    for (let i = 0; i < data.length; i += CONCURRENCY) {
      const chunk = data.slice(i, i + CONCURRENCY)
      const results = await Promise.all(chunk.map(p => processProduct(p)))

      for (let j = 0; j < results.length; j++) {
        const r = results[j]
        const p = chunk[j]
        total++

        if (r && r.error) {
          failed++
        } else if (!r || Object.keys(r).length === 0) {
          if (alreadyOnR2(p.image_url)) {
            alreadyR2++
          } else {
            skipped++
          }
        } else {
          migrated++
          const sizeInfo = Object.entries(r)
            .filter(([k, v]) => v && typeof v === 'object' && v.size)
            .map(([k, v]) => `${k}: ${(v.size / 1024).toFixed(1)}KB`)
            .join(', ')
          console.log(`  [OK] ${p.ean} ${sizeInfo}`)
        }
        log.push({ ean: p.ean, ...r })
      }

      if (!DRY_RUN) await sleep(200)
    }

    offset += BATCH_SIZE
  }

  console.log('\n═══════════════════════════════════════════')
  console.log('  MIGRATION SUMMARY')
  console.log('═══════════════════════════════════════════')
  console.log(`  Total products with images: ${total}`)
  console.log(`  Migrated to R2:            ${migrated}`)
  console.log(`  Already on R2:             ${alreadyR2}`)
  console.log(`  Skipped (download failed): ${skipped}`)
  console.log(`  Failed (DB error):         ${failed}`)
  console.log(`  Mode:                       ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)

  if (!DRY_RUN) {
    await mkdir(DATA_DIR, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const logPath = join(DATA_DIR, `migration-${ts}.json`)
    await writeFile(logPath, JSON.stringify({ total, migrated, alreadyR2, skipped, failed, log }, null, 2))
    console.log(`  Log: ${logPath}`)
  }
  console.log('═══════════════════════════════════════════')
}

run().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
