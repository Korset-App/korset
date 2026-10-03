import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_FILE = path.join(__dirname, '..', 'scratch', 'rusprod_harvested.jsonl')

async function harvestRusprod() {
  console.log('='.repeat(70))
  console.log(' HARVEST: Rusprod / MIRFOODS Official Manufacturer Catalog')
  console.log('='.repeat(70))

  const url = 'https://online.rusprod.ru/products/'
  console.log(`Fetching ${url}...`)
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`)
  }

  const buf = await res.arrayBuffer()
  const decoder = new TextDecoder('windows-1251')
  const html = decoder.decode(buf)
  console.log(`Fetched ${html.length} characters of HTML (windows-1251 decoded).`)

  const trMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  console.log(`Found ${trMatches.length} table rows.`)

  const products = []

  for (const tr of trMatches) {
    const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(td => {
      const fullTitle = td[1].match(/data-full-title="([^"]+)"/i)
      if (fullTitle) return fullTitle[1].replace(/&quot;/g, '"').trim()
      return td[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim()
    })

    if (tds.length >= 26) {
      const rawEan = tds[6]?.replace(/[^0-9]/g, '')
      if (rawEan && /^\d{8,14}$/.test(rawEan)) {
        const brand = tds[0] || null
        const category = tds[1] || null
        const subcategory = tds[2] || null
        const name = tds[3] || null
        const packagingRaw = tds[5] || null
        const weightG = parseFloat(tds[7]?.replace(',', '.')) || null
        const desc = tds[15] || null
        const cooking = tds[16] || null
        const ingredients = tds[17]?.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim() || null

        const kcal = parseFloat(tds[19]?.replace(',', '.')) || null
        const proteins = parseFloat(tds[20]?.replace(',', '.')) || null
        const fats = parseFloat(tds[21]?.replace(',', '.')) || null
        const carbs = parseFloat(tds[22]?.replace(',', '.')) || null

        const shelfMonths = parseFloat(tds[23]?.replace(',', '.')) || null
        const storage = tds[25] || null
        const manufacturer = tds[43] || null
        const manufacturerAddress = tds[44] || null
        const certificate = tds[45] || null
        const standard = tds[47] || null

        // Physical validation for KBJU
        let nutriments_json = null
        if (kcal !== null || proteins !== null || fats !== null || carbs !== null) {
          nutriments_json = {
            energy_kcal_100g: kcal,
            proteins_100g: proteins,
            fat_100g: fats,
            carbohydrates_100g: carbs
          }
        }

        products.push({
          ean: rawEan,
          brand,
          category,
          subcategory,
          name,
          packaging_raw: packagingRaw,
          net_weight_g: weightG,
          description: desc,
          cooking_instructions: cooking,
          ingredients_raw: ingredients,
          nutriments_json,
          shelf_life_months: shelfMonths,
          storage_conditions: storage,
          manufacturer,
          manufacturer_address: manufacturerAddress,
          certificate,
          standard,
          source: 'online.rusprod.ru'
        })
      }
    }
  }

  console.log(`Successfully extracted ${products.length} valid product items!`)

  // Save to JSONL
  const dir = path.dirname(OUTPUT_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const jsonl = products.map(p => JSON.stringify(p)).join('\n')
  fs.writeFileSync(OUTPUT_FILE, jsonl, 'utf-8')
  console.log(`Saved output to ${OUTPUT_FILE}`)

  // Quick stats
  const withIng = products.filter(p => p.ingredients_raw && p.ingredients_raw.length > 5).length
  const withKbju = products.filter(p => p.nutriments_json && p.nutriments_json.energy_kcal_100g !== null).length
  const withShelf = products.filter(p => p.shelf_life_months !== null).length
  const withStorage = products.filter(p => p.storage_conditions !== null).length
  const withMfg = products.filter(p => p.manufacturer !== null).length

  console.log('\nField coverage across extracted products:')
  console.log(`  Ingredients:   ${withIng}/${products.length} (${(withIng/products.length*100).toFixed(1)}%)`)
  console.log(`  KBJU:          ${withKbju}/${products.length} (${(withKbju/products.length*100).toFixed(1)}%)`)
  console.log(`  Shelf Life:    ${withShelf}/${products.length} (${(withShelf/products.length*100).toFixed(1)}%)`)
  console.log(`  Storage:       ${withStorage}/${products.length} (${(withStorage/products.length*100).toFixed(1)}%)`)
  console.log(`  Manufacturer:  ${withMfg}/${products.length} (${(withMfg/products.length*100).toFixed(1)}%)`)
}

harvestRusprod().catch(err => {
  console.error('Harvester failed:', err)
  process.exit(1)
})
