import { memo } from 'react'
import {
  BarcodeScannerIcon,
  CloseIcon,
  ArrowBackIcon,
  SearchIcon,
  HistoryIcon,
  SlidersIcon,
  DietIcon,
} from '../icons/index.js'

function formatCatalogCount(value) {
  if (value == null) return ''
  return new Intl.NumberFormat('ru-RU').format(value)
}

function ChevronRightMini({ size = 11, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4.25 2.5L7.75 6l-3.5 3.5" />
    </svg>
  )
}

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

function CatalogTopBarComponent({
  isScrolled = false,
  q,
  setQ,
  onClearQuery,
  searchHint,
  _isSearchFocused,
  setIsSearchFocused,
  onRememberSearch,
  showRecentSearches,
  recentSearches,
  onScanClick,
  showCategories,
  showSubcategories,
  selectedCategoryTitle,
  onBackToCategories,
  viewMode,
  setViewMode,
  isFitConfigured = false,
  fitChips = [],
  fitCount = null,
  onOpenFitDrawer,
  t,
  lang,
}) {
  return (
    <header className={`catalog-topbar${isScrolled ? ' is-scrolled' : ''}`}>
      <div className="catalog-topbar__bg" aria-hidden="true" />

      {showSubcategories && (
        <div className="catalog-topbar__row catalog-topbar__row--title">
          <button
            type="button"
            onClick={onBackToCategories}
            className="catalog-topbar__back-btn"
            aria-label={t('catalog.back')}
          >
            <ArrowBackIcon size={20} />
          </button>
          <h1 className="catalog-topbar__cat-title">
            {selectedCategoryTitle}
          </h1>
        </div>
      )}

      {showCategories && !showRecentSearches && (
        <div className="catalog-topbar__fit-row">
          <button
            type="button"
            className={`catalog-topbar__fit-btn${isFitConfigured ? ' is-configured' : ''}`}
            onClick={onOpenFitDrawer}
            aria-label={t('catalog.fitSetupTitle')}
          >
            <div className="catalog-topbar__fit-lead">
              <span className="catalog-topbar__fit-lead-icon" aria-hidden="true">
                <SlidersIcon size={14} />
              </span>
              <span className="catalog-topbar__fit-title">
                {t('catalog.fitSmartTitle')}
              </span>

              {isFitConfigured ? (
                <div
                  className="catalog-topbar__fit-icons"
                  aria-label={fitChips.map((c) => c.label).join(', ')}
                >
                  {fitChips.slice(0, 4).map((chip) => (
                    <span
                      key={chip.key}
                      className="catalog-topbar__fit-icon-bubble"
                      title={chip.label}
                      aria-label={chip.label}
                    >
                      <DietIcon name={chip.icon || 'leaf'} size={12} />
                    </span>
                  ))}
                  {fitChips.length > 4 && (
                    <span
                      className="catalog-topbar__fit-icon-bubble is-more"
                      title={`+${fitChips.length - 4}`}
                    >
                      +{fitChips.length - 4}
                    </span>
                  )}
                </div>
              ) : (
                <span className="catalog-topbar__fit-hint">
                  {t('catalog.fitSetupHint')}
                </span>
              )}
            </div>

            <div className="catalog-topbar__fit-meta">
              {isFitConfigured && fitCount != null ? (
                <span className="catalog-topbar__fit-count">
                  {t('catalog.fitFitCount', { count: formatCatalogCount(fitCount) })}
                </span>
              ) : (
                <span className="catalog-topbar__fit-action">
                  {t('catalog.fitSetupAction')}
                </span>
              )}
              <span className="catalog-topbar__fit-chevron" aria-hidden="true">
                <ChevronRightMini size={10} />
              </span>
            </div>
          </button>
        </div>
      )}

      <div className="catalog-topbar__row catalog-topbar__row--main">
        <div className="catalog-search-wrap">
          <span className="catalog-search-icon" aria-hidden="true">
            <SearchIcon size={20} />
          </span>
          <input
            className="catalog-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 140)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRememberSearch()
            }}
            placeholder={t('catalog.searchPlaceholder')}
            autoComplete="off"
            spellCheck="false"
          />
          {q.trim().length > 0 && (
            <button
              type="button"
              className="catalog-search-clear"
              onClick={onClearQuery}
              aria-label={t('catalog.clearSearch')}
            >
              <CloseIcon size={14} />
            </button>
          )}
          {searchHint && (
            <div className="catalog-search-hint" role="status">
              {searchHint}
            </div>
          )}
        </div>

        <button
          type="button"
          className="catalog-scan-shortcut"
          onClick={onScanClick}
          aria-label={t('catalog.scanProduct')}
        >
          <BarcodeScannerIcon size={22} />
        </button>

        {!showCategories && (
          <div className="catalog-view-toggle">
            <button
              type="button"
              className={`catalog-view-btn${viewMode === 'grid' ? ' active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label={t('catalog.viewGrid')}
            >
              {viewMode === 'grid' ? IconGridActive : IconGrid}
            </button>
            <button
              type="button"
              className={`catalog-view-btn${viewMode === 'list' ? ' active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label={t('catalog.viewList')}
            >
              {viewMode === 'list' ? IconListActive : IconList}
            </button>
          </div>
        )}
      </div>

      {showRecentSearches && (
        <div
          className="catalog-search-history-row"
          aria-label={t('catalog.recentSearches')}
        >
          <span className="catalog-search-history-label">{t('catalog.recentSearches')}</span>
          {recentSearches.map((item) => (
            <button
              key={`${item.storeKey}:${item.query}`}
              type="button"
              className="catalog-search-history-chip"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setQ(item.query)
                setIsSearchFocused(false)
              }}
            >
              <HistoryIcon size={13} />
              <span>{item.query}</span>
            </button>
          ))}
        </div>
      )}
    </header>
  )
}

export const CatalogTopBar = memo(CatalogTopBarComponent)
