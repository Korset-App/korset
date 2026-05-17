const BASE_KEY = 'retail.dashboard.aiInsights'

function sumScans(items) {
  return items.reduce((sum, item) => sum + Number(item.scan_count || item.scanCount || 0), 0)
}

function productName(item) {
  return item?.name || item?.ean || 'EAN'
}

function scanCount(item) {
  return Number(item?.scan_count || item?.scanCount || 0)
}

function textValue(value) {
  return String(value || '').trim()
}

function normalizedText(...values) {
  return values
    .map((value) => textValue(value).toLowerCase())
    .filter(Boolean)
    .join(' ')
}

function categoryName(item) {
  return (
    textValue(item?.category) ||
    textValue(item?.category_name) ||
    textValue(item?.categoryName) ||
    textValue(item?.subcategory) ||
    textValue(item?.subcategory_name) ||
    textValue(item?.subcategoryName)
  )
}

function findDemandCluster(items) {
  const buckets = new Map()

  for (const item of items) {
    const category = categoryName(item)
    if (!category) continue
    const key = category.toLowerCase()
    const current = buckets.get(key) ?? { category, count: 0, scans: 0 }
    current.count += 1
    current.scans += scanCount(item)
    buckets.set(key, current)
  }

  return [...buckets.values()]
    .filter((bucket) => bucket.count >= 2 || bucket.scans >= 5)
    .sort((a, b) => b.scans - a.scans || b.count - a.count)[0]
}

function hasHalalIntent(item) {
  const text = normalizedText(
    item?.name,
    item?.local_name,
    item?.query,
    item?.category,
    item?.subcategory,
    item?.notes,
    item?.tags
  )

  return /\bhalal\b|халал|حلال/.test(text)
}

function hasValue(item, keys) {
  return keys.some((key) => {
    const value = item?.[key]
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0
    return value !== undefined && value !== null && String(value).trim() !== ''
  })
}

function dataGaps(item) {
  const gaps = []
  if (!hasValue(item, ['image_url', 'imageUrl'])) gaps.push('image')
  if (!hasValue(item, ['ingredients_raw', 'ingredients', 'ingredients_kz', 'ingredientsKz'])) {
    gaps.push('composition')
  }
  if (!hasValue(item, ['halal_status', 'halalStatus', 'is_halal', 'isHalal'])) gaps.push('halal')
  if (!hasValue(item, ['nutrition', 'nutrition_facts', 'nutritionFacts', 'calories'])) {
    gaps.push('nutrition')
  }
  return gaps
}

function insight(id, tone, icon, values, priority) {
  return {
    id,
    tone,
    icon,
    values,
    priority,
    titleKey: `${BASE_KEY}.${id}.title`,
    bodyKey: `${BASE_KEY}.${id}.body`,
  }
}

export function buildRetailAIInsights({
  scansCount = 0,
  totalProducts = 0,
  scanCoverage = 0,
  lostRevenue = 0,
  missedOpportunities = [],
  topProducts = [],
  maxInsights = 4,
} = {}) {
  const insights = []
  const missed = Array.isArray(missedOpportunities) ? missedOpportunities : []
  const top = Array.isArray(topProducts) ? topProducts : []
  const unknownItems = missed.filter((item) => item.reason === 'not_in_catalog')
  const outOfStockItems = missed.filter((item) => item.reason === 'out_of_stock')
  const topProduct = top[0]
  const unknownCluster = findDemandCluster(unknownItems)
  const halalDemandItems = missed.filter(hasHalalIntent)
  const weakDataProducts = top
    .map((item) => ({ item, gaps: dataGaps(item), scans: scanCount(item) }))
    .filter(({ gaps, scans }) => gaps.length > 0 && scans > 0)

  if (unknownItems.length > 0) {
    insights.push(
      insight(
        'unknown_ean_demand',
        'danger',
        'barcode_scanner',
        {
          count: unknownItems.length,
          scans: sumScans(unknownItems),
          ean: unknownItems[0].ean,
        },
        10
      )
    )
  }

  if (outOfStockItems.length > 0) {
    insights.push(
      insight(
        'out_of_stock_demand',
        'warning',
        'inventory',
        {
          count: outOfStockItems.length,
          scans: sumScans(outOfStockItems),
          product: productName(outOfStockItems[0]),
        },
        20
      )
    )
  }

  if (unknownCluster) {
    insights.push(
      insight(
        'category_gap_demand',
        'warning',
        'category_search',
        {
          category: unknownCluster.category,
          count: unknownCluster.count,
          scans: unknownCluster.scans,
        },
        25
      )
    )
  }

  if (halalDemandItems.length > 0) {
    insights.push(
      insight(
        'halal_assortment_gap',
        'warning',
        'verified',
        {
          count: halalDemandItems.length,
          scans: sumScans(halalDemandItems),
          product: productName(halalDemandItems[0]),
        },
        28
      )
    )
  }

  if (scansCount > 0 && Number(scanCoverage) > 0 && Number(scanCoverage) < 70) {
    insights.push(
      insight(
        'low_catalog_coverage',
        Number(scanCoverage) < 40 ? 'danger' : 'warning',
        'query_stats',
        { percent: Math.round(Number(scanCoverage)) },
        30
      )
    )
  }

  if (Number(lostRevenue) > 0) {
    insights.push(
      insight('lost_revenue', 'warning', 'payments', { amount: Number(lostRevenue) }, 40)
    )
  }

  if (scansCount === 0 && totalProducts > 0) {
    insights.push(
      insight('activate_scans', 'info', 'qr_code_2', { products: Number(totalProducts) }, 50)
    )
  }

  if (weakDataProducts.length >= 2) {
    const scans = weakDataProducts.reduce((sum, { scans: itemScans }) => sum + itemScans, 0)
    insights.push(
      insight(
        'weak_catalog_data',
        'warning',
        'fact_check',
        {
          count: weakDataProducts.length,
          scans,
          product: productName(weakDataProducts[0].item),
          missing: weakDataProducts[0].gaps.join(', '),
        },
        55
      )
    )
  } else if (topProduct && (!topProduct.name || !topProduct.image_url)) {
    insights.push(
      insight(
        'weak_product_data',
        'warning',
        'edit_note',
        {
          product: productName(topProduct),
          scans: scanCount(topProduct),
        },
        60
      )
    )
  }

  if (topProduct && scansCount > 0) {
    insights.push(
      insight(
        'top_product_demand',
        'positive',
        'trending_up',
        {
          product: productName(topProduct),
          scans: scanCount(topProduct),
        },
        70
      )
    )
  }

  return insights.sort((a, b) => a.priority - b.priority).slice(0, maxInsights)
}
