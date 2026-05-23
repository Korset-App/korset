#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const { createClient } = require('@supabase/supabase-js')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const OUTPUT_PATH = path.join(
  __dirname,
  '..',
  'tests',
  'fixtures',
  'product-card-normalization-samples.json'
)

const FULL_FIELDS = [
  'id',
  'ean',
  'name',
  'name_kz',
  'brand',
  'category',
  'subcategory',
  'quantity',
  'description',
  'ingredients_raw',
  'ingredients_kz',
  'allergens_json',
  'diet_tags_json',
  'tags_json',
  'additives_tags_json',
  'traces_json',
  'categories_tags_json',
  'halal_status',
  'packaging_type',
  'fat_percent',
  'nutriscore',
  'nutriments_json',
  'alcohol_100g',
  'saturated_fat_100g',
  'nova_group',
  'image_ingredients_url',
  'image_nutrition_url',
  'image_url',
  'images',
  'manufacturer',
  'country_of_origin',
  'specs_json',
  'data_quality_score',
  'source_primary',
  'source_confidence',
  'is_verified',
  'needs_review',
  'group',
  'alternate_eans',
].join(',')

const FLAVOR_HINTS = [
  'клубник',
  'банан',
  'шоколад',
  'ванил',
  'карамел',
  'манго',
  'персик',
  'яблок',
  'лимон',
  'апельсин',
  'вишн',
  'малина',
  'черник',
  'ягод',
  'арбуз',
  'дын',
  'кола',
  'барбекю',
  'бекон',
  'сыр',
  'лук',
  'сметан',
  'зелень',
  'краб',
  'паприк',
  'лосос',
]

const NO_FLAVOR_HINTS = [
  'молоко',
  'кефир',
  'сметана',
  'масло',
  'рис',
  'гречка',
  'мука',
  'соль',
  'сахар',
  'вода',
  'яйцо',
]

function normalizeJson(value, fallback) {
  if (value == null) return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function nutritionKeys(product) {
  const n = normalizeJson(product.nutriments_json, {}) || {}
  return {
    energy: n.energy_kcal ?? n.energy_kcal_100g ?? n['energy-kcal_100g'] ?? n.kcal ?? n.calories,
    protein: n.protein_100g ?? n.protein ?? n.proteins_100g,
    fat: n.fat_100g ?? n.fat,
    carbs: n.carbohydrates_100g ?? n.carbohydrates ?? n.carbs,
    sugar: n.sugar ?? n.sugars ?? n.sugars_100g,
    salt: n.salt ?? n.salt_100g,
  }
}

function hasAnyNutrition(product) {
  return Object.values(nutritionKeys(product)).some((value) => value != null)
}

function hasFullMainNutrition(product) {
  const keys = nutritionKeys(product)
  return keys.energy != null && keys.protein != null && keys.fat != null && keys.carbs != null
}

function hasLegacyKeyGap(product) {
  const n = normalizeJson(product.nutriments_json, {}) || {}
  return (
    (n.energy_kcal != null && n.kcal == null && n.energy_kcal_100g == null) ||
    (n.protein_100g != null && n.protein == null && n.proteins_100g == null)
  )
}

function getSpecs(product) {
  return normalizeJson(product.specs_json, {}) || {}
}

function hasStorageConditions(product) {
  const specs = getSpecs(product)
  return hasText(specs.storage_conditions) || hasText(specs.storage)
}

function productName(product) {
  return [product.name, product.brand, product.quantity].filter(Boolean).join(' ')
}

function containsAny(text, hints) {
  const haystack = String(text || '').toLowerCase()
  return hints.some((hint) => haystack.includes(hint))
}

function hasQuantityForUnitPriceReview(product) {
  const text = [product.quantity, product.name].filter(Boolean).join(' ').toLowerCase()
  return (
    /\b\d+[,.]?\d*\s*(г|гр|кг|мл|л|g|kg|ml|l|шт|дана|pcs)\b/i.test(text) ||
    /\b(саше|капсул|таблет|пакетик|порци)/i.test(text)
  )
}

function categoryBucket(product) {
  const category = String(product.category || '').toLowerCase()
  const subcategory = String(product.subcategory || '').toLowerCase()
  const name = productName(product).toLowerCase()
  const taxonomy = `${category} ${subcategory}`

  if (/water_beverages|beverages|drinks|juice|water|soda|tea|coffee/.test(taxonomy))
    return 'drinks'
  if (/snacks|chips|crackers|popcorn/.test(taxonomy)) return 'chips_snacks'
  if (/sweets|candy|chocolate|cookies|waffles/.test(taxonomy)) return 'sweets'
  if (/ice.?cream|морож/.test(taxonomy) || /\bморож/.test(name)) return 'ice_cream'
  if (/sauces|spices|condiments/.test(taxonomy)) return 'sauces_spices'
  if (/grocery|pasta|cereals|flour|rice/.test(taxonomy)) return 'dry_grocery'

  if (/dairy_eggs/.test(category)) {
    if (/milk|kefir|sour|cream/.test(subcategory)) return 'milk_kefir_sour_cream'
    if (/yogurt|curd|dessert|cheese/.test(subcategory)) return 'dairy_flavored_candidates'
  }

  if (/\b(йогурт|сырок|творож|десерт)\b/.test(name)) return 'yogurt_curd_dessert'
  if (/\b(молоко|кефир|сметан|сливк)\b/.test(name)) return 'milk_kefir_sour_cream'
  if (/\b(напит|сок|вода|газиров|энергетик|чай|кофе)\b/.test(name)) return 'drinks'
  if (/\b(конфет|шоколад|печень|вафл|батончик|мармелад|зефир)\b/.test(name)) return 'sweets'
  if (/\b(чипс|снек|сухар|начос|попкорн)\b/.test(name)) return 'chips_snacks'
  if (/\b(соус|кетчуп|майонез|горчиц|спец|приправа)\b/.test(name)) return 'sauces_spices'
  if (/\b(рис|греч|макарон|круп|мука|сахар|соль)\b/.test(name)) return 'dry_grocery'
  return 'general'
}

function summarizeProduct(row) {
  const gp = row.global_products || {}
  const keys = nutritionKeys(gp)
  const specs = getSpecs(gp)
  return {
    ean: gp.ean || row.ean,
    name: gp.name || row.local_name || null,
    brand: gp.brand || null,
    category: gp.category || null,
    subcategory: gp.subcategory || null,
    quantity: gp.quantity || null,
    priceKzt: row.price_kzt ?? null,
    bucket: categoryBucket(gp),
    facts: {
      hasDescription: hasText(gp.description),
      hasIngredients: hasText(gp.ingredients_raw),
      hasNutrition: hasAnyNutrition(gp),
      hasFullMainNutrition: hasFullMainNutrition(gp),
      legacyNutritionKeyGap: hasLegacyKeyGap(gp),
      nutritionKeysPresent: Object.fromEntries(
        Object.entries(keys).map(([key, value]) => [key, value != null])
      ),
      hasStorageConditions: hasStorageConditions(gp),
      storageKey: hasText(specs.storage_conditions)
        ? 'storage_conditions'
        : hasText(specs.storage)
          ? 'storage'
          : null,
      hasFatPercent: gp.fat_percent != null,
      hasPackagingType: hasText(gp.packaging_type),
      hasNutriscore: hasText(gp.nutriscore),
      hasNutritionImage: hasText(gp.image_nutrition_url),
      hasIngredientsImage: hasText(gp.image_ingredients_url),
    },
  }
}

function pickFirst(products, predicate, used) {
  const found = products.find((item) => !used.has(item.ean) && predicate(item))
  if (found) used.add(found.ean)
  return found || null
}

function buildSampleSet(products) {
  const summarized = products.map(summarizeProduct).filter((item) => item.ean)
  const used = new Set()
  const samples = []

  function add(id, reason, predicate, expectations = {}) {
    const item = pickFirst(summarized, predicate, used)
    if (!item) return
    samples.push({
      id,
      reason,
      ...item,
      expectations,
    })
  }

  add(
    'nutrition_full_arbuz_keys',
    'КБЖУ есть в Arbuz-style ключах; карточка должна показать калории/белки/жиры/углеводы.',
    (p) => p.facts.hasFullMainNutrition && p.facts.legacyNutritionKeyGap,
    { showNutrition: true, showSugarSaltOnlyIfPresent: true }
  )
  add(
    'nutrition_partial_hide_missing',
    'Частичное КБЖУ; карточка должна показать только надёжные значения и не выглядеть пустой.',
    (p) => p.facts.hasNutrition && !p.facts.hasFullMainNutrition,
    { showNutritionIfAnyMainValue: true, hideMissingNutritionRows: true }
  )
  add(
    'no_nutrition_hide_section',
    'Нет КБЖУ; карточка должна скрыть блок питания.',
    (p) => !p.facts.hasNutrition,
    { showNutrition: false }
  )
  add(
    'ingredients_without_description',
    'Есть состав, но нет описания; карточка должна показать состав и скрыть описание.',
    (p) => p.facts.hasIngredients && !p.facts.hasDescription,
    { showIngredients: true, showDescription: false }
  )
  add(
    'description_and_ingredients',
    'Есть описание и состав; карточка должна показать оба блока в правильном порядке.',
    (p) => p.facts.hasIngredients && p.facts.hasDescription,
    { showIngredients: true, showDescription: true }
  )
  add(
    'storage_conditions_mapping',
    'Условия хранения лежат в specs_json.storage_conditions; карточка должна показать их как хранение.',
    (p) => p.facts.hasStorageConditions && p.facts.storageKey === 'storage_conditions',
    { showStorage: true }
  )
  add(
    'fat_percent_characteristic',
    'Жирность уже извлечена; карточка должна показать её как характеристику, если применимо.',
    (p) => p.facts.hasFatPercent,
    { showFatPercent: true }
  )
  add(
    'packaging_internal_only',
    'Тип упаковки есть, но по решению владельца не должен показываться в карточке.',
    (p) => p.facts.hasPackagingType,
    { showPackagingType: false }
  )
  add(
    'flavor_candidate_dairy',
    'Кандидат на вкус в молочном/десертном продукте.',
    (p) =>
      [
        'yogurt_curd_dessert',
        'milk_kefir_sour_cream',
        'dairy_flavored_candidates',
        'ice_cream',
      ].includes(p.bucket) &&
      containsAny(productName(p), FLAVOR_HINTS),
    { showFlavorIfHighConfidence: true }
  )
  add(
    'flavor_candidate_drink',
    'Кандидат на вкус в напитках.',
    (p) => p.bucket === 'drinks' && containsAny(productName(p), FLAVOR_HINTS),
    { showFlavorIfHighConfidence: true }
  )
  add(
    'flavor_candidate_sweets',
    'Кандидат на вкус в сладостях.',
    (p) => p.bucket === 'sweets' && containsAny(productName(p), FLAVOR_HINTS),
    { showFlavorIfHighConfidence: true }
  )
  add(
    'flavor_candidate_snacks',
    'Кандидат на вкус в снеках.',
    (p) => p.bucket === 'chips_snacks' && containsAny(productName(p), FLAVOR_HINTS),
    { showFlavorIfHighConfidence: true }
  )
  add(
    'no_flavor_control',
    'Контрольный товар без вкуса; карточка не должна придумывать вкус.',
    (p) => containsAny(productName(p), NO_FLAVOR_HINTS) && !containsAny(productName(p), FLAVOR_HINTS),
    { showFlavor: false }
  )
  add(
    'unit_price_review_weight_volume',
    'Цена за 100 г/мл должна пройти правила уместности.',
    (p) => hasQuantityForUnitPriceReview(p) && p.priceKzt != null && p.priceKzt > 0,
    { reviewUnitPriceVisibility: true }
  )
  add(
    'unit_price_review_small_or_piece',
    'Штучный/мелкий товар для проверки, не выглядит ли цена за единицу странно.',
    (p) =>
      p.priceKzt != null &&
      p.priceKzt > 0 &&
      /\b(шт|дана|pcs|саше|капсул|таблет|пакетик)\b/i.test(
        [p.quantity, p.name].filter(Boolean).join(' ')
      ),
    { reviewUnitPriceVisibility: true }
  )

  add(
    'nutrition_sugar_or_salt_present',
    'Редкий случай, где сахар или соль реально есть; карточка должна показать только присутствующие показатели.',
    (p) => p.facts.nutritionKeysPresent.sugar || p.facts.nutritionKeysPresent.salt,
    { showSugarSaltOnlyIfPresent: true }
  )
  add(
    'bucket_yogurt_or_curd',
    'Категорийный контроль: йогурт/сырок/творожный десерт.',
    (p) => ['yogurt_curd_dessert', 'dairy_flavored_candidates'].includes(p.bucket),
    { reviewProductCardSections: true }
  )
  add(
    'bucket_milk_kefir_sour_cream',
    'Категорийный контроль: молоко/кефир/сметана/сливки.',
    (p) => p.bucket === 'milk_kefir_sour_cream',
    { reviewProductCardSections: true }
  )
  add(
    'bucket_drinks',
    'Категорийный контроль: напитки.',
    (p) => p.bucket === 'drinks',
    { reviewProductCardSections: true }
  )
  add(
    'bucket_sweets',
    'Категорийный контроль: сладости/печенье/шоколад.',
    (p) => p.bucket === 'sweets',
    { reviewProductCardSections: true }
  )
  add(
    'bucket_snacks',
    'Категорийный контроль: чипсы/снеки/сухарики.',
    (p) => p.bucket === 'chips_snacks',
    { reviewProductCardSections: true }
  )
  add(
    'bucket_ice_cream',
    'Категорийный контроль: мороженое.',
    (p) => p.bucket === 'ice_cream',
    { reviewProductCardSections: true }
  )
  add(
    'bucket_sauces_spices',
    'Категорийный контроль: соусы/специи, где цена за 100 г часто может выглядеть спорно.',
    (p) => p.bucket === 'sauces_spices',
    { reviewProductCardSections: true, reviewUnitPriceVisibility: true }
  )
  add(
    'bucket_dry_grocery',
    'Категорийный контроль: бакалея.',
    (p) => p.bucket === 'dry_grocery',
    { reviewProductCardSections: true }
  )
  add(
    'ambiguous_flavor_control',
    'Неоднозначное название: возможный вкус/тип продукта нужно показывать только при высокой уверенности.',
    (p) =>
      containsAny(productName(p), FLAVOR_HINTS) &&
      !p.id &&
      !['drinks', 'chips_snacks', 'sweets', 'dairy_flavored_candidates', 'ice_cream'].includes(
        p.bucket
      ),
    { showFlavorOnlyIfHighConfidence: true }
  )

  return samples
}

function coverage(products) {
  const total = products.length
  const count = (predicate) => products.filter((row) => predicate(row.global_products || {})).length
  return {
    total,
    ingredients: count((p) => hasText(p.ingredients_raw)),
    description: count((p) => hasText(p.description)),
    anyNutrition: count(hasAnyNutrition),
    fullMainNutrition: count(hasFullMainNutrition),
    legacyNutritionKeyGap: count(hasLegacyKeyGap),
    energyKcal: count((p) => normalizeJson(p.nutriments_json, {})?.energy_kcal != null),
    protein100g: count((p) => normalizeJson(p.nutriments_json, {})?.protein_100g != null),
    fat100g: count((p) => normalizeJson(p.nutriments_json, {})?.fat_100g != null),
    carbohydrates100g: count((p) => normalizeJson(p.nutriments_json, {})?.carbohydrates_100g != null),
    sugarAny: count((p) => nutritionKeys(p).sugar != null),
    saltAny: count((p) => nutritionKeys(p).salt != null),
    storageConditions: count((p) => hasText(getSpecs(p).storage_conditions)),
    storage: count((p) => hasText(getSpecs(p).storage)),
    fatPercent: count((p) => p.fat_percent != null),
    packagingType: count((p) => hasText(p.packaging_type)),
    nutritionImage: count((p) => hasText(p.image_nutrition_url)),
    ingredientsImage: count((p) => hasText(p.image_ingredients_url)),
  }
}

async function fetchStore(client, code) {
  const { data, error } = await client
    .from('stores')
    .select('id, code, name')
    .eq('code', code)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error(`Store not found: ${code}`)
  return data
}

async function fetchProducts(client, storeId) {
  const batchSize = 1000
  let offset = 0
  const rows = []

  while (true) {
    const { data, error } = await client
      .from('store_products')
      .select(
        `ean, price_kzt, shelf_zone, stock_status, local_name, is_active, global_products!inner(${FULL_FIELDS})`
      )
      .eq('store_id', storeId)
      .eq('is_active', true)
      .eq('global_products.is_active', true)
      .range(offset, offset + batchSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    rows.push(...data)
    if (data.length < batchSize) break
    offset += batchSize
  }

  return rows
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const write = args.has('--write')
  const storeCodeArg = process.argv.find((arg) => arg.startsWith('--store='))
  const storeCode = storeCodeArg ? storeCodeArg.split('=')[1] : 'store-one'

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const store = await fetchStore(client, storeCode)
  const products = await fetchProducts(client, store.id)
  const samples = buildSampleSet(products)

  const report = {
    generatedAt: new Date().toISOString(),
    store: {
      id: store.id,
      code: store.code,
      name: store.name,
    },
    coverage: coverage(products),
    samples,
  }

  if (write) {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`)
  }

  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error(`[product-card-audit] ${error.message}`)
  process.exit(1)
})
