import { supabase } from "./supabase.js"

export const SCAN_HISTORY_STORAGE_KEY = "korset_scan_history_cache_v2"

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
  try {
    const raw = JSON.parse(localStorage.getItem(SCAN_HISTORY_STORAGE_KEY) || '[]')
    const list = Array.isArray(raw) ? raw : []
    return list.filter((item) => item && item.ownerKey === ownerKey)
  } catch {
    return []
  }
}

export function writeLocalScanHistory(ownerKey, nextList) {
  try {
    const raw = JSON.parse(localStorage.getItem(SCAN_HISTORY_STORAGE_KEY) || '[]')
    const list = Array.isArray(raw) ? raw : []
    const foreign = list.filter((item) => item?.ownerKey !== ownerKey)
    localStorage.setItem(SCAN_HISTORY_STORAGE_KEY, JSON.stringify([...foreign, ...nextList]))
  } catch {}
}
