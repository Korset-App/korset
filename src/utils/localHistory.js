import { supabase } from './supabase.js'

export const SCAN_HISTORY_STORAGE_KEY = 'korset_scan_history_cache_v2'

function toIsoDate(value) {
  if (!value) return new Date().toISOString()
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? new Date().toISOString() : value.toISOString()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function normalizeHistoryEntry(entry) {
  if (!entry?.ean) return null
  return {
    ownerKey: entry.ownerKey || 'guest',
    ean: String(entry.ean),
    name: entry.name || `Товар ${entry.ean}`,
    brand: entry.brand || null,
    image: entry.image || entry.images?.[0] || null,
    images: Array.isArray(entry.images) ? entry.images.filter(Boolean) : (entry.image ? [entry.image] : []),
    canonicalId: entry.canonicalId || entry.id || `ean:${entry.ean}`,
    source: entry.source || 'scan',
    scanDate: toIsoDate(entry.scanDate),
    storeId: entry.storeId || null,
  }
}

function readRawHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(SCAN_HISTORY_STORAGE_KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return raw.map(normalizeHistoryEntry).filter(Boolean)
  } catch {
    return []
  }
}

function writeRawHistory(items) {
  try {
    localStorage.setItem(SCAN_HISTORY_STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

function getHistoryItemKey(item) {
  return `${item?.storeId || 'global'}::${item?.ean || item?.canonicalId || 'unknown'}`
}

export function buildHistoryOwnerKey(user) {
  return user?.id ? `user:${user.id}` : 'guest'
}

export async function getCurrentHistoryOwnerKey() {
  try {
    const { data } = await supabase.auth.getUser()
    return buildHistoryOwnerKey(data?.user || null)
  } catch {
    return 'guest'
  }
}

export function readLocalScanHistory(ownerKey = 'guest') {
  return readRawHistory()
    .filter((item) => item && item.ownerKey === ownerKey)
    .sort((a, b) => new Date(b.scanDate).getTime() - new Date(a.scanDate).getTime())
}

export function getLocalScanHistoryCount(ownerKey = 'guest') {
  return readLocalScanHistory(ownerKey).length
}

export function writeLocalScanHistory(ownerKey, nextList) {
  const normalized = (nextList || []).map((item) => normalizeHistoryEntry({ ...item, ownerKey })).filter(Boolean)
  const list = readRawHistory()
  const foreign = list.filter((item) => item?.ownerKey !== ownerKey)
  writeRawHistory([...foreign, ...normalized])
}

export function emitLocalHistoryChanged(ownerKey = 'guest') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('korset:scan_added', {
    detail: {
      ownerKey,
      count: getLocalScanHistoryCount(ownerKey),
    },
  }))
}

export function buildLocalScanHistoryEntry(product, foundStatus = 'scan', storeId = null) {
  if (!product?.ean) return null
  return normalizeHistoryEntry({
    ean: product.ean,
    name: product.name || `Товар ${product.ean}`,
    brand: product.brand || null,
    image: product.image || product.images?.[0] || null,
    images: Array.isArray(product.images) ? product.images : (product.image ? [product.image] : []),
    canonicalId: product.canonicalId || product.id || `ean:${product.ean}`,
    source: product.source || foundStatus || 'scan',
    scanDate: new Date().toISOString(),
    storeId: storeId || product.storeId || null,
  })
}

export function appendLocalScanHistory(ownerKey, entry, limit = 50) {
  const normalized = normalizeHistoryEntry({ ...entry, ownerKey })
  if (!normalized) return
  const scoped = readLocalScanHistory(ownerKey).filter((item) => getHistoryItemKey(item) !== getHistoryItemKey(normalized))
  const next = [normalized, ...scoped].slice(0, limit)
  writeLocalScanHistory(ownerKey, next)
  emitLocalHistoryChanged(ownerKey)
}

export function clearLocalScanHistory(ownerKey = 'guest') {
  const list = readRawHistory()
  const foreign = list.filter((item) => item?.ownerKey !== ownerKey)
  writeRawHistory(foreign)
  emitLocalHistoryChanged(ownerKey)
}
