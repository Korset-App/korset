import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run100Audit() {
  console.log('='.repeat(70))
  console.log(' AUDIT: 100 Missing Barcodes Search Across Public Databases')
  console.log('='.repeat(70))

  // 1. Fetch 100 active food products lacking ingredients or KBJU
  const { data: targets, error } = await sb.from('global_products')
    .select('id, ean, name, brand, category, ingredients_raw, nutriments_json')
    .eq('is_active', true)
    .not('category', 'in', '(household,personal_care,pet)')
    .or('ingredients_raw.is.null,nutriments_json.is.null,nutriments_json.eq.{}')
    .limit(100)

  if (error || !targets || targets.length === 0) {
    console.error('Failed to fetch targets:', error?.message)
    process.exit(1)
  }

  console.log(`Loaded ${targets.length} sample active food products lacking data.`)

  // 2. Test Open Food Facts API for these 100 barcodes
  console.log('\n--- TESTING SOURCE 1: Open Food Facts (World & CIS Grocery DB) ---')
  let offFound = 0
  let offWithIng = 0
  let offWithKbju = 0
  const offSamples = []

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]
    const ean = t.ean
    if (!ean || ean.length < 8) continue

    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${ean}.json`, {
        headers: { 'User-Agent': 'KorsetCatalogEngine - ProductionV4 (catalog@korset.kz)' },
        signal: AbortSignal.timeout(4000)
      })
      if (res.ok) {
        const json = await res.json()
        if (json.status === 1 && json.product) {
          offFound++
          const prod = json.product
          const ing = prod.ingredients_text_ru || prod.ingredients_text
          const nutr = prod.nutriments
          const hasIng = ing && ing.trim().length > 5
          const hasKbju = nutr && (nutr['energy-kcal_100g'] || nutr.energy_kcal_100g || nutr.proteins_100g)

          if (hasIng) offWithIng++
          if (hasKbju) offWithKbju++

          if (offSamples.length < 5 && (hasIng || hasKbju)) {
            offSamples.push({
              ean,
              korsetName: t.name,
              offName: prod.product_name || prod.product_name_ru,
              hasIng: !!hasIng,
              hasKbju: !!hasKbju,
              nutrSample: {
                kcal: nutr['energy-kcal_100g'] || nutr.energy_kcal_100g,
                p: nutr.proteins_100g,
                f: nutr.fat_100g,
                c: nutr.carbohydrates_100g
              }
            })
          }
        }
      }
    } catch (e) {}
    // Polite delay
    await new Promise(r => setTimeout(r, 100))
  }

  console.log(`OFF Results for 100 missing items:`)
  console.log(`  Found products:       ${offFound}/100 (${offFound}%)`)
  console.log(`  With ingredients:     ${offWithIng}`)
  console.log(`  With structured KBJU: ${offWithKbju}`)
  console.log('\nSample OFF hits:')
  offSamples.forEach(s => console.log(' ', s))

  // 3. Test Barcode-List registry
  console.log('\n--- TESTING SOURCE 2: Barcode-List.ru (POS Barcode Registry) ---')
  let blFound = 0
  for (let i = 0; i < Math.min(20, targets.length); i++) {
    const ean = targets[i].ean
    try {
      const res = await fetch(`https://barcode-list.ru/barcode/RU/%D0%9F%D0%BE%D0%B8%D1%81%D0%BA.htm?barcode=${ean}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(3000)
      })
      if (res.ok) {
        const text = await res.text()
        if (text.includes('Этот штрих-код встречается')) blFound++
      }
    } catch {}
    await new Promise(r => setTimeout(r, 100))
  }
  console.log(`Barcode-List Results (sample of 20): ${blFound}/20 (${(blFound/20*100).toFixed(0)}% indexed names, 0% nutrition/composition)`)

  // Save audit report to scratch
  const report = {
    totalChecked: targets.length,
    off: { found: offFound, withIng: offWithIng, withKbju: offWithKbju },
    timestamp: new Date().toISOString()
  }
  fs.writeFileSync(path.join(__dirname, '..', 'scratch', '100-barcodes-audit-report.json'), JSON.stringify(report, null, 2))
}

run100Audit()
