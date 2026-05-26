import { useState, useMemo, useEffect, useCallback, useRef, forwardRef } from 'react'
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

const IconFilterActive = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.72 18.24l-.94-.94c.49-.74.78-1.63.78-2.59A4.71 4.71 0 0 0 15.85 10a4.71 4.71 0 0 0-4.71 4.71c0 2.6 2.11 4.71 4.71 4.71.96 0 1.84-.29 2.59-.78l.94.94c.19.19.43.28.68.28s.49-.09.68-.28a.95.95 0 0 0 0-1.34z" />
    <path d="M19.58 4.02v2.22c0 .81-.5 1.82-1 2.33l-.18.16c-.14.13-.35.16-.53.1l-.6-.17c-.44-.11-.91-.16-1.39-.16-3.45 0-6.25 2.8-6.25 6.25 0 1.14.31 2.26.9 3.22.5.84 1.2 1.54 1.96 2.01.23.15.32.47.12.65l-.21.16-1.4.91c-1.3.81-3.09-.1-3.09-1.72v-5.35c0-.71-.4-1.62-.8-2.12l-3.79-4.04c-.5-.51-.9-1.42-.9-2.02V4.12c0-1.21.9-2.12 1.99-2.12h13.18c1.09 0 1.99.91 1.99 2.02z" />
  </svg>
)

const IconFilter = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.32 19.07c0 .61-.4 1.41-.91 1.72l-1.41.91c-1.31.81-3.13-.1-3.13-1.72v-5.35c0-.71-.4-1.62-.81-2.12L4.22 8.47A2.09 2.09 0 0 1 3.31 6.45V4.13c0-1.21.91-2.12 2.02-2.12h13.34c1.11 0 2.02.91 2.02 2.02V6.25c0 .81-.51 1.82-1.01 2.32" />
    <circle cx="16.07" cy="13.32" r="3.2" />
    <path d="M19.87 17.12l-1-1" />
  </svg>
)

const IconSortFit = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
  >
    <path d="M22 7H9M2 7h3" />
    <path d="M19 12h-3M5 12h7" />
    <path d="M16 17H8" />
  </svg>
)

const IconSortCheap = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13 12h8M13 8h8M13 16h8M6 7v10M6 17l-3-3M6 17l3-3" />
  </svg>
)

const IconSortPricey = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13 12h8M13 8h8M13 16h8M6 7v10M6 7l-3 3M6 7l3 3" />
  </svg>
)

const IconSortProtein = (
  <svg width="16" height="16" viewBox="0 0 512 512" fill="currentColor">
    <g transform="translate(0,512) scale(0.1,-0.1)">
      <path d="M1080 4729c-122 -94 -290 -257 -393 -381 -752 -907 -693 -2088 148 -2934 71 -72 155 -152 185 -177l55 -46 -377 -378c-343 -343 -378 -382 -378 -411 0 -22 9 -41 25 -57 24 -25 27 -25 192 -25 200 0 274 14 388 70 94 47 176 115 230 194 21 31 41 56 45 56 3 0 25 -27 48 -60 82 -116 234 -214 379 -245 44 -9 128 -15 236 -15 165 0 168 0 192 25 16 16 25 35 25 57 0 29 -35 68 -377 411l-378 378 50 41c103 85 324 317 412 435 141 187 231 347 313 556l46 118 60 -78c248 -322 354 -633 354 -1043 0 -250 89 -470 260 -640 178 -179 416 -271 665 -257 55 4 134 16 175 27 95 27 99 27 195 1 489 -134 1002 193 1090 694 26 151 16 291 -35 496 -97 389 -316 764 -535 914l-53 37 -5 447c-5 488 -7 509 -72 691 -110 304 -349 572 -640 718 -401 200 -902 166 -1277 -85 -103 -69 -254 -213 -321 -307 -12 -17 -19 -10 -76 85 -34 57 -101 155 -149 219 -162 215 -511 540 -582 540 -19 0 -56 -22 -120 -71z m2130 -424c235 -35 449 -144 620 -315 175 -176 284 -395 320 -645 5 -38 10 -232 10 -430l0 -360 -79 0 -80 0 -3 400c-4 370 -6 406 -25 476 -51 184 -130 319 -262 449 -196 195 -445 291 -716 277 -252 -14 -450 -102 -630 -282 -94 -94 -179 -214 -200 -282 -7 -24 -25 -31 -25 -10 -1 6 -15 51 -34 98l-32 87 42 64c235 351 667 538 1094 473z m-1944 -81c103 -49 125 -175 45 -255 -66 -66 -159 -65 -223 2 -122 128 19 328 178 253z m-681 -581c369 -278 900 -267 1267 28 73 59 65 65 121 -97 247 -709 58 -1450 -522 -2047 -53 -55 -131 -128 -174 -164l-77 -65 -48 38c-86 70 -244 228 -329 329 -497 590 -631 1304 -372 1976 28 73 33 79 48 67 10 -7 49 -36 86 -65z m2289 -135c86 -26 166 -136 166 -228 0 -124 -116 -240 -240 -240 -124 0 -240 116 -240 240 0 63 23 114 75 165 70 71 145 90 239 63z m-498 -943c362 -453 475 -746 503 -1297 6 -125 15 -199 26 -233 67 -197 223 -339 420 -380 66 -14 74 -19 148 -89l78 -75 -37 -7c-110 -21 -313 23 -434 93 -83 49 -214 180 -263 263 -68 117 -87 200 -97 412 -25 511 -122 776 -425 1157l-98 124 12 76c19 118 22 134 31 124 4 -4 65 -80 136 -168z m1789 -179c221 -67 473 -436 584 -857 72 -274 65 -462 -25 -643 -72 -143 -190 -262 -328 -330 -113 -56 -183 -71 -326 -70 -107 1 -137 5 -205 27 -157 52 -297 158 -386 295 -131 200 -151 407 -68 721 109 415 352 776 574 853 61 21 117 22 180 4z" />
    </g>
  </svg>
)

const IconSortSugar = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 4l7 3.5v7l-7 3.5-7-3.5v-7l7-3.5z" />
    <path d="M12 10.5l7-3.5M12 10.5l-7-3.5M12 10.5v7" />
    <line x1="2" y1="22" x2="22" y2="2" stroke="currentColor" />
  </svg>
)

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
  const [debouncedQuery, setDebouncedQuery] = useState(q)
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

  const handleCategoryClick = useCallback((catKey) => {
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
  const showCategories = !hasQuery && !selectedCategory
  const showSubcategories = !hasQuery && selectedCategory

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
              <button
                type="button"
                className="catalog-store-pill"
                onClick={handleStoreInfoClick}
                aria-label={t('catalog.storeInfo', { storeName: storeTitle })}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  storefront
                </span>
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
          <button
            type="button"
            className="catalog-scan-shortcut"
            onClick={handleScanClick}
            aria-label={t('catalog.scanProduct')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              barcode_scanner
            </span>
          </button>
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
                {viewMode === 'list' ? IconListActive : IconList}
              </button>
              <button
                className={`catalog-view-btn${viewMode === 'grid' ? ' active' : ''}`}
                onClick={() => {
                  setViewMode('grid')
                  sessionStorage.setItem('korset_catalog_view', 'grid')
                }}
                aria-label="Сетка"
              >
                {viewMode === 'grid' ? IconGridActive : IconGrid}
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
          <div style={{ display: 'flex', gap: 10, padding: '0 20px', marginBottom: 12 }}>
            {activeSubcategoryKeys.length > 1 && (
              <button
                className={`catalog-dropdown-trigger${isSubMenuOpen || selectedSubcategories.length > 0 ? ' active' : ''}`}
                onClick={() => {
                  setIsSubMenuOpen(!isSubMenuOpen)
                  setIsSortMenuOpen(false)
                }}
              >
                {isSubMenuOpen || selectedSubcategories.length > 0 ? IconFilterActive : IconFilter}
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
              {sort === 'fit'
                ? IconSortFit
                : sort === 'cheap'
                  ? IconSortCheap
                  : sort === 'pricey'
                    ? IconSortPricey
                    : sort === 'protein'
                      ? IconSortProtein
                      : IconSortSugar}
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
              { id: 'fit', label: t('catalog.sort.fit'), icon: IconSortFit },
              { id: 'cheap', label: t('catalog.sort.cheap'), icon: IconSortCheap },
              { id: 'pricey', label: t('catalog.sort.pricey'), icon: IconSortPricey },
              { id: 'protein', label: t('catalog.sort.protein'), icon: IconSortProtein },
              { id: 'sugar', label: t('catalog.sort.sugar'), icon: IconSortSugar },
            ].map((option) => (
              <button
                key={option.id}
                className={`catalog-sort-chip${sort === option.id ? ' active' : ''}`}
                onClick={() => {
                  setSort(option.id)
                  setIsSortMenuOpen(false)
                }}
              >
                {option.icon}
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
                <span className="material-symbols-outlined">travel_explore</span>
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
