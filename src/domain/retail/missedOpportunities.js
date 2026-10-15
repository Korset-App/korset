const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

function readError(error) {
  if (error instanceof Error) return error
  return Object.assign(new Error(error?.message ?? String(error)), error)
}

export async function getMissedOpportunitiesPage(
  client,
  storeId,
  days,
  requestedLimit = DEFAULT_LIMIT
) {
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(MAX_LIMIT, Math.trunc(requestedLimit)))
    : DEFAULT_LIMIT
  const { data, error } = await client.rpc('get_missed_opportunities', {
    p_store_id: storeId,
    p_days_back: days,
    p_limit: limit + 1,
  })
  if (error) throw readError(error)

  const rows = (data ?? []).slice(0, limit)
  const eans = [
    ...new Set(rows.map((row) => row.ean).filter((ean) => typeof ean === 'string' && ean.trim())),
  ]
  if (eans.length === 0) return { items: [], hasMore: (data ?? []).length > limit, limit }

  const storeResult = await client
    .from('store_products')
    .select('ean, stock_status')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .in('ean', eans)
  if (storeResult.error) throw readError(storeResult.error)

  const globalResult = await client
    .from('global_products')
    .select('ean, name, image_url')
    .eq('is_active', true)
    .in('ean', eans)
  if (globalResult.error) throw readError(globalResult.error)

  const storeByEan = new Map((storeResult.data ?? []).map((row) => [row.ean, row]))
  const globalByEan = new Map((globalResult.data ?? []).map((row) => [row.ean, row]))
  const items = rows.flatMap((row) => {
    if (typeof row.ean !== 'string' || !row.ean.trim()) return []
    const storeProduct = storeByEan.get(row.ean)
    if (storeProduct && storeProduct.stock_status !== 'out_of_stock') return []
    const globalProduct = globalByEan.get(row.ean)
    return [
      {
        ean: row.ean,
        scan_count: Number(row.miss_count) || 0,
        name: globalProduct?.name ?? row.name ?? null,
        image_url: globalProduct?.image_url ?? null,
        reason: storeProduct ? 'out_of_stock' : 'not_in_catalog',
      },
    ]
  })
  return { items, hasMore: (data ?? []).length > limit, limit }
}
