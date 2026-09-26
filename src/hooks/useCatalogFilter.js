import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  checkProductFit,
  getAllCategoryKeys,
  getSubcategoryKeys,
} from '../utils/fitCheck.js'
import { CATEGORY_SHOWCASE_ORDER } from '../domain/product/catalogShowcase.js'
import {
  sortCatalogSearchProducts,
  analyzeCatalogSearchQuery,
} from '../domain/product/searchQuality.js'
import {
  sortCatalogProducts,
  mergeProductsBySearchKey,
  FIT_VERDICT_ORDER,
} from '../domain/catalog/catalogSorting.js'

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
      sessionStorage.removeItem('korset_catalog_category')
      sessionStorage.removeItem('korset_catalog_subcategories')
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

  // Fit count & active filters
  const activeFilterCount = useMemo(() => {
    if (!profile) return 0
    let count = 0
    if (profile.halal || profile.halalOnly) count += 1
    count += (profile.dietGoals || []).length
    count += (profile.allergens || []).length
    count += (profile.customAllergens || []).length
    return count
  }, [profile])

  const [fitCount, setFitCount] = useState(null)

  useEffect(() => {
    if (activeFilterCount === 0 || baseProducts.length === 0) {
      setFitCount(null)
      return undefined
    }
    let cancelled = false
    const timer = setTimeout(() => {
      let matches = 0
      for (const product of baseProducts) {
        if (checkProductFit(product, profile).fits) matches += 1
      }
      if (!cancelled) setFitCount(matches)
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [activeFilterCount, baseProducts, profile])

  // Filter & sort
  const list = useMemo(() => {
    if (!isSearching && !selectedCategory) return []

    let arr = [...baseProducts]

    if (!isSearching && selectedCategory) {
      arr = arr.filter((product) => product.category === selectedCategory)
      if (selectedSubcategories.length > 0) {
        arr = arr.filter((product) => selectedSubcategories.includes(product.subcategory))
      }
    }

    if (isSearching) {
      const searchQuery = analyzeCatalogSearchQuery(debouncedQuery)
      if (searchQuery.intent?.category) {
        arr = arr.filter((p) => p.category === searchQuery.intent.category)
      }
      arr = sortCatalogSearchProducts(arr, debouncedQuery, (product) => {
        const fit = checkProductFit(product, profile)
        return FIT_VERDICT_ORDER[fit.verdict] ?? (fit.fits ? 0 : 3)
      })
    }

    return sortCatalogProducts(arr, sort, profile, isSearching)
  }, [
    baseProducts,
    selectedCategory,
    selectedSubcategories,
    profile,
    debouncedQuery,
    sort,
    isSearching,
  ])

  const displayList = useMemo(() => {
    if (canUseServerSearch) {
      const activeServerResults = serverSearch.query === normalizedQuery ? serverSearch.results : []
      const merged = mergeProductsBySearchKey(activeServerResults, list)
      const rescored = sortCatalogSearchProducts(merged, debouncedQuery, (product) => {
        const fit = checkProductFit(product, profile)
        return FIT_VERDICT_ORDER[fit.verdict] ?? (fit.fits ? 0 : 3)
      })
      return sortCatalogProducts(rescored, sort, profile, true)
    }
    return list
  }, [canUseServerSearch, serverSearch, normalizedQuery, list, sort, profile, debouncedQuery])

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
    pendingCategory,
    isSubMenuOpen,
    setIsSubMenuOpen,
    isSortMenuOpen,
    setIsSortMenuOpen,
    categoryCountMap,
    activeCategoryKeys,
    subcategoryCountMap,
    activeSubcategoryKeys,
    activeFilterCount,
    fitCount,
    displayList,
    handleCategoryClick,
    handleBackToCategories,
  }
}
