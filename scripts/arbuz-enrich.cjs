const fs = require('fs')
const path = require('path')
const https = require('https')
const { URL } = require('url')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')
const { downloadAndUpload, inferSource } = require('./utils/r2-upload')

const ARBUZ_CONSUMER_NAME = 'arbuz-kz.web.mobile'
const ARBUZ_CONSUMER_KEY = '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj'
const ARBUZ_API_BASE = 'https://arbuz.kz/api/v1'
const ARBUZ_TOKEN_TTL = 10 * 60 * 1000

const DELAY_MS = 400
const OUT_DIR = path.join(__dirname, '..', 'data', 'arbuz-enrich')

let _tokenCache = { token: null, expires: 0 }

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function httpReq(method, urlStr, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const reqOpts = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Accept-Language': 'ru-RU,ru',
        ...headers,
      },
      timeout: 20000,
    }
    const req = https.request(reqOpts, res => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body))
    req.end()
  })
}

async function getArbuzToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.expires) return _tokenCache.token

  const r = await httpReq('POST', ARBUZ_API_BASE + '/auth/token', {}, {
    consumer: ARBUZ_CONSUMER_NAME,
    key: ARBUZ_CONSUMER_KEY,
  })

  if (r.status !== 200) throw new Error(`Auth failed: ${r.status} ${r.body.substring(0, 200)}`)

  const json = JSON.parse(r.body)
  const token = json.data?.token
  if (!token) throw new Error('No token in response')

  _tokenCache = { token, expires: Date.now() + ARBUZ_TOKEN_TTL }
  return token
}

async function arbuzApiGet(path, params = {}) {
  const token = await getArbuzToken()
  const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  const url = ARBUZ_API_BASE + path + (qs ? '?' + qs : '')
  const r = await httpReq('GET', url, { Authorization: 'Bearer ' + token })
  if (r.status !== 200) return { error: `HTTP ${r.status}`, data: null }
  try {
    return { error: null, data: JSON.parse(r.body).data }
  } catch (e) {
    return { error: `Parse error: ${e.message}`, data: null }
  }
}

function stripHtml(html) {
  if (!html) return null
  return html
    .replace(/<br\s*\/?>/gi, ', ')
    .replace(/<\/p>/gi, ', ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&plusmn;/g, '±')
    .replace(/&mdash;/g, '—')
    .replace(/&deg;/g, '°')
    .replace(/,(\s*,)+/g, ',')
    .replace(/^\s*,\s*/, '')
    .trim() || null
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

function normalize(str) {
  return (str || '').toLowerCase()
    .replace(/[éèêë]/g, 'e')
    .replace(/[áàâä]/g, 'a')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[''`]/g, "'")
    .replace(/['']/g, "'")
}

function matchScore(product, queryBrand, queryName) {
  let score = 0
  const pName = normalize(product.name)
  const pBrand = normalize(product.brandName)
  const qBrand = normalize(queryBrand)
  const qName = normalize(queryName)

  if (qBrand && pBrand === qBrand) score += 80
  else if (qBrand && pBrand.includes(qBrand)) score += 50
  else if (qBrand && qBrand.includes(pBrand) && pBrand.length > 2) score += 40
  else if (qBrand && pName.includes(qBrand)) score += 20

  const qWords = qName.split(/\s+/).filter(w => w.length > 2)
  for (const w of qWords) {
    if (pName.includes(w)) score += 10
  }

  if (product.nutrition) score += 2
  if (product.ingredients) score += 2

  return score
}

const MIN_MATCH_SCORE = 30

async function searchArbuz(query, limit = 10) {
  return arbuzApiGet('/shop/search/products', {
    'where[name][c]': query,
    limit: String(limit),
  })
}

async function getArbuzProductDetail(productId) {
  return arbuzApiGet('/shop/product/' + productId)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const result = { dryRun: false, limit: 0 }
  for (const arg of args) {
    if (arg === '--dry-run') result.dryRun = true
    else if (arg.startsWith('--limit=')) result.limit = parseInt(arg.split('=')[1], 10)
  }
  return result
}

async function main() {
  const opts = parseArgs()

  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase keys not set'); process.exit(1) }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  console.log('Authenticating with Arbuz API v1...')
  try {
    const token = await getArbuzToken()
    console.log('Token obtained, length:', token.length)
  } catch (e) {
    console.error('Auth failed:', e.message)
    process.exit(1)
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  const { data: products, error } = await sb
    .from('global_products')
    .select('id, ean, name, brand, ingredients_raw, halal_status, country_of_origin, specs_json, image_url')
    .eq('is_active', true)
    .or('ingredients_raw.is.null,ingredients_raw.eq.,halal_status.is.null')
    .order('id')

  if (error) { console.error('DB error:', error); process.exit(1) }

  const needsComposition = products.filter(p => !p.ingredients_raw || p.ingredients_raw.trim() === '')
  console.log(`Total products: ${products.length}`)
  console.log(`Need composition: ${needsComposition.length}`)

  const toProcess = opts.limit > 0 ? needsComposition.slice(0, opts.limit) : needsComposition.slice(0, 20)
  console.log(`Will process: ${toProcess.length}`)

  if (toProcess.length === 0) { console.log('Nothing to do'); return }

  let found = 0, compositionFound = 0, kbjuFound = 0, halalFound = 0, noMatch = 0
  const results = []

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i]
    const label = `[${i + 1}/${toProcess.length}] #${p.id} ${p.brand || '?'} — ${(p.name || '').substring(0, 25)}`
    process.stdout.write(`${label}... `)

    const brandQuery = normalize((p.brand || '').trim()).substring(0, 40)
    if (!brandQuery || brandQuery.length < 2) {
      console.log('skip (no brand)')
      noMatch++
      await sleep(DELAY_MS)
      continue
    }

    try {
      const search = await searchArbuz(brandQuery, 20)
      if (search.error) {
        console.log(`✗ search error: ${search.error}`)
        results.push({ id: p.id, error: search.error })
        await sleep(DELAY_MS)
        continue
      }

      const searchProducts = search.data || []
      if (searchProducts.length === 0) {
        console.log(`✗ not found`)
        noMatch++
        results.push({ id: p.id, query: brandQuery, arbuzFound: 0 })
        await sleep(DELAY_MS)
        continue
      }

      const scored = searchProducts.map(sp => ({ ...sp, _score: matchScore(sp, p.brand, p.name) }))
        .sort((a, b) => b._score - a._score)
      const best = scored[0]

      if (best._score < MIN_MATCH_SCORE) {
        console.log(`✗ low match (${best._score}): ${best.brandName || '?'} — ${(best.name || '').substring(0, 30)}`)
        noMatch++
        results.push({ id: p.id, query: brandQuery, arbuzFound: searchProducts.length, bestScore: best._score, bestName: best.name })
        await sleep(DELAY_MS)
        continue
      }

      process.stdout.write(`found (id:${best.id} ${best.brandName || '?'} score:${best._score}) → detail... `)

      const detail = await getArbuzProductDetail(best.id)
      if (detail.error) {
        console.log(`✗ detail error: ${detail.error}`)
        noMatch++
        results.push({ id: p.id, query: brandQuery, arbuzId: best.id, error: detail.error })
        await sleep(DELAY_MS)
        continue
      }

      const d = detail.data
      const composition = stripHtml(d?.ingredients)
      const nutrition = parseNutrition(d?.nutrition)
      const halal = isHalalCharacteristic(d?.characteristics)

      found++
      if (composition) compositionFound++
      if (nutrition) kbjuFound++
      if (halal) halalFound++

      const compPreview = composition ? composition.substring(0, 50) + '...' : '-'
      const kbjuStr = nutrition ? `${nutrition.energy_kcal}kcal P:${nutrition.protein_100g} F:${nutrition.fat_100g} C:${nutrition.carbohydrates_100g}` : '-'
      console.log(`✓ Comp:${compPreview} | КБЖУ:${kbjuStr} | Halal:${halal} | ${d?.priceActual ? d.priceActual + '₸' : '-'}`)

      const arbuzImageUrl = d?.image ? d.image.replace(/w=%w&h=%h/, 'w=400&h=400') : null

      let r2ImageUrl = null
      let r2Key = null
      if (arbuzImageUrl && !opts.dryRun) {
        const uploaded = await downloadAndUpload(p.ean, arbuzImageUrl, 'main')
        if (uploaded) {
          r2ImageUrl = uploaded.publicUrl
          r2Key = uploaded.r2Key
          console.log(`    🖼 R2: ${r2Key} (${(uploaded.size / 1024).toFixed(1)}KB)`)
        }
      }

        results.push({
        id: p.id,
        ean: p.ean,
        query: brandQuery,
        arbuzId: d?.id,
        arbuzArticleIndex: d?.articleIndex,
        arbuzBarcode: d?.barcode,
        composition,
        nutrition,
        halal,
        price: d?.priceActual || null,
        brand: d?.brandName,
        country: d?.producerCountry,
        name: d?.name,
        image: r2ImageUrl || arbuzImageUrl,
        r2Key,
        characteristics: d?.characteristics || [],
      })

      if (!opts.dryRun && composition) {
        const updates = {
          ingredients_raw: composition,
          halal_status: halal ? 'yes' : (p.halal_status || 'unknown'),
          updated_at: new Date().toISOString(),
        }
        if (nutrition) {
          updates.nutriments_json = nutrition
          updates.alcohol_100g = 0
        }
        if (d?.producerCountry) updates.country_of_origin = d.producerCountry
        if (d?.brandName) updates.manufacturer = d.brandName
        if (d?.priceActual) updates.specs_json = { ...(p.specs_json || {}), arbuz_price: d.priceActual }
        if (r2ImageUrl) {
          updates.image_url = r2ImageUrl
          updates.r2_key = r2Key
          updates.image_source = 'arbuz'
        } else if (arbuzImageUrl) {
          updates.image_url = arbuzImageUrl
          updates.image_source = 'arbuz'
        }

        const { error: updErr } = await sb.from('global_products').update(updates).eq('id', p.id)
        if (updErr) console.log(`    ⚠ DB update error: ${updErr.message}`)
        else console.log(`    → DB updated`)
      }

    } catch (e) {
      console.log(`✗ ${e.message}`)
      results.push({ id: p.id, error: e.message })
    }

    await sleep(DELAY_MS)
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Processed: ${toProcess.length}`)
  console.log(`Found: ${found}/${toProcess.length} (${(found / toProcess.length * 100).toFixed(0)}%)`)
  console.log(`Composition: ${compositionFound}`)
  console.log(`КБЖУ: ${kbjuFound}`)
  console.log(`Halal: ${halalFound}`)
  console.log(`No match: ${noMatch}`)

  const outFile = path.join(OUT_DIR, `arbuz-enrich-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(outFile, JSON.stringify({ testedAt: new Date().toISOString(), stats: { processed: toProcess.length, found, compositionFound, kbjuFound, halalFound, noMatch }, results }, null, 2))
  console.log(`Saved: ${outFile}`)
}

main().catch(e => { console.error(e); process.exit(1) })
