import { useState, useMemo, useEffect, useCallback, useRef, forwardRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso'
import { checkProductFit, formatPrice, getCategoryLabel } from '../utils/fitCheck.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { useOffline } from '../contexts/OfflineContext.jsx'
import { useUserData } from '../contexts/UserDataContext.jsx'
import { useI18n } from '../i18n/index.js'
import { getLocalName } from '../utils/localName.js'
import { getCatalogFromIndexedDB } from '../utils/offlineDB.js'
import {
  buildProductPath,
  buildComparePath,
  buildScanPath,
  buildProfilePath,
} from '../utils/routes.js'
import { getDisplayQuantity } from '../utils/parseQuantity.js'
import { getProductSearchDiagnosticsAttrs } from '../domain/product/searchDiagnostics.js'
import {
  buildCatalogProductCardBadges,
  getCatalogProductCardKcal,
} from '../domain/catalog/catalogProductCardModel.js'
import { DIET_PREFERENCES } from '../constants/dietGoals.js'
import { ALLERGENS } from '../constants/allergens.js'

import { useCatalogSearch } from '../hooks/useCatalogSearch.js'
import { useCatalogFilter } from '../hooks/useCatalogFilter.js'

import CatalogProductCard from '../components/catalog/CatalogProductCard.jsx'
import { getProductBadgeSummary } from '../domain/home/homeScreenModel.js'
import FitCheckDrawer from '../components/home/FitCheckDrawer.jsx'
import { CatalogTopBar } from '../components/catalog/CatalogTopBar.jsx'
import { CategoryShowcaseGrid } from '../components/catalog/CategoryShowcaseGrid.jsx'
import { CatalogSubcategoryNav } from '../components/catalog/CatalogSubcategoryNav.jsx'
import { CatalogCompareBar } from '../components/catalog/CatalogCompareBar.jsx'
import { CatalogEmptyView } from '../components/catalog/CatalogEmptyView.jsx'

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
      paddingBottom: 84,
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

const ListFooter = forwardRef(({ style, ...props }, ref) => (
  <div ref={ref} style={{ ...style, height: 84 }} {...props} />
))

export default function CatalogScreen() {
  const navigate = useNavigate()
  const { storeSlug } = useParams()
  const { t, lang } = useI18n()
  const { profile, updateProfile } = useProfile()
  const {
    storeId,
    currentStore,
    catalogProducts,
    isCatalogReady,
    isCatalogLoading,
    catalogLoadError,
  } = useStore()
  const { isOnline } = useOffline()
  const { favoriteEans = new Set(), toggleFavorite } = useUserData() || {}
  const location = useLocation()

  const [offlineCatalog, setOfflineCatalog] = useState([])
  const [viewMode, setViewMode] = useState(
    () => sessionStorage.getItem('korset_catalog_view') || 'grid'
  )
  const [fitDrawerOpen, setFitDrawerOpen] = useState(false)
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false)
  const isScrolledRef = useRef(false)

  const handleShowcaseScroll = useCallback((e) => {
    const top = e.currentTarget.scrollTop
    if (top > 35 && !isScrolledRef.current) {
      isScrolledRef.current = true
      setIsHeaderScrolled(true)
    } else if (top <= 12 && isScrolledRef.current) {
      isScrolledRef.current = false
      setIsHeaderScrolled(false)
    }
  }, [])

  const virtuosoRef = useRef(null)
  const scrollRef = useRef(0)
  const isInitialMount = useRef(true)
  const [initialScrollIndex] = useState(() =>
    parseInt(sessionStorage.getItem('korset_catalog_scroll') || '0', 10)
  )

  // Fallback offline catalog from IndexedDB
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
    if (storeId && catalogProducts?.length > 0) return catalogProducts
    if (!isOnline && offlineCatalog.length > 0) {
      return offlineCatalog.filter((p) => String(p.store_id || p.storeId) === String(storeId))
    }
    return []
  }, [storeId, catalogProducts, isOnline, offlineCatalog])

  // Custom hook: Search & History
  const {
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
  } = useCatalogSearch({
    storeId,
    storeSlug: currentStore?.slug || storeSlug,
    isOnline,
    location,
  })

  // Custom hook: Categories, Subcategories, Filtering & Sorting
  const {
    sort,
    setSort,
    selectedCategory,
    selectedSubcategories,
    setSelectedSubcategories,
    pendingCategory,
    isSubMenuOpen,
    setIsSubMenuOpen,
    isSortMenuOpen,
    setIsSortMenuOpen,
    activeCategoryKeys,
    subcategoryCountMap,
    activeSubcategoryKeys,
    activeFilterCount,
    fitCount,
    displayList,
    handleCategoryClick,
    handleBackToCategories,
  } = useCatalogFilter({
    baseProducts,
    profile,
    location,
    debouncedQuery,
    isSearching,
    normalizedQuery,
    canUseServerSearch,
    serverSearch,
  })

  // Reset scroll on category/search change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    sessionStorage.setItem('korset_catalog_scroll', '0')
    scrollRef.current = 0
    isScrolledRef.current = false
    setIsHeaderScrolled(false)
    if (virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({ index: 0, align: 'start', behavior: 'auto' })
    }
  }, [selectedCategory, selectedSubcategories, sort, q])

  // Pinned compare product
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

  const handleScanClick = useCallback(() => {
    navigate(buildScanPath(activeStoreSlug))
  }, [activeStoreSlug, navigate])

  const showCategories = !hasQuery && !selectedCategory
  const showSubcategories = !hasQuery && Boolean(selectedCategory)
  const searchHint = !isCatalogReady && q.trim() ? t('catalog.loadingSearch') : null
  const isFitConfigured = useMemo(() => {
    if (!profile) return false
    const hasDiet = Boolean(profile.halal || profile.halalOnly || profile.dietGoals?.length)
    const hasAllergen = Boolean(profile.allergens?.length || profile.customAllergens?.length)
    const hasExplicitNo = Boolean(profile.noDietPreferences && profile.noAllergies)
    return hasDiet || hasAllergen || hasExplicitNo
  }, [profile])

  const fitChips = useMemo(() => {
    if (!isFitConfigured || !profile) return []
    const chips = []
    if (profile.halal || profile.halalOnly) {
      chips.push({ key: 'halal', icon: 'halal', label: t('home.filterHalal') })
    }
    for (const goal of profile.dietGoals || []) {
      const pref = DIET_PREFERENCES.find((d) => d.id === goal)
      if (pref) chips.push({ key: goal, icon: pref.icon, label: pref.label[lang] || pref.label.ru })
    }
    for (const allergen of profile.allergens || []) {
      const meta = ALLERGENS.find((a) => a.id === allergen)
      if (meta)
        chips.push({ key: allergen, icon: meta.icon, label: meta.label[lang] || meta.label.ru })
    }
    for (const custom of profile.customAllergens || []) {
      chips.push({ key: `custom:${custom}`, icon: null, label: custom })
    }
    return chips
  }, [isFitConfigured, profile, lang, t])

  const storeTitle =
    currentStore?.name ||
    (storeSlug ? `${storeSlug.charAt(0).toUpperCase()}${storeSlug.slice(1)}` : 'Körset')

  const showRecentSearches = isSearchFocused && !hasQuery && recentSearches.length > 0

  const handleToggleSubcategory = useCallback(
    (subKey) => {
      setSelectedSubcategories((prev) =>
        prev.includes(subKey) ? prev.filter((k) => k !== subKey) : [...prev, subKey]
      )
    },
    [setSelectedSubcategories]
  )

  const handleResetSubcategories = useCallback(() => {
    setSelectedSubcategories([])
    setIsSubMenuOpen(false)
  }, [setSelectedSubcategories, setIsSubMenuOpen])

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode)
    sessionStorage.setItem('korset_catalog_view', mode)
  }, [])

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
      const allBadges = buildCatalogProductCardBadges(product, t)
      const primaryKey = getProductBadgeSummary(product, lang).badges[0]?.key
      const badges = allBadges.length
        ? [allBadges.find((badge) => badge.id === primaryKey) || allBadges[0]]
        : []
      const extraBadgeCount = Math.max(0, allBadges.length - badges.length)
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
          extraBadgeCount={extraBadgeCount}
          kcalLabel={kcal ? t('catalog.badge.kcal', { value: kcal }) : null}
          compareState={compareState}
          compareLabel={compareLabel}
          searchDiagnosticsAttrs={searchDiagnosticsAttrs}
          isFavorite={favoriteEans.has(product.ean)}
          onOpen={() => handleNavigate(product)}
          onCompare={(e) => handleCompare(product, e)}
          onToggleFavorite={toggleFavorite}
        />
      )
    },
    [profile, comparePin, handleCompare, handleNavigate, t, lang, favoriteEans, toggleFavorite]
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
      const allBadges = buildCatalogProductCardBadges(product, t)
      const primaryKey = getProductBadgeSummary(product, lang).badges[0]?.key
      const badges = allBadges.length
        ? [allBadges.find((badge) => badge.id === primaryKey) || allBadges[0]]
        : []
      const extraBadgeCount = Math.max(0, allBadges.length - badges.length)
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
          extraBadgeCount={extraBadgeCount}
          kcalLabel={kcal ? t('catalog.badge.kcal', { value: kcal }) : null}
          compareState={compareState}
          compareLabel={compareLabel}
          searchDiagnosticsAttrs={searchDiagnosticsAttrs}
          isFavorite={favoriteEans.has(product.ean)}
          onOpen={() => handleNavigate(product)}
          onCompare={(e) => handleCompare(product, e)}
          onToggleFavorite={toggleFavorite}
        />
      )
    },
    [profile, comparePin, handleCompare, handleNavigate, t, lang, favoriteEans, toggleFavorite]
  )

  return (
    <div
      className="screen"
      style={{ display: 'flex', flexDirection: 'column', height: '100dvh', paddingBottom: 0 }}
    >
      <CatalogTopBar
        isScrolled={isHeaderScrolled}
        q={q}
        setQ={setQ}
        onClearQuery={() => setQ('')}
        searchHint={searchHint}
        isSearchFocused={isSearchFocused}
        setIsSearchFocused={setIsSearchFocused}
        onRememberSearch={rememberCatalogSearch}
        showRecentSearches={showRecentSearches}
        recentSearches={recentSearches}
        onScanClick={handleScanClick}
        showCategories={showCategories}
        showSubcategories={showSubcategories}
        selectedCategoryTitle={getCategoryLabel(selectedCategory, lang)}
        onBackToCategories={handleBackToCategories}
        viewMode={viewMode}
        setViewMode={handleViewModeChange}
        isFitConfigured={isFitConfigured}
        fitChips={fitChips}
        fitCount={fitCount}
        onOpenFitDrawer={() => setFitDrawerOpen(true)}
        t={t}
        lang={lang}
      />

      {catalogLoadError && isOnline && (
        <div
          role="alert"
          style={{
            margin: '8px 20px',
            padding: '10px 12px',
            borderRadius: 12,
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text)',
          }}
        >
          {t('catalog.loadError')}
        </div>
      )}

      {showSubcategories && (
        <CatalogSubcategoryNav
          selectedCategory={selectedCategory}
          activeSubcategoryKeys={activeSubcategoryKeys}
          subcategoryCountMap={subcategoryCountMap}
          selectedSubcategories={selectedSubcategories}
          onToggleSubcategory={handleToggleSubcategory}
          onResetSubcategories={handleResetSubcategories}
          isSubMenuOpen={isSubMenuOpen}
          setIsSubMenuOpen={setIsSubMenuOpen}
          sort={sort}
          onSelectSort={setSort}
          isSortMenuOpen={isSortMenuOpen}
          setIsSortMenuOpen={setIsSortMenuOpen}
          t={t}
          lang={lang}
        />
      )}

      {comparePin && (
        <CatalogCompareBar
          comparePin={comparePin}
          onClearPin={() => {
            sessionStorage.removeItem('korset_compare_a')
            setComparePin(null)
          }}
          t={t}
        />
      )}

      {showCategories && (
        <CategoryShowcaseGrid
          activeCategoryKeys={activeCategoryKeys}
          pendingCategory={pendingCategory}
          onCategoryClick={handleCategoryClick}
          onScroll={handleShowcaseScroll}
          lang={lang}
          t={t}
          baseProductsCount={baseProducts.length}
          storeName={storeTitle}
          isCatalogReady={isCatalogReady}
          isCatalogLoading={isCatalogLoading}
        />
      )}

      {!showCategories && (
        <div style={{ flex: 1, minHeight: 0 }}>
          {displayList.length === 0 ? (
            <CatalogEmptyView
              hasQuery={hasQuery}
              serverSearchStatus={serverSearch.status}
              isSearchPending={isSearchPending}
              q={q}
              searchSuggestions={searchSuggestions}
              onSelectSuggestion={(s) => setQ(s)}
              onClearQuery={() => setQ('')}
              isCatalogLoading={isCatalogLoading}
              t={t}
            />
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

      <FitCheckDrawer
        open={fitDrawerOpen}
        onClose={() => setFitDrawerOpen(false)}
        profile={profile || {}}
        updateProfile={updateProfile}
        onOpenFullPreferences={() =>
          navigate(`${buildProfilePath(activeStoreSlug)}?tab=preferences`)
        }
      />
    </div>
  )
}
