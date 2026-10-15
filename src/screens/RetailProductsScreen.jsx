import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import RetailScannerModal from '../components/RetailScannerModal.jsx'
import AddScannedProductModal from '../components/retail/AddScannedProductModal.jsx'
import { useRetailProducts } from '../hooks/useRetailProducts.js'
import {
  GridCard,
  SkeletonRow,
  RetailProductsToolbar,
  RetailProductsTable,
  RetailProductRowCompact,
  RetailProductInspector,
  ConfirmDeleteModal,
} from '../components/retail/products/index.js'
import {
  ExploreIcon,
  AlertTriangleIcon,
  UploadFileIcon,
  BarcodeScannerIcon,
  CheckCircleIcon,
} from '../components/icons/index.js'

export default function RetailProductsScreen() {
  const { t, lang } = useI18n()
  const { storeId, currentStore } = useStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const storeSlug = currentStore?.slug ?? null

  const p = useMemo(
    () => ({
      searchPlaceholder: t('retail.products.searchPlaceholder'),
      viewList: t('retail.products.viewList'),
      viewGrid: t('retail.products.viewGrid'),
      viewTable: t('retail.products.viewTable'),
      filterAll: t('retail.products.filterAll'),
      filterInStock: t('retail.products.filterInStock'),
      filterLowStock: t('retail.products.filterLowStock'),
      filterOutOfStock: t('retail.products.filterOutOfStock'),
      filterPos: t('retail.products.filterPos'),
      filterManual: t('retail.products.filterManual'),
      filterAttention: t('retail.products.filterAttention'),
      allCategories: t('retail.products.allCategories'),
      resetFilters: t('retail.products.resetFilters'),
      colProduct: t('retail.products.colProduct'),
      colCategory: t('retail.products.colCategory'),
      colSource: t('retail.products.colSource'),
      colPrice: t('retail.products.colPrice'),
      colStock: t('retail.products.colStock'),
      colFitCheck: t('retail.products.colFitCheck'),
      colActions: t('retail.products.colActions'),
      sourcePos: t('retail.products.sourcePos'),
      sourceManual: t('retail.products.sourceManual'),
      fitCheckReady: t('retail.products.fitCheckReady'),
      fitCheckPartial: t('retail.products.fitCheckPartial'),
      fitCheckMissing: t('retail.products.fitCheckMissing'),
      inspectorTitle: t('retail.products.inspectorTitle'),
      posDataSection: t('retail.products.posDataSection'),
      posDataHint: t('retail.products.posDataHint'),
      storefrontSection: t('retail.products.storefrontSection'),
      fitCheckSection: t('retail.products.fitCheckSection'),
      closeInspector: t('retail.products.closeInspector'),
      countLabel: (n) => t('retail.products.countLabel', { count: n }),
      scanFound: t('retail.products.scanFound'),
      scanNotFound: t('retail.products.scanNotFound'),
      allLoaded: (n) => t('retail.products.allLoaded', { count: n }),
      notFound: t('retail.products.notFound'),
      emptyCatalog: t('retail.products.emptyCatalog'),
      notFoundSub: t('retail.products.notFoundSub'),
      loadError: t('retail.products.loadError'),
      retry: t('retail.products.retry'),
      noPrice: t('retail.products.noPrice'),
      stockLabel: t('retail.products.stockLabel'),
      shoppingRecommendationLabel: t('retail.products.shoppingRecommendationLabel'),
      recommendationLimitTitle: t('retail.products.recommendationLimitTitle'),
      recommendationLimitMessage: t('retail.products.recommendationLimitMessage'),
      recommendationSaveFailed: t('retail.products.recommendationSaveFailed'),
      deleteProduct: t('retail.products.deleteProduct'),
      saving: t('retail.products.saving'),
      saved: t('retail.products.saved'),
      saveError: t('retail.products.saveError'),
      priceLabel: t('retail.products.priceLabel'),
      inStock: t('retail.products.inStock'),
      lowStock: t('retail.products.lowStock'),
      outOfStock: t('retail.products.outOfStock'),
      stockUnknown: t('integration.consumer.stock.unknown'),
      brandLabel: t('retail.products.brandLabel'),
      categoryLabel: t('retail.products.categoryLabel'),
      quantityLabel: t('retail.products.quantityLabel'),
      openCard: t('retail.products.openCard'),
      deleteHint: t('retail.products.deleteHint'),
      deleteCancel: t('retail.products.deleteCancel'),
      deleteConfirm: t('retail.products.deleteConfirm'),
      featuredLabel: t('retail.products.featuredLabel'),
      featuredHint: t('retail.products.featuredHint'),
      badgeFeatured: t('retail.products.badgeFeatured'),
      promotionSection: t('retail.products.promotionSection'),
      oldPriceLabel: t('retail.products.oldPriceLabel'),
      discountPercentLabel: t('retail.products.discountPercentLabel'),
      clearDiscount: t('retail.products.clearDiscount'),
      sourceManagedNote: t('integration.catalogManagedNote'),
      attention: t('integration.attention'),
      scan: t('retail.products.scan'),
      edit: t('retail.products.edit'),
    }),
    [t]
  )

  const {
    products,
    totalCount,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    search,
    setSearch,
    scanToast,
    triggerScanToast,
    stockMutation,
    priceMutation,
    recommendationMutation,
    promotionMutation,
    deleteMutation,
  } = useRetailProducts(storeId, p)

  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024
  )

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('retail_view_mode')
    if (saved) return saved
    return typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'table' : 'list'
  })

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [activeFilter, setActiveFilter] = useState('all')
  const [inspectedProduct, setInspectedProduct] = useState(null)
  const currentInspectedProduct = inspectedProduct
    ? products.find((product) => product.id === inspectedProduct.id) ?? inspectedProduct
    : null
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [unrecognizedEan, setUnrecognizedEan] = useState(null)

  const scannerOpenRef = useRef(scannerOpen)
  const confirmDeleteIdRef = useRef(confirmDeleteId)
  const inspectedProductRef = useRef(inspectedProduct)
  const unrecognizedEanRef = useRef(unrecognizedEan)

  useEffect(() => {
    scannerOpenRef.current = scannerOpen
    confirmDeleteIdRef.current = confirmDeleteId
    inspectedProductRef.current = inspectedProduct
    unrecognizedEanRef.current = unrecognizedEan
  })

  // Synchronize browser history for modals & inspector drawer
  useEffect(() => {
    const handlePopState = () => {
      if (scannerOpenRef.current) {
        setScannerOpen(false)
      } else if (unrecognizedEanRef.current) {
        setUnrecognizedEan(null)
      } else if (confirmDeleteIdRef.current) {
        setConfirmDeleteId(null)
      } else if (inspectedProductRef.current) {
        setInspectedProduct(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const [scrollParent, setScrollParent] = useState(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScrollParent(
      document.querySelector('.retail-desktop-content') || document.querySelector('.screen')
    )
  }, [])

  const openInspector = useCallback((product) => {
    try {
      window.history.pushState(
        { _retailInternal: true },
        '',
        window.location.pathname + window.location.search
      )
    } catch {
      /* noop */
    }
    setInspectedProduct(product)
  }, [])

  const handleOpenScanner = useCallback(() => {
    try {
      window.history.pushState(
        { _retailInternal: true },
        '',
        window.location.pathname + window.location.search
      )
    } catch {
      /* noop */
    }
    setScannerOpen(true)
  }, [])

  const handleScan = useCallback(
    (ean) => {
      setScannerOpen(false)
      const found = products.find((item) => item.ean === ean)
      if (found) {
        setSearch('')
        openInspector(found)
        triggerScanToast({
          type: 'found',
          label: found.local_name || found.global_products?.name || ean,
        })
      } else {
        try {
          window.history.pushState(
            { _retailInternal: true },
            '',
            window.location.pathname + window.location.search
          )
        } catch {
          /* noop */
        }
        setUnrecognizedEan(ean)
      }
    },
    [products, setSearch, openInspector, triggerScanToast]
  )

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode)
    localStorage.setItem('retail_view_mode', mode)
  }, [])

  const handleResetFilters = useCallback(() => {
    setSelectedCategory('all')
    setActiveFilter('all')
    setSearch('')
  }, [setSearch])

  // ── Client-side Filter & Counts ──────────────────────────────
  const filterCounts = useMemo(() => {
    const base = selectedCategory === 'all'
      ? products
      : products.filter((pr) => pr.global_products?.category === selectedCategory)

    let inStock = 0
    let lowStock = 0
    let outStock = 0
    let pos = 0
    let manual = 0
    let attention = 0

    for (const pr of base) {
      if (pr.stock_status === 'in_stock') inStock++
      else if (pr.stock_status === 'low_stock') lowStock++
      else if (pr.stock_status === 'out_of_stock') outStock++

      if (pr.sync_integration_id) pos++
      else manual++

      if (!pr.price_kzt || Number(pr.price_kzt) <= 0 || !pr.global_products?.name) {
        attention++
      }
    }

    return {
      all: base.length,
      in_stock: inStock,
      low_stock: lowStock,
      out_of_stock: outStock,
      pos,
      manual,
      attention,
    }
  }, [products, selectedCategory])

  const filtered = useMemo(() => {
    return products.filter((product) => {
      if (selectedCategory !== 'all') {
        if (product.global_products?.category !== selectedCategory) return false
      }

      if (activeFilter === 'in_stock') {
        if (product.stock_status !== 'in_stock') return false
      } else if (activeFilter === 'low_stock') {
        if (product.stock_status !== 'low_stock') return false
      } else if (activeFilter === 'out_of_stock') {
        if (product.stock_status !== 'out_of_stock') return false
      } else if (activeFilter === 'pos') {
        if (!product.sync_integration_id) return false
      } else if (activeFilter === 'manual') {
        if (product.sync_integration_id) return false
      } else if (activeFilter === 'attention') {
        const hasIssue =
          !product.price_kzt ||
          Number(product.price_kzt) <= 0 ||
          !product.global_products ||
          !product.global_products.name
        if (!hasIssue) return false
      }

      return true
    })
  }, [products, selectedCategory, activeFilter])

  const gridPairs = useMemo(() => {
    const pairs = []
    for (let i = 0; i < filtered.length; i += 2) {
      pairs.push({ first: filtered[i], second: filtered[i + 1] ?? null })
    }
    return pairs
  }, [filtered])

  // ── Inline States (Loading, Error, Empty) ────────────────────
  const renderEmpty = () => {
    const hasAnyFilter = Boolean(search || selectedCategory !== 'all' || activeFilter !== 'all')
    if (hasAnyFilter) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--rc-ink-3)' }}>
          <ExploreIcon size={44} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.5 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--rc-ink)', marginBottom: 6 }}>
            {p.notFound}
          </div>
          <div style={{ fontSize: 13, color: 'var(--rc-ink-2)', marginBottom: 16 }}>
            {p.notFoundSub}
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '1px solid var(--rc-line)',
              background: 'var(--rc-surface-2)',
              color: 'var(--rc-ink)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {p.resetFilters || 'Сбросить фильтры'}
          </button>
        </div>
      )
    }

    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--rc-ink-3)' }}>
        <UploadFileIcon size={48} style={{ display: 'block', margin: '0 auto 14px', opacity: 0.5 }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--rc-ink)', marginBottom: 6 }}>
          {p.emptyCatalog}
        </div>
        <div style={{ fontSize: 13, color: 'var(--rc-ink-2)', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
          Загрузите прайс-лист магазина или начните сканировать штрихкоды на полках.
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          {storeSlug && (
            <button
              type="button"
              onClick={() => navigate(`/s/${storeSlug}/retail/import`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--rc-accent)',
                color: 'var(--rc-on-accent)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <UploadFileIcon size={16} />
              <span>Импорт прайс-листа</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenScanner}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 10,
              border: '1px solid var(--rc-line)',
              background: 'var(--rc-surface-2)',
              color: 'var(--rc-ink)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <BarcodeScannerIcon size={16} />
            <span>Сканировать штрихкод</span>
          </button>
        </div>
      </div>
    )
  }

  const renderError = () => (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--rc-neg)' }}>
      <AlertTriangleIcon size={40} style={{ display: 'block', margin: '0 auto 12px' }} />
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{p.loadError}</div>
      <button
        type="button"
        onClick={() => refetch()}
        style={{
          padding: '8px 16px',
          borderRadius: 10,
          border: '1px solid var(--rc-line)',
          background: 'var(--rc-surface-2)',
          color: 'var(--rc-ink)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {p.retry}
      </button>
    </div>
  )

  const activeView = isDesktop && viewMode === 'table' ? 'table' : viewMode

  return (
    <div className="retail-screen-canvas" style={{ paddingBottom: 24 }}>
      {/* ── Sticky Toolbar ── */}
      <RetailProductsToolbar
        search={search}
        onSearchChange={setSearch}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        filterCounts={filterCounts}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        isDesktop={isDesktop}
        onOpenScanner={handleOpenScanner}
        onResetFilters={handleResetFilters}
        tr={p}
        lang={lang}
      />

      {/* ── Toast Alert ── */}
      {scanToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: isDesktop ? 32 : 88,
            left: '50%',
            transform: 'translateX(-50%)',
            background:
              scanToast.type === 'recommendation_limit' || scanToast.type === 'recommendation_error'
                ? 'var(--rc-warn-soft)'
                : 'var(--rc-surface-2)',
            color: 'var(--rc-ink)',
            border:
              scanToast.type === 'recommendation_limit' || scanToast.type === 'recommendation_error'
                ? '1px solid var(--rc-warn)'
                : '1px solid var(--rc-line)',
            borderRadius: 12,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 500,
            boxShadow: 'var(--rc-shadow)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {scanToast.type === 'recommendation_limit' || scanToast.type === 'recommendation_error' ? (
            <AlertTriangleIcon size={16} color="var(--rc-warn)" />
          ) : (
            <CheckCircleIcon size={16} color="var(--rc-pos)" />
          )}
          <span>{scanToast.label}</span>
        </div>
      )}

      {/* ── Main Catalog Content ── */}
      <div style={{ marginTop: 14 }}>
        {isLoading && products.length === 0 ? (
          <div style={{ padding: '0 16px' }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : isError && products.length === 0 ? (
          renderError()
        ) : filtered.length === 0 ? (
          renderEmpty()
        ) : activeView === 'table' ? (
          <RetailProductsTable
            products={filtered}
            search={search}
            totalCount={totalCount}
            scrollParent={scrollParent}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            onInspectProduct={openInspector}
            tr={p}
            lang={lang}
          />
        ) : activeView === 'grid' ? (
          <Virtuoso
            customScrollParent={scrollParent}
            data={gridPairs}
            increaseViewportBy={{ top: 600, bottom: 600 }}
            endReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage()
            }}
            itemContent={(_, pair) => (
              <div style={{ display: 'flex', gap: 10, padding: '5px 16px', alignItems: 'stretch' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <GridCard product={pair.first} tr={p} onEdit={openInspector} />
                </div>
                {pair.second ? (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <GridCard product={pair.second} tr={p} onEdit={openInspector} />
                  </div>
                ) : (
                  <div style={{ flex: 1 }} />
                )}
              </div>
            )}
            components={{
              Footer: () => (
                <div style={{ padding: '4px 16px 12px' }}>
                  {isFetchingNextPage && (
                    <div style={{ display: 'flex', gap: 10, padding: '0 16px' }}>
                      <div style={{ flex: 1 }}>
                        <SkeletonRow />
                      </div>
                      <div style={{ flex: 1 }}>
                        <SkeletonRow />
                      </div>
                    </div>
                  )}
                  {!hasNextPage && filtered.length > 0 && (
                    <div
                      style={{
                        textAlign: 'center',
                        fontSize: 12,
                        color: 'var(--rc-ink-3)',
                        padding: '12px 0',
                      }}
                    >
                      {p.allLoaded(totalCount)}
                    </div>
                  )}
                </div>
              ),
            }}
          />
        ) : (
          /* Mobile List View */
          <Virtuoso
            customScrollParent={scrollParent}
            data={filtered}
            increaseViewportBy={{ top: 600, bottom: 600 }}
            endReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage()
            }}
            itemContent={(_, product) => (
              <div style={{ padding: '0 16px' }}>
                <RetailProductRowCompact
                  product={product}
                  search={search}
                  onInspect={openInspector}
                  tr={p}
                />
              </div>
            )}
            components={{
              Footer: () => (
                <div style={{ padding: '4px 16px 12px' }}>
                  {isFetchingNextPage && <SkeletonRow />}
                  {!hasNextPage && filtered.length > 0 && (
                    <div
                      style={{
                        textAlign: 'center',
                        fontSize: 12,
                        color: 'var(--rc-ink-3)',
                        padding: '12px 0',
                      }}
                    >
                      {p.allLoaded(totalCount)}
                    </div>
                  )}
                </div>
              ),
            }}
          />
        )}
      </div>

      {/* ── Product Inspector (Drawer on Desktop / Bottom Sheet on Mobile) ── */}
      <RetailProductInspector
        product={currentInspectedProduct}
        tr={p}
        storeSlug={storeSlug}
        priceMutation={priceMutation}
        stockMutation={stockMutation}
        recommendationMutation={recommendationMutation}
        promotionMutation={promotionMutation}
        isDesktop={isDesktop}
        onClose={() => setInspectedProduct(null)}
        onDeleteRequest={(id) => {
          try {
            window.history.pushState(
              { _retailInternal: true },
              '',
              window.location.pathname + window.location.search
            )
          } catch {
            /* noop */
          }
          setConfirmDeleteId(id)
        }}
      />

      {/* ── Confirm Delete Modal ── */}
      <ConfirmDeleteModal
        product={filtered.find((pr) => pr.id === confirmDeleteId) ?? null}
        tr={p}
        deleteMutation={deleteMutation}
        onClose={() => setConfirmDeleteId(null)}
      />

      {/* ── Scanner Modal ── */}
      {scannerOpen && (
        <RetailScannerModal onScan={handleScan} onClose={() => setScannerOpen(false)} />
      )}

      {/* ── Add Scanned Product Modal ── */}
      {unrecognizedEan && (
        <AddScannedProductModal
          ean={unrecognizedEan}
          storeId={storeId}
          onClose={() => setUnrecognizedEan(null)}
          onAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['retail-products', storeId] })
            triggerScanToast({
              type: 'found',
              label: t('retail.products.productAdded'),
            })
          }}
        />
      )}
    </div>
  )
}
