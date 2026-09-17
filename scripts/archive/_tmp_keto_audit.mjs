import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { normalizeGlobalProduct } from '../src/domain/product/normalizers.js'
import { checkProductFit } from '../src/utils/fitCheck.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

const PAGE_SIZE = 1000
const OUT_PATH = 'C:\\tmp\\korset-keto-audit.json'
const PROFILE = { dietGoals: ['keto'] }

function round(value) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : null
}

function toNutritionNumber(value) {
  if (value == null) return null
  if (typeof value === 'string' && value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function getNutrition(product) {
  const nutrition = product?.nutritionPer100 || {}
  const carbs = nutrition.carbs ?? null
  const sugar = nutrition.sugar ?? null
  const fiber = nutrition.fiber ?? null
  const carbsNum = toNutritionNumber(carbs)
  const sugarNum = toNutritionNumber(sugar)
  const fiberNum = toNutritionNumber(fiber)
  const netCarbs =
    carbsNum != null && fiberNum != null && fiberNum >= 0 && fiberNum <= carbsNum
      ? carbsNum - fiberNum
      : null

  return {
    carbs: carbsNum,
    sugar: sugarNum,
    fiber: fiberNum,
    netCarbs,
  }
}

function bucket(map, key) {
  map[key] = (map[key] || 0) + 1
}

async function fetchAllActiveProducts() {
  const rows = []
  let from = 0

  while (true) {
    const { data, error } = await sb
      .from('global_products')
      .select(
        'id, ean, name, brand, category, subcategory, source_primary, ingredients_raw, diet_tags_json, nutriments_json, is_active'
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
    throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }

  const rows = await fetchAllActiveProducts()
  const stats = {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    verdicts: { safe: 0, caution: 0, warning: 0, danger: 0 },
    bySource: {},
    signals: {
      ketoTag: 0,
      lowCarbTag: 0,
      carbsKnown: 0,
      sugarKnown: 0,
      fiberKnown: 0,
      nutritionMissing: 0,
      lowNetCarbs: 0,
      lowCarbs: 0,
      highCarbs: 0,
      highSugar: 0,
      sugarSignals: 0,
      ketoTagWithConflict: 0,
    },
    samples: {
      safe: [],
      caution: [],
      warning: [],
      danger: [],
    },
  }

  const verdictReasonCounts = {}

  for (const row of rows) {
    const product = normalizeGlobalProduct(row)
    const fit = checkProductFit(product, PROFILE)
    const nutrition = getNutrition(product)
    const dietTags = Array.isArray(product.dietTags) ? product.dietTags : []
    const hasKetoTag = dietTags.some((tag) =>
      /(^|[._\-\s])(keto|ketogenic)([._\-\s]|$)/i.test(String(tag))
    )
    const hasLowCarbTag = dietTags.some((tag) =>
      /(^|[._\-\s])(low[_\-\s]?carb)([._\-\s]|$)/i.test(String(tag))
    )
    const hasSugarKeywords =
      typeof product.ingredients === 'string' &&
      /сахар|сироп|декстроз|глюкоз|фруктоз|мальтоз|сахароз|паток|мёд|мед|sugar|syrup|dextrose|glucose|fructose|maltose|sucrose|honey/i.test(product.ingredients)
    const hasSugarSignals = dietTags.includes('contains_sugar') || hasSugarKeywords
    const hasCarbs = nutrition.carbs != null
    const hasSugar = nutrition.sugar != null
    const hasFiber = nutrition.fiber != null
    const lowNetCarbs = nutrition.netCarbs != null && nutrition.netCarbs <= 10
    const lowCarbs = nutrition.carbs != null && nutrition.carbs <= 10
    const highCarbs =
      (nutrition.netCarbs != null ? nutrition.netCarbs : nutrition.carbs) != null &&
      (nutrition.netCarbs != null ? nutrition.netCarbs : nutrition.carbs) > 10
    const highSugar = nutrition.sugar != null && nutrition.sugar > 5

    bucket(stats.verdicts, fit.verdict)
    bucket(stats.bySource, product.sourceMeta?.externalSource || 'unknown')
    if (hasKetoTag) stats.signals.ketoTag++
    if (hasLowCarbTag) stats.signals.lowCarbTag++
    if (hasCarbs) stats.signals.carbsKnown++
    if (hasSugar) stats.signals.sugarKnown++
    if (hasFiber) stats.signals.fiberKnown++
    if (!hasCarbs && !hasSugar) stats.signals.nutritionMissing++
    if (lowNetCarbs) stats.signals.lowNetCarbs++
    if (lowCarbs) stats.signals.lowCarbs++
    if (highCarbs) stats.signals.highCarbs++
    if (highSugar) stats.signals.highSugar++
    if (hasSugarSignals) stats.signals.sugarSignals++
    if ((hasKetoTag || hasLowCarbTag) && (highCarbs || highSugar || hasSugarSignals)) stats.signals.ketoTagWithConflict++

    for (const reason of fit.reasons || []) {
      const key = `${reason.category || 'unknown'}:${reason.severity || 'unknown'}:${reason.text || ''}`
      verdictReasonCounts[key] = (verdictReasonCounts[key] || 0) + 1
    }

    const sample = {
      ean: product.ean,
      name: product.name,
      brand: product.brand,
      category: product.category,
      source: product.sourceMeta?.externalSource || null,
      verdict: fit.verdict,
      carbs: round(nutrition.carbs),
      sugar: round(nutrition.sugar),
      fiber: round(nutrition.fiber),
      netCarbs: round(nutrition.netCarbs),
      dietTags,
      hasKetoTag,
      hasLowCarbTag,
    }

    if (stats.samples[fit.verdict]?.length < 15) {
      stats.samples[fit.verdict].push(sample)
    }
  }

  const total = stats.total || 1
  const pct = (count) => `${((count / total) * 100).toFixed(1)}%`
  const topReasons = Object.entries(verdictReasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([key, count]) => ({ key, count }))

  const report = {
    ...stats,
    percentages: {
      safe: pct(stats.verdicts.safe),
      caution: pct(stats.verdicts.caution),
      warning: pct(stats.verdicts.warning),
      danger: pct(stats.verdicts.danger),
    },
    topReasons,
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2))

  console.log('=== KETO FIT-CHECK AUDIT ===')
  console.log(`Active products: ${stats.total}`)
  console.log(`safe:    ${stats.verdicts.safe} (${report.percentages.safe})`)
  console.log(`caution: ${stats.verdicts.caution} (${report.percentages.caution})`)
  console.log(`warning: ${stats.verdicts.warning} (${report.percentages.warning})`)
  console.log(`danger:  ${stats.verdicts.danger} (${report.percentages.danger})`)

  console.log('\n--- SIGNAL COVERAGE ---')
  console.log(`ketoTag:                 ${stats.signals.ketoTag}`)
  console.log(`lowCarbTag:              ${stats.signals.lowCarbTag}`)
  console.log(`carbsKnown:              ${stats.signals.carbsKnown}`)
  console.log(`sugarKnown:              ${stats.signals.sugarKnown}`)
  console.log(`fiberKnown:              ${stats.signals.fiberKnown}`)
  console.log(`nutritionMissing:        ${stats.signals.nutritionMissing}`)
  console.log(`lowNetCarbs (<=10):      ${stats.signals.lowNetCarbs}`)
  console.log(`lowCarbs (<=10):         ${stats.signals.lowCarbs}`)
  console.log(`highCarbs (>10):         ${stats.signals.highCarbs}`)
  console.log(`highSugar (>5):          ${stats.signals.highSugar}`)
  console.log(`sugarSignals:            ${stats.signals.sugarSignals}`)
  console.log(`ketoTagWithConflict:     ${stats.signals.ketoTagWithConflict}`)

  console.log('\n--- BY SOURCE ---')
  for (const [source, count] of Object.entries(stats.bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`${source}: ${count}`)
  }

  console.log('\n--- TOP REASONS ---')
  for (const item of topReasons) {
    console.log(`${item.count}  ${item.key}`)
  }

  console.log(`\nSaved report to ${OUT_PATH}`)
}

main().catch((error) => {
  console.error('Keto audit failed:', error)
  process.exit(1)
})
