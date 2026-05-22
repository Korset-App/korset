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

test('buildRetailAIInsights detects repeated category gaps in unknown demand', () => {
  const insights = buildRetailAIInsights({
    scansCount: 16,
    totalProducts: 80,
    scanCoverage: 82,
    missedOpportunities: [
      { ean: '111', reason: 'not_in_catalog', category: 'Halal sweets', scan_count: 3 },
      { ean: '222', reason: 'not_in_catalog', category: 'Halal sweets', scan_count: 4 },
      { ean: '333', reason: 'not_in_catalog', category: 'Drinks', scan_count: 2 },
    ],
    topProducts: [],
    maxInsights: 4,
  })

  const categoryGap = insights.find((insight) => insight.id === 'category_gap_demand')
  assert.equal(categoryGap.values.category, 'Halal sweets')
  assert.equal(categoryGap.values.count, 2)
  assert.equal(categoryGap.values.scans, 7)
})

test('buildRetailAIInsights surfaces halal assortment opportunity from missed demand', () => {
  const insights = buildRetailAIInsights({
    scansCount: 10,
    totalProducts: 60,
    scanCoverage: 88,
    missedOpportunities: [
      {
        ean: '4870000000104',
        name: 'Halal marmalade',
        reason: 'not_in_catalog',
        category: 'Sweets',
        scan_count: 5,
      },
    ],
    topProducts: [],
  })

  const halalGap = insights.find((insight) => insight.id === 'halal_assortment_gap')
  assert.equal(halalGap.values.product, 'Halal marmalade')
  assert.equal(halalGap.values.count, 1)
  assert.equal(halalGap.values.scans, 5)
})

test('buildRetailAIInsights aggregates weak data quality across popular products', () => {
  const insights = buildRetailAIInsights({
    scansCount: 18,
    totalProducts: 90,
    scanCoverage: 91,
    missedOpportunities: [],
    topProducts: [
      { ean: '111', name: 'Ayran', scan_count: 7, image_url: '', halal_status: '' },
      { ean: '222', name: 'Bread', scan_count: 6, image_url: 'bread.jpg', ingredients_raw: '' },
      {
        ean: '333',
        name: 'Water',
        scan_count: 5,
        image_url: 'water.jpg',
        ingredients_raw: 'water',
        halal_status: 'likely',
        nutrition: { calories: 0 },
      },
    ],
    maxInsights: 4,
  })

  assert.deepEqual(
    insights.map((insight) => insight.id),
    ['weak_catalog_data', 'top_product_demand']
  )
  assert.equal(insights[0].values.count, 2)
  assert.equal(insights[0].values.scans, 13)
  assert.equal(insights[0].values.product, 'Ayran')
})

test('buildRetailAIInsights prioritizes same-category unavailable demand as an assortment action', () => {
  const insights = buildRetailAIInsights({
    scansCount: 30,
    totalProducts: 120,
    scanCoverage: 86,
    missedOpportunities: [
      { ean: '111', name: 'Greek yogurt', reason: 'out_of_stock', category: 'Dairy', scan_count: 4 },
      { ean: '222', name: 'Kefir', reason: 'out_of_stock', category: 'Dairy', scan_count: 3 },
      { ean: '333', name: 'Chips', reason: 'out_of_stock', category: 'Snacks', scan_count: 2 },
    ],
    topProducts: [],
    maxInsights: 4,
  })

  const restockGap = insights.find((insight) => insight.id === 'restock_category_gap')
  assert.equal(restockGap.values.category, 'Dairy')
  assert.equal(restockGap.values.count, 2)
  assert.equal(restockGap.values.scans, 7)
  assert.equal(restockGap.actionKey, 'retail.dashboard.aiInsights.restock_category_gap.action')
})

test('buildRetailAIInsights detects halal coverage gaps in popular scanned products', () => {
  const insights = buildRetailAIInsights({
    scansCount: 24,
    totalProducts: 100,
    scanCoverage: 92,
    missedOpportunities: [],
    topProducts: [
      {
        ean: '111',
        name: 'Marmalade',
        category: 'Sweets',
        scan_count: 8,
        image_url: 'marmalade.jpg',
        ingredients_raw: 'sugar, gelatin',
        halal_status: '',
        nutrition: { calories: 320 },
      },
      {
        ean: '222',
        name: 'Chocolate bar',
        category: 'Sweets',
        scan_count: 6,
        image_url: 'chocolate.jpg',
        ingredients_raw: 'cocoa, milk',
        halal_status: 'unknown',
        nutrition: { calories: 510 },
      },
      {
        ean: '333',
        name: 'Water',
        category: 'Drinks',
        scan_count: 5,
        image_url: 'water.jpg',
        ingredients_raw: 'water',
        halal_status: 'yes',
        nutrition: { calories: 0 },
      },
    ],
    maxInsights: 4,
  })

  const halalCoverage = insights.find((insight) => insight.id === 'halal_coverage_gap')
  assert.equal(halalCoverage.values.category, 'Sweets')
  assert.equal(halalCoverage.values.count, 2)
  assert.equal(halalCoverage.values.scans, 14)
  assert.equal(halalCoverage.values.product, 'Marmalade')
})

test('buildRetailAIInsights includes owner action keys for every insight', () => {
  const insights = buildRetailAIInsights({
    scansCount: 20,
    totalProducts: 80,
    scanCoverage: 45,
    lostRevenue: 5000,
    missedOpportunities: [
      { ean: '111', reason: 'not_in_catalog', category: 'Halal sweets', scan_count: 4 },
      { ean: '222', reason: 'not_in_catalog', category: 'Halal sweets', scan_count: 3 },
      { ean: '333', reason: 'out_of_stock', name: 'Milk', category: 'Dairy', scan_count: 5 },
      { ean: '444', reason: 'out_of_stock', name: 'Kefir', category: 'Dairy', scan_count: 4 },
    ],
    topProducts: [
      { ean: '555', name: 'Ayran', scan_count: 6, image_url: '', halal_status: '' },
      { ean: '666', name: 'Bread', scan_count: 5, image_url: 'bread.jpg', ingredients_raw: '' },
    ],
    maxInsights: 8,
  })

  assert.ok(insights.length > 0)
  for (const insight of insights) {
    assert.equal(insight.actionKey, `retail.dashboard.aiInsights.${insight.id}.action`)
  }
})

test('buildRetailAIInsights surfaces high alternative demand as owner action', () => {
  const insights = buildRetailAIInsights({
    scansCount: 32,
    totalProducts: 140,
    scanCoverage: 91,
    missedOpportunities: [],
    topProducts: [{ ean: '4870000000012', name: 'Yogurt', scan_count: 8 }],
    alternativeSummary: {
      total: 14,
      compareCount: 5,
      aiHelpCount: 4,
      topScenario: { scenario: 'fits_me', count: 9 },
      topSource: { ean: '4601751002907', count: 7 },
    },
    maxInsights: 4,
  })

  assert.equal(insights[0].id, 'alternative_decision_demand')
  assert.equal(insights[0].values.count, 14)
  assert.equal(insights[0].values.compares, 5)
  assert.equal(insights[0].values.aiHelp, 4)
  assert.equal(insights[0].values.scenario, 'fits_me')
  assert.equal(insights[0].values.ean, '4601751002907')
  assert.equal(Object.hasOwn(insights[0].values, 'userId'), false)
})
