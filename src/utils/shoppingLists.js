export const SHOPPING_LISTS_STORAGE_KEY = 'korset_local_shopping_lists_v1'

export function getStoreShoppingList(lists, storeId) {
  if (!storeId || !lists || typeof lists !== 'object') return []
  const value = lists[storeId]
  return Array.isArray(value) ? value.filter((ean) => typeof ean === 'string' && ean) : []
}

export function setStoreShoppingList(lists, storeId, eans) {
  if (!storeId) return lists || {}
  return {
    ...(lists && typeof lists === 'object' ? lists : {}),
    [storeId]: [...new Set((eans || []).filter((ean) => typeof ean === 'string' && ean))],
  }
}

export function toggleStoreShoppingItem(lists, storeId, ean) {
  if (!storeId || !ean) return lists || {}
  const eans = new Set(getStoreShoppingList(lists, storeId))
  if (eans.has(ean)) eans.delete(ean)
  else eans.add(ean)
  return setStoreShoppingList(lists, storeId, [...eans])
}

export function getCopyableStoreProducts(sourceEans, currentCatalog) {
  const available = new Map(
    (currentCatalog || [])
      .filter((product) => product?.ean && ['in_stock', 'low_stock'].includes(product.stockStatus))
      .map((product) => [product.ean, product])
  )
  return [...new Set(sourceEans || [])].map((ean) => available.get(ean)).filter(Boolean)
}

export function readGuestShoppingLists() {
  try {
    return JSON.parse(localStorage.getItem(SHOPPING_LISTS_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function writeGuestShoppingLists(lists) {
  localStorage.setItem(SHOPPING_LISTS_STORAGE_KEY, JSON.stringify(lists))
}
