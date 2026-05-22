import { supabase } from './supabase.js'

function cutoffISO(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export async function getScansCount(storeId, days) {
  const { count, error } = await supabase
    .from('scan_events')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .gte('scanned_at', cutoffISO(days))
  if (error) throw new Error(error.message ?? error)
  return count ?? 0
}

export async function getUniqueProductsScanned(storeId, days) {
  const { data, error } = await supabase
    .from('scan_events')
    .select('ean')
    .eq('store_id', storeId)
    .gte('scanned_at', cutoffISO(days))
  if (error) throw new Error(error.message ?? error)
  return new Set((data ?? []).map((r) => r.ean)).size
}

export async function getTotalProducts(storeId) {
  const { count, error } = await supabase
    .from('store_products')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('is_active', true)
  if (error) throw new Error(error.message ?? error)
  return count ?? 0
}

export async function getTopScannedProducts(storeId, days, limit = 5) {
  const { data, error } = await supabase.rpc('get_top_scanned_products', {
    p_store_id: storeId,
    p_days_back: days,
    p_limit: limit,
  })
  if (error) throw new Error(error.message ?? error)
  return data ?? []
}

export async function getMissedOpportunities(storeId, days) {
  const { data, error } = await supabase.rpc('get_missed_opportunities', {
    p_store_id: storeId,
    p_days_back: days,
  })
  if (error) throw new Error(error.message ?? error)
  return data ?? []
}

export async function getUniqueCustomers(storeId, days) {
  const { data, error } = await supabase.rpc('get_unique_customers', {
    p_store_id: storeId,
    p_days_back: days,
  })
  if (error) throw new Error(error.message ?? error)
  return Number(data ?? 0)
}

export async function getLostRevenue(storeId, days) {
  const { data, error } = await supabase.rpc('get_lost_revenue', {
    p_store_id: storeId,
    p_days_back: days,
  })
  if (error) throw new Error(error.message ?? error)
  return Number(data ?? 0)
}

export async function getScanCoverage(storeId, days) {
  const { data, error } = await supabase.rpc('get_scan_coverage', {
    p_store_id: storeId,
    p_days_back: days,
  })
  if (error) throw new Error(error.message ?? error)
  return Number(data ?? 0)
}

function countBy(items, keyFn) {
  const counts = new Map()
  for (const item of items) {
    const key = keyFn(item)
    if (!key) continue
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return counts
}

function topCount(counts) {
  let top = null
  for (const [key, count] of counts.entries()) {
    if (!top || count > top.count) top = { key, count }
  }
  return top
}

export function summarizeAlternativeEvents(events = []) {
  const list = Array.isArray(events) ? events : []
  const scenarioTop = topCount(countBy(list, (event) => event.scenario))
  const sourceTop = topCount(countBy(list, (event) => event.source_ean))

  return {
    total: list.length,
    compareCount: list.filter((event) => event.event_type === 'alternatives_compare_clicked')
      .length,
    aiHelpCount: list.filter((event) => event.event_type === 'alternatives_ai_help_clicked').length,
    openCount: list.filter((event) => event.event_type === 'alternatives_product_opened').length,
    scenarioSelectCount: list.filter(
      (event) => event.event_type === 'alternatives_scenario_selected'
    ).length,
    topScenario: scenarioTop ? { scenario: scenarioTop.key, count: scenarioTop.count } : null,
    topSource: sourceTop ? { ean: sourceTop.key, count: sourceTop.count } : null,
  }
}

export function mapAlternativeEventsSummaryRpcRow(row = {}) {
  const topScenario =
    row.top_scenario && Number(row.top_scenario_count || 0) > 0
      ? { scenario: row.top_scenario, count: Number(row.top_scenario_count || 0) }
      : null
  const topSource =
    row.top_source_ean && Number(row.top_source_count || 0) > 0
      ? { ean: row.top_source_ean, count: Number(row.top_source_count || 0) }
      : null

  return {
    total: Number(row.total_count || 0),
    compareCount: Number(row.compare_count || 0),
    aiHelpCount: Number(row.ai_help_count || 0),
    openCount: Number(row.open_count || 0),
    scenarioSelectCount: Number(row.scenario_select_count || 0),
    topScenario,
    topSource,
  }
}

export async function getAlternativeEventsSummary(storeId, days) {
  const { data, error } = await supabase.rpc('fn_get_alternative_events_summary', {
    p_store_id: storeId,
    p_days_back: days,
  })

  if (error) throw new Error(error.message ?? error)
  return mapAlternativeEventsSummaryRpcRow(Array.isArray(data) ? data[0] : data)
}

const PRODUCTS_PAGE_SIZE = 40

export async function getStoreCatalogProducts(storeId, { page = 0, search = '' } = {}) {
  const from = page * PRODUCTS_PAGE_SIZE
  const to = from + PRODUCTS_PAGE_SIZE - 1

  let query = supabase
    .from('store_products')
    .select(
      `
      id, ean, local_name, price_kzt, stock_status,
      shelf_zone, shelf_position, is_active, updated_at,
      global_products!store_products_global_product_id_fkey (
        name, brand, image_url, category, ingredients_raw, ingredients_kz, quantity
      )
    `,
      { count: 'exact' }
    )
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (search.trim()) {
    const s = search.trim()
    // Step 1: find matching global_product IDs (PostgREST can't filter
    // foreign tables inside .or(), so we do a separate query first)
    const { data: gpMatches } = await supabase
      .from('global_products')
      .select('id')
      .or(`name.ilike.%${s}%,brand.ilike.%${s}%`)

    const gpIds = (gpMatches ?? []).map((g) => g.id)

    // Step 2: OR filter on store_products columns + matched IDs
    const orParts = [`local_name.ilike.%${s}%`, `ean.ilike.%${s}%`]
    if (gpIds.length) orParts.push(`global_product_id.in.(${gpIds.join(',')})`)
    query = query.or(orParts.join(','))
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message ?? error)
  return { products: data ?? [], total: count ?? 0, page }
}

export async function updateProductPrice(productId, storeId, priceKzt) {
  const { data, error } = await supabase
    .from('store_products')
    .update({ price_kzt: priceKzt, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('store_id', storeId)
    .select('id')
  if (error) throw new Error(error.message ?? error)
  if (!data || data.length === 0) throw new Error('Update blocked: RLS or row not found')
}

export async function updateProductStock(productId, storeId, stockStatus) {
  const { data, error } = await supabase
    .from('store_products')
    .update({ stock_status: stockStatus, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('store_id', storeId)
    .select('id')
  if (error) throw new Error(error.message ?? error)
  if (!data || data.length === 0) throw new Error('Update blocked: RLS or row not found')
}

export async function deleteStoreProduct(productId, storeId) {
  const { error } = await supabase
    .from('store_products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('store_id', storeId)
  if (error) throw new Error(error.message ?? error)
}

export async function clearStoreCatalog(storeId) {
  const { data, error } = await supabase
    .from('store_products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('store_id', storeId)
    .eq('is_active', true)
    .select('id')
  if (error) throw new Error(error.message ?? error)
  return data
}
