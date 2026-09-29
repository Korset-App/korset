import { useState, useEffect, useMemo, useCallback } from 'react'
import { searchStoreProductsRPC } from '../domain/product/search.js'
import {
  appendCatalogSearchQuery,
  readCatalogSearchHistory,
  clearCatalogSearchHistory,
  removeCatalogSearchQuery,
} from '../domain/product/searchHistory.js'
import { buildSearchSuggestions } from '../domain/catalog/catalogSorting.js'
import { getEffectiveSearchQuery } from '../domain/product/searchQuality.js'

export function useCatalogSearch({ storeId, storeSlug, isOnline, location }) {
  const [q, setQ] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const urlQ = params.get('q')
      if (urlQ) return urlQ
    }
    return sessionStorage.getItem('korset_catalog_q') || ''
  })
  const [debouncedQuery, setDebouncedQuery] = useState(q)
  const [serverSearch, setServerSearch] = useState({ results: [], query: '', status: 'idle' })
  const [recentSearchesVersion, setRecentSearchesVersion] = useState(0)
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  // Sync with URL / location state
  useEffect(() => {
    if (!location) return
    const params = new URLSearchParams(location.search)
    const urlQ = params.get('q')
    if (urlQ !== null) {
      setQ(urlQ)
      sessionStorage.setItem('korset_catalog_q', urlQ)
    } else if (location.state?.q !== undefined) {
      setQ(location.state.q)
      sessionStorage.setItem('korset_catalog_q', location.state.q)
    }

    if (location.state?.resetAll) {
      setQ('')
      sessionStorage.removeItem('korset_catalog_q')
    }
  }, [location?.search, location?.state])

  // Persist query to session
  useEffect(() => {
    if (q) {
      sessionStorage.setItem('korset_catalog_q', q)
    } else {
      sessionStorage.removeItem('korset_catalog_q')
    }
  }, [q])

  // Debounce search query (250ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(q), 250)
    return () => clearTimeout(timer)
  }, [q])

  // Sync debounced query to URL query string so searches are shareable and reload-safe
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const currentQ = url.searchParams.get('q') || ''
    const trimmed = debouncedQuery.trim()
    if (trimmed && currentQ !== trimmed) {
      url.searchParams.set('q', trimmed)
      window.history.replaceState(window.history.state, '', url.pathname + url.search)
    } else if (!trimmed && currentQ) {
      url.searchParams.delete('q')
      window.history.replaceState(window.history.state, '', url.pathname + (url.search || ''))
    }
  }, [debouncedQuery])

  const hasQuery = q.trim().length > 0
  // Numeric-only input is treated as a barcode scan: require ≥4 digits before searching.
  // Regular text queries require ≥3 characters to avoid hammering Supabase on every keystroke.
  const isBarcode = /^\d+$/.test(debouncedQuery.trim())
  const minLen = isBarcode ? 4 : 3
  const isSearching = debouncedQuery.trim().length >= minLen
  const normalizedQuery = debouncedQuery.trim()
  const searchStoreKey = storeId || storeSlug || 'global'
  const canUseServerSearch = isSearching && isOnline && Boolean(storeId)

  // Server RPC search execution
  useEffect(() => {
    if (!canUseServerSearch) {
      setServerSearch({ results: [], query: '', status: 'idle' })
      return undefined
    }
    let cancelled = false
    setServerSearch((state) => ({ ...state, status: 'pending' }))
    const effectiveQuery = getEffectiveSearchQuery(normalizedQuery) || normalizedQuery
    searchStoreProductsRPC(storeId, effectiveQuery, { limit: 60 })
      .then((products) => {
        if (cancelled) return
        setServerSearch({ results: products, query: normalizedQuery, status: 'success' })
      })
      .catch(() => {
        if (cancelled) return
        setServerSearch({ results: [], query: normalizedQuery, status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [canUseServerSearch, normalizedQuery, storeId])

  const isSearchPending =
    canUseServerSearch &&
    (serverSearch.status === 'pending' || serverSearch.query !== normalizedQuery)

  const searchSuggestions = useMemo(
    () => (isSearching ? buildSearchSuggestions(normalizedQuery) : []),
    [isSearching, normalizedQuery]
  )

  const recentSearches = useMemo(
    () => readCatalogSearchHistory(searchStoreKey, 6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recentSearchesVersion, searchStoreKey]
  )

  const rememberCatalogSearch = useCallback(() => {
    if (normalizedQuery.length < 3 || isSearchPending) return
    appendCatalogSearchQuery(searchStoreKey, normalizedQuery)
    setRecentSearchesVersion((v) => v + 1)
  }, [isSearchPending, normalizedQuery, searchStoreKey])

  const clearSearchHistory = useCallback(() => {
    clearCatalogSearchHistory(searchStoreKey)
    setRecentSearchesVersion((v) => v + 1)
  }, [searchStoreKey])

  const removeSearchHistoryEntry = useCallback(
    (query) => {
      removeCatalogSearchQuery(searchStoreKey, query)
      setRecentSearchesVersion((v) => v + 1)
    },
    [searchStoreKey]
  )

  return {
    q,
    setQ,
    debouncedQuery,
    isSearching,
    hasQuery,
    normalizedQuery,
    serverSearch,
    isSearchPending,
    canUseServerSearch,
    searchSuggestions,
    recentSearches,
    isSearchFocused,
    setIsSearchFocused,
    rememberCatalogSearch,
    clearSearchHistory,
    removeSearchHistoryEntry,
  }
}
