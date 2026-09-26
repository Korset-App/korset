import { memo, useLayoutEffect, useRef } from 'react'
import {
  BarcodeScannerIcon,
  CloseIcon,
  ArrowBackIcon,
  SearchIcon,
  HistoryIcon,
} from '../icons/index.js'

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
  isSearchFocused,
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
}) {
  const compositionButtonRef = useRef(null)
  const invitationRef = useRef(null)
  const invitationArrowRef = useRef(null)

  useLayoutEffect(() => {
    const button = compositionButtonRef.current
    const invitation = invitationRef.current
    const arrow = invitationArrowRef.current
    if (!button || !invitation || !arrow) return undefined

    const positionArrow = () => {
      const buttonRect = button.getBoundingClientRect()
      const invitationRect = invitation.getBoundingClientRect()
      const arrowRect = arrow.getBoundingClientRect()
      const tipOffset = (49 / 64) * arrowRect.width
      const right =
        invitationRect.right -
        (buttonRect.left + buttonRect.width / 2) -
        arrowRect.width +
        tipOffset
      invitation.style.setProperty('--catalog-invitation-arrow-right', `${right}px`)
    }

    positionArrow()
    const observer = new window.ResizeObserver(positionArrow)
    observer.observe(button)
    observer.observe(invitation)
    return () => observer.disconnect()
  }, [showCategories, isFitConfigured])

  return (
    <header
      className={`catalog-topbar${isScrolled ? ' is-scrolled' : ''}`}
      data-home={showCategories}
    >
      <div className="catalog-topbar__bg" aria-hidden="true" />

      <div className="catalog-topbar__row catalog-topbar__row--title">
        {showSubcategories && (
          <button
            type="button"
            onClick={onBackToCategories}
            className="catalog-topbar__back-btn"
            aria-label={t('catalog.back')}
          >
            <ArrowBackIcon size={20} />
          </button>
        )}
        <h1 className="catalog-topbar__cat-title">
          {showSubcategories ? selectedCategoryTitle : t('nav.catalog')}
        </h1>
        <button
          ref={compositionButtonRef}
          type="button"
          className={`catalog-topbar__composition${isFitConfigured ? ' is-configured' : ''}`}
          onClick={onOpenFitDrawer}
          aria-label={t('catalog.fitSetupTitle')}
          aria-haspopup="dialog"
          title={fitChips.map((chip) => chip.label).join(', ') || t('catalog.fitSetupTitle')}
        >
          <span>{t('catalog.composition')}</span>
          {fitChips.length > 0 && (
            <span className="catalog-topbar__composition-count">{fitChips.length}</span>
          )}
        </button>
      </div>
      {showCategories && (
        <div
          className={`catalog-topbar__intro${isScrolled || isSearchFocused ? ' is-collapsed' : ''}`}
          aria-hidden={isScrolled || isSearchFocused}
          inert={isScrolled || isSearchFocused ? '' : undefined}
        >
          <div>
            {isFitConfigured ? (
              <div className="catalog-topbar__personalized">
                <div
                  className="catalog-topbar__preferences"
                  aria-label={t('catalog.compositionPreferences')}
                >
                  {fitChips.slice(0, 2).map((chip, index) => (
                    <button
                      key={chip.key}
                      className={index === 1 ? 'catalog-topbar__second-preference' : undefined}
                      type="button"
                      onClick={onOpenFitDrawer}
                      aria-haspopup="dialog"
                      title={chip.label}
                    >
                      {chip.label}
                    </button>
                  ))}
                  {fitChips.length > 1 && (
                    <button
                      type="button"
                      onClick={onOpenFitDrawer}
                      className={`catalog-topbar__more-preferences${fitChips.length === 2 ? ' is-two' : ''}`}
                      aria-label={t('catalog.compositionPreferences')}
                    >
                      <span className="catalog-topbar__more-narrow">+{fitChips.length - 1}</span>
                      <span className="catalog-topbar__more-wide">
                        {fitChips.length > 2 ? `+${fitChips.length - 2}` : null}
                      </span>
                    </button>
                  )}
                  {fitChips.length === 0 && (
                    <button type="button" onClick={onOpenFitDrawer}>
                      {t('catalog.noRestrictions')}
                    </button>
                  )}
                </div>
                <span className="catalog-topbar__fit-result">
                  {fitCount !== null
                    ? t('catalog.fitLoadedCount', { count: fitCount })
                    : t('catalog.fitOnCards')}
                </span>
              </div>
            ) : (
              <button
                ref={invitationRef}
                type="button"
                className="catalog-topbar__invitation"
                onClick={onOpenFitDrawer}
                aria-haspopup="dialog"
              >
                <span>
                  <strong>{t('catalog.fitInvite')}</strong>
                  <span>{t('catalog.fitInviteDetail')}</span>
                </span>
                <svg
                  ref={invitationArrowRef}
                  aria-hidden="true"
                  width="64"
                  height="44"
                  viewBox="0 0 64 44"
                  fill="none"
                >
                  <path
                    d="M4 34C30 43 53 33 49 7M40 15L49 5L58 14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
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
              if (e.key === 'Enter') {
                onRememberSearch()
                e.currentTarget.blur()
              }
            }}
            placeholder={t('catalog.searchPlaceholder')}
            aria-label={t('catalog.searchPlaceholder')}
            type="search"
            enterKeyHint="search"
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
          <div
            className="catalog-view-toggle"
            data-view={viewMode}
            role="group"
            aria-label={t('catalog.viewLabel')}
          >
            <button
              type="button"
              className={`catalog-view-btn${viewMode === 'grid' ? ' active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label={t('catalog.viewGrid')}
              aria-pressed={viewMode === 'grid'}
            >
              {viewMode === 'grid' ? IconGridActive : IconGrid}
            </button>
            <button
              type="button"
              className={`catalog-view-btn${viewMode === 'list' ? ' active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label={t('catalog.viewList')}
              aria-pressed={viewMode === 'list'}
            >
              {viewMode === 'list' ? IconListActive : IconList}
            </button>
          </div>
        )}
      </div>

      {showRecentSearches && (
        <div className="catalog-search-history-row" aria-label={t('catalog.recentSearches')}>
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
