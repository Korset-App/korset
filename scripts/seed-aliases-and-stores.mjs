import fs from 'node:fs'
import readline from 'node:readline'
import crypto from 'node:crypto'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase configuration in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const CATALOG_PATH = 'data/korset_master_catalog_v4_final.jsonl'
const BATCH_SIZE = 500

const STORES = {
  bereke: {
    id: '5a4eca3f-860c-4150-8b69-0730d5e5ac90',
    name: 'Береке',
    targetCount: 15000,
    categories: null, // all FMCG
  },
  mars: {
    id: 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4',
    name: 'MARS',
    targetCount: 12500,
    categories: null, // all FMCG
  },
  nurly: {
    id: 'be1179bd-23f9-4967-9d90-41f6a4fba4a9',
    name: 'Нұрлы',
    targetCount: 4000,
    categories: ['dairy_eggs', 'bread', 'water_beverages', 'tea_coffee', 'sweets', 'snacks', 'grocery', 'personal_care'],
  },
  kalina: {
    id: 'c7212b2f-2d3c-4d6c-8465-58d974d79e7f',
    name: 'Калина',
    targetCount: 3500,
    categories: ['dairy_eggs', 'bread', 'water_beverages', 'tea_coffee', 'sweets', 'snacks', 'grocery', 'household'],
  },
}

async function insertWithRetry(table, rows, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { error } = await supabase.from(table).insert(rows)
      if (error) {
        if (attempt === retries) throw error
        console.warn(`[${table}] Retry ${attempt}/${retries} after error:`, error.message)
        await new Promise((r) => setTimeout(r, attempt * 1000))
        continue
      }
      return
    } catch (err) {
      if (attempt === retries) throw err
      console.warn(`[${table}] Network retry ${attempt}/${retries} after:`, err.message)
      await new Promise((r) => setTimeout(r, attempt * 1000))
    }
  }
}

async function run() {
  const startTime = Date.now()
  console.log('=== Step 1: Loading catalog products from disk ===')

  const rl = readline.createInterface({
    input: fs.createReadStream(CATALOG_PATH),
    crlfDelay: Infinity,
  })

  const allProducts = []
  const primaryEanSet = new Set()

  for await (const line of rl) {
    if (!line.trim()) continue
    const item = JSON.parse(line)
    allProducts.push(item)
    primaryEanSet.add(item.ean)
  }

  console.log(`Loaded ${allProducts.length} products.`)

  // Step 2: Seed product_ean_aliases
  console.log('\n=== Step 2: Seeding product_ean_aliases ===')
  const aliasRows = []
  const seenAliasEans = new Set()

  for (const item of allProducts) {
    if (Array.isArray(item.alternate_eans)) {
      for (const altEan of item.alternate_eans) {
        if (
          altEan !== item.ean &&
          !primaryEanSet.has(altEan) &&
          !seenAliasEans.has(altEan) &&
          /^\d{8,14}$/.test(altEan)
        ) {
          seenAliasEans.add(altEan)
          aliasRows.push({
            id: crypto.randomUUID(),
            ean: altEan,
            global_product_id: item.id,
            status: 'trusted',
            source: 'external_exact_barcode',
            confidence: 100,
            evidence_json: {
              primary_ean: item.ean,
              product_name: item.name,
              retailer: 'semeiniy',
            },
            is_active: true,
          })
        }
      }
    }
  }

  console.log(`Prepared ${aliasRows.length} valid unique scannable barcode aliases.`)
  let insertedAliases = 0

  for (let i = 0; i < aliasRows.length; i += BATCH_SIZE) {
    const chunk = aliasRows.slice(i, i + BATCH_SIZE)
    await insertWithRetry('product_ean_aliases', chunk)
    insertedAliases += chunk.length
    console.log(`[product_ean_aliases] Inserted ${insertedAliases} / ${aliasRows.length}`)
  }
  console.log(`All ${insertedAliases} barcode aliases seeded successfully!`)

  // Step 3: Seed store_products
  console.log('\n=== Step 3: Populating store_products for Demo Stores ===')
  const SHELF_ZONES = ['A', 'B', 'C', 'D', 'E', 'F']
  const SHELF_POSITIONS = ['1-1', '1-2', '1-3', '2-1', '2-2', '2-3', '3-1', '3-2', '4-1']

  for (const [storeKey, store] of Object.entries(STORES)) {
    console.log(`Preparing catalog for ${store.name} (${storeKey})...`)

    let candidates = allProducts.filter((p) => {
      if (store.categories && !store.categories.includes(p.category)) return false
      return true
    })

    // Sort: items with photos and real prices first
    candidates.sort((a, b) => {
      const aScore = (a.image_url ? 10 : 0) + (a.specs_json?.semeiniy_price_kzt ? 5 : 0)
      const bScore = (b.image_url ? 10 : 0) + (b.specs_json?.semeiniy_price_kzt ? 5 : 0)
      return bScore - aScore
    })

    const selected = candidates.slice(0, store.targetCount)
    console.log(`Selected ${selected.length} products for ${store.name}. Inserting...`)

    const storeProductRows = selected.map((item, idx) => {
      const price = item.specs_json?.semeiniy_price_kzt || (Math.floor(Math.random() * 80 + 15) * 50)
      const zone = SHELF_ZONES[idx % SHELF_ZONES.length]
      const pos = SHELF_POSITIONS[Math.floor(idx / SHELF_ZONES.length) % SHELF_POSITIONS.length]

      return {
        id: crypto.randomUUID(),
        store_id: store.id,
        global_product_id: item.id,
        ean: item.ean,
        local_name: null,
        local_sku: null,
        price_kzt: price,
        stock_status: 'in_stock',
        shelf_zone: zone,
        shelf_position: pos,
        is_promoted: false,
        is_featured: idx < 12,
        is_active: true,
      }
    })

    let insertedStore = 0
    for (let i = 0; i < storeProductRows.length; i += BATCH_SIZE) {
      const chunk = storeProductRows.slice(i, i + BATCH_SIZE)
      await insertWithRetry('store_products', chunk)
      insertedStore += chunk.length
    }
    console.log(`[store_products] Seeded ${insertedStore} products for ${store.name}.`)
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n=== All Aliases & Store Products Seeded in ${duration}s! ===`)
}

run().catch((err) => {
  console.error('Fatal error in seeding aliases/stores:', err)
  process.exit(1)
})
