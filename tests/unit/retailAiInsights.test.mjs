import assert from 'node:assert/strict'
import test from 'node:test'

import { buildRetailAIInsights } from '../../src/domain/retail/aiInsights.js'

test('buildRetailAIInsights prioritizes aggregate demand signals without user-level data', () => {
  const insights = buildRetailAIInsights({
    scansCount: 28,
    totalProducts: 120,
    scanCoverage: 46,
    lostRevenue: 18500,
    missedOpportunities: [
      { ean: '4870000000012', reason: 'not_in_catalog', scan_count: 5 },
      { ean: '4870000000098', reason: 'not_in_catalog', scan_count: 2 },
      { ean: '4870000000029', name: 'Ayran', reason: 'out_of_stock', scan_count: 4 },
    ],
    topProducts: [{ ean: '4870000000036', name: 'Kefir 1L', scan_count: 9 }],
  })

  assert.deepEqual(
    insights.map((insight) => insight.id),
    ['unknown_ean_demand', 'out_of_stock_demand', 'low_catalog_coverage', 'lost_revenue']
  )
  assert.equal(insights[0].values.count, 2)
  assert.equal(insights[0].values.scans, 7)
  assert.equal(insights[1].values.product, 'Ayran')
  assert.equal(insights[2].values.percent, 46)
  assert.equal(insights[3].values.amount, 18500)

  for (const insight of insights) {
    assert.equal(Object.hasOwn(insight.values, 'userId'), false)
    assert.equal(Object.hasOwn(insight.values, 'customer'), false)
  }
})

test('buildRetailAIInsights keeps the list small and respects maxInsights', () => {
  const insights = buildRetailAIInsights({
    scansCount: 20,
    totalProducts: 40,
    scanCoverage: 35,
    lostRevenue: 9000,
    maxInsights: 3,
    missedOpportunities: [
      { ean: '111', reason: 'not_in_catalog', scan_count: 3 },
      { ean: '222', reason: 'out_of_stock', scan_count: 2, name: 'Milk' },
    ],
    topProducts: [{ ean: '333', name: 'Bread', scan_count: 5 }],
  })

  assert.equal(insights.length, 3)
  assert.deepEqual(
    insights.map((insight) => insight.id),
    ['unknown_ean_demand', 'out_of_stock_demand', 'low_catalog_coverage']
  )
})

test('buildRetailAIInsights returns honest empty state when there is no signal', () => {
  assert.deepEqual(
    buildRetailAIInsights({
      scansCount: 0,
      totalProducts: 0,
      scanCoverage: 0,
      lostRevenue: 0,
      missedOpportunities: [],
      topProducts: [],
    }),
    []
  )
})

test('buildRetailAIInsights nudges activation when catalog exists but scans are absent', () => {
  const insights = buildRetailAIInsights({
    scansCount: 0,
    totalProducts: 35,
    scanCoverage: 0,
    missedOpportunities: [],
    topProducts: [],
  })

  assert.equal(insights.length, 1)
  assert.equal(insights[0].id, 'activate_scans')
  assert.equal(insights[0].values.products, 35)
})

test('buildRetailAIInsights flags weak data for frequently scanned products', () => {
  const insights = buildRetailAIInsights({
    scansCount: 8,
    totalProducts: 20,
    scanCoverage: 95,
    missedOpportunities: [],
    topProducts: [{ ean: '4870000000043', name: '', image_url: '', scan_count: 5 }],
  })

  assert.deepEqual(
    insights.map((insight) => insight.id),
    ['weak_product_data', 'top_product_demand']
  )
  assert.equal(insights[0].values.product, '4870000000043')
})
