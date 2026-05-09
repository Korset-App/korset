function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizeMissedItem(item) {
  return {
    ean: String(item?.ean || '').trim(),
    name: String(item?.name || '').trim(),
    reason: String(item?.reason || '').trim(),
    scanCount: toNumber(item?.scan_count ?? item?.scanCount),
  }
}

function normalizeTopProduct(item) {
  return {
    ean: String(item?.ean || '').trim(),
    name: String(item?.name || '').trim(),
    imageUrl: String(item?.image_url ?? item?.imageUrl ?? '').trim(),
    scanCount: toNumber(item?.scan_count ?? item?.scanCount),
  }
}

function totalScans(items) {
  return items.reduce((sum, item) => sum + item.scanCount, 0)
}

function topByScans(items) {
  return [...items].sort((a, b) => b.scanCount - a.scanCount)[0] ?? null
}

function createInsight(id, tone, icon, values = {}) {
  return {
    id,
    tone,
    icon,
    titleKey: `retail.dashboard.aiInsights.${id}.title`,
    bodyKey: `retail.dashboard.aiInsights.${id}.body`,
    values,
  }
}

export function buildRetailAIInsights({
  scansCount = 0,
  totalProducts = 0,
  scanCoverage = null,
  lostRevenue = 0,
  missedOpportunities = [],
  topProducts = [],
  maxInsights = 4,
} = {}) {
  const scans = toNumber(scansCount)
  const products = toNumber(totalProducts)
  const coverage = scanCoverage == null ? null : Math.max(0, Math.min(100, toNumber(scanCoverage)))
  const revenue = Math.max(0, toNumber(lostRevenue))
  const limit = Math.max(0, Math.min(5, toNumber(maxInsights, 4)))
  const missed = (Array.isArray(missedOpportunities) ? missedOpportunities : []).map(
    normalizeMissedItem
  )
  const top = (Array.isArray(topProducts) ? topProducts : []).map(normalizeTopProduct)

  if (limit === 0) return []

  const insights = []
  const unknownItems = missed.filter((item) => item.reason === 'not_in_catalog')
  const outOfStockItems = missed.filter((item) => item.reason === 'out_of_stock')

  if (unknownItems.length > 0) {
    const topUnknown = topByScans(unknownItems)
    insights.push(
      createInsight('unknown_ean_demand', 'danger', 'barcode_scanner', {
        count: unknownItems.length,
        scans: totalScans(unknownItems),
        ean: topUnknown?.ean || '',
      })
    )
  }

  if (outOfStockItems.length > 0) {
    const topOutOfStock = topByScans(outOfStockItems)
    insights.push(
      createInsight('out_of_stock_demand', 'warning', 'inventory', {
        count: outOfStockItems.length,
        scans: totalScans(outOfStockItems),
        product: topOutOfStock?.name || topOutOfStock?.ean || '',
      })
    )
  }

  if (scans > 0 && coverage != null && coverage < 70) {
    insights.push(
      createInsight('low_catalog_coverage', coverage < 40 ? 'danger' : 'warning', 'fact_check', {
        percent: Math.round(coverage),
      })
    )
  }

  if (revenue > 0) {
    insights.push(
      createInsight('lost_revenue', 'danger', 'trending_down', {
        amount: Math.round(revenue),
      })
    )
  }

  const topProduct = topByScans(top)
  const weakTopProduct = top.find(
    (product) => product.scanCount >= 3 && (!product.name || !product.imageUrl)
  )
  if (weakTopProduct) {
    insights.push(
      createInsight('weak_product_data', 'warning', 'edit_note', {
        product: weakTopProduct.name || weakTopProduct.ean,
        scans: weakTopProduct.scanCount,
      })
    )
  }

  if (topProduct?.scanCount >= 3) {
    insights.push(
      createInsight('top_product_demand', 'positive', 'trending_up', {
        product: topProduct.name || topProduct.ean,
        scans: topProduct.scanCount,
      })
    )
  }

  if (insights.length === 0 && products > 0 && scans === 0) {
    insights.push(
      createInsight('activate_scans', 'info', 'qr_code_scanner', {
        products,
      })
    )
  }

  return insights.slice(0, limit)
}
