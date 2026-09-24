#!/usr/bin/env node

/**
 * enrich-master-catalog.mjs — High-Performance Multi-Source Enrichment Engine (Phase 3)
 *
 * Fast 2-pass enrichment:
 * Pass 1: Instant local multi-source merge (Archive + Halal Registries + Galmart + Attribute Parser)
 * Pass 2: Concurrent targeted Open Food Facts enrichment for Food & Beverage staples
 */

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import readline from 'readline'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { classifyBarcode } = require('./validate-ean.cjs')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const RAW_PRODUCTS_PATH = path.join(__dirname, '..', 'data', 'semeiniy_raw_products.jsonl')
const ENRICHED_OUT_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4.jsonl')

const FOOD_CATEGORIES = new Set([
  'dairy_eggs', 'meat', 'deli', 'fish', 'water_beverages',
  'tea_coffee', 'sweets', 'snacks', 'grocery', 'sauces_spices',
  'bread', 'frozen', 'fruits_veg', 'baby_food', 'ready_meals', 'healthy'
])

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
  'en:sulphites': 'sulfites'
}

function parseQuantity(rawQty, title) {
  const str = (rawQty || '') + ' ' + (title || '')
  const m = str.match(/(\d+(?:[.,]\d+)?)\s*(мл|л|ml|l|г|кг|g|kg|шт)\b/i)
  if (m) {
    const val = m[1].replace(',', '.')
    const unit = m[2].toLowerCase()
    return `${val} ${unit}`
  }
  return rawQty && rawQty !== '0 кг' && rawQty !== '-' ? rawQty : null
}

function parseFatPercent(title, features) {
  const str = (title || '') + ' ' + JSON.stringify(features || {})
  const m = str.match(/(\d+(?:[.,]\d+)?)\s*%/i)
  if (m) {
    const p = parseFloat(m[1].replace(',', '.'))
    if (p > 0 && p <= 100) return p
  }
  return null
}

function calculateQualityScore(p) {
  let score = 0
  if (p.ean && p.ean.length >= 8) score += 20
  if (p.image_url) score += 20
  if (p.ingredients_raw || p.ingredients_kz) score += 20
  if (p.nutriments_json && Object.keys(p.nutriments_json).length > 0) score += 15
  if (p.allergens_json && p.allergens_json.length > 0) score += 10
  if (p.brand) score += 5
  if (p.quantity) score += 5
  if (p.country_of_origin || p.manufacturer) score += 5
  return Math.min(score, 100)
}

function loadArchiveIndex() {
  console.log('Loading clean archive index (data/archive/global_products)...')
  const archiveMap = new Map()
  const archivePath = path.join(__dirname, '..', 'data', 'archive', 'global_products_2026-09-24.jsonl.gz')
  if (!fs.existsSync(archivePath)) return archiveMap

  const gzBuffer = fs.readFileSync(archivePath)
  const rawText = zlib.gunzipSync(gzBuffer).toString('utf-8')
  const rows = rawText.trim().split('\n').filter(Boolean)

  for (const row of rows) {
    try {
      const p = JSON.parse(row)
      if (p.ean) archiveMap.set(p.ean, p)
      if (Array.isArray(p.alternate_eans)) {
        for (const alt of p.alternate_eans) {
          if (!archiveMap.has(alt)) archiveMap.set(alt, p)
        }
      }
    } catch {}
  }
  console.log(`Indexed ${archiveMap.size} scannable barcode keys from archive.`)
  return archiveMap
}

function loadHalalRegistries() {
  console.log('Loading official Halal registries (Halal Damu & AHIK)...')
  const certifiedCompanies = new Map()

  const hdPath = path.join(__dirname, '..', 'data', 'halaldamu-registry-certified.json')
  if (fs.existsSync(hdPath)) {
    const list = JSON.parse(fs.readFileSync(hdPath, 'utf8'))
    for (const item of list) {
      if (item.name) {
        certifiedCompanies.set(item.name.toLowerCase().trim(), {
          certifier: 'Halal Damu (ДУМК)',
          category: item.category,
          status: 'certified'
        })
      }
    }
  }

  const ahikPath = path.join(__dirname, '..', 'data', 'ahik-registry-enterprises.json')
  if (fs.existsSync(ahikPath)) {
    const list = JSON.parse(fs.readFileSync(ahikPath, 'utf8'))
    for (const item of list) {
      const name = item.name || item.enterprise || item.title
      if (name) {
        certifiedCompanies.set(name.toLowerCase().trim(), {
          certifier: 'AHIK (АХИК)',
          category: item.category || 'Общая',
          status: 'certified'
        })
      }
    }
  }

  console.log(`Loaded ${certifiedCompanies.size} certified Halal enterprises.`)
  return certifiedCompanies
}

function loadGalmartIndex() {
  console.log('Loading Galmart catalog index...')
  const galmartMap = new Map()
  const gPath = path.join(__dirname, '..', 'data', 'galmart_catalog.json')
  if (!fs.existsSync(gPath)) return galmartMap

  const items = JSON.parse(fs.readFileSync(gPath, 'utf8'))
  for (const item of items) {
    if (item.title) {
      const key = item.title.toLowerCase().replace(/[^\wа-яё]/gi, ' ').replace(/\s+/g, ' ').trim()
      galmartMap.set(key, item)
    }
  }
  console.log(`Loaded ${galmartMap.size} Galmart items for title matching.`)
  return galmartMap
}

async function fetchFromOffApi(ean) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)

    const url = `https://world.openfoodfacts.org/api/v2/product/${ean}.json`
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'KorsetApp - Android/iOS - Version 1.0 (contact@korset.kz)' }
    })
    clearTimeout(timer)

    if (!res.ok) return null
    const json = await res.json()
    if (json.status !== 1 || !json.product) return null

    const p = json.product

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
    if (p.nutriments) {
      const n = p.nutriments
      nutriments = {}
      if (n['energy-kcal_100g'] != null) nutriments.calories_100g = Math.round(Number(n['energy-kcal_100g']))
      if (n['proteins_100g'] != null) nutriments.proteins_100g = Number(n['proteins_100g'])
      if (n['fat_100g'] != null) nutriments.fat_100g = Number(n['fat_100g'])
      if (n['carbohydrates_100g'] != null) nutriments.carbs_100g = Number(n['carbohydrates_100g'])
      if (n['sugars_100g'] != null) nutriments.sugars_100g = Number(n['sugars_100g'])
      if (n['salt_100g'] != null) nutriments.salt_100g = Number(n['salt_100g'])
    }

    const backPhoto = p.image_ingredients_url ||
                      p.selected_images?.ingredients?.display?.ru ||
                      p.selected_images?.ingredients?.display?.en ||
                      null

    return {
      nutriscore,
      nova_group: nova,
      allergens: [...new Set(allergens)],
      additives: [...new Set(additives)],
      nutriments,
      back_photo: backPhoto
    }
  } catch {
    return null
  }
}

async function main() {
  console.log(`========================================`)
  console.log(`KORSET MULTI-SOURCE ENRICHMENT ENGINE`)
  console.log(`========================================\n`)

  const archiveIndex = loadArchiveIndex()
  const halalRegistries = loadHalalRegistries()
  const galmartIndex = loadGalmartIndex()

  console.log(`\nReading raw products from ${RAW_PRODUCTS_PATH}...`)
  const fileStream = fs.createReadStream(RAW_PRODUCTS_PATH)
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity })

  const allProducts = []
  for await (const line of rl) {
    if (!line) continue
    allProducts.push(JSON.parse(line))
  }
  console.log(`Loaded ${allProducts.length} raw products.`)

  console.log('\n--- PASS 1: Fast Local Multi-Source Merge ---')
  let enrichedFromArchive = 0
  let enrichedFromHalal = 0
  let enrichedFromGalmart = 0

  const foodItemsNeedingOff = []

  for (let i = 0; i < allProducts.length; i++) {
    const p = allProducts[i]

    let nutriments = null
    let allergens = []
    let additives = []
    let dietTags = []
    let halalStatus = 'unknown'
    let halalCertifier = null
    let nutriscore = null
    let novaGroup = null
    let backPhoto = null
    let description = p.description

    // 1. Archive match
    const arch = archiveIndex.get(p.ean)
    if (arch) {
      enrichedFromArchive++
      if (arch.nutriments_json && Object.keys(arch.nutriments_json).length > 0) nutriments = arch.nutriments_json
      if (Array.isArray(arch.allergens_json) && arch.allergens_json.length > 0) allergens = arch.allergens_json
      if (Array.isArray(arch.additives_tags_json) && arch.additives_tags_json.length > 0) additives = arch.additives_tags_json
      if (Array.isArray(arch.diet_tags_json) && arch.diet_tags_json.length > 0) dietTags = arch.diet_tags_json
      if (arch.halal_status && arch.halal_status !== 'unknown') {
        halalStatus = arch.halal_status
        halalCertifier = arch.halal_certifier
      }
      if (arch.nutriscore) nutriscore = arch.nutriscore
      if (arch.nova_group) novaGroup = arch.nova_group
      if (arch.image_ingredients_url) backPhoto = arch.image_ingredients_url
      if (!description && arch.description) description = arch.description
    }

    // 2. Halal registry match
    const brandLower = (p.brand || '').toLowerCase().trim()
    const producerLower = (p.manufacturer || '').toLowerCase().trim()
    const halalMatch = halalRegistries.get(brandLower) || halalRegistries.get(producerLower)
    if (halalMatch) {
      enrichedFromHalal++
      halalStatus = 'yes'
      halalCertifier = halalMatch.certifier
    }

    // 3. Galmart match
    if (!description || !p.country_of_origin) {
      const normTitle = p.name.toLowerCase().replace(/[^\wа-яё]/gi, ' ').replace(/\s+/g, ' ').trim()
      const gm = galmartIndex.get(normTitle)
      if (gm) {
        enrichedFromGalmart++
        if (!description && gm.description) description = gm.description
        if (!p.country_of_origin && gm.country) p.country_of_origin = gm.country
        if (!p.manufacturer && gm.manufacturer) p.manufacturer = gm.manufacturer
        if (!nutriments && (gm.calories || gm.protein || gm.fat || gm.carbs)) {
          nutriments = {
            calories_100g: gm.calories,
            proteins_100g: gm.protein,
            fat_100g: gm.fat,
            carbs_100g: gm.carbs
          }
        }
      }
    }

    const normalizedQuantity = parseQuantity(p.quantity, p.name)
    const fatPercent = parseFatPercent(p.name, p.features)

    const allImages = [...p.images]
    if (backPhoto && !allImages.includes(backPhoto)) {
      allImages.push(backPhoto)
    }

    p.enriched = {
      ean: p.ean,
      alternate_eans: p.alternate_eans || [p.ean],
      name: p.name,
      name_kz: null,
      brand: p.brand || null,
      category: p.category,
      subcategory: p.subcategory || null,
      quantity: normalizedQuantity,
      price_kzt: p.price_kzt,
      image_url: p.image_url,
      image_ingredients_url: backPhoto || (allImages.length > 1 ? allImages[1] : null),
      images: allImages,
      ingredients_raw: p.ingredients_raw,
      ingredients_kz: p.ingredients_kz,
      nutriments_json: nutriments,
      allergens_json: allergens.length > 0 ? allergens : null,
      additives_tags_json: additives.length > 0 ? additives : null,
      diet_tags_json: dietTags.length > 0 ? dietTags : null,
      halal_status: halalStatus,
      halal_certifier: halalCertifier,
      nutriscore: nutriscore,
      nova_group: novaGroup,
      manufacturer: p.manufacturer,
      country_of_origin: p.country_of_origin,
      packaging_type: p.packaging_type,
      fat_percent: fatPercent,
      shelf_life: p.shelf_life,
      storage_conditions: p.storage_conditions,
      description: description,
      source_primary: 'semeiniy.kz',
      source_confidence: 95,
      is_active: true,
      is_verified: true,
      needs_review: false,
      data_quality_score: 0
    }

    p.enriched.data_quality_score = calculateQualityScore(p.enriched)

    // Check if food item needs OFF nutrition
    if (FOOD_CATEGORIES.has(p.category) && !p.enriched.nutriments_json) {
      foodItemsNeedingOff.push(p.enriched)
    }
  }

  console.log(`Pass 1 complete:`)
  console.log(` - Matched & Enriched from Archive: ${enrichedFromArchive}`)
  console.log(` - Certified by Halal Registries: ${enrichedFromHalal}`)
  console.log(` - Enriched from Galmart: ${enrichedFromGalmart}`)
  console.log(` - Food candidates needing OFF enrichment: ${foodItemsNeedingOff.length}`)

  console.log('\n--- PASS 2: Concurrent OFF Targeted Enrichment ---')
  const OFF_CONCURRENCY = 8
  const OFF_BUDGET = 2000 // Enrich first 2,000 top food items
  const offTargets = foodItemsNeedingOff.slice(0, OFF_BUDGET)
  let enrichedFromOff = 0
  let offDone = 0

  async function offWorker(workerItems) {
    for (const item of workerItems) {
      const off = await fetchFromOffApi(item.ean)
      if (off) {
        enrichedFromOff++
        if (off.nutriments) item.nutriments_json = off.nutriments
        if (off.nutriscore) item.nutriscore = off.nutriscore
        if (off.nova_group) item.nova_group = off.nova_group
        if (off.allergens.length > 0) {
          item.allergens_json = [...new Set([...(item.allergens_json || []), ...off.allergens])]
        }
        if (off.additives.length > 0) {
          item.additives_tags_json = [...new Set([...(item.additives_tags_json || []), ...off.additives])]
        }
        if (off.back_photo && !item.images.includes(off.back_photo)) {
          item.images.push(off.back_photo)
          if (!item.image_ingredients_url) item.image_ingredients_url = off.back_photo
        }
        item.data_quality_score = calculateQualityScore(item)
      }
      offDone++
      if (offDone % 100 === 0) {
        process.stdout.write(`\r[OFF Progress] Checked ${offDone}/${offTargets.length} items (Found: ${enrichedFromOff})`)
      }
    }
  }

  const chunks = Array.from({ length: OFF_CONCURRENCY }, () => [])
  offTargets.forEach((item, idx) => chunks[idx % OFF_CONCURRENCY].push(item))
  await Promise.all(chunks.map(chunk => offWorker(chunk)))
  console.log(`\nOFF Enrichment complete! Found ${enrichedFromOff} matching products in Open Food Facts.`)

  console.log('\n--- Writing Final Master Catalog ---')
  const outStream = fs.createWriteStream(ENRICHED_OUT_PATH, { flags: 'w' })
  for (const p of allProducts) {
    outStream.write(JSON.stringify(p.enriched) + '\n')
  }
  outStream.end()

  const outStat = fs.statSync(ENRICHED_OUT_PATH)
  console.log(`\n========================================`)
  console.log(`MASTER CATALOG ENRICHMENT SUCCESSFUL!`)
  console.log(`========================================`)
  console.log(`Total Products: ${allProducts.length}`)
  console.log(`Output File: ${ENRICHED_OUT_PATH}`)
  console.log(`File Size: ${(outStat.size / (1024 * 1024)).toFixed(2)} MB`)
}

main().catch(err => {
  console.error('FATAL ERROR:', err)
  process.exit(1)
})
