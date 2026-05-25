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

const OUT_PATH = 'C:\\tmp\\korset-public-barcode-benchmark.json'
const LIMIT = getArgNumber('--limit', 50)
const MODE = getArgString('--mode', 'default')
const PAGE_SIZE = 1000
const REQUEST_GAP_MS = getArgNumber('--gap-ms', 1300)

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
    .replace(/С‘/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function collapseSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function stripHtml(html) {
  return collapseSpaces(
    decodeHtmlEntities(
      String(html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
    )
  )
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

function extractNumberAfterKeyword(text, keywordPatterns, unitPatterns) {
  const source = String(text || '')
  for (const keywordPattern of keywordPatterns) {
    const match = keywordPattern.exec(source)
    if (!match) continue
    const window = source.slice(match.index, Math.min(source.length, match.index + 180))
    for (const unitPattern of unitPatterns) {
      const unitMatch = unitPattern.exec(window)
      if (!unitMatch) continue
      const value = Number(unitMatch[1])
      if (Number.isFinite(value)) return value
    }
  }
  return null
}

function extractIngredientSection(text) {
  const source = String(text || '')
  const start = source.search(/ingredients?/i)
  if (start < 0) return null
  const tail = source.slice(start)
  const stopMarkers = [
    /additional attributes/i,
    /more info/i,
    /shopping info/i,
    /barcode/i,
    /find online/i,
    /do you find this info accurate/i,
  ]
  let stop = tail.length
  for (const marker of stopMarkers) {
    const idx = tail.search(marker)
    if (idx >= 0 && idx < stop) stop = idx
  }
  const section = collapseSpaces(tail.slice(0, stop))
  const cleaned = section.replace(/^ingredients?\s*:?\s*/i, '')
  return cleaned || null
}

function parseGoUpcPage(html, barcode) {
  const text = stripHtml(html)
  if (!text) return null

  const titleMatch = /^(.*?)\s+Go-UPC\s+Go-UPC Menu/i.exec(text)
  const title = titleMatch ? collapseSpaces(titleMatch[1]) : null
  const brandMatch = /Brand\s+([^\n]+?)\s+Category\s+/i.exec(text)
  const categoryMatch = /Category\s+([^\n]+?)\s+Description\s+/i.exec(text)
  const ingredients = extractIngredientSection(text)
  const sugar = extractNumberAfterKeyword(text, [/total sugars?/i, /\bsugars?\b/i], [/(\d+(?:\.\d+)?)\s*g\b/i])
  const sodium = extractNumberAfterKeyword(text, [/\bsodium\b/i], [/(\d+(?:\.\d+)?)\s*mg\b/i, /(\d+(?:\.\d+)?)\s*g\b/i])
  const salt = extractNumberAfterKeyword(text, [/\bsalt\b/i], [/(\d+(?:\.\d+)?)\s*g\b/i])
  const fiber = extractNumberAfterKeyword(text, [/\bfiber\b/i], [/(\d+(?:\.\d+)?)\s*g\b/i])

  return {
    code: String(barcode),
    name: title,
    brand: brandMatch ? collapseSpaces(brandMatch[1]) : null,
    category: categoryMatch ? collapseSpaces(categoryMatch[1]) : null,
    ingredients,
    nutriments: {
      sugar,
      salt: salt ?? (hasNumber(sodium) ? Number((Number(sodium) / 400).toFixed(3)) : null),
      sodium,
      fiber,
    },
    extras: {
      source: 'go_upc_public',
      textLength: text.length,
    },
  }
}

function parseUpcitemdbPage(html, barcode) {
  const text = stripHtml(html)
  if (!text) return null

  const titleMatch = new RegExp(`UPC\\s+${String(barcode)}\\s+-\\s+(.+?)\\s*\\|\\s*upcitemdb\\.com`, 'i').exec(text)
  const brandMatch = /Brand:\s*\|\s*([^\n|]+?)\s+Model/i.exec(text)
  const categoryMatch = /\s([A-Za-z0-9 &>:/-]+)\s+ZOOM\s+UPC\s+/i.exec(text)
  const ingredientsMatch = /INGREDIENTS:\s*([^]+?)(?:\s+Shopping Info|\s+Products with UPC|\s+Do you find this info accurate|$)/i.exec(text)
  const ingredients = ingredientsMatch ? collapseSpaces(ingredientsMatch[1]) : null
  const sugar = extractNumberAfterKeyword(text, [/total sugars?/i, /\bsugars?\b/i], [/(\d+(?:\.\d+)?)\s*g\b/i])
  const sodium = extractNumberAfterKeyword(text, [/\bsodium\b/i], [/(\d+(?:\.\d+)?)\s*mg\b/i, /(\d+(?:\.\d+)?)\s*g\b/i])
  const salt = extractNumberAfterKeyword(text, [/\bsalt\b/i], [/(\d+(?:\.\d+)?)\s*g\b/i])
  const fiber = extractNumberAfterKeyword(text, [/\bfiber\b/i], [/(\d+(?:\.\d+)?)\s*g\b/i])

  return {
    code: String(barcode),
    name: titleMatch ? collapseSpaces(titleMatch[1]) : null,
    brand: brandMatch ? collapseSpaces(brandMatch[1]) : null,
    category: categoryMatch ? collapseSpaces(categoryMatch[1]) : null,
    ingredients,
    nutriments: {
      sugar,
      salt: salt ?? (hasNumber(sodium) ? Number((Number(sodium) / 400).toFixed(3)) : null),
      sodium,
      fiber,
    },
    extras: {
      source: 'upcitemdb_public',
      textLength: text.length,
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
        'User-Agent': 'Korset/0.1 public barcode benchmark (contact: owner)',
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
    ingredients: 0,
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
  if (result.candidate.ingredients) stats.ingredients += 1
  if (coverage.sugar) stats.sugar += 1
  if (coverage.salt) stats.saltOrSodium += 1
  if (coverage.fiber) stats.fiber += 1
  if (coverage.sugar && coverage.salt && coverage.fiber) stats.allThree += 1
}

async function lookupOff(barcode) {
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
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?fields=${fields}`
  )
  if (error || json?.status !== 1) return { error: error || 'not_found', candidate: null }
  const product = json.product || {}
  return {
    error: null,
    candidate: {
      code: product.code || String(barcode),
      name: product.product_name || product.product_name_ru || product.generic_name || null,
      brand: product.brands || null,
      ingredients: product.ingredients_text_ru || product.ingredients_text || null,
      nutriments: {
        sugar: product?.nutriments?.sugars_100g ?? product?.nutriments?.sugars ?? null,
        salt: product?.nutriments?.salt_100g ?? product?.nutriments?.salt ?? null,
        sodium: product?.nutriments?.sodium_100g ?? product?.nutriments?.sodium ?? null,
        fiber: product?.nutriments?.fiber_100g ?? product?.nutriments?.fiber ?? null,
      },
      extras: {
        source: 'openfoodfacts',
      },
    },
  }
}

async function lookupUpcitemdbPublic(barcode) {
  const { error, text } = await fetchJson(`https://www.upcitemdb.com/upc/${encodeURIComponent(barcode)}`)
  if (error) return { error, candidate: null }
  if (!text) return { error: 'empty_response', candidate: null }
  const candidate = parseUpcitemdbPage(text, barcode)
  if (!candidate) return { error: 'not_found', candidate: null }
  return { error: null, candidate }
}

async function lookupGoUpcPublic(barcode) {
  const { error, text } = await fetchJson(`https://go-upc.com/search?q=${encodeURIComponent(barcode)}`)
  if (error) return { error, candidate: null }
  if (!text) return { error: 'empty_response', candidate: null }
  const candidate = parseGoUpcPage(text, barcode)
  if (!candidate) return { error: 'not_found', candidate: null }
  return { error: null, candidate }
}

const PROVIDERS = [
  {
    name: 'openfoodfacts',
    lookup: lookupOff,
    note: 'Open data API; strongest for numeric nutrition when available, but coverage is uneven outside global brands.',
  },
  {
    name: 'upcitemdb_public',
    lookup: lookupUpcitemdbPublic,
    note: 'Public lookup page; strong for product identity and ingredients on some foods, but numeric nutrition is inconsistent.',
  },
  {
    name: 'go_upc_public',
    lookup: lookupGoUpcPublic,
    note: 'Public lookup page; strong for product identity and ingredients, but numeric nutrition is usually sparse.',
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
    providerStatus: Object.fromEntries(PROVIDERS.map((provider) => [provider.name, { note: provider.note }])),
    blockedProviders: [
      {
        name: 'barcode_lookup',
        reason: 'Public site triggers security verification in this environment and API access requires a paid or test API key, so it was not benchmarked here.',
      },
    ],
    providers: Object.fromEntries(PROVIDERS.map((provider) => [provider.name, emptyProviderStats()])),
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
        ingredients: Boolean(result.candidate?.ingredients),
        candidate: result.candidate,
      }
      await sleep(REQUEST_GAP_MS)
    }

    const hints = PROVIDERS.map((provider) => {
      const providerResult = rowEntry.providers[provider.name]
      const c = nutritionCoverage(providerResult.candidate?.nutriments || {})
      return `${provider.name[0].toUpperCase()}:hit=${providerResult.candidate ? 1 : 0} I${providerResult.ingredients ? 1 : 0} S${c.sugar ? 1 : 0} Na${c.salt ? 1 : 0} F${c.fiber ? 1 : 0}`
    }).join(' | ')
    console.log(` ${hints}`)

    stats.rows.push(rowEntry)
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(stats, null, 2), 'utf8')

  console.log('\n=== PUBLIC BARCODE BENCHMARK ===')
  console.log(`Sampled: ${stats.sampled}`)
  for (const provider of PROVIDERS) {
    const providerStats = stats.providers[provider.name]
    console.log(`\n${provider.name}`)
    console.log(`found:        ${providerStats.found}/${providerStats.checked}`)
    console.log(`exactBarcode: ${providerStats.exactBarcode}/${providerStats.checked}`)
    console.log(`strongMatch:  ${providerStats.strongMatch}/${providerStats.checked}`)
    console.log(`ingredients:  ${providerStats.ingredients}/${providerStats.checked}`)
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
  console.error('Public barcode benchmark failed:', error)
  process.exit(1)
})
