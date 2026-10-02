import { isUuid } from '../domain/product/model.js'

export function sourceShoppingId(ref) {
  return typeof ref === 'string' && ref.startsWith('si:') && isUuid(ref.slice(3))
    ? ref.slice(3)
    : null
}

export async function loadSourceShoppingItems(client, userId, storeId) {
  const rows = []
  for (let from = 0; ; from += 500) {
    const { data, error } = await client
      .from('store_source_shopping_items')
      .select('id,store_source_item_id,added_at')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .order('id')
      .range(from, from + 499)
    if (['42P01', 'PGRST205'].includes(error?.code)) return []
    if (error) throw error
    rows.push(...(data || []).map((row) => ({ ...row, store_id: storeId })))
    if (!data || data.length < 500) return rows
  }
}
