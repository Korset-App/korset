import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRetailAIInsights } from '../../src/domain/retail/aiInsights.js'

test('overview aggregates do not establish missing ingredients or halal status', () => {
  const result = buildRetailAIInsights({
    scansCount: 40,
    totalProducts: 18,
    scanCoverage: 100,
    topProducts: [
      { name: 'Dairy A', image_url: 'image-a', scan_count: 20 },
      { name: 'Dairy B', image_url: 'image-b', scan_count: 20 },
    ],
    topProductDetailsAvailable: false,
    maxInsights: 10,
  })
  assert.equal(
    result.some((item) => ['halal_coverage_gap', 'weak_catalog_data'].includes(item.id)),
    false
  )
  assert.equal(
    result.some((item) => item.id === 'top_product_demand'),
    true
  )
})

test('a missing photo can still be identified from an aggregate that includes its field', () => {
  const result = buildRetailAIInsights({
    scansCount: 4,
    totalProducts: 18,
    topProducts: [{ name: 'Product', image_url: null, scan_count: 4 }],
    topProductDetailsAvailable: false,
  })
  assert.equal(
    result.some((item) => item.id === 'weak_product_data'),
    true
  )
})
