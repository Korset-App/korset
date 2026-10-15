import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function validateKbju(nutriments) {
  if (!nutriments) return null
  const kcal = nutriments.energy_kcal_100g
  const p = nutriments.proteins_100g || 0
  const f = nutriments.fat_100g || 0
  const c = nutriments.carbohydrates_100g || 0

  if (kcal === null || kcal === undefined || isNaN(kcal)) return null
  if (kcal < 0 || kcal > 950) return null
  if (p < 0 || f < 0 || c < 0) return null
  if (p + f + c > 102) return null

  return {
    energy_kcal_100g: Math.round(kcal * 10) / 10,
    proteins_100g: Math.round(p * 10) / 10,
    fat_100g: Math.round(f * 10) / 10,
    carbohydrates_100g: Math.round(c * 10) / 10
  }
}

// Heuristic to detect marketing text accidentally stored as ingredients in previous runs
function isMarketingText(text) {
  if (!text) return true
  const lower = text.toLowerCase()
  if (lower.startsWith('входят ') || lower.startsWith('это ') || lower.startsWith('на основе ')) return true
  if (lower.includes('насыщенный и терпкий бульон') || lower.includes('за остроту блюда отвечает')) return true
  if (lower.includes('легко создавать сытные супы') || lower.includes('добавьте лапшу и специи')) return true
  return false
}

async function runApply() {
  const isLive = process.argv.includes('--live')
  const modeLabel = isLive ? '[LIVE APPLY]' : '[DRY-RUN]'

  console.log('='.repeat(70))
  console.log(` Applying Korfood.ru Asian Grocery Enrichment to Körset Catalog`)
  console.log(` Mode: ${modeLabel}`)
  console.log('='.repeat(70))

  const jsonlFile = path.join(__dirname, '..', 'scratch', 'korfood_harvested.jsonl')
  if (!fs.existsSync(jsonlFile)) {
    console.error('Missing scratch/korfood_harvested.jsonl.')
    process.exit(1)
  }

  const lines = fs.readFileSync(jsonlFile, 'utf-8').split('\n').filter(Boolean)
  console.log(`Loaded ${lines.length} harvested records from Korfood.`)

  const eanMap = new Map()
  for (const l of lines) {
    try {
      const p = JSON.parse(l)
      if (p.ean && /^\d{8,14}$/.test(p.ean)) {
        const existing = eanMap.get(p.ean)
        if (!existing) {
          eanMap.set(p.ean, p)
        } else {
          // Keep richest record
          const score = (x) => (x.ingredients_raw ? 3 : 0) + (x.nutriments_json ? 2 : 0) + (x.shelf_life ? 1 : 0)
          if (score(p) > score(existing)) {
            eanMap.set(p.ean, p)
          }
        }
      }
    } catch {}
  }

  console.log(`Unique valid EANs to match: ${eanMap.size}`)
  const uniqueEans = [...eanMap.keys()]

  // Batch query global_products in chunks of 200
  const matchedProducts = []
  const BATCH_SIZE = 200

  for (let i = 0; i < uniqueEans.length; i += BATCH_SIZE) {
    const chunk = uniqueEans.slice(i, i + BATCH_SIZE)
    const { data, error } = await supabase
      .from('global_products')
      .select('id, ean, name, brand, ingredients_raw, nutriments_json, quantity, shelf_life, storage_conditions, packaging_type, country_of_origin, specs_json')
      .eq('is_active', true)
      .in('ean', chunk)

    if (error) {
      console.error('Error fetching global_products chunk:', error.message)
      continue
    }
    if (data && data.length > 0) {
      matchedProducts.push(...data)
    }
  }

  console.log(`\nFound ${matchedProducts.length} matching active products in Körset catalog!`)
  if (matchedProducts.length === 0) {
    console.log('No matching products found.')
    return
  }

  const updatePlan = []

  let ingredientsEnrichedCount = 0
  let kbjuEnrichedCount = 0
  let shelfLifeEnrichedCount = 0
  let storageEnrichedCount = 0
  let packagingEnrichedCount = 0
  let countryEnrichedCount = 0

  for (const current of matchedProducts) {
    const fresh = eanMap.get(current.ean)
    if (!fresh) continue

    const updates = {}
    const enrichedAttrs = []

    // 1. Ingredients: fill if empty OR if current is marketing description
    const currentNeedsIng = !current.ingredients_raw || current.ingredients_raw.trim().length === 0 || isMarketingText(current.ingredients_raw)
    if (currentNeedsIng && fresh.ingredients_raw && !isMarketingText(fresh.ingredients_raw)) {
      updates.ingredients_raw = fresh.ingredients_raw
      enrichedAttrs.push('ingredients_raw')
      ingredientsEnrichedCount++
    }

    // 2. Nutriments (KBJU): fill if empty and passes physical validation
    const currentNutr = current.nutriments_json || {}
    const hasExistingNutr = currentNutr.energy_kcal_100g || currentNutr.proteins_100g || currentNutr.fat_100g || currentNutr.carbohydrates_100g
    if (!hasExistingNutr && fresh.nutriments_json) {
      const validNutr = validateKbju(fresh.nutriments_json)
      if (validNutr) {
        updates.nutriments_json = validNutr
        enrichedAttrs.push('nutriments_json')
        kbjuEnrichedCount++
      }
    }

    // 3. Shelf life: fill if empty
    if (!current.shelf_life && fresh.shelf_life) {
      updates.shelf_life = fresh.shelf_life
      enrichedAttrs.push('shelf_life')
      shelfLifeEnrichedCount++
    }

    // 4. Storage conditions: fill if empty
    if (!current.storage_conditions && fresh.storage_conditions) {
      updates.storage_conditions = fresh.storage_conditions
      enrichedAttrs.push('storage_conditions')
      storageEnrichedCount++
    }

    // 5. Packaging type: fill if empty
    if (!current.packaging_type && fresh.packaging_type) {
      updates.packaging_type = fresh.packaging_type
      enrichedAttrs.push('packaging_type')
      packagingEnrichedCount++
    }

    // 6. Country of origin: fill if empty
    if (!current.country_of_origin && fresh.country_of_origin) {
      updates.country_of_origin = fresh.country_of_origin
      enrichedAttrs.push('country_of_origin')
      countryEnrichedCount++
    }

    if (enrichedAttrs.length > 0) {
      const currentSpecs = current.specs_json || {}
      updates.specs_json = {
        ...currentSpecs,
        korfood_enrichment: {
          matched_at: new Date().toISOString(),
          source_url: fresh.url,
          korfood_name: fresh.name,
          attributes_enriched: enrichedAttrs
        }
      }

      updatePlan.push({
        id: current.id,
        ean: current.ean,
        name: current.name,
        updates,
        enrichedAttrs
      })
    }
  }

  console.log(`\n--- ENRICHMENT PLAN SUMMARY ---`)
  console.log(`Total products to be updated: ${updatePlan.length} of ${matchedProducts.length}`)
  console.log(`  + Ingredients enriched:      ${ingredientsEnrichedCount}`)
  console.log(`  + KBJU enriched:             ${kbjuEnrichedCount}`)
  console.log(`  + Shelf life enriched:       ${shelfLifeEnrichedCount}`)
  console.log(`  + Storage conditions:        ${storageEnrichedCount}`)
  console.log(`  + Packaging type:            ${packagingEnrichedCount}`)
  console.log(`  + Country enriched:          ${countryEnrichedCount}`)

  console.log('\n--- SAMPLE UPDATES (first 10) ---')
  updatePlan.slice(0, 10).forEach((p, idx) => {
    console.log(`\n[${idx + 1}] [EAN: ${p.ean}] "${p.name}"`)
    console.log(`    Enriched fields: ${p.enrichedAttrs.join(', ')}`)
    if (p.updates.ingredients_raw) {
      console.log(`    Ing: "${p.updates.ingredients_raw.slice(0, 90)}..."`)
    }
    if (p.updates.nutriments_json) {
      console.log(`    KBJU:`, p.updates.nutriments_json)
    }
    if (p.updates.shelf_life) {
      console.log(`    Shelf: ${p.updates.shelf_life}`)
    }
  })

  if (!isLive) {
    console.log('\n' + '='.repeat(70))
    console.log(' [DRY-RUN COMPLETE] No changes were written to Supabase.')
    console.log(' To apply live updates to the database, run:')
    console.log('   node scripts/apply-korfood-enrichment.mjs --live')
    console.log('='.repeat(70))
    return
  }

  // Live execution
  console.log('\n' + '='.repeat(70))
  console.log(' [LIVE APPLY] Executing updates against Supabase...')
  console.log('='.repeat(70))

  let successCount = 0
  let errorCount = 0

  for (const item of updatePlan) {
    const { error: upErr } = await supabase
      .from('global_products')
      .update(item.updates)
      .eq('id', item.id)

    if (upErr) {
      console.error(`Failed to update ${item.ean} (${item.id}):`, upErr.message)
      errorCount++
    } else {
      successCount++
    }
  }

  console.log(`\nSuccessfully updated ${successCount} products in Supabase (${errorCount} errors).`)
}

runApply().catch(err => {
  console.error('Apply script failed:', err)
  process.exit(1)
})
