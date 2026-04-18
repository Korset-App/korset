const fs = require('fs')
const path = require('path')
const https = require('https')
const { URL } = require('url')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')
const { classifyBarcode } = require('./validate-ean.cjs')

const NPC_API_KEY = process.env.NPC_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const DELAY_MS = 350
const OUT_DIR = path.join(__dirname, '..', 'data', 'npc-enrich')

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function httpPost(urlStr, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const url = new URL(urlStr)
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
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
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) })
        } catch (_) {
          resolve({ status: res.statusCode, body: body.substring(0, 500) })
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.write(data)
    req.end()
  })
}

async function npcSearch(query, size = 5) {
  const r = await httpPost('https://nationalcatalog.kz/gw/search/api/v1/search', { query, page: 1, size })
  if (r.status !== 200) return { error: `HTTP ${r.status}`, items: [] }
  return { total: r.body.pageInfo?.totalSize || 0, items: r.body.items || [] }
}

function matchScore(item, productName, productBrand) {
  let score = 0
  const nameRu = (item.nameRu || '').toLowerCase()
  const pName = productName.toLowerCase()
  const pBrand = (productBrand || '').toLowerCase()

  if (nameRu.includes(pBrand)) score += 10
  if (pName.includes(pBrand)) score += 5

  const nameWords = pName.split(/\s+/).filter(w => w.length > 2)
  for (const w of nameWords) {
    if (nameRu.includes(w)) score += 3
  }

  const attrs = item.attributes || []
  const brandAttr = attrs.find(a => a.code === 'brand' && a.value)
  if (brandAttr) {
    const bv = (brandAttr.valueRu || brandAttr.value || '').toLowerCase()
    const bk = (productBrand || '').toLowerCase()
    if (bv.includes(bk) || bk.includes(bv)) score += 15
  }

  if (item.gtin) score += 5
  if (item.categoryNameRuL1?.includes('пищев') || item.categoryNameRuL1?.includes('азыт')) score += 3

  return score
}

function parseArgs() {
  const args = process.argv.slice(2)
  const result = { dryRun: false, limit: 0, resume: false }
  for (const arg of args) {
    if (arg === '--dry-run') result.dryRun = true
    else if (arg.startsWith('--limit=')) result.limit = parseInt(arg.split('=')[1], 10)
    else if (arg === '--resume') result.resume = true
  }
  return result
}

async function main() {
  const opts = parseArgs()

  if (!NPC_API_KEY) { console.error('NPC_API_KEY not set in .env.local'); process.exit(1) }
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('SUPABASE_URL/SERVICE_ROLE_KEY not set'); process.exit(1) }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  const { data: products, error } = await sb
    .from('global_products')
    .select('id, ean, name, brand, country_of_origin')
    .eq('is_active', true)
    .order('id')

  if (error) { console.error('DB error:', error); process.exit(1) }
  console.log(`Total products: ${products.length}`)

  const needsEan = products.filter(p => {
    if (!p.ean) return true
    if (p.ean.startsWith('kaspi_')) return true
    const bc = classifyBarcode(p.ean)
    return !bc.valid
  })

  console.log(`Need EAN enrichment: ${needsEan.length}`)
  const toProcess = opts.limit > 0 ? needsEan.slice(0, opts.limit) : needsEan
  console.log(`Will process: ${toProcess.length}`)

  if (toProcess.length === 0) { console.log('Nothing to do'); return }

  let enriched = 0, gtinFound = 0, ntinFound = 0, noMatch = 0
  const results = []

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i]
    const label = `[${i + 1}/${toProcess.length}] #${p.id} ${p.brand || '?'} — ${(p.name || '').substring(0, 30)}`
    process.stdout.write(`${label}... `)

    const query = `${p.brand || ''} ${p.name || ''}`.trim().substring(0, 80)
    try {
      const r = await npcSearch(query, 5)
      if (r.error) {
        console.log(`✗ API error: ${r.error}`)
        results.push({ id: p.id, error: r.error })
        await sleep(DELAY_MS)
        continue
      }

      const items = r.items || []
      if (items.length === 0) {
        console.log(`✗ no results`)
        noMatch++
        results.push({ id: p.id, ean: p.ean, query, npcTotal: 0, match: null })
        await sleep(DELAY_MS)
        continue
      }

      const scored = items.map(item => ({ item, score: matchScore(item, p.name, p.brand) }))
        .sort((a, b) => b.score - a.score)
      const best = scored[0]

      if (best.score < 5) {
        console.log(`✗ best score ${best.score} too low`)
        noMatch++
        results.push({ id: p.id, ean: p.ean, query, npcTotal: r.total, match: null, bestScore: best.score })
        await sleep(DELAY_MS)
        continue
      }

      const item = best.item
      const gtin = item.gtin || null
      const ntin = item.ntin || null

      enriched++
      if (gtin) gtinFound++
      if (ntin) ntinFound++

      const attrs = {}
      for (const a of (item.attributes || [])) {
        if (a.value) attrs[a.code] = { nameRu: a.nameRu, value: a.value, valueRu: a.valueRu }
      }

      const eanValid = gtin ? classifyBarcode(gtin) : null

      console.log(`✓ score:${best.score} GTIN:${gtin || '-'} NTIN:${ntin || '-'} cat:${(item.categoryNameRuL4 || item.categoryNameRuL3 || '').substring(0, 25)}`)

      const matchData = {
        id: p.id,
        oldEan: p.ean,
        query,
        npcTotal: r.total,
        matchScore: best.score,
        npcId: item.id,
        gtin,
        ntin,
        nameRu: item.nameRu,
        nameKk: item.nameKk,
        fullCategoryCode: item.fullCategoryCode,
        categoryNameRuL1: item.categoryNameRuL1,
        categoryNameRuL4: item.categoryNameRuL4,
        gtinValid: eanValid?.valid || false,
        gtinCountry: eanValid?.country || null,
        attrs,
      }
      results.push(matchData)

      if (!opts.dryRun && gtin && eanValid?.valid) {
        const updates = {
          ean: gtin,
          name: item.nameRu || p.name,
          name_kz: item.nameKk || null,
          country_of_origin: attrs.country?.valueRu || attrs.producer_country?.valueRu || p.country_of_origin,
          manufacturer: attrs.a4282e5d?.valueRu || attrs.a4282e5d?.value || p.manufacturer,
          source_primary: 'kz_verified',
          source_confidence: Math.min(best.score, 100),
          is_verified: best.score >= 15,
          updated_at: new Date().toISOString(),
        }
        if (ntin) updates.alternate_eans = [...(p.alternate_eans || []), ntin]

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
  console.log(`Matched: ${enriched}/${toProcess.length} (${(enriched / toProcess.length * 100).toFixed(0)}%)`)
  console.log(`GTIN found: ${gtinFound}`)
  console.log(`NTIN found: ${ntinFound}`)
  console.log(`No match: ${noMatch}`)

  const outFile = path.join(OUT_DIR, `npc-enrich-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(outFile, JSON.stringify({ testedAt: new Date().toISOString(), stats: { processed: toProcess.length, matched: enriched, gtinFound, ntinFound, noMatch }, results }, null, 2))
  console.log(`Saved: ${outFile}`)
}

main().catch(e => { console.error(e); process.exit(1) })
