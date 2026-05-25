const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const DRY_RUN = process.argv.includes('--dry-run')

// Known halal brands (manually verified from official sources)
const KNOWN_HALAL_BRANDS = [
  // KZ confectionery
  'Bayan Sulu', 'Баян Сулу', 'Bayansulu',
  'Rakhat', 'Рахат',
  // KZ meat/dairy
  'Veles Lactis', 'Велес Лактис',
  'Hawa Chicken', 'Хауа Чикен',
  // International
  'Al Halal', 'Аль Халал',
  'Et Bayram', 'Эт Байрам',
]

function normalizeForMatching(str) {
  return str.toLowerCase()
    .replace(/[""«»]/g, '')
    .replace(/[™®]/g, '')
    .replace(/[^a-zа-яё0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractKeywords(str) {
  const cleaned = normalizeForMatching(str)
  return cleaned.split(/\s+/).filter(w => w.length > 2)
}

async function main() {
  console.log('=== Halal Brand Cross-Reference (AHIK + HalalDamu) ===\n')

  // --- Load company registries ---
  const halalDamu = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'data', 'halaldamu-registry-certified.json'), 'utf8'
  ))
  let ahik
  try {
    ahik = JSON.parse(fs.readFileSync(
      path.join(__dirname, '..', 'data', 'ahik-registry-enterprises.json'), 'utf8'
    ))
  } catch { ahik = [] }

  console.log(`HalalDamu companies: ${[...new Set(halalDamu.map(c => c.name))].length}`)
  console.log(`AHIK enterprises: ${[...new Set(ahik.map(c => c.name))].length}`)

  // Merge all company names
  const allNames = new Set()
  const mergedCompanies = []

  for (const c of halalDamu) {
    const key = c.name.toLowerCase().trim()
    if (!allNames.has(key)) {
      allNames.add(key)
      mergedCompanies.push({ name: c.name, category: c.category, source: 'halalDamu' })
    }
  }
  for (const c of ahik) {
    const key = c.name.toLowerCase().trim()
    if (!allNames.has(key)) {
      allNames.add(key)
      mergedCompanies.push({ name: c.name, category: c.category, source: 'ahik' })
    }
  }

  console.log(`Unique companies total: ${mergedCompanies.length}\n`)

  // Build keyword index
  const companyIndex = mergedCompanies.map(c => ({
    name: c.name,
    category: c.category,
    source: c.source,
    keywords: extractKeywords(c.name),
  })).filter(c => c.keywords.length > 0)

  // --- Method 1: Known halal brand whitelist ---
  console.log('=== Method 1: Known halal brand whitelist ===')
  const brandNormals = KNOWN_HALAL_BRANDS.map(b => normalizeForMatching(b))

  const { data: allProducts } = await sb
    .from('global_products')
    .select('ean, name, brand, halal_status, category')
    .neq('halal_status', 'yes')
    .limit(12000)

  if (!allProducts || allProducts.length === 0) {
    console.log('No products to check')
    return
  }
  console.log(`Products to check: ${allProducts.length}`)

  const brandMatches = []
  for (const p of allProducts) {
    if (!p.brand) continue
    const brandNorm = normalizeForMatching(p.brand)
    for (const knownBrand of brandNormals) {
      if (brandNorm.includes(knownBrand)) {
        brandMatches.push({
          ean: p.ean,
          name: p.name,
          brand: p.brand,
          matchedBrand: knownBrand,
          matchType: 'known_brand_whitelist',
        })
        break
      }
    }
  }

  console.log(`Known brand matches: ${brandMatches.length}`)
  for (const m of brandMatches.slice(0, 20)) {
    console.log(`  [${m.matchedBrand}] ${m.brand} → ${m.name.slice(0, 60)}`)
  }

  // --- Method 2: Company keyword matching with scoring ---
  console.log('\n=== Method 2: Company keyword matching ===')
  // Only check products not already matched by Method 1
  const matchedEans = new Set(brandMatches.map(m => m.ean))
  const remaining = allProducts.filter(p => !matchedEans.has(p.ean))

  const companyMatches = []
  for (const p of remaining) {
    const searchText = normalizeForMatching([p.name, p.brand].filter(Boolean).join(' '))
    const searchWords = searchText.split(/\s+/).filter(w => w.length > 2)

    if (searchWords.length === 0) continue

    let bestScore = 0
    let bestMatch = null

    for (const ci of companyIndex) {
      let score = 0
      for (const sw of searchWords) {
        for (const kw of ci.keywords) {
          if (sw === kw) score += 3
          else if (sw.includes(kw) || kw.includes(sw)) score += 1
          else if (sw.length > 4 && kw.length > 4 && (sw.startsWith(kw) || kw.startsWith(sw))) score += 2
        }
      }
      // Normalize by name length to avoid long names winning
      score = score / Math.max(1, ci.keywords.length)

      if (score > bestScore) {
        bestScore = score
        bestMatch = ci
      }
    }

    if (bestScore >= 1.5 && bestMatch) {
      companyMatches.push({
        ean: p.ean,
        name: p.name,
        brand: p.brand,
        matchedCompany: bestMatch.name,
        companyCategory: bestMatch.category,
        score: bestScore,
        source: bestMatch.source,
        matchType: 'company_keyword',
      })
    }
  }

  companyMatches.sort((a, b) => b.score - a.score)
  console.log(`Company keyword matches (score >= 1.5): ${companyMatches.length}`)
  console.log('\nTop matches:')
  for (const m of companyMatches.slice(0, 30)) {
    console.log(`  [${m.score.toFixed(1)}] ${m.brand || '?'} <-> ${m.matchedCompany.slice(0, 50)} | ${m.name.slice(0, 50)}`)
  }

  // Combine all matches
  const allMatches = [...brandMatches, ...companyMatches]
  console.log(`\nTotal matches: ${allMatches.length}`)

  // Save report
  const reportPath = path.join(__dirname, '..', 'data', 'halal-brand-matches-v3.json')
  fs.writeFileSync(reportPath, JSON.stringify(allMatches, null, 2))
  console.log(`Report saved to ${reportPath}`)

  // Apply to DB if not dry-run
  if (!DRY_RUN) {
    // Only apply known brand matches (Method 1 — high confidence)
    const brandEans = brandMatches.map(m => m.ean)
    if (brandEans.length > 0) {
      console.log(`\nUpdating ${brandEans.length} known brand matches to halal_status = yes...`)
      const { error } = await sb.from('global_products').update({ halal_status: 'yes' }).in('ean', brandEans)
      if (error) console.error('Update error:', error)
      else console.log('✅ Known brands updated')
    }

    // For company matches, only apply high-confidence (score >= 3.0)
    const highConf = companyMatches.filter(m => m.score >= 3.0)
    const highConfEans = highConf.map(m => m.ean)
    if (highConfEans.length > 0) {
      console.log(`\nUpdating ${highConfEans.length} high-confidence company matches (score >= 3.0)...`)
      const { error } = await sb.from('global_products').update({ halal_status: 'yes' }).in('ean', highConfEans)
      if (error) console.error('Update error:', error)
      else console.log('✅ High-confidence matches updated')
    }
  } else {
    console.log('\nDRY RUN — no updates made to DB')
    console.log(`  Would update ${brandMatches.length} known brands`)
    console.log(`  Would update ${companyMatches.filter(m => m.score >= 3.0).length} high-confidence company matches`)
  }

  // Stats
  const { count: total } = await sb.from('global_products').select('*', { count: 'exact', head: true })
  const { count: yes } = await sb.from('global_products').select('*', { count: 'exact', head: true }).eq('halal_status', 'yes')
  console.log(`\n=== NEW STATS ===`)
  console.log(`Total:  ${total}`)
  console.log(`yes:    ${yes} (${(yes/total*100).toFixed(1)}%)`)
  console.log(`unknown: ${total - yes} (${((total-yes)/total*100).toFixed(1)}%)`)
}

main().catch(console.error)
