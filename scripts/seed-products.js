/**
 * KÖRSET — Наполнение global_products из Open Food Facts
 * Запуск (PowerShell):
 *   $env:SUPABASE_SERVICE_KEY="твой_ключ"; node scripts/seed-products.js
 */

const SUPABASE_URL         = 'https://tcvuffoxwavqdexrzwjj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

// ── EAN которые ТОЧНО есть в OFF (проверено) ─────────────────────────────────
const EAN_LIST = [
  // Coca-Cola / PepsiCo
  '5449000000996',  // Coca-Cola 330ml
  '5449000054227',  // Coca-Cola 1.5L
  '5449000131805',  // Coca-Cola Zero
  '5449000014740',  // Fanta Orange
  '5449000054241',  // Sprite 1.5L
  '4002359010538',  // Pepsi 330ml
  '5449000054036',  // Fanta Lemon

  // Nestle
  '7613035351608',  // KitKat 4 fingers
  '7613287044433',  // KitKat Chunky
  '7613036101639',  // Nesquik порошок
  '7613032910150',  // Nestle Fitness
  '5900951254006',  // Nestle KitKat мини
  '7613033555817',  // Nescafe 3in1
  '8593893738045',  // Nescafe Classic

  // Mars / Snickers / Twix
  '5000159461422',  // Snickers 50g
  '5000159407236',  // Mars 51g
  '5000159064996',  // Twix
  '5000159461704',  // Bounty
  '5000159368834',  // M&Ms Peanut
  '5000159461729',  // Milky Way

  // Mondelez (Milka, Oreo, Barni)
  '7622210449283',  // Milka Alpenmilch 100g
  '7622210451439',  // Milka Oreo
  '7622210452511',  // Milka Caramel
  '7622300441937',  // Oreo Original
  '7622300489984',  // Oreo Double Stuf
  '7622210647566',  // Barni медведь

  // Ferrero
  '3017620422003',  // Nutella 400g
  '3017620425035',  // Nutella 200g
  '8000500310427',  // Kinder Bueno
  '8000500205228',  // Kinder Chocolate
  '8000500014226',  // Ferrero Rocher 16шт
  '8000500037256',  // Raffaello

  // Lay's / Pringles
  '5053990101536',  // Lay's Classic
  '5053990105756',  // Lay's Sour Cream
  '5053827281083',  // Lay's BBQ
  '5053990144748',  // Doritos
  '5053827144808',  // Cheetos
  '5053827100003',  // Walkers Crisps

  // Чай / Кофе
  '8718114916002',  // Lipton Yellow Label 100 пак
  '8718114990476',  // Lipton Green Tea
  '4008167014201',  // Jacobs Kronung
  '8711000501169',  // Douwe Egberts
  '5901619000102',  // Minutka чай

  // Вода
  '5900497120115',  // Evian 0.5L
  '7613036897396',  // San Pellegrino
  '4006359001065',  // Volvic

  // Молочное (международные)
  '4015000011754',  // Milbona молоко
  '3033490004743',  // Danone йогурт натуральный
  '3033710065967',  // Activia натуральная
  '5411188100447',  // Alpro соевое молоко
  '5411188119180',  // Alpro овсяное

  // Хлопья / каши
  '5053827198208',  // Kellogg's Corn Flakes
  '5059319013090',  // Kellogg's Crunchy Nut
  '7613035683679',  // Nestle Cheerios
  '5900017023083',  // Quaker Oats

  // Соусы
  '8715700043449',  // Heinz Ketchup 570g
  '8715700110134',  // Heinz Tomato Soup
  '0013000006408',  // Heinz Mustard
  '8715700100159',  // Hellmann's Mayo

  // Детское
  '3033710069279',  // Danone Danonino
  '7613034626974',  // Nestle Gerber
]

// ── Маппинг аллергенов ────────────────────────────────────────────────────────
const ALLERGEN_MAP = {
  'en:milk': 'milk', 'en:gluten': 'gluten', 'en:nuts': 'nuts',
  'en:peanuts': 'peanuts', 'en:soybeans': 'soy', 'en:eggs': 'eggs',
  'en:fish': 'fish', 'en:crustaceans': 'shellfish', 'en:wheat': 'gluten',
  'en:sesame': 'sesame', 'en:celery': 'celery', 'en:mustard': 'mustard',
}

function normalizeOFF(ean, p) {
  const allergens = [...new Set(
    (p.allergens_tags || []).map(a => ALLERGEN_MAP[a]).filter(Boolean)
  )]
  const labels   = p.labels_tags || []
  const dietTags = []
  if (labels.some(l => /halal/i.test(l)))       dietTags.push('halal')
  if (labels.some(l => /vegan/i.test(l)))       dietTags.push('vegan')
  if (labels.some(l => /vegetarian/i.test(l)))  dietTags.push('vegetarian')
  if (labels.some(l => /gluten.free/i.test(l))) dietTags.push('gluten_free')
  if (labels.some(l => /sugar.free/i.test(l)))  dietTags.push('sugar_free')

  const halalStatus = labels.some(l => /halal/i.test(l)) ? 'yes' : 'unknown'

  const n = p.nutriments || {}
  const nutriments = {
    kcal:          n['energy-kcal_100g']   ?? null,
    protein:       n.proteins_100g         ?? null,
    fat:           n.fat_100g              ?? null,
    saturated_fat: n['saturated-fat_100g'] ?? null,
    carbs:         n.carbohydrates_100g    ?? null,
    sugar:         n.sugars_100g           ?? null,
    fiber:         n.fiber_100g            ?? null,
    salt:          n.salt_100g             ?? null,
  }

  let score = 0
  const name = (p.product_name || p.product_name_ru || p.product_name_en || '').trim()
  if (name.length > 2)                                  score += 20
  const ingredients = p.ingredients_text_ru || p.ingredients_text || ''
  if (ingredients.length > 10)                          score += 20
  if (nutriments.kcal !== null)                         score += 20
  if (allergens.length > 0)                             score += 15
  if (halalStatus !== 'unknown')                        score += 10
  if (p.image_front_url)                                score += 10
  if (p.nutriscore_grade)                               score += 5

  return {
    ean,
    name:               name || `Товар ${ean}`,
    brand:              (p.brands || '').split(',')[0].trim() || null,
    category:           p.categories_tags?.[0]?.replace('en:', '') || null,
    quantity:           p.quantity || null,
    image_url:          p.image_front_url || null,
    ingredients_raw:    ingredients || null,
    allergens_json:     JSON.stringify(allergens),
    diet_tags_json:     JSON.stringify(dietTags),
    nutriments_json:    JSON.stringify(nutriments),
    halal_status:       halalStatus,
    nutriscore:         p.nutriscore_grade?.toUpperCase() || null,
    data_quality_score: Math.min(score, 100),
    source_primary:     'openfoodfacts',
    needs_review:       score < 60,
    is_verified:        false,
    country_of_origin:  p.countries_tags?.[0]?.replace('en:', '') || null,
    manufacturer:       p.manufacturing_places || null,
  }
}

async function fetchFromOFF(ean) {
  const fields = [
    'product_name','product_name_ru','product_name_en','brands','categories_tags',
    'ingredients_text_ru','ingredients_text','allergens_tags','labels_tags',
    'nutriments','image_front_url','nutriscore_grade','quantity',
    'countries_tags','manufacturing_places',
  ].join(',')
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${ean}?fields=${fields}`,
      { headers: { 'User-Agent': 'Korset/1.0 (korset.app)' }, signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return null
    const json = await res.json()
    return (json.status === 1 && json.product) ? json.product : null
  } catch { return null }
}

async function upsertProduct(product) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/global_products?on_conflict=ean`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer':        'resolution=merge-duplicates',
    },
    body: JSON.stringify(product),
  })
  if (!res.ok) throw new Error(await res.text())
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Нет SUPABASE_SERVICE_KEY')
    console.error('   $env:SUPABASE_SERVICE_KEY="ключ"; node scripts/seed-products.js')
    process.exit(1)
  }

  console.log(`🚀 Загружаем ${EAN_LIST.length} товаров...\n`)
  let success = 0, skipped = 0, failed = 0

  for (let i = 0; i < EAN_LIST.length; i++) {
    const ean = EAN_LIST[i]
    process.stdout.write(`[${i+1}/${EAN_LIST.length}] ${ean} → `)
    const p = await fetchFromOFF(ean)
    if (!p) { console.log('⚠️  не найден'); skipped++; await sleep(300); continue }
    try {
      await upsertProduct(normalizeOFF(ean, p))
      const name = (p.product_name || p.product_name_en || '').trim() || ean
      console.log(`✅ ${name}`)
      success++
    } catch (e) { console.log(`❌ ${e.message}`); failed++ }
    await sleep(350)
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`✅ Загружено:   ${success}`)
  console.log(`⚠️  Не найдено: ${skipped}`)
  console.log(`❌ Ошибок:      ${failed}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`\nСуpabase → Table Editor → global_products`)
}

main()
