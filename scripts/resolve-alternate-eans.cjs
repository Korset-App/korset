const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')
const { classifyBarcode } = require('./validate-ean.cjs')
const { assertLegacyEanScriptDryRunOnly } = require('./legacy-ean-script-guard.cjs')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const DRY_RUN = process.argv.includes('--dry-run')

function isScannableGtin(ean, info) {
  if (!info.valid) return false
  const prefix = ean.substring(0, 3)
  if (prefix >= '020' && prefix <= '029') return false
  if (prefix >= '040' && prefix <= '049') return false
  if (prefix >= '200' && prefix <= '299') return false
  return true
}

async function main() {
  assertLegacyEanScriptDryRunOnly({ scriptName: 'resolve-alternate-eans.cjs' })
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  console.log('═══════════════════════════════════════════')
  console.log('  RESOLVER v2: alternate_eans → primary ean')
  console.log('  Handles duplicates: deactivate when EAN exists')
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

  const total = all.length
  const fakePrefixes = ['arbuz_', 'kaspi_', 'korzinavdom_']

  const realProducts = all.filter(p => !p.ean || !fakePrefixes.some(pre => p.ean.startsWith(pre)))
  const fakeProducts = all.filter(p => p.ean && fakePrefixes.some(pre => p.ean.startsWith(pre)))

  const realEanSet = new Set(realProducts.map(p => p.ean))
  const realByEan = {}
  realProducts.forEach(p => { realByEan[p.ean] = p })

  const fakeWithAlt = fakeProducts.filter(p => p.alternate_eans && p.alternate_eans.length > 0)
  const fakeNoAlt = fakeProducts.filter(p => !p.alternate_eans || p.alternate_eans.length === 0)

  console.log('Total:', total)
  console.log('Real EAN:', realProducts.length)
  console.log('Fake EAN:', fakeProducts.length)
  console.log('  Fake + has alt:', fakeWithAlt.length)
  console.log('  Fake + no alt:', fakeNoAlt.length)
  console.log()

  const skippedRestricted = []
  const candidates = []

  for (const p of fakeWithAlt) {
    const allGtins = (p.alternate_eans || [])
      .map(e => ({ ean: e, ...classifyBarcode(e) }))
      .filter(r => isScannableGtin(r.ean, r))

    if (allGtins.length === 0) {
      const hasRestricted = (p.alternate_eans || [])
        .map(e => ({ ean: e, ...classifyBarcode(e) }))
        .filter(r => r.valid && !isScannableGtin(r.ean, r))
      if (hasRestricted.length > 0) skippedRestricted.push(p)
      continue
    }

    const bestUnique = allGtins.find(g => !realEanSet.has(g.ean))
    const bestExisting = allGtins.find(g => realEanSet.has(g.ean))

    candidates.push({
      id: p.id,
      old_ean: p.ean,
      name: p.name,
      brand: p.brand,
      source: p.source_primary,
      ingredients_raw: p.ingredients_raw,
      new_ean: bestUnique ? bestUnique.ean : null,
      new_country: bestUnique ? bestUnique.country : null,
      is_dup_of_real: !bestUnique && !!bestExisting,
      dup_ean: bestExisting ? bestExisting.ean : null,
    })
  }

  const newEanCounts = {}
  candidates.forEach(c => { if (c.new_ean) newEanCounts[c.new_ean] = (newEanCounts[c.new_ean] || 0) + 1 })

  const toUpdate = []
  const toDeactivate = []

  for (const c of candidates) {
    if (c.new_ean && newEanCounts[c.new_ean] === 1) {
      toUpdate.push(c)
    } else if (c.is_dup_of_real) {
      const existingP = realByEan[c.dup_ean]
      const fakeHasData = c.ingredients_raw && String(c.ingredients_raw).trim().length > 3
      const realHasData = existingP && existingP.ingredients_raw && String(existingP.ingredients_raw).trim().length > 3
      toDeactivate.push({ ...c, fake_has_ingredients: fakeHasData, real_has_ingredients: realHasData, needs_merge: fakeHasData && !realHasData })
    } else if (c.new_ean && newEanCounts[c.new_ean] > 1) {
      toDeactivate.push({ ...c, dup_ean: c.new_ean, is_dup_of_real: false, fake_has_ingredients: false, real_has_ingredients: false, needs_merge: false })
    }
  }

  const needsMerge = toDeactivate.filter(d => d.needs_merge)

  console.log('── ПЛАН ──')
  console.log('Обновить EAN (уникальный GTIN):', toUpdate.length)
  console.log('Деактивировать (дубль существующего):', toDeactivate.length)
  console.log('  Из них нужно мердж состав:', needsMerge.length)
  console.log('Пропущено — restricted 0200-0299:', skippedRestricted.length)
  console.log('Пропущено — нет сканируемого GTIN:', fakeWithAlt.length - toUpdate.length - toDeactivate.length - skippedRestricted.length)
  console.log()

  if (DRY_RUN) {
    console.log('── TO UPDATE (first 15) ──')
    toUpdate.slice(0, 15).forEach(u => {
      console.log(u.old_ean + ' → ' + u.new_ean + ' (' + (u.new_country || '?') + ') ' + (u.brand || '?') + ' | ' + (u.name || '').substring(0, 40))
    })
    console.log()
    console.log('── TO DEACTIVATE (first 15) ──')
    toDeactivate.slice(0, 15).forEach(d => {
      const flag = d.needs_merge ? ' ⚠️ NEEDS MERGE' : ''
      console.log(d.old_ean + ' = dup of ' + (d.dup_ean || '?') + ' | ' + (d.brand || '?') + ' | ' + (d.name || '').substring(0, 35) + flag)
    })
    console.log()
    console.log('Dry run. Remove --dry-run to apply.')
    return
  }

  console.log('Step 1: Merging ingredients from fake→real for', needsMerge.length, 'products...')
  for (const d of needsMerge) {
    const fakeP = fakeWithAlt.find(p => p.id === d.id)
    const realP = realByEan[d.dup_ean]
    if (fakeP && realP) {
      const { error } = await sb
        .from('global_products')
        .update({ ingredients_raw: fakeP.ingredients_raw })
        .eq('id', realP.id)
      if (error) console.log('  MERGE ERR:', d.dup_ean, error.message)
    }
  }

  console.log('Step 2: Updating EAN for', toUpdate.length, 'products...')
  let updated = 0
  for (const u of toUpdate) {
    const { error } = await sb
      .from('global_products')
      .update({ ean: u.new_ean })
      .eq('id', u.id)
    if (error) {
      console.log('  UPDATE ERR:', u.old_ean, '→', u.new_ean, error.message)
    } else {
      updated++
    }
    if (updated % 100 === 0) process.stdout.write('\r  Updated: ' + updated + '/' + toUpdate.length)
  }
  console.log('\r  Updated: ' + updated + '/' + toUpdate.length + '  ')

  console.log('Step 3: Deactivating', toDeactivate.length, 'duplicate products...')
  let deactivated = 0
  const BATCH = 50
  for (let i = 0; i < toDeactivate.length; i += BATCH) {
    const batch = toDeactivate.slice(i, i + BATCH)
    const ids = batch.map(d => d.id)
    const { error } = await sb
      .from('global_products')
      .update({ is_active: false })
      .in('id', ids)
    if (error) {
      console.log('  DEACTIVATE ERR:', error.message)
    } else {
      deactivated += ids.length
    }
    process.stdout.write('\r  Deactivated: ' + deactivated + '/' + toDeactivate.length)
  }
  console.log('\r  Deactivated: ' + deactivated + '/' + toDeactivate.length + '  ')

  console.log()
  console.log('═══════════════════════════════════════')
  console.log('  FINAL RESULT')
  console.log('═══════════════════════════════════════')
  console.log('EAN updated:', updated)
  console.log('Duplicates deactivated:', deactivated)
  console.log('Ingredients merged:', needsMerge.length)

  const { count: finalReal } = await sb
    .from('global_products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('ean', 'like', 'arbuz_%')
    .not('ean', 'like', 'kaspi_%')
    .not('ean', 'like', 'korzinavdom_%')

  const { count: finalTotal } = await sb
    .from('global_products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  console.log('Active products with real EAN:', finalReal)
  console.log('Total active products:', finalTotal)
  console.log('Coverage:', (finalReal / finalTotal * 100).toFixed(1) + '%')
}

main().catch(e => { console.error(e); process.exit(1) })
