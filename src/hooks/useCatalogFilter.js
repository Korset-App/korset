import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { checkProductFit, getAllCategoryKeys, getSubcategoryKeys } from '../utils/fitCheck.js'
import { CATEGORY_SHOWCASE_ORDER } from '../domain/product/catalogShowcase.js'
import { sortCatalogSearchProducts, hasAttributeMatch } from '../domain/product/searchQuality.js'
import { sortCatalogProducts, FIT_VERDICT_ORDER } from '../domain/catalog/catalogSorting.js'

export const DEFAULT_CATALOG_FILTERS = {
  halalOnly: false,
  sugarFree: false,
  lactoseFree: false,
  glutenFree: false,
  onSaleOnly: false,
  inStockOnly: false,
  withPhotoOnly: false,
}

export function applyCatalogExtraFilters(products, filters) {
  if (!products || products.length === 0) return []
  if (!filters) return products
  let arr = products
  if (filters.halalOnly) {
    arr = arr.filter((p) => hasAttributeMatch({ attribute: 'halal' }, p))
  }
  if (filters.sugarFree) {
    arr = arr.filter((p) => hasAttributeMatch({ attribute: 'sugar_free' }, p))
  }
  if (filters.lactoseFree) {
    arr = arr.filter((p) => hasAttributeMatch({ attribute: 'lactose_free' }, p))
  }
  if (filters.glutenFree) {
    arr = arr.filter((p) => hasAttributeMatch({ attribute: 'gluten_free' }, p))
  }
  if (filters.veganOnly) {
    arr = arr.filter((p) => hasAttributeMatch({ attribute: 'vegan' }, p))
  }
  if (filters.ketoOnly) {
    arr = arr.filter((p) => hasAttributeMatch({ attribute: 'keto' }, p))
  }
  if (filters.lowFatOnly) {
    arr = arr.filter((p) => hasAttributeMatch({ attribute: 'low_fat' }, p))
  }
  if (filters.kidFriendlyOnly) {
    arr = arr.filter((p) => hasAttributeMatch({ attribute: 'kid_friendly' }, p))
  }
  if (filters.onSaleOnly) {
    arr = arr.filter((p) => {
      const price = Number(p.priceKzt ?? p.price_kzt ?? p.price ?? 0)
      const oldPrice = Number(p.oldPriceKzt ?? p.old_price_kzt ?? p.oldPrice ?? p.old_price ?? 0)
      const discount = Number(p.discountPercent ?? p.discount_percent ?? 0)
      return (
        discount > 0 ||
        (oldPrice > 0 && price > 0 && oldPrice > price) ||
        (p.promoPrice && price > 0 && Number(p.promoPrice) < price)
      )
    })
  }
  if (filters.inStockOnly) {
    arr = arr.filter((p) => {
      if (p.stockStatus === 'out_of_stock' || p.stock_status === 'out_of_stock') return false
      if (p.in_stock === false || p.is_available === false) return false
      if (
        p.stock_quantity !== undefined &&
        p.stock_quantity !== null &&
        Number(p.stock_quantity) <= 0
      ) {
        return false
      }
      return true
    })
  }
  if (filters.withPhotoOnly) {
    arr = arr.filter((p) =>
      Boolean(p.image || p.image_url || p.imageUrl || p.photo_url || p.photoUrl)
    )
  }
  return arr
}

export function useCatalogFilter({
  baseProducts = [],
  profile,
  location,
  debouncedQuery,
  isSearching,
  normalizedQuery,
  canUseServerSearch,
  serverSearch,
}) {
  const [sort, setSort] = useState(() => sessionStorage.getItem('korset_catalog_sort') || 'fit')
  const [selectedCategory, setSelectedCategory] = useState(
    () => location?.state?.category || sessionStorage.getItem('korset_catalog_category') || null
  )
  const [selectedSubcategories, setSelectedSubcategories] = useState(() => {
    try {
      const val = sessionStorage.getItem('korset_catalog_subcategories')
      return val ? JSON.parse(val) : []
    } catch {
      return []
    }
  })

  const [extraFilters, setExtraFilters] = useState(() => {
    try {
      const val = sessionStorage.getItem('korset_catalog_extra_filters')
      return val ? { ...DEFAULT_CATALOG_FILTERS, ...JSON.parse(val) } : DEFAULT_CATALOG_FILTERS
    } catch {
      return DEFAULT_CATALOG_FILTERS
    }
  })
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const [searchCategoryFilter, setSearchCategoryFilter] = useState(null)
  const [prevQuery, setPrevQuery] = useState(normalizedQuery)

  if (prevQuery !== normalizedQuery) {
    setPrevQuery(normalizedQuery)
    setSearchCategoryFilter(null)
  }

  // Clear category navigation when actively searching so category filters never leak into search
  useEffect(() => {
    if (isSearching && selectedCategory) {
      setSelectedCategory(null)
      setSelectedSubcategories([])
      sessionStorage.removeItem('korset_catalog_category')
      sessionStorage.removeItem('korset_catalog_subcategories')
    }
  }, [isSearching, selectedCategory])

  const [pendingCategory, setPendingCategory] = useState(null)
  const categoryExitTimerRef = useRef(null)
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false)
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)

  // Sync category reset from navigation
  useEffect(() => {
    if (!location) return
    if (location.state?.resetCategory || location.state?.resetAll) {
      setSelectedCategory(null)
      setSelectedSubcategories([])
      setExtraFilters(DEFAULT_CATALOG_FILTERS)
      sessionStorage.removeItem('korset_catalog_category')
      sessionStorage.removeItem('korset_catalog_subcategories')
      sessionStorage.removeItem('korset_catalog_extra_filters')
    } else if (location.state?.category) {
      setSelectedCategory(location.state.category)
      sessionStorage.setItem('korset_catalog_category', location.state.category)
    }
  }, [location?.state])

  // Persist selections
  useEffect(() => {
    sessionStorage.setItem('korset_catalog_sort', sort)
  }, [sort])

  useEffect(() => {
    if (selectedCategory) {
      sessionStorage.setItem('korset_catalog_category', selectedCategory)
    } else {
      sessionStorage.removeItem('korset_catalog_category')
    }
  }, [selectedCategory])

  useEffect(() => {
    sessionStorage.setItem('korset_catalog_subcategories', JSON.stringify(selectedSubcategories))
  }, [selectedSubcategories])

  useEffect(() => {
    sessionStorage.setItem('korset_catalog_extra_filters', JSON.stringify(extraFilters))
  }, [extraFilters])

  const handleToggleExtraFilter = useCallback((key) => {
    setExtraFilters((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const activeExtraFilterCount = useMemo(() => {
    let count = 0
    if (extraFilters.halalOnly) count += 1
    if (extraFilters.sugarFree) count += 1
    if (extraFilters.lactoseFree) count += 1
    if (extraFilters.glutenFree) count += 1
    if (extraFilters.veganOnly) count += 1
    if (extraFilters.ketoOnly) count += 1
    if (extraFilters.lowFatOnly) count += 1
    if (extraFilters.kidFriendlyOnly) count += 1
    if (extraFilters.onSaleOnly) count += 1
    if (extraFilters.inStockOnly) count += 1
    if (extraFilters.withPhotoOnly) count += 1
    return count
  }, [extraFilters])

  const totalActiveFilterCount =
    activeExtraFilterCount +
    (selectedSubcategories.length > 0 ? 1 : 0) +
    (searchCategoryFilter ? 1 : 0)

  const resetAllFilters = useCallback(() => {
    setSelectedSubcategories([])
    setExtraFilters(DEFAULT_CATALOG_FILTERS)
    setSearchCategoryFilter(null)
    sessionStorage.removeItem('korset_catalog_subcategories')
    sessionStorage.removeItem('korset_catalog_extra_filters')
  }, [setSearchCategoryFilter])

  // Category counts
  const categoryCountMap = useMemo(() => {
    const map = {}
    for (const p of baseProducts) {
      if (p.category) {
        map[p.category] = (map[p.category] || 0) + 1
      }
    }
    return map
  }, [baseProducts])

  const activeCategoryKeys = useMemo(() => {
    const allKeys = getAllCategoryKeys()
    const knownKeys = new Set(allKeys)
    return [
      ...CATEGORY_SHOWCASE_ORDER.filter((key) => knownKeys.has(key)),
      ...allKeys.filter((key) => !CATEGORY_SHOWCASE_ORDER.includes(key)),
    ]
  }, [])

  // Subcategory counts
  const subcategoryCountMap = useMemo(() => {
    if (!selectedCategory) return {}
    const map = {}
    for (const p of baseProducts) {
      if (p.category === selectedCategory && p.subcategory) {
        map[p.subcategory] = (map[p.subcategory] || 0) + 1
      }
    }
    return map
  }, [baseProducts, selectedCategory])

  const activeSubcategoryKeys = useMemo(() => {
    if (!selectedCategory) return []
    return getSubcategoryKeys(selectedCategory).filter((k) => subcategoryCountMap[k])
  }, [selectedCategory, subcategoryCountMap])

  // Filter & sort
  const list = useMemo(() => {
    if (isSearching || !selectedCategory) return []

    let arr = baseProducts.filter((product) => product.category === selectedCategory)
    if (selectedSubcategories.length > 0) {
      arr = arr.filter((product) => selectedSubcategories.includes(product.subcategory))
    }
    arr = applyCatalogExtraFilters(arr, extraFilters)
    return sortCatalogProducts(arr, sort, profile, false)
  }, [
    baseProducts,
    selectedCategory,
    selectedSubcategories,
    extraFilters,
    profile,
    sort,
    isSearching,
  ])

  const rawSearchList = useMemo(() => {
    if (!isSearching) return []
    if (canUseServerSearch) {
      if (serverSearch.query === normalizedQuery && serverSearch.status === 'success') {
        const local = sortCatalogSearchProducts(
          baseProducts.filter((product) => product.storeSourceItemId),
          debouncedQuery,
          () => 3
        )
        return [...(serverSearch.results || []), ...local]
      }
      return []
    }
    // Offline fallback ONLY for small offline catalogs (< 2000 items)
    if (!canUseServerSearch && baseProducts.length > 0 && baseProducts.length < 2000) {
      return sortCatalogSearchProducts(baseProducts, debouncedQuery, (product) => {
        const fit = checkProductFit(product, profile)
        return FIT_VERDICT_ORDER[fit.verdict] ?? (fit.fits ? 0 : 3)
      })
    }
    return []
  }, [
    isSearching,
    canUseServerSearch,
    serverSearch.query,
    serverSearch.status,
    serverSearch.results,
    normalizedQuery,
    debouncedQuery,
    baseProducts,
    profile,
  ])

  const searchCategoryCounts = useMemo(() => {
    if (!isSearching || rawSearchList.length === 0) return {}
    const counts = {}
    for (const p of rawSearchList) {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1
      }
    }
    return counts
  }, [isSearching, rawSearchList])

  const displayList = useMemo(() => {
    if (!isSearching) return list

    let arr = rawSearchList
    if (searchCategoryFilter) {
      arr = arr.filter((p) => p.category === searchCategoryFilter)
    }
    arr = applyCatalogExtraFilters(arr, extraFilters)

    if (sort === 'cheap' || sort === 'pricey' || sort === 'protein' || sort === 'sugar') {
      return sortCatalogProducts(arr, sort, profile, true)
    }
    return arr
  }, [isSearching, list, rawSearchList, searchCategoryFilter, extraFilters, sort, profile])

  useEffect(() => {
    return () => {
      if (categoryExitTimerRef.current) clearTimeout(categoryExitTimerRef.current)
    }
  }, [])

  const handleCategoryClick = useCallback(
    (catKey) => {
      if (categoryExitTimerRef.current) clearTimeout(categoryExitTimerRef.current)
      setPendingCategory(catKey)
      categoryExitTimerRef.current = setTimeout(() => {
        setSelectedCategory(catKey)
        setSelectedSubcategories([])
        setPendingCategory(null)
        categoryExitTimerRef.current = null
      }, 80)
    },
    [setSelectedSubcategories]
  )

  const handleBackToCategories = useCallback(() => {
    if (categoryExitTimerRef.current) clearTimeout(categoryExitTimerRef.current)
    setPendingCategory(null)
    setSelectedCategory(null)
    setSelectedSubcategories([])
    setIsSubMenuOpen(false)
    setIsSortMenuOpen(false)
  }, [setSelectedSubcategories])

  return {
    sort,
    setSort,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategories,
    setSelectedSubcategories,
    extraFilters,
    setExtraFilters,
    handleToggleExtraFilter,
    activeExtraFilterCount,
    totalActiveFilterCount,
    resetAllFilters,
    isFilterDrawerOpen,
    setIsFilterDrawerOpen,
    pendingCategory,
    isSubMenuOpen,
    setIsSubMenuOpen,
    isSortMenuOpen,
    setIsSortMenuOpen,
    categoryCountMap,
    activeCategoryKeys,
    subcategoryCountMap,
    activeSubcategoryKeys,
    displayList,
    searchCategoryFilter,
    setSearchCategoryFilter,
    searchCategoryCounts,
    rawSearchCount: rawSearchList.length,
    handleCategoryClick,
    handleBackToCategories,
  }
}
