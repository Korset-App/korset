import localProducts from '../data/products.json'
import { supabase } from './supabase.js'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY

// ── 1. Supabase products ──────────────────────────────────────────────────────
async function findInSupabaseProducts(ean) {
  try {
    const { data } = await supabase.from('products').selectOne('*', { ean })
    if (!data) return null
    return normalizeSupabaseProduct(data)
  } catch { return null }
}

// ── 2. Кэш OFF ────────────────────────────────────────────────────────────────
async function findInCache(ean) {
  try {
    const { data } = await supabase.from('products_cache').selectOne('*', { ean })
    return data || null
  } catch { return null }
}

// ── 3. Open Food Facts ────────────────────────────────────────────────────────
async function fetchFromOFF(ean) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${ean}?fields=product_name,brands,ingredients_text_ru,ingredients_text,allergens_tags,allergens_hierarchy,nutriments,image_front_url,labels_tags,quantity`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const json = await res.json()
    if (json.status !== 1 || !json.product) return null
    return normalizeOFF(ean, json.product)
  } catch { return null }
}

// ── 4. AI улучшение через Groq ────────────────────────────────────────────────
async function enrichWithAI(product) {
  if (!GROQ_KEY) return product
  const needsEnrichment = !product.ingredients || product.ingredients.length < 20
  if (!needsEnrichment) return product
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
    return { ...product, ingredients: ai.ingredients || product.ingredients, allergens: ai.allergens || product.allergens, dietTags: ai.dietTags || product.dietTags, description: ai.description || product.description }
  } catch { return product }
}

// ── Сохранение в кэш ──────────────────────────────────────────────────────────
async function saveToCache(product) {
  try {
    await supabase.from('products_cache').upsert({
      ean: product.ean, name: product.name, brand: product.brand || null,
      ingredients: product.ingredients || null, allergens: product.allergens || [],
      diet_tags: product.dietTags || [], nutrition: product.nutrition || null,
      image: product.image || null, source: 'openfoodfacts',
    }, 'ean')
  } catch {}
}

// ── Аналитика ─────────────────────────────────────────────────────────────────
async function logScan(ean, found, source) {
  try {
    await supabase.from('scan_events').insert({ ean, found, source, scanned_at: new Date().toISOString() })
  } catch {}
}

// ── Нормализация ──────────────────────────────────────────────────────────────
function normalizeSupabaseProduct(p) {
  return {
    id: p.id, ean: p.ean, name: p.name, brand: p.brand,
    category: p.category, shelf: p.shelf, priceKzt: p.price_kzt,
    images: p.images || [], ingredients: p.ingredients,
    allergens: p.allergens || [], dietTags: p.diet_tags || [],
    nutrition: p.nutrition, specs: p.specs,
    halal: p.halal, qualityScore: p.quality_score, source: 'supabase',
  }
}

function normalizeOFF(ean, p) {
  const MAP = { 'en:milk':'milk','en:gluten':'gluten','en:nuts':'nuts','en:peanuts':'peanuts','en:soybeans':'soy','en:eggs':'eggs','en:fish':'fish','en:crustaceans':'shellfish','en:wheat':'gluten' }
  const allergens = [...new Set((p.allergens_tags||[]).map(a=>MAP[a]).filter(Boolean))]
  const labels = p.labels_tags || []
  const dietTags = []
  if (labels.some(l=>/vegan/i.test(l))) dietTags.push('vegan')
  if (labels.some(l=>/vegetarian/i.test(l))) dietTags.push('vegetarian')
  if (labels.some(l=>/halal/i.test(l))) dietTags.push('halal')
  if (labels.some(l=>/gluten.free/i.test(l))) dietTags.push('gluten_free')
  const n = p.nutriments || {}
  return {
    ean, name: (p.product_name||'').trim()||`Товар ${ean}`,
    brand: (p.brands||'').trim(), ingredients: p.ingredients_text_ru||p.ingredients_text||'',
    allergens, dietTags,
    nutrition: { calories: n['energy-kcal_100g']??null, protein: n.proteins_100g??null, fat: n.fat_100g??null, carbs: n.carbohydrates_100g??null, sugar: n.sugars_100g??null },
    image: p.image_front_url||null, source: 'openfoodfacts',
  }
}

// ── ГЛАВНАЯ ФУНКЦИЯ ───────────────────────────────────────────────────────────
export async function lookupProduct(ean) {
  // 1. Supabase products
  const sbProduct = await findInSupabaseProducts(ean)
  if (sbProduct) { logScan(ean, true, 'supabase_products'); return { type: 'local', product: sbProduct } }

  // Fallback: локальный JSON
  const local = localProducts.find(p => p.ean === ean)
  if (local) { logScan(ean, true, 'local_json'); return { type: 'local', product: local } }

  // 2. Кэш
  const cached = await findInCache(ean)
  if (cached) { logScan(ean, true, 'cache'); return { type: 'external', product: cached } }

  // 3. Open Food Facts + AI
  const off = await fetchFromOFF(ean)
  if (off) {
    const enriched = await enrichWithAI(off)
    saveToCache(enriched)
    logScan(ean, true, 'openfoodfacts')
    return { type: 'external', product: enriched }
  }

  logScan(ean, false, 'not_found')
  return { type: 'not_found', ean }
}
