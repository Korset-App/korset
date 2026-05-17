import {
  buildEnrichmentRequest,
  buildExternalReferenceNotice,
  canShowExternalCandidateToBuyer,
  normalizeExternalCandidate,
} from './enrichmentContract.js'

const USDA_NUTRIENT_MAP = {
  Energy: 'calories',
  Protein: 'protein',
  'Total lipid (fat)': 'fat',
  'Carbohydrate, by difference': 'carbs',
  'Total Sugars': 'sugar',
  'Fiber, total dietary': 'fiber',
  'Sodium, Na': 'sodium',
}

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 12_000

function cleanString(value, max = 500) {
  return String(value || '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, max)
}

function getNutrientsFromUsda(food = {}) {
  const nutrients = {}
  for (const nutrient of food.foodNutrients || food.nutrients || []) {
    const name = nutrient.nutrientName || nutrient.name
    const key = USDA_NUTRIENT_MAP[name]
    if (!key) continue
    const value = Number(nutrient.value)
    if (Number.isFinite(value)) nutrients[key] = value
  }
  return Object.keys(nutrients).length ? nutrients : null
}

function getNpcAttribute(item = {}, codes = []) {
  const attrs = Array.isArray(item.attributes) ? item.attributes : []
  for (const code of codes) {
    const found = attrs.find((attr) => attr.code === code)
    const value = cleanString(found?.valueRu || found?.valueKk || found?.value)
    if (value) return value
  }
  return ''
}

function isFreshCache(row) {
  const expiresAt = row?.ttl_expires_at || row?.raw_payload?.ttlExpiresAt
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() > Date.now()
}

function rowToCandidate(row = {}) {
  return normalizeExternalCandidate({
    product: {
      ean: row.ean,
      name: row.normalized_name,
      brand: row.normalized_brand,
      ingredients: '',
    },
    candidate: {
      ean: row.ean,
      name: row.normalized_name,
      brand: row.normalized_brand,
      ingredients: row.normalized_ingredients,
      nutrition: row.normalized_nutriments_json,
      manufacturer: row.raw_payload?.manufacturer,
    },
    source: {
      domain: row.raw_payload?.sourceDomain || row.source,
      url: row.raw_payload?.sourceUrl,
      fetchedAt: row.raw_payload?.fetchedAt,
    },
  })
}

async function fetchJson(url, { fetchImpl, timeoutMs = FETCH_TIMEOUT_MS, options = {} } = {}) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    const response = await fetchImpl(url, {
      ...options,
      signal: controller?.signal,
    })
    if (!response?.ok) return null
    return response.json()
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export function mapUsdaFoodToCandidate(food = {}) {
  return {
    ean: cleanString(food.gtinUpc, 32),
    name: cleanString(food.description || food.lowercaseDescription, 200),
    brand: cleanString(food.brandName || food.brandOwner, 120),
    quantity: cleanString(food.packageWeight, 80),
    ingredients: cleanString(food.ingredients, 1500),
    nutrition: getNutrientsFromUsda(food),
    manufacturer: cleanString(food.brandOwner || food.brandName, 160),
    raw: {
      fdcId: food.fdcId || null,
      dataSource: food.dataSource || 'USDA',
      foodCategory: food.foodCategory || null,
    },
  }
}

export function mapNpcItemToCandidate(item = {}) {
  return {
    ean: cleanString(item.gtin, 32),
    name: cleanString(item.nameRu || item.nameKk, 200),
    nameKz: cleanString(item.nameKk, 200),
    brand: getNpcAttribute(item, ['brand']),
    manufacturer: getNpcAttribute(item, ['a4282e5d', 'manufacturer', 'producer']),
    countryOfOrigin: getNpcAttribute(item, ['producer_country', 'country']),
    raw: {
      npcId: item.id || null,
      ntin: item.ntin || null,
      fullCategoryCode: item.fullCategoryCode || null,
      categoryNameRuL1: item.categoryNameRuL1 || null,
      categoryNameRuL4: item.categoryNameRuL4 || null,
    },
  }
}

async function findCachedCandidate({ supabase, ean, lang }) {
  if (!supabase || !ean) return null
  const { data, error } = await supabase
    .from('external_product_cache')
    .select('*')
    .eq('ean', ean)
    .maybeSingle()
  if (error || !data || !isFreshCache(data)) return null

  const confidence = data.raw_payload?.controlledConfidence
  const reviewStatus = data.raw_payload?.reviewStatus || 'candidate'
  const candidate = {
    ...rowToCandidate(data),
    confidence: confidence || rowToCandidate(data).confidence,
    reviewStatus,
  }
  if (!canShowExternalCandidateToBuyer(candidate)) return null

  return {
    status: 'ready',
    fromCache: true,
    persisted: true,
    candidate,
    externalReference: buildExternalReferenceNotice({ lang, candidate }),
  }
}

async function fetchUsdaCandidate({ request, env, fetchImpl }) {
  if (!env?.USDA_API_KEY) return null
  const query =
    request.lookupKeys.ean ||
    [request.lookupKeys.brand, request.lookupKeys.name].filter(Boolean).join(' ')
  if (!query) return null
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&dataType=Branded&pageSize=5&api_key=${encodeURIComponent(env.USDA_API_KEY)}`
  const json = await fetchJson(url, { fetchImpl })
  const foods = Array.isArray(json?.foods) ? json.foods : []
  if (!foods.length) return null
  return mapUsdaFoodToCandidate(foods[0])
}

async function fetchNpcCandidate({ request, env, fetchImpl }) {
  if (!env?.NPC_API_KEY || !request.lookupKeys.name) return null
  const response = await fetchImpl('https://nationalcatalog.kz/gw/search/api/v1/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': env.NPC_API_KEY,
    },
    body: JSON.stringify({
      query: [request.lookupKeys.brand, request.lookupKeys.name].filter(Boolean).join(' '),
      page: 1,
      size: 5,
    }),
  })
  if (!response?.ok) return null
  const json = await response.json()
  const item = Array.isArray(json?.items) ? json.items[0] : null
  return item ? mapNpcItemToCandidate(item) : null
}

function pickBestCandidate({ product, candidates }) {
  const normalized = candidates
    .filter(Boolean)
    .map(({ candidate, source }) =>
      normalizeExternalCandidate({
        product,
        candidate,
        source,
      })
    )
    .sort((a, b) => {
      const rank = {
        exact_ean_match: 5,
        probable_product_match: 4,
        weak_match: 2,
        not_found: 1,
        conflict: 0,
      }
      return (rank[b.confidence] || 0) - (rank[a.confidence] || 0) || b.matchScore - a.matchScore
    })
  return normalized[0] || normalizeExternalCandidate({ product, candidate: null })
}

async function persistCandidate({ supabase, request, candidate }) {
  if (!supabase || !request.lookupKeys.ean || !candidate) return false
  const fields = candidate.fields || {}
  const source = candidate.source?.domain || 'usda'
  const ttlExpiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString()
  const payload = {
    ean: request.lookupKeys.ean,
    source,
    normalized_name: request.lookupKeys.name || null,
    normalized_brand: request.lookupKeys.brand || null,
    normalized_quantity: request.lookupKeys.quantity || null,
    normalized_ingredients: fields.ingredients || null,
    normalized_allergens_json: fields.allergens || [],
    normalized_nutriments_json: fields.nutrition || {},
    raw_payload: {
      controlledConfidence: candidate.confidence,
      reviewStatus: candidate.reviewStatus || 'candidate',
      sourceDomain: candidate.source?.domain || source,
      sourceUrl: candidate.source?.url || null,
      fetchedAt: new Date().toISOString(),
      manufacturer: fields.manufacturer || null,
      ttlExpiresAt,
    },
    ttl_expires_at: ttlExpiresAt,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase
    .from('external_product_cache')
    .upsert(payload, { onConflict: 'ean' })
  return !error
}

export async function resolveControlledProductEnrichment({
  product = {},
  userQuery = '',
  profile = {},
  lang = 'ru',
  supabase = null,
  env = {},
  fetchImpl = globalThis.fetch,
} = {}) {
  const request = buildEnrichmentRequest({ product, userQuery, profile })
  if (!request.allowed) {
    return { status: 'skipped', reason: request.reason, reasons: request.reasons }
  }
  if (typeof fetchImpl !== 'function') {
    return { status: 'skipped', reason: 'fetch_unavailable', reasons: request.reasons }
  }

  const cached = await findCachedCandidate({ supabase, ean: request.lookupKeys.ean, lang })
  if (cached) return cached

  const candidates = []
  const usda = await fetchUsdaCandidate({ request, env, fetchImpl }).catch(() => null)
  if (usda) candidates.push({ candidate: usda, source: { domain: 'usda' } })

  if (!usda?.ingredients && env?.NPC_API_KEY) {
    const npc = await fetchNpcCandidate({ request, env, fetchImpl }).catch(() => null)
    if (npc) candidates.push({ candidate: npc, source: { domain: 'npc' } })
  }

  const candidate = pickBestCandidate({ product, candidates })
  const persisted = await persistCandidate({ supabase, request, candidate }).catch(() => false)

  if (!canShowExternalCandidateToBuyer(candidate)) {
    return {
      status: candidate.confidence === 'not_found' ? 'not_found' : 'review_only',
      persisted,
      candidate,
    }
  }

  return {
    status: 'ready',
    fromCache: false,
    persisted,
    candidate,
    externalReference: buildExternalReferenceNotice({ lang, candidate }),
  }
}
