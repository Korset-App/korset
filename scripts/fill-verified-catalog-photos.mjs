import fs from 'node:fs'
import readline from 'node:readline'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const apply = process.argv.includes('--apply')
const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const batchSize = Number(process.argv.find((arg) => arg.startsWith('--batch-size='))?.split('=')[1] ?? 400)
const startOffset = Number(process.argv.find((arg) => arg.startsWith('--start='))?.split('=')[1] ?? 0)
const backupPath = 'scratch/catalog-photo-sync-before.jsonl'
const progressPath = 'scratch/catalog-photo-sync-progress.jsonl'

if (!url || !key) throw new Error('Missing Supabase configuration')

async function* readJsonl(path) {
  const lines = readline.createInterface({ input: fs.createReadStream(path), crlfDelay: Infinity })
  for await (const line of lines) {
    if (line.trim()) yield JSON.parse(line)
  }
}

const sourceByEan = new Map()
for await (const product of readJsonl('data/semeiniy_raw_products.jsonl')) {
  if (product.ean && product.image_url?.startsWith('https://semeiniy.kz/wa-data/public/shop/products/')) {
    sourceByEan.set(product.ean, product.image_url)
  }
}

const candidates = []
for await (const product of readJsonl('data/korset_master_catalog_v4_final.jsonl')) {
  const sourceUrl = sourceByEan.get(product.ean)
  if (sourceUrl && product.image_url === sourceUrl && /\.(jpg|jpeg|png|webp)$/.test(sourceUrl)) {
    candidates.push({ ean: product.ean, image_url: sourceUrl })
  }
}

console.log(JSON.stringify({ candidates: candidates.length, batches: Math.ceil((candidates.length - startOffset) / batchSize), startOffset, apply }))
if (!apply) process.exit(0)

fs.mkdirSync('scratch', { recursive: true })
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
let updated = 0
let previouslyFilled = 0

for (let offset = startOffset; offset < candidates.length; offset += batchSize) {
  const batch = candidates.slice(offset, offset + batchSize)
  const { data: before, error: readError } = await client
    .from('global_products')
    .select('ean,image_url')
    .in('ean', batch.map((item) => item.ean))
  if (readError) throw readError
  if (before.length !== batch.length) throw new Error(`Missing database rows at offset ${offset}`)

  previouslyFilled += before.filter((row) => row.image_url).length
  fs.appendFileSync(backupPath, before.map((row) => JSON.stringify(row)).join('\n') + '\n')

  const { data: count, error: writeError } = await client.rpc('fn_fill_verified_catalog_photos', { p_items: batch })
  if (writeError) throw writeError
  updated += count
  fs.appendFileSync(progressPath, JSON.stringify({ offset, count, completed_at: new Date().toISOString() }) + '\n')
  console.log(JSON.stringify({ offset, count, updated }))
}

console.log(JSON.stringify({ candidates: candidates.length, updated, previouslyFilled, backupPath, progressPath }))
