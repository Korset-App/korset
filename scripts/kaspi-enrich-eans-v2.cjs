/**
 * KORSET — Kaspi EAN Enrichment v2
 * Searches external sources for EAN codes:
 *   1. upcitemdb.com — name search, HTML parsing
 *   2. OpenFoodFacts v2 — EAN verification
 *   3. DuckDuckGo — search "{brand} {name} штрихкод"
 *   4. Known EANs (manually verified)
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const { URL } = require('url')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const DATA_DIR = path.join(__dirname, '..', 'data', 'kaspi')
const DELAY_MS = 500

const KNOWN_EANS = {
  '7622300424695': { brand: 'Milka', name: 'Alpine Milk', weight: '80' },
  '4000417019004': { brand: 'Ritter Sport', name: 'Лесной орех', weight: '100' },
  '4008400260921': { brand: 'KINDER', name: 'Country', weight: '37.5' },
  '4000607151002': { brand: 'Schogetten', name: 'Alpine Milk', weight: '100' },
  '4607005409058': { brand: 'Победа', name: '72% Stevia', weight: '50' },
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function httpGet(urlStr, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const mod = url.protocol === 'https:' ? https : http
    const reqOpts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/json,*/*',
        ...opts.headers,
      },
      timeout: 15000,
    }
    const req = mod.request(reqOpts, res => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', chunk => { body += chunk })
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.end()
  })
}

function extractEansFromText(text) {
  const eans = new Set()
  const re = /\b(\d{13})\b/g
  let m
  while ((m = re.exec(text)) !== null) {
    eans.add(m[1])
  }
  return [...eans]
}

function extractEansFromUpcItemDbHtml(html) {
  const eans = new Set()
  const jsonBlockMatch = html.match(/window\.APP_DATA\s*=\s*(\{.*?\});/s)
  if (jsonBlockMatch) {
    try {
      const data = JSON.parse(jsonBlockMatch[1])
      if (data.items) {
        for (const item of data.items) {
          if (item.ean) eans.add(String(item.ean))
          if (item.upc) eans.add(String(item.upc).padStart(13, '0'))
        }
      }
    } catch (_) {}
  }
  const tableRowRe = /<tr[^>]*>[\s\S]*?<td[^>]*>(\d{13})<\/td>/g
  let m
  while ((m = tableRowRe.exec(html)) !== null) {
    eans.add(m[1])
  }
  const genericEans = extractEansFromText(html)
  for (const e of genericEans) eans.add(e)
  return [...eans]
}

async function searchUpcItemDb(brand, name) {
  const query = `${brand} ${name}`.replace(/\s+/g, '+')
  const url = `https://www.upcitemdb.com/query?type=2&s=${encodeURIComponent(query)}`
  try {
    const res = await httpGet(url)
    if (res.status !== 200) return []
    try {
      const data = JSON.parse(res.body)
      if (data.items) {
        return data.items
          .map(i => i.ean || i.upc)
          .filter(Boolean)
          .map(e => String(e).padStart(13, '0').slice(0, 13))
      }
    } catch (_) {}
    return extractEansFromUpcItemDbHtml(res.body)
  } catch (err) {
    console.log(`    upcitemdb error: ${err.message}`)
    return []
  }
}

async function verifyEanOff(ean) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${ean}?fields=code,product_name,brands,countries`
  try {
    const res = await httpGet(url, { headers: { 'Accept': 'application/json' } })
    if (res.status === 200) {
      try {
        const data = JSON.parse(res.body)
        if (data.status === 1 && data.product) {
          return { valid: true, product: data.product }
        }
      } catch (_) {}
    }
    return { valid: false, product: null }
  } catch (err) {
    return { valid: false, product: null }
  }
}

async function searchDuckDuckGo(brand, name) {
  const query = `${brand} ${name} штрихкод EAN`
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  try {
    const res = await httpGet(url)
    if (res.status !== 200) return []
    const eans = new Set()
    const linkRe = /href="[^"]*?(\d{13})[^"]*?"/g
    let m
    while ((m = linkRe.exec(res.body)) !== null) eans.add(m[1])
    const snippetRe = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
    while ((m = snippetRe.exec(res.body)) !== null) {
      for (const e of extractEansFromText(m[1])) eans.add(e)
    }
    for (const e of extractEansFromText(res.body)) eans.add(e)
    return [...eans]
  } catch (err) {
    console.log(`    DuckDuckGo error: ${err.message}`)
    return []
  }
}

function eanMatchesProduct(ean, productBrand, productName, productWeight) {
  const known = KNOWN_EANS[ean]
  if (known) {
    const bNorm = productBrand.toLowerCase().replace(/[''`´]/g, '')
    const kBNorm = known.brand.toLowerCase().replace(/[''`´]/g, '')
    if (bNorm.includes(kBNorm) || kBNorm.includes(bNorm)) return true
  }
  return null
}

function normalizeBrand(b) {
  return (b || '').toLowerCase().replace(/[''`´]/g, '').replace(/[^a-zа-яё0-9]/g, '').trim()
}

function brandMatch(brandA, brandB) {
  const a = normalizeBrand(brandA)
  const b = normalizeBrand(brandB)
  return a === b || a.includes(b) || b.includes(a)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const result = { category: null, resume: false, limit: 0 }
  for (const arg of args) {
    if (arg.startsWith('--category=')) result.category = arg.split('=')[1]
    else if (arg === '--resume') result.resume = true
    else if (arg.startsWith('--limit=')) result.limit = parseInt(arg.split('=')[1], 10)
  }
  return result
}

async function enrichProduct(product, idx, total) {
  const label = `[${idx + 1}/${total}] ${product.brand} — ${product.name}`
  console.log(`\n${label}`)

  const knownMatch = Object.entries(KNOWN_EANS).find(([, info]) => {
    const bMatch = brandMatch(product.brand, info.brand)
    const nMatch = normalizeBrand(product.name).includes(normalizeBrand(info.name)) ||
      normalizeBrand(info.name).includes(normalizeBrand(product.name.split(/\s+/).slice(1).join(' ')))
    const wMatch = !product.weight || !info.weight || Math.abs(parseFloat(product.weight) - parseFloat(info.weight)) < 5
    return bMatch && nMatch && wMatch
  })

  if (knownMatch) {
    console.log(`    ✓ KNOWN: ${knownMatch[0]}`)
    return { ean: knownMatch[0], source: 'known', verified: true }
  }

  console.log('    → upcitemdb...')
  await sleep(DELAY_MS)
  const upcEans = await searchUpcItemDb(product.brand, product.name)
  console.log(`    upcitemdb: ${upcEans.length} EANs found`)

  for (const ean of upcEans.slice(0, 5)) {
    console.log(`    → verifying ${ean} via OFF...`)
    await sleep(DELAY_MS)
    const off = await verifyEanOff(ean)
    if (off.valid) {
      const pBrand = off.product.brands || ''
      if (brandMatch(product.brand, pBrand)) {
        console.log(`    ✓ VERIFIED: ${ean} (OFF: ${pBrand})`)
        return { ean, source: 'upcitemdb+off', verified: true }
      }
      console.log(`    ✗ brand mismatch: ${pBrand}`)
    } else {
      console.log(`    ✗ not in OFF`)
    }
  }

  console.log('    → DuckDuckGo...')
  await sleep(DELAY_MS)
  const ddgEans = await searchDuckDuckGo(product.brand, product.name)
  console.log(`    DuckDuckGo: ${ddgEans.length} EANs found`)

  for (const ean of ddgEans.slice(0, 3)) {
    console.log(`    → verifying ${ean} via OFF...`)
    await sleep(DELAY_MS)
    const off = await verifyEanOff(ean)
    if (off.valid) {
      const pBrand = off.product.brands || ''
      if (brandMatch(product.brand, pBrand)) {
        console.log(`    ✓ VERIFIED: ${ean} (OFF: ${pBrand})`)
        return { ean, source: 'ddg+off', verified: true }
      }
    }
  }

  if (upcEans.length > 0) {
    console.log(`    → unverified best guess: ${upcEans[0]}`)
    return { ean: upcEans[0], source: 'upcitemdb', verified: false }
  }

  console.log('    ✗ no EAN found')
  return { ean: null, source: null, verified: false }
}

async function main() {
  const opts = parseArgs()
  if (!opts.category) {
    console.error('Usage: node kaspi-enrich-eans-v2.cjs --category="Chocolate bars" [--resume] [--limit=N]')
    process.exit(1)
  }

  const catMap = { 'Chocolate bars': '01_chocolate-bars' }
  const catFile = catMap[opts.category] || opts.category.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const rawFile = path.join(DATA_DIR, `${catFile}_raw.json`)
  const outFile = path.join(DATA_DIR, `${catFile}_enriched.json`)

  if (!fs.existsSync(rawFile)) { console.error('Raw file not found. Run kaspi-download.cjs first'); process.exit(1) }

  const rawData = JSON.parse(fs.readFileSync(rawFile, 'utf8'))
  const products = rawData.products || []

  let existing = []
  const enrichedCodes = new Set()
  if (opts.resume && fs.existsSync(outFile)) {
    existing = JSON.parse(fs.readFileSync(outFile, 'utf8')).products || []
    for (const p of existing) {
      if (p.ean) enrichedCodes.add(p.kaspiCode)
    }
  }

  console.log(`\n=== Kaspi EAN Enrichment v2: ${opts.category} ===`)
  console.log(`Total: ${products.length}, Already enriched: ${enrichedCodes.size}`)

  const toEnrich = products.filter(p => !enrichedCodes.has(p.kaspiCode) && !p.error)
  const limited = opts.limit > 0 ? toEnrich.slice(0, opts.limit) : toEnrich

  console.log(`To process: ${limited.length}`)
  const allEnriched = [...existing]
  let found = 0, verified = 0, notFound = 0

  for (let i = 0; i < limited.length; i++) {
    const product = limited[i]
    const result = await enrichProduct(product, i, limited.length)

    allEnriched.push({
      ...product,
      ean: result.ean,
      eanMatchSource: result.source,
      eanVerified: result.verified,
      needsEan: !result.ean,
    })

    if (result.ean) {
      found++
      if (result.verified) verified++
    } else {
      notFound++
    }

    if ((i + 1) % 10 === 0) {
      const tmpResult = {
        category: opts.category,
        enrichedAt: new Date().toISOString(),
        total: products.length,
        enriched: allEnriched.length,
        found,
        verified,
        notFound,
        products: allEnriched,
      }
      fs.writeFileSync(outFile, JSON.stringify(tmpResult, null, 2))
      console.log(`\n--- checkpoint saved (${i + 1}/${limited.length}) ---`)
    }
  }

  const result = {
    category: opts.category,
    enrichedAt: new Date().toISOString(),
    total: products.length,
    enriched: allEnriched.length,
    found,
    verified,
    notFound,
    products: allEnriched,
  }
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2))

  console.log(`\n=== Done! ===`)
  console.log(`Total: ${allEnriched.length}`)
  console.log(`EAN found: ${found} (${(found / allEnriched.length * 100).toFixed(1)}%)`)
  console.log(`Verified: ${verified}`)
  console.log(`No match: ${notFound} (${(notFound / allEnriched.length * 100).toFixed(1)}%)`)
  console.log(`Saved: ${outFile}`)
}

main().catch(err => { console.error(err); process.exit(1) })
