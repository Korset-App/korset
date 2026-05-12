import { supabase } from './supabase.js'
import { loadPrivacySettings } from './privacySettings.js'
import { addPendingScan } from './offlineDB.js'

export const SCAN_HISTORY_STORAGE_KEY = 'korset_scan_history_cache_v2'

function toIsoDate(value) {
  if (!value) return new Date().toISOString()
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? new Date().toISOString() : value.toISOString()
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
    images: Array.isArray(entry.images)
      ? entry.images.filter(Boolean)
      : entry.image
        ? [entry.image]
        : [],
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
  } catch {
    /* localStorage quota exceeded */
  }
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
  const normalized = (nextList || [])
    .map((item) => normalizeHistoryEntry({ ...item, ownerKey }))
    .filter(Boolean)
  const list = readRawHistory()
  const foreign = list.filter((item) => item?.ownerKey !== ownerKey)
  writeRawHistory([...foreign, ...normalized])
}

export function emitLocalHistoryChanged(ownerKey = 'guest') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('korset:scan_added', {
      detail: {
        ownerKey,
        count: getLocalScanHistoryCount(ownerKey),
      },
    })
  )
}

export function buildLocalScanHistoryEntry(product, foundStatus = 'scan', storeId = null) {
  if (!product?.ean) return null
  return normalizeHistoryEntry({
    ean: product.ean,
    name: product.name || `Товар ${product.ean}`,
    brand: product.brand || null,
    image: product.image || product.images?.[0] || null,
    images: Array.isArray(product.images) ? product.images : product.image ? [product.image] : [],
    canonicalId: product.canonicalId || product.id || `ean:${product.ean}`,
    source: product.source || foundStatus || 'scan',
    scanDate: new Date().toISOString(),
    storeId: storeId || product.storeId || null,
  })
}

export function appendLocalScanHistory(ownerKey, entry, limit = 50) {
  const normalized = normalizeHistoryEntry({ ...entry, ownerKey })
  if (!normalized) return
  const scoped = readLocalScanHistory(ownerKey).filter(
    (item) => getHistoryItemKey(item) !== getHistoryItemKey(normalized)
  )
  const next = [normalized, ...scoped].slice(0, limit)
  writeLocalScanHistory(ownerKey, next)
  emitLocalHistoryChanged(ownerKey)

  if (!navigator.onLine && normalized.ean) {
    addPendingScan({
      ean: normalized.ean,
      found_status: normalized.source || 'scan',
      store_id: normalized.storeId || null,
      scanned_at: normalized.scanDate || new Date().toISOString(),
    }).catch(() => {})
  }
}

export function clearLocalScanHistory(ownerKey = 'guest') {
  const list = readRawHistory()
  const foreign = list.filter((item) => item?.ownerKey !== ownerKey)
  writeRawHistory(foreign)
  emitLocalHistoryChanged(ownerKey)
}

// ─── Cloud sync ──────────────────────────────────────────────────────────────

/** Resolves a Supabase Promise with a hard timeout to prevent UI hangs. */
function withSyncTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('sync_timeout')), ms)),
  ])
}

/**
 * Merges two history arrays by (storeId, ean) key — most recent entry wins.
 * Used internally during cloud sync.
 */
function mergeHistoryLists(primary = [], secondary = []) {
  const map = new Map()
  for (const item of [...primary, ...secondary]) {
    if (!item?.ean) continue
    const key = getHistoryItemKey(item)
    const existing = map.get(key)
    if (!existing || new Date(item.scanDate).getTime() >= new Date(existing.scanDate).getTime()) {
      map.set(key, item)
    }
  }
  return Array.from(map.values()).sort((a, b) => new Date(b.scanDate) - new Date(a.scanDate))
}

/** Session guard: run sync at most once per browser session per user. */
const SYNC_SESSION_KEY = 'korset_history_synced_uid'

/**
 * Syncs local scan history with Supabase scan_events.
 *
 * Steps:
 *   1. Migrate guest scans to the logged-in user's ownerKey.
 *   2. Upload local scans missing from cloud (if analyticsEnabled).
 *   3. Download cloud scans missing locally (if localHistoryEnabled).
 *
 * Respects privacy settings. Runs at most once per session per user.
 *
 * @param {string} internalUserId - users.id FK (UUID)
 * @param {Object} user           - Supabase auth user object (for ownerKey)
 */
export async function syncScanHistoryWithCloud(internalUserId, user) {
  if (!internalUserId || !user) return

  // Run once per session per user
  if (sessionStorage.getItem(SYNC_SESSION_KEY) === internalUserId) return

  const privacy = loadPrivacySettings()
  const ownerKey = buildHistoryOwnerKey(user)
  const guestOwnerKey = 'guest'

  // ── Step 1: Migrate guest scans to logged-in user ──────────────────────────
  const guestHistory = readLocalScanHistory(guestOwnerKey)
  if (guestHistory.length > 0) {
    const existingUserHistory = readLocalScanHistory(ownerKey)
    const guestAsUser = guestHistory
      .map((item) => normalizeHistoryEntry({ ...item, ownerKey }))
      .filter(Boolean)
    const merged = mergeHistoryLists(existingUserHistory, guestAsUser)
    writeLocalScanHistory(ownerKey, merged)
    clearLocalScanHistory(guestOwnerKey)
  }

  const localHistory = readLocalScanHistory(ownerKey)

  // ── Step 2: Upload local scans missing from cloud ─────────────────────────
  if (privacy.analyticsEnabled && localHistory.length > 0) {
    try {
      const { data: existingRows } = await withSyncTimeout(
        supabase.from('scan_events').select('ean').eq('user_id', internalUserId).limit(200)
      )
      const existingEans = new Set((existingRows || []).map((r) => String(r.ean)))
      const toUpload = localHistory.filter((item) => !existingEans.has(String(item.ean)))

      if (toUpload.length > 0) {
        const rows = toUpload.map((item) => ({
          ean: item.ean,
          found_status: item.source || 'scan',
          user_id: internalUserId,
          store_id: item.storeId || null,
          app_version: '1.0',
        }))
        await withSyncTimeout(supabase.from('scan_events').insert(rows))
      }
    } catch (err) {
      console.warn('[localHistory] Failed to upload local scans to cloud:', err.message)
    }
  }

  // ── Step 3: Download cloud scans missing locally ──────────────────────────
  if (privacy.localHistoryEnabled) {
    try {
      const { data: cloudScans } = await withSyncTimeout(
        supabase
          .from('scan_events')
          .select('ean, scanned_at, store_id')
          .eq('user_id', internalUserId)
          .order('scanned_at', { ascending: false })
          .limit(50)
      )

      if (cloudScans?.length > 0) {
        const currentLocal = readLocalScanHistory(ownerKey)
        const localEans = new Set(currentLocal.map((h) => String(h.ean)))
        const toAdd = cloudScans
          .filter((scan) => !localEans.has(String(scan.ean)))
          .map((scan) =>
            normalizeHistoryEntry({
              ownerKey,
              ean: scan.ean,
              scanDate: scan.scanned_at,
              storeId: scan.store_id || null,
              source: 'cloud_sync',
            })
          )
          .filter(Boolean)

        if (toAdd.length > 0) {
          const updatedHistory = mergeHistoryLists(currentLocal, toAdd).slice(0, 50)
          writeLocalScanHistory(ownerKey, updatedHistory)
          emitLocalHistoryChanged(ownerKey)
        }
      }
    } catch (err) {
      console.warn('[localHistory] Failed to download cloud scans to local:', err.message)
    }
  }

  // Mark session as synced
  try {
    sessionStorage.setItem(SYNC_SESSION_KEY, internalUserId)
  } catch {
    /* quota */
  }
}
