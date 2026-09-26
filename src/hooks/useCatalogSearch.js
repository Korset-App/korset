import { useState, useEffect, useMemo, useCallback } from 'react'
import { searchStoreProductsRPC } from '../domain/product/search.js'
import {
  appendCatalogSearchQuery,
  readCatalogSearchHistory,
} from '../domain/product/searchHistory.js'
import { buildSearchSuggestions } from '../domain/catalog/catalogSorting.js'

export function useCatalogSearch({ storeId, storeSlug, isOnline, location }) {
  const [q, setQ] = useState(() => sessionStorage.getItem('korset_catalog_q') || '')
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
    sessionStorage.setItem('korset_catalog_q', q)
  }, [q])

  // Debounce search query (250ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(q), 250)
    return () => clearTimeout(timer)
  }, [q])

  const hasQuery = q.trim().length > 0
  const isSearching = debouncedQuery.trim().length > 0
  const normalizedQuery = debouncedQuery.trim()
  const searchStoreKey = storeId || storeSlug || 'global'
  const canUseServerSearch =
    isSearching && isOnline && Boolean(storeId) && normalizedQuery.length >= 2

  // Server RPC search execution
  useEffect(() => {
    if (!canUseServerSearch) return undefined
    let cancelled = false
    setServerSearch((state) => ({ ...state, status: 'pending' }))
    searchStoreProductsRPC(storeId, normalizedQuery, { limit: 60 })
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
    if (normalizedQuery.length < 2 || isSearchPending) return
    appendCatalogSearchQuery(searchStoreKey, normalizedQuery)
    setRecentSearchesVersion((v) => v + 1)
  }, [isSearchPending, normalizedQuery, searchStoreKey])

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
  }
}
