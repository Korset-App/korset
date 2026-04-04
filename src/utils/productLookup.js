import { getGlobalDemoProducts, getStoreCatalogProductByEan, getGlobalProductByEan } from './storeCatalog.js'
import { supabase } from './supabase.js'
import { enrichProductAI } from '../services/ai.js'

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

function findInDemoStore(ean, storeId) {
  if (!storeId) return null
  const product = getStoreCatalogProductByEan(storeId, ean)
  if (!product) return null
  return { ...product, source: 'demo_store', storeProductId: null }
}

async function findInStoreProducts(ean, storeId) {
  try {
    let query = supabase
      .from('store_products')
      .select('id,ean,price_kzt,shelf_zone,shelf_position,stock_status,global_product_id,store_id')
      .eq('ean', ean)
      .eq('is_active', true)

    if (storeId) query = query.eq('store_id', storeId)

    const { data, error } = await query.maybeSingle()
    if (error || !data?.global_product_id) return null

    const { data: gp, error: gpError } = await supabase
      .from('global_products')
      .select('*')
      .eq('id', data.global_product_id)
      .maybeSingle()

    if (gpError || !gp) return null

    return normalizeGlobalProduct(gp, {
      priceKzt: data.price_kzt,
      shelf: [data.shelf_zone, data.shelf_position].filter(Boolean).join(' / '),
      stockStatus: data.stock_status || null,
      storeId: data.store_id || storeId || null,
      storeProductId: data.id,
    })
  } catch {
    return null
  }
}

async function findInGlobalProducts(ean) {
  try {
    const { data, error } = await supabase
      .from('global_products')
      .select('*')
      .eq('ean', ean)
      .eq('is_active', true)
      .maybeSingle()
    if (error || !data) return null
    return normalizeGlobalProduct(data)
  } catch {
    return null
  }
}

async function findInCache(ean) {
  try {
    const { data, error } = await supabase.from('external_product_cache').select('*').eq('ean', ean).maybeSingle()
    if (error || !data) return null
    supabase
      .from('external_product_cache')
      .upsert({ ean, scan_count: (data.scan_count || 1) + 1, updated_at: new Date().toISOString() }, { onConflict: 'ean' })
      .then()
    return normalizeCacheProduct(data)
  } catch {
    return null
  }
}

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
  } catch {
    return null
  }
}

async function enrichWithAI(product) {
  if (product.ingredients && product.ingredients.length > 20) return product
  try {
    const ai = await enrichProductAI(product)
    if (!ai) return product
    return {
      ...product,
      ingredients: ai.ingredients || product.ingredients,
      allergens: ai.allergens || product.allergens,
      dietTags: ai.dietTags || product.dietTags,
      description: ai.description || product.description,
    }
  } catch {
    return product
  }
}

async function saveToCache(product) {
  try {
    await supabase.from('external_product_cache').upsert(
      {
        ean: product.ean,
        source: 'openfoodfacts',
        raw_payload: {},
        normalized_name: product.name,
        normalized_brand: product.brand || null,
        normalized_ingredients: product.ingredients || null,
        normalized_allergens_json: JSON.stringify(product.allergens || []),
        normalized_diet_tags_json: JSON.stringify(product.dietTags || []),
        normalized_nutriments_json: JSON.stringify(product.nutritionPer100 || {}),
        image_url: product.image || null,
        nutriscore: product.nutriscore || null,
        scan_count: 1,
      },
      { onConflict: 'ean' }
    )
  } catch {}
}

async function logMissingProduct(ean, storeId) {
  try {
    await supabase.from('missing_products').upsert(
      {
        ean,
        store_id: storeId || null,
        scan_count: 1,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        resolved: false,
      },
      { onConflict: 'store_id,ean' }
    )
  } catch {}
}

async function logScan({ ean, foundStatus, globalProductId, storeProductId, storeId, fitResult }) {
  try {
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr) console.warn('Auth check in logScan:', authErr.message)

    let internalUserId = null
    if (user) {
      const { data } = await supabase.from('users').select('id').eq('auth_id', user.id).maybeSingle()
      if (data) internalUserId = data.id
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const validGlobalId = globalProductId && uuidRegex.test(globalProductId) ? globalProductId : null
    const validStoreProductId = storeProductId && uuidRegex.test(storeProductId) ? storeProductId : null

    const { error } = await supabase.from('scan_events').insert({
      ean,
      found_status: foundStatus,
      global_product_id: validGlobalId,
      store_product_id: validStoreProductId,
      store_id: storeId || null,
      user_id: internalUserId,
      fit_result: fitResult ?? null,
      device_id: getDeviceId(),
      session_id: getSessionId(),
      app_version: '1.0',
    })
    if (!error) {
      window.dispatchEvent(new CustomEvent('korset:scan_added'))
    } else {
      console.error('logScan insert error:', error.message)
    }
  } catch (err) {
    console.error('logScan exception:', err)
  }
}

function normalizeGlobalProduct(p, storeData = {}) {
  const allergens = Array.isArray(p.allergens_json) ? p.allergens_json : tryParse(p.allergens_json, [])
  const dietTags = Array.isArray(p.diet_tags_json) ? p.diet_tags_json : tryParse(p.diet_tags_json, [])
  const nutrition = typeof p.nutriments_json === 'object' && p.nutriments_json ? p.nutriments_json : tryParse(p.nutriments_json, {})
  const images = Array.isArray(p.images) ? p.images : tryParse(p.images, [])
  return {
    id: p.id,
    ean: p.ean,
    name: p.name,
    brand: p.brand,
    category: p.category,
    quantity: p.quantity,
    image: p.image_url || images[0] || null,
    images,
    ingredients: p.ingredients_raw,
    allergens,
    dietTags,
    halalStatus: p.halal_status || 'unknown',
    halal: p.halal_status === 'yes',
    nutritionPer100: {
      kcal: nutrition.kcal ?? nutrition.calories ?? nutrition['energy-kcal_100g'] ?? null,
      protein: nutrition.protein ?? null,
      fat: nutrition.fat ?? null,
      carbs: nutrition.carbs ?? null,
      sugar: nutrition.sugar ?? null,
      fiber: nutrition.fiber ?? null,
      salt: nutrition.salt ?? null,
    },
    nutriscore: p.nutriscore,
    qualityScore: p.data_quality_score,
    manufacturer: typeof p.manufacturer === 'object' ? p.manufacturer : { name: p.manufacturer || null, country: p.country_of_origin || null },
    source: 'global',
    priceKzt: storeData.priceKzt ?? null,
    shelf: storeData.shelf ?? null,
    stockStatus: storeData.stockStatus ?? null,
    storeId: storeData.storeId ?? null,
    storeProductId: storeData.storeProductId ?? null,
    isStoreProduct: Boolean(storeData.storeId || storeData.storeProductId || storeData.priceKzt || storeData.shelf),
  }
}

function normalizeCacheProduct(p) {
  const nutrition = tryParse(p.normalized_nutriments_json, {})
  return {
    ean: p.ean,
    name: p.normalized_name || `Товар ${p.ean}`,
    brand: p.normalized_brand,
    ingredients: p.normalized_ingredients,
    allergens: tryParse(p.normalized_allergens_json, []),
    dietTags: tryParse(p.normalized_diet_tags_json, []),
    nutritionPer100: {
      kcal: nutrition.kcal ?? nutrition.calories ?? null,
      protein: nutrition.protein ?? null,
      fat: nutrition.fat ?? null,
      carbs: nutrition.carbs ?? null,
      sugar: nutrition.sugar ?? null,
      fiber: nutrition.fiber ?? null,
      salt: nutrition.salt ?? null,
    },
    image: p.image_url,
    images: p.image_url ? [p.image_url] : [],
    nutriscore: p.nutriscore,
    halalStatus: 'unknown',
    halal: false,
    source: 'cache',
  }
}

function normalizeOFF(ean, p) {
  const ALLERGEN_MAP = {
    'en:milk': 'milk',
    'en:gluten': 'gluten',
    'en:nuts': 'nuts',
    'en:peanuts': 'peanuts',
    'en:soybeans': 'soy',
    'en:eggs': 'eggs',
    'en:fish': 'fish',
    'en:crustaceans': 'shellfish',
    'en:wheat': 'gluten',
  }
  const allergens = [...new Set((p.allergens_tags || []).map((a) => ALLERGEN_MAP[a]).filter(Boolean))]
  const labels = p.labels_tags || []
  const dietTags = []
  if (labels.some((l) => /vegan/i.test(l))) dietTags.push('vegan')
  if (labels.some((l) => /vegetarian/i.test(l))) dietTags.push('vegetarian')
  if (labels.some((l) => /halal/i.test(l))) dietTags.push('halal')
  if (labels.some((l) => /gluten.free/i.test(l))) dietTags.push('gluten_free')

  const n = p.nutriments || {}
  return {
    ean,
    name: (p.product_name || '').trim() || `Товар ${ean}`,
    brand: (p.brands || '').trim(),
    quantity: p.quantity || null,
    ingredients: p.ingredients_text_ru || p.ingredients_text || '',
    allergens,
    dietTags,
    nutritionPer100: {
      kcal: n['energy-kcal_100g'] ?? null,
      protein: n.proteins_100g ?? null,
      fat: n.fat_100g ?? null,
      carbs: n.carbohydrates_100g ?? null,
      sugar: n.sugars_100g ?? null,
      fiber: n.fiber_100g ?? null,
      salt: n.salt_100g ?? null,
    },
    image: p.image_front_url || null,
    images: p.image_front_url ? [p.image_front_url] : [],
    nutriscore: p.nutriscore_grade?.toUpperCase() || null,
    halalStatus: dietTags.includes('halal') ? 'yes' : 'unknown',
    halal: dietTags.includes('halal'),
    source: 'openfoodfacts',
  }
}

function tryParse(val, fallback) {
  if (!val) return fallback
  if (typeof val === 'object') return val
  try {
    return JSON.parse(val)
  } catch {
    return fallback
  }
}


function cacheLocalScan(product, meta = {}) {
  try {
    if (!product?.ean) return
    const raw = JSON.parse(localStorage.getItem('korset_scan_history_cache') || '[]')
    const list = Array.isArray(raw) ? raw : []
    const nextItem = {
      ean: product.ean,
      name: product.name || `Товар ${product.ean}`,
      brand: product.brand || null,
      image: product.image || product.images?.[0] || null,
      images: Array.isArray(product.images) ? product.images : (product.image ? [product.image] : []),
      source: product.source || 'unknown',
      scanDate: new Date().toISOString(),
      scannedAt: new Date().toISOString(),
      storeId: meta.storeId || null,
    }
    const filtered = list.filter((item) => item?.ean !== product.ean)
    filtered.unshift(nextItem)
    const nextList = filtered.slice(0, 50)
    localStorage.setItem('korset_scan_history_cache', JSON.stringify(nextList))
    window.dispatchEvent(new CustomEvent('korset:scan_added', { detail: { count: nextList.length, ean: product.ean } }))
  } catch {}
}

export async function lookupProduct(ean, storeId = null) {
  const demoStoreProduct = findInDemoStore(ean, storeId)
  if (demoStoreProduct) {
    logScan({ ean, foundStatus: 'found_store', storeId })
    cacheLocalScan(demoStoreProduct, { storeId })
    return { type: 'local', product: demoStoreProduct }
  }

  const storeProduct = await findInStoreProducts(ean, storeId)
  if (storeProduct) {
    logScan({
      ean,
      foundStatus: 'found_store',
      globalProductId: storeProduct.id,
      storeProductId: storeProduct.storeProductId,
      storeId,
    })
    cacheLocalScan(storeProduct, { storeId })
    return { type: 'local', product: storeProduct }
  }

  const globalProduct = await findInGlobalProducts(ean)
  if (globalProduct) {
    logScan({ ean, foundStatus: 'found_global', globalProductId: globalProduct.id, storeId })
    cacheLocalScan(globalProduct, { storeId })
    return { type: 'local', product: globalProduct }
  }

  const local = getGlobalProductByEan(ean)
  if (local) {
    logScan({ ean, foundStatus: 'found_global', storeId })
    cacheLocalScan(local, { storeId })
    return { type: 'local', product: local }
  }

  const cached = await findInCache(ean)
  if (cached) {
    logScan({ ean, foundStatus: 'found_cache', storeId })
    cacheLocalScan(cached, { storeId })
    return { type: 'external', product: cached }
  }

  const off = await fetchFromOFF(ean)
  if (off) {
    const enriched = await enrichWithAI(off)
    saveToCache(enriched)
    logScan({ ean, foundStatus: 'found_off', storeId })
    cacheLocalScan(enriched, { storeId })
    return { type: 'external', product: enriched }
  }

  logScan({ ean, foundStatus: 'not_found', storeId })
  logMissingProduct(ean, storeId)
  return { type: 'not_found', ean }
}
