const path = require('path')
const https = require('https')
const { URL } = require('url')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')
const { classifyBarcode } = require('./validate-ean.cjs')
const { assertLegacyEanScriptDryRunOnly } = require('./legacy-ean-script-guard.cjs')

const NPC_API_KEY = process.env.NPC_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const MIN_SCORE = 10
const SEARCH_SIZE = 10

function httpPost(urlStr, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const url = new URL(urlStr)
    const options = {
      hostname: url.hostname, port: 443,
      path: url.pathname + url.search, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-API-KEY': NPC_API_KEY,
      },
    }
    const req = https.request(options, res => {
      let body = ''
      res.on('data', c => { body += c })
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }) }
        catch (_) { resolve({ status: res.statusCode, body: body.substring(0, 500) }) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.write(data); req.end()
  })
}

async function npcSearch(query, size = SEARCH_SIZE) {
  const r = await httpPost('https://nationalcatalog.kz/gw/search/api/v1/search', { query, page: 1, size })
  if (r.status !== 200) return { error: `HTTP ${r.status}`, items: [] }
  return { total: r.body.pageInfo?.totalSize || 0, items: r.body.items || [] }
}

function extractEan(item) {
  if (item.gtin && item.gtin !== '-' && item.gtin.length >= 8) {
    const bc = classifyBarcode(item.gtin)
    if (bc.valid) return { ean: item.gtin, type: 'gtin', country: bc.country }
  }
  if (item.ntin && item.ntin !== '-') return { ean: item.ntin, type: 'ntin', country: null }
  return null
}

function extractBrandAttr(item) {
  const a = (item.attributes || []).find(a => a.code === 'brand' && a.value)
  return a ? (a.valueRu || a.value || '').trim() : ''
}

function scoreMatch(item, productName, productBrand) {
  let score = 0
  const nameRu = (item.nameRu || '').toLowerCase()
  const pName = productName.toLowerCase()
  const pBrand = (productBrand || '').toLowerCase().trim()

  if (pBrand && nameRu.includes(pBrand)) score += 10
  if (pBrand && pName.includes(pBrand)) score += 5

  const brandAttr = extractBrandAttr(item)
  if (brandAttr && pBrand) {
    const bv = brandAttr.toLowerCase()
    if (bv && (bv.includes(pBrand) || pBrand.includes(bv))) score += 15
  }

  const nameWords = pName.split(/\s+/).filter(w => w.length > 2)
  for (const w of nameWords) {
    if (nameRu.includes(w)) score += 3
  }

  if (item.gtin && item.gtin !== '-') score += 5
  if (item.categoryNameRuL1?.includes('пищев') || item.categoryNameRuL1?.includes('азыт')) score += 3

  return score
}

function buildQueries(product) {
  const name = product.name || ''
  const brand = product.brand || ''
  const queries = []

  const q1 = `${brand} ${name}`.trim().substring(0, 80)
  if (q1.length >= 3) queries.push({ query: q1, label: 'full' })

  if (brand && brand.length >= 2) {
    const q2 = brand.substring(0, 80)
    if (q2 !== q1 && q2.length >= 2) queries.push({ query: q2, label: 'brand-only' })
  }

  const seen = new Set()
  return queries.filter(q => {
    if (seen.has(q.query)) return false
    seen.add(q.query)
    return true
  })
}

function parseArgs() {
  const args = process.argv.slice(2)
  const result = { dryRun: false, limit: 0, skip: 0 }
  for (const arg of args) {
    if (arg === '--dry-run') result.dryRun = true
    else if (arg.startsWith('--limit=')) result.limit = parseInt(arg.split('=')[1], 10)
    else if (arg.startsWith('--skip=')) result.skip = parseInt(arg.split('=')[1], 10)
  }
  return result
}

async function main() {
  const opts = parseArgs()
  assertLegacyEanScriptDryRunOnly({ scriptName: 'npc-eans-harvest.cjs' })

  if (!NPC_API_KEY) { console.error('NPC_API_KEY not set'); process.exit(1) }
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('SUPABASE_URL/SERVICE_ROLE_KEY not set'); process.exit(1) }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  const PAGE_SIZE = 999
  let allProducts = [], page = 0
  while (true) {
    const { data: chunk, error } = await sb
      .from('global_products')
      .select('id, ean, name, name_kz, brand, source_primary, alternate_eans')
      .eq('is_active', true)
      .order('id')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (error) { console.error('DB error:', error); process.exit(1) }
    if (!chunk || chunk.length === 0) break
    allProducts = allProducts.concat(chunk)
    page++
    if (chunk.length < PAGE_SIZE) break
  }
  console.log(`Total products: ${allProducts.length}`)

  const needsEan = allProducts.filter(p => {
    if (!p.ean) return true
    if (p.ean.startsWith('arbuz_') || p.ean.startsWith('kaspi_') || p.ean.startsWith('korzinavdom_')) return true
    const bc = classifyBarcode(p.ean)
    return !bc.valid
  }).filter(p => p.brand && p.brand.length > 1 && p.brand !== '?')
    .filter(p => {
      if (!p.alternate_eans || p.alternate_eans.length === 0) return true
      const hasValidEan = p.alternate_eans.some(e => { const c = classifyBarcode(e); return c.valid })
      return !hasValidEan
    })

  const withExistingGtin = allProducts.filter(p => {
    if (!p.ean) return false
    if (!p.ean.startsWith('arbuz_') && !p.ean.startsWith('kaspi_') && !p.ean.startsWith('korzinavdom_')) return false
    const bc = classifyBarcode(p.ean)
    if (bc.valid) return false
    return p.alternate_eans && p.alternate_eans.some(e => { const c = classifyBarcode(e); return c.valid })
  }).filter(p => p.brand && p.brand.length > 1 && p.brand !== '?')

  console.log(`Need EAN enrichment (with brand): ${needsEan.length} (+ ${withExistingGtin.length} already have GTIN in alt, skipped)`)

  const sliced = opts.skip > 0 ? needsEan.slice(opts.skip) : needsEan
  const toProcess = opts.limit > 0 ? sliced.slice(0, opts.limit) : sliced
  console.log(`Will process: ${toProcess.length} (skip=${opts.skip})`)
  if (toProcess.length === 0) { console.log('Nothing to do'); return }

  let totalGtins = 0, totalNtins = 0, totalAlternateAdded = 0, primarySet = 0, productsUpdated = 0, noMatch = 0
  const t0 = Date.now()

  // Batch DB reads for duplicate EAN checking (10 at a time)
  const BATCH_CHECK = 10

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i]
    const label = `[${i + 1}/${toProcess.length}] ${p.brand.substring(0, 15)} — ${(p.name || '').substring(0, 25)}`

    const queries = buildQueries(p)

    // PARALLEL queries — Method D winner
    let allItems = []
    try {
      const results = await Promise.all(queries.map(q => npcSearch(q.query, SEARCH_SIZE)))
      for (const r of results) {
        if (r.items) allItems = allItems.concat(r.items)
      }
    } catch (e) {
      console.log(`${label} ✗ error: ${e.message}`)
      continue
    }

    // Score and collect matches
    const allMatchedItems = new Map()
    for (const item of allItems) {
      const score = scoreMatch(item, p.name, p.brand)
      if (score >= MIN_SCORE) {
        if (!allMatchedItems.has(item.id) || allMatchedItems.get(item.id).bestScore < score) {
          allMatchedItems.set(item.id, { item, bestScore: score })
        }
      }
    }

    if (allMatchedItems.size === 0) {
      noMatch++
      console.log(`${label} ✗`)
      continue
    }

    const gtins = [], ntins = [], seenEans = new Set()
    for (const [, { item, bestScore }] of allMatchedItems) {
      const eanInfo = extractEan(item)
      if (eanInfo && !seenEans.has(eanInfo.ean)) {
        seenEans.add(eanInfo.ean)
        if (eanInfo.type === 'gtin') gtins.push({ ean: eanInfo.ean, score: bestScore })
        else ntins.push({ ean: eanInfo.ean, score: bestScore })
      }
    }

    gtins.sort((a, b) => b.score - a.score)
    ntins.sort((a, b) => b.score - a.score)
    totalGtins += gtins.length
    totalNtins += ntins.length

    if (gtins.length === 0 && ntins.length === 0) {
      noMatch++
      console.log(`${label} ✗ no EANs`)
      continue
    }

    const existingAlternate = p.alternate_eans || []
    let primaryEan = null
    const newAlternates = []

    const hasRealEan = p.ean && !p.ean.startsWith('arbuz_') && !p.ean.startsWith('kaspi_') && !p.ean.startsWith('korzinavdom_') && classifyBarcode(p.ean).valid

    if (gtins.length > 0 && !hasRealEan) {
      primaryEan = gtins[0].ean
      primarySet++
    }

    for (const g of gtins) {
      if (g.ean !== primaryEan && !existingAlternate.includes(g.ean)) newAlternates.push(g.ean)
    }
    for (const n of ntins) {
      if (!existingAlternate.includes(n.ean)) newAlternates.push(n.ean)
    }

    const mergedAlternates = [...new Set([...existingAlternate, ...newAlternates])]
    totalAlternateAdded += newAlternates.length

    console.log(`${label} ✓ g:${gtins.length} n:${ntins.length} alt:+${newAlternates.length}${primaryEan ? ` ←${primaryEan}` : ''}`)

    if (!opts.dryRun) {
      const updates = {
        alternate_eans: mergedAlternates,
        source_primary: 'npc',
        source_confidence: gtins[0]?.score || ntins[0]?.score || 0,
        updated_at: new Date().toISOString(),
      }

      if (primaryEan) {
        const { data: existing } = await sb.from('global_products').select('id').eq('ean', primaryEan).limit(1)
        if (existing && existing.length > 0 && existing[0].id !== p.id) {
          if (!mergedAlternates.includes(primaryEan)) mergedAlternates.push(primaryEan)
          updates.alternate_eans = mergedAlternates
          const nextGtin = gtins.find(g => g.ean !== primaryEan)
          if (nextGtin) {
            const { data: ex2 } = await sb.from('global_products').select('id').eq('ean', nextGtin.ean).limit(1)
            if (!ex2 || ex2.length === 0) updates.ean = nextGtin.ean
          }
        } else {
          updates.ean = primaryEan
        }
      }

      const { error: updateErr } = await sb.from('global_products').update(updates).eq('id', p.id)
      if (updateErr) console.log(`    ⚠ DB: ${updateErr.message}`)
      else productsUpdated++
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\n========== FINAL SUMMARY ==========`)
  console.log(`Processed: ${toProcess.length}`)
  console.log(`Products updated: ${productsUpdated}`)
  console.log(`No match: ${noMatch}`)
  console.log(`Primary EANs set: ${primarySet}`)
  console.log(`Total GTINs: ${totalGtins}, NTINs: ${totalNtins}`)
  console.log(`Alternate EANs added: ${totalAlternateAdded}`)
  console.log(`Avg EANs/product: ${((totalGtins + totalNtins) / Math.max(productsUpdated, 1)).toFixed(1)}`)
  const msPer = ((Date.now() - t0) / toProcess.length).toFixed(0)
  console.log(`Time: ${elapsed}s (${msPer}ms/product)`)
  if (opts.dryRun) console.log('(DRY RUN — no changes written)')
}

main().catch(e => { console.error(e); process.exit(1) })
