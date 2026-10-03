import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import readline from 'readline'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  const isLive = process.argv.includes('--live')
  const modeLabel = isLive ? '[LIVE APPLY]' : '[DRY-RUN]'

  console.log('='.repeat(70))
  console.log(' Applying Arbuz KZ Residual Enrichment to Körset Active Catalog')
  console.log(` Mode: ${modeLabel}`)
  console.log('='.repeat(70))

  const catalogFile = path.join(__dirname, '..', 'data', 'arbuz_enriched_catalog.jsonl')
  if (!fs.existsSync(catalogFile)) {
    console.error('Missing data/arbuz_enriched_catalog.jsonl')
    process.exit(1)
  }

  // 1. Load valid GS1 EANs from Arbuz
  console.log('\nLoading Arbuz catalog...')
  const fileStream = fs.createReadStream(catalogFile)
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity })
  const arbuzMap = new Map()

  for await (const line of rl) {
    if (!line.trim()) continue
    try {
      const item = JSON.parse(line)
      const code = String(item.ean || item.barcode || '').trim()
      if (/^\d{8}$|^\d{12,14}$/.test(code) && !code.startsWith('20') && !code.startsWith('21')) {
        arbuzMap.set(code, item)
      }
    } catch {}
  }
  console.log(`Loaded ${arbuzMap.size} unique valid GS1 EANs from Arbuz.`)

  // 2. Query matching active products from Supabase
  console.log('\nQuerying active products in Supabase in chunks of 100...')
  const allEans = [...arbuzMap.keys()]
  const matchedProducts = []

  for (let i = 0; i < allEans.length; i += 100) {
    const chunk = allEans.slice(i, i + 100)
    const { data, error } = await supabase
      .from('global_products')
      .select('id, ean, name, brand, ingredients_raw, nutriments_json, shelf_life, storage_conditions, country_of_origin, specs_json')
      .eq('is_active', true)
      .in('ean', chunk)

    if (error) {
      console.error(`Error querying batch ${i}:`, error.message)
      continue
    }
    if (data && data.length > 0) {
      matchedProducts.push(...data)
    }
  }

  console.log(`Found ${matchedProducts.length} matching active products in Körset catalog!`)

  // 3. Plan enrichments according to Non-Destructive Invariants
  const updatePlan = []
  let ingCount = 0
  let kbjuCount = 0
  let shelfCount = 0
  let storageCount = 0
  let countryCount = 0

  for (const current of matchedProducts) {
    const fresh = arbuzMap.get(current.ean)
    if (!fresh) continue

    const updates = {}
    const enrichedAttrs = []

    // 1. Ingredients: fill if empty
    if ((!current.ingredients_raw || current.ingredients_raw.trim().length === 0) && fresh.ingredients_raw && fresh.ingredients_raw.trim().length > 5) {
      updates.ingredients_raw = fresh.ingredients_raw.trim().replace(/,+$/, '')
      enrichedAttrs.push('ingredients_raw')
      ingCount++
    }

    // 2. Nutriments (KBJU): fill or merge missing values
    const currentNutr = current.nutriments_json || {}
    const freshNutr = fresh.nutriments_json || {}
    const hasCurrentEnergy = currentNutr.calories !== undefined || currentNutr.energy_kcal !== undefined
    const hasCurrentProtein = currentNutr.proteins !== undefined || currentNutr.protein_100g !== undefined
    const hasCurrentFat = currentNutr.fat !== undefined || currentNutr.fat_100g !== undefined
    const hasCurrentCarbs = currentNutr.carbohydrates !== undefined || currentNutr.carbohydrates_100g !== undefined

    const hasFreshEnergy = freshNutr.calories !== undefined || freshNutr.energy_kcal !== undefined
    const hasFreshProtein = freshNutr.proteins !== undefined || freshNutr.protein_100g !== undefined
    const hasFreshFat = freshNutr.fat !== undefined || freshNutr.fat_100g !== undefined
    const hasFreshCarbs = freshNutr.carbohydrates !== undefined || freshNutr.carbohydrates_100g !== undefined

    // Only update if current lacks full KBJU and fresh has it
    if ((!hasCurrentEnergy || !hasCurrentProtein || !hasCurrentFat || !hasCurrentCarbs) && (hasFreshEnergy || hasFreshProtein || hasFreshFat)) {
      const merged = { ...currentNutr }
      if (!hasCurrentEnergy && hasFreshEnergy) {
        merged.energy_kcal = freshNutr.energy_kcal ?? freshNutr.calories
        merged.calories = merged.energy_kcal
      }
      if (!hasCurrentProtein && hasFreshProtein) {
        merged.protein_100g = freshNutr.protein_100g ?? freshNutr.proteins
        merged.proteins = merged.protein_100g
      }
      if (!hasCurrentFat && hasFreshFat) {
        merged.fat_100g = freshNutr.fat_100g ?? freshNutr.fat
        merged.fat = merged.fat_100g
      }
      if (!hasCurrentCarbs && hasFreshCarbs) {
        merged.carbohydrates_100g = freshNutr.carbohydrates_100g ?? freshNutr.carbohydrates
        merged.carbohydrates = merged.carbohydrates_100g
      }

      const cleanMerged = {}
      for (const [k, v] of Object.entries(merged)) {
        if (v !== undefined && v !== null && !isNaN(v)) {
          cleanMerged[k] = v
        }
      }

      updates.nutriments_json = cleanMerged
      enrichedAttrs.push('nutriments_json')
      kbjuCount++
    }

    // 3. Shelf life
    if (!current.shelf_life && (fresh.shelf_life_days || fresh.shelf_life_hours)) {
      updates.shelf_life = fresh.shelf_life_days ? `${fresh.shelf_life_days} дн.` : `${fresh.shelf_life_hours} ч.`
      enrichedAttrs.push('shelf_life')
      shelfCount++
    }

    // 4. Storage conditions
    if (!current.storage_conditions && fresh.storage_conditions) {
      updates.storage_conditions = fresh.storage_conditions
      enrichedAttrs.push('storage_conditions')
      storageCount++
    }

    // 5. Country of origin
    if (!current.country_of_origin && fresh.producer_country) {
      updates.country_of_origin = fresh.producer_country
      enrichedAttrs.push('country_of_origin')
      countryCount++
    }

    if (enrichedAttrs.length > 0) {
      const currentSpecs = current.specs_json || {}
      const provenance = {
        ...(currentSpecs.provenance || {}),
        arbuz_residual_enriched_at: new Date().toISOString(),
        arbuz_enriched_attributes: enrichedAttrs
      }
      updates.specs_json = { ...currentSpecs, provenance }

      updatePlan.push({
        id: current.id,
        ean: current.ean,
        name: current.name,
        enrichedAttrs,
        updates
      })
    }
  }

  console.log(`\n--- ENRICHMENT PLAN SUMMARY ---`)
  console.log(`  Products to enrich:           ${updatePlan.length}`)
  console.log(`  - Ingredients added:          ${ingCount}`)
  console.log(`  - KBJU completed:             ${kbjuCount}`)
  console.log(`  - Shelf life added:           ${shelfCount}`)
  console.log(`  - Storage conditions added:   ${storageCount}`)
  console.log(`  - Country of origin added:    ${countryCount}`)

  console.log(`\n--- SAMPLE PROPOSALS (first 8) ---\n`)
  for (let i = 0; i < Math.min(8, updatePlan.length); i++) {
    const p = updatePlan[i]
    console.log(`  [${p.ean}] ${p.name}`)
    console.log(`    Enriched: [${p.enrichedAttrs.join(', ')}]`)
    if (p.updates.ingredients_raw) console.log(`    + Ing: ${p.updates.ingredients_raw.slice(0, 80)}...`)
    if (p.updates.nutriments_json) console.log(`    + KBJU:`, p.updates.nutriments_json)
  }

  // Save plan to scratch
  const planFile = path.join(__dirname, '..', 'scratch', 'arbuz-residual-plan.json')
  fs.writeFileSync(planFile, JSON.stringify(updatePlan, null, 2), 'utf-8')
  console.log(`\nPlan saved to: ${planFile}`)

  if (!isLive) {
    console.log('\nDRY-RUN completed. No records modified in Supabase.')
    console.log('To apply changes live, re-run with: node scripts/apply-arbuz-residual-enrichment.mjs --live')
    return
  }

  // Live apply
  console.log('\nApplying updates to Supabase in batches of 25...')
  let successCount = 0
  let failCount = 0
  const BATCH_APPLY = 25

  for (let i = 0; i < updatePlan.length; i += BATCH_APPLY) {
    const chunk = updatePlan.slice(i, i + BATCH_APPLY)
    await Promise.all(
      chunk.map(async (item) => {
        const { error } = await supabase
          .from('global_products')
          .update(item.updates)
          .eq('id', item.id)

        if (error) {
          console.error(`Failed to update ${item.ean} (${item.name}):`, error.message)
          failCount++
        } else {
          successCount++
        }
      })
    )
    process.stdout.write(`  Progress: ${Math.min(i + BATCH_APPLY, updatePlan.length)}/${updatePlan.length} (success: ${successCount}, failed: ${failCount})\r`)
  }

  console.log(`\n\nEnrichment finished!`)
  console.log(`  Success: ${successCount}`)
  console.log(`  Failed:  ${failCount}`)
}

run()
