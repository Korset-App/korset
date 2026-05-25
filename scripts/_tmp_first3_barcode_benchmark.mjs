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

const FATSECRET_CLIENT_ID = process.env.FATSECRET_CLIENT_ID
const FATSECRET_CLIENT_SECRET = process.env.FATSECRET_CLIENT_SECRET
const FATSECRET_SCOPE = process.env.FATSECRET_SCOPE || 'premier barcode localization'

const CHOMP_API_KEY = process.env.CHOMP_API_KEY
const CHOMP_EMAIL = process.env.CHOMP_EMAIL || process.env.CHOMP_API_EMAIL
const CHOMP_BASE_URL = (process.env.CHOMP_BASE_URL || 'https://chompthis.com/api').replace(/\/+$/, '')
const CHOMP_BARCODE_PATH = process.env.CHOMP_BARCODE_PATH || '/barcode-upc-lookup'
const CHOMP_AUTH_MODE = process.env.CHOMP_AUTH_MODE || 'auto'

const NUTRITIONIX_APP_ID = process.env.NUTRITIONIX_APP_ID
const NUTRITIONIX_APP_KEY = process.env.NUTRITIONIX_APP_KEY

const OUT_PATH = 'C:\\tmp\\korset-first3-provider-benchmark.json'
const LIMIT = getArgNumber('--limit', 50)
const MODE = getArgString('--mode', 'default')
const PAGE_SIZE = 1000

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

function hasNumber(value) {
  if (value == null) return false
  if (typeof value === 'string' && value.trim() === '') return false
  return Number.isFinite(Number(value))
}

function toNumber(value) {
  if (value == null) return null
  if (typeof value === 'string' && value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
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

function normalizeServingNutrients(serving) {
  if (!serving) return null
  const metrics = {
    kcal: toNumber(serving.calories),
    protein: toNumber(serving.protein),
    fat: toNumber(serving.fat),
    carbs: toNumber(serving.carbohydrate),
    sugar: toNumber(serving.sugar ?? serving.sugars),
    sodium: toNumber(serving.sodium),
    salt: null,
    fiber: toNumber(serving.fiber),
  }
  if (metrics.sodium != null && metrics.salt == null) {
    metrics.salt = Number((metrics.sodium / 400).toFixed(3))
  }
  return metrics
}

function scaleNutrientsTo100g(nutrients, servingWeightGrams) {
  if (!nutrients || !hasNumber(servingWeightGrams) || Number(servingWeightGrams) <= 0) return nutrients
  const weight = Number(servingWeightGrams)
  if (Math.abs(weight - 100) < 0.01) return nutrients

  const scaled = { ...nutrients }
  for (const key of ['kcal', 'protein', 'fat', 'carbs', 'sugar', 'salt', 'sodium', 'fiber']) {
    const value = scaled[key]
    if (!hasNumber(value)) continue
    scaled[key] = Number((Number(value) * 100 / weight).toFixed(3))
  }
  return scaled
}

function selectFatsecretServing(servings) {
  const list = Array.isArray(servings) ? servings : (servings ? [servings] : [])
  if (list.length === 0) return null
  const exact100 = list.find((serving) => {
    const amount = toNumber(serving.metric_serving_amount ?? serving.number_of_units)
    const unit = normalizeText(serving.metric_serving_unit || serving.measurement_description)
    return unit === 'g' && amount != null && Math.abs(amount - 100) < 0.01
  })
  if (exact100) return exact100
  const defaultServing = list.find((serving) => String(serving.is_default || '') === '1')
  if (defaultServing) return defaultServing
  return list[0]
}

function normalizeFatsecretFood(food, barcode) {
  if (!food) return null
  const serving = selectFatsecretServing(food.servings?.serving)
  const nutrients = scaleNutrientsTo100g(normalizeServingNutrients(serving), serving?.metric_serving_amount)
  const allergens = Array.isArray(food.food_attributes?.allergens?.allergen)
    ? food.food_attributes.allergens.allergen.map((item) => ({
        name: item.name || null,
        value: item.value || null,
      }))
    : []
  const preferences = Array.isArray(food.food_attributes?.preferences?.preference)
    ? food.food_attributes.preferences.preference.map((item) => ({
        name: item.name || null,
        value: item.value || null,
      }))
    : []

  return {
    code: String(barcode),
    name: food.food_name || null,
    brand: food.brand_name || null,
    ingredients: null,
    nutriments: nutrients || {},
    extras: {
      foodType: food.food_type || null,
      foodUrl: food.food_url || null,
      allergens,
      preferences,
      servingsCount: Array.isArray(food.servings?.serving) ? food.servings.serving.length : (food.servings?.serving ? 1 : 0),
      servingDescription: serving?.serving_description || null,
    },
  }
}

function normalizeNutritionixFood(food, barcode) {
  if (!food) return null
  const weight = toNumber(food.serving_weight_grams)
  const nutrients = scaleNutrientsTo100g(
    {
      kcal: toNumber(food.nf_calories),
      protein: toNumber(food.nf_protein),
      fat: toNumber(food.nf_total_fat),
      carbs: toNumber(food.nf_total_carbohydrate),
      sugar: toNumber(food.nf_sugars),
      sodium: toNumber(food.nf_sodium),
      salt: toNumber(food.nf_sodium) != null ? Number((Number(food.nf_sodium) / 400).toFixed(3)) : null,
      fiber: toNumber(food.nf_dietary_fiber),
    },
    weight
  )

  return {
    code: String(barcode),
    name: food.food_name || null,
    brand: food.brand_name || null,
    ingredients: food.nf_ingredient_statement || null,
    nutriments: nutrients || {},
    extras: {
      source: food.source || null,
      servingWeightGrams: weight,
      photoThumb: food.photo?.thumb || null,
      photoHighres: food.photo?.highres || null,
    },
  }
}

function normalizeChompPayload(payload, barcode) {
  const data = payload?.data || payload?.product || payload?.result || payload || null
  if (!data || typeof data !== 'object') return null

  const nutrition = data.nutrition_details || data.nutrition || data.nutrients || {}
  const nutrients = {
    kcal: toNumber(nutrition.calories ?? nutrition.kcal ?? nutrition.energy),
    protein: toNumber(nutrition.protein),
    fat: toNumber(nutrition.fat),
    carbs: toNumber(nutrition.carbs ?? nutrition.carbohydrates),
    sugar: toNumber(nutrition.sugar ?? nutrition.sugars),
    sodium: toNumber(nutrition.sodium),
    salt: toNumber(nutrition.salt),
    fiber: toNumber(nutrition.fiber),
  }
  if (nutrients.sodium != null && nutrients.salt == null) {
    nutrients.salt = Number((nutrients.sodium / 400).toFixed(3))
  }
  if (nutrients.salt == null && nutrients.sodium == null && hasNumber(nutrition.nf_sodium)) {
    nutrients.sodium = toNumber(nutrition.nf_sodium)
    nutrients.salt = Number((Number(nutrition.nf_sodium) / 400).toFixed(3))
  }

  const name = data.product_name || data.name || data.food_name || data.title || null
  const brand = data.brand_name || data.brand || null
  const ingredients = data.ingredients || data.ingredients_text || data.ingredient_list || null

  return {
    code: String(data.upc || data.barcode || barcode),
    name,
    brand,
    ingredients,
    nutriments: nutrients,
    extras: {
      category: data.category || data.categories?.[0] || null,
      dietLabels: data.diet_labels || data.labels || null,
      allergens: data.allergens || null,
      traceIngredients: data.trace_ingredients || null,
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
        'User-Agent': 'Korset/0.1 provider benchmark (contact: owner)',
        ...(options.headers || {}),
      },
    })
    const text = await response.text()
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }
    if (!response.ok) {
      return { error: `HTTP ${response.status}`, json, text }
    }
    return { error: null, json, text }
  } catch (error) {
    return { error: error?.cause?.code || error?.code || error?.message || 'fetch_failed', json: null, text: null }
  }
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
  let filtered = rows.filter((row) => {
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

  const categories = new Map()
  for (const row of filtered) {
    const key = row.category || 'uncategorized'
    if (!categories.has(key)) categories.set(key, [])
    categories.get(key).push(row)
  }

  for (const list of categories.values()) {
    list.sort((a, b) => {
      const aSource = String(a.source_primary || '')
      const bSource = String(b.source_primary || '')
      if (aSource !== bSource) return aSource.localeCompare(bSource)
      return String(a.name || '').localeCompare(String(b.name || ''))
    })
  }

  const picked = []
  const perCategoryCap = Math.max(1, Math.ceil(LIMIT / 10))
  const categoryNames = Array.from(categories.keys()).sort()
  const categoryCounts = new Map(categoryNames.map((name) => [name, 0]))

  while (picked.length < LIMIT) {
    let progressed = false
    for (const category of categoryNames) {
      if (picked.length >= LIMIT) break
      const bucket = categories.get(category) || []
      if (bucket.length === 0) continue
      const currentCount = categoryCounts.get(category) || 0
      if (currentCount >= perCategoryCap) continue
      const next = bucket.shift()
      if (!next) continue
      picked.push(next)
      categoryCounts.set(category, currentCount + 1)
      progressed = true
      if (picked.length >= LIMIT) break
    }
    if (!progressed) break
  }

  if (picked.length < LIMIT) {
    const fallback = filtered
      .filter((row) => !picked.some((pickedRow) => pickedRow.id === row.id))
      .sort((a, b) => {
        const aSource = String(a.source_primary || '')
        const bSource = String(b.source_primary || '')
        if (aSource !== bSource) return aSource.localeCompare(bSource)
        return String(a.name || '').localeCompare(String(b.name || ''))
      })
    picked.push(...fallback.slice(0, LIMIT - picked.length))
  }

  return picked.slice(0, LIMIT)
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
  const coverage = nutritionCoverage(result.candidate.nutriments)
  if (coverage.sugar) stats.sugar += 1
  if (coverage.salt) stats.saltOrSodium += 1
  if (coverage.fiber) stats.fiber += 1
  if (coverage.sugar && coverage.salt && coverage.fiber) stats.allThree += 1
}

async function getFatsecretAccessToken() {
  if (!FATSECRET_CLIENT_ID || !FATSECRET_CLIENT_SECRET) {
    return { error: 'missing_api_key', token: null }
  }

  const form = new URLSearchParams()
  form.set('grant_type', 'client_credentials')
  form.set('scope', FATSECRET_SCOPE)

  const { error, json } = await fetchJson('https://oauth.fatsecret.com/connect/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${FATSECRET_CLIENT_ID}:${FATSECRET_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })

  if (error) return { error, token: null }
  if (!json?.access_token) return { error: 'token_missing', token: null }

  return {
    error: null,
    token: {
      accessToken: json.access_token,
      expiresAt: Date.now() + (Number(json.expires_in || 0) * 1000) - 15000,
      scope: json.scope || FATSECRET_SCOPE,
    },
  }
}

const fatsecretTokenState = {
  token: null,
  inflight: null,
}

async function ensureFatsecretToken() {
  if (fatsecretTokenState.token && fatsecretTokenState.token.expiresAt > Date.now()) {
    return { error: null, accessToken: fatsecretTokenState.token.accessToken }
  }
  if (!fatsecretTokenState.inflight) {
    fatsecretTokenState.inflight = getFatsecretAccessToken()
      .then((result) => {
        if (result.token) fatsecretTokenState.token = result.token
        fatsecretTokenState.inflight = null
        return result
      })
      .catch((error) => {
        fatsecretTokenState.inflight = null
        return { error: error?.message || 'token_failed', token: null }
      })
  }
  const result = await fatsecretTokenState.inflight
  if (result.token) return { error: null, accessToken: result.token.accessToken }
  return { error: result.error || 'token_failed', accessToken: null }
}

function extractFatsecretFood(json) {
  if (!json) return null
  if (json.food) return json.food
  if (json.foods?.food) {
    return Array.isArray(json.foods.food) ? json.foods.food[0] : json.foods.food
  }
  if (json.foods && Array.isArray(json.foods) && json.foods.length > 0) return json.foods[0]
  return null
}

async function lookupFatsecret(barcode) {
  const tokenResult = await ensureFatsecretToken()
  if (tokenResult.error) return { error: tokenResult.error, candidate: null }

  const url = new URL('https://platform.fatsecret.com/rest/food/barcode/find-by-id/v2')
  url.searchParams.set('barcode', String(barcode))
  url.searchParams.set('format', 'json')
  url.searchParams.set('include_food_attributes', 'true')
  url.searchParams.set('flag_default_serving', 'true')

  const { error, json } = await fetchJson(url.toString(), {
    headers: {
      Authorization: `Bearer ${tokenResult.accessToken}`,
    },
  })
  if (error) return { error, candidate: null }

  const food = extractFatsecretFood(json)
  if (!food) return { error: 'not_found', candidate: null }
  return { error: null, candidate: normalizeFatsecretFood(food, barcode) }
}

async function lookupNutritionix(barcode) {
  if (!NUTRITIONIX_APP_ID || !NUTRITIONIX_APP_KEY) {
    return { error: 'missing_api_key', candidate: null }
  }
  const url = new URL('https://trackapi.nutritionix.com/v2/search/item')
  url.searchParams.set('upc', String(barcode))
  const { error, json } = await fetchJson(url.toString(), {
    headers: {
      'x-app-id': NUTRITIONIX_APP_ID,
      'x-app-key': NUTRITIONIX_APP_KEY,
      'x-remote-user-id': '0',
    },
  })
  if (error) return { error, candidate: null }
  const food = Array.isArray(json?.foods) ? json.foods[0] : null
  if (!food) return { error: 'not_found', candidate: null }
  return { error: null, candidate: normalizeNutritionixFood(food, barcode) }
}

function chompHeaderVariants(apiKey) {
  const headerVariants = []
  const queryVariants = []

  const authHeaders = [
    { 'X-API-Key': apiKey },
    { 'x-api-key': apiKey },
    { Authorization: `Bearer ${apiKey}` },
  ]
  if (CHOMP_EMAIL) {
    authHeaders.unshift({
      'X-API-Key': apiKey,
      'X-Email': CHOMP_EMAIL,
    })
    authHeaders.unshift({
      'x-api-key': apiKey,
      'x-email': CHOMP_EMAIL,
    })
  }
  if (CHOMP_AUTH_MODE === 'header') {
    headerVariants.push(...authHeaders)
  } else if (CHOMP_AUTH_MODE === 'query') {
    queryVariants.push(
      { api_key: apiKey },
      { key: apiKey },
      { apiKey },
      ...(CHOMP_EMAIL ? [{ email: CHOMP_EMAIL, api_key: apiKey }] : []),
    )
  } else {
    headerVariants.push(...authHeaders)
    queryVariants.push(
      { api_key: apiKey },
      { key: apiKey },
      { apiKey },
      ...(CHOMP_EMAIL ? [{ email: CHOMP_EMAIL, api_key: apiKey }] : []),
    )
  }

  return { headerVariants, queryVariants }
}

async function lookupChomp(barcode) {
  if (!CHOMP_API_KEY) return { error: 'missing_api_key', candidate: null }

  const { headerVariants, queryVariants } = chompHeaderVariants(CHOMP_API_KEY)
  const pathCandidates = [
    `${CHOMP_BASE_URL}${CHOMP_BARCODE_PATH}`,
    `${CHOMP_BASE_URL}${CHOMP_BARCODE_PATH}/${encodeURIComponent(barcode)}`,
  ]

  for (const baseUrl of pathCandidates) {
    const directUrl = new URL(baseUrl)
    directUrl.searchParams.set('barcode', String(barcode))
    directUrl.searchParams.set('upc', String(barcode))

    for (const headers of headerVariants) {
      const { error, json } = await fetchJson(directUrl.toString(), { headers })
      if (!error) {
        const candidate = normalizeChompPayload(json, barcode)
        if (candidate) return { error: null, candidate }
      }
    }

    for (const query of queryVariants) {
      const url = new URL(baseUrl)
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value)
      }
      url.searchParams.set('barcode', String(barcode))
      url.searchParams.set('upc', String(barcode))

      const { error, json } = await fetchJson(url.toString())
      if (!error) {
        const candidate = normalizeChompPayload(json, barcode)
        if (candidate) return { error: null, candidate }
      }
    }
  }

  return { error: 'not_found_or_unauthorized', candidate: null }
}

const PROVIDERS = [
  {
    name: 'fatsecret',
    lookup: lookupFatsecret,
    credsReady: () => Boolean(FATSECRET_CLIENT_ID && FATSECRET_CLIENT_SECRET),
    note: 'OAuth2 client_credentials; barcode endpoint documented as Premier Exclusive; extra scopes may be needed.',
  },
  {
    name: 'chomp',
    lookup: lookupChomp,
    credsReady: () => Boolean(CHOMP_API_KEY),
    note: 'API key based; Limited plan gives barcode lookup only, Standard/Premium unlock search; commercial use on Limited is restricted.',
  },
  {
    name: 'nutritionix',
    lookup: lookupNutritionix,
    credsReady: () => Boolean(NUTRITIONIX_APP_ID && NUTRITIONIX_APP_KEY),
    note: 'x-app-id + x-app-key; UPC lookup endpoint is /v2/search/item and attribution is required in the UI.',
  },
]

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
    providers: Object.fromEntries(PROVIDERS.map((provider) => [provider.name, emptyProviderStats()])),
    providerStatus: Object.fromEntries(PROVIDERS.map((provider) => [
      provider.name,
      {
        credsReady: provider.credsReady(),
        note: provider.note,
      },
    ])),
    rows: [],
  }

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    process.stdout.write(`[${i + 1}/${rows.length}] ${row.ean} ${String(row.name || '').slice(0, 45)}...`)

    const rowEntry = {
      id: row.id,
      ean: row.ean,
      name: row.name,
      brand: row.brand,
      category: row.category,
      source: row.source_primary,
      existing: nutritionCoverage(getExistingNutrition(row)),
      providers: {},
    }

    for (const provider of PROVIDERS) {
      const result = await provider.lookup(row.ean)
      const match = classifyMatch(row, result.candidate)
      updateProviderStats(stats.providers[provider.name], result, match)
      rowEntry.providers[provider.name] = {
        error: result.error,
        match,
        coverage: nutritionCoverage(result.candidate?.nutriments || {}),
        candidate: result.candidate,
      }
      await sleep(150)
    }

    const hints = PROVIDERS.map((provider) => {
      const providerResult = rowEntry.providers[provider.name]
      const c = nutritionCoverage(providerResult.candidate?.nutriments || {})
      return `${provider.name[0].toUpperCase()}:hit=${providerResult.candidate ? 1 : 0} S${c.sugar ? 1 : 0} Na${c.salt ? 1 : 0} F${c.fiber ? 1 : 0}`
    }).join(' | ')
    console.log(` ${hints}`)

    stats.rows.push(rowEntry)
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(stats, null, 2), 'utf8')

  console.log('\n=== FIRST 3 PROVIDER BENCHMARK ===')
  console.log(`Sampled: ${stats.sampled}`)
  for (const provider of PROVIDERS) {
    const providerStats = stats.providers[provider.name]
    console.log(`\n${provider.name}`)
    console.log(`credsReady:   ${stats.providerStatus[provider.name].credsReady}`)
    console.log(`found:        ${providerStats.found}/${providerStats.checked}`)
    console.log(`exactBarcode: ${providerStats.exactBarcode}/${providerStats.checked}`)
    console.log(`strongMatch:  ${providerStats.strongMatch}/${providerStats.checked}`)
    console.log(`sugar:        ${providerStats.sugar}/${providerStats.checked}`)
    console.log(`salt/sodium:  ${providerStats.saltOrSodium}/${providerStats.checked}`)
    console.log(`fiber:        ${providerStats.fiber}/${providerStats.checked}`)
    console.log(`allThree:     ${providerStats.allThree}/${providerStats.checked}`)
    if (Object.keys(providerStats.errors).length > 0) {
      console.log(`errors:       ${JSON.stringify(providerStats.errors)}`)
    }
  }
  console.log(`\nSaved report to ${OUT_PATH}`)
}

main().catch((error) => {
  console.error('First 3 provider benchmark failed:', error)
  process.exit(1)
})
