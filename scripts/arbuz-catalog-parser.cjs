const fs = require('fs')
const path = require('path')
const https = require('https')
const { URL } = require('url')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')
const { classifyBarcode } = require('./validate-ean.cjs')
const { downloadAndUpload } = require('./utils/r2-upload.cjs')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const NPC_API_KEY = process.env.NPC_API_KEY

const CONSUMER_NAME = 'arbuz-kz.web.mobile'
const CONSUMER_KEY = '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj'
const API_BASE = 'https://arbuz.kz/api/v1'
const TOKEN_TTL = 10 * 60 * 1000
const DELAY_MS = 350
const OUT_DIR = path.join(__dirname, '..', 'data', 'arbuz-catalog')

let _token = { value: null, expires: 0 }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function httpReq(method, urlStr, headers = {}, body = null, retries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const url = new URL(urlStr)
      const req = https.request({
        hostname: url.hostname, port: 443, path: url.pathname + url.search, method,
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...headers },
        timeout: 30000,
      }, res => {
        let data = ''
        res.on('data', c => { data += c })
        res.on('end', () => resolve({ status: res.statusCode, body: data }))
      })
      req.on('error', e => { if (n > 1) { setTimeout(() => attempt(n - 1), 2000) } else { reject(e) } })
      req.on('timeout', () => { req.destroy(); if (n > 1) { setTimeout(() => attempt(n - 1), 2000) } else { reject(new Error('timeout after ' + retries + ' retries')) } })
      if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body))
      req.end()
    }
    attempt(retries)
  })
}

async function getToken() {
  if (_token.value && Date.now() < _token.expires) return _token.value
  const r = await httpReq('POST', API_BASE + '/auth/token', {}, { consumer: CONSUMER_NAME, key: CONSUMER_KEY })
  if (r.status !== 200) throw new Error('Auth failed: ' + r.status)
  _token = { value: JSON.parse(r.body).data.token, expires: Date.now() + TOKEN_TTL }
  return _token.value
}

async function apiSearch(query, limit = 50) {
  const token = await getToken()
  const qs = `where[name][c]=${encodeURIComponent(query)}&limit=${limit}`
  const r = await httpReq('GET', API_BASE + '/shop/search/products?' + qs, { Authorization: 'Bearer ' + token })
  if (r.status !== 200) return []
  try { const json = JSON.parse(r.body); return Array.isArray(json.data) ? json.data : [] } catch { return [] }
}

function httpGet(urlStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    https.get({
      hostname: url.hostname, port: 443, path: url.pathname + url.search,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'ru-RU,ru' },
    }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)) }).on('error', reject)
  })
}

function decodeHtml(s) {
  return s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))
}

function stripHtml(html) {
  if (!html) return null
  return html
    .replace(/<br\s*\/?>/gi, ', ').replace(/<\/p>/gi, ', ').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/&plusmn;/g, '±').replace(/&mdash;/g, '—').replace(/&deg;/g, '°')
    .replace(/,(\s*,)+/g, ',').replace(/^\s*,\s*/, '').trim() || null
}

function extractBarcodesFromHtml(decoded) {
  const result = new Map()
  const bcRe = /"barcode"\s*:\s*"(\d{8,14})"/g
  let m
  while ((m = bcRe.exec(decoded)) !== null) {
    const barcode = m[1]
    const barcodePos = m.index
    const searchStart = Math.max(0, barcodePos - 3000)
    const chunk = decoded.substring(searchStart, barcodePos + 500)
    const idRe = /"id"\s*:\s*"?(\d{4,})"?/g
    let idMatch, bestId = null, bestIdPos = -1
    while ((idMatch = idRe.exec(chunk)) !== null) {
      const pos = searchStart + idMatch.index
      if (pos < barcodePos && pos > bestIdPos) { bestId = idMatch[1]; bestIdPos = pos }
    }
    if (bestId) result.set(bestId, barcode)
  }
  return result
}

function parseNutrition(n) {
  if (!n || typeof n !== 'object') return null
  return {
    energy_kcal: n.kcal ? parseFloat(String(n.kcal).replace(',', '.')) : null,
    protein_100g: n.protein ? parseFloat(String(n.protein).replace(',', '.')) : null,
    fat_100g: n.fats ? parseFloat(String(n.fats).replace(',', '.')) : null,
    carbohydrates_100g: n.carbs ? parseFloat(String(n.carbs).replace(',', '.')) : null,
  }
}

function isHalalCharacteristic(characteristics) {
  if (!Array.isArray(characteristics)) return false
  return characteristics.some(c => c.name && c.name.toLowerCase().includes('халал'))
}

function calcQualityScore(p) {
  let score = 0
  if (p.name) score += 15
  if (p.ingredients_raw) score += 25
  if (p.nutriments_json && Object.values(p.nutriments_json).some(v => v != null)) score += 15
  if (p.image_url) score += 15
  if (p.halal_status === 'yes') score += 10
  if (p.brand) score += 10
  if (p.ean && !p.ean.startsWith('arbuz_')) score += 5
  if (p.country_of_origin) score += 5
  return Math.min(score, 100)
}

function cleanQueryForNpc(name) {
  if (!name) return ''
  let q = name
  // Split by comma and take first part (often weights/volumes are after comma)
  if (q.includes(',')) {
    q = q.split(',')[0]
  }
  // Remove weight/volume patterns like "50 г", "50г", "50.5 г", "50,5г", "1 л", "1.5л", "500 мл"
  q = q.replace(/\d+([.,]\d+)?\s*(г|кг|л|мл|шт|%)\.?/gi, '')
  // Remove trailing dashes, spaces, dots
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

  if (cleaned.split(/\s+/).length > 4) {
    queriesToTry.push(cleaned.split(/\s+/).slice(0, 3).join(' '))
  }

  const uniqueQueries = [...new Set(queriesToTry.filter(q => q && q.length > 2))]

  for (const query of uniqueQueries) {
    try {
      const r = await httpReq('POST', 'https://nationalcatalog.kz/gw/search/api/v1/search', {
        'X-API-KEY': NPC_API_KEY, 'Content-Type': 'application/json',
      }, { query: query.substring(0, 80), page: 1, size: 5 })

      if (r.status === 200) {
        const items = JSON.parse(r.body).items || []
        if (items.length > 0) {
          const withGtin = items.find(item => item.gtin && /^\d+$/.test(item.gtin.trim()))
          if (withGtin) return withGtin
          return items[0]
        }
      }
    } catch (e) {
      // ignore and try fallback
    }
    await sleep(100)
  }

  return null
}

const CATEGORY_QUERIES = [
  'шоколад', 'молоко', 'хлеб', 'сыр', 'масло сливочное',
  'кефир', 'напитки', 'чипсы', 'печенье', 'конфеты',
  'сок', 'кофе', 'чай', 'мороженое', 'йогурт',
  'колбаса', 'сосиски', 'макароны', 'крупа', 'рис',
  'кетчуп', 'майонез', 'сахар', 'мука', 'соль',
  'вода', 'творог', 'сметана', 'ряженка', 'подсолнечное масло', 'оливковое масло',
  'крабовые палочки', 'бекон', 'яйца', 'плавленый сыр', 'творожный сырок',
  'орехи', 'мёд', 'варенье', 'сгущенка',
  'зефир', 'мармелад', 'халва', 'вафли', 'бисквит',
  'пельмени', 'вареники', 'наггетсы',
  'детское питание', 'смесь детская', 'пюре детское'
]

function parseArgs() {
  const args = process.argv.slice(2)
  const result = { dryRun: false, limit: 0, skipNpc: false, skipR2: false, resume: false }
  for (const arg of args) {
    if (arg === '--dry-run') result.dryRun = true
    else if (arg.startsWith('--limit=')) result.limit = parseInt(arg.split('=')[1], 10)
    else if (arg === '--skip-npc') result.skipNpc = true
    else if (arg === '--skip-r2') result.skipR2 = true
    else if (arg === '--resume') result.resume = true
  }
  return result
}

async function main() {
  const { normalizeCategory } = await import('../src/domain/product/categoryMap.js')
  const { extractAllAttributes } = await import('../src/domain/product/attributeExtractor.js')
  const { normalizeName } = await import('../src/domain/product/nameNormalizer.js')
  globalThis._normalizeCategory = normalizeCategory
  globalThis._extractAttributes = extractAllAttributes
  globalThis._normalizeName = normalizeName

  const opts = parseArgs()
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase keys not set'); process.exit(1) }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  console.log('════════════════════════════════════════════════')
  console.log('ARBUZ FULL CATALOG PARSER v2')
  console.log('Strategy: API for composition + NPC for EANs')
  console.log('════════════════════════════════════════════════')
  console.log(`Dry run: ${opts.dryRun}, Limit: ${opts.limit || 'none'}, Skip NPC: ${opts.skipNpc}, Skip R2: ${opts.skipR2}`)
  console.log()

  try {
    await getToken()
    console.log('Arbuz auth OK')
  } catch (e) {
    console.error('Auth FAILED:', e.message)
    process.exit(1)
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  // Resume
  let processedIds = new Set()
  if (opts.resume) {
    const rf = path.join(OUT_DIR, 'progress.json')
    if (fs.existsSync(rf)) {
      const p = JSON.parse(fs.readFileSync(rf, 'utf8'))
      processedIds = new Set(p.processedIds || [])
      console.log(`Resuming: ${processedIds.size} already processed`)
    }
  }

  // ── PHASE 1: Discover products via API search ──
  console.log('\n── PHASE 1: Discover products via API search ──')
  const allProducts = new Map()
  const queries = opts.limit > 0 ? CATEGORY_QUERIES.slice(0, Math.ceil(opts.limit / 10)) : CATEGORY_QUERIES

  for (let qi = 0; qi < queries.length; qi++) {
    const query = queries[qi]
    if (opts.limit > 0 && allProducts.size >= opts.limit) break

    process.stdout.write(`  [${qi + 1}/${queries.length}] "${query}": `)
    let prods
    try {
      prods = await apiSearch(query, 50)
    } catch (e) {
      console.log(`API error: ${e.message}, skipping`)
      await sleep(2000)
      continue
    }
    let newCount = 0
    for (const p of prods) {
      if (allProducts.has(p.id) || processedIds.has(String(p.id))) continue
      if (opts.limit > 0 && allProducts.size >= opts.limit) break

      const composition = stripHtml(p.ingredients)
      const nutrition = parseNutrition(p.nutrition)
      const halal = isHalalCharacteristic(p.characteristics)

      allProducts.set(p.id, {
        arbuzId: p.id,
        name: p.name,
        brand: p.brandName || null,
        ean: null,
        category: p.catalogName || null,
        price: p.priceActual || null,
        country: p.producerCountry || null,
        composition,
        nutrition,
        halal,
        image: p.image ? p.image.replace(/w=%w&h=%h/, 'w=400&h=400') : null,
        characteristics: p.characteristics || [],
        storageConditions: p.storageConditions ? stripHtml(p.storageConditions) : null,
        information: p.information ? stripHtml(p.information) : null,
        sourceQuery: query,
      })
      newCount++
    }
    console.log(`${prods.length} results, +${newCount} new (total: ${allProducts.size})`)
    await sleep(DELAY_MS)
  }

  const productArray = [...allProducts.values()]
  console.log(`\nTotal discovered: ${productArray.length}`)
  console.log(`With composition: ${productArray.filter(p => p.composition).length}/${productArray.length}`)
  console.log(`With nutrition: ${productArray.filter(p => p.nutrition).length}/${productArray.length}`)

  // ── PHASE 2: NPC enrichment for EANs ──
  let npcEanCount = 0
  if (!opts.skipNpc) {
    console.log('\n── PHASE 2: NPC enrichment for EANs ──')
    for (let i = 0; i < productArray.length; i++) {
      const p = productArray[i]
      if (p.ean) continue

      process.stdout.write(`  [${i + 1}/${productArray.length}] ${(p.name || '').substring(0, 35)}... `)

      const npcItem = await npcSearchByName(p.name, p.brand)
      if (npcItem) {
        const gtin = npcItem.gtin || null
        if (gtin) {
          const bc = classifyBarcode(gtin.trim())
          if (bc.valid && bc.ean13) {
            p.ean = bc.ean13
            npcEanCount++
            console.log(`✓ EAN=${bc.ean13}`)
          } else {
            console.log(`invalid GTIN=${gtin}`)
          }
        } else {
          console.log('no GTIN')
        }
      } else {
        console.log('not found')
      }

      await sleep(DELAY_MS)
    }
    console.log(`NPC EANs obtained: ${npcEanCount}/${productArray.length}`)
  }

  // ── PHASE 3: Batch upsert to Supabase ──
  console.log('\n── PHASE 3: Batch upsert to Supabase ──')
  const results = { created: 0, enriched: 0, errors: 0 }

  // De-duplicate product array based on calculated/resolved EAN to prevent duplicate rows in single upsert batch
  const uniqueProducts = []
  const seenEansForUpsert = new Set()
  for (const p of productArray) {
    const ean = p.ean || 'arbuz_' + p.arbuzId
    if (!seenEansForUpsert.has(ean)) {
      seenEansForUpsert.add(ean)
      uniqueProducts.push(p)
    } else {
      console.log(`  Skipping duplicate item in batch (duplicate EAN=${ean}): ${p.name}`)
    }
  }

  const allEans = uniqueProducts.map(p => p.ean || 'arbuz_' + p.arbuzId)

  // 3a: Batch fetch existing products
  const existingMap = new Map()
  const FETCH_BATCH = 200
  for (let i = 0; i < allEans.length; i += FETCH_BATCH) {
    const batch = allEans.slice(i, i + FETCH_BATCH)
    const { data } = await sb.from('global_products')
      .select('id, ean, name, name_kz, ingredients_raw, halal_status, image_url, image_source, r2_key, nutriments_json, source_primary, source_confidence, specs_json, country_of_origin, manufacturer, brand, category, is_active, is_verified, data_quality_score')
      .in('ean', batch)
    if (data) for (const row of data) existingMap.set(row.ean, row)
    process.stdout.write(`  Fetch existing: ${Math.min(i + FETCH_BATCH, allEans.length)}/${allEans.length} (${existingMap.size} found)\r`)
  }
  console.log(`  Existing in DB: ${existingMap.size}/${allEans.length}`)

  // 3b: Build upsert records
  const toUpsert = []
  const now = new Date().toISOString()

  for (let i = 0; i < uniqueProducts.length; i++) {
    const p = uniqueProducts[i]
    const ean = allEans[i]
    const existing = existingMap.get(ean)

    let imageUrl = p.image || null
    let imageSource = p.image ? 'arbuz' : null

    if (existing) {
      const merge = { ean, updated_at: now, created_at: existing.created_at || now }

      if (p.composition) merge.ingredients_raw = p.composition
      else if (existing.ingredients_raw) merge.ingredients_raw = existing.ingredients_raw

      if ((!existing.halal_status || existing.halal_status === 'unknown') && p.halal) merge.halal_status = 'yes'
      else merge.halal_status = existing.halal_status || 'unknown'

      if (!existing.image_url && imageUrl) {
        merge.image_url = imageUrl; merge.image_source = imageSource
      } else {
        merge.image_url = existing.image_url; merge.image_source = existing.image_source; merge.r2_key = existing.r2_key
      }

      if (p.nutrition) {
        if (!existing.nutriments_json || Object.keys(existing.nutriments_json).length === 0) {
          merge.nutriments_json = p.nutrition
        } else {
          const merged = { ...existing.nutriments_json }
          for (const [k, v] of Object.entries(p.nutrition)) {
            if (v != null && (merged[k] == null || merged[k] === null)) merged[k] = v
          }
          merge.nutriments_json = merged
        }
      } else {
        merge.nutriments_json = existing.nutriments_json
      }

      merge.country_of_origin = existing.country_of_origin || p.country || null
      merge.manufacturer = existing.manufacturer || p.brand || null
      merge.brand = existing.brand || p.brand || null

      if (p.name && /[а-яА-ЯёЁ]/.test(p.name)) {
        merge.name = (!existing.name || !/[а-яА-ЯёЁ]/.test(existing.name)) ? p.name : existing.name
      } else {
        merge.name = existing.name || p.name
      }
      merge.name_kz = existing.name_kz || null

      const existingSpecs = existing.specs_json || {}
      merge.specs_json = { ...existingSpecs, arbuz_id: p.arbuzId, arbuz_price: p.price }

      merge.source_primary = (existing.source_primary === 'arbuz') ? 'arbuz' : 'arbuz'
      merge.source_confidence = 90
      merge.is_verified = true
      merge.is_active = true
      const norm = globalThis._normalizeCategory(existing.category || p.category || null, null, p.name, p.brand)
      merge.category = norm.category
      merge.subcategory = norm.subcategory

      const attrs = globalThis._extractAttributes({ name: merge.name, category: norm.category, halalStatus: merge.halal_status, dietTags: existing.diet_tags_json || [] })
      if (attrs.packaging_type) merge.packaging_type = attrs.packaging_type
      if (attrs.fat_percent != null) merge.fat_percent = attrs.fat_percent
      if (attrs.halal_status !== merge.halal_status && attrs.halal_status !== 'unknown') merge.halal_status = attrs.halal_status
      if (attrs.diet_tags_json) merge.diet_tags_json = attrs.diet_tags_json

      merge.name = globalThis._normalizeName(merge.name, { brand: merge.brand })

      merge.data_quality_score = calcQualityScore({ ...existing, ...merge })

      toUpsert.push(merge)
      results.enriched++
    } else {
      const newProduct = {
        ean,
        name: p.name,
        brand: p.brand,
        ingredients_raw: p.composition,
        nutriments_json: p.nutrition,
        halal_status: p.halal ? 'yes' : 'unknown',
        image_url: imageUrl,
        image_source: imageSource,
        source_primary: 'arbuz',
        source_confidence: 90,
        is_verified: true,
        country_of_origin: p.country,
        manufacturer: p.brand,
        ...globalThis._normalizeCategory(p.category || null, null, p.name, p.brand),
        specs_json: { arbuz_id: p.arbuzId, arbuz_price: p.price },
        is_active: true,
        created_at: now,
        updated_at: now,
      }
      const attrs = globalThis._extractAttributes({ name: newProduct.name, category: newProduct.category, halalStatus: newProduct.halal_status, dietTags: [] })
      if (attrs.packaging_type) newProduct.packaging_type = attrs.packaging_type
      if (attrs.fat_percent != null) newProduct.fat_percent = attrs.fat_percent
      if (attrs.halal_status !== newProduct.halal_status && attrs.halal_status !== 'unknown') newProduct.halal_status = attrs.halal_status
      if (attrs.diet_tags_json) newProduct.diet_tags_json = attrs.diet_tags_json

      newProduct.name = globalThis._normalizeName(newProduct.name, { brand: newProduct.brand })

      newProduct.data_quality_score = calcQualityScore(newProduct)

      toUpsert.push(newProduct)
      results.created++
    }

    processedIds.add(String(p.arbuzId))
  }

  // 3c: Batch upsert
  const UPSERT_BATCH = 100
  for (let i = 0; i < toUpsert.length; i += UPSERT_BATCH) {
    const batch = toUpsert.slice(i, i + UPSERT_BATCH)
    if (opts.dryRun) {
      console.log(`  [dry-run] Batch ${i + 1}-${Math.min(i + UPSERT_BATCH, toUpsert.length)}: ${batch.length} records`)
    } else {
      const { error } = await sb.from('global_products').upsert(batch, { onConflict: 'ean' })
      if (error) {
        results.errors += batch.length
        console.log(`  Batch ${i + 1}-${Math.min(i + UPSERT_BATCH, toUpsert.length)}: ERROR - ${error.message}`)
      } else {
        console.log(`  Batch ${i + 1}-${Math.min(i + UPSERT_BATCH, toUpsert.length)}: OK (${batch.length} records)`)
      }
    }
    await sleep(100)
  }

  fs.writeFileSync(path.join(OUT_DIR, 'progress.json'), JSON.stringify({
    updatedAt: new Date().toISOString(),
    totalDiscovered: productArray.length,
    processedIds: [...processedIds],
  }, null, 2))

  // ── Summary ──
  console.log('\n' + '═'.repeat(60))
  console.log('FINAL RESULTS')
  console.log('═'.repeat(60))
  console.log(`Discovered: ${productArray.length}`)
  console.log(`With EAN: ${productArray.filter(p => p.ean).length} (NPC: ${npcEanCount})`)
  console.log(`With composition: ${productArray.filter(p => p.composition).length}/${productArray.length} (${(productArray.filter(p => p.composition).length / productArray.length * 100).toFixed(0)}%)`)
  console.log(`With nutrition: ${productArray.filter(p => p.nutrition).length}/${productArray.length} (${(productArray.filter(p => p.nutrition).length / productArray.length * 100).toFixed(0)}%)`)
  console.log(`Created: ${results.created}`)
  console.log(`Enriched: ${results.enriched}`)
  console.log(`Errors: ${results.errors}`)

  const outFile = path.join(OUT_DIR, `catalog-import-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(outFile, JSON.stringify({
    testedAt: new Date().toISOString(),
    stats: {
      discovered: productArray.length,
      withEan: productArray.filter(p => p.ean).length,
      npcEanCount,
      withComposition: productArray.filter(p => p.composition).length,
      withNutrition: productArray.filter(p => p.nutrition).length,
      created: results.created,
      enriched: results.enriched,
      errors: results.errors,
    },
    products: productArray,
  }, null, 2))
  console.log(`Saved: ${outFile}`)
}

main().catch(e => { console.error(e); process.exit(1) })
