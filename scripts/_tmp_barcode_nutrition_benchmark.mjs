import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const USDA_API_KEY = process.env.USDA_API_KEY

const OUT_PATH = 'C:\\tmp\\korset-barcode-nutrition-benchmark.json'
const LIMIT = getArgNumber('--limit', 120)
const MODE = getArgString('--mode', 'default')
const OFF_DELAY_MS = getArgNumber('--off-delay-ms', 1200)
const USDA_DELAY_MS = getArgNumber('--usda-delay-ms', 300)
const PAGE_SIZE = 1000

const SOURCE_PRIORITY = {
  npc: 1,
  kz_verified: 2,
  arbuz: 3,
  korzinavdom: 4,
  kaspi: 5,
  openfoodfacts: 6,
  manual: 7,
  eandb: 8,
  usda: 9,
}

const FOOD_CATEGORIES = new Set([
  'baby_food',
  'bakery',
  'bread',
  'dairy_eggs',
  'deli',
  'fish',
  'frozen',
  'fruits_veg',
  'grocery',
  'healthy',
  'meat_fish',
  'nuts_dried_fruits',
  'sauces_spices',
  'snacks',
  'sweets',
  'tea_coffee',
  'water_beverages',
])

const GLOBAL_BRAND_MARKERS = [
  'coca',
  'pepsi',
  'fanta',
  'sprite',
  'schweppes',
  'red bull',
  'monster',
  'snickers',
  'mars',
  'twix',
  'bounty',
  'milka',
  'oreo',
  'ritter',
  'lindt',
  'merci',
  'nutella',
  'nescafe',
  'nestle',
  'nesquik',
  'pringles',
  'lays',
  'doritos',
  'heinz',
  'hellmann',
  'barilla',
  'danone',
  'actimel',
  'activia',
  'alpro',
  'bonduelle',
]

function getArgNumber(name, fallback) {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`))
  if (!arg) return fallback
  const number = Number(arg.slice(name.length + 1))
  return Number.isFinite(number) && number > 0 ? number : fallback
}

function getArgString(name, fallback) {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`))
  if (!arg) return fallback
  return arg.slice(name.length + 1).trim() || fallback
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function hasNumber(value) {
  if (value == null) return false
  if (typeof value === 'string' && value.trim() === '') return false
  return Number.isFinite(Number(value))
}

function isRealEan(ean) {
  const value = String(ean || '')
  if (!/^\d{8}$|^\d{13}$/.test(value)) return false
  return !/^2[0-9]/.test(value)
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getTokens(value) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 3)
    .slice(0, 12)
}

function textOverlapScore(a, b) {
  const aTokens = new Set(getTokens(a))
  const bTokens = new Set(getTokens(b))
  if (aTokens.size === 0 || bTokens.size === 0) return 0
  let hits = 0
  for (const token of aTokens) {
    if (bTokens.has(token)) hits += 1
  }
  return hits / Math.min(aTokens.size, bTokens.size)
}

function getExistingNutrition(row) {
  const n = row.nutriments_json || {}
  return {
    sugar: n.sugar ?? n.sugars ?? n.sugars_100g,
    salt: n.salt ?? n.salt_100g,
    sodium: n.sodium ?? n.sodium_100g,
    fiber: n.fiber ?? n.fiber_100g ?? n.fibers ?? n.fibers_100g,
  }
}

function nutritionCoverage(n) {
  return {
    sugar: hasNumber(n.sugar),
    salt: hasNumber(n.salt) || hasNumber(n.sodium),
    fiber: hasNumber(n.fiber),
  }
}

function nutrientFromUsda(food, patterns) {
  const nutrients = Array.isArray(food?.foodNutrients) ? food.foodNutrients : []
  const found = nutrients.find((item) => {
    const name = normalizeText(item.nutrientName || item.name)
    return patterns.some((pattern) => pattern.test(name))
  })
  return found?.value ?? null
}

function normalizeUsdaFood(food) {
  if (!food) return null
  return {
    code: food.gtinUpc || null,
    name: food.description || null,
    brand: food.brandName || food.brandOwner || null,
    ingredients: food.ingredients || null,
    nutriments: {
      sugar: nutrientFromUsda(food, [/sugars.*total/, /^sugars$/]),
      sodium: nutrientFromUsda(food, [/sodium/]),
      fiber: nutrientFromUsda(food, [/fiber.*total/, /dietary fiber/]),
    },
  }
}

function normalizeOffProduct(product) {
  const n = product?.nutriments || {}
  return {
    code: product?.code || null,
    name: product?.product_name || product?.product_name_ru || product?.generic_name || null,
    brand: product?.brands || null,
    ingredients: product?.ingredients_text_ru || product?.ingredients_text || null,
    nutriments: {
      sugar: n.sugars_100g ?? n.sugars ?? null,
      salt: n.salt_100g ?? n.salt ?? null,
      sodium: n.sodium_100g ?? n.sodium ?? null,
      fiber: n.fiber_100g ?? n.fiber ?? null,
    },
  }
}

function classifyMatch(row, candidate) {
  if (!candidate) return { exactBarcode: false, brandOverlap: 0, nameOverlap: 0, strong: false }
  const exactBarcode = String(candidate.code || '') === String(row.ean || '')
  const brandOverlap = textOverlapScore(row.brand, candidate.brand)
  const nameOverlap = textOverlapScore(row.name, candidate.name)
  return {
    exactBarcode,
    brandOverlap,
    nameOverlap,
    strong: exactBarcode && (brandOverlap > 0 || nameOverlap >= 0.25),
  }
}

async function fetchJson(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Korset/0.1 nutrition benchmark (contact: owner)',
        ...(options.headers || {}),
      },
    })
    if (!response.ok) return { error: `HTTP ${response.status}`, json: null }
    return { error: null, json: await response.json() }
  } catch (error) {
    return { error: error?.cause?.code || error?.code || error?.message || 'fetch_failed', json: null }
  }
}

async function lookupOff(ean) {
  const fields = [
    'code',
    'product_name',
    'product_name_ru',
    'generic_name',
    'brands',
    'ingredients_text',
    'ingredients_text_ru',
    'nutriments',
  ].join(',')
  const { error, json } = await fetchJson(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(ean)}?fields=${fields}`
  )
  if (error || json?.status !== 1) return { error: error || 'not_found', candidate: null }
  return { error: null, candidate: normalizeOffProduct(json.product) }
}

async function lookupUsda(ean) {
  if (!USDA_API_KEY) return { error: 'missing_api_key', candidate: null }
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
    ean
  )}&dataType=Branded&pageSize=5&api_key=${encodeURIComponent(USDA_API_KEY)}`
  const { error, json } = await fetchJson(url)
  if (error) return { error, candidate: null }
  const foods = Array.isArray(json?.foods) ? json.foods : []
  const exact = foods.find((food) => String(food.gtinUpc || '') === String(ean))
  const food = exact || foods[0] || null
  if (!food) return { error: 'not_found', candidate: null }
  return { error: null, candidate: normalizeUsdaFood(food) }
}

async function fetchRows(sb) {
  const rows = []
  let from = 0
  while (true) {
    const { data, error } = await sb
      .from('global_products')
      .select('id,ean,name,brand,category,source_primary,nutriments_json,is_active')
      .eq('is_active', true)
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return rows
}

function pickBenchmarkRows(rows) {
  let filtered = rows
    .filter((row) => {
      if (!isRealEan(row.ean)) return false
      if (!FOOD_CATEGORIES.has(row.category)) return false
      const coverage = nutritionCoverage(getExistingNutrition(row))
      return !coverage.sugar || !coverage.salt || !coverage.fiber
    })

  if (MODE === 'global') {
    filtered = filtered.filter((row) => {
      const haystack = normalizeText(`${row.brand || ''} ${row.name || ''}`)
      return GLOBAL_BRAND_MARKERS.some((marker) => haystack.includes(marker))
    })
  }

  return filtered
    .sort((a, b) => {
      const ap = SOURCE_PRIORITY[a.source_primary] || 99
      const bp = SOURCE_PRIORITY[b.source_primary] || 99
      if (ap !== bp) return ap - bp
      return String(a.name || '').localeCompare(String(b.name || ''))
    })
    .slice(0, LIMIT)
}

function emptyProviderStats() {
  return {
    checked: 0,
    found: 0,
    exactBarcode: 0,
    strongMatch: 0,
    sugar: 0,
    saltOrSodium: 0,
    fiber: 0,
    allThree: 0,
    errors: {},
  }
}

function updateProviderStats(stats, result, match) {
  stats.checked += 1
  if (result.error) stats.errors[result.error] = (stats.errors[result.error] || 0) + 1
  if (!result.candidate) return
  stats.found += 1
  if (match.exactBarcode) stats.exactBarcode += 1
  if (match.strong) stats.strongMatch += 1
  const c = nutritionCoverage(result.candidate.nutriments)
  if (c.sugar) stats.sugar += 1
  if (c.salt) stats.saltOrSodium += 1
  if (c.fiber) stats.fiber += 1
  if (c.sugar && c.salt && c.fiber) stats.allThree += 1
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  const allRows = await fetchRows(sb)
  const rows = pickBenchmarkRows(allRows)

  const stats = {
    generatedAt: new Date().toISOString(),
    mode: MODE,
    limit: LIMIT,
    sampled: rows.length,
    usdaApiConfigured: Boolean(USDA_API_KEY),
    providers: {
      openfoodfacts: emptyProviderStats(),
      usda: emptyProviderStats(),
    },
    rows: [],
  }

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    process.stdout.write(`[${i + 1}/${rows.length}] ${row.ean} ${String(row.name || '').slice(0, 45)}... `)

    const off = await lookupOff(row.ean)
    const offMatch = classifyMatch(row, off.candidate)
    updateProviderStats(stats.providers.openfoodfacts, off, offMatch)
    await sleep(OFF_DELAY_MS)

    const usda = await lookupUsda(row.ean)
    const usdaMatch = classifyMatch(row, usda.candidate)
    updateProviderStats(stats.providers.usda, usda, usdaMatch)
    await sleep(USDA_DELAY_MS)

    const existing = nutritionCoverage(getExistingNutrition(row))
    stats.rows.push({
      id: row.id,
      ean: row.ean,
      name: row.name,
      brand: row.brand,
      category: row.category,
      source: row.source_primary,
      existing,
      openfoodfacts: {
        error: off.error,
        match: offMatch,
        coverage: nutritionCoverage(off.candidate?.nutriments || {}),
        candidate: off.candidate,
      },
      usda: {
        error: usda.error,
        match: usdaMatch,
        coverage: nutritionCoverage(usda.candidate?.nutriments || {}),
        candidate: usda.candidate,
      },
    })

    const offCov = nutritionCoverage(off.candidate?.nutriments || {})
    const usdaCov = nutritionCoverage(usda.candidate?.nutriments || {})
    console.log(
      `OFF ${off.candidate ? 'hit' : 'miss'} S:${offCov.sugar ? 1 : 0} Na:${offCov.salt ? 1 : 0} F:${offCov.fiber ? 1 : 0} | USDA ${usda.candidate ? 'hit' : 'miss'} S:${usdaCov.sugar ? 1 : 0} Na:${usdaCov.salt ? 1 : 0} F:${usdaCov.fiber ? 1 : 0}`
    )
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(stats, null, 2), 'utf8')

  console.log('\n=== BARCODE NUTRITION BENCHMARK ===')
  console.log(`Sampled: ${stats.sampled}`)
  for (const [name, provider] of Object.entries(stats.providers)) {
    console.log(`\n${name}`)
    console.log(`found:        ${provider.found}/${provider.checked}`)
    console.log(`exactBarcode: ${provider.exactBarcode}/${provider.checked}`)
    console.log(`strongMatch:  ${provider.strongMatch}/${provider.checked}`)
    console.log(`sugar:        ${provider.sugar}/${provider.checked}`)
    console.log(`salt/sodium:  ${provider.saltOrSodium}/${provider.checked}`)
    console.log(`fiber:        ${provider.fiber}/${provider.checked}`)
    console.log(`allThree:     ${provider.allThree}/${provider.checked}`)
    if (Object.keys(provider.errors).length > 0) {
      console.log(`errors:       ${JSON.stringify(provider.errors)}`)
    }
  }
  console.log(`\nSaved report to ${OUT_PATH}`)
}

main().catch((error) => {
  console.error('Barcode nutrition benchmark failed:', error)
  process.exit(1)
})
