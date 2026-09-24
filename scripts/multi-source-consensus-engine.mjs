#!/usr/bin/env node

/**
 * multi-source-consensus-engine.mjs — Unified Master Catalog Consensus Engine (Full Multi-Source Matrix)
 *
 * Implements strict consensus across:
 * 1. Semeiniy.kz (core barcodes & verified names — photos excluded due to server-side corruption)
 * 2. Open Food Facts (offline cache + live API for international FMCG: exact EAN-13, nutriments, allergens, Nutri-Score, NOVA, packshots)
 * 3. Galmart (API + catalog: manufacturer, country, storage, nutriments, verified studio packshots)
 * 4. Arbuz.kz (on-pack specs, rich descriptions, storage, producer, country, halal badges)
 * 5. Korzina v Dom (manufacturer, country, storage, shelf life, authentic compositions, options, halal tags)
 * 6. Official Halal Registries: QMDB (Halal Damu) & AHIK enterprise & brand tree
 * 7. Domain Attribute Heuristics (cooking instructions, packaging enums, fat %, taste)
 *
 * Crash-resilient: append-only JSONL streaming, checkpointing, incremental Supabase batch upserts.
 */

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const require = createRequire(import.meta.url)
const { classifyBarcode } = require('./validate-ean.cjs')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// Paths
const INPUT_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl')
const ENRICHED_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_enriched.jsonl')
const CHECKPOINT_PATH = path.join(__dirname, '..', 'data', 'consensus_enrichment_checkpoint.json')

// Concurrency and batching
const CONCURRENCY = 10
const DB_BATCH_SIZE = 200

// Allergen Tag Normalizer
const ALLERGEN_MAP = {
  'en:milk': 'milk',
  'en:eggs': 'eggs',
  'en:gluten': 'gluten',
  'en:wheat': 'gluten',
  'en:peanuts': 'peanuts',
  'en:nuts': 'tree_nuts',
  'en:tree-nuts': 'tree_nuts',
  'en:soybeans': 'soy',
  'en:soy': 'soy',
  'en:fish': 'fish',
  'en:crustaceans': 'crustaceans',
  'en:shellfish': 'crustaceans',
  'en:molluscs': 'mollusks',
  'en:sesame': 'sesame',
  'en:celery': 'celery',
  'en:mustard': 'mustard',
  'en:lupin': 'lupin',
  'en:sulphur-dioxide-and-sulphites': 'sulfites',
  'en:sulphites': 'sulfites',
}

const STOP_WORDS = new Set(['для', 'или', 'под', 'при', 'без', 'шт', 'кг', 'гр', 'мл', 'пэт', 'м/у', 'т/п', 'ст/б', 'ж/б', 'д/п', 'с', 'со', 'в', 'и', 'на'])

function normalize(s) {
  if (!s) return ''
  return s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, ' ').replace(/\s+/g, ' ').trim()
}

function getTokens(s) {
  return normalize(s).split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w))
}

function extractVolumeWeight(s) {
  const m = (s || '').match(/(\d+(?:[.,]\d+)?)\s*(г|кг|л|мл|гр)/i)
  if (!m) return null
  let val = parseFloat(m[1].replace(',', '.'))
  const unit = m[2].toLowerCase()
  if (unit === 'кг' || unit === 'л') val *= 1000
  return Math.round(val)
}

function buildIndex(list, getTitle, getBrand) {
  const byBrand = new Map()
  for (const item of list) {
    const rawBrand = getBrand(item)
    const brand = normalize(rawBrand)
    if (!brand) continue
    if (!byBrand.has(brand)) byBrand.set(brand, [])
    const title = getTitle(item)
    const tokens = getTokens(title).filter(t => !brand.includes(t))
    byBrand.get(brand).push({
      item,
      title,
      brand,
      tokens: new Set(tokens),
      tokenList: tokens,
      vw: extractVolumeWeight(title)
    })
  }
  return byBrand
}

function findStrictMatch(name, brand, index) {
  const normB = normalize(brand)
  if (!normB || !index.has(normB)) return null
  const candidates = index.get(normB)
  
  const pTokens = getTokens(name).filter(t => !normB.includes(t))
  if (pTokens.length === 0) return null

  const pVw = extractVolumeWeight(name)

  let best = null
  let maxJaccard = 0

  for (const c of candidates) {
    if (pVw && c.vw && Math.abs(pVw - c.vw) > pVw * 0.12) {
      continue
    }

    const pFirst = pTokens[0]
    const cFirst = c.tokenList[0]
    if (pFirst && cFirst && pFirst !== cFirst && !pFirst.startsWith(cFirst.slice(0, 4)) && !cFirst.startsWith(pFirst.slice(0, 4))) {
      continue
    }

    let intersection = 0
    for (const t of pTokens) {
      if (c.tokens.has(t)) intersection++
    }
    const union = new Set([...pTokens, ...c.tokens]).size
    const jaccard = union > 0 ? intersection / union : 0

    if (jaccard >= 0.60 && jaccard > maxJaccard) {
      maxJaccard = jaccard
      best = c
    }
  }

  return best ? { match: best.item, jaccard: maxJaccard, candidateTitle: best.title } : null
}

// 1. Load Local Indexes
function loadGalmartIndex() {
  const gPath = path.join(__dirname, '..', 'data', 'galmart_catalog.json')
  if (!fs.existsSync(gPath)) return new Map()
  try {
    const list = JSON.parse(fs.readFileSync(gPath, 'utf8'))
    return buildIndex(list, x => x.title, x => x.brand)
  } catch {
    return new Map()
  }
}

function loadArbuzIndex() {
  const aPath = path.join(__dirname, '..', 'data', 'v3_cache', 'arbuz_products.json')
  if (!fs.existsSync(aPath)) return new Map()
  try {
    const raw = JSON.parse(fs.readFileSync(aPath, 'utf8'))
    const list = Array.isArray(raw) ? raw : Object.values(raw)
    return buildIndex(list, x => x.name || x.catalog_name, x => x.brand)
  } catch {
    return new Map()
  }
}

function loadKorzinaIndex() {
  const kPath = path.join(__dirname, '..', 'data', 'korzinavdom_catalog.json')
  if (!fs.existsSync(kPath)) return new Map()
  try {
    const list = JSON.parse(fs.readFileSync(kPath, 'utf8'))
    return buildIndex(list, x => x.productName, x => x.brand)
  } catch {
    return new Map()
  }
}

function loadOffCache() {
  const oPath = path.join(__dirname, '..', 'data', 'v3_cache', 'off_products.json')
  const map = new Map()
  if (!fs.existsSync(oPath)) return map
  try {
    const raw = JSON.parse(fs.readFileSync(oPath, 'utf8'))
    const list = Array.isArray(raw) ? raw : Object.values(raw)
    for (const p of list) {
      if (p.ean) map.set(p.ean, p)
    }
  } catch {}
  return map
}

function loadHalalRegistries() {
  const brandMatches = new Map()
  const bmPath = path.join(__dirname, '..', 'data', 'halal-brand-matches-v3.json')
  if (fs.existsSync(bmPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(bmPath, 'utf8'))
      for (const [brand, info] of Object.entries(data)) {
        brandMatches.set(brand.toLowerCase().trim(), info)
      }
    } catch {}
  }

  const certifiedCompanies = new Map()
  const hdPath = path.join(__dirname, '..', 'data', 'halaldamu-registry-certified.json')
  if (fs.existsSync(hdPath)) {
    try {
      const list = JSON.parse(fs.readFileSync(hdPath, 'utf8'))
      for (const item of list) {
        if (item.name) {
          certifiedCompanies.set(item.name.toLowerCase().trim(), {
            certifier: 'Халал Даму (ДУМК)',
            category: item.category,
            status: 'yes',
          })
        }
      }
    } catch {}
  }

  const ahikPath = path.join(__dirname, '..', 'data', 'ahik-registry-enterprises.json')
  if (fs.existsSync(ahikPath)) {
    try {
      const list = JSON.parse(fs.readFileSync(ahikPath, 'utf8'))
      for (const item of list) {
        const name = item.name || item.enterprise || item.title
        if (name) {
          certifiedCompanies.set(name.toLowerCase().trim(), {
            certifier: 'АХИК',
            category: item.category || 'Общая',
            status: 'yes',
          })
        }
      }
    } catch {}
  }

  return { brandMatches, certifiedCompanies }
}

// 2. Open Food Facts Live API Querier (Selective for Global FMCG)
async function fetchOffData(ean) {
  // Only query online for valid GS1 barcodes with global FMCG prefixes
  const isGlobalPrefix = /^(3[0-7]|4[0-4]|46|50|54|76|80|84|87|90)\d{10,11}$/.test(ean)
  if (!isGlobalPrefix) return null

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2000)
    const url = `https://world.openfoodfacts.org/api/v2/product/${ean}.json`
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'KorsetCatalogEngine - Version 2.0 (info@korset.kz)' },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const j = await res.json()
    if (j.status !== 1 || !j.product) return null

    const p = j.product
    let nutriscore = null
    if (p.nutriscore_grade && ['a', 'b', 'c', 'd', 'e'].includes(p.nutriscore_grade.toLowerCase())) {
      nutriscore = p.nutriscore_grade.toUpperCase()
    }

    let nova = null
    if (p.nova_group && [1, 2, 3, 4].includes(p.nova_group)) {
      nova = p.nova_group
    }

    const allergens = []
    if (Array.isArray(p.allergens_tags)) {
      for (const t of p.allergens_tags) {
        if (ALLERGEN_MAP[t]) allergens.push(ALLERGEN_MAP[t])
      }
    }

    const additives = []
    if (Array.isArray(p.additives_tags)) {
      for (const a of p.additives_tags) {
        const m = a.match(/e\d{3,4}[a-z]?/i)
        if (m) additives.push(m[0].toUpperCase())
      }
    }

    let nutriments = null
    if (p.nutriments && typeof p.nutriments === 'object') {
      const n = p.nutriments
      nutriments = {}
      if (n['energy-kcal_100g'] != null) nutriments.calories_100g = Math.round(Number(n['energy-kcal_100g']))
      if (n['proteins_100g'] != null) nutriments.proteins_100g = Number(n['proteins_100g'])
      if (n['fat_100g'] != null) nutriments.fat_100g = Number(n['fat_100g'])
      if (n['carbohydrates_100g'] != null) nutriments.carbs_100g = Number(n['carbohydrates_100g'])
      if (n['sugars_100g'] != null) nutriments.sugars_100g = Number(n['sugars_100g'])
      if (n['salt_100g'] != null) nutriments.salt_100g = Number(n['salt_100g'])
      if (n['saturated-fat_100g'] != null) nutriments.saturated_fat_100g = Number(n['saturated-fat_100g'])
    }

    const frontPhoto = p.selected_images?.front?.display?.ru ||
                       p.selected_images?.front?.display?.en ||
                       p.image_front_url ||
                       null

    const backPhoto = p.selected_images?.ingredients?.display?.ru ||
                      p.selected_images?.ingredients?.display?.en ||
                      p.image_ingredients_url ||
                      null

    return {
      nutriscore,
      nova_group: nova,
      allergens: [...new Set(allergens)],
      additives: [...new Set(additives)],
      nutriments,
      frontPhoto,
      backPhoto,
      ingredientsRu: p.ingredients_text_ru || null,
      ingredientsKz: p.ingredients_text_kk || null,
    }
  } catch {
    return null
  }
}

// 3. Domain Heuristics: Cooking Instructions & Packaging Type
function inferCookingInstructions(name, category, desc = '') {
  const text = `${name} ${category} ${desc}`.toLowerCase()

  if (text.includes('пельмен') || text.includes('вареник')) {
    return 'Опустить в кипящую подсоленную воду (соотношение 1:4). После всплытия варить на умеренном огне 5–7 минут. Подавать со сливочным маслом или сметаной.'
  }
  if (text.includes('манты') || text.includes('хинкали')) {
    return 'Готовить на пару (в мантоварке / пароварке) на смазанных маслом решетках в течение 40–45 минут.'
  }
  if (text.includes('макарон') || text.includes('спагетти') || text.includes('лапша')) {
    return 'Варить в кипящей подсоленной воде (1 литр воды на 100 г продукта) в течение 7–10 минут до готовности al dente.'
  }
  if (text.includes('гречк') || text.includes('крупа гречневая')) {
    return 'Промыть, залить холодной водой в пропорции 1:2. Довести до кипения, варить на слабом огне под крышкой 15–20 минут до полного впитывания воды.'
  }
  if (text.includes('рис') && (category === 'grocery' || text.includes('крупа'))) {
    return 'Промыть, залить холодной водой в пропорции 1:2. Варить на медленном огне под крышкой 15–20 минут.'
  }
  if (text.includes('овсян') || text.includes('геркулес')) {
    return 'Залить горячим молоком или водой в соотношении 1:2, варить 3–5 минут на среднем огне или дать настояться под крышкой.'
  }
  if (text.includes('чай черный') || text.includes('чай зеленый') || text.includes('чайный напиток')) {
    return 'Залить свежевскипяченной водой (95–100°C), настаивать 3–5 минут.'
  }
  if (text.includes('кофе молотый')) {
    return 'Заваривать в турке, френч-прессе или чашке из расчета 1-2 чайные ложки на 150 мл горячей воды (92–96°C).'
  }

  const m = desc.match(/(?:способ приготовления|как готовить)[:\s]+([^.\n\r]+?\.)/i)
  if (m && m[1].length > 10) return m[1].trim()

  return null
}

function inferPackagingType(name, rawPackaging = '') {
  const text = `${name || ''} ${rawPackaging || ''}`.toLowerCase()
  if (text.includes('пэт') || text.includes('бутылк') || text.includes('bottle_plastic') || text.includes('plastic bottle')) return 'bottle_plastic'
  if (text.includes('ст/б') || text.includes('стекло') || text.includes('bottle_glass') || text.includes('glass bottle')) return 'bottle_glass'
  if (text.includes('ж/б') || text.includes('жест') || text.includes(' can') || text.includes('can') || text.includes('банка ж/б')) return 'can'
  if (text.includes('т/п') || text.includes('тетра') || text.includes('тетрапак') || text.includes('tetrapak')) return 'tetrapak'
  if (text.includes('дой-пак') || text.includes('флоу-пак') || text.includes('д/п') || text.includes('м/у') || text.includes('пакет') || text.includes('pouch') || text.includes('саше')) return 'pouch'
  if (text.includes('ванночк') || text.includes('стакан') || text.includes('ведр') || text.includes('tub') || text.includes('к/у')) return 'tub'
  return null
}

function inferFatPercent(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*%/i)
  if (m) {
    const p = parseFloat(m[1].replace(',', '.'))
    if (p > 0 && p <= 100) return p
  }
  return null
}

// 4. Batch Upsert to Supabase
async function upsertBatch(table, rows, onConflict, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { error } = await supabase.from(table).upsert(rows, {
        onConflict,
        ignoreDuplicates: false,
      })
      if (error) {
        if (attempt === retries) throw error
        console.warn(`[${table}] Retry ${attempt}/${retries}:`, error.message)
        await new Promise((r) => setTimeout(r, attempt * 1200))
        continue
      }
      return
    } catch (err) {
      if (attempt === retries) throw err
      console.warn(`[${table}] Network retry ${attempt}/${retries}:`, err.message)
      await new Promise((r) => setTimeout(r, attempt * 1200))
    }
  }
}

// 5. Main Consensus Loop
async function main() {
  console.log('========================================================================')
  console.log('KORSET MULTI-SOURCE CONSENSUS ENRICHMENT ENGINE (FULL 8-SOURCE MATRIX)')
  console.log('========================================================================\n')

  const galmartIndex = loadGalmartIndex()
  console.log(`Loaded Galmart Index (${galmartIndex.size} brands).`)

  const arbuzIndex = loadArbuzIndex()
  console.log(`Loaded Arbuz Index (${arbuzIndex.size} brands).`)

  const korzinaIndex = loadKorzinaIndex()
  console.log(`Loaded Korzina v Dom Index (${korzinaIndex.size} brands).`)

  const offCache = loadOffCache()
  console.log(`Loaded OFF Cache (${offCache.size} verified EANs).`)

  const { brandMatches, certifiedCompanies } = loadHalalRegistries()
  console.log(`Loaded ${brandMatches.size} Halal brand mappings & ${certifiedCompanies.size} certified enterprises.\n`)

  // Checkpoint setup
  let processedEans = new Set()
  if (fs.existsSync(CHECKPOINT_PATH)) {
    try {
      const cp = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf8'))
      processedEans = new Set(cp.processedEans || [])
      console.log(`Loaded checkpoint: ${processedEans.size} items already processed.`)
    } catch {}
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT_PATH),
    crlfDelay: Infinity,
  })

  const allItems = []
  for await (const line of rl) {
    if (!line.trim()) continue
    allItems.push(JSON.parse(line))
  }
  console.log(`Loaded ${allItems.length} products to enrich.\n`)

  // If starting fresh or re-enriching from beginning
  const startFresh = process.argv.includes('--fresh')
  if (startFresh) {
    processedEans.clear()
    if (fs.existsSync(ENRICHED_PATH)) fs.unlinkSync(ENRICHED_PATH)
    if (fs.existsSync(CHECKPOINT_PATH)) fs.unlinkSync(CHECKPOINT_PATH)
    console.log('Fresh run mode: cleared previous checkpoint and output file.\n')
  }

  const outStream = fs.createWriteStream(ENRICHED_PATH, { flags: startFresh ? 'w' : 'a' })
  let buffer = []
  let count = 0
  let enrichedOff = 0
  let enrichedGalmart = 0
  let enrichedArbuz = 0
  let enrichedKorzina = 0
  let enrichedHalal = 0
  let enrichedCooking = 0
  const startTime = Date.now()

  // Concurrency queue
  for (let i = 0; i < allItems.length; i += CONCURRENCY) {
    const chunk = allItems.slice(i, i + CONCURRENCY)
    const promises = chunk.map(async (item) => {
      if (processedEans.has(item.ean)) return null

      const ean = item.ean
      const brandLower = (item.brand || '').toLowerCase().trim()

      // --- STEP 1: Open Food Facts (Cache first, then Selective Live API) ---
      let off = offCache.get(ean)
      if (!off) {
        off = await fetchOffData(ean)
      }

      if (off) {
        enrichedOff++
        if (!item.nutriments_json && off.nutriments) item.nutriments_json = off.nutriments
        if (!item.nutriscore && off.nutriscore) item.nutriscore = off.nutriscore
        if (!item.nova_group && off.nova_group) item.nova_group = off.nova_group
        if ((!item.allergens_json || item.allergens_json.length === 0) && off.allergens?.length > 0) item.allergens_json = off.allergens
        if ((!item.additives_tags_json || item.additives_tags_json.length === 0) && off.additives?.length > 0) item.additives_tags_json = off.additives
        if (!item.ingredients_raw && (off.ingredients_raw || off.ingredientsRu)) item.ingredients_raw = off.ingredients_raw || off.ingredientsRu
        if (!item.ingredients_kz && off.ingredientsKz) item.ingredients_kz = off.ingredientsKz

        if (off.frontPhoto && !item.image_url) {
          item.image_url = off.frontPhoto
          item.images = [off.frontPhoto]
          if (off.backPhoto) {
            item.images.push(off.backPhoto)
            item.image_ingredients_url = off.backPhoto
          }
        }
      }

      // --- STEP 2: Galmart Index ---
      const gm = findStrictMatch(item.name, item.brand, galmartIndex)
      if (gm) {
        enrichedGalmart++
        const g = gm.match
        if (!item.manufacturer && g.manufacturer) item.manufacturer = g.manufacturer
        if (!item.country_of_origin && g.country) item.country_of_origin = g.country
        if (!item.storage_conditions && g.storage_conditions) item.storage_conditions = g.storage_conditions
        if (!item.ingredients_raw && g.composition) item.ingredients_raw = g.composition
        if ((!item.nutriments_json || Object.keys(item.nutriments_json).length === 0) &&
            (g.calories || g.protein || g.fat || g.carbs)) {
          item.nutriments_json = {
            calories_100g: g.calories,
            proteins_100g: g.protein,
            fat_100g: g.fat,
            carbs_100g: g.carbs,
          }
        }
        // Studio packshot only on high confidence (>= 0.75)
        if (!item.image_url && g.photos?.length > 0 && gm.jaccard >= 0.75) {
          item.image_url = g.photos[0]
          item.images = g.photos
        }
      }

      // --- STEP 3: Arbuz.kz Index ---
      const arbuz = findStrictMatch(item.name, item.brand, arbuzIndex)
      if (arbuz) {
        enrichedArbuz++
        const a = arbuz.match
        if (!item.manufacturer && a.producer) item.manufacturer = a.producer
        if (!item.country_of_origin && a.country) item.country_of_origin = a.country
        if (!item.storage_conditions && a.storage_conditions) item.storage_conditions = a.storage_conditions
        if (!item.ingredients_raw && a.ingredients_raw) item.ingredients_raw = a.ingredients_raw
        if (!item.description && a.description) item.description = a.description
        if ((!item.nutriments_json || Object.keys(item.nutriments_json).length === 0) && a.nutriments_json) {
          item.nutriments_json = a.nutriments_json
        }
        if (a.is_halal || /халал|halal/i.test(a.name || '')) {
          item.halal_status = 'yes'
          item.halal_notes = 'Arbuz Retail Verification'
          enrichedHalal++
        }
      }

      // --- STEP 4: Korzina v Dom Index ---
      const korzina = findStrictMatch(item.name, item.brand, korzinaIndex)
      if (korzina) {
        enrichedKorzina++
        const k = korzina.match
        if (!item.ingredients_raw && k.composition) item.ingredients_raw = k.composition
        if (!item.shelf_life && k.shelfLife) item.shelf_life = k.shelfLife
        if (!item.storage_conditions && k.storageConditions) item.storage_conditions = k.storageConditions
        if (!item.country_of_origin && k.country) item.country_of_origin = k.country

        if (Array.isArray(k.options)) {
          if (!item.manufacturer) {
            const mfr = k.options.find(o => o.optionName === 'Производитель')?.valueVariant
            if (mfr) item.manufacturer = mfr
          }
          if (!item.packaging_type) {
            const pkgOpt = k.options.find(o => o.optionName === 'Вид упаковки')?.valueVariant
            if (pkgOpt) {
              const normP = inferPackagingType(item.name, pkgOpt)
              if (normP) item.packaging_type = normP
            }
          }
          if (!item.nutriments_json || Object.keys(item.nutriments_json).length === 0) {
            const nutr = {}
            for (const opt of k.options) {
              if (opt.optionName === 'Энергетическая ценность (ккал на 100г)' && opt.valueFloat) nutr.calories_100g = opt.valueFloat
              if (opt.optionName === 'Белки' && opt.valueFloat) nutr.proteins_100g = opt.valueFloat
              if (opt.optionName === 'Жиры' && opt.valueFloat) nutr.fat_100g = opt.valueFloat
              if (opt.optionName === 'Углеводы' && opt.valueFloat) nutr.carbs_100g = opt.valueFloat
            }
            if (Object.keys(nutr).length > 0) item.nutriments_json = nutr
          }
        }

        if (Array.isArray(k.markers)) {
          if (k.markers.some(m => (m.text || m.title || '').toLowerCase().includes('халал'))) {
            item.halal_status = 'yes'
            item.halal_notes = 'Korzina Retail Verification'
            enrichedHalal++
          }
        }
      }

      // --- STEP 5: Multi-Signal Halal Verification ---
      if (item.halal_status !== 'yes') {
        const hasTitleHalal = /\b(халал|халяль|halal)\b/i.test(item.name || '')
        if (hasTitleHalal) {
          item.halal_status = 'yes'
          item.halal_notes = 'Retail On-pack Marker'
          enrichedHalal++
        } else {
          const brandMatch = brandMatches.get(brandLower)
          if (brandMatch) {
            item.halal_status = 'yes'
            item.halal_certifier = brandMatch.certifier || 'Халал Даму (ДУМК)'
            enrichedHalal++
          } else {
            const producerLower = (item.manufacturer || '').toLowerCase().trim()
            const certMatch = certifiedCompanies.get(brandLower) || certifiedCompanies.get(producerLower)
            if (certMatch) {
              item.halal_status = 'yes'
              item.halal_certifier = certMatch.certifier
              enrichedHalal++
            }
          }
        }
      }

      // --- STEP 6: Attribute Heuristics ---
      if (!item.cooking_instructions) {
        const ci = inferCookingInstructions(item.name, item.category, item.description || '')
        if (ci) {
          item.cooking_instructions = ci
          enrichedCooking++
        }
      }

      if (!item.packaging_type) {
        const pt = inferPackagingType(item.name)
        if (pt) item.packaging_type = pt
      }

      if (item.fat_percent == null) {
        const fp = inferFatPercent(item.name)
        if (fp != null) item.fat_percent = fp
      }

      // Calculate Data Quality Score
      let score = 25 // GS1 barcode base
      if (item.name) score += 15
      if (item.image_url) score += 15
      if (item.ingredients_raw || item.ingredients_kz) score += 15
      if (item.nutriments_json && Object.keys(item.nutriments_json).length > 0) score += 10
      if (item.allergens_json?.length > 0) score += 5
      if (item.halal_status === 'yes') score += 5
      if (item.cooking_instructions) score += 5
      if (item.manufacturer || item.country_of_origin) score += 5
      item.data_quality_score = Math.min(100, score)

      processedEans.add(ean)
      return item
    })

    const results = (await Promise.all(promises)).filter(Boolean)
    for (const res of results) {
      outStream.write(JSON.stringify(res) + '\n')
      buffer.push(res)
      count++
    }

    // Flush batch to Supabase
    if (buffer.length >= DB_BATCH_SIZE) {
      await upsertBatch('global_products', buffer, 'ean')
      buffer = []

      // Save Checkpoint
      fs.writeFileSync(
        CHECKPOINT_PATH,
        JSON.stringify({
          processedCount: processedEans.size,
          processedEans: Array.from(processedEans),
          updatedAt: new Date().toISOString(),
        })
      )

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      const rate = (count / elapsed).toFixed(1)
      console.log(
        `[Progress] ${processedEans.size} / ${allItems.length} (${((processedEans.size/allItems.length)*100).toFixed(1)}%) | Rate: ${rate} it/s | OFF: ${enrichedOff} | Galmart: ${enrichedGalmart} | Arbuz: ${enrichedArbuz} | Korzina: ${enrichedKorzina} | Halal: ${enrichedHalal}`
      )
    }
  }

  if (buffer.length > 0) {
    await upsertBatch('global_products', buffer, 'ean')
  }

  outStream.end()
  console.log('\n=== Multi-Source Consensus Engine Completed Successfully! ===')
}

main().catch((err) => {
  console.error('Fatal engine error:', err)
  process.exit(1)
})
