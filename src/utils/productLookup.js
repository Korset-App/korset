/**
 * productLookup.js
 * Порядок поиска:
 * 1. Локальный products.json (по полю ean)
 * 2. Supabase (кэш ранее найденных товаров)
 * 3. Open Food Facts API
 * Если найдено в OFF — сохраняем в Supabase для следующих запросов
 */

import products from '../data/products.json'
import { supabase } from './supabase.js'

// ── 1. Локальный поиск ────────────────────────────────────────────────────────
export function findLocalByEan(ean) {
  return products.find(p => p.ean === ean) || null
}

// ── 2. Supabase кэш ───────────────────────────────────────────────────────────
export async function findInSupabase(ean) {
  try {
    const { data, error } = await supabase
      .from('products_cache')
      .select('*')
      .eq('ean', ean)
      .single()
    if (error || !data) return null
    return data
  } catch {
    return null
  }
}

// ── 3. Open Food Facts ────────────────────────────────────────────────────────
export async function fetchFromOpenFoodFacts(ean) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${ean}?fields=product_name,brands,ingredients_text_ru,ingredients_text,allergens_tags,allergens_hierarchy,nutriments,image_front_url,categories_tags,labels_tags,quantity,nutriscore_grade`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const json = await res.json()
    if (json.status !== 1 || !json.product) return null
    return normalizeOFFProduct(ean, json.product)
  } catch {
    return null
  }
}

// ── Нормализация данных OFF → наш формат ──────────────────────────────────────
function normalizeOFFProduct(ean, p) {
  const name = p.product_name || p.brands || `Товар ${ean}`
  const brand = p.brands || ''
  const ingredients = p.ingredients_text_ru || p.ingredients_text || ''
  const image = p.image_front_url || null

  // Аллергены
  const ALLERGEN_MAP = {
    'en:milk': 'milk', 'en:gluten': 'gluten', 'en:nuts': 'nuts',
    'en:peanuts': 'peanuts', 'en:soybeans': 'soy', 'en:eggs': 'eggs',
    'en:fish': 'fish', 'en:crustaceans': 'shellfish', 'en:wheat': 'gluten',
    'en:celery': 'celery', 'en:sesame-seeds': 'sesame',
  }
  const raw = p.allergens_tags || p.allergens_hierarchy || []
  const allergens = [...new Set(raw.map(a => ALLERGEN_MAP[a]).filter(Boolean))]

  // Питательность на 100г
  const n = p.nutriments || {}
  const nutrition = {
    calories:  n['energy-kcal_100g'] ?? n['energy_100g'] ?? null,
    protein:   n.proteins_100g ?? null,
    fat:       n.fat_100g ?? null,
    carbs:     n.carbohydrates_100g ?? null,
    sugar:     n.sugars_100g ?? null,
    salt:      n.salt_100g ?? null,
  }

  // Теги диеты из меток
  const labels = p.labels_tags || []
  const dietTags = []
  if (labels.some(l => /vegan/i.test(l)))       dietTags.push('vegan')
  if (labels.some(l => /vegetarian/i.test(l)))  dietTags.push('vegetarian')
  if (labels.some(l => /halal/i.test(l)))        dietTags.push('halal')
  if (labels.some(l => /gluten-free/i.test(l)))  dietTags.push('gluten_free')
  if (labels.some(l => /organic/i.test(l)))      dietTags.push('organic')
  if (nutrition.sugar !== null && nutrition.sugar < 1) dietTags.push('sugar_free')
  if (allergens.includes('milk') === false && dietTags.includes('vegan') === false
      && labels.some(l => /dairy.free|lactose/i.test(l))) dietTags.push('dairy_free')

  return {
    ean,
    name:        name.trim(),
    brand:       brand.trim(),
    ingredients,
    allergens,
    dietTags,
    nutrition,
    image,
    source:      'openfoodfacts',
    cached_at:   new Date().toISOString(),
  }
}

// ── Сохранение в Supabase ─────────────────────────────────────────────────────
export async function saveToSupabase(product) {
  try {
    await supabase
      .from('products_cache')
      .upsert(product, { onConflict: 'ean' })
  } catch {
    // Silent fail — кэш не критичен
  }
}

// ── Запись события сканирования (аналитика) ───────────────────────────────────
export async function logScanEvent(ean, found, source) {
  try {
    await supabase.from('scan_events').insert({
      ean,
      found,
      source, // 'local' | 'supabase' | 'openfoodfacts' | 'not_found'
      scanned_at: new Date().toISOString(),
    })
  } catch {
    // Silent fail
  }
}

// ── Главная функция поиска ────────────────────────────────────────────────────
export async function lookupProduct(ean) {
  // 1. Локальный JSON
  const local = findLocalByEan(ean)
  if (local) {
    logScanEvent(ean, true, 'local')
    return { type: 'local', product: local }
  }

  // 2. Supabase кэш
  const cached = await findInSupabase(ean)
  if (cached) {
    logScanEvent(ean, true, 'supabase')
    return { type: 'external', product: cached }
  }

  // 3. Open Food Facts
  const off = await fetchFromOpenFoodFacts(ean)
  if (off) {
    saveToSupabase(off) // async, не ждём
    logScanEvent(ean, true, 'openfoodfacts')
    return { type: 'external', product: off }
  }

  // Не найден нигде
  logScanEvent(ean, false, 'not_found')
  return { type: 'not_found', ean }
}
