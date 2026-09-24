#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const ARCHIVE_DIR = path.join(__dirname, '..', 'data', 'archive')
if (!fs.existsSync(ARCHIVE_DIR)) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true })
}

const DATE_STR = new Date().toISOString().slice(0, 10)
const BATCH_SIZE = 2000

const TABLES_TO_BACKUP = [
  { table: 'clean_products_v2', select: '*' },
  { table: 'clean_products_v3', select: '*' },
  { table: 'product_ean_aliases', select: '*' },
  { table: 'store_products', select: '*' },
  { table: 'global_products', select: '*' },
  { table: 'scan_events', select: '*' },
  { table: 'user_favorites', select: '*' },
  { table: 'product_correction_events', select: '*' },
  { table: 'missing_products', select: '*' },
  { table: 'external_product_cache', select: '*' }
]

async function getTableRowCount(tableName) {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })
  if (error) throw new Error(`Failed to get count for ${tableName}: ${error.message}`)
  return count || 0
}

async function exportTable(tableName, selectQuery = '*') {
  const targetFile = path.join(ARCHIVE_DIR, `${tableName}_${DATE_STR}.jsonl.gz`)
  console.log(`\n========================================`)
  console.log(`Starting export for: ${tableName}`)
  console.log(`Target archive: ${targetFile}`)

  const totalExpected = await getTableRowCount(tableName)
  console.log(`Expected rows in DB: ${totalExpected}`)

  if (totalExpected === 0) {
    console.log(`Table ${tableName} is empty. Creating empty archive...`)
    const emptyGzip = zlib.gzipSync('')
    fs.writeFileSync(targetFile, emptyGzip)
    return { table: tableName, exported: 0, expected: 0, verified: true, file: targetFile }
  }

  const gzip = zlib.createGzip({ level: 9 })
  const writeStream = fs.createWriteStream(targetFile)
  gzip.pipe(writeStream)

  let offset = 0
  let exportedCount = 0

  while (offset < totalExpected) {
    const to = Math.min(offset + BATCH_SIZE - 1, totalExpected - 1)
    const { data, error } = await supabase
      .from(tableName)
      .select(selectQuery)
      .range(offset, to)

    if (error) {
      gzip.destroy()
      writeStream.destroy()
      throw new Error(`Export error at offset ${offset} for ${tableName}: ${error.message}`)
    }

    if (!data || data.length === 0) break

    for (const row of data) {
      gzip.write(JSON.stringify(row) + '\n')
      exportedCount++
    }

    offset += data.length
    process.stdout.write(`\r[${tableName}] Exported ${exportedCount} / ${totalExpected} rows (${Math.round((exportedCount / totalExpected) * 100)}%)`)
  }

  console.log('')
  await new Promise((resolve, reject) => {
    gzip.end()
    writeStream.on('finish', resolve)
    writeStream.on('error', reject)
  })

  // VERIFICATION: Read back from .jsonl.gz and count lines
  console.log(`Verifying archive integrity for ${tableName}...`)
  const buffer = fs.readFileSync(targetFile)
  const decompressed = zlib.gunzipSync(buffer).toString('utf-8')
  const lines = decompressed.trim().split('\n').filter(Boolean)
  const verifiedCount = lines.length

  console.log(`Verification: Read ${verifiedCount} rows from archive (Expected: ${totalExpected})`)

  if (verifiedCount !== totalExpected) {
    throw new Error(`CRITICAL INTEGRITY MISMATCH for ${tableName}: expected ${totalExpected}, got ${verifiedCount} in archive!`)
  }

  const stats = fs.statSync(targetFile)
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2)
  console.log(`✓ VERIFIED: ${tableName} safely backed up (${verifiedCount} rows, ${sizeMb} MB compressed)`)

  return {
    table: tableName,
    exported: verifiedCount,
    expected: totalExpected,
    verified: true,
    file: targetFile,
    sizeMb
  }
}

async function main() {
  console.log(`Körset Legacy Database Backup to data/archive/`)
  console.log(`Connected to: ${SUPABASE_URL}`)
  console.log(`Target directory: ${ARCHIVE_DIR}\n`)

  const summary = []

  for (const item of TABLES_TO_BACKUP) {
    const res = await exportTable(item.table, item.select)
    summary.push(res)
  }

  console.log('\n========================================')
  console.log('ALL TABLES SUCCESSFULLY BACKED UP AND VERIFIED!')
  console.log('========================================')
  for (const s of summary) {
    console.log(`- ${s.table.padEnd(26)}: ${String(s.exported).padStart(7)} rows (${s.sizeMb || '0'} MB) -> ${path.basename(s.file)}`)
  }
  console.log('\nBackup step COMPLETE. Ready for Supabase cleanup.')
}

main().catch(err => {
  console.error('\nBACKUP FAILED:', err)
  process.exit(1)
})
