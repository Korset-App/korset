#!/usr/bin/env node

/**
 * crawl-semeiniy.mjs — Semeiniy.kz Backbone Catalog Harvester
 *
 * Core FMCG catalog builder for Körset:
 * - Reads product URLs from data/semeiniy_product_urls.json
 * - Respects categories (Food, Personal Care, Household)
 * - Strictly excludes alcohol, tobacco, appliances, clothing, cookware
 * - Extracts and validates GS1 EAN-13 barcodes (splits semicolon variants)
 * - Captures 700x700 studio packshots and dual RU/KZ packaging compositions
 * - 100% crash-resilient: append-only JSONL + checkpoint file + auto-resume
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { classifyBarcode } = require('./validate-ean.cjs')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const URLS_PATH = path.join(__dirname, '..', 'data', 'semeiniy_clean_master_urls.json')
const OUT_JSONL = path.join(__dirname, '..', 'data', 'semeiniy_raw_products.jsonl')
const CHECKPOINT_PATH = path.join(__dirname, '..', 'data', 'semeiniy_checkpoint.json')

// Concurrency & network settings
const CONCURRENCY = 8
const REQUEST_TIMEOUT_MS = 15000
const RETRY_ATTEMPTS = 3
const MIN_JITTER_MS = 40
const MAX_JITTER_MS = 80

// Category Blacklists (Alcohol, Tobacco, Non-FMCG)
const ALCOHOL_REGEX = /\b(алкогол|пиво|вино|водка|коньяк|виски|ликер|ликёр|сидр|ром|джин|текила|настойка|бальзам алк|чача|бренди|шампанское|игристое вино|вермут|абсент)\b/i
const TOBACCO_REGEX = /\b(табак|сигарет|стики|кальян|вейп|iqos|glo|табачные|папиросы|электронная сигарета|жидкость для вейпа|уголь для кальяна)\b/i
const NON_FMCG_REGEX = /\b(шары воздушные|посуда|кастрюл|сковород|электроника|бытовая техника|одежда|обувь|автотовары|автохимия|инструменты|товары для сада|сад и огород|горшок для|кашпо|грунт для|удобрение для цветов|семена цветов|канцтовары|канцелярские|новогодний декор|новогодние украшения|елочная игрушка|гирлянда|игрушки детские|детские игрушки|текстиль|постельное белье|пледы|подушки|одеяла|сувениры|свечи декоративные)\b/i

// Category Mapping Rules
function categorizeProduct(breadcrumbs, title) {
  const bcStr = breadcrumbs.join(' > ').toLowerCase()
  const titleLower = (title || '').toLowerCase()

  // 1. Check exclusions first
  // Note: Beer snacks (сухарики, сыр чечел, рыба вяленая, арахис) are FOOD, not alcohol
  const isBeerSnack = /\b(чечел|арахис|фисташки|вяленая|г\/к|х\/к|солено-сушеная|чипсы мясные|гренки)\b/i.test(titleLower)
  if (!isBeerSnack && (ALCOHOL_REGEX.test(bcStr) || ALCOHOL_REGEX.test(titleLower))) {
    return { exclude: 'alcohol' }
  }

  if (TOBACCO_REGEX.test(bcStr) || TOBACCO_REGEX.test(titleLower)) {
    return { exclude: 'tobacco' }
  }

  if (NON_FMCG_REGEX.test(bcStr)) {
    return { exclude: 'non_fmcg' }
  }

  // 2. Personal Care (Гигиена и уход)
  if (bcStr.includes('косметика') || bcStr.includes('гигиена') || bcStr.includes('уход') ||
      bcStr.includes('шампун') || bcStr.includes('мыло') || bcStr.includes('зубн') || bcStr.includes('подгузник')) {
    let sub = 'hygiene'
    if (titleLower.includes('мыло')) sub = 'soap'
    else if (titleLower.includes('шампунь') || titleLower.includes('бальзам для волос')) sub = 'shampoo'
    else if (titleLower.includes('паста') || titleLower.includes('щетка зубная')) sub = 'dental'
    else if (titleLower.includes('крем')) sub = 'cream'
    return { category: 'personal_care', subcategory: sub }
  }

  // 3. Household (Бытовая химия, Для дома, Корм для животных)
  if (bcStr.includes('бытовая химия') || bcStr.includes('lineyka-chistoty') || bcStr.includes('для стирки') ||
      bcStr.includes('моющие') || bcStr.includes('чистящие') || bcStr.includes('товары для дома')) {
    let sub = 'cleaning'
    if (titleLower.includes('стирк') || titleLower.includes('порошок') || titleLower.includes('кондиционер для белья')) sub = 'laundry'
    else if (titleLower.includes('бумага') || titleLower.includes('салфетк') || titleLower.includes('полотенца бумажные')) sub = 'paper'
    else if (titleLower.includes('от насекомых') || titleLower.includes('фумигатор') || titleLower.includes('дихлофос')) sub = 'pest_control'
    return { category: 'household', subcategory: sub }
  }

  if (bcStr.includes('zoo-tovary') || bcStr.includes('зоотовары') || bcStr.includes('корм для')) {
    return { category: 'household', subcategory: 'pet_food' }
  }

  // 4. Baby Food
  if (bcStr.includes('детское питание') || (bcStr.includes('детские') && (titleLower.includes('пюре') || titleLower.includes('каша') || titleLower.includes('смесь')))) {
    let sub = 'puree'
    if (titleLower.includes('смесь')) sub = 'formula'
    else if (titleLower.includes('каша')) sub = 'cereal'
    else if (titleLower.includes('печенье')) sub = 'baby_snacks'
    return { category: 'baby_food', subcategory: sub }
  }

  // 5. Bakery & Bread
  if (bcStr.includes('хлеб') || bcStr.includes('выпечка')) {
    let sub = 'bread'
    if (titleLower.includes('лаваш') || titleLower.includes('лепешка')) sub = 'lavash'
    else if (titleLower.includes('хлебцы')) sub = 'crispbread'
    else if (titleLower.includes('булочка') || titleLower.includes('круассан') || titleLower.includes('пирожок')) sub = 'pastry'
    return { category: 'bread', subcategory: sub }
  }

  // 6. Fruits & Vegetables
  if (bcStr.includes('овощи') || bcStr.includes('фрукты') || bcStr.includes('ягоды')) {
    let sub = 'vegetables'
    if (titleLower.includes('яблок') || titleLower.includes('банан') || titleLower.includes('апельсин') || titleLower.includes('мандарин') || titleLower.includes('лимон')) sub = 'fruits'
    else if (titleLower.includes('укроп') || titleLower.includes('петрушка') || titleLower.includes('лук зеленый') || titleLower.includes('салат')) sub = 'greens'
    return { category: 'fruits_veg', subcategory: sub }
  }

  // 7. Dairy & Eggs
  if (bcStr.includes('молоко') || bcStr.includes('сыр') || bcStr.includes('масло сливочное') || bcStr.includes('яйца') || bcStr.includes('творог') || bcStr.includes('йогурт')) {
    let sub = 'milk'
    if (titleLower.includes('сыр')) sub = 'cheese'
    else if (titleLower.includes('масло сливочное')) sub = 'butter'
    else if (titleLower.includes('сметана') || titleLower.includes('сливки')) sub = 'cream'
    else if (titleLower.includes('творог') || titleLower.includes('сырок')) sub = 'cottage'
    else if (titleLower.includes('кефир') || titleLower.includes('айран') || titleLower.includes('йогурт') || titleLower.includes('ряженка')) sub = 'fermented'
    else if (titleLower.includes('яйцо') || titleLower.includes('яйца')) sub = 'eggs'
    else if (titleLower.includes('сгущенка') || titleLower.includes('сгущенное')) sub = 'condensed_milk'
    else if (titleLower.includes('маргарин') || titleLower.includes('спред')) sub = 'spread'
    return { category: 'dairy_eggs', subcategory: sub }
  }

  // 8. Meat & Poultry
  if (bcStr.includes('птица') || bcStr.includes('мясо') || bcStr.includes('говядина') || bcStr.includes('свинина') || bcStr.includes('баранина')) {
    let sub = 'raw'
    if (titleLower.includes('куриц') || titleLower.includes('цыпленок') || titleLower.includes('индейка') || titleLower.includes('птиц')) sub = 'poultry'
    return { category: 'meat', subcategory: sub }
  }

  // 9. Sausages & Deli
  if (bcStr.includes('колбас') || bcStr.includes('сосиски') || bcStr.includes('паштет') || bcStr.includes('копчености') || bcStr.includes('деликатес')) {
    let sub = 'sausage'
    if (titleLower.includes('паштет')) sub = 'pate'
    else if (titleLower.includes('копчен')) sub = 'smoked'
    else if (titleLower.includes('тушенка') || titleLower.includes('консервы мясные')) sub = 'canned_meat'
    return { category: 'deli', subcategory: sub }
  }

  // 10. Fish & Seafood
  if (bcStr.includes('рыба') || bcStr.includes('морепродукты') || bcStr.includes('икра')) {
    let sub = 'fish'
    if (titleLower.includes('консервы') || titleLower.includes('шпроты') || titleLower.includes('сайра') || titleLower.includes('тунец')) sub = 'canned_fish'
    else if (titleLower.includes('креветк') || titleLower.includes('кальмар') || titleLower.includes('мидии') || titleLower.includes('краб')) sub = 'seafood'
    return { category: 'fish', subcategory: sub }
  }

  // 11. Water & Beverages
  if (bcStr.includes('напитки') || bcStr.includes('вода') || bcStr.includes('соки') || bcStr.includes('газировка') || bcStr.includes('энергетики') || bcStr.includes('лимонад')) {
    let sub = 'water'
    if (titleLower.includes('сок') || titleLower.includes('нектар') || titleLower.includes('морс')) sub = 'juice'
    else if (titleLower.includes('кола') || titleLower.includes('cola') || titleLower.includes('pepsi') || titleLower.includes('газирован')) sub = 'soda'
    else if (titleLower.includes('энергетик') || titleLower.includes('energy') || titleLower.includes('gorilla') || titleLower.includes('red bull')) sub = 'energy'
    else if (titleLower.includes('лимонад') || titleLower.includes('квас') || titleLower.includes('компот')) sub = 'lemonade'
    return { category: 'water_beverages', subcategory: sub }
  }

  // 12. Tea & Coffee
  if (bcStr.includes('чай') || bcStr.includes('кофе') || bcStr.includes('какао') || bcStr.includes('цикорий')) {
    let sub = 'tea'
    if (titleLower.includes('кофе') || titleLower.includes('цикорий') || titleLower.includes('какао')) sub = 'coffee'
    return { category: 'tea_coffee', subcategory: sub }
  }

  // 13. Sweets & Confectionery
  if (bcStr.includes('кондитерские') || bcStr.includes('сладости') || bcStr.includes('шоколад') || bcStr.includes('конфеты') || bcStr.includes('печенье') || bcStr.includes('вафли') || bcStr.includes('торт')) {
    let sub = 'candy'
    if (titleLower.includes('шоколад')) sub = 'chocolate'
    else if (titleLower.includes('печенье') || titleLower.includes('пряник')) sub = 'cookies'
    else if (titleLower.includes('вафли') || titleLower.includes('торт') || titleLower.includes('пирожное') || titleLower.includes('рулет')) sub = 'pastries'
    else if (titleLower.includes('халва') || titleLower.includes('козинак')) sub = 'halva'
    else if (titleLower.includes('мед') || titleLower.includes('мёд') || titleLower.includes('варенье') || titleLower.includes('джем')) sub = 'honey_jam'
    return { category: 'sweets', subcategory: sub }
  }

  // 14. Snacks
  if (bcStr.includes('чипсы') || bcStr.includes('сухарики') || bcStr.includes('снеки') || bcStr.includes('орехи') || bcStr.includes('семечки') || bcStr.includes('сухофрукты')) {
    let sub = 'chips'
    if (titleLower.includes('сухарики') || titleLower.includes('гренки') || titleLower.includes('крекер')) sub = 'crackers'
    else if (titleLower.includes('орех') || titleLower.includes('арахис') || titleLower.includes('миндаль') || titleLower.includes('фундук') || titleLower.includes('кешью')) sub = 'nuts'
    else if (titleLower.includes('изюм') || titleLower.includes('курага') || titleLower.includes('чернослив') || titleLower.includes('сухофрукт')) sub = 'dried_fruits'
    else if (titleLower.includes('семечк') || titleLower.includes('семена')) sub = 'seeds'
    return { category: 'snacks', subcategory: sub }
  }

  // 15. Grocery (Бакалея)
  if (bcStr.includes('бакалея') || bcStr.includes('крупы') || bcStr.includes('макароны') || bcStr.includes('мука') || bcStr.includes('сахар') || bcStr.includes('соль')) {
    let sub = 'cereals'
    if (titleLower.includes('макарон') || titleLower.includes('спагетти') || titleLower.includes('вермишель') || titleLower.includes('рожки')) sub = 'pasta'
    else if (titleLower.includes('рис')) sub = 'rice'
    else if (titleLower.includes('мука')) sub = 'flour'
    else if (titleLower.includes('сахар')) sub = 'sugar'
    else if (titleLower.includes('масло растительное') || titleLower.includes('масло подсолнечное') || titleLower.includes('масло оливковое')) sub = 'cooking_oil'
    else if (titleLower.includes('хлопья') || titleLower.includes('мюсли') || titleLower.includes('завтрак')) sub = 'breakfast'
    else if (titleLower.includes('соль')) sub = 'salt'
    else if (titleLower.includes('уксус')) sub = 'vinegar'
    return { category: 'grocery', subcategory: sub }
  }

  // 16. Sauces & Spices
  if (bcStr.includes('соусы') || bcStr.includes('майонез') || bcStr.includes('специи') || bcStr.includes('приправы') || bcStr.includes('кетчуп')) {
    let sub = 'spices'
    if (titleLower.includes('майонез') || titleLower.includes('кетчуп')) sub = 'mayo_ketchup'
    else if (titleLower.includes('соус')) sub = 'sauce'
    else if (titleLower.includes('соевый соус')) sub = 'soy_sauce'
    else if (titleLower.includes('бульон') || titleLower.includes('приправа')) sub = 'condiments'
    return { category: 'sauces_spices', subcategory: sub }
  }

  // 17. Frozen
  if (bcStr.includes('заморожен') || titleLower.includes('заморожен') || titleLower.includes('мороженое') || titleLower.includes('пельмени') || titleLower.includes('вареники')) {
    let sub = 'semi_finished'
    if (titleLower.includes('мороженое')) sub = 'ice_cream'
    else if (titleLower.includes('овощи замороженные') || titleLower.includes('ягоды замороженные')) sub = 'frozen_veg'
    else if (titleLower.includes('рыба замороженная')) sub = 'frozen_fish'
    else if (titleLower.includes('мясо замороженное')) sub = 'frozen_meat'
    return { category: 'frozen', subcategory: sub }
  }

  // 18. Ready meals / Healthy
  if (bcStr.includes('готовые блюда') || bcStr.includes('кулинария') || bcStr.includes('собственное производство')) {
    return { category: 'ready_meals', subcategory: 'ready' }
  }
  if (bcStr.includes('здоровое питание') || bcStr.includes('диабетическ')) {
    return { category: 'healthy', subcategory: 'diet' }
  }

  // Fallback
  return { category: 'grocery', subcategory: null }
}

function parsePageHtml(html, url) {
  // Title
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null
  if (!title) return null

  // Breadcrumbs
  const breadcrumbs = [...html.matchAll(/<span[^>]*itemprop=["']name["'][^>]*>([^<]+)<\/span>/gi)]
    .map(m => m[1].trim())
    .filter(b => b && b !== 'Главная' && b !== 'Пусто')

  // Categorization & Blacklist check
  const catResult = categorizeProduct(breadcrumbs, title)
  if (catResult.exclude) {
    return { excluded: catResult.exclude, title, url }
  }

  // Embedded JSON (skus, prices, features)
  let skusObj = null
  const skusMatch = html.match(/skus:\s*(\{[\s\S]*?\}),\s*stock_unit_id/i) || html.match(/skus:\s*(\{[\s\S]*?\})\s*,\s*services/i)
  if (skusMatch) {
    try {
      skusObj = JSON.parse(skusMatch[1])
    } catch {
      // ignore
    }
  }

  const rawSkuStrings = []
  let priceKzt = null
  let embeddedFeatures = {}

  if (skusObj) {
    for (const key of Object.keys(skusObj)) {
      const item = skusObj[key]
      if (item.sku) rawSkuStrings.push(item.sku)
      if (item.price || item.frontend_price) {
        const p = parseInt(item.frontend_price || item.price, 10)
        if (!isNaN(p) && p > 0 && !priceKzt) priceKzt = p
      }
      if (item.features) {
        embeddedFeatures = { ...embeddedFeatures, ...item.features }
      }
    }
  }

  // HTML fallback for SKU
  const htmlSkuMatch = html.match(/class=["'][^"']*js-product-sku[^"']*["'][^>]*>([^<]+)</i)
  if (htmlSkuMatch) rawSkuStrings.push(htmlSkuMatch[1].trim())

  // Parse and validate all barcodes (splitting ;, /, ,)
  const allCandidateBarcodes = []
  for (const raw of rawSkuStrings) {
    const parts = raw.split(/[;,/]/)
    for (const p of parts) {
      const clean = p.replace(/\D/g, '')
      if (clean) allCandidateBarcodes.push(clean)
    }
  }

  const validEans = []
  for (const b of [...new Set(allCandidateBarcodes)]) {
    const c = classifyBarcode(b)
    if (c.valid && c.checksumOk && (b.length === 13 || b.length === 12 || b.length === 8)) {
      validEans.push(b.length === 12 && c.ean13 ? c.ean13 : b)
    }
  }

  // If no valid GS1 barcode, skip
  if (validEans.length === 0) {
    return { excluded: 'no_valid_ean', title, url, rawSkus: rawSkuStrings }
  }

  // Features table
  const features = { ...embeddedFeatures }
  const featureRows = [...html.matchAll(/<tr[^>]*class=["'][^"']*s-features-wrapper__feature[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi)]
  for (const row of featureRows) {
    const nameMatch = row[1].match(/class=["'][^"']*s-features-wrapper__name[^"']*["'][^>]*>([\s\S]*?)<\/td>/i)
    const valMatch = row[1].match(/class=["'][^"']*s-features-wrapper__value[^"']*["'][^>]*>([\s\S]*?)<\/td>/i)
    if (nameMatch && valMatch) {
      const fName = nameMatch[1].replace(/<[^>]+>/g, '').trim().toLowerCase()
      const fVal = valMatch[1].replace(/<[^>]+>/g, '').trim()
      if (fName && fVal) features[fName] = fVal
    }
  }

  // Compositions
  const descMatch = html.match(/class=["'][^"']*s-product-desc[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
  const fullDesc = descMatch ? descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''
  let compositionRu = null
  if (/состав[:\s]/i.test(fullDesc)) {
    const compPart = fullDesc.replace(/^[\s\S]*?состав[:\s]/i, '').trim()
    compositionRu = compPart.split(/(?:пищевая ценность|условия хранения|срок годности)/i)[0].trim()
  }

  let compositionKz = null
  for (const [k, v] of Object.entries(features)) {
    if (k.includes('құрамы') || k.includes('курам')) {
      compositionKz = v
      break
    }
    if (typeof v === 'string' && (v.includes('Құрамы:') || v.includes('құрамы:'))) {
      compositionKz = v.replace(/^[\s\S]*?құрамы[:\s]/i, '').trim()
      break
    }
  }

  // Product ID in Webasyst (e.g. data-product-id="117759" or id="product-form-117759")
  const idMatch = html.match(/data-product-id=["'](\d+)["']/i) || html.match(/id=["']product-form-(\d+)["']/i) || html.match(/s-product-(\d+)/i)
  const productId = idMatch ? idMatch[1] : null

  // Studio packshots 700x700 (strictly from singular hero gallery template)
  const galleryTemplateMatch = html.match(/<!--\s*app:\s*shop;\s*template:\s*html\/product\/images\s*-->([\s\S]*?)<!--\/\s*app:\s*shop;\s*template:\s*html\/product\/images\s*-->/i)
  let uniqueImages = []
  if (galleryTemplateMatch) {
    const galleryHtml = galleryTemplateMatch[1]
    if (!galleryHtml.includes('empty_photo.svg')) {
      const imgMatches = [...galleryHtml.matchAll(/(?:\/wa-data\/public\/shop\/products\/[^\s"']+\.700\.[a-z0-9]+)/gi)]
        .map(m => m[0].startsWith('http') ? m[0] : 'https://semeiniy.kz' + m[0])
      uniqueImages = [...new Set(imgMatches)]
      if (productId && uniqueImages.length > 0) {
        uniqueImages = uniqueImages.filter(img => img.includes(`/${productId}/`))
      }
    }
  }

  return {
    ean: validEans[0],
    alternate_eans: validEans.length > 1 ? validEans.slice(1) : [],
    name: title,
    category: catResult.category,
    subcategory: catResult.subcategory,
    category_breadcrumbs: breadcrumbs,
    brand: features['бренд'] || features['brand'] || null,
    country_of_origin: features['страна'] || features['страна производства'] || features['страна-производитель'] || null,
    manufacturer: features['производитель'] || null,
    shelf_life: features['срок годности'] || features['срок хранения'] || null,
    storage_conditions: features['условия хранения'] || null,
    packaging_type: features['вид упаковки'] || features['тип упаковки'] || null,
    quantity: features['вес'] || features['объем'] || features['масса нетто'] || null,
    price_kzt: priceKzt,
    image_url: uniqueImages[0] || null,
    images: uniqueImages,
    ingredients_raw: compositionRu,
    ingredients_kz: compositionKz,
    description: fullDesc || null,
    source_url: url,
    source_primary: 'semeiniy.kz',
    scraped_at: new Date().toISOString()
  }
}

async function fetchWithRetry(url, attempt = 1) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'ru-RU,ru;q=0.9,kz;q=0.8,en;q=0.7'
      }
    })
    clearTimeout(timer)

    if (res.status === 429 || res.status === 503) {
      if (attempt <= RETRY_ATTEMPTS) {
        const backoffMs = attempt * 5000
        console.warn(`[HTTP ${res.status}] Throttling on ${url}, waiting ${backoffMs}ms before retry ${attempt}...`)
        await new Promise(r => setTimeout(r, backoffMs))
        return fetchWithRetry(url, attempt + 1)
      }
    }

    if (!res.ok) {
      return null
    }

    return await res.text()
  } catch (err) {
    if (attempt <= RETRY_ATTEMPTS) {
      await new Promise(r => setTimeout(r, 2000 * attempt))
      return fetchWithRetry(url, attempt + 1)
    }
    return null
  }
}

async function main() {
  console.log(`========================================`)
  console.log(`SEMEINIY.KZ BACKBONE HARVESTER`)
  console.log(`========================================`)

  if (!fs.existsSync(URLS_PATH)) {
    console.error(`ERROR: Product URLs file not found at ${URLS_PATH}`)
    process.exit(1)
  }

  const allUrls = JSON.parse(fs.readFileSync(URLS_PATH, 'utf8'))
  console.log(`Loaded total URLs to process: ${allUrls.length}`)

  // Load checkpoint
  let checkpoint = {
    processed: {},
    totalProcessed: 0,
    validProductsCount: 0,
    skippedAlcohol: 0,
    skippedTobacco: 0,
    skippedNonFmcg: 0,
    skippedNoEan: 0,
    skippedErrors: 0,
    lastUpdated: null
  }

  if (fs.existsSync(CHECKPOINT_PATH)) {
    try {
      checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf8'))
      console.log(`Checkpoint found: Resuming from ${checkpoint.totalProcessed} processed URLs (${checkpoint.validProductsCount} valid products).`)
    } catch {
      console.warn(`Could not read checkpoint, starting fresh...`)
    }
  }

  // Open output stream
  const outStream = fs.createWriteStream(OUT_JSONL, { flags: 'a' })

  let isStopping = false
  const saveCheckpoint = () => {
    checkpoint.lastUpdated = new Date().toISOString()
    fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2))
  }

  process.on('SIGINT', () => {
    console.log(`\nGracefully stopping... Saving checkpoint...`)
    isStopping = true
    saveCheckpoint()
    outStream.end()
    process.exit(0)
  })

  // Filter remaining URLs
  const remainingUrls = allUrls.filter(u => !checkpoint.processed[u])
  console.log(`Remaining URLs to scrape: ${remainingUrls.length}\n`)

  let index = 0
  let activeWorkers = 0

  async function worker() {
    while (index < remainingUrls.length && !isStopping) {
      const u = remainingUrls[index++]
      checkpoint.processed[u] = true
      checkpoint.totalProcessed++

      const html = await fetchWithRetry(u)
      if (!html) {
        checkpoint.skippedErrors++
      } else {
        const item = parsePageHtml(html, u)
        if (!item) {
          checkpoint.skippedErrors++
        } else if (item.excluded === 'alcohol') {
          checkpoint.skippedAlcohol++
        } else if (item.excluded === 'tobacco') {
          checkpoint.skippedTobacco++
        } else if (item.excluded === 'non_fmcg') {
          checkpoint.skippedNonFmcg++
        } else if (item.excluded === 'no_valid_ean') {
          checkpoint.skippedNoEan++
        } else {
          // Valid FMCG product
          checkpoint.validProductsCount++
          outStream.write(JSON.stringify(item) + '\n')
        }
      }

      // Periodic logging & checkpoint saving
      if (checkpoint.totalProcessed % 250 === 0) {
        saveCheckpoint()
        const pct = ((checkpoint.totalProcessed / allUrls.length) * 100).toFixed(1)
        console.log(`[Progress ${pct}%] Processed: ${checkpoint.totalProcessed}/${allUrls.length} | Valid: ${checkpoint.validProductsCount} | Skipped: Alc=${checkpoint.skippedAlcohol}, Tob=${checkpoint.skippedTobacco}, NonFMCG=${checkpoint.skippedNonFmcg}, NoEAN=${checkpoint.skippedNoEan}, Err=${checkpoint.skippedErrors}`)
      }

      // Adaptive jitter
      const jitter = Math.floor(Math.random() * (MAX_JITTER_MS - MIN_JITTER_MS + 1)) + MIN_JITTER_MS
      await new Promise(r => setTimeout(r, jitter))
    }
  }

  // Launch worker pool
  const workers = []
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker())
  }

  await Promise.all(workers)

  saveCheckpoint()
  outStream.end()

  console.log(`\n========================================`)
  console.log(`SEMEINIY SCRAPING COMPLETE!`)
  console.log(`========================================`)
  console.log(`Total URLs Processed: ${checkpoint.totalProcessed}`)
  console.log(`Valid FMCG Products Harvested: ${checkpoint.validProductsCount}`)
  console.log(`Saved to: ${OUT_JSONL}`)
  console.log(`Breakdown:`)
  console.log(` - Skipped Alcohol: ${checkpoint.skippedAlcohol}`)
  console.log(` - Skipped Tobacco: ${checkpoint.skippedTobacco}`)
  console.log(` - Skipped Non-FMCG: ${checkpoint.skippedNonFmcg}`)
  console.log(` - Skipped No EAN: ${checkpoint.skippedNoEan}`)
  console.log(` - Skipped Network/404 Errors: ${checkpoint.skippedErrors}`)
}

main().catch(err => {
  console.error('FATAL ERROR:', err)
  process.exit(1)
})
