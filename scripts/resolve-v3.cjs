const path = require('path')
const https = require('https')
const { URL } = require('url')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')
const { classifyBarcode } = require('./validate-ean.cjs')
const { assertLegacyEanScriptDryRunOnly } = require('./legacy-ean-script-guard.cjs')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const NPC_API_KEY = process.env.NPC_API_KEY
const DRY_RUN = process.argv.includes('--dry-run')

function httpPost(urlStr, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const url = new URL(urlStr)
    const options = {
      hostname: url.hostname, port: 443,
      path: url.pathname, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-API-KEY': NPC_API_KEY,
      },
    }
    const req = https.request(options, res => {
      let b = ''
      res.on('data', c => b += c)
      res.on('end', () => { try { resolve(JSON.parse(b)) } catch { resolve(null) } })
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); resolve(null) })
    req.write(data)
    req.end()
  })
}

function isKzScannable(ean) {
  const info = classifyBarcode(ean)
  if (!info.valid) return false
  const pre = ean.substring(0, 3)
  if (pre >= '020' && pre <= '029') return false
  if (pre >= '040' && pre <= '049') return false
  return true
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function similarity(a, b) {
  if (!a || !b) return 0
  a = a.toLowerCase().replace(/[^\wа-яё]/gi, '')
  b = b.toLowerCase().replace(/[^\wа-яё]/gi, '')
  if (a === b) return 1
  const words = a.split(/\s+/).filter(w => w.length > 2)
  if (words.length === 0) return 0
  let matched = 0
  for (const w of words) { if (b.includes(w)) matched++ }
  return matched / words.length
}

async function main() {
  assertLegacyEanScriptDryRunOnly({ scriptName: 'resolve-v3.cjs' })
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  console.log('═══════════════════════════════════════════')
  console.log('  RESOLVER v3: KZ-aware + NPC name search')
  console.log('  Mode:', DRY_RUN ? 'DRY RUN' : 'LIVE')
  console.log('═══════════════════════════════════════════')
  console.log()

  const all = []
  for (let page = 0; page < 20; page++) {
    const { data: ch } = await sb
      .from('global_products')
      .select('id, ean, name, brand, alternate_eans, source_primary, ingredients_raw')
      .eq('is_active', true)
      .order('id')
      .range(page * 999, (page + 1) * 999 - 1)
    if (!ch || !ch.length) break
    all.push(...ch)
    if (ch.length < 999) break
  }

  const fakePrefixes = ['arbuz_', 'kaspi_', 'korzinavdom_']
  const realProducts = all.filter(p => !p.ean || !fakePrefixes.some(pre => p.ean.startsWith(pre)))
  const fakeProducts = all.filter(p => p.ean && fakePrefixes.some(pre => p.ean.startsWith(pre)))

  const realEanSet = new Set(realProducts.map(p => p.ean))
  const realByEan = {}
  realProducts.forEach(p => { realByEan[p.ean] = p })

  const fakeWithAlt = fakeProducts.filter(p => p.alternate_eans && p.alternate_eans.length > 0)
  const fakeNoAlt = fakeProducts.filter(p => !p.alternate_eans || p.alternate_eans.length === 0)

  console.log('Total active:', all.length)
  console.log('Real EAN:', realProducts.length)
  console.log('Fake EAN:', fakeProducts.length)
  console.log('  With alternate_eans:', fakeWithAlt.length)
  console.log('  Without alternate_eans:', fakeNoAlt.length)
  console.log()

  // ═══════════════════════════════════
  // PHASE 1: Promote alternate_eans
  // ═══════════════════════════════════
  console.log('── PHASE 1: Promote alternate_eans (KZ-aware) ──')

  const allAltEans = {}
  fakeWithAlt.forEach(p => {
    ;(p.alternate_eans || []).forEach(ean => {
      if (isKzScannable(ean)) {
        if (!allAltEans[ean]) allAltEans[ean] = []
        allAltEans[ean].push(p.id)
      }
    })
  })

  const uniqueAltEans = new Set()
  const sharedAltEans = new Set()
  for (const [ean, pids] of Object.entries(allAltEans)) {
    if (pids.length === 1) uniqueAltEans.add(ean)
    else sharedAltEans.add(ean)
  }
  console.log('Unique alt EANs:', uniqueAltEans.size)
  console.log('Shared alt EANs (skipped):', sharedAltEans.size)

  const toUpdate = []
  const toDeactivate = []

  for (const p of fakeWithAlt) {
    const alts = (p.alternate_eans || [])
      .map(ean => ({ ean, ...classifyBarcode(ean) }))
      .filter(r => isKzScannable(r.ean))

    if (alts.length === 0) continue

    const bestUnique = alts.find(g => uniqueAltEans.has(g.ean) && !realEanSet.has(g.ean))
    const bestExisting = alts.find(g => realEanSet.has(g.ean))

    if (bestUnique) {
      toUpdate.push({
        id: p.id, old_ean: p.ean, new_ean: bestUnique.ean,
        name: p.name, brand: p.brand, ingredients_raw: p.ingredients_raw,
      })
    } else if (bestExisting) {
      const existingP = realByEan[bestExisting.ean]
      const fakeHasData = p.ingredients_raw && String(p.ingredients_raw).trim().length > 3
      const realHasData = existingP && existingP.ingredients_raw && String(existingP.ingredients_raw).trim().length > 3
      toDeactivate.push({
        id: p.id, old_ean: p.ean, dup_ean: bestExisting.ean,
        name: p.name, brand: p.brand,
        needs_merge: fakeHasData && !realHasData,
        fake_ingredients: fakeHasData ? p.ingredients_raw : null,
        real_product_id: existingP ? existingP.id : null,
      })
    }
  }

  const newEanCounts = {}
  toUpdate.forEach(c => { newEanCounts[c.new_ean] = (newEanCounts[c.new_ean] || 0) + 1 })

  const finalUpdate = toUpdate.filter(c => newEanCounts[c.new_ean] === 1)
  const dupUpdate = toUpdate.filter(c => newEanCounts[c.new_ean] > 1)
  dupUpdate.forEach(c => {
    toDeactivate.push({
      id: c.id, old_ean: c.old_ean, dup_ean: c.new_ean,
      name: c.name, brand: c.brand, needs_merge: false,
    })
  })

  console.log('Promote (unique KZ GTIN):', finalUpdate.length)
  console.log('Deactivate (dup existing):', toDeactivate.length)
  console.log('  Needs ingredient merge:', toDeactivate.filter(d => d.needs_merge).length)
  console.log('')

  if (finalUpdate.length > 0) {
    console.log('── Sample promotions ──')
    finalUpdate.slice(0, 15).forEach(u => {
      console.log('  ' + u.old_ean + ' → ' + u.new_ean + ' | ' + (u.brand || '?') + ' | ' + (u.name || '').substring(0, 40))
    })
    console.log('')
  }

  if (!DRY_RUN) {
    // Merge ingredients first
    const needsMerge = toDeactivate.filter(d => d.needs_merge)
    for (const d of needsMerge) {
      if (d.real_product_id && d.fake_ingredients) {
        const { error } = await sb.from('global_products')
          .update({ ingredients_raw: d.fake_ingredients })
          .eq('id', d.real_product_id)
        if (error) console.log('  MERGE ERR:', d.dup_ean, error.message)
      }
    }
    console.log('Merged ingredients:', needsMerge.length)

    // Promote EANs
    let updated = 0
    for (const u of finalUpdate) {
      const { error } = await sb.from('global_products')
        .update({ ean: u.new_ean })
        .eq('id', u.id)
      if (error) {
        console.log('  UPDATE ERR:', u.old_ean, '→', u.new_ean, error.message)
      } else {
        updated++
        realEanSet.add(u.new_ean)
      }
    }
    console.log('Promoted EANs:', updated)

    // Deactivate dups
    let deactivated = 0
    const BATCH = 50
    for (let i = 0; i < toDeactivate.length; i += BATCH) {
      const ids = toDeactivate.slice(i, i + BATCH).map(d => d.id)
      const { error } = await sb.from('global_products')
        .update({ is_active: false })
        .in('id', ids)
      if (!error) deactivated += ids.length
    }
    console.log('Deactivated dups:', deactivated)
  }

  // ═══════════════════════════════════
  // PHASE 2: NPC name search for no-alt
  // ═══════════════════════════════════
  console.log('')
  console.log('── PHASE 2: NPC name search (no-alt products) ──')

  const remainingFake = fakeNoAlt.filter(p => p.brand && p.brand.trim().length > 1)
  console.log('No-alt products with brand:', remainingFake.length)

  let npcFound = 0
  let npcApplied = 0
  const npcNotFound = []

  for (let i = 0; i < remainingFake.length; i++) {
    const p = remainingFake[i]
    const queries = [
      (p.brand + ' ' + (p.name || '').substring(0, 40)).replace(/[^\wа-яА-ЯёЁ]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 80),
    ]

    let ean = null

    for (const q of queries) {
      if (ean) break
      try {
        const r = await httpPost('https://nationalcatalog.kz/gw/search/api/v1/search', { query: q, page: 1, size: 10 })
        if (r && r.items && r.items.length > 0) {
          for (const item of r.items) {
            const gtin = item.gtin
            if (gtin && gtin !== '-' && isKzScannable(gtin) && !realEanSet.has(gtin)) {
              const sim = similarity(item.nameRu, p.name + ' ' + p.brand)
              if (sim >= 0.4) {
                ean = gtin
                break
              }
            }
          }
        }
      } catch {}
      await sleep(250)
    }

    if (ean) {
      npcFound++
      if (!DRY_RUN) {
        const { error } = await sb.from('global_products').update({ ean }).eq('id', p.id)
        if (error) {
          if (error.message.includes('duplicate key')) realEanSet.add(ean)
          console.log('  NPC ERR:', p.ean, '→', ean, error.message)
        } else {
          npcApplied++
          realEanSet.add(ean)
        }
      }
    } else {
      npcNotFound.push(p)
    }

    process.stdout.write('\r  [' + (i + 1) + '/' + remainingFake.length + '] Found: ' + npcFound + ' | Applied: ' + npcApplied + ' | Not found: ' + npcNotFound.length + '   ')
  }
  console.log('')
  console.log('NPC name search: Found', npcFound, '| Applied:', npcApplied, '| Not found:', npcNotFound.length)

  // ═══════════════════════════════════
  // PHASE 3: NPC brand-only search for remaining
  // ═══════════════════════════════════
  const brandedNotFound = npcNotFound.filter(p => p.brand && p.brand.trim().length > 1)
  if (brandedNotFound.length > 0) {
    console.log('')
    console.log('── PHASE 3: NPC brand-only search (remaining) ──')
    console.log('Remaining with brand:', brandedNotFound.length)

    let bFound = 0
    let bApplied = 0

    for (let i = 0; i < brandedNotFound.length; i++) {
      const p = brandedNotFound[i]
      const q = p.brand.substring(0, 80)

      let ean = null

      try {
        const r = await httpPost('https://nationalcatalog.kz/gw/search/api/v1/search', { query: q, page: 1, size: 50 })
        if (r && r.items && r.items.length > 0) {
          for (const item of r.items) {
            const gtin = item.gtin
            if (gtin && gtin !== '-' && isKzScannable(gtin) && !realEanSet.has(gtin)) {
              const sim = similarity(item.nameRu, p.name)
              if (sim >= 0.5) {
                ean = gtin
                break
              }
            }
          }
        }
      } catch {}
      await sleep(250)

      if (ean) {
        bFound++
        if (!DRY_RUN) {
          const { error } = await sb.from('global_products').update({ ean }).eq('id', p.id)
          if (error) {
            if (error.message.includes('duplicate key')) realEanSet.add(ean)
            console.log('  BRAND ERR:', p.ean, '→', ean, error.message)
          } else {
            bApplied++
            realEanSet.add(ean)
          }
        }
      }

      process.stdout.write('\r  [' + (i + 1) + '/' + brandedNotFound.length + '] Found: ' + bFound + ' | Applied: ' + bApplied + '   ')
    }
    console.log('')
    console.log('NPC brand search: Found', bFound, '| Applied:', bApplied)
  }

  // ═══════════════════════════════════
  // FINAL STATS
  // ═══════════════════════════════════
  console.log('')
  console.log('═══════════════════════════════════════')
  console.log('  FINAL STATS')
  console.log('═══════════════════════════════════════')

  const { count: finalReal } = await sb.from('global_products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('ean', 'like', 'arbuz_%')
    .not('ean', 'like', 'kaspi_%')
    .not('ean', 'like', 'korzinavdom_%')

  const { count: finalTotal } = await sb.from('global_products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { data: stillFakeList } = await sb.from('global_products')
    .select('ean, name, brand')
    .eq('is_active', true)
    .or('ean.like.arbuz_%,ean.like.kaspi_%,ean.like.korzinavdom_%')

  console.log('Active products:', finalTotal)
  console.log('Real EAN:', finalReal, '(' + (finalReal / finalTotal * 100).toFixed(1) + '%)')
  console.log('Still fake EAN:', stillFakeList.length)

  if (stillFakeList.length > 0 && stillFakeList.length <= 200) {
    console.log('')
    console.log('── REMAINING FAKE EAN ──')
    stillFakeList.forEach(p => console.log('  ' + p.ean + ' | ' + (p.brand || '—') + ' | ' + (p.name || '').substring(0, 40)))
  }
}

main().catch(e => { console.error(e); process.exit(1) })
