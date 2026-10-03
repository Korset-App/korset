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
  console.log(' Applying Verified Internal Nutrition & Ingredients Enrichment')
  console.log(` Mode: ${modeLabel}`)
  console.log('='.repeat(70))

  const proposalFile = path.join(__dirname, '..', 'scratch', 'internal-enrichment-proposal.jsonl')
  if (!fs.existsSync(proposalFile)) {
    console.error('Missing scratch/internal-enrichment-proposal.jsonl')
    process.exit(1)
  }

  const lines = fs.readFileSync(proposalFile, 'utf-8').split('\n').filter(Boolean)
  const items = lines.map(JSON.parse)

  // Filter only items with KBJU that pass strict physical validation
  const verifiedList = []
  for (const it of items) {
    if (!it.updates.nutriments_json) continue

    const n = it.updates.nutriments_json
    const p = n.protein_100g ?? n.proteins ?? 0
    const f = n.fat_100g ?? n.fat ?? 0
    const c = n.carbohydrates_100g ?? n.carbohydrates ?? 0
    const kcal = n.energy_kcal ?? n.calories

    // Safety checks
    if (!kcal || kcal <= 0 || kcal > 950) continue
    if (p < 0 || p > 100 || f < 0 || f > 100 || c < 0 || c > 100) continue
    if (p + f + c > 102) continue

    // Specific outlier filter
    if (p === 0 && f === 0 && c === 0) continue // Empty macros with kcal
    if (it.ean === '4600528360714') continue // Sauce Astoria Relish supplier typo (28g protein)
    if (it.ean === '4870206415559' || it.ean === '5060608742707') continue // No macros

    // Plausibility
    const calc = p * 4 + f * 9 + c * 4
    const diff = Math.abs(kcal - calc)
    if (calc > 0 && diff > Math.max(80, kcal * 0.4)) continue

    // Clean undefined and null
    const cleanNutr = {}
    for (const [k, v] of Object.entries(n)) {
      if (v !== undefined && v !== null && !isNaN(v)) {
        cleanNutr[k] = v
      }
    }

    const updates = { nutriments_json: cleanNutr }

    // If item also has clean verified ingredients extracted from description (like Krasnoyarsk sausages)
    if (it.updates.ingredients_raw && it.provenance.ingredients_source === 'internal_desc_extraction') {
      updates.ingredients_raw = it.updates.ingredients_raw
    }

    verifiedList.push({
      id: it.id,
      ean: it.ean,
      name: it.name,
      updates
    })
  }

  console.log(`\nVerified strict proposals: ${verifiedList.length} items`)
  console.log('Sample verified items (first 5):')
  verifiedList.slice(0, 5).forEach(v => console.log(`  [${v.ean}] ${v.name}:`, v.updates))

  if (!isLive) {
    console.log('\nDRY-RUN completed. Run with --live to apply to Supabase.')
    return
  }

  console.log('\nApplying updates to Supabase...')
  let successCount = 0
  let failCount = 0

  for (const item of verifiedList) {
    const { error } = await supabase
      .from('global_products')
      .update(item.updates)
      .eq('id', item.id)

    if (error) {
      console.error(`Failed ${item.ean} (${item.name}):`, error.message)
      failCount++
    } else {
      successCount++
    }
  }

  console.log(`\nFinished applying verified internal nutrition!`)
  console.log(`  Success: ${successCount}`)
  console.log(`  Failed:  ${failCount}`)
}

run()
