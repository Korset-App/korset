import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mapNpcItemToCandidate,
  mapUsdaFoodToCandidate,
  resolveControlledProductEnrichment,
} from '../../src/domain/ai/productEnrichmentService.js'

function createSupabaseStub({ cached = null } = {}) {
  const calls = []
  const client = {
    calls,
    from(table) {
      const chain = {
        select(columns) {
          calls.push({ op: 'select', table, columns })
          return chain
        },
        eq(column, value) {
          calls.push({ op: 'eq', table, column, value })
          return chain
        },
        maybeSingle() {
          calls.push({ op: 'maybeSingle', table })
          return Promise.resolve({ data: cached, error: null })
        },
        upsert(payload, options) {
          calls.push({ op: 'upsert', table, payload, options })
          return Promise.resolve({ data: payload, error: null })
        },
      }
      return chain
    },
  }
  return client
}

test('mapUsdaFoodToCandidate converts branded food facts into an external candidate', () => {
  const candidate = mapUsdaFoodToCandidate({
    fdcId: 123,
    gtinUpc: '4870000000011',
    description: 'TEST YOGURT',
    brandName: 'TestFarm',
    ingredients: 'Milk, sugar',
    packageWeight: '250 g',
    foodNutrients: [
      { nutrientName: 'Energy', value: 120, unitName: 'KCAL' },
      { nutrientName: 'Protein', value: 4, unitName: 'G' },
      { nutrientName: 'Total Sugars', value: 8, unitName: 'G' },
    ],
  })

  assert.equal(candidate.ean, '4870000000011')
  assert.equal(candidate.name, 'TEST YOGURT')
  assert.equal(candidate.brand, 'TestFarm')
  assert.equal(candidate.ingredients, 'Milk, sugar')
  assert.equal(candidate.nutrition.calories, 120)
  assert.equal(candidate.nutrition.protein, 4)
  assert.equal(candidate.nutrition.sugar, 8)
})

test('mapNpcItemToCandidate keeps national catalog identity facts reviewable', () => {
  const candidate = mapNpcItemToCandidate({
    gtin: '4870000000011',
    nameRu: 'Йогурт TestFarm 250 г',
    nameKk: 'TestFarm йогурты 250 г',
    attributes: [
      { code: 'brand', valueRu: 'TestFarm' },
      { code: 'producer_country', valueRu: 'Казахстан' },
      { code: 'a4282e5d', valueRu: 'Test Dairy' },
    ],
  })

  assert.equal(candidate.ean, '4870000000011')
  assert.equal(candidate.name, 'Йогурт TestFarm 250 г')
  assert.equal(candidate.brand, 'TestFarm')
  assert.equal(candidate.manufacturer, 'Test Dairy')
  assert.equal(candidate.countryOfOrigin, 'Казахстан')
})

test('resolveControlledProductEnrichment returns cached strong candidate without network', async () => {
  const fetchCalls = []
  const supabase = createSupabaseStub({
    cached: {
      ean: '4870000000011',
      source: 'usda',
      normalized_name: 'Test Yogurt',
      normalized_brand: 'TestFarm',
      normalized_ingredients: 'milk, sugar',
      normalized_nutriments_json: { calories: 120, protein: 4 },
      raw_payload: { controlledConfidence: 'exact_ean_match', reviewStatus: 'candidate' },
      ttl_expires_at: new Date(Date.now() + 60_000).toISOString(),
    },
  })

  const result = await resolveControlledProductEnrichment({
    product: { ean: '4870000000011', name: 'Test Yogurt', brand: 'TestFarm', ingredients: '' },
    userQuery: 'Какой состав?',
    supabase,
    env: { USDA_API_KEY: 'test' },
    fetchImpl: async () => {
      fetchCalls.push(true)
      throw new Error('should not fetch')
    },
  })

  assert.equal(result.status, 'ready')
  assert.equal(result.fromCache, true)
  assert.equal(fetchCalls.length, 0)
  assert.match(result.externalReference.text, /внешним данным/i)
})

test('resolveControlledProductEnrichment fetches live facts and stores reviewable cache', async () => {
  const supabase = createSupabaseStub()
  const result = await resolveControlledProductEnrichment({
    product: { ean: '4870000000011', name: 'Test Yogurt', brand: 'TestFarm', ingredients: '' },
    userQuery: 'Какой состав?',
    supabase,
    env: { USDA_API_KEY: 'test-key' },
    fetchImpl: async (url) => {
      assert.match(url, /api\.nal\.usda\.gov/)
      return {
        ok: true,
        json: async () => ({
          foods: [
            {
              fdcId: 123,
              gtinUpc: '4870000000011',
              description: 'Test Yogurt',
              brandName: 'TestFarm',
              ingredients: 'milk, sugar',
              foodNutrients: [],
            },
          ],
        }),
      }
    },
  })

  assert.equal(result.status, 'ready')
  assert.equal(result.candidate.confidence, 'exact_ean_match')
  assert.equal(result.persisted, true)
  assert.equal(supabase.calls.some((call) => call.op === 'upsert'), true)
  assert.match(result.externalReference.text, /менее надёжными/i)
})

test('resolveControlledProductEnrichment skips broad requests and never stores buyer text', async () => {
  const supabase = createSupabaseStub()
  const result = await resolveControlledProductEnrichment({
    product: { ean: '4870000000011', name: 'Test Yogurt', brand: 'TestFarm', ingredients: '' },
    userQuery: 'Что купить на ужин?',
    supabase,
    env: { USDA_API_KEY: 'test-key' },
    fetchImpl: async () => {
      throw new Error('should not fetch')
    },
  })

  assert.equal(result.status, 'skipped')
  assert.equal(result.reason, 'broad_catalog_request')
  assert.equal(supabase.calls.some((call) => call.op === 'upsert'), false)
})
