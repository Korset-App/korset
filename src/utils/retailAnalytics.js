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

export async function getStoreCatalogProducts(storeId) {
  const { data, error } = await supabase
    .from('store_products')
    .select(
      `
      id, ean, local_name, price_kzt, stock_status,
      shelf_zone, shelf_position, is_active, updated_at,
      global_products!store_products_global_product_id_fkey (
        name, brand, image_url, category, ingredients_raw, ingredients_kz, quantity
      )
    `
    )
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message ?? error)
  return data ?? []
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

export async function updateProductShelf(productId, storeId, shelfZone) {
  const { data, error } = await supabase
    .from('store_products')
    .update({ shelf_zone: shelfZone, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('store_id', storeId)
    .select('id')
  if (error) throw new Error(error.message ?? error)
  if (!data || data.length === 0) throw new Error('Update blocked: RLS or row not found')
}
