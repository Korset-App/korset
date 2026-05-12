export const CATALOG_SEARCH_HISTORY_STORAGE_KEY = 'korset_catalog_search_history_v1'

function normalizeSearchQuery(query) {
  return String(query || '')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeStoreKey(storeKey) {
  return String(storeKey || 'global').trim() || 'global'
}

function readRawSearchHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(CATALOG_SEARCH_HISTORY_STORAGE_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function writeRawSearchHistory(items) {
  try {
    localStorage.setItem(CATALOG_SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(items))
  } catch {
    return undefined
  }
}

function normalizeSearchEntry(entry) {
  const query = normalizeSearchQuery(entry?.query)
  if (query.length < 2) return null
  return {
    storeKey: normalizeStoreKey(entry?.storeKey),
    query,
    searchedAt: entry?.searchedAt || new Date().toISOString(),
  }
}

export function readCatalogSearchHistory(storeKey = 'global', limit = 6) {
  const scope = normalizeStoreKey(storeKey)
  return readRawSearchHistory()
    .map(normalizeSearchEntry)
    .filter((entry) => entry && entry.storeKey === scope)
    .sort((a, b) => new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime())
    .slice(0, limit)
}

export function appendCatalogSearchQuery(storeKey, query, limit = 6) {
  const nextEntry = normalizeSearchEntry({ storeKey, query, searchedAt: new Date().toISOString() })
  if (!nextEntry) return readCatalogSearchHistory(storeKey, limit)

  const scope = normalizeStoreKey(storeKey)
  const list = readRawSearchHistory().map(normalizeSearchEntry).filter(Boolean)
  const nextScoped = [
    nextEntry,
    ...list.filter(
      (entry) =>
        entry.storeKey === scope && entry.query.toLowerCase() !== nextEntry.query.toLowerCase()
    ),
  ].slice(0, limit)
  const foreign = list.filter((entry) => entry.storeKey !== scope)
  writeRawSearchHistory([...foreign, ...nextScoped])
  return nextScoped
}
