import {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  forwardRef,
} from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Virtuoso } from 'react-virtuoso'
import { checkProductFit, formatPrice, getCategoryLabel } from '../utils/fitCheck.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { useOffline } from '../contexts/OfflineContext.jsx'
import { useUserData } from '../contexts/UserDataContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import AuthPromptModal from '../components/AuthPromptModal.jsx'
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
import { CatalogSearchResultsBar } from '../components/catalog/CatalogSearchResultsBar.jsx'
import { CatalogCompareBar } from '../components/catalog/CatalogCompareBar.jsx'
import { CatalogEmptyView } from '../components/catalog/CatalogEmptyView.jsx'
import CatalogFilterDrawer from '../components/catalog/CatalogFilterDrawer.jsx'
import '../components/catalog/CatalogScreen.css'

function getVerdictConfig(fit, t) {
  const v = fit.verdict
  if (v === 'danger') return { cls: 'danger', icon: 'cancel', label: t('catalog.verdict.danger') }
  if (v === 'warning')
    return { cls: 'warning', icon: 'error_outline', label: t('catalog.verdict.warning') }
  if (v === 'caution')
    return { cls: 'caution', icon: 'warning', label: t('catalog.verdict.caution') }
  return { cls: 'safe', icon: 'check_circle', label: t('catalog.verdict.safe') }
}

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
  const { user } = useAuth()
  const { favoriteEans = new Set(), toggleFavorite } = useUserData() || {}
  const location = useLocation()

  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const [offlineCatalog, setOfflineCatalog] = useState([])
  const [viewMode, setViewMode] = useState(
    () => sessionStorage.getItem('korset_catalog_view') || 'grid'
  )
  const [fitDrawerOpen, setFitDrawerOpen] = useState(false)
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false)
  const isScrolledRef = useRef(false)
  const showcaseScrollRef = useRef(0)

  const handleToggleFavorite = useCallback(
    (product) => {
      if (!user) {
        setAuthPromptOpen(true)
        return
      }
      toggleFavorite?.(product)
    },
    [user, toggleFavorite]
  )

  const handleShowcaseScroll = useCallback((e) => {
    const top = e.currentTarget.scrollTop
    showcaseScrollRef.current = top
    if (top > 14 && !isScrolledRef.current) {
      isScrolledRef.current = true
      setIsHeaderScrolled(true)
    } else if (top <= 2 && isScrolledRef.current) {
      isScrolledRef.current = false
      setIsHeaderScrolled(false)
    }
  }, [])

  const virtuosoRef = useRef(null)
  const productScrollerRef = useRef(null)
  const [productScroller, setProductScrollerState] = useState(null)
  const setProductScroller = useCallback((element) => {
    productScrollerRef.current = element
    setProductScrollerState(element)
  }, [])
  const scrollRef = useRef(0)
  const isInitialMount = useRef(true)
  const [initialScrollIndex, setInitialScrollIndex] = useState(() =>
    parseInt(sessionStorage.getItem('korset_catalog_scroll') || '0', 10)
  )
  const [isHeaderHidden, setIsHeaderHidden] = useState(false)
  const headerGroupRef = useRef(null)

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
    clearSearchHistory,
    removeSearchHistoryEntry,
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
    displayList,
    searchCategoryFilter,
    setSearchCategoryFilter,
    searchCategoryCounts,
    rawSearchCount,
    extraFilters,
    handleToggleExtraFilter,
    totalActiveFilterCount,
    resetAllFilters,
    isFilterDrawerOpen,
    setIsFilterDrawerOpen,
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

  const isSentinelPopRef = useRef(false)

  // Push a sentinel history entry when a category is selected so hardware back
  // / swipe-back stays within the catalog instead of leaving the screen.
  useEffect(() => {
    if (selectedCategory) {
      window.history.pushState({ korsetCatalogCategory: selectedCategory }, '')
    }
  }, [selectedCategory])

  useEffect(() => {
    const onPopState = (e) => {
      // Ignore pops we triggered ourselves (from the UI back button)
      if (isSentinelPopRef.current) {
        isSentinelPopRef.current = false
        return
      }
      if (e.state?.korsetCatalogCategory) {
        // Hardware/gesture back — absorb sentinel, stay on catalog
        handleBackToCategories()
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [handleBackToCategories])

  // UI back-button handler: pop the sentinel ourselves before resetting state
  const handleBackToCategoriesFromUI = useCallback(() => {
    if (window.history.state?.korsetCatalogCategory) {
      isSentinelPopRef.current = true
      window.history.go(-1)
    }
    handleBackToCategories()
  }, [handleBackToCategories])

  // Reset scroll on category/search change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    sessionStorage.setItem('korset_catalog_scroll', '0')
    scrollRef.current = 0
    setInitialScrollIndex(0)
    setIsHeaderHidden(false)
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

  const fitCount = useMemo(() => {
    if (
      !isFitConfigured ||
      !isCatalogReady ||
      isCatalogLoading ||
      catalogLoadError ||
      !baseProducts.length
    )
      return null
    return baseProducts.reduce(
      (count, product) => count + Number(checkProductFit(product, profile).fits),
      0
    )
  }, [isFitConfigured, isCatalogReady, isCatalogLoading, catalogLoadError, baseProducts, profile])

  const storeTitle =
    currentStore?.name ||
    (storeSlug ? `${storeSlug.charAt(0).toUpperCase()}${storeSlug.slice(1)}` : 'Körset')

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

  const handleViewModeChange = useCallback(
    (mode) => {
      if (mode === viewMode) return
      setInitialScrollIndex(scrollRef.current)
      setViewMode(mode)
      sessionStorage.setItem('korset_catalog_view', mode)
    },
    [viewMode]
  )

  const isHeaderHiddenComputed = !showCategories && isHeaderHidden

  // Directional auto-hiding header for product list (smooth, no layout jump)
  useEffect(() => {
    if (showCategories) return

    const scroller = productScroller || productScrollerRef.current
    if (!scroller) return

    let lastScrollTop = scroller.scrollTop
    let accumulatedDown = 0
    let accumulatedUp = 0

    const handleScroll = () => {
      const currentTop = scroller.scrollTop
      const delta = currentTop - lastScrollTop

      if (isSearchFocused) {
        setIsHeaderHidden(false)
        lastScrollTop = currentTop
        return
      }

      if (currentTop <= 40) {
        // Dock header cleanly when nearing the top
        setIsHeaderHidden(false)
        accumulatedDown = 0
        accumulatedUp = 0
      } else {
        if (delta > 4) {
          accumulatedUp = 0
          accumulatedDown += delta
          if (accumulatedDown > 36 && currentTop > 50) {
            setIsHeaderHidden(true)
            setIsSubMenuOpen(false)
            setIsSortMenuOpen(false)
          }
        } else if (delta < -4) {
          accumulatedDown = 0
          accumulatedUp += Math.abs(delta)
          if (accumulatedUp > 45) {
            setIsHeaderHidden(false)
          }
        }
      }

      lastScrollTop = currentTop
    }

    scroller.addEventListener('scroll', handleScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', handleScroll)
  }, [showCategories, productScroller, isSearchFocused, setIsSubMenuOpen, setIsSortMenuOpen])

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
          highlightQuery={hasQuery ? q : ''}
          onOpen={() => handleNavigate(product)}
          onCompare={(e) => handleCompare(product, e)}
          onToggleFavorite={handleToggleFavorite}
        />
      )
    },
    [
      profile,
      comparePin,
      handleCompare,
      handleNavigate,
      t,
      lang,
      favoriteEans,
      handleToggleFavorite,
      hasQuery,
      q,
    ]
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
        <div className="catalog-list-row">
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
            highlightQuery={hasQuery ? q : ''}
            onOpen={() => handleNavigate(product)}
            onCompare={(e) => handleCompare(product, e)}
            onToggleFavorite={handleToggleFavorite}
          />
        </div>
      )
    },
    [
      profile,
      comparePin,
      handleCompare,
      handleNavigate,
      t,
      lang,
      favoriteEans,
      handleToggleFavorite,
      hasQuery,
      q,
    ]
  )

  const gridRows = useMemo(() => {
    if (viewMode !== 'grid') return []
    const rows = []
    for (let i = 0; i < displayList.length; i += 2) {
      const p1 = displayList[i]
      const p2 = displayList[i + 1]
      rows.push({
        id: `${p1?.ean || i}_${p2?.ean || 'end'}`,
        startIndex: i,
        items: p2 ? [p1, p2] : [p1],
      })
    }
    return rows
  }, [displayList, viewMode])

  const renderGridRow = useCallback(
    (rowIndex, row) => (
      <div className="catalog-grid-row">
        {row.items.map((product, colIndex) => (
          <div key={product.ean || `${row.startIndex}-${colIndex}`} className="catalog-grid-col">
            {renderGridItem(row.startIndex + colIndex, product)}
          </div>
        ))}
        {row.items.length === 1 && (
          <div className="catalog-grid-col catalog-grid-col--placeholder" aria-hidden="true" />
        )}
      </div>
    ),
    [renderGridItem]
  )

  const handleCategoryFromEmptyState = useCallback(
    (catKey) => {
      setQ('')
      handleCategoryClick(catKey)
    },
    [setQ, handleCategoryClick]
  )

  const popularProducts = useMemo(() => {
    if (!baseProducts || baseProducts.length === 0) return []
    const result = []
    for (let i = 0; i < baseProducts.length && result.length < 6; i += 1) {
      if (baseProducts[i]?.image) {
        result.push(baseProducts[i])
      }
    }
    if (result.length >= 4) return result
    return baseProducts.slice(0, 6)
  }, [baseProducts])

  return (
    <div
      className="screen"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        paddingBottom: 0,
        overflow: 'hidden',
      }}
    >
      <div
        ref={headerGroupRef}
        className={`catalog-header-group${!showCategories ? ' is-product-view' : ''}${isHeaderHiddenComputed ? ' is-header-hidden' : ''}`}
      >
        <CatalogTopBar
          isScrolled={showCategories ? isHeaderScrolled : false}
          q={q}
          setQ={setQ}
          onClearQuery={() => setQ('')}
          searchHint={searchHint}
          isSearchFocused={isSearchFocused}
          setIsSearchFocused={setIsSearchFocused}
          onRememberSearch={rememberCatalogSearch}
          recentSearches={recentSearches}
          serverSearch={serverSearch}
          onSelectCategory={handleCategoryClick}
          onRemoveHistoryEntry={removeSearchHistoryEntry}
          onClearHistory={clearSearchHistory}
          onScanClick={handleScanClick}
          showCategories={showCategories}
          showSubcategories={showSubcategories}
          selectedCategoryTitle={getCategoryLabel(selectedCategory, lang)}
          onBackToCategories={handleBackToCategoriesFromUI}
          viewMode={viewMode}
          setViewMode={handleViewModeChange}
          isFitConfigured={isFitConfigured}
          fitChips={fitChips}
          fitCount={fitCount}
          onOpenFitDrawer={() => setFitDrawerOpen(true)}
          lang={lang}
          t={t}
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

        <div
          className={`catalog-subcategory-nav-wrap${isHeaderHiddenComputed ? ' is-hidden' : ''}`}
        >
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
              onOpenFilterDrawer={() => setIsFilterDrawerOpen(true)}
              totalActiveFilterCount={totalActiveFilterCount}
              onResetAllFilters={resetAllFilters}
              t={t}
              lang={lang}
            />
          )}

          {hasQuery && displayList.length > 0 && (
            <CatalogSearchResultsBar
              resultsCount={displayList.length}
              rawResultsCount={rawSearchCount}
              categoryCounts={searchCategoryCounts}
              selectedCategoryFilter={searchCategoryFilter}
              onSelectCategoryFilter={setSearchCategoryFilter}
              sort={sort}
              onSelectSort={setSort}
              isSortMenuOpen={isSortMenuOpen}
              setIsSortMenuOpen={setIsSortMenuOpen}
              onOpenFilterDrawer={() => setIsFilterDrawerOpen(true)}
              totalActiveFilterCount={totalActiveFilterCount}
              onResetAllFilters={resetAllFilters}
              lang={lang}
              t={t}
            />
          )}
        </div>

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
      </div>

      {showCategories && (
        <CategoryShowcaseGrid
          activeCategoryKeys={activeCategoryKeys}
          pendingCategory={pendingCategory}
          onCategoryClick={handleCategoryClick}
          onScroll={handleShowcaseScroll}
          scrollPositionRef={showcaseScrollRef}
          lang={lang}
          t={t}
          baseProductsCount={baseProducts.length}
          storeName={storeTitle}
          isCatalogReady={isCatalogReady}
          isCatalogLoading={isCatalogLoading}
        />
      )}

      {!showCategories && (
        <div style={{ flex: 1, minHeight: 0, height: '100%', position: 'relative' }}>
          {displayList.length === 0 ? (
            <div style={{ height: '100%', boxSizing: 'border-box' }}>
              <CatalogEmptyView
                hasQuery={hasQuery}
                isQueryTooShort={hasQuery && !isSearching}
                serverSearchStatus={serverSearch.status}
                isSearchPending={isSearchPending}
                q={q}
                searchSuggestions={searchSuggestions}
                onSelectSuggestion={(s) => setQ(s)}
                onClearQuery={() => setQ('')}
                onSelectCategory={handleCategoryFromEmptyState}
                onBackToCategories={handleBackToCategoriesFromUI}
                activeCategoryKeys={activeCategoryKeys}
                popularProducts={popularProducts}
                renderProductCard={renderGridItem}
                storeName={storeTitle}
                isCatalogLoading={isCatalogLoading}
                lang={lang}
                t={t}
              />
            </div>
          ) : viewMode === 'grid' ? (
            <Virtuoso
              ref={virtuosoRef}
              scrollerRef={setProductScroller}
              data={gridRows}
              itemContent={renderGridRow}
              computeItemKey={(index, row) => row.id}
              overscan={1200}
              components={{ Footer: ListFooter }}
              initialTopMostItemIndex={Math.floor(initialScrollIndex / 2)}
              rangeChanged={(range) => {
                scrollRef.current = range.startIndex * 2
              }}
              style={{ height: '100%', overflowAnchor: 'none' }}
            />
          ) : (
            <Virtuoso
              ref={virtuosoRef}
              scrollerRef={setProductScroller}
              data={displayList}
              itemContent={renderListItem}
              computeItemKey={(index, product) => product.ean || index}
              overscan={1200}
              components={{ Footer: ListFooter }}
              initialTopMostItemIndex={initialScrollIndex}
              rangeChanged={(range) => {
                scrollRef.current = range.startIndex
              }}
              style={{ height: '100%', overflowAnchor: 'none' }}
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

      <CatalogFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        totalResultsCount={displayList.length}
        sort={sort}
        onSelectSort={setSort}
        selectedCategory={selectedCategory}
        activeSubcategoryKeys={activeSubcategoryKeys}
        subcategoryCountMap={subcategoryCountMap}
        selectedSubcategories={selectedSubcategories}
        onToggleSubcategory={handleToggleSubcategory}
        onResetSubcategories={handleResetSubcategories}
        extraFilters={extraFilters}
        onToggleExtraFilter={handleToggleExtraFilter}
        totalActiveFilterCount={totalActiveFilterCount}
        onResetAllFilters={resetAllFilters}
        lang={lang}
        t={t}
      />
      <AuthPromptModal
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        title={t('shopping.authPromptTitle')}
        description={t('shopping.authPromptDesc')}
      />
    </div>
  )
}
