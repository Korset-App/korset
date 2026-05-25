const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// Normalize a name for matching: remove legal suffixes, punctuation, lowercase
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/тoo|тоо|ао|ип|too|ooo|llc|ltd|"|«|»|"|"|\(|\)|\.|,|-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Extract core name by removing common prefixes/suffixes
function coreName(name) {
  let n = normalize(name)
  // Remove Kazakh/Russian legal forms
  n = n.replace(/^(тoo|тоо|ао|ип|ооо|too|ooo)\s+/i, '')
  // Remove common words
  n = n.replace(/\s+(дел|дел|цех|фабрика|завод|комбинат|фирма|компания|цех|shop|market|cafe|cafe)$/i, '')
  return n.trim()
}

async function main() {
  console.log('=== Cross-reference HalalDamu companies with product brands ===\n')

  // Load certified companies
  const companiesPath = path.join(__dirname, '..', 'data', 'halaldamu-registry-certified.json')
  if (!fs.existsSync(companiesPath)) {
    console.error('Run scrape-halaldamu-registry.cjs first')
    process.exit(1)
  }
  const certified = JSON.parse(fs.readFileSync(companiesPath, 'utf8'))

  // Build company name set for matching
  const companyNames = [...new Set(certified.map(c => c.name))]
  const companyNormals = companyNames.map(n => ({ original: n, normal: normalize(n), core: coreName(n) }))

  console.log(`Certified companies: ${companyNames.length}\n`)

  // Get all unique brands from products
  const { data: brandsData } = await sb
    .from('global_products')
    .select('brand')
    .neq('brand', null)
    .neq('halal_status', 'yes')  // Skip already marked
    .limit(5000)

  const brands = [...new Set((brandsData || []).map(r => r.brand).filter(Boolean))]
  console.log(`Total unique brands: ${brands.length}`)
  console.log(`\n--- Matching brands to certified companies ---`)

  const matches = []
  const matchedBrands = new Set()

  for (const brand of brands) {
    const brandNorm = normalize(brand)

    for (const cn of companyNormals) {
      // Check if brand is contained in company name OR company name contains brand
      const brandWords = brandNorm.split(/\s+/).filter(w => w.length > 2)
      const matchWords = brandWords.filter(w => cn.normal.includes(w))

      // Require at least 2 matching words, or 1 if it's a distinctive word (length > 4)
      if (matchWords.length >= 2 || (matchWords.length === 1 && matchWords[0].length > 4)) {
        // Avoid false positives with very common words
        const commonWords = new Set(['and', 'the', 'food', 'produkt', 'product', 'et', 'sut', 'bal', 'may', 'serek'])
        const meaningfulMatches = matchWords.filter(w => !commonWords.has(w) && w.length > 2)
        if (meaningfulMatches.length === 0) continue

        matches.push({ brand, company: cn.original, matchWords: meaningfulMatches.join(', ') })
        matchedBrands.add(brand)
        break
      }
    }
  }

  console.log(`\nMatched brands: ${matches.length}`)
  console.log(`\n--- Matches ---`)
  for (const m of matches) {
    console.log(`  ${m.brand.padEnd(25)} <-> ${m.company}  (${m.matchWords})`)
  }

  if (matches.length === 0) {
    // Try simpler: direct word match
    console.log(`\nNo matches with word-based matching. Trying direct substring...`)
    for (const brand of brands) {
      const brandNorm = normalize(brand)
      for (const cn of companyNormals) {
        if (cn.normal.includes(brandNorm) || brandNorm.includes(cn.normal)) {
          // Only if meaningful (not empty/too short)
          if (brandNorm.length > 3) {
            matches.push({ brand, company: cn.original, matchWords: 'direct' })
            matchedBrands.add(brand)
            break
          }
        }
      }
    }
    console.log(`\nMatched brands (direct): ${matches.length}`)
    for (const m of matches) {
      console.log(`  ${m.brand.padEnd(25)} <-> ${m.company}`)
    }
  }

  // Save match report
  const reportPath = path.join(__dirname, '..', 'data', 'halal-brand-matches.json')
  fs.writeFileSync(reportPath, JSON.stringify(matches, null, 2))
  console.log(`\nSaved match report to ${reportPath}`)

  // Show unmatched brands sample
  const unmatched = brands.filter(b => !matchedBrands.has(b))
  console.log(`\nUnmatched brands: ${unmatched.length}`)
  console.log('Sample (first 20):')
  unmatched.slice(0, 20).forEach(b => console.log(`  ${b}`))
}

main().catch(console.error)
