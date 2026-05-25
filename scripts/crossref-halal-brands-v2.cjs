const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// Extract meaningful keywords from company name for matching
function extractKeywords(name) {
  // Remove legal suffixes and common Kazakh/Russian business words
  const cleaned = name
    .replace(/«|»|"|"|\(|\)|\.|,|-/g, ' ')
    .replace(/тoo|тоо|ао|ип|ооо|too|ooo|llc|ltd|тм|тм/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  // Stop words to filter out
  const stopWords = new Set([
    'и', 'в', 'на', 'с', 'со', 'по', 'для', 'от', 'о', 'об', 'к', 'у', 'за',
    'the', 'and', 'for', 'with', 'from',
    'food', 'produkt', 'product', 'production', 'foods',
    'торговая', 'марка', 'компания', 'фирма', 'цех', 'shop',
    'ltd', 'llc', 'ooo', 'too',
  ])

  return cleaned.split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
}

// Direct lookup of products by brand matching known halal companies
async function main() {
  console.log('=== Direct brand-to-halal-company matching ===\n')

  const certified = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'data', 'halaldamu-registry-certified.json'), 'utf8'
  ))

  // Build keyword index for each company (category matters)
  const companyIndex = []
  for (const c of [...new Map(certified.map(x => [x.name, x])).values()]) {
    const keywords = extractKeywords(c.name)
    if (keywords.length > 0) {
      companyIndex.push({
        name: c.name,
        category: c.category,
        keywords,
      })
    }
  }

  console.log(`Company keywords indexed: ${companyIndex.length}\n`)

  // Get all brands from products (excluding already-marked halal)
  const { data: products } = await sb
    .from('global_products')
    .select('ean, name, brand, halal_status')
    .neq('halal_status', 'yes')
    .limit(5000)

  if (!products) {
    console.error('No products fetched')
    return
  }

  console.log(`Products to check: ${products.length}\n`)

  // For each product brand, try to find a matching halal company
  const updates = [] // { ean, name, brand, matchedCompany, matchType }

  for (const p of products) {
    if (!p.brand) continue

    const brandLower = p.brand.toLowerCase().trim()
    const brandKeywords = brandLower.split(/\s+/).filter(w => w.length > 2)

    for (const ci of companyIndex) {
      // Check if company keywords contain ALL brand keywords
      const brandWordsMatch = brandKeywords.every(bw =>
        ci.keywords.some(kw => kw.includes(bw) || bw.includes(kw))
      )

      if (brandWordsMatch && brandKeywords.length > 0) {
        updates.push({
          ean: p.ean,
          name: p.name,
          brand: p.brand,
          matchedCompany: ci.name,
          companyCategory: ci.category,
        })
        break
      }
    }
  }

  // Also check product names directly for company keywords
  const nameUpdates = []
  for (const p of products) {
    if (updates.some(u => u.ean === p.ean)) continue
    if (!p.name) continue

    const nameLower = p.name.toLowerCase()

    for (const ci of companyIndex) {
      for (const kw of ci.keywords) {
        if (kw.length > 3 && nameLower.includes(kw)) {
          nameUpdates.push({
            ean: p.ean,
            name: p.name,
            brand: p.brand,
            matchedCompany: ci.name,
            companyCategory: ci.category,
            matchedWord: kw,
          })
          break
        }
      }
      if (nameUpdates.some(u => u.ean === p.ean)) break
    }
  }

  // Deduplicate by ean
  const allUpdates = new Map()
  for (const u of [...updates, ...nameUpdates]) {
    if (!allUpdates.has(u.ean) || u.brand) {
      allUpdates.set(u.ean, u)
    }
  }

  console.log(`Brand-based matches: ${updates.length}`)
  console.log(`Name-based matches: ${nameUpdates.length}`)
  console.log(`Total unique: ${allUpdates.size}\n`)

  console.log('--- Brand-based matches ---')
  for (const u of updates.slice(0, 30)) {
    console.log(`  ${u.brand.padEnd(25)} | ${u.matchedCompany.slice(0, 40)} | ${u.name.slice(0, 50)}`)
  }

  console.log(`\n--- Name-based matches (sample) ---`)
  for (const u of nameUpdates.slice(0, 30)) {
    console.log(`  [${u.matchedWord}] ${u.name.slice(0, 60)} -> ${u.matchedCompany.slice(0, 40)}`)
  }

  // Save report
  const outDir = path.join(__dirname, '..', 'data')
  fs.writeFileSync(path.join(outDir, 'halal-brand-matches-v2.json'), JSON.stringify([...allUpdates.values()], null, 2))
  console.log(`\nFull report saved to data/halal-brand-matches-v2.json`)

  // Show category distribution of matches
  const cats = {}
  for (const u of allUpdates.values()) {
    const cat = u.companyCategory || 'unknown'
    cats[cat] = (cats[cat] || 0) + 1
  }
  console.log('\n--- Matches by company category ---')
  Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`))
}

main().catch(console.error)
