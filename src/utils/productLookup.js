import localProducts from '../data/products.json'
import { supabase } from './supabase.js'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY

// Получаем или создаём device_id для аналитики
function getDeviceId() {
  let id = localStorage.getItem('korset_device_id')
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('korset_device_id', id)
  }
  return id
}

function getSessionId() {
  let id = sessionStorage.getItem('korset_session_id')
  if (!id) {
    id = 'ses_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem('korset_session_id', id)
  }
  return id
}

// ── 1. store_products — ассортимент магазина (с ценой и полкой) ──────────────
async function findInStoreProducts(ean) {
  try {
    const { data } = await supabase.from('store_products').selectOne(
      'id,ean,price_kzt,shelf_zone,shelf_position,local_name,local_sku,stock_status,global_product_id',
      { ean, is_active: true }
    )
    if (!data?.global_product_id) return null

    // Подтягиваем глобальные данные товара
    const { data: gp } = await supabase.from('global_products').selectOne('*', {
      id: data.global_product_id
    })
    if (!gp) return null

    return normalizeGlobalProduct(gp, {
      priceKzt:  data.price_kzt,
      shelf:     [data.shelf_zone, data.shelf_position].filter(Boolean).join(' / '),
      storeProductId: data.id,
    })
  } catch { return null }
}

// ── 2. global_products — глобальный каталог Körset ───────────────────────────
async function findInGlobalProducts(ean) {
  try {
    const { data } = await supabase.from('global_products').selectOne('*', {
      ean, is_active: true
    })
    if (!data) return null
    return normalizeGlobalProduct(data)
  } catch { return null }
}

// ── 3. external_product_cache — кэш Open Food Facts ─────────────────────────
async function findInCache(ean) {
  try {
    const { data } = await supabase.from('external_product_cache').selectOne('*', { ean })
    if (!data) return null
    // Обновляем счётчик сканирований
    supabase.from('external_product_cache').upsert(
      { ean, scan_count: (data.scan_count || 1) + 1, updated_at: new Date().toISOString() },
      'ean'
    )
    return normalizeCacheProduct(data)
  } catch { return null }
}

// ── 4. Open Food Facts API ───────────────────────────────────────────────────
async function fetchFromOFF(ean) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${ean}?fields=product_name,brands,ingredients_text_ru,ingredients_text,allergens_tags,nutriments,image_front_url,labels_tags,nutriscore_grade,quantity`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const json = await res.json()
    if (json.status !== 1 || !json.product) return null
    return normalizeOFF(ean, json.product)
  } catch { return null }
}

// ── 5. AI обогащение через Groq ──────────────────────────────────────────────
async function enrichWithAI(product) {
  if (!GROQ_KEY) return product
  if (product.ingredients && product.ingredients.length > 20) return product
  try {
    const prompt = `Товар: "${product.name}"${product.brand ? `, бренд: ${product.brand}` : ''}.
Ответь ТОЛЬКО JSON без markdown:
{"ingredients":"состав на русском","allergens":["milk","gluten","nuts","eggs","fish","soy","peanuts","shellfish"],"dietTags":["halal","vegan","vegetarian","gluten_free","dairy_free","sugar_free"],"description":"1 предложение о товаре"}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({ model: 'llama-3.1-8b-instant', max_tokens: 300, messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(5000)
    })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim()
    if (!text) return product
    const ai = JSON.parse(text.replace(/```json|```/g, '').trim())
    return {
      ...product,
      ingredients: ai.ingredients || product.ingredients,
      allergens:   ai.allergens   || product.allergens,
      dietTags:    ai.dietTags    || product.dietTags,
      description: ai.description || product.description,
    }
  } catch { return product }
}

// ── Сохранение в external_product_cache ─────────────────────────────────────
async function saveToCache(product) {
  try {
    await supabase.from('external_product_cache').upsert({
      ean:                       product.ean,
      source:                    'openfoodfacts',
      raw_payload:               {},
      normalized_name:           product.name,
      normalized_brand:          product.brand || null,
      normalized_ingredients:    product.ingredients || null,
      normalized_allergens_json: JSON.stringify(product.allergens || []),
      normalized_diet_tags_json: JSON.stringify(product.dietTags || []),
      normalized_nutriments_json: JSON.stringify(product.nutrition || {}),
      image_url:                 product.image || null,
      nutriscore:                product.nutriscore || null,
      scan_count:                1,
    }, 'ean')
  } catch {}
}

// ── Логируем пропавший товар в missing_products ──────────────────────────────
async function logMissingProduct(ean, storeId) {
  try {
    // Пробуем INCREMENT счётчика через upsert
    await supabase.from('missing_products').upsert({
      ean,
      store_id:      storeId || null,
      scan_count:    1,
      first_seen_at: new Date().toISOString(),
      last_seen_at:  new Date().toISOString(),
      resolved:      false,
    }, 'store_id,ean')
  } catch {}
}

// ── Аналитика: пишем scan_event ──────────────────────────────────────────────
async function logScan({ ean, foundStatus, globalProductId, storeProductId, storeId, fitResult }) {
  try {
    await supabase.from('scan_events').insert({
      ean,
      found_status:       foundStatus,
      global_product_id:  globalProductId  || null,
      store_product_id:   storeProductId   || null,
      store_id:           storeId          || null,
      fit_result:         fitResult        ?? null,
      device_id:          getDeviceId(),
      session_id:         getSessionId(),
      app_version:        '1.0',
    })
  } catch {}
}

// ── Нормализация: global_products → единый формат приложения ─────────────────
function normalizeGlobalProduct(p, storeData = {}) {
  const allergens  = Array.isArray(p.allergens_json)
    ? p.allergens_json
    : tryParse(p.allergens_json, [])

  const dietTags   = Array.isArray(p.diet_tags_json)
    ? p.diet_tags_json
    : tryParse(p.diet_tags_json, [])

  const nutrition  = typeof p.nutriments_json === 'object' && p.nutriments_json
    ? p.nutriments_json
    : tryParse(p.nutriments_json, {})

  return {
    id:           p.id,
    ean:          p.ean,
    name:         p.name,
    brand:        p.brand,
    category:     p.category,
    quantity:     p.quantity,
    image:        p.image_url,
    images:       p.images || [],
    ingredients:  p.ingredients_raw,
    allergens,
    dietTags,
    halal:        p.halal_status === 'yes',
    halalStatus:  p.halal_status,
    nutrition,
    nutriscore:   p.nutriscore,
    qualityScore: p.data_quality_score,
    manufacturer: p.manufacturer,
    country:      p.country_of_origin,
    source:       'global',
    // данные от магазина (если пришли из store_products)
    priceKzt:     storeData.priceKzt   || null,
    shelf:        storeData.shelf      || null,
    storeProductId: storeData.storeProductId || null,
  }
}

// ── Нормализация: external_product_cache → единый формат ─────────────────────
function normalizeCacheProduct(p) {
  return {
    ean:         p.ean,
    name:        p.normalized_name || `Товар ${p.ean}`,
    brand:       p.normalized_brand,
    ingredients: p.normalized_ingredients,
    allergens:   tryParse(p.normalized_allergens_json, []),
    dietTags:    tryParse(p.normalized_diet_tags_json, []),
    nutrition:   tryParse(p.normalized_nutriments_json, {}),
    image:       p.image_url,
    nutriscore:  p.nutriscore,
    source:      'cache',
  }
}

// ── Нормализация: Open Food Facts → единый формат ────────────────────────────
function normalizeOFF(ean, p) {
  const ALLERGEN_MAP = {
    'en:milk':'milk','en:gluten':'gluten','en:nuts':'nuts',
    'en:peanuts':'peanuts','en:soybeans':'soy','en:eggs':'eggs',
    'en:fish':'fish','en:crustaceans':'shellfish','en:wheat':'gluten',
  }
  const allergens = [...new Set(
    (p.allergens_tags || []).map(a => ALLERGEN_MAP[a]).filter(Boolean)
  )]
  const labels   = p.labels_tags || []
  const dietTags = []
  if (labels.some(l => /vegan/i.test(l)))       dietTags.push('vegan')
  if (labels.some(l => /vegetarian/i.test(l)))  dietTags.push('vegetarian')
  if (labels.some(l => /halal/i.test(l)))       dietTags.push('halal')
  if (labels.some(l => /gluten.free/i.test(l))) dietTags.push('gluten_free')

  const n = p.nutriments || {}
  return {
    ean,
    name:        (p.product_name || '').trim() || `Товар ${ean}`,
    brand:       (p.brands || '').trim(),
    ingredients: p.ingredients_text_ru || p.ingredients_text || '',
    allergens,
    dietTags,
    nutrition: {
      calories: n['energy-kcal_100g'] ?? null,
      protein:  n.proteins_100g       ?? null,
      fat:      n.fat_100g            ?? null,
      carbs:    n.carbohydrates_100g  ?? null,
      sugar:    n.sugars_100g         ?? null,
    },
    image:     p.image_front_url  || null,
    nutriscore: p.nutriscore_grade?.toUpperCase() || null,
    source:    'openfoodfacts',
  }
}

function tryParse(val, fallback) {
  if (!val) return fallback
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return fallback }
}

// ── ГЛАВНАЯ ФУНКЦИЯ ───────────────────────────────────────────────────────────
export async function lookupProduct(ean, storeId = null) {
  // 1. store_products (товар с ценой в конкретном магазине)
  const storeProduct = await findInStoreProducts(ean)
  if (storeProduct) {
    logScan({ ean, foundStatus: 'found_store', globalProductId: storeProduct.id, storeProductId: storeProduct.storeProductId, storeId })
    return { type: 'local', product: storeProduct }
  }

  // 2. global_products (глобальный каталог, без цены)
  const globalProduct = await findInGlobalProducts(ean)
  if (globalProduct) {
    logScan({ ean, foundStatus: 'found_global', globalProductId: globalProduct.id, storeId })
    return { type: 'local', product: globalProduct }
  }

  // 3. Fallback: локальный products.json (демо-товары)
  const local = localProducts.find(p => p.ean === ean)
  if (local) {
    logScan({ ean, foundStatus: 'found_global', storeId })
    return { type: 'local', product: local }
  }

  // 4. external_product_cache
  const cached = await findInCache(ean)
  if (cached) {
    logScan({ ean, foundStatus: 'found_cache', storeId })
    return { type: 'external', product: cached }
  }

  // 5. Open Food Facts + AI обогащение
  const off = await fetchFromOFF(ean)
  if (off) {
    const enriched = await enrichWithAI(off)
    saveToCache(enriched)
    logScan({ ean, foundStatus: 'found_off', storeId })
    return { type: 'external', product: enriched }
  }

  // 6. Не найдено нигде
  logScan({ ean, foundStatus: 'not_found', storeId })
  logMissingProduct(ean, storeId)
  return { type: 'not_found', ean }
}
