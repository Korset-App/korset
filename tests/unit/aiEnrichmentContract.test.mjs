import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildEnrichmentRequest,
  buildExternalReferenceNotice,
  canShowExternalCandidateToBuyer,
  classifyEnrichmentTrigger,
  normalizeExternalCandidate,
} from '../../src/domain/ai/enrichmentContract.js'

test('classifyEnrichmentTrigger allows exact product fact lookup only when local facts are weak', () => {
  const result = classifyEnrichmentTrigger({
    product: {
      ean: '4870000000011',
      name: 'Test Yogurt 250 g',
      brand: 'TestFarm',
      ingredients: '',
      halalStatus: 'unknown',
      nutrition: null,
    },
    userQuery: 'Какой состав и можно ли халал?',
    profile: { halalOnly: true },
  })

  assert.equal(result.allowed, true)
  assert.equal(result.reasons.includes('missing_ingredients'), true)
  assert.equal(result.reasons.includes('unknown_halal_for_halal_profile'), true)
  assert.equal(result.reasons.includes('asked_missing_specific_fact'), true)
})

test('classifyEnrichmentTrigger rejects broad shopping requests and strong local cards', () => {
  const broad = classifyEnrichmentTrigger({
    product: null,
    userQuery: 'Что купить на ужин до 5000?',
  })
  const completeCard = classifyEnrichmentTrigger({
    product: {
      ean: '4870000000011',
      name: 'Complete Product',
      ingredients: 'milk, sugar',
      halalStatus: 'yes',
      nutrition: { calories: 120, sugar: 8, protein: 4 },
      manufacturer: 'Known Maker',
      imageUrl: 'https://example.test/product.jpg',
    },
    userQuery: 'Подходит?',
    profile: { halalOnly: true },
  })

  assert.equal(broad.allowed, false)
  assert.equal(broad.reason, 'broad_catalog_request')
  assert.equal(completeCard.allowed, false)
  assert.equal(completeCard.reason, 'local_card_sufficient')
})

test('buildEnrichmentRequest uses only precise allowed lookup keys and no buyer text evidence', () => {
  const request = buildEnrichmentRequest({
    product: {
      ean: '4870000000011',
      name: 'Test Yogurt 250 g',
      brand: 'TestFarm',
      quantity: '250 g',
      manufacturer: 'Test Dairy',
      ingredients: '',
    },
    userQuery: 'Расскажи подробно, что там внутри и где купить дешевле',
  })

  assert.equal(request.allowed, true)
  assert.deepEqual(request.lookupKeys, {
    ean: '4870000000011',
    name: 'Test Yogurt 250 g',
    brand: 'TestFarm',
    quantity: '250 g',
    manufacturer: 'Test Dairy',
  })
  assert.equal('userQuery' in request, false)
  assert.equal(request.cacheKey, 'ean:4870000000011')
  assert.equal(request.networkAllowed, false)
})

test('normalizeExternalCandidate classifies exact, probable, weak, conflict, and not-found candidates', () => {
  const product = {
    ean: '4870000000011',
    name: 'Test Yogurt',
    brand: 'TestFarm',
    quantity: '250 g',
    ingredients: 'milk',
  }

  assert.equal(
    normalizeExternalCandidate({ product, candidate: { ean: '4870000000011' } }).confidence,
    'exact_ean_match'
  )
  assert.equal(
    normalizeExternalCandidate({
      product,
      candidate: { name: 'Test Yogurt', brand: 'TestFarm', quantity: '250 g' },
    }).confidence,
    'probable_product_match'
  )
  assert.equal(
    normalizeExternalCandidate({ product, candidate: { name: 'Test Yogurt' } }).confidence,
    'weak_match'
  )
  assert.equal(
    normalizeExternalCandidate({
      product,
      candidate: { ean: '4870000000011', ingredients: 'water, sugar' },
    }).confidence,
    'conflict'
  )
  assert.equal(normalizeExternalCandidate({ product, candidate: null }).confidence, 'not_found')
})

test('buyer-visible external references are limited to strong non-conflicting candidates', () => {
  assert.equal(
    canShowExternalCandidateToBuyer({ confidence: 'exact_ean_match', reviewStatus: 'candidate' }),
    true
  )
  assert.equal(
    canShowExternalCandidateToBuyer({
      confidence: 'probable_product_match',
      reviewStatus: 'candidate',
      matchScore: 0.92,
    }),
    true
  )
  assert.equal(canShowExternalCandidateToBuyer({ confidence: 'weak_match' }), false)
  assert.equal(canShowExternalCandidateToBuyer({ confidence: 'conflict' }), false)
  assert.equal(canShowExternalCandidateToBuyer({ confidence: 'exact_ean_match', reviewStatus: 'rejected' }), false)
})

test('buildExternalReferenceNotice always marks external facts as lower confidence', () => {
  const notice = buildExternalReferenceNotice({
    lang: 'ru',
    candidate: {
      confidence: 'exact_ean_match',
      fields: { ingredients: 'milk, sugar' },
    },
  })

  assert.match(notice.text, /внешним данным/i)
  assert.match(notice.text, /менее надёжными/i)
  assert.equal(notice.needsPackageCheck, true)
  assert.equal(notice.sourceLabel, 'external_reference')
})
