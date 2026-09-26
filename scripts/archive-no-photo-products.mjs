import fs from 'node:fs'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const backupPath = 'scratch/catalog-no-photo-archive-before.jsonl'
const progressPath = 'scratch/catalog-no-photo-archive-progress.jsonl'
const apply = process.argv.includes('--apply')
const batchSize = Number(process.argv.find((arg) => arg.startsWith('--batch-size='))?.split('=')[1] ?? 200)
const startOffset = Number(process.argv.find((arg) => arg.startsWith('--start='))?.split('=')[1] ?? 0)
const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Missing Supabase configuration')

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
fs.mkdirSync('scratch', { recursive: true })

let rows
if (fs.existsSync(backupPath)) {
  rows = fs.readFileSync(backupPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
} else {
  rows = []
  let afterEan = null
  while (true) {
    let query = client
      .from('global_products')
      .select('ean,name,category,is_active,image_url')
      .eq('is_active', true)
      .is('image_url', null)
      .order('ean')
      .limit(500)
    if (afterEan) query = query.gt('ean', afterEan)
    const { data, error } = await query
    if (error) throw error
    rows.push(...data)
    if (data.length < 500) break
    afterEan = data.at(-1).ean
  }
  fs.writeFileSync(backupPath, rows.map((row) => JSON.stringify(row)).join('\n') + '\n')
}

if (rows.some((row) => !row.is_active || row.image_url !== null)) {
  throw new Error('Backup contains a product that is not active without a photo')
}
console.log(JSON.stringify({ candidates: rows.length, backupPath, apply }))
if (!apply) process.exit(0)

const completed = new Set(
  fs.existsSync(progressPath)
    ? fs.readFileSync(progressPath, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line).offset)
    : []
)
let archived = 0
for (let offset = startOffset; offset < rows.length; offset += batchSize) {
  if (completed.has(offset)) continue
  const batch = rows.slice(offset, offset + batchSize)
  const { data, error } = await client
    .from('global_products')
    .update({ is_active: false })
    .eq('is_active', true)
    .is('image_url', null)
    .in('ean', batch.map((row) => row.ean))
    .select('ean')
  if (error) throw new Error(`Batch ${offset}: ${error.message}`)
  archived += data.length
  fs.appendFileSync(progressPath, JSON.stringify({ offset, archived: data.length, completed_at: new Date().toISOString() }) + '\n')
  console.log(JSON.stringify({ offset, archived: data.length }))
}
console.log(JSON.stringify({ candidates: rows.length, archivedThisRun: archived, backupPath, progressPath }))
