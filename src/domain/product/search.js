import { mapSearchRowToProduct } from './searchMapping.js'
import { supabase } from '../../utils/supabase.js'
import { hydrateSyncedConditions } from '../../utils/syncedConditions.js'

export { mapSearchRowToProduct }

export async function searchStoreProductsRPC(storeId, query, { limit = 30, offset = 0 } = {}) {
  const normalizedQuery = String(query || '').trim()
  if (!storeId || normalizedQuery.length < 2) return []

  const { data, error } = await supabase.rpc('fn_search_store_products', {
    p_store_id: storeId,
    p_query: normalizedQuery,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) throw new Error(error.message ?? error)
  return hydrateSyncedConditions(storeId, (data || []).map(mapSearchRowToProduct))
}
