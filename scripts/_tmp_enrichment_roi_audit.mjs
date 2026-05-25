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
const OUT_PATH = 'C:\\tmp\\korset-enrichment-roi-audit.json'
const PAGE_SIZE = 1000

const FOOD_SAFETY_CATEGORIES = new Set([
  'baby_food',
  'dairy_eggs',
  'healthy',
  'meat_fish',
  'nuts_dried_fruits',
  'snacks',
  'sweets',
  'water_beverages',
])

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
  return /^\d{8}$|^\d{13}$/.test(value)
}

function getNutrition(row) {
  const n = row.nutriments_json || {}
  return {
    carbs:
      n.carbs ??
      n.carbohydrates ??
      n.carbohydrates_100g ??
      n.carbohydrate ??
      n.carbohydrate_100g,
    sugar: n.sugar ?? n.sugars ?? n.sugars_100g,
    fiber: n.fiber ?? n.fiber_100g ?? n.fibers ?? n.fibers_100g,
    protein: n.protein ?? n.protein_100g ?? n.proteins ?? n.proteins_100g,
    fat: n.fat ?? n.fat_100g,
  }
}

function classify(row) {
  const nutrition = getNutrition(row)
  const missingIngredients = !hasText(row.ingredients_raw)
  const missingCarbs = !hasNumber(nutrition.carbs)
  const missingSugar = !hasNumber(nutrition.sugar)
  const missingFiber = !hasNumber(nutrition.fiber)
  const missingAnyNutrition = missingCarbs || missingSugar || missingFiber
  const realEan = isRealEan(row.ean)
  const hasImage = hasText(row.image_url) || hasText(row.r2_key)
  const strongCategory = FOOD_SAFETY_CATEGORIES.has(row.category)
  const source = row.source_primary || 'unknown'

  let score = 0
  if (missingIngredients) score += 35
  if (missingCarbs) score += 20
  if (missingSugar) score += 25
  if (missingFiber) score += 10
  if (realEan) score += 15
  if (strongCategory) score += 10
  if (hasImage) score += 5
  if (source === 'npc') score += 8

  let recommendedPath = 'complete_enough'
  if (missingIngredients || missingAnyNutrition) {
    if (realEan) recommendedPath = 'ean_source_cascade'
    else if (hasImage) recommendedPath = 'back_label_photo_or_ocr'
    else recommendedPath = 'manual_or_store_photo'
  }

  return {
    missingIngredients,
    missingCarbs,
    missingSugar,
    missingFiber,
    missingAnyNutrition,
    realEan,
    hasImage,
    strongCategory,
    source,
    score,
    recommendedPath,
  }
}

function bucket(map, key) {
  map[key] = (map[key] || 0) + 1
}

function addPathStats(stats, key, row, c) {
  if (!stats.byPath[key]) {
    stats.byPath[key] = {
      total: 0,
      realEan: 0,
      hasImage: 0,
      missingIngredients: 0,
      missingCarbs: 0,
      missingSugar: 0,
      missingFiber: 0,
    }
  }
  const item = stats.byPath[key]
  item.total += 1
  if (c.realEan) item.realEan += 1
  if (c.hasImage) item.hasImage += 1
  if (c.missingIngredients) item.missingIngredients += 1
  if (c.missingCarbs) item.missingCarbs += 1
  if (c.missingSugar) item.missingSugar += 1
  if (c.missingFiber) item.missingFiber += 1
}

async function fetchAll(sb) {
  const rows = []
  let from = 0

  while (true) {
    const { data, error } = await sb
      .from('global_products')
      .select(
        'id,ean,name,brand,category,subcategory,source_primary,ingredients_raw,nutriments_json,image_url,r2_key,is_active'
      )
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

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  const rows = await fetchAll(sb)
  const stats = {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    completeEnough: 0,
    fields: {
      ingredientsKnown: 0,
      carbsKnown: 0,
      sugarKnown: 0,
      fiberKnown: 0,
      realEan: 0,
      hasImage: 0,
    },
    bySource: {},
    byCategory: {},
    byPath: {},
    topCandidates: [],
  }

  const candidates = []

  for (const row of rows) {
    const c = classify(row)
    const nutrition = getNutrition(row)

    if (!c.missingIngredients) stats.fields.ingredientsKnown += 1
    if (!c.missingCarbs) stats.fields.carbsKnown += 1
    if (!c.missingSugar) stats.fields.sugarKnown += 1
    if (!c.missingFiber) stats.fields.fiberKnown += 1
    if (c.realEan) stats.fields.realEan += 1
    if (c.hasImage) stats.fields.hasImage += 1
    if (!c.missingIngredients && !c.missingAnyNutrition) stats.completeEnough += 1

    bucket(stats.bySource, c.source)
    bucket(stats.byCategory, row.category || 'unknown')
    addPathStats(stats, c.recommendedPath, row, c)

    if (c.recommendedPath !== 'complete_enough') {
      candidates.push({
        id: row.id,
        ean: row.ean,
        name: row.name,
        brand: row.brand,
        category: row.category,
        subcategory: row.subcategory,
        source: c.source,
        score: c.score,
        recommendedPath: c.recommendedPath,
        gaps: {
          ingredients: c.missingIngredients,
          carbs: c.missingCarbs,
          sugar: c.missingSugar,
          fiber: c.missingFiber,
        },
        signals: {
          realEan: c.realEan,
          hasImage: c.hasImage,
          currentCarbs: nutrition.carbs ?? null,
          currentSugar: nutrition.sugar ?? null,
          currentFiber: nutrition.fiber ?? null,
        },
      })
    }
  }

  candidates.sort((a, b) => b.score - a.score)
  stats.topCandidates = candidates.slice(0, 100)

  fs.writeFileSync(OUT_PATH, JSON.stringify(stats, null, 2), 'utf8')

  const pct = (count) => `${((count / (stats.total || 1)) * 100).toFixed(1)}%`
  console.log('=== ENRICHMENT ROI AUDIT ===')
  console.log(`Active products:       ${stats.total}`)
  console.log(`Complete enough:       ${stats.completeEnough} (${pct(stats.completeEnough)})`)
  console.log(`Ingredients known:     ${stats.fields.ingredientsKnown} (${pct(stats.fields.ingredientsKnown)})`)
  console.log(`Carbs known:           ${stats.fields.carbsKnown} (${pct(stats.fields.carbsKnown)})`)
  console.log(`Sugar known:           ${stats.fields.sugarKnown} (${pct(stats.fields.sugarKnown)})`)
  console.log(`Fiber known:           ${stats.fields.fiberKnown} (${pct(stats.fields.fiberKnown)})`)
  console.log(`Real EAN:              ${stats.fields.realEan} (${pct(stats.fields.realEan)})`)
  console.log(`Has image:             ${stats.fields.hasImage} (${pct(stats.fields.hasImage)})`)

  console.log('\n--- RECOMMENDED PATHS ---')
  for (const [key, value] of Object.entries(stats.byPath).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`${key}: ${value.total}`)
  }

  console.log('\n--- TOP CATEGORIES ---')
  for (const [key, value] of Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`${key}: ${value}`)
  }

  console.log(`\nSaved report to ${OUT_PATH}`)
}

main().catch((error) => {
  console.error('Enrichment ROI audit failed:', error)
  process.exit(1)
})
