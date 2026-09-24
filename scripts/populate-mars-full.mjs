import fs from 'node:fs'
import readline from 'node:readline'
import crypto from 'node:crypto'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const MARS_STORE_ID = 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4'
const CATALOG_PATH = 'data/korset_master_catalog_v4_final.jsonl'
const BATCH_SIZE = 500

const SHELF_ZONES = ['A', 'B', 'C', 'D', 'E', 'F']
const SHELF_POSITIONS = ['1-1', '1-2', '1-3', '2-1', '2-2', '2-3', '3-1', '3-2', '4-1']

async function populateMarsFullCatalog() {
  console.log('=== Populating Store MARS with 100% of Catalog (58,648 items) ===')
  const startTime = Date.now()

  const rl = readline.createInterface({
    input: fs.createReadStream(CATALOG_PATH),
    crlfDelay: Infinity,
  })

  let buffer = []
  let processed = 0
  let index = 0

  for await (const line of rl) {
    if (!line.trim()) continue
    const item = JSON.parse(line)
    index++

    const price = item.specs_json?.semeiniy_price_kzt || (Math.floor(Math.random() * 80 + 15) * 50)
    const zone = SHELF_ZONES[index % SHELF_ZONES.length]
    const pos = SHELF_POSITIONS[Math.floor(index / SHELF_ZONES.length) % SHELF_POSITIONS.length]

    buffer.push({
      store_id: MARS_STORE_ID,
      global_product_id: item.id,
      ean: item.ean,
      local_name: null,
      local_sku: null,
      price_kzt: price,
      stock_status: 'in_stock',
      shelf_zone: zone,
      shelf_position: pos,
      is_promoted: false,
      is_featured: index <= 50,
      is_active: true,
    })

    if (buffer.length >= BATCH_SIZE) {
      await upsertBatch(buffer)
      processed += buffer.length
      buffer = []
      if (processed % 5000 === 0) {
        console.log(`[MARS] Upserted ${processed} products...`)
      }
    }
  }

  if (buffer.length > 0) {
    await upsertBatch(buffer)
    processed += buffer.length
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n=== Successfully populated MARS with ${processed} products in ${elapsed}s! ===`)
}

async function upsertBatch(rows, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { error } = await supabase.from('store_products').upsert(rows, {
        onConflict: 'store_id,ean',
        ignoreDuplicates: false,
      })
      if (error) {
        if (attempt === retries) throw error
        console.warn(`Retry ${attempt}/${retries} after error:`, error.message)
        await new Promise((r) => setTimeout(r, attempt * 1000))
        continue
      }
      return
    } catch (err) {
      if (attempt === retries) throw err
      console.warn(`Network retry ${attempt}/${retries}:`, err.message)
      await new Promise((r) => setTimeout(r, attempt * 1000))
    }
  }
}

populateMarsFullCatalog().catch((err) => {
  console.error('Fatal error populating MARS:', err)
  process.exit(1)
})
