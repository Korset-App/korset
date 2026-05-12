const BASE_KEY = 'retail.dashboard.aiInsights'

function sumScans(items) {
  return items.reduce((sum, item) => sum + Number(item.scan_count || item.scanCount || 0), 0)
}

function productName(item) {
  return item?.name || item?.ean || 'EAN'
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

  if (topProduct && (!topProduct.name || !topProduct.image_url)) {
    insights.push(
      insight(
        'weak_product_data',
        'warning',
        'edit_note',
        {
          product: productName(topProduct),
          scans: Number(topProduct.scan_count || topProduct.scanCount || 0),
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
          scans: Number(topProduct.scan_count || topProduct.scanCount || 0),
        },
        70
      )
    )
  }

  return insights.sort((a, b) => a.priority - b.priority).slice(0, maxInsights)
}
