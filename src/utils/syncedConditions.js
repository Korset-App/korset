import { supabase } from './supabase.js'
import {
  applySyncedConditions,
  applySyncedRegularFallback,
} from '../domain/product/syncedConditions.js'

const CHUNK_SIZE = 500
const defaultRpc = (...args) => supabase.rpc(...args)
let unavailableUntil = 0

export async function hydrateSyncedConditions(
  storeId,
  products,
  { rpc = defaultRpc, now = Date.now(), isCancelled = () => false } = {}
) {
  if (!Array.isArray(products) || products.length === 0) return products
  if (!storeId || isCancelled() || (rpc === defaultRpc && Date.now() < unavailableUntil)) {
    return products.map((product) => applySyncedRegularFallback(product))
  }

  const eans = [
    ...new Set(
      products
        .map((product) => product?.ean)
        .filter(Boolean)
        .map(String)
    ),
  ]
  const requestedEans = new Set(eans)
  const byEan = new Map()
  const successfulEans = new Set()

  for (let i = 0; i < eans.length; i += CHUNK_SIZE) {
    if (isCancelled()) break
    try {
      const { data, error } = await rpc('korset_get_store_product_conditions', {
        p_store_id: storeId,
        p_eans: eans.slice(i, i + CHUNK_SIZE),
      })
      if (error && rpc === defaultRpc && ['PGRST202', '42883'].includes(error.code)) {
        unavailableUntil = Date.now() + 300000
        break
      }
      if (error || !Array.isArray(data)) continue
      for (const ean of eans.slice(i, i + CHUNK_SIZE)) successfulEans.add(ean)
      for (const row of data) {
        if (row?.ean && requestedEans.has(String(row.ean))) byEan.set(String(row.ean), row)
      }
    } catch {
      // The projected regular price remains usable when the optional RPC is unavailable.
    }
  }

  if (isCancelled()) return products.map((product) => applySyncedRegularFallback(product))

  return products.map((product) => {
    const eanStr = String(product?.ean)
    if (byEan.has(eanStr)) {
      const applied = applySyncedConditions(product, byEan.get(eanStr), now)
      return applied === product ? applySyncedRegularFallback(product) : applied
    }
    const fallback = applySyncedRegularFallback(product)
    return successfulEans.has(eanStr) && product?.syncConditions
      ? { ...fallback, syncConditions: null, conditionsUnavailable: false, conditionsStale: false }
      : fallback
  })
}
