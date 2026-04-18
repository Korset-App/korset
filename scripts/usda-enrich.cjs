const fs = require('fs')
const path = require('path')
const https = require('https')
const { URL } = require('url')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')

const USDA_API_KEY = process.env.USDA_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const DELAY_MS = 400
const OUT_DIR = path.join(__dirname, '..', 'data', 'usda-enrich')

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function httpsGet(urlStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    }
    const req = https.request(options, res => {
      let body = ''
      res.on('data', c => { body += c })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) })
        } catch (_) {
          resolve({ status: res.statusCode, body: body.substring(0, 500) })
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.end()
  })
}

async function usdaSearch(query, pageSize = 5) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&dataType=Branded&pageSize=${pageSize}&api_key=${USDA_API_KEY}`
  const r = await httpsGet(url)
  if (r.status !== 200) return { error: `HTTP ${r.status}`, foods: [] }
  return { totalHits: r.body.totalHits || 0, foods: r.body.foods || [] }
}

async function usdaSearchByUPC(upc) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(upc)}&dataType=Branded&pageSize=1&api_key=${USDA_API_KEY}`
  const r = await httpsGet(url)
  if (r.status !== 200) return { error: `HTTP ${r.status}`, foods: [] }
  return { totalHits: r.body.totalHits || 0, foods: r.body.foods || [] }
}

function extractNutrients(food) {
  const nutrients = {}
  const map = {
    'Energy': 'kcal',
    'Protein': 'proteins_100g',
    'Total lipid (fat)': 'fats_100g',
    'Carbohydrate, by difference': 'carbs_100g',
    'Fiber, total dietary': 'fiber_100g',
    'Total Sugars': 'sugars_100g',
    'Sodium, Na': 'salt_100g',
  }
  for (const n of (food.foodNutrients || [])) {
    const key = map[n.nutrientName]
    if (key && n.value != null) {
      nutrients[key] = n.value
    }
  }
  return Object.keys(nutrients).length >= 3 ? nutrients : null
}

function matchScore(food, productName, productBrand) {
  let score = 0
  const desc = (food.description || '').toLowerCase()
  const pName = productName.toLowerCase()
  const pBrand = (productBrand || '').toLowerCase()
  const fBrand = (food.brandName || '').toLowerCase()

  if (fBrand && pBrand) {
    if (fBrand.includes(pBrand) || pBrand.includes(fBrand)) score += 15
    else return 0
  }

  const words = pName.split(/\s+/).filter(w => w.length > 2)
  for (const w of words) {
    if (desc.includes(w)) score += 3
  }

  if (food.gtinUpc) score += 3
  if (food.foodCategory?.toLowerCase().includes('chocolate') || food.foodCategory?.toLowerCase().includes('candy')) score += 3

  return score
}

function parseArgs() {
  const args = process.argv.slice(2)
  const result = { dryRun: false, limit: 0 }
  for (const arg of args) {
    if (arg === '--dry-run') result.dryRun = true
    else if (arg.startsWith('--limit=')) result.limit = parseInt(arg.split('=')[1], 10)
  }
  return result
}

async function main() {
  const opts = parseArgs()

  if (!USDA_API_KEY) { console.error('USDA_API_KEY not set in .env.local'); process.exit(1) }
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('SUPABASE_URL/SERVICE_ROLE_KEY not set'); process.exit(1) }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  const { data: products, error } = await sb
    .from('global_products')
    .select('id, ean, name, brand, ingredients_raw, nutriments_json, country_of_origin')
    .eq('is_active', true)
    .order('id')

  if (error) { console.error('DB error:', error); process.exit(1) }
  console.log(`Total products: ${products.length}`)

  const needsData = products.filter(p => !p.ingredients_raw || !p.nutriments_json)
  console.log(`Need USDA enrichment: ${needsData.length}`)
  const toProcess = opts.limit > 0 ? needsData.slice(0, opts.limit) : needsData
  console.log(`Will process: ${toProcess.length}`)

  if (toProcess.length === 0) { console.log('Nothing to do'); return }

  let enriched = 0, compositionFound = 0, nutritionFound = 0, noMatch = 0
  const results = []

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i]
    const label = `[${i + 1}/${toProcess.length}] #${p.id} ${p.brand || '?'} — ${(p.name || '').substring(0, 30)}`
    process.stdout.write(`${label}... `)

    try {
      let bestFood = null
      let bestScore = 0
      let searchMethod = 'name'

      if (p.ean && !p.ean.startsWith('kaspi_')) {
        const r = await usdaSearchByUPC(p.ean)
        if (r.foods && r.foods.length > 0) {
          bestFood = r.foods[0]
          bestScore = 20
          searchMethod = 'upc'
        }
        await sleep(DELAY_MS)
      }

      if (!bestFood) {
        const query = `${p.brand || ''} ${p.name || ''}`.trim().substring(0, 80)
        const r = await usdaSearch(query, 5)

        if (r.error) {
          console.log(`✗ API error: ${r.error}`)
          results.push({ id: p.id, error: r.error })
          await sleep(DELAY_MS)
          continue
        }

        if (r.foods && r.foods.length > 0) {
          const scored = r.foods.map(f => ({ food: f, score: matchScore(f, p.name, p.brand) }))
            .sort((a, b) => b.score - a.score)
          if (scored[0].score >= 5) {
            bestFood = scored[0].food
            bestScore = scored[0].score
          }
        }
        searchMethod = 'name'
      }

      if (!bestFood) {
        console.log(`✗ no match`)
        noMatch++
        results.push({ id: p.id, ean: p.ean, searchMethod, noMatch: true })
        await sleep(DELAY_MS)
        continue
      }

      const ingredients = bestFood.ingredients || null
      const nutrients = extractNutrients(bestFood)
      const hasComp = !!ingredients
      const hasNutr = !!nutrients

      enriched++
      if (hasComp) compositionFound++
      if (hasNutr) nutritionFound++

      const compPreview = ingredients ? ingredients.substring(0, 40) + '...' : '-'
      const nutrPreview = nutrients ? `${nutrients.kcal || '?'}kcal P:${nutrients.proteins_100g || '?'} F:${nutrients.fats_100g || '?'} C:${nutrients.carbs_100g || '?'}` : '-'

      console.log(`✓ [${searchMethod}] score:${bestScore} Comp:${hasComp ? compPreview : '-'} КБЖУ:${nutrPreview}`)

      const matchData = {
        id: p.id,
        ean: p.ean,
        searchMethod,
        bestScore,
        fdcId: bestFood.fdcId,
        gtinUpc: bestFood.gtinUpc,
        description: bestFood.description,
        brandName: bestFood.brandName,
        hasComp,
        hasNutr,
      }
      results.push(matchData)

      if (!opts.dryRun) {
        const updates = { updated_at: new Date().toISOString() }
        if (!p.ingredients_raw && ingredients) {
          updates.ingredients_raw = ingredients
        }
        if (!p.nutriments_json && nutrients) {
          updates.nutriments_json = nutrients
          updates.alcohol_100g = 0
        }
        if (bestFood.brandName) updates.manufacturer = bestFood.brandName
        if (Object.keys(updates).length > 1) {
          updates.source_primary = 'kz_verified'
          const { error: updErr } = await sb.from('global_products').update(updates).eq('id', p.id)
          if (updErr) console.log(`    ⚠ DB update error: ${updErr.message}`)
          else console.log(`    → DB updated`)
        }
      }

    } catch (e) {
      console.log(`✗ ${e.message}`)
      results.push({ id: p.id, error: e.message })
    }

    await sleep(DELAY_MS)
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Processed: ${toProcess.length}`)
  console.log(`Enriched: ${enriched}/${toProcess.length} (${(enriched / toProcess.length * 100).toFixed(0)}%)`)
  console.log(`Composition: ${compositionFound}`)
  console.log(`Nutrition: ${nutritionFound}`)
  console.log(`No match: ${noMatch}`)

  const outFile = path.join(OUT_DIR, `usda-enrich-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(outFile, JSON.stringify({ testedAt: new Date().toISOString(), stats: { processed: toProcess.length, enriched, compositionFound, nutritionFound, noMatch }, results }, null, 2))
  console.log(`Saved: ${outFile}`)
}

main().catch(e => { console.error(e); process.exit(1) })
