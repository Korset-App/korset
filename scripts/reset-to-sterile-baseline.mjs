import fs from 'node:fs'
import readline from 'node:readline'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const RAW_PATH = 'data/semeiniy_raw_products.jsonl'
const FINAL_PATH = 'data/korset_master_catalog_v4_final.jsonl'
const STERILE_PATH = 'data/korset_master_catalog_v4_sterile.jsonl'
const BATCH_SIZE = 400

async function main() {
  console.log('=== Step 1: Loading raw Semeiniy ingredients mapping ===')
  const rawMap = new Map()
  const rawRl = readline.createInterface({
    input: fs.createReadStream(RAW_PATH),
    crlfDelay: Infinity,
  })

  for await (const line of rawRl) {
    if (!line.trim()) continue
    const item = JSON.parse(line)
    if (item.ean) {
      rawMap.set(item.ean, {
        ingredients_raw: item.ingredients_raw || null,
        ingredients_kz: item.ingredients_kz || null,
        description: item.description || null,
        price: item.price_kzt || null,
      })
    }
  }
  console.log(`Loaded ${rawMap.size} raw products from Semeiniy.`)

  console.log('\n=== Step 2: Sanitizing catalog into sterile baseline ===')
  const finalRl = readline.createInterface({
    input: fs.createReadStream(FINAL_PATH),
    crlfDelay: Infinity,
  })

  const sterileOut = fs.createWriteStream(STERILE_PATH, { flags: 'w' })
  const sterileList = []

  for await (const line of finalRl) {
    if (!line.trim()) continue
    const item = JSON.parse(line)

    const raw = rawMap.get(item.ean)
    const price = item.specs_json?.semeiniy_price_kzt || raw?.price || null

    // Complete sterilization: remove ANY borrowed archive attributes
    const sterileItem = {
      id: item.id,
      ean: item.ean,
      alternate_eans: item.alternate_eans || [item.ean],
      name: item.name,
      name_kz: null,
      brand: item.brand || null,
      category: item.category,
      subcategory: item.subcategory || null,
      quantity: item.quantity || null,
      image_url: item.image_url,
      images: item.images || (item.image_url ? [item.image_url] : []),
      image_ingredients_url: item.image_ingredients_url || null,
      r2_key: item.r2_key || (item.ean ? `products/${item.ean}/front.webp` : null),
      // Only keep authentic text from Semeiniy raw cards
      ingredients_raw: raw?.ingredients_raw || null,
      ingredients_kz: raw?.ingredients_kz || null,
      description: raw?.description || null,
      // Wipe all legacy archive attributes
      nutriments_json: {},
      allergens_json: [],
      diet_tags_json: [],
      additives_tags_json: [],
      halal_status: 'unknown',
      halal_certifier: null,
      halal_notes: null,
      nutriscore: null,
      nova_group: null,
      manufacturer: null,
      country_of_origin: null,
      packaging_type: null,
      fat_percent: null,
      shelf_life: null,
      storage_conditions: null,
      cooking_instructions: null,
      specs_json: {
        semeiniy_price_kzt: price,
      },
      data_quality_score: 45,
      source_primary: 'kz_verified',
      source_confidence: 95,
      is_verified: true,
      needs_review: false,
      is_active: true,
    }

    sterileOut.write(JSON.stringify(sterileItem) + '\n')
    sterileList.push(sterileItem)
  }
  sterileOut.end()
  console.log(`Wrote ${sterileList.length} sanitized products to ${STERILE_PATH}.`)

  // Step 3: Overwrite korset_master_catalog_v4_final.jsonl
  fs.copyFileSync(STERILE_PATH, FINAL_PATH)
  console.log(`Replaced ${FINAL_PATH} with 100% sterile baseline!`)

  // Step 4: Batch update global_products in Supabase
  console.log('\n=== Step 3: Updating Supabase global_products ===')
  const startTime = Date.now()
  let processed = 0

  for (let i = 0; i < sterileList.length; i += BATCH_SIZE) {
    const chunk = sterileList.slice(i, i + BATCH_SIZE)
    await upsertBatch('global_products', chunk, 'ean')
    processed += chunk.length
    if (processed % 5000 === 0 || processed === sterileList.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`[global_products] Reset ${processed} / ${sterileList.length} rows (${elapsed}s)`)
    }
  }

  console.log('\n=== Complete! Baseline is 100% sterile and clean! ===')
}

async function upsertBatch(table, rows, onConflict, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { error } = await supabase.from(table).upsert(rows, {
        onConflict,
        ignoreDuplicates: false,
      })
      if (error) {
        if (attempt === retries) throw error
        console.warn(`[${table}] Retry ${attempt}/${retries}:`, error.message)
        await new Promise((r) => setTimeout(r, attempt * 1000))
        continue
      }
      return
    } catch (err) {
      if (attempt === retries) throw err
      console.warn(`[${table}] Network retry ${attempt}/${retries}:`, err.message)
      await new Promise((r) => setTimeout(r, attempt * 1000))
    }
  }
}

main().catch((err) => {
  console.error('Fatal error during reset:', err)
  process.exit(1)
})
