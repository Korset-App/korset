import fs from 'node:fs'
import readline from 'node:readline'
import { finished } from 'node:stream/promises'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { buildCatalogSyncPlan } from './utils/catalog-sync-plan.mjs'

dotenv.config({ path: '.env.local', quiet: true })

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('Missing public Supabase configuration')

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const outputPath = 'scratch/catalog-v4-sync-plan.jsonl'
const tempPath = 'scratch/catalog-v4-sync-plan.tmp.jsonl'

async function* rows(path) {
  const stream = fs.createReadStream(path, { encoding: 'utf8' })
  for await (const line of readline.createInterface({ input: stream, crlfDelay: Infinity })) {
    if (line.trim()) yield JSON.parse(line)
  }
}

const sourcePhotos = new Map()
for await (const product of rows('data/semeiniy_raw_products.jsonl')) {
  if (!product.ean) continue
  const photos = sourcePhotos.get(String(product.ean)) || new Set()
  if (product.image_url) photos.add(product.image_url)
  for (const photo of product.images || []) photos.add(photo)
  sourcePhotos.set(String(product.ean), photos)
}

const localByEan = new Map()
for await (const product of rows('data/korset_master_catalog_v4_final.jsonl')) {
  if (!product.image_url || ['personal_care', 'household'].includes(product.category)) continue
  localByEan.set(String(product.ean), product)
}

fs.mkdirSync('scratch', { recursive: true })
const output = fs.createWriteStream(tempPath, { encoding: 'utf8' })
const counts = { localCandidates: localByEan.size, remoteRows: 0, remoteMissing: 0, proposedRows: 0, photo: 0, ingredients: 0, nutrition: 0, nutritionConflict: 0 }
let cursor = null

try {
  while (true) {
    const query = client.from('global_products')
      .select('ean,image_url,ingredients_raw,nutriments_json')
      .order('ean', { ascending: true })
      .limit(500)
    const { data, error } = await (cursor ? query.gt('ean', cursor) : query)
    if (error) throw error
    if (!Array.isArray(data)) throw new Error('Missing global_products page')
    if (data.length === 0) break

    for (const remote of data) {
      counts.remoteRows++
      const local = localByEan.get(String(remote.ean))
      if (!local) continue
      localByEan.delete(String(remote.ean))
      const sameEanPhoto = sourcePhotos.get(String(remote.ean))?.has(local.image_url) || false
      const plan = buildCatalogSyncPlan(local, remote, { sameEanPhoto })
      if (!plan) continue
      counts.proposedRows++
      if (plan.image_url) counts.photo++
      if (plan.ingredients_raw) counts.ingredients++
      if (plan.nutriments_json) counts.nutrition++
      if (plan.nutritionConflict) counts.nutritionConflict++
      output.write(`${JSON.stringify(plan)}\n`)
    }

    const nextCursor = String(data.at(-1).ean)
    if (cursor !== null && nextCursor <= cursor) throw new Error('Remote EAN cursor did not advance')
    cursor = nextCursor
    if (data.length < 500) break
  }

  counts.remoteMissing = localByEan.size
  output.end()
  await finished(output)
  fs.renameSync(tempPath, outputPath)
  fs.writeFileSync('scratch/catalog-v4-sync-plan-summary.json', `${JSON.stringify(counts, null, 2)}\n`)
  console.log(JSON.stringify({ outputPath, counts }))
} catch (error) {
  output.destroy()
  throw error
}
