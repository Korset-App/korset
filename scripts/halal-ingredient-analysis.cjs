const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const DRY_RUN = process.argv.includes('--dry-run')

// Clear haram ingredient patterns (RU/KZ)
const HARAM_PATTERNS = [
  /\bсвинин[а-я]+\b/i,
  /\bшпик\b/i,
  /\bсало\b/i,
  /\bбекон\b/i,
  /\bветчин[а-я]+\b/i,
  /\bpork\b/i,
  /\blard\b/i,
  /\bbacon\b/i,
  /\bалкогол[ь]?\b/i,
  /\bспирт\b/i,
  /\bвин[оа]+\b/i,
  /\bвинн[а-я]+\b/i,
  // E-codes with clear animal origin
  /\bE120\b/i,
  /\bE904\b/i,
  /\bкармин\b/i,
  /\bшеллак\b/i,
]

// Explicit halal mention in ingredients
const HALAL_IN_INGREDIENTS = [
  /\bхаляль\b/i,
  /\bхалал\b/i,
  /\b\(халяль\)/i,
  /\b\(халал\)/i,
  /\bhalal\b/i,
]

// Suspicious E-codes (from e-additives knowledge base)
const SUSPICIOUS_E_CODES = [
  { code: 'E120', name: 'Кармин', reason: 'Животное (насекомые)' },
  { code: 'E904', name: 'Шеллак', reason: 'Животное (червец)' },
  { code: 'E322', name: 'Лецитин', reason: 'Может быть животным' },
  { code: 'E422', name: 'Глицерин', reason: 'Может быть из свиного жира' },
  { code: 'E432', name: 'Твин 20', reason: 'Жирные кислоты могут быть животными' },
  { code: 'E433', name: 'Твин 80', reason: 'Жирные кислоты могут быть животными' },
  { code: 'E435', name: 'Твин 60', reason: 'Жирные кислоты могут быть животными' },
  { code: 'E470a', name: 'Соли жирных кислот', reason: 'Животный источник' },
  { code: 'E471', name: 'Моно- и диглицериды', reason: 'Самый частый проблемный эмульгатор' },
  { code: 'E472a', name: 'E471 + уксусная', reason: 'Как E471' },
  { code: 'E472b', name: 'E471 + молочная', reason: 'Как E471' },
  { code: 'E472c', name: 'E471 + лимонная', reason: 'Как E471' },
  { code: 'E472e', name: 'E471 + винная', reason: 'Как E471' },
  { code: 'E473', name: 'Эфиры сахарозы', reason: 'Животные жиры' },
  { code: 'E474', name: 'Сахароглицериды', reason: 'Животные жиры' },
  { code: 'E475', name: 'Полиглицериновые эфиры', reason: 'Животные жиры' },
  { code: 'E476', name: 'PGPR', reason: 'Глицерин может быть животным' },
  { code: 'E477', name: 'Пропан-1,2-диоловые эфиры', reason: 'Животные жиры' },
  { code: 'E481', name: 'Стеароиллактат натрия', reason: 'Стеариновая кислота животная' },
  { code: 'E482', name: 'Стеароиллактат кальция', reason: 'Стеариновая кислота животная' },
  { code: 'E483', name: 'Тартрат стеароиллактиловой', reason: 'Стеариновая кислота животная' },
  { code: 'E631', name: 'Инозинат натрия', reason: 'Может быть из мяса/рыбы' },
  { code: 'E635', name: '5\'-рибонуклеотиды', reason: 'Как E627+E631' },
  { code: 'E901', name: 'Пчелиный воск', reason: 'Спорно, животное' },
  { code: 'E310', name: 'Пропилгаллат', reason: 'Пропанол животный' },
  { code: 'E170', name: 'Карбонат кальция', reason: 'Может быть из раковин' },
  { code: 'E101', name: 'Рибофлавин', reason: 'Среда выращивания' },
  { code: 'E415', name: 'Ксантановая камедь', reason: 'Среда может быть животной' },
]

function checkHaralInIngredients(text) {
  if (!text) return null
  for (const p of HALAL_IN_INGREDIENTS) {
    if (p.test(text)) return true
  }
  return false
}

function checkHaramInIngredients(text) {
  if (!text) return []
  const found = []
  for (const p of HARAM_PATTERNS) {
    const match = text.match(p)
    if (match) found.push(match[0])
  }
  return found
}

function checkSuspiciousECodes(text) {
  if (!text) return []
  const found = []
  const upper = text.toUpperCase()
  for (const ec of SUSPICIOUS_E_CODES) {
    const escaped = ec.code.replace('+', '\\+').replace("'", "\\'")
    const re = new RegExp(`\\b${escaped}\\b`)
    if (re.test(upper)) {
      found.push(ec)
    }
  }
  return found
}

async function main() {
  console.log('=== Halal Ingredient Analysis ===\n')

  // Fetch all products with ingredients_raw where halal_status = 'unknown'
  const allProducts = []
  let page = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data: pageData, error } = await sb
      .from('global_products')
      .select('ean, name, brand, category, ingredients_raw, halal_status')
      .not('ingredients_raw', 'is', null)
      .neq('ingredients_raw', '')
      .eq('halal_status', 'unknown')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      console.error('Fetch error:', error)
      process.exit(1)
    }

    if (!pageData || pageData.length === 0) {
      hasMore = false
    } else {
      allProducts.push(...pageData)
      page++
      if (page % 5 === 0) console.log(`  Fetched ${allProducts.length} products...`)
    }
  }

  const products = allProducts

  console.log(`Products with ingredients_raw and halal_status=unknown: ${products.length}\n`)

  const halalInIngredients = []
  const haramFound = []
  const suspiciousECodes = []
  const clean = []

  for (const p of products) {
    const hasHalal = checkHaralInIngredients(p.ingredients_raw)
    const haramMatches = checkHaramInIngredients(p.ingredients_raw)
    const suspiciousE = checkSuspiciousECodes(p.ingredients_raw)

    if (hasHalal) {
      halalInIngredients.push(p)
    }
    if (haramMatches.length > 0) {
      haramFound.push({ ...p, matches: haramMatches })
    }
    if (suspiciousE.length > 0) {
      suspiciousECodes.push({ ...p, matches: suspiciousE })
    }
    if (!hasHalal && haramMatches.length === 0 && suspiciousE.length === 0) {
      clean.push(p)
    }
  }

  // 1. Report halal in ingredients
  console.log('=== 1. Halal mention in ingredients → can mark yes ===')
  console.log(`Count: ${halalInIngredients.length}\n`)
  for (const p of halalInIngredients.slice(0, 30)) {
    const excerpt = p.ingredients_raw.slice(0, 120).replace(/\n/g, ' ')
    console.log(`  ${p.name}`)
    console.log(`    → ${excerpt}...`)
    console.log(`    → ean: ${p.ean}\n`)
  }
  if (halalInIngredients.length > 30) {
    console.log(`  ... and ${halalInIngredients.length - 30} more\n`)
  }

  // 2. Report haram ingredients
  console.log('\n=== 2. Clear haram ingredients → can mark no ===')
  console.log(`Count: ${haramFound.length}\n`)
  for (const p of haramFound.slice(0, 20)) {
    console.log(`  ${p.name} | матч: ${p.matches.join(', ')}`)
    console.log(`    → ean: ${p.ean}\n`)
  }
  if (haramFound.length > 20) {
    console.log(`  ... and ${haramFound.length - 20} more\n`)
  }

  // 3. Report suspicious E-codes
  console.log('\n=== 3. Suspicious E-codes (report only, no auto-update) ===')
  console.log(`Count: ${suspiciousECodes.length}\n`)

  // Aggregate by E-code
  const eCodeStats = {}
  for (const p of suspiciousECodes) {
    for (const m of p.matches) {
      if (!eCodeStats[m.code]) eCodeStats[m.code] = { name: m.name, reason: m.reason, count: 0, examples: [] }
      eCodeStats[m.code].count++
      if (eCodeStats[m.code].examples.length < 5) {
        eCodeStats[m.code].examples.push(p.name)
      }
    }
  }

  const sortedECodes = Object.entries(eCodeStats).sort((a, b) => b[1].count - a[1].count)
  console.log('Top suspicious E-codes found:')
  for (const [code, stats] of sortedECodes) {
    console.log(`  ${code} (${stats.name}): ${stats.count} products — ${stats.reason}`)
    for (const ex of stats.examples) {
      console.log(`    → ${ex.slice(0, 70)}`)
    }
    console.log()
  }

  // 4. Stats
  console.log('\n=== SUMMARY ===')
  console.log(`Total analyzed:               ${products.length}`)
  console.log(`Halal in ingredients → yes:   ${halalInIngredients.length}`)
  console.log(`Clear haram → no:             ${haramFound.length}`)
  console.log(`Suspicious E-codes:            ${suspiciousECodes.length}`)
  console.log(`Clean (no signals):            ${clean.length}`)

  // UPDATE
  if (!DRY_RUN) {
    // Update halal in ingredients → yes
    if (halalInIngredients.length > 0) {
      const eans = halalInIngredients.map(p => p.ean)
      console.log(`\nUpdating ${eans.length} products with halal in ingredients → yes...`)
      const { error: err } = await sb.from('global_products').update({ halal_status: 'yes' }).in('ean', eans)
      if (err) console.error('Update error (halal in ingredients):', err)
      else console.log('✅ Halal in ingredients updated')
    }

    // Update clear haram → no
    if (haramFound.length > 0) {
      const eans = haramFound.map(p => p.ean)
      console.log(`\nUpdating ${eans.length} products with haram ingredients → no...`)
      const { error: err } = await sb.from('global_products').update({ halal_status: 'no' }).in('ean', eans)
      if (err) console.error('Update error (haram):', err)
      else console.log('✅ Haram ingredients updated')
    }

    // Show new stats
    const { count: total } = await sb.from('global_products').select('*', { count: 'exact', head: true })
    const { count: yes } = await sb.from('global_products').select('*', { count: 'exact', head: true }).eq('halal_status', 'yes')
    const { count: no } = await sb.from('global_products').select('*', { count: 'exact', head: true }).eq('halal_status', 'no')
    const { count: unknown } = await sb.from('global_products').select('*', { count: 'exact', head: true }).eq('halal_status', 'unknown')
    console.log(`\n=== NEW STATS ===`)
    console.log(`Total:   ${total}`)
    console.log(`yes:     ${yes} (${(yes/total*100).toFixed(1)}%)`)
    console.log(`no:      ${no} (${(no/total*100).toFixed(1)}%)`)
    console.log(`unknown: ${unknown} (${(unknown/total*100).toFixed(1)}%)`)
  } else {
    console.log('\nDRY RUN — no updates made to DB')
  }
}

main().catch(console.error)
