import { useState, useMemo, useEffect, useCallback, useRef, forwardRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso'
import {
  checkProductFit,
  formatPrice,
  getCategoryLabel,
  getSubcategoryLabel,
  getAllCategoryKeys,
  getSubcategoryKeys,
} from '../utils/fitCheck.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { useOffline } from '../contexts/OfflineContext.jsx'
import { useI18n } from '../i18n/index.js'
import { getLocalName } from '../utils/localName.js'

import { getCatalogFromIndexedDB } from '../utils/offlineDB.js'
import {
  buildProductPath,
  buildComparePath,
  buildScanPath,
  buildStorePublicPath,
} from '../utils/routes.js'
import { getDisplayQuantity } from '../utils/parseQuantity.js'
import { CATEGORY_SHOWCASE_ORDER, getCategoryShowcase } from '../domain/product/catalogShowcase.js'
import { getProductSearchDiagnosticsAttrs } from '../domain/product/searchDiagnostics.js'
import { searchStoreProductsRPC } from '../domain/product/search.js'
import {
  buildCatalogProductCardBadges,
  getCatalogProductCardKcal,
} from '../domain/catalog/catalogProductCardModel.js'
import CatalogProductCard from '../components/catalog/CatalogProductCard.jsx'
import { CompareIcon } from '../components/icons/CompareIcon.jsx'
import {
  ArrowBackIcon,
  StorefrontIcon,
  CloseIcon,
  BarcodeScannerIcon,
  ChevronDownIcon,
  ExploreIcon,
  FilterIcon,
  FilterIconActive,
  InventoryIcon,
  SortFitIcon,
  SortCheapIcon,
  SortPriceyIcon,
  SortProteinIcon,
  SortSugarIcon,
} from '../components/icons/index.js'
import {
  sortCatalogSearchProducts,
  analyzeCatalogSearchQuery,
} from '../domain/product/searchQuality.js'
import {
  appendCatalogSearchQuery,
  readCatalogSearchHistory,
} from '../domain/product/searchHistory.js'

const IconSearch = (
  <svg width="24" height="24" viewBox="0 0 72 72" fill="currentColor">
    <path d="M28.131 10.632c-6.262 0-12.141 3.348-15.342 8.738-.282.474-.126 1.089.349 1.37.16.096.336.141.51.141.342 0 .674-.174.861-.489 2.843-4.786 8.062-7.76 13.622-7.76.553 0 1-.447 1-1 0-.553-.447-1-1-1zM11.967 23.646a1 1 0 00-1.201.746c-.299 1.276-.468 2.067-.468 3.487 0 .553.448 1 1 1s1-.447 1-1c0-1.205.135-1.834.415-3.032a1 1 0 00-.746-1.201zM66.613 57.793L50.471 41.652a13.5 13.5 0 00-1.17-.877 24.46 24.46 0 003.33-12.311c0-13.51-10.99-24.5-24.5-24.5S3.631 14.954 3.631 28.464s10.991 24.5 24.5 24.5c4.81 0 9.296-1.399 13.084-3.801.205.339.462.666.77.974l16.142 16.143a5.99 5.99 0 004.244 1.756 5.99 5.99 0 004.243-1.756 5.99 5.99 0 001.756-4.242 5.99 5.99 0 00-1.756-4.244zM7.631 28.465c0-11.304 9.196-20.5 20.5-20.5s20.5 9.196 20.5 20.5-9.197 20.5-20.5 20.5-20.5-9.196-20.5-20.5zm56.153 34.986a2 2 0 01-2.83 0L44.813 47.309c-.14-.139-.192-.232-.199-.232.003-.043.058-.455 1.201-1.596 1.14-1.143 1.552-1.195 1.565-1.203.026.008.119.06.263.203l16.14 16.141a2 2 0 010 2.829z" />
  </svg>
)

const IconHistory = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 8v4l2.5 2.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.6 5.6 4.34 6.87l2.54.01M4.32 4.33l.02 2.54M3 12a9 9 0 0 0 13.5 7.79M19.8 16.5A9 9 0 0 0 5.67 5.6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const CATALOG_SORT_OPTIONS = [
  { id: 'fit', labelKey: 'catalog.sort.fit', Icon: SortFitIcon },
  { id: 'cheap', labelKey: 'catalog.sort.cheap', Icon: SortCheapIcon },
  { id: 'pricey', labelKey: 'catalog.sort.pricey', Icon: SortPriceyIcon },
  { id: 'protein', labelKey: 'catalog.sort.protein', Icon: SortProteinIcon },
  { id: 'sugar', labelKey: 'catalog.sort.sugar', Icon: SortSugarIcon },
]

const IconListActive = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
    <g transform="rotate(180,8,8)">
      <rect x="0.5" y="2.5" width="7" height="1" rx="0.5" />
      <rect x="10.5" y="1.5" width="3" height="3" rx="1.5" />
      <rect x="0.5" y="7.5" width="7" height="1" rx="0.5" />
      <rect x="10.5" y="6.5" width="3" height="3" rx="1.5" />
      <rect x="0.5" y="12.5" width="7" height="1" rx="0.5" />
      <rect x="10.5" y="11.5" width="3" height="3" rx="1.5" />
    </g>
  </svg>
)

const IconList = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
    <g transform="rotate(180,8,8)">
      <rect x="0.5" y="2.5" width="7" height="1" rx="0.5" />
      <rect x="11" y="2" width="2" height="2" rx="0.5" />
      <rect x="0.5" y="7.5" width="7" height="1" rx="0.5" />
      <rect x="11" y="7" width="2" height="2" rx="0.5" />
      <rect x="0.5" y="12.5" width="7" height="1" rx="0.5" />
      <rect x="11" y="12" width="2" height="2" rx="0.5" />
    </g>
  </svg>
)

const IconGridActive = (
  <svg width="18" height="18" viewBox="0 0 30 30" fill="currentColor">
    <path d="M5 4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H5zm12 0a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-8zM5 16a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H5zm12 0a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-8z" />
  </svg>
)

const IconGrid = (
  <svg width="18" height="18" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="5" y="5" width="8" height="8" rx="1" />
    <rect x="17" y="5" width="8" height="8" rx="1" />
    <rect x="5" y="17" width="8" height="8" rx="1" />
    <rect x="17" y="17" width="8" height="8" rx="1" />
  </svg>
)

function getVerdictConfig(fit, t) {
  const v = fit.verdict
  if (v === 'danger') return { cls: 'danger', icon: 'cancel', label: t('catalog.verdict.danger') }
  if (v === 'warning')
    return { cls: 'warning', icon: 'error_outline', label: t('catalog.verdict.warning') }
  if (v === 'caution')
    return { cls: 'caution', icon: 'warning', label: t('catalog.verdict.caution') }
  return { cls: 'safe', icon: 'check_circle', label: t('catalog.verdict.safe') }
}

const GridList = forwardRef(({ style, children, ...props }, ref) => (
  <div
    ref={ref}
    {...props}
    style={{
      ...style,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 10,
      paddingLeft: 20,
      paddingRight: 20,
      paddingBottom: 100,
    }}
  >
    {children}
  </div>
))

const GridItem = forwardRef(({ style, children, ...props }, ref) => (
  <div
    ref={ref}
    {...props}
    style={{
      ...style,
      width: 'calc(50% - 5px)',
      boxSizing: 'border-box',
    }}
  >
    {children}
  </div>
))

const gridComponents = { List: GridList, Item: GridItem }

const FIT_VERDICT_ORDER = { safe: 0, caution: 1, warning: 2, danger: 3 }

function getProductSearchKey(product) {
  return product.globalProductId || product.ean || product.storeProductId || product.canonicalId
}

function mergeProductsBySearchKey(primary, secondary) {
  const seen = new Set()
  const merged = []
  for (const product of [...primary, ...secondary]) {
    const key = getProductSearchKey(product)
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(product)
  }
  return merged
}

function getNutrientValue(product, type) {
  if (!product) return null
  let nutrition = product.nutritionPer100 || product.nutriments || product.nutriments_json
  if (!nutrition) return null
  if (typeof nutrition === 'string') {
    try {
      nutrition = JSON.parse(nutrition)
    } catch {
      return null
    }
  }
  if (!nutrition || typeof nutrition !== 'object') return null
  if (type === 'protein') {
    const val = nutrition.protein ?? nutrition.proteins ?? nutrition.proteins_100g
    return val != null ? Number(val) : null
  }
  if (type === 'sugar') {
    const val = nutrition.sugar ?? nutrition.sugars ?? nutrition.sugars_100g
    return val != null ? Number(val) : null
  }
  return null
}

function getFitSortScore(product, profile) {
  const fit = checkProductFit(product, profile)
  return FIT_VERDICT_ORDER[fit.verdict] ?? (fit.fits ? 0 : 3)
}

function sortCatalogProducts(products, sort, profile, isSearching) {
  if (products.length <= 1) return products

  if (sort === 'cheap') {
    return [...products].sort((a, b) => (a.priceKzt || 0) - (b.priceKzt || 0))
  }

  if (sort === 'pricey') {
    return [...products].sort((a, b) => (b.priceKzt || 0) - (a.priceKzt || 0))
  }

  if (sort === 'protein') {
    return products
      .map((product) => ({ product, value: getNutrientValue(product, 'protein') ?? 0 }))
      .sort((a, b) => b.value - a.value)
      .map((item) => item.product)
  }

  if (sort === 'sugar') {
    return products
      .map((product) => ({ product, value: getNutrientValue(product, 'sugar') }))
      .sort((a, b) => {
        if (a.value == null && b.value != null) return 1
        if (a.value != null && b.value == null) return -1
        if (a.value == null && b.value == null) return 0
        return a.value - b.value
      })
      .map((item) => item.product)
  }

  return products
    .map((product) => ({
      product,
      fitScore: getFitSortScore(product, profile),
      relevanceTier: product.relevanceTier != null ? product.relevanceTier : 99,
      searchRank: product.searchRank || 0,
    }))
    .sort((a, b) => {
      if (isSearching) {
        if (a.relevanceTier !== b.relevanceTier) return a.relevanceTier - b.relevanceTier
        const rankDiff = b.searchRank - a.searchRank
        if (rankDiff !== 0) return rankDiff
      }

      return a.fitScore - b.fitScore
    })
    .map((item) => item.product)
}

function buildSearchSuggestions(query) {
  const normalized = query.trim().replace(/\s+/g, ' ')
  const suggestions = []
  const addSuggestion = (value) => {
    const next = value.trim()
    if (next.length >= 2 && next !== normalized && !suggestions.includes(next)) {
      suggestions.push(next)
    }
  }

  if (normalized.includes(' ')) {
    addSuggestion(normalized.split(' ')[0])
  }

  const compactDigits = normalized.replace(/\D/g, '')
  if (compactDigits.length >= 6) {
    addSuggestion(compactDigits)
  }

  const separatorMatch = normalized.match(/^(.+?)[,;:]/)
  if (separatorMatch?.[1]) {
    addSuggestion(separatorMatch[1])
  }

  const sq = analyzeCatalogSearchQuery(normalized)
  if (sq.intent?.category) {
    if (sq.intent.subcategory === 'milk') {
      addSuggestion(normalized + ' 1л')
      addSuggestion(normalized + ' 3.2%')
      addSuggestion(sq.mode === 'product' ? normalized + ' топленое' : normalized)
    } else if (sq.intent.subcategory === 'water') {
      addSuggestion(normalized + ' 1.5л')
      addSuggestion(normalized + ' минеральная')
      addSuggestion(normalized + ' негазированная')
    } else if (sq.intent.subcategory === 'chocolate' || sq.intent.subcategory === 'candy') {
      addSuggestion(normalized + ' молочный')
      addSuggestion(normalized + ' горький')
    }
  }

  return suggestions.slice(0, 3)
}

const ListFooter = forwardRef(({ style, ...props }, ref) => (
  <div ref={ref} style={{ ...style, height: 100 }} {...props} />
))

function CategoryShowcaseCard({ categoryKey, label, onSelect, index, isActive, lang }) {
  const showcase = getCategoryShowcase(categoryKey)

  return (
    <button
      type="button"
      className="catalog-category-card"
      data-category={categoryKey}
      data-variant={showcase.variant}
      data-tone={showcase.tone}
      data-text={showcase.textTone}
      data-active={isActive ? 'true' : 'false'}
      style={{
        '--catalog-card-index': index,
        '--cat-image-scale': showcase.imageScale || undefined,
        '--cat-image-x': showcase.imageX || undefined,
        '--cat-image-y': showcase.imageY || undefined,
      }}
      onClick={() => onSelect(categoryKey)}
      aria-label={label}
    >
      <span className="catalog-category-sheen" aria-hidden="true" />
      <span className="catalog-category-media" aria-hidden="true">
        <img src={showcase.image} alt="" loading="lazy" decoding="async" />
      </span>
      <span className="catalog-category-copy">
        <span className="catalog-category-title" lang={lang === 'kz' ? 'kk' : 'ru'}>
          {label}
        </span>
      </span>
    </button>
  )
}

export default function CatalogScreen() {
  const navigate = useNavigate()
  const { storeSlug } = useParams()
  const { t, lang } = useI18n()
  const { profile } = useProfile()
  const { storeId, currentStore, catalogProducts, isCatalogReady, isCatalogLoading } = useStore()
  const { isOnline } = useOffline()
  const [q, setQ] = useState(() => sessionStorage.getItem('korset_catalog_q') || '')
  const [debouncedQuery, setDebouncedQuery] = useState(q)
  const [sort, setSort] = useState(() => sessionStorage.getItem('korset_catalog_sort') || 'fit')
  const [viewMode, setViewMode] = useState(
    () => sessionStorage.getItem('korset_catalog_view') || 'grid'
  )
  const virtuosoRef = useRef(null)
  const scrollRef = useRef(0)
  const isInitialMount = useRef(true)
  const [initialScrollIndex] = useState(() =>
    parseInt(sessionStorage.getItem('korset_catalog_scroll') || '0', 10)
  )

  const [offlineCatalog, setOfflineCatalog] = useState([])
  const [serverSearch, setServerSearch] = useState({ results: [], query: '', status: 'idle' })
  const [recentSearchesVersion, setRecentSearchesVersion] = useState(0)
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const location = useLocation()
  const [selectedCategory, setSelectedCategory] = useState(
    () => location.state?.category || sessionStorage.getItem('korset_catalog_category') || null
  )
  const [selectedSubcategories, setSelectedSubcategories] = useState(() => {
    try {
      const val = sessionStorage.getItem('korset_catalog_subcategories')
      return val ? JSON.parse(val) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const urlQ = params.get('q')
    if (urlQ !== null) {
      setQ(urlQ)
      sessionStorage.setItem('korset_catalog_q', urlQ)
    } else if (location.state?.q !== undefined) {
      setQ(location.state.q)
      sessionStorage.setItem('korset_catalog_q', location.state.q)
    }

    if (location.state?.resetCategory || location.state?.resetAll) {
      setSelectedCategory(null)
      setSelectedSubcategories([])
      sessionStorage.removeItem('korset_catalog_category')
      sessionStorage.removeItem('korset_catalog_subcategories')
      if (location.state?.resetAll) {
        setQ('')
        sessionStorage.removeItem('korset_catalog_q')
      }
    } else if (location.state?.category) {
      setSelectedCategory(location.state.category)
      sessionStorage.setItem('korset_catalog_category', location.state.category)
    }
  }, [location.search, location.state])
  const [pendingCategory, setPendingCategory] = useState(null)
  const categoryExitTimerRef = useRef(null)
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false)
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)

  const hasQuery = q.trim().length > 0
  const isSearching = debouncedQuery.trim().length > 0
  const normalizedQuery = debouncedQuery.trim()
  const searchStoreKey = storeId || currentStore?.slug || storeSlug || 'global'
  const canUseServerSearch =
    isSearching && isOnline && Boolean(storeId) && normalizedQuery.length >= 2

  useEffect(() => {
    sessionStorage.setItem('korset_catalog_q', q)
  }, [q])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(q), 250)
    return () => clearTimeout(timer)
  }, [q])

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
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    sessionStorage.setItem('korset_catalog_scroll', '0')
    scrollRef.current = 0
    if (virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({ index: 0, align: 'start', behavior: 'auto' })
    }
  }, [selectedCategory, selectedSubcategories, sort, q])

  useEffect(() => {
    if (!isOnline && (!catalogProducts || catalogProducts.length === 0)) {
      getCatalogFromIndexedDB()
        .then((data) => {
          if (data && data.length > 0) setOfflineCatalog(data)
        })
        .catch(() => {})
    }
  }, [isOnline, catalogProducts])

  const baseProducts = useMemo(() => {
    if (storeId && catalogProducts.length > 0) return catalogProducts
    if (!isOnline && offlineCatalog.length > 0) {
      return offlineCatalog.filter((p) => String(p.store_id || p.storeId) === String(storeId))
    }
    return []
  }, [storeId, catalogProducts, isOnline, offlineCatalog])

  const categoryCountMap = useMemo(() => {
    const map = {}
    for (const p of baseProducts) {
      if (p.category) {
        map[p.category] = (map[p.category] || 0) + 1
      }
    }
    return map
  }, [baseProducts])

  const categoryKeys = useMemo(() => {
    const allKeys = getAllCategoryKeys()
    const knownKeys = new Set(allKeys)
    return [
      ...CATEGORY_SHOWCASE_ORDER.filter((key) => knownKeys.has(key)),
      ...allKeys.filter((key) => !CATEGORY_SHOWCASE_ORDER.includes(key)),
    ]
  }, [])

  const activeCategoryKeys = categoryKeys

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
  }, [canUseServerSearch, serverSearch, normalizedQuery, list, sort, profile])

  const isSearchPending =
    canUseServerSearch &&
    (serverSearch.status === 'pending' || serverSearch.query !== normalizedQuery)
  const searchSuggestions = useMemo(
    () => (isSearching ? buildSearchSuggestions(normalizedQuery) : []),
    [isSearching, normalizedQuery]
  )
  const recentSearches = useMemo(
    () => readCatalogSearchHistory(searchStoreKey, recentSearchesVersion ? 6 : 6),
    [recentSearchesVersion, searchStoreKey]
  )
  const showRecentSearches = isSearchFocused && !hasQuery && recentSearches.length > 0

  const rememberCatalogSearch = useCallback(() => {
    if (normalizedQuery.length < 2 || isSearchPending) return
    appendCatalogSearchQuery(searchStoreKey, normalizedQuery)
    setRecentSearchesVersion((version) => version + 1)
  }, [isSearchPending, normalizedQuery, searchStoreKey])

  const [comparePin, setComparePin] = useState(() => {
    try {
      const s = sessionStorage.getItem('korset_compare_a')
      return s ? JSON.parse(s) : null
    } catch {
      return null
    }
  })

  const handleCompare = useCallback(
    (product, e) => {
      e.stopPropagation()
      const slug = currentStore?.slug || null
      if (!comparePin) {
        sessionStorage.setItem('korset_compare_a', JSON.stringify(product))
        setComparePin(product)
      } else if (comparePin.ean === product.ean) {
        sessionStorage.removeItem('korset_compare_a')
        setComparePin(null)
      } else {
        sessionStorage.removeItem('korset_compare_a')
        setComparePin(null)
        navigate(buildComparePath(slug, comparePin.ean, product.ean), {
          state: { productA: comparePin, productB: product },
        })
      }
    },
    [comparePin, currentStore, navigate]
  )

  const handleNavigate = useCallback(
    (product) => {
      rememberCatalogSearch()
      sessionStorage.setItem('korset_catalog_scroll', String(scrollRef.current))
      navigate(buildProductPath(currentStore?.slug || null, product.ean), {
        state: { product },
      })
    },
    [currentStore, navigate, rememberCatalogSearch]
  )

  const activeStoreSlug = currentStore?.slug || storeSlug || null

  const handleStoreInfoClick = useCallback(() => {
    navigate(activeStoreSlug ? buildStorePublicPath(activeStoreSlug) : '/stores')
  }, [activeStoreSlug, navigate])

  const handleScanClick = useCallback(() => {
    navigate(buildScanPath(activeStoreSlug))
  }, [activeStoreSlug, navigate])

  useEffect(() => {
    return () => {
      if (categoryExitTimerRef.current) clearTimeout(categoryExitTimerRef.current)
    }
  }, [])

  const handleCategoryClick = useCallback(
    (catKey) => {
      if (categoryExitTimerRef.current) clearTimeout(categoryExitTimerRef.current)
      sessionStorage.setItem('korset_catalog_scroll', '0')
      scrollRef.current = 0
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
    sessionStorage.setItem('korset_catalog_scroll', '0')
    scrollRef.current = 0
    setPendingCategory(null)
    setSelectedCategory(null)
    setSelectedSubcategories([])
    setIsSubMenuOpen(false)
    setIsSortMenuOpen(false)
  }, [setSelectedSubcategories])

  const storeTitle =
    currentStore?.name || (storeSlug ? `${storeSlug[0].toUpperCase()}${storeSlug.slice(1)}` : '')

  const searchHint = !isCatalogReady && q.trim() ? t('catalog.loadingSearch') : null
  const showCatalogMeta = false
  const showCategories = !hasQuery && !selectedCategory
  const showSubcategories = !hasQuery && selectedCategory

  const renderGridItem = useCallback(
    (index, product) => {
      const fit = checkProductFit(product, profile)
      const verdict = getVerdictConfig(fit, t)
      const compareState =
        comparePin?.ean === product.ean ? 'active-pin' : comparePin ? 'select-second' : 'default'
      const compareLabel =
        comparePin?.ean === product.ean
          ? t('compare.cancel')
          : comparePin
            ? t('compare.btnLabel')
            : t('compare.compareMode')
      const badges = buildCatalogProductCardBadges(product, t)
      const kcal = getCatalogProductCardKcal(product)
      const searchDiagnosticsAttrs = getProductSearchDiagnosticsAttrs(product)
      return (
        <CatalogProductCard
          mode="grid"
          product={product}
          productName={getLocalName(product)}
          productMeta={
            [product.brand, getDisplayQuantity(product, lang)].filter(Boolean).join(' · ') ||
            '\u00A0'
          }
          price={formatPrice(product.priceKzt)}
          verdict={verdict}
          badges={badges}
          kcalLabel={kcal ? t('catalog.badge.kcal', { value: kcal }) : null}
          compareState={compareState}
          compareLabel={compareLabel}
          searchDiagnosticsAttrs={searchDiagnosticsAttrs}
          onOpen={() => handleNavigate(product)}
          onCompare={(e) => handleCompare(product, e)}
        />
      )
    },
    [profile, comparePin, handleCompare, handleNavigate, t, lang]
  )

  const renderListItem = useCallback(
    (index, product) => {
      const fit = checkProductFit(product, profile)
      const verdict = getVerdictConfig(fit, t)
      const compareState =
        comparePin?.ean === product.ean ? 'active-pin' : comparePin ? 'select-second' : 'default'
      const compareLabel =
        comparePin?.ean === product.ean
          ? t('compare.cancel')
          : comparePin
            ? t('compare.btnLabel')
            : t('compare.compareMode')
      const badges = buildCatalogProductCardBadges(product, t)
      const kcal = getCatalogProductCardKcal(product)
      const searchDiagnosticsAttrs = getProductSearchDiagnosticsAttrs(product)
      return (
        <CatalogProductCard
          mode="list"
          product={product}
          productName={getLocalName(product)}
          productMeta={[product.brand || t('catalog.noBrand'), getDisplayQuantity(product, lang)]
            .filter(Boolean)
            .join(' · ')}
          price={formatPrice(product.priceKzt)}
          verdict={verdict}
          badges={badges}
          kcalLabel={kcal ? t('catalog.badge.kcal', { value: kcal }) : null}
          compareState={compareState}
          compareLabel={compareLabel}
          searchDiagnosticsAttrs={searchDiagnosticsAttrs}
          onOpen={() => handleNavigate(product)}
          onCompare={(e) => handleCompare(product, e)}
        />
      )
    },
    [profile, comparePin, handleCompare, handleNavigate, t, lang]
  )

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {showSubcategories && (
              <button
                onClick={handleBackToCategories}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'var(--glass-muted)',
                  border: '1px solid var(--glass-soft-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-soft)',
                  flexShrink: 0,
                }}
              >
                <ArrowBackIcon size={20} />
              </button>
            )}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 14,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: showSubcategories ? 'clamp(19px, 5vw, 25px)' : 'clamp(24px, 6vw, 30px)',
                  fontWeight: 500,
                  color: 'var(--text)',
                  margin: 0,
                  lineHeight: 1,
                  letterSpacing: 0.2,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {showSubcategories ? getCategoryLabel(selectedCategory, lang) : t('catalog.title')}
              </div>
              <button
                type="button"
                className="catalog-store-pill"
                onClick={handleStoreInfoClick}
                aria-label={t('catalog.storeInfo', { storeName: storeTitle })}
              >
                <StorefrontIcon size={16} />
                <span>{storeTitle}</span>
                {showCatalogMeta && !hasQuery && showSubcategories && (
                  <>
                    {' '}
                    · {categoryCountMap[selectedCategory] || 0} {t('catalog.productsIn')}
                  </>
                )}
                {showCatalogMeta && !hasQuery && showCategories && (
                  <>
                    {' '}
                    ·{' '}
                    {!isCatalogReady && catalogProducts.length === 0
                      ? t('catalog.loading')
                      : `${baseProducts.length} ${t('catalog.productsCount')}${!isCatalogReady ? ' · ' + t('catalog.loadingMore') : ''}`}
                  </>
                )}
                {showCatalogMeta && hasQuery && (
                  <>
                    {' '}
                    ·{' '}
                    {isSearchPending
                      ? t('catalog.searchingServer')
                      : `${displayList.length} ${t('catalog.productsCount')}`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            marginBottom: showCategories ? 8 : 14,
            alignItems: 'center',
          }}
        >
          <div className="catalog-search-wrap">
            <span className="catalog-search-icon">{IconSearch}</span>
            <input
              className="catalog-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') rememberCatalogSearch()
              }}
              placeholder={t('catalog.searchPlaceholder')}
            />
            {q.trim().length > 0 && (
              <button
                className="catalog-search-clear"
                onClick={() => setQ('')}
                aria-label={t('catalog.clearSearch')}
              >
                <CloseIcon size={14} />
              </button>
            )}
            {searchHint && (
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  bottom: -18,
                  fontSize: 10,
                  color: 'rgba(251,191,36,0.9)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {searchHint}
              </div>
            )}
          </div>
          <button
            type="button"
            className="catalog-scan-shortcut"
            onClick={handleScanClick}
            aria-label={t('catalog.scanProduct')}
          >
            <BarcodeScannerIcon size={20} />
          </button>
          {!showCategories && (
            <div className="catalog-view-toggle">
              <button
                className={`catalog-view-btn${viewMode === 'grid' ? ' active' : ''}`}
                onClick={() => {
                  setViewMode('grid')
                  sessionStorage.setItem('korset_catalog_view', 'grid')
                }}
                aria-label={t('catalog.viewGrid')}
              >
                {viewMode === 'grid' ? IconGridActive : IconGrid}
              </button>
              <button
                className={`catalog-view-btn${viewMode === 'list' ? ' active' : ''}`}
                onClick={() => {
                  setViewMode('list')
                  sessionStorage.setItem('korset_catalog_view', 'list')
                }}
                aria-label={t('catalog.viewList')}
              >
                {viewMode === 'list' ? IconListActive : IconList}
              </button>
            </div>
          )}
        </div>

        {showCategories && <p className="catalog-search-guide">{t('catalog.searchGuide')}</p>}

        {showRecentSearches && (
          <div
            className="catalog-search-history-row"
            style={{ marginBottom: showSubcategories ? 10 : 14 }}
            aria-label={t('catalog.recentSearches')}
          >
            <span className="catalog-search-history-label">{t('catalog.recentSearches')}</span>
            {recentSearches.map((item) => (
              <button
                key={`${item.storeKey}:${item.query}`}
                className="catalog-search-history-chip"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQ(item.query)
                  setIsSearchFocused(false)
                }}
              >
                {IconHistory}
                {item.query}
              </button>
            ))}
          </div>
        )}

        {showSubcategories && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            {activeSubcategoryKeys.length > 1 && (
              <button
                className={`catalog-dropdown-trigger${isSubMenuOpen || selectedSubcategories.length > 0 ? ' active' : ''}`}
                onClick={() => {
                  setIsSubMenuOpen(!isSubMenuOpen)
                  setIsSortMenuOpen(false)
                }}
              >
                {isSubMenuOpen || selectedSubcategories.length > 0 ? (
                  <FilterIconActive size={16} />
                ) : (
                  <FilterIcon size={16} />
                )}
                <span
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedSubcategories.length === 0
                    ? t('catalog.allSubcategories')
                    : selectedSubcategories.length === 1
                      ? getSubcategoryLabel(selectedCategory, selectedSubcategories[0], lang)
                      : t('catalog.selectedCount', { count: selectedSubcategories.length })}
                </span>
                <ChevronDownIcon
                  size={18}
                  style={{
                    transition: 'transform 0.2s',
                    transform: isSubMenuOpen ? 'rotate(180deg)' : 'none',
                  }}
                />
              </button>
            )}
            <button
              className={`catalog-dropdown-trigger${isSortMenuOpen ? ' active' : ''}`}
              onClick={() => {
                setIsSortMenuOpen(!isSortMenuOpen)
                setIsSubMenuOpen(false)
              }}
              style={{ flex: activeSubcategoryKeys.length > 1 ? '1' : '1 0 100%' }}
            >
              {(() => {
                const activeOption =
                  CATALOG_SORT_OPTIONS.find((o) => o.id === sort) || CATALOG_SORT_OPTIONS[0]
                const ActiveSortIcon = activeOption.Icon
                return <ActiveSortIcon size={16} />
              })()}
              <span
                style={{
                  flex: 1,
                  textAlign: 'left',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {t(
                  (CATALOG_SORT_OPTIONS.find((o) => o.id === sort) || CATALOG_SORT_OPTIONS[0])
                    .labelKey
                )}
              </span>
              <ChevronDownIcon
                size={18}
                style={{
                  transition: 'transform 0.2s',
                  transform: isSortMenuOpen ? 'rotate(180deg)' : 'none',
                }}
              />
            </button>
          </div>
        )}

        {showSubcategories && isSubMenuOpen && activeSubcategoryKeys.length > 1 && (
          <div
            className="catalog-chips-row"
            style={{ marginBottom: 12, animation: 'expandDropdown 0.2s ease-out' }}
          >
            <button
              className={`catalog-sub-chip${selectedSubcategories.length === 0 ? ' active' : ''}`}
              onClick={() => {
                setSelectedSubcategories([])
                setIsSubMenuOpen(false)
              }}
            >
              {t('catalog.allSubcategories')}
              <span className="catalog-sub-chip-count">
                {activeSubcategoryKeys.reduce((acc, k) => acc + (subcategoryCountMap[k] || 0), 0)}
              </span>
            </button>
            {activeSubcategoryKeys.map((subKey) => (
              <button
                key={subKey}
                className={`catalog-sub-chip${selectedSubcategories.includes(subKey) ? ' active' : ''}`}
                onClick={() => {
                  setSelectedSubcategories((prev) =>
                    prev.includes(subKey) ? prev.filter((k) => k !== subKey) : [...prev, subKey]
                  )
                }}
              >
                {getSubcategoryLabel(selectedCategory, subKey, lang)}
                <span className="catalog-sub-chip-count">{subcategoryCountMap[subKey] || 0}</span>
              </button>
            ))}
          </div>
        )}

        {showSubcategories && isSortMenuOpen && (
          <div
            className="catalog-chips-row"
            style={{ marginBottom: 12, animation: 'expandDropdown 0.2s ease-out' }}
          >
            {CATALOG_SORT_OPTIONS.map(({ id, labelKey, Icon }) => (
              <button
                key={id}
                className={`catalog-sort-chip${sort === id ? ' active' : ''}`}
                onClick={() => {
                  setSort(id)
                  setIsSortMenuOpen(false)
                }}
              >
                <Icon size={16} />
                {t(labelKey)}
              </button>
            ))}
          </div>
        )}
      </div>

      {comparePin && (
        <div
          style={{
            margin: '0 20px 10px',
            padding: '12px 14px',
            borderRadius: 16,
            background: 'var(--badge-bg)',
            border: '1.5px solid var(--badge-border)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            animation: 'compareBarIn 0.25s ease',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 20, color: 'var(--primary-bright)', flexShrink: 0 }}>
            <CompareIcon size={20} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: 'var(--primary-bright)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
            >
              {t('compare.modeBanner')}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text)',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {getLocalName(comparePin)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 1 }}>
              {t('compare.selectSecond')}
            </div>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem('korset_compare_a')
              setComparePin(null)
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <CloseIcon size={20} color="var(--primary-bright)" />
          </button>
        </div>
      )}

      {showCategories && (
        <div className={`catalog-showcase-scroll${pendingCategory ? ' is-exiting' : ''}`}>
          <div className="catalog-showcase-grid">
            {activeCategoryKeys.map((catKey, index) => {
              const label = getCategoryLabel(catKey, lang)
              return (
                <CategoryShowcaseCard
                  key={catKey}
                  categoryKey={catKey}
                  label={label}
                  onSelect={handleCategoryClick}
                  index={index}
                  isActive={pendingCategory === catKey}
                  lang={lang}
                />
              )
            })}
          </div>
        </div>
      )}

      {!showCategories && (
        <div style={{ flex: 1, minHeight: 0 }}>
          {displayList.length === 0 ? (
            hasQuery && serverSearch.status === 'error' ? (
              <div className="catalog-empty-state">
                <span className="material-symbols-outlined">cloud_off</span>
                <div className="catalog-empty-state-title">
                  {t('catalog.searchError') || 'Ошибка поиска'}
                </div>
                <div className="catalog-empty-state-sub">
                  {t('catalog.searchErrorHint') || 'Показаны локальные результаты'}
                </div>
              </div>
            ) : hasQuery && isSearchPending ? (
              <div className="catalog-empty-state">
                <ExploreIcon size={44} style={{ opacity: 0.5, color: 'var(--text-dim)' }} />
                <div className="catalog-empty-state-title">{t('catalog.searchLoadingTitle')}</div>
                <div className="catalog-empty-state-sub">{t('catalog.searchLoadingSub')}</div>
              </div>
            ) : hasQuery ? (
              <div className="catalog-empty-state">
                <span className="material-symbols-outlined">search_off</span>
                <div className="catalog-empty-state-title">{t('catalog.emptySearch')}</div>
                <div className="catalog-empty-state-sub">«{q.trim()}»</div>
                <div className="catalog-empty-state-sub">{t('catalog.emptySearchHint')}</div>
                {searchSuggestions.length > 0 && (
                  <div
                    style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}
                  >
                    {searchSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        className="catalog-empty-state-btn"
                        onClick={() => setQ(suggestion)}
                      >
                        {t('catalog.searchSuggestion', { query: suggestion })}
                      </button>
                    ))}
                  </div>
                )}
                <button className="catalog-empty-state-btn" onClick={() => setQ('')}>
                  {t('catalog.clearSearch')}
                </button>
              </div>
            ) : isCatalogLoading ? (
              <div className="catalog-empty-state">
                <div className="catalog-loading-skeleton">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="catalog-skeleton-row"
                      style={{ animationDelay: `${i * 0.07}s` }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="catalog-empty-state">
                <InventoryIcon size={44} style={{ opacity: 0.5, color: 'var(--text-dim)' }} />
                <div className="catalog-empty-state-title">{t('catalog.emptyCategory')}</div>
              </div>
            )
          ) : viewMode === 'grid' ? (
            <VirtuosoGrid
              ref={virtuosoRef}
              data={displayList}
              components={gridComponents}
              itemContent={renderGridItem}
              overscan={600}
              initialTopMostItemIndex={initialScrollIndex}
              rangeChanged={(range) => {
                scrollRef.current = range.startIndex
              }}
            />
          ) : (
            <Virtuoso
              ref={virtuosoRef}
              data={displayList}
              itemContent={renderListItem}
              overscan={600}
              components={{ Footer: ListFooter }}
              initialTopMostItemIndex={initialScrollIndex}
              rangeChanged={(range) => {
                scrollRef.current = range.startIndex
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
