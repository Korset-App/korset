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
  if (/дой[- ]?пак|пауч|pouch|флоу[- ]?пак|саше/i.test(s)) return 'pouch'
  if (/ванночк|туб|стакан|ведер|ведро/i.test(s)) return 'tub'
  return null
}

async function runApply() {
  const isLive = process.argv.includes('--live')
  const modeLabel = isLive ? '[LIVE APPLY]' : '[DRY-RUN]'

  console.log('='.repeat(70))
  console.log(` Applying Barista Ltd Enrichment to Körset Catalog`)
  console.log(` Mode: ${modeLabel}`)
  console.log('='.repeat(70))

  const jsonlFile = path.join(__dirname, '..', 'scratch', 'barista_harvested.jsonl')
  if (!fs.existsSync(jsonlFile)) {
    console.error('Missing scratch/barista_harvested.jsonl. Run harvester first.')
    process.exit(1)
  }

  const lines = fs.readFileSync(jsonlFile, 'utf-8').split('\n').filter(Boolean)
  console.log(`Loaded ${lines.length} harvested records from Barista Ltd.`)

  // Deduplicate and aggregate richest record per EAN
  const eanMap = new Map()
  for (const l of lines) {
    try {
      const p = JSON.parse(l)
      if (!p.ean || !/^\d{8,14}$/.test(p.ean)) continue

      const existing = eanMap.get(p.ean)
      if (!existing) {
        eanMap.set(p.ean, p)
      } else {
        // Pick the one with more fields populated
        const score = (item) => (item.ingredients_raw ? 3 : 0) +
                                (Object.keys(item.nutriments_json || {}).length) +
                                (item.shelf_life ? 1 : 0) +
                                (item.images?.length || 0)
        if (score(p) > score(existing)) {
          eanMap.set(p.ean, p)
        }
      }
    } catch (e) {}
  }

  console.log(`Unique valid EANs to match: ${eanMap.size}`)
  const uniqueEans = [...eanMap.keys()]

  // Batch query global_products in chunks of 500
  console.log('\nMatching against active global_products in Supabase...')
  const matchedProducts = []
  const BATCH_QUERY = 100

  for (let i = 0; i < uniqueEans.length; i += BATCH_QUERY) {
    const chunkEans = uniqueEans.slice(i, i + BATCH_QUERY)
    const { data, error } = await supabase
      .from('global_products')
      .select('id, ean, name, brand, ingredients_raw, nutriments_json, quantity, shelf_life, storage_conditions, packaging_type, manufacturer, country_of_origin, image_url, images, specs_json')
      .eq('is_active', true)
      .in('ean', chunkEans)

    if (error) {
      console.error('Error fetching global_products batch:', error.message)
      continue
    }

    if (data && data.length > 0) {
      matchedProducts.push(...data)
    }
  }

  console.log(`\nFound ${matchedProducts.length} matching active products in Körset catalog!`)

  // Plan enrichments according to Non-Destructive Invariants
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
    const freshNutr = fresh.nutriments_json || {}
    const mergedNutr = { ...currentNutr }
    let nutrChanged = false

    const nutrFields = ['calories', 'energy_kcal', 'proteins', 'fat', 'carbohydrates', 'salt', 'sodium', 'fiber']
    for (const nf of nutrFields) {
      if (currentNutr[nf] === undefined || currentNutr[nf] === null) {
        if (freshNutr[nf] !== undefined && freshNutr[nf] !== null) {
          mergedNutr[nf] = freshNutr[nf]
          nutrChanged = true
        }
      }
    }

    if (nutrChanged) {
      updates.nutriments_json = mergedNutr
      enrichedAttrs.push('nutriments_json')
      kbjuEnrichedCount++
    }

    // 3. Shelf life
    if (!current.shelf_life && fresh.shelf_life) {
      updates.shelf_life = fresh.shelf_life
      enrichedAttrs.push('shelf_life')
      shelfLifeEnrichedCount++
    }

    // 4. Storage conditions
    if (!current.storage_conditions && fresh.storage_conditions) {
      updates.storage_conditions = fresh.storage_conditions
      enrichedAttrs.push('storage_conditions')
      storageEnrichedCount++
    }

    // 5. Packaging type (must adhere to DB constraint: bottle_plastic, bottle_glass, can, tetrapak, pouch, tub)
    const normPackaging = normalizePackagingType(fresh.packaging_type)
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
    if (!current.country_of_origin && fresh.country_of_origin) {
      updates.country_of_origin = fresh.country_of_origin
      enrichedAttrs.push('country_of_origin')
      countryEnrichedCount++
    }

    // 8. Image url (only if existing is null or empty)
    if (!current.image_url && fresh.image_url) {
      updates.image_url = fresh.image_url
      enrichedAttrs.push('image_url')
    }

    if (enrichedAttrs.length > 0) {
      // Record provenance in specs_json
      const currentSpecs = current.specs_json || {}
      updates.specs_json = {
        ...currentSpecs,
        barista_enrichment: {
          matched_at: new Date().toISOString(),
          source_url: fresh.url,
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

  console.log('\n--- ENRICHMENT PLAN SUMMARY ---')
  console.log(`  Products to enrich:           ${updatePlan.length}`)
  console.log(`  - Ingredients added:          ${ingredientsEnrichedCount}`)
  console.log(`  - KBJU added/completed:       ${kbjuEnrichedCount}`)
  console.log(`  - Shelf life added:           ${shelfLifeEnrichedCount}`)
  console.log(`  - Storage conditions added:   ${storageEnrichedCount}`)
  console.log(`  - Packaging type added:       ${packagingEnrichedCount}`)
  console.log(`  - Manufacturer added:         ${manufacturerEnrichedCount}`)
  console.log(`  - Country of origin added:    ${countryEnrichedCount}`)

  console.log('\n--- SAMPLE ENRICHMENTS ---')
  for (const item of updatePlan.slice(0, 15)) {
    console.log(`  [${item.ean}] ${item.name}`)
    console.log(`    Enriched fields: [${item.enrichedAttrs.join(', ')}]`)
    if (item.updates.ingredients_raw) {
      console.log(`    + Composition: ${item.updates.ingredients_raw.slice(0, 80)}...`)
    }
    if (item.updates.nutriments_json) {
      console.log(`    + KBJU:`, item.updates.nutriments_json)
    }
  }

  // Save plan to scratch/
  const planPath = path.join(__dirname, '..', 'scratch', 'barista-enrichment-plan.json')
  fs.writeFileSync(planPath, JSON.stringify(updatePlan, null, 2), 'utf-8')
  console.log(`\nPlan saved to: scratch/barista-enrichment-plan.json`)

  if (!isLive) {
    console.log('\n' + '='.repeat(70))
    console.log(` [DRY-RUN COMPLETE] No records were modified in the database.`)
    console.log(` Run with --live to apply these enrichments to Supabase.`)
    console.log('='.repeat(70) + '\n')
    return
  }

  // LIVE EXECUTION
  console.log('\nApplying updates to Supabase in batches of 25...')
  let successCount = 0
  let failedCount = 0

  for (let i = 0; i < updatePlan.length; i++) {
    const item = updatePlan[i]
    const { error } = await supabase
      .from('global_products')
      .update(item.updates)
      .eq('id', item.id)

    if (error) {
      console.error(`  Error updating ${item.ean}: ${error.message}`)
      failedCount++
    } else {
      successCount++
    }

    if ((i + 1) % 25 === 0 || i === updatePlan.length - 1) {
      process.stdout.write(`\r  Updated: ${i + 1}/${updatePlan.length} (success: ${successCount}, failed: ${failedCount})`)
    }
  }

  console.log('\n\nEnrichment finished!')
  console.log(`  Success: ${successCount}`)
  console.log(`  Failed:  ${failedCount}`)
}

runApply().catch(console.error)
