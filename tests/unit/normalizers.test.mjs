// Regression tests для normalizers.js — маппинг внешних источников (OFF/cache/global)
// в наш домен. Любая регрессия здесь = пропуск аллергена для пользователя.
//
// История багов, ради которых эти тесты:
//   • OFF_ALLERGEN_MAP в normalizers.js был дубликатом и расходился с allergens.js:
//     - 'en:nuts' → 'nuts' вместо 'tree_nuts' (фундук в шоколаде → safe)
//     - 'en:crustaceans' → 'shellfish' вместо 'crustaceans' (креветки → safe)
//     - 'en:molluscs', 'en:sesame-seeds', 'en:celery', 'en:mustard',
//       'en:lupin', 'en:sulphur-dioxide-and-sulphites' — вообще не покрывались
//   В сумме >50% обязательных по ТР ТС 022/2011 аллергенов терялось.

import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeGlobalProduct, normalizeOFFProduct } from '../../src/domain/product/normalizers.js'
import { normalizeNutrition, normalizeSpecs } from '../../src/domain/product/model.js'
import { buildProductCharacteristicSpecs } from '../../src/domain/product/productSpecs.js'
import { ALLERGENS } from '../../src/constants/allergens.js'

// Helper
const off = (allergensTags = [], extra = {}) =>
  normalizeOFFProduct('1234567890123', {
    product_name: 'Test',
    allergens_tags: allergensTags,
    traces_tags: [],
    ...extra,
  })

// ─── Все 14 ТР ТС аллергенов из OFF корректно маппятся ──────────

const OFF_TO_DOMAIN_CASES = [
  { off: 'en:milk', expected: 'milk' },
  { off: 'en:gluten', expected: 'gluten' },
  { off: 'en:wheat', expected: 'gluten' }, // alias через зерно
  { off: 'en:eggs', expected: 'eggs' },
  { off: 'en:peanuts', expected: 'peanuts' },
  { off: 'en:nuts', expected: 'tree_nuts' }, // НЕ 'nuts' (legacy)
  { off: 'en:soybeans', expected: 'soy' },
  { off: 'en:soy', expected: 'soy' }, // alias
  { off: 'en:fish', expected: 'fish' },
  { off: 'en:crustaceans', expected: 'crustaceans' }, // НЕ 'shellfish'
  { off: 'en:molluscs', expected: 'mollusks' },
  { off: 'en:sesame-seeds', expected: 'sesame' },
  { off: 'en:celery', expected: 'celery' },
  { off: 'en:mustard', expected: 'mustard' },
  { off: 'en:lupin', expected: 'lupin' },
  { off: 'en:sulphur-dioxide-and-sulphites', expected: 'sulfites' },
]

OFF_TO_DOMAIN_CASES.forEach(({ off: tag, expected }) => {
  test(`normalizeOFFProduct: ${tag} → ${expected}`, () => {
    const product = off([tag])
    assert.deepEqual(product.allergens, [expected])
  })
})

// ─── Все ID, на которые маппятся OFF, должны существовать в ALLERGENS ───

test('every domain ID returned by OFF mapper is registered in ALLERGENS list', () => {
  const known = new Set(ALLERGENS.map((a) => a.id))
  // Дополнительные ID допустимы только если они переопределены через ALLERGEN_MIGRATION_MAP
  const expected = new Set(OFF_TO_DOMAIN_CASES.map((c) => c.expected))
  for (const id of expected) {
    assert.ok(known.has(id), `OFF mapper returns "${id}", but ALLERGENS list doesn't include it`)
  }
})

// ─── Множественные аллергены ────────────────────────────────────

test('multiple allergens preserved without duplicates', () => {
  const r = off(['en:milk', 'en:eggs', 'en:nuts'])
  assert.deepEqual(r.allergens.sort(), ['eggs', 'milk', 'tree_nuts'])
})

test('duplicate OFF tags collapse to single domain ID', () => {
  // en:nuts + en:tree-nuts оба → tree_nuts; не должно быть дублей
  const r = off(['en:nuts', 'en:nuts'])
  assert.deepEqual(r.allergens, ['tree_nuts'])
})

// ─── Traces — тот же маппинг ───────────────────────────────────

test('traces_tags use same canonical mapping (no legacy IDs)', () => {
  const r = normalizeOFFProduct('1', {
    product_name: 't',
    allergens_tags: [],
    traces_tags: ['en:nuts', 'en:crustaceans'],
  })
  assert.deepEqual(r.traces.sort(), ['crustaceans', 'tree_nuts'])
})

// ─── Edge: пустой массив, неизвестные теги ────────────────────

test('empty allergens_tags → empty allergens array', () => {
  const r = off([])
  assert.deepEqual(r.allergens, [])
})

test('unknown OFF tag is silently dropped (not crash, not "undefined")', () => {
  const r = off(['en:something-not-mapped', 'en:milk'])
  assert.deepEqual(r.allergens, ['milk'])
})

test('normalizeNutrition maps Arbuz nutrition keys to canonical product keys', () => {
  const nutrition = normalizeNutrition({
    energy_kcal: 252,
    protein_100g: 12.7,
    fat_100g: 10.9,
    carbohydrates_100g: 0.7,
    sugars: 0.2,
    salt: 0.3,
  })

  assert.deepEqual(nutrition, {
    kcal: 252,
    protein: 12.7,
    fat: 10.9,
    carbs: 0.7,
    sugar: 0.2,
    fiber: null,
    salt: 0.3,
    saturatedFat: null,
    alcohol: null,
  })
})

test('normalizeGlobalProduct exposes Arbuz nutrition as canonical ProductScreen nutrition', () => {
  const product = normalizeGlobalProduct({
    id: '11111111-1111-4111-8111-111111111111',
    ean: '4870265540056',
    name: 'Яйцо Казгер-Құс куриное, премиум, в лотке 20 шт',
    category: 'dairy_eggs',
    nutriments_json: {
      energy_kcal: 157,
      protein_100g: 12.7,
      fat_100g: 10.9,
      carbohydrates_100g: 0.7,
    },
  })

  assert.equal(product.nutritionPer100.kcal, 157)
  assert.equal(product.nutritionPer100.protein, 12.7)
  assert.equal(product.nutritionPer100.fat, 10.9)
  assert.equal(product.nutritionPer100.carbs, 0.7)
})

test('normalizeSpecs maps Arbuz storage_conditions and shelf-life aliases', () => {
  const specs = normalizeSpecs({
    quantity: '900 г',
    storage_conditions: 'Хранить при температуре от +2°C до +6°C',
    shelf_life: '14 суток',
  })

  assert.deepEqual(specs, {
    weight: '900 г',
    storage: 'Хранить при температуре от +2°C до +6°C',
    bestBefore: '14 суток',
    caloriesPerUnit: null,
  })
})

test('buildProductCharacteristicSpecs shows useful specs and hides internal fields', () => {
  const rows = buildProductCharacteristicSpecs(
    normalizeGlobalProduct({
      id: '11111111-1111-4111-8111-111111111112',
      ean: '4870200000001',
      name: 'Йогурт клубничный 2.5%',
      category: 'dairy_eggs',
      subcategory: 'fermented',
      manufacturer: 'Test Dairy',
      country_of_origin: 'Казахстан',
      packaging_type: 'cup',
      fat_percent: 2.5,
      nutriscore: 'B',
      nova_group: 4,
      specs_json: {
        storage_conditions: 'Хранить при температуре от +2°C до +6°C',
        shelf_life: '14 суток',
      },
    }),
    { lang: 'ru' }
  )

  assert.deepEqual(rows.map((row) => row.key), [
    'storage',
    'bestBefore',
    'fatPercent',
    'flavor',
    'subcategory',
    'manufacturer',
    'country',
  ])
  assert.equal(rows.find((row) => row.key === 'storage')?.value, 'Хранить при температуре от +2°C до +6°C')
  assert.equal(rows.find((row) => row.key === 'bestBefore')?.value, '14 суток')
  assert.equal(rows.find((row) => row.key === 'fatPercent')?.value, '2.5%')
  assert.equal(rows.find((row) => row.key === 'flavor')?.value, 'Клубника')
  assert.notEqual(rows.find((row) => row.key === 'subcategory')?.value, 'fermented')
  assert.equal(rows.find((row) => row.key === 'manufacturer')?.value, 'Test Dairy')
  assert.equal(rows.find((row) => row.key === 'country')?.value, 'Казахстан')
  assert.equal(rows.some((row) => row.value === 'cup'), false)
  assert.equal(rows.some((row) => row.value === 'B'), false)
  assert.equal(rows.some((row) => row.value === 4), false)
})

test('buildProductCharacteristicSpecs hides code-like unknown subcategories', () => {
  const rows = buildProductCharacteristicSpecs(
    normalizeGlobalProduct({
      id: '11111111-1111-4111-8111-111111111113',
      ean: '4870200000002',
      name: 'Test product',
      category: 'unknown_category',
      subcategory: 'raw_internal_code',
    }),
    { lang: 'ru' }
  )

  assert.equal(rows.some((row) => row.key === 'subcategory'), false)
})
