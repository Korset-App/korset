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

function normalizePackagingType(raw) {
  if (!raw) return null
  const s = raw.toLowerCase()
  if (/стекл/i.test(s)) return 'bottle_glass'
  if (/пэт|pet|пластик.*бутыл|бутыл.*пластик/i.test(s)) return 'bottle_plastic'
  if (/жест|ж\/б|железн/i.test(s)) return 'can'
  if (/тетра|tetra/i.test(s)) return 'tetrapak'
  if (/пакет|подушк|дой[- ]?пак|пауч|pouch|флоу[- ]?пак|саше/i.test(s)) return 'pouch'
  if (/ведро|ванночк|туб|стакан/i.test(s)) return 'tub'
  return null
}

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

async function runApply() {
  const isLive = process.argv.includes('--live')
  const modeLabel = isLive ? '[LIVE APPLY]' : '[DRY-RUN]'

  console.log('='.repeat(70))
  console.log(` Applying Rusprod / MIRFOODS Enrichment to Körset Catalog`)
  console.log(` Mode: ${modeLabel}`)
  console.log('='.repeat(70))

  const jsonlFile = path.join(__dirname, '..', 'scratch', 'rusprod_harvested.jsonl')
  if (!fs.existsSync(jsonlFile)) {
    console.error('Missing scratch/rusprod_harvested.jsonl. Run harvester first.')
    process.exit(1)
  }

  const lines = fs.readFileSync(jsonlFile, 'utf-8').split('\n').filter(Boolean)
  console.log(`Loaded ${lines.length} harvested records from Rusprod.`)

  const eanMap = new Map()
  for (const l of lines) {
    try {
      const p = JSON.parse(l)
      if (p.ean && /^\d{8,14}$/.test(p.ean)) {
        eanMap.set(p.ean, p)
      }
    } catch {}
  }

  console.log(`Unique valid EANs to match: ${eanMap.size}`)
  const uniqueEans = [...eanMap.keys()]

  // Batch query global_products
  const { data: matchedProducts, error } = await supabase
    .from('global_products')
    .select('id, ean, name, brand, ingredients_raw, nutriments_json, quantity, shelf_life, storage_conditions, packaging_type, manufacturer, country_of_origin, specs_json')
    .eq('is_active', true)
    .in('ean', uniqueEans)

  if (error) {
    console.error('Error fetching global_products batch:', error.message)
    process.exit(1)
  }

  console.log(`\nFound ${matchedProducts?.length || 0} matching active products in Körset catalog!`)
  if (!matchedProducts || matchedProducts.length === 0) {
    console.log('No products to enrich.')
    return
  }

  const updatePlan = []

  let ingredientsEnrichedCount = 0
  let kbjuEnrichedCount = 0
  let shelfLifeEnrichedCount = 0
  let storageEnrichedCount = 0
  let packagingEnrichedCount = 0
  let manufacturerEnrichedCount = 0
  let countryEnrichedCount = 0

  for (const current of matchedProducts) {
    const fresh = eanMap.get(current.ean)
    if (!fresh) continue

    const updates = {}
    const enrichedAttrs = []

    // 1. Ingredients: fill if empty
    if ((!current.ingredients_raw || current.ingredients_raw.trim().length === 0) && fresh.ingredients_raw) {
      updates.ingredients_raw = fresh.ingredients_raw
      enrichedAttrs.push('ingredients_raw')
      ingredientsEnrichedCount++
    }

    // 2. Nutriments (KBJU): fill or merge missing values
    const currentNutr = current.nutriments_json || {}
    const freshNutr = validateKbju(fresh.nutriments_json)
    if (freshNutr) {
      const hasExistingNutr = currentNutr.energy_kcal_100g || currentNutr.proteins_100g || currentNutr.fat_100g || currentNutr.carbohydrates_100g
      if (!hasExistingNutr) {
        updates.nutriments_json = freshNutr
        enrichedAttrs.push('nutriments_json')
        kbjuEnrichedCount++
      }
    }

    // 3. Shelf life
    if (!current.shelf_life && fresh.shelf_life_months) {
      const shelfText = `${fresh.shelf_life_months} месяцев`
      updates.shelf_life = shelfText
      enrichedAttrs.push('shelf_life')
      shelfLifeEnrichedCount++
    }

    // 4. Storage conditions
    if (!current.storage_conditions && fresh.storage_conditions) {
      updates.storage_conditions = fresh.storage_conditions
      enrichedAttrs.push('storage_conditions')
      storageEnrichedCount++
    }

    // 5. Packaging type (must adhere to DB constraint)
    const normPackaging = normalizePackagingType(fresh.packaging_raw)
    if (!current.packaging_type && normPackaging) {
      updates.packaging_type = normPackaging
      enrichedAttrs.push('packaging_type')
      packagingEnrichedCount++
    }

    // 6. Manufacturer
    if (!current.manufacturer && fresh.manufacturer) {
      updates.manufacturer = fresh.manufacturer
      enrichedAttrs.push('manufacturer')
      manufacturerEnrichedCount++
    }

    // 7. Country of origin
    if (!current.country_of_origin) {
      updates.country_of_origin = 'Россия'
      enrichedAttrs.push('country_of_origin')
      countryEnrichedCount++
    }

    if (enrichedAttrs.length > 0) {
      // Record provenance & extra manufacturing attributes in specs_json
      const currentSpecs = current.specs_json || {}
      updates.specs_json = {
        ...currentSpecs,
        rusprod_enrichment: {
          matched_at: new Date().toISOString(),
          source: 'online.rusprod.ru',
          cooking_instructions: fresh.cooking_instructions || null,
          manufacturer_address: fresh.manufacturer_address || null,
          certificate: fresh.certificate || null,
          standard: fresh.standard || null,
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
  console.log(`  + Manufacturer enriched:     ${manufacturerEnrichedCount}`)
  console.log(`  + Country enriched:          ${countryEnrichedCount}`)

  console.log('\n--- SAMPLE UPDATES ---')
  updatePlan.forEach((p, idx) => {
    console.log(`\n[${idx + 1}] [EAN: ${p.ean}] "${p.name}"`)
    console.log(`    Enriched fields: ${p.enrichedAttrs.join(', ')}`)
    if (p.updates.ingredients_raw) {
      console.log(`    Ing: "${p.updates.ingredients_raw.slice(0, 100)}..."`)
    }
    if (p.updates.nutriments_json) {
      console.log(`    KBJU:`, p.updates.nutriments_json)
    }
    if (p.updates.shelf_life) {
      console.log(`    Shelf: ${p.updates.shelf_life}`)
    }
    if (p.updates.packaging_type) {
      console.log(`    Packaging: ${p.updates.packaging_type}`)
    }
    if (p.updates.manufacturer) {
      console.log(`    Manufacturer: ${p.updates.manufacturer}`)
    }
  })

  if (!isLive) {
    console.log('\n' + '='.repeat(70))
    console.log(' [DRY-RUN COMPLETE] No changes were written to Supabase.')
    console.log(' To apply live updates to the database, run:')
    console.log('   node scripts/apply-rusprod-enrichment.mjs --live')
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
