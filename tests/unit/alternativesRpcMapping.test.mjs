import test from 'node:test'
import assert from 'node:assert/strict'

import {
  mapProductAlternativeRpcRows,
  rankAlternativesForProfile,
} from '../../src/domain/product/alternatives.js'
import {
  DEFAULT_ALTERNATIVE_SCENARIO,
  normalizeAlternativeScenario,
} from '../../src/domain/product/alternativeScenarios.js'

function rpcRow(overrides = {}) {
  const row = {
    ean: '200',
    gp_ean: '200',
    local_name: null,
    price_kzt: 900,
    shelf_zone: 'A1',
    stock_status: 'in_stock',
    store_product_id: '11111111-1111-1111-1111-111111111111',
    global_product_id: '22222222-2222-2222-2222-222222222222',
    name: 'Classic Cola',
    name_kz: 'Classic Cola KZ',
    brand: 'Classic',
    category: 'water_beverages',
    subcategory: 'soda',
    quantity: '1 л',
    image_url: 'https://cdn.test/cola.webp',
    ingredients_raw: 'water, sugar',
    ingredients_kz: null,
    allergens_json: [],
    diet_tags_json: [],
    traces_json: [],
    nutriments_json: { sugar: 10 },
    halal_status: 'unknown',
    packaging_type: 'bottle',
    fat_percent: null,
    nutriscore: 'C',
    product_group: 'cola',
    alternate_eans: ['201'],
    relation_rank: 0,
    price_delta_kzt: -100,
    has_composition: true,
    data_completeness: 6,
    availability_rank: 3,
    base_rank: 950,
    rank_reason: 'same_group',
    ...overrides,
  }
  if (!('gp_ean' in overrides)) row.gp_ean = row.ean
  return row
}

test('normalizeAlternativeScenario keeps only supported scenarios', () => {
  assert.equal(normalizeAlternativeScenario('similar'), 'similar')
  assert.equal(normalizeAlternativeScenario('fits_me'), 'fits_me')
  assert.equal(normalizeAlternativeScenario('cheaper'), 'cheaper')
  assert.equal(normalizeAlternativeScenario('better_composition'), 'better_composition')
  assert.equal(normalizeAlternativeScenario('premium'), DEFAULT_ALTERNATIVE_SCENARIO)
  assert.equal(normalizeAlternativeScenario(null), DEFAULT_ALTERNATIVE_SCENARIO)
})

test('mapProductAlternativeRpcRows maps Supabase rows to product shape with ranking metadata', () => {
  const [product] = mapProductAlternativeRpcRows([rpcRow()])

  assert.equal(product.ean, '200')
  assert.equal(product.name, 'Classic Cola')
  assert.equal(product.nameKz, 'Classic Cola KZ')
  assert.equal(product.group, 'cola')
  assert.equal(product.priceKzt, 900)
  assert.equal(product.stockStatus, 'in_stock')
  assert.equal(product.ingredients, 'water, sugar')
  assert.deepEqual(product.nutritionPer100.sugar, 10)
  assert.deepEqual(product.alternateEans, ['201'])
  assert.deepEqual(product.alternativeMeta, {
    relationRank: 0,
    priceDeltaKzt: -100,
    hasComposition: true,
    dataCompleteness: 6,
    availabilityRank: 3,
    baseRank: 950,
    rankReason: 'same_group',
  })
})

test('rankAlternativesForProfile prefers profile-fitting alternatives and lowers incomplete composition', () => {
  const source = { ean: '100', priceKzt: 1000, group: 'cola' }
  const rows = [
    rpcRow({
      ean: '200',
      name: 'Milk Cola',
      ingredients_raw: 'water, milk powder',
      allergens_json: ['milk'],
      price_kzt: 850,
      base_rank: 990,
      data_completeness: 6,
      has_composition: true,
    }),
    rpcRow({
      ean: '300',
      name: 'Sparse Cola',
      ingredients_raw: null,
      allergens_json: [],
      price_kzt: 820,
      base_rank: 980,
      data_completeness: 2,
      has_composition: false,
    }),
    rpcRow({
      ean: '400',
      name: 'Clear Cola',
      ingredients_raw: 'water, sugar',
      allergens_json: [],
      price_kzt: 930,
      base_rank: 970,
      data_completeness: 6,
      has_composition: true,
    }),
  ]

  const ranked = rankAlternativesForProfile({
    product: source,
    candidates: mapProductAlternativeRpcRows(rows),
    profile: { allergens: ['milk'] },
    scenario: 'fits_me',
  })

  assert.deepEqual(
    ranked.map((item) => item.ean),
    ['400', '300', '200']
  )
  assert.equal(ranked[1].alternativeMeta.compositionIncomplete, true)
  assert.equal(ranked[2].alternativeMeta.profileRisk, 'avoid')
})

test('rankAlternativesForProfile in cheaper mode keeps only cheaper visible alternatives', () => {
  const source = { ean: '100', priceKzt: 1000, group: 'cola' }
  const candidates = mapProductAlternativeRpcRows([
    rpcRow({ ean: '200', price_kzt: 1100, price_delta_kzt: 100 }),
    rpcRow({ ean: '300', price_kzt: 950, price_delta_kzt: -50 }),
    rpcRow({ ean: '400', price_kzt: 850, price_delta_kzt: -150 }),
  ])

  const ranked = rankAlternativesForProfile({
    product: source,
    candidates,
    profile: {},
    scenario: 'cheaper',
  })

  assert.deepEqual(
    ranked.map((item) => item.ean),
    ['400', '300']
  )
})

test('rankAlternativesForProfile lowers unavailable products without hiding them', () => {
  const source = { ean: '100', priceKzt: 1000, group: 'cola' }
  const candidates = mapProductAlternativeRpcRows([
    rpcRow({ ean: '200', stock_status: 'out_of_stock', availability_rank: 0, base_rank: 990 }),
    rpcRow({ ean: '300', stock_status: 'in_stock', availability_rank: 3, base_rank: 970 }),
  ])

  const ranked = rankAlternativesForProfile({
    product: source,
    candidates,
    profile: {},
    scenario: 'similar',
  })

  assert.deepEqual(
    ranked.map((item) => item.ean),
    ['300', '200']
  )
  assert.equal(ranked[1].alternativeMeta.unavailable, true)
})
