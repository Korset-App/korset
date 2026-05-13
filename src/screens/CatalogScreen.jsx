import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  startTransition,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { buildProductPath, buildComparePath } from '../utils/routes.js'
import { getDisplayQuantity } from '../utils/parseQuantity.js'
import { CATEGORY_SHOWCASE_ORDER, getCategoryShowcase } from '../domain/product/catalogShowcase.js'
import { getProductSearchDiagnosticsAttrs } from '../domain/product/searchDiagnostics.js'
import { searchStoreProductsRPC } from '../domain/product/search.js'
import {
  appendCatalogSearchQuery,
  readCatalogSearchHistory,
} from '../domain/product/searchHistory.js'

function ProductThumb({ product }) {
  const [imgOk, setImgOk] = useState(true)
  const src = product.image || product.imageUrl || product.images?.[0]
  if (src && imgOk) {
    return (
      <img
        src={src}
        alt={product.name}
        className="product-img-blend"
        onError={() => setImgOk(false)}
        style={{ padding: 8 }}
      />
    )
  }
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        fontSize: 28,
        fontWeight: 800,
        color: 'var(--primary-bright)',
      }}
    >
      {product.name?.[0] || '•'}
    </div>
  )
}

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

function sortCatalogProducts(products, sort, profile, isSearching) {
  const arr = [...products]
  arr.sort((a, b) => {
    if (sort === 'cheap') return (a.priceKzt || 0) - (b.priceKzt || 0)
    if (sort === 'pricey') return (b.priceKzt || 0) - (a.priceKzt || 0)
    if (sort === 'protein') {
      const aVal = getNutrientValue(a, 'protein') ?? 0
      const bVal = getNutrientValue(b, 'protein') ?? 0
      return bVal - aVal
    }
    if (sort === 'sugar') {
      const aVal = getNutrientValue(a, 'sugar')
      const bVal = getNutrientValue(b, 'sugar')
      if (aVal == null && bVal != null) return 1
      if (aVal != null && bVal == null) return -1
      if (aVal == null && bVal == null) return 0
      return aVal - bVal
    }
    const aFit = checkProductFit(a, profile)
    const bFit = checkProductFit(b, profile)
    const aFitScore = FIT_VERDICT_ORDER[aFit.verdict] ?? (aFit.fits ? 0 : 3)
    const bFitScore = FIT_VERDICT_ORDER[bFit.verdict] ?? (bFit.fits ? 0 : 3)
    if (aFitScore !== bFitScore) return aFitScore - bFitScore
    if (isSearching) return (b.searchRank || 0) - (a.searchRank || 0)
    return 0
  })
  return arr
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

  return suggestions.slice(0, 3)
}

const ListFooter = forwardRef(({ style, ...props }, ref) => (
  <div ref={ref} style={{ ...style, height: 100 }} {...props} />
))

function CategoryShowcaseCard({ categoryKey, label, onSelect, index, isActive }) {
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
        <span className="catalog-category-title">{label}</span>
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
  const [sort, setSort] = useState(() => sessionStorage.getItem('korset_catalog_sort') || 'fit')
  const [viewMode, setViewMode] = useState(
    () => sessionStorage.getItem('korset_catalog_view') || 'list'
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

  const [selectedCategory, setSelectedCategory] = useState(
    () => sessionStorage.getItem('korset_catalog_category') || null
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

  const isSearching = q.trim().length > 0
  const normalizedQuery = q.trim()
  const searchStoreKey = storeId || currentStore?.slug || storeSlug || 'global'
  const canUseServerSearch =
    isSearching && isOnline && Boolean(storeId) && normalizedQuery.length >= 2

  useEffect(() => {
    sessionStorage.setItem('korset_catalog_q', q)
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
    if (!isOnline && offlineCatalog.length > 0) return offlineCatalog
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
    let arr = [...baseProducts]

    if (!isSearching && selectedCategory) {
      arr = arr.filter((product) => product.category === selectedCategory)
      if (selectedSubcategories.length > 0) {
        arr = arr.filter((product) => selectedSubcategories.includes(product.subcategory))
      }
    }

    if (isSearching) {
      const query = q.trim().toLowerCase()
      arr = arr.filter((product) => {
        const haystack =
          `${product.name} ${product.nameKz || ''} ${product.brand || ''} ${(product.ingredients || '').slice(0, 200)} ${(product.tags || []).join(' ')}`.toLowerCase()
        return haystack.includes(query)
      })
    }

    return sortCatalogProducts(arr, sort, profile, isSearching)
  }, [baseProducts, selectedCategory, selectedSubcategories, profile, q, sort, isSearching])

  useEffect(() => {
    if (!canUseServerSearch) return undefined
    let cancelled = false
    const timer = setTimeout(() => {
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
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [canUseServerSearch, normalizedQuery, storeId])

  const displayList = useMemo(() => {
    if (canUseServerSearch) {
      const activeServerResults = serverSearch.query === normalizedQuery ? serverSearch.results : []
      return sortCatalogProducts(
        mergeProductsBySearchKey(activeServerResults, list),
        sort,
        profile,
        true
      )
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
  const showRecentSearches = isSearchFocused && !isSearching && recentSearches.length > 0

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

  useEffect(() => {
    return () => {
      if (categoryExitTimerRef.current) clearTimeout(categoryExitTimerRef.current)
    }
  }, [])

  const handleCategoryClick = useCallback((catKey) => {
    if (categoryExitTimerRef.current) clearTimeout(categoryExitTimerRef.current)
    sessionStorage.setItem('korset_catalog_scroll', '0')
    scrollRef.current = 0
    setPendingCategory(catKey)
    categoryExitTimerRef.current = setTimeout(() => {
      startTransition(() => {
        setSelectedCategory(catKey)
        setSelectedSubcategories([])
        setPendingCategory(null)
      })
      categoryExitTimerRef.current = null
    }, 80)
  }, [])

  const handleBackToCategories = useCallback(() => {
    if (categoryExitTimerRef.current) clearTimeout(categoryExitTimerRef.current)
    sessionStorage.setItem('korset_catalog_scroll', '0')
    scrollRef.current = 0
    setPendingCategory(null)
    setSelectedCategory(null)
    setSelectedSubcategories([])
    setIsSubMenuOpen(false)
    setIsSortMenuOpen(false)
  }, [])

  const storeTitle =
    currentStore?.name || (storeSlug ? `${storeSlug[0].toUpperCase()}${storeSlug.slice(1)}` : '')

  const searchHint = !isCatalogReady && q.trim() ? t('catalog.loadingSearch') : null
  const showCatalogMeta = false
  const showCategories = !isSearching && !selectedCategory
  const showSubcategories = !isSearching && selectedCategory

  const renderGridItem = useCallback(
    (index, product) => {
      const fit = checkProductFit(product, profile)
      const verdict = getVerdictConfig(fit, t)
      const compareState =
        comparePin?.ean === product.ean ? 'active-pin' : comparePin ? 'select-second' : 'default'
      const compareIcon =
        comparePin?.ean === product.ean ? 'close' : comparePin ? 'add' : 'compare_arrows'
      const searchDiagnosticsAttrs = getProductSearchDiagnosticsAttrs(product)
      return (
        <div
          {...searchDiagnosticsAttrs}
          onClick={() => handleNavigate(product)}
          style={{
            background: 'var(--glass-muted)',
            border: '1px solid var(--glass-soft-border)',
            borderRadius: 18,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            cursor: 'pointer',
            position: 'relative',
            height: '100%',
            minHeight: 260,
          }}
        >
          <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}>
            <div className={`catalog-verdict-badge ${verdict.cls}`}>
              <span className="material-symbols-outlined">{verdict.icon}</span>
              {verdict.label}
            </div>
          </div>

          <div
            className="catalog-img-box"
            style={{ width: '100%', aspectRatio: '1/1', marginBottom: 10 }}
          >
            <ProductThumb product={product} />
          </div>

          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text)',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: 4,
              minHeight: '2.6em',
            }}
          >
            {getLocalName(product)}
          </div>

          <div
            style={{
              fontSize: 11,
              color: 'var(--text-soft)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: 2,
              minHeight: '1.4em',
            }}
          >
            {[product.brand, getDisplayQuantity(product, lang)].filter(Boolean).join(' · ') ||
              '\u00A0'}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 8 }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                fontWeight: 900,
                color: 'var(--primary-bright)',
              }}
            >
              {formatPrice(product.priceKzt)}
            </div>
          </div>
          <button
            className={`catalog-compare-btn-grid ${compareState}`}
            onClick={(e) => handleCompare(product, e)}
          >
            <span className="material-symbols-outlined">{compareIcon}</span>
          </button>
        </div>
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
      const compareIcon =
        comparePin?.ean === product.ean ? 'close' : comparePin ? 'add' : 'compare_arrows'
      const compareLabel =
        comparePin?.ean === product.ean
          ? t('compare.cancel')
          : comparePin
            ? t('compare.btnLabel')
            : t('compare.compareMode')
      const searchDiagnosticsAttrs = getProductSearchDiagnosticsAttrs(product)
      return (
        <div
          {...searchDiagnosticsAttrs}
          onClick={() => handleNavigate(product)}
          style={{
            background: 'var(--glass-muted)',
            border: '1px solid var(--glass-soft-border)',
            borderRadius: 18,
            padding: 12,
            margin: '0 20px',
            display: 'grid',
            gridTemplateColumns: '80px 1fr',
            gap: 10,
            cursor: 'pointer',
          }}
        >
          <div className="catalog-img-box" style={{ width: 80, height: 80 }}>
            <ProductThumb product={product} />
          </div>

          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text)',
                  lineHeight: 1.35,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  flex: 1,
                }}
              >
                {getLocalName(product)}
              </div>
              <div className={`catalog-verdict-badge ${verdict.cls}`}>
                <span className="material-symbols-outlined">{verdict.icon}</span>
                {verdict.label}
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
              {[product.brand || t('catalog.noBrand'), getDisplayQuantity(product, lang)]
                .filter(Boolean)
                .join(' · ')}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 'auto',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 20,
                  fontWeight: 900,
                  color: 'var(--primary-bright)',
                }}
              >
                {formatPrice(product.priceKzt)}
              </div>
              <button
                className={`catalog-compare-btn ${compareState}`}
                onClick={(e) => handleCompare(product, e)}
              >
                <span className="material-symbols-outlined">{compareIcon}</span>
                {compareLabel}
              </button>
            </div>
          </div>
        </div>
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
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  arrow_back
                </span>
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
                  fontSize: 30,
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
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 30,
                  fontWeight: 500,
                  color: 'rgba(167,139,250,0.7)',
                  lineHeight: 1,
                  letterSpacing: 0.2,
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '44%',
                  flexShrink: 0,
                }}
              >
                {storeTitle}
                {showCatalogMeta && !isSearching && showSubcategories && (
                  <>
                    {' '}
                    · {categoryCountMap[selectedCategory] || 0} {t('catalog.productsIn')}
                  </>
                )}
                {showCatalogMeta && !isSearching && showCategories && (
                  <>
                    {' '}
                    ·{' '}
                    {!isCatalogReady && catalogProducts.length === 0
                      ? t('catalog.loading')
                      : `${baseProducts.length} ${t('catalog.productsCount')}${!isCatalogReady ? ' · ' + t('catalog.loadingMore') : ''}`}
                  </>
                )}
                {showCatalogMeta && isSearching && (
                  <>
                    {' '}
                    ·{' '}
                    {isSearchPending
                      ? t('catalog.searchingServer')
                      : `${displayList.length} ${t('catalog.productsCount')}`}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
          <div className="catalog-search-wrap">
            <span className="catalog-search-icon material-symbols-outlined">search</span>
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
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 14, color: 'var(--text-soft)' }}
                >
                  close
                </span>
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
          {!showCategories && (
            <div className="catalog-view-toggle">
              <button
                className={`catalog-view-btn${viewMode === 'list' ? ' active' : ''}`}
                onClick={() => {
                  setViewMode('list')
                  sessionStorage.setItem('korset_catalog_view', 'list')
                }}
                aria-label="Список"
              >
                <span className="material-symbols-outlined">view_list</span>
              </button>
              <button
                className={`catalog-view-btn${viewMode === 'grid' ? ' active' : ''}`}
                onClick={() => {
                  setViewMode('grid')
                  sessionStorage.setItem('korset_catalog_view', 'grid')
                }}
                aria-label="Сетка"
              >
                <span className="material-symbols-outlined">grid_view</span>
              </button>
            </div>
          )}
        </div>

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
                <span className="material-symbols-outlined">history</span>
                {item.query}
              </button>
            ))}
          </div>
        )}

        {showSubcategories && (
          <div style={{ display: 'flex', gap: 10, padding: '0 20px', marginBottom: 12 }}>
            {activeSubcategoryKeys.length > 1 && (
              <button
                className={`catalog-dropdown-trigger${isSubMenuOpen || selectedSubcategories.length > 0 ? ' active' : ''}`}
                onClick={() => {
                  setIsSubMenuOpen(!isSubMenuOpen)
                  setIsSortMenuOpen(false)
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  filter_list
                </span>
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
                      : `${lang === 'kz' ? 'Таңдалды' : 'Выбрано'}: ${selectedSubcategories.length}`}
                </span>
                <span
                  className="material-symbols-outlined"
                  style={{
                    transition: 'transform 0.2s',
                    transform: isSubMenuOpen ? 'rotate(180deg)' : 'none',
                    fontSize: 18,
                  }}
                >
                  expand_more
                </span>
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
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {sort === 'fit'
                  ? 'sort'
                  : sort === 'cheap'
                    ? 'arrow_downward'
                    : sort === 'pricey'
                      ? 'arrow_upward'
                      : sort === 'protein'
                        ? 'fitness_center'
                        : 'cookie'}
              </span>
              <span
                style={{
                  flex: 1,
                  textAlign: 'left',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {[
                  { id: 'fit', label: t('catalog.sort.fit') },
                  { id: 'cheap', label: t('catalog.sort.cheap') },
                  { id: 'pricey', label: t('catalog.sort.pricey') },
                  { id: 'protein', label: t('catalog.sort.protein') },
                  { id: 'sugar', label: t('catalog.sort.sugar') },
                ].find((o) => o.id === sort)?.label || t('catalog.sort.fit')}
              </span>
              <span
                className="material-symbols-outlined"
                style={{
                  transition: 'transform 0.2s',
                  transform: isSortMenuOpen ? 'rotate(180deg)' : 'none',
                  fontSize: 18,
                }}
              >
                expand_more
              </span>
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
            {[
              { id: 'fit', label: t('catalog.sort.fit'), icon: 'sort' },
              { id: 'cheap', label: t('catalog.sort.cheap'), icon: 'arrow_downward' },
              { id: 'pricey', label: t('catalog.sort.pricey'), icon: 'arrow_upward' },
              { id: 'protein', label: t('catalog.sort.protein'), icon: 'fitness_center' },
              { id: 'sugar', label: t('catalog.sort.sugar'), icon: 'cookie' },
            ].map((option) => (
              <button
                key={option.id}
                className={`catalog-sort-chip${sort === option.id ? ' active' : ''}`}
                onClick={() => {
                  setSort(option.id)
                  setIsSortMenuOpen(false)
                }}
              >
                <span className="material-symbols-outlined">{option.icon}</span>
                {option.label}
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
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 20, color: 'var(--primary-bright)', flexShrink: 0 }}
          >
            compare_arrows
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
              {comparePin.nameKz && lang === 'kz' ? comparePin.nameKz : comparePin.name}
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
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: 'var(--primary-bright)' }}
            >
              close
            </span>
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
                />
              )
            })}
          </div>
        </div>
      )}

      {!showCategories && (
        <div style={{ flex: 1, minHeight: 0 }}>
          {displayList.length === 0 ? (
            isSearching && isSearchPending ? (
              <div className="catalog-empty-state">
                <span className="material-symbols-outlined">travel_explore</span>
                <div className="catalog-empty-state-title">{t('catalog.searchLoadingTitle')}</div>
                <div className="catalog-empty-state-sub">{t('catalog.searchLoadingSub')}</div>
              </div>
            ) : isSearching ? (
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
                <span className="material-symbols-outlined">inventory_2</span>
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
