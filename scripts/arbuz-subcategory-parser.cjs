const fs = require('fs')
const path = require('path')
const https = require('https')
const { URL } = require('url')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')
const { classifyBarcode } = require('./validate-ean.cjs')

let downloadAndUpload = null
try {
  const r2 = require('./utils/r2-upload.cjs')
  downloadAndUpload = r2.downloadAndUpload
} catch {
  console.log('R2 uploader utility not found, skipping image uploads')
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const NPC_API_KEY = process.env.NPC_API_KEY

const CONSUMER_NAME = 'arbuz-kz.web.mobile'
const CONSUMER_KEY = '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj'
const API_BASE = 'https://arbuz.kz/api/v1'
const CONCURRENCY = 5
const DELAY_MS = 250
const OUT_DIR = path.join(__dirname, '..', 'data', 'subcategory-import')

let _token = { value: null, expires: 0 }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function httpReq(method, urlStr, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...headers },
      timeout: 15000,
    }
    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body))
    req.end()
  })
}

function httpGetHtml(urlStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9'
      },
      timeout: 15000
    }
    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.end()
  })
}

async function getToken() {
  if (_token.value && Date.now() < _token.expires) return _token.value
  const r = await httpReq('POST', API_BASE + '/auth/token', {}, { consumer: CONSUMER_NAME, key: CONSUMER_KEY })
  if (r.status !== 200) throw new Error('Arbuz token acquisition failed with status ' + r.status)
  const j = JSON.parse(r.body)
  _token = { value: j.data.token, expires: Date.now() + 10 * 60 * 1000 }
  return _token.value
}

async function apiSearch(query, token, limit = 100) {
  const url = `${API_BASE}/shop/search/products?where[name][c]=${encodeURIComponent(query)}&limit=${limit}`
  const r = await httpReq('GET', url, { 'Authorization': 'Bearer ' + token })
  if (r.status !== 200) return []
  const j = JSON.parse(r.body)
  return Array.isArray(j.data) ? j.data : (j.data?.items || [])
}

async function apiDetail(productId, token) {
  const url = `${API_BASE}/shop/product/${productId}`
  const r = await httpReq('GET', url, { 'Authorization': 'Bearer ' + token })
  if (r.status !== 200) return null
  const j = JSON.parse(r.body)
  return j.data || null
}

function stripHtml(html) {
  if (!html) return null
  return html
    .replace(/<br\s*\/?>/gi, ', ').replace(/<\/p>/gi, ', ').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/,(\s*,)+/g, ',').trim() || null
}

function parseNutrition(n) {
  if (!n || typeof n !== 'object') return null
  const result = {}
  if (n.kcal) result.energy_kcal = parseFloat(String(n.kcal).replace(',', '.'))
  if (n.protein) result.protein_100g = parseFloat(String(n.protein).replace(',', '.'))
  if (n.fats) result.fat_100g = parseFloat(String(n.fats).replace(',', '.'))
  if (n.carbs) result.carbohydrates_100g = parseFloat(String(n.carbs).replace(',', '.'))
  return Object.keys(result).length > 0 ? result : null
}

function isHalalCharacteristic(characteristics) {
  if (!Array.isArray(characteristics)) return false
  return characteristics.some(c => c.name && c.name.toLowerCase().includes('халал'))
}

function cleanQueryForNpc(name) {
  if (!name) return ''
  let q = name.split(',')[0]
  q = q.replace(/\d+([.,]\d+)?\s*(г|кг|л|мл|шт|%)\.?/gi, '')
  q = q.replace(/[-\s.]+$/, '').trim()
  return q
}

async function npcSearchByName(name, brand = null) {
  if (!NPC_API_KEY || !name) return null
  const cleaned = cleanQueryForNpc(name)
  const queriesToTry = [cleaned]
  if (brand && !cleaned.toLowerCase().includes(brand.toLowerCase())) {
    queriesToTry.push(`${brand} ${cleaned}`)
  }
  const uniqueQueries = [...new Set(queriesToTry.filter(q => q && q.length > 2))]

  for (const q of uniqueQueries) {
    try {
      const r = await httpReq('POST', 'https://nationalcatalog.kz/gw/search/api/v1/search', {
        'X-API-KEY': NPC_API_KEY,
        'Content-Type': 'application/json',
      }, { query: q.substring(0, 80), page: 1, size: 5 })

      if (r.status === 200) {
        const items = JSON.parse(r.body).items || []
        if (items.length > 0) {
          const withGtin = items.find(item => item.gtin && /^\d+$/.test(item.gtin.trim()))
          if (withGtin) return withGtin
          return items[0]
        }
      }
    } catch {}
    await sleep(DELAY_MS)
  }
  return null
}

function parseArgs() {
  const args = process.argv.slice(2)
  const result = { dryRun: false, limit: 0, skipR2: false, mode: 'milk' }
  for (const arg of args) {
    if (arg === '--dry-run') result.dryRun = true
    else if (arg.startsWith('--limit=')) result.limit = parseInt(arg.split('=')[1], 10)
    else if (arg === '--skip-r2') result.skipR2 = true
    else if (arg.startsWith('--mode=')) result.mode = arg.split('=')[1]
  }
  return result
}

function calcQualityScore(p) {
  let s = 0
  if (p.name) s += 15
  if (p.ingredients_raw) s += 25
  if (p.nutriments_json && Object.values(p.nutriments_json).some(v => v != null)) s += 15
  if (p.image_url) s += 15
  if (p.halal_status === 'yes') s += 10
  if (p.brand) s += 10
  if (p.ean && !p.ean.startsWith('arbuz_')) s += 5
  if (p.country_of_origin) s += 5
  return Math.min(s, 100)
}

async function main() {
  // ESM dynamic imports
  const { normalizeCategory } = await import('../src/domain/product/categoryMap.js')
  const { extractAllAttributes } = await import('../src/domain/product/attributeExtractor.js')
  const { normalizeName } = await import('../src/domain/product/nameNormalizer.js')

  const opts = parseArgs()

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase keys not set in environment.')
    process.exit(1)
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  const MODES = {
    milk: {
      title: 'Молоко, сливки, сгущенка',
      url: 'https://arbuz.kz/ru/almaty/catalog/cat/19986-moloko_slivki_sgush_nnoe_moloko',
      subcategories: ['milk', 'cream', 'condensed_milk'],
      pages: 7
    },
    kefir: {
      title: 'Кефир, творог, сметана',
      url: 'https://arbuz.kz/ru/almaty/catalog/cat/225446-kefir_tvorog_smetana',
      subcategories: ['fermented', 'cream', 'cottage'],
      pages: 10
    },
    yogurt: {
      title: 'Йогурты, сырки, десерты',
      url: 'https://arbuz.kz/ru/almaty/catalog/cat/225171-iogurty_syrki_deserty',
      subcategories: ['fermented', 'cottage', 'milk'],
      pages: 10
    },
    eggs_butter: {
      title: 'Яйца, масло, маргарин',
      url: 'https://arbuz.kz/ru/almaty/catalog/cat/225245-yaica_maslo_margarin',
      subcategories: ['eggs', 'butter', 'spread'],
      pages: 5
    },
    cheese: {
      title: 'Сыры',
      url: 'https://arbuz.kz/ru/almaty/catalog/cat/20160-syr',
      subcategories: ['cheese'],
      pages: 14
    },
    ice_cream: {
      title: 'Мороженое',
      url: 'https://arbuz.kz/ru/almaty/catalog/cat/225209-morozhenoe',
      subcategories: ['ice_cream'],
      pages: 10
    },
    semi_finished: {
      title: 'Полуфабрикаты',
      url: 'https://arbuz.kz/ru/almaty/catalog/cat/225184-polufabrikaty',
      subcategories: ['semi_finished'],
      pages: 10
    },
    samsa: {
      title: 'Самса, пирожки, чебуреки',
      url: 'https://arbuz.kz/ru/almaty/catalog/cat/225187-samsa_pirozhki_chebureki',
      subcategories: ['semi_finished'],
      pages: 3
    },
    frozen_bakery: {
      title: 'Хлеб, выпечка, пироги и тесто (замороженное)',
      url: 'https://arbuz.kz/ru/almaty/catalog/cat/225186-hleb_vypechka_pirogi_i_testo',
      subcategories: ['semi_finished'],
      pages: 5
    },
    water: {
      title: 'Вода',
      url: 'https://arbuz.kz/ru/almaty/catalog/cat/20697-voda',
      subcategories: ['water'],
      pages: 8
    },
    soda_energy: {
      title: 'Газировка и энергетики',
      url: 'https://arbuz.kz/ru/almaty/catalog/cat/20784-gazirovka_i_energetiki',
      subcategories: ['soda', 'energy', 'lemonade'],
      pages: 10
    },
    cold_tea: {
      title: 'Холодный чай, компот, морс',
      url: [
        'https://arbuz.kz/ru/almaty/catalog/cat/199332-morsy_kompoty',
        'https://arbuz.kz/ru/almaty/catalog/cat/225367-kombucha_kvas',
        'https://arbuz.kz/ru/almaty/catalog/cat/25328-holodnyi_chai',
        'https://arbuz.kz/ru/almaty/catalog/cat/225614-pp-kvas_i_kombucha'
      ],
      subcategories: ['juice', 'lemonade'],
      pages: 5
    },
    juices: {
      title: 'Соки и нектары',
      url: [
        'https://arbuz.kz/ru/almaty/catalog/cat/20741-soki_nektary',
        'https://arbuz.kz/ru/almaty/catalog/cat/224613-soki_pryamogo_otzhima'
      ],
      subcategories: ['juice'],
      pages: 12
    },
    sausages: {
      title: 'Колбасы и сосиски',
      url: [
        'https://arbuz.kz/ru/almaty/catalog/cat/224903-var_nye_halal',
        'https://arbuz.kz/ru/almaty/catalog/cat/224909-kopchenye_halal',
        'https://arbuz.kz/ru/almaty/catalog/cat/19860-var_nye',
        'https://arbuz.kz/ru/almaty/catalog/cat/224906-var_no-kopch_nye',
        'https://arbuz.kz/ru/almaty/catalog/cat/19873-kopchenye_kolbasy',
        'https://arbuz.kz/ru/almaty/catalog/cat/224907-polukopch_nye',
        'https://arbuz.kz/ru/almaty/catalog/cat/224908-syrokopch_nye_i_syrovyalenye',
        'https://arbuz.kz/ru/almaty/catalog/cat/19899-narezki'
      ],
      subcategories: ['sausage'],
      pages: 10
    },
    wieners: {
      title: 'Сосиски, сардельки',
      url: 'https://arbuz.kz/ru/almaty/catalog/cat/225180-sosiski_sardelki',
      subcategories: ['sausage'],
      pages: 5
    }
  }

  const modeConfig = MODES[opts.mode] || MODES.milk

  console.log('════════════════════════════════════════════════')
  console.log(`ARBUZ SUBCATEGORY PARSER: ${modeConfig.title}`)
  console.log('════════════════════════════════════════════════')
  console.log(`Dry run: ${opts.dryRun}, Limit: ${opts.limit || 'none'}, Skip R2: ${opts.skipR2}, Mode: ${opts.mode}`)
  console.log()

  const token = await getToken()
  console.log('Arbuz API token acquired.')

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  const uniqueProducts = new Map()

  console.log('\n── PHASE 1: Discovering Products via Category Page Scraper ──')
  const urlsToScrape = Array.isArray(modeConfig.url) ? modeConfig.url : [modeConfig.url]
  
  for (const baseUrl of urlsToScrape) {
    console.log(`\nScraping path: ${baseUrl}`)
    for (let page = 1; page <= modeConfig.pages; page++) {
      const pageUrl = `${baseUrl}?page=${page}`
      console.log(`  Scraping page ${page}...`)
      try {
        const res = await httpGetHtml(pageUrl)
        if (res.status === 200) {
          const html = res.body
          const itemRe = /\/catalog\/item\/(\d+)-([a-z0-9_]+)/gi
          let match
          let pageCount = 0
          while ((match = itemRe.exec(html)) !== null) {
            const id = parseInt(match[1], 10)
            const slug = match[2]
            if (!uniqueProducts.has(id)) {
              uniqueProducts.set(id, { id, slug, name: slug.replace(/_/g, ' ') })
              pageCount++
            }
          }
          console.log(`    Discovered ${pageCount} new products (Total so far: ${uniqueProducts.size})`)
          if (pageCount === 0 && page > 1) {
            break // Skip further pages if this page yielded no new items
          }
        } else {
          console.error(`    Page ${page} returned status ${res.status}`)
        }
      } catch (e) {
        console.error(`    Failed to scrape page ${page}: ${e.message}`)
      }
      await sleep(250)
    }
  }

  let productList = Array.from(uniqueProducts.values())
  console.log(`Total unique products discovered: ${productList.length}`)

  if (opts.limit > 0) {
    productList = productList.slice(0, opts.limit)
    console.log(`Limiting processing to: ${productList.length}`)
  }

  console.log('\n── PHASE 2: Fetching Product Details & Enriched Facts ──')
  const processedProducts = []
  const stats = { npcMatches: 0, created: 0, enriched: 0, errors: 0, imagesUploaded: 0 }

  for (let i = 0; i < productList.length; i += CONCURRENCY) {
    const batch = productList.slice(i, i + CONCURRENCY)
    console.log(`Fetching batch ${i + 1}-${Math.min(i + CONCURRENCY, productList.length)}...`)

    const details = await Promise.allSettled(
      batch.map(p => apiDetail(p.id, token).catch(() => null))
    )

    for (let j = 0; j < batch.length; j++) {
      const original = batch[j]
      const detail = details[j].status === 'fulfilled' ? details[j].value : null
      if (!detail || !detail.name) {
        console.log(`  [skip] Failed to fetch API details for ID ${original.id} / ${original.name}`)
        continue
      }
      const full = detail

      const rawComposition = stripHtml(full.ingredients || full.compound)
      const nutrition = parseNutrition(full.nutrition)
      const halal = isHalalCharacteristic(full.characteristics || [])

      // EAN parsing
      const barcode = full.barcode || null
      let ean = barcode ? String(barcode).trim() : null
      if (ean) {
        const bc = classifyBarcode(ean)
        if (bc.valid && bc.ean13) ean = bc.ean13
      }

      // If EAN is missing, search NPC
      if (!ean) {
        const npcItem = await npcSearchByName(full.name, full.brandName)
        if (npcItem && npcItem.gtin) {
          const bc = classifyBarcode(npcItem.gtin.trim())
          if (bc.valid && bc.ean13) {
            ean = bc.ean13
            stats.npcMatches++
          }
        }
      }

      // Final EAN fallback
      if (!ean) {
        ean = 'arbuz_' + full.id
      }

      let imageUrl = full.image ? full.image.replace(/w=%w&h=%h/, 'w=400&h=400') : null
      let r2Key = null
      let imageSource = imageUrl ? 'arbuz' : null

      if (imageUrl && !opts.skipR2 && !opts.dryRun && downloadAndUpload) {
        const uploaded = await downloadAndUpload(ean, imageUrl, 'main').catch(() => null)
        if (uploaded) {
          imageUrl = uploaded.publicUrl
          r2Key = uploaded.r2Key || null
          imageSource = 'arbuz'
          stats.imagesUploaded++
        }
      }

      // Filter out Arbuz-exclusive private labels or locally cooked catering (like Jent, Arbuz Select)
      const isArbuzBrand = full.brandName && (full.brandName.toLowerCase().includes('arbuz') || full.brandName.toLowerCase().includes('арбуз'))
      const isJentName = full.name && (full.name.toLowerCase().includes('jent') || full.name.toLowerCase().includes('жент'))
      if (isArbuzBrand || isJentName) {
        console.log(`  [skip] Skipping Arbuz private label/local cooked product: ${full.name}`)
        continue
      }

      // Normalize Category & Attributes
      let normCategory = normalizeCategory(null, null, full.name, full.brandName)
      let category = normCategory.category || 'dairy_eggs'
      let subcategory = normCategory.subcategory || 'milk'

      // Force category/subcategory mapping for eggs_butter or cheese mode
      if (opts.mode === 'eggs_butter') {
        category = 'dairy_eggs'
        const lowerName = (full.name || '').toLowerCase()
        if (lowerName.includes('яйц') || lowerName.includes('яйцо')) {
          subcategory = 'eggs'
        } else if (lowerName.includes('маргарин') || lowerName.includes('спред')) {
          subcategory = 'spread'
        } else {
          subcategory = 'butter'
        }
      } else if (opts.mode === 'cheese') {
        category = 'dairy_eggs'
        subcategory = 'cheese'
      } else if (opts.mode === 'ice_cream') {
        category = 'frozen'
        subcategory = 'ice_cream'
      } else if (opts.mode === 'semi_finished' || opts.mode === 'samsa' || opts.mode === 'frozen_bakery') {
        category = 'frozen'
        subcategory = 'semi_finished'
      } else if (opts.mode === 'water') {
        category = 'water_beverages'
        subcategory = 'water'
      } else if (opts.mode === 'soda_energy') {
        category = 'water_beverages'
        const lowerName = (full.name || '').toLowerCase()
        const lowerBrand = (full.brand?.name || '').toLowerCase()
        
        if (
          lowerName.includes('энерг') ||
          lowerName.includes('red bull') ||
          lowerName.includes('hell ') ||
          lowerName.includes('flash') ||
          lowerName.includes('gorilla') ||
          lowerName.includes('dizzy') ||
          lowerName.includes('adrenalin') ||
          lowerName.includes('monster') ||
          lowerName.includes('genesis') ||
          lowerName.includes('volt')
        ) {
          subcategory = 'energy'
        } else if (
          lowerName.includes('лимонад') ||
          lowerName.includes('квас') ||
          lowerName.includes('натахтари') ||
          lowerName.includes('комбуча') ||
          lowerBrand.includes('настоящий буратино') ||
          lowerBrand.includes('ascania')
        ) {
          subcategory = 'lemonade'
        } else {
          subcategory = 'soda'
        }
      } else if (opts.mode === 'cold_tea') {
        category = 'water_beverages'
        const lowerName = (full.name || '').toLowerCase()
        if (lowerName.includes('комбуча') || lowerName.includes('квас')) {
          subcategory = 'lemonade'
        } else {
          subcategory = 'juice'
        }
      } else if (opts.mode === 'juices') {
        category = 'water_beverages'
        subcategory = 'juice'
      } else if (opts.mode === 'sausages' || opts.mode === 'wieners') {
        category = 'deli'
        subcategory = 'sausage'
      }

      // Filter to keep only target subcategories
      let expectedCategory = 'dairy_eggs'
      if (opts.mode === 'ice_cream' || opts.mode === 'semi_finished' || opts.mode === 'samsa' || opts.mode === 'frozen_bakery') {
        expectedCategory = 'frozen'
      } else if (opts.mode === 'water' || opts.mode === 'soda_energy' || opts.mode === 'cold_tea' || opts.mode === 'juices') {
        expectedCategory = 'water_beverages'
      } else if (opts.mode === 'sausages' || opts.mode === 'wieners') {
        expectedCategory = 'deli'
      }

      const allowedSubcategories = modeConfig.subcategories
      if (category !== expectedCategory || !allowedSubcategories.includes(subcategory)) {
        console.log(`  [skip] Skipping non-target product: ${full.name} (${category} / ${subcategory})`)
        continue
      }

      const productRecord = {
        ean,
        name: normalizeName(full.name, { brand: full.brandName }),
        brand: full.brandName || null,
        ingredients_raw: rawComposition,
        nutriments_json: nutrition,
        halal_status: halal ? 'yes' : 'unknown',
        image_url: imageUrl,
        image_source: imageSource,
        r2_key: r2Key,
        country_of_origin: full.producerCountry || null,
        manufacturer: full.brandName || null,
        category,
        subcategory,
        specs_json: {
          arbuz_id: full.id,
          arbuz_price: full.priceActual || null,
          storage_conditions: stripHtml(full.storageConditions) || null,
        },
        source_primary: 'arbuz',
        source_confidence: 90,
        is_verified: true,
        is_active: true,
      }

      // Attribute extractor overrides
      const extAttrs = extractAllAttributes({
        name: productRecord.name,
        category,
        halalStatus: productRecord.halal_status,
        dietTags: [],
      })
      if (extAttrs.packaging_type) productRecord.packaging_type = extAttrs.packaging_type
      if (extAttrs.fat_percent != null) productRecord.fat_percent = extAttrs.fat_percent
      if (extAttrs.halal_status !== productRecord.halal_status && extAttrs.halal_status !== 'unknown') {
        productRecord.halal_status = extAttrs.halal_status
      }
      if (extAttrs.diet_tags_json) productRecord.diet_tags_json = extAttrs.diet_tags_json

      productRecord.data_quality_score = calcQualityScore(productRecord)
      processedProducts.push(productRecord)
    }

    await sleep(DELAY_MS)
  }

  console.log(`\nProcessed ${processedProducts.length} items.`)

  // De-duplicate by EAN (keeping the highest quality score)
  const eanMap = new Map()
  processedProducts.sort((a, b) => (b.data_quality_score || 0) - (a.data_quality_score || 0))
  for (const p of processedProducts) {
    if (!eanMap.has(p.ean)) {
      eanMap.set(p.ean, p)
    }
  }
  const uniqueProductsArray = Array.from(eanMap.values())
  console.log(`De-duplicated to ${uniqueProductsArray.length} unique EAN products.`)
  processedProducts.length = 0
  processedProducts.push(...uniqueProductsArray)

  console.log('\n── PHASE 3: Saving to Database (Conflict Resolution) ──')
  if (opts.dryRun) {
    console.log('[dry-run] Dry Run mode. Printing sample normalized products:')
    for (let i = 0; i < Math.min(10, processedProducts.length); i++) {
      const p = processedProducts[i]
      console.log(`\nProduct [${i + 1}]:`)
      console.log(`- EAN: ${p.ean}`)
      console.log(`- Original Name: ${uniqueProducts.get(p.specs_json.arbuz_id)?.name}`)
      console.log(`- Normalized Name: ${p.name}`)
      console.log(`- Brand: ${p.brand}`)
      console.log(`- Fat %: ${p.fat_percent !== undefined ? p.fat_percent : 'N/A'}`)
      console.log(`- Packaging: ${p.packaging_type || 'N/A'}`)
      console.log(`- Composition Length: ${p.ingredients_raw ? p.ingredients_raw.length : 0} chars`)
      console.log(`- KBJU: ${JSON.stringify(p.nutriments_json)}`)
    }
  } else {
    // Live Database Upsert
    console.log(`Upserting ${processedProducts.length} products to Supabase global_products...`)
    const batchSize = 100
    for (let i = 0; i < processedProducts.length; i += batchSize) {
      const batch = processedProducts.slice(i, i + batchSize)
      // Check existing to separate created and enriched
      const eans = batch.map(p => p.ean)
      const { data: existingRows } = await sb.from('global_products').select('ean').in('ean', eans)
      const existingEans = new Set((existingRows || []).map(r => r.ean))

      const { error } = await sb.from('global_products').upsert(batch, { onConflict: 'ean' })
      if (error) {
        stats.errors += batch.length
        console.error(`Error in batch ${i + 1}:`, error.message)
      } else {
        batch.forEach(p => {
          if (existingEans.has(p.ean)) stats.enriched++; else stats.created++
        })
        console.log(`Batch ${i + 1}-${Math.min(i + batchSize, processedProducts.length)} successfully upserted.`)
      }
      await sleep(100)
    }
  }

  // Save Audit File
  const statsSummary = {
    totalScanned: productList.length,
    npcMatches: stats.npcMatches,
    imagesUploaded: stats.imagesUploaded,
    created: stats.created,
    enriched: stats.enriched,
    errors: stats.errors,
  }

  console.log('\n=== IMPORT SUMMARY ===')
  console.log(`Total unique products processed: ${statsSummary.totalScanned}`)
  console.log(`NPC EAN matches: ${statsSummary.npcMatches}`)
  console.log(`New products created: ${statsSummary.created}`)
  console.log(`Products enriched: ${statsSummary.enriched}`)
  console.log(`Errors: ${statsSummary.errors}`)

  const outFile = path.join(OUT_DIR, `dairy-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(outFile, JSON.stringify({ testedAt: new Date().toISOString(), stats: statsSummary, results: processedProducts }, null, 2))
  console.log(`\nSaved audit file: ${outFile}`)
}

main().catch(console.error)
