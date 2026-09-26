import { memo } from 'react'
import { ExploreIcon, InventoryIcon } from '../icons/index.js'

function CloudOffIcon({ size = 44, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0-4 7h1.26a5 5 0 0 0 9.74 1.5" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function SearchOffIcon({ size = 44, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  )
}

function CatalogEmptyViewComponent({
  hasQuery,
  serverSearchStatus,
  isSearchPending,
  q,
  searchSuggestions = [],
  onSelectSuggestion,
  onClearQuery,
  isCatalogLoading,
  t,
}) {
  if (hasQuery && serverSearchStatus === 'error') {
    return (
      <div className="catalog-empty-state">
        <CloudOffIcon size={44} style={{ opacity: 0.5, color: 'var(--text-dim)' }} />
        <div className="catalog-empty-state-title">
          {t('catalog.searchError') || 'Ошибка поиска'}
        </div>
        <div className="catalog-empty-state-sub">
          {t('catalog.searchErrorHint') || 'Показаны локальные результаты'}
        </div>
      </div>
    )
  }

  if (hasQuery && isSearchPending) {
    return (
      <div className="catalog-empty-state">
        <ExploreIcon size={44} style={{ opacity: 0.5, color: 'var(--text-dim)' }} />
        <div className="catalog-empty-state-title">{t('catalog.searchLoadingTitle')}</div>
        <div className="catalog-empty-state-sub">{t('catalog.searchLoadingSub')}</div>
      </div>
    )
  }

  if (hasQuery) {
    return (
      <div className="catalog-empty-state">
        <SearchOffIcon size={44} style={{ opacity: 0.5, color: 'var(--text-dim)' }} />
        <div className="catalog-empty-state-title">{t('catalog.emptySearch')}</div>
        <div className="catalog-empty-state-sub">«{q.trim()}»</div>
        <div className="catalog-empty-state-sub">{t('catalog.emptySearchHint')}</div>
        {searchSuggestions.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {searchSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="catalog-empty-state-btn"
                onClick={() => onSelectSuggestion(suggestion)}
              >
                {t('catalog.searchSuggestion', { query: suggestion })}
              </button>
            ))}
          </div>
        )}
        <button type="button" className="catalog-empty-state-btn" onClick={onClearQuery}>
          {t('catalog.clearSearch')}
        </button>
      </div>
    )
  }

  if (isCatalogLoading) {
    return (
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
    )
  }

  return (
    <div className="catalog-empty-state">
      <InventoryIcon size={44} style={{ opacity: 0.5, color: 'var(--text-dim)' }} />
      <div className="catalog-empty-state-title">{t('catalog.emptyCategory')}</div>
    </div>
  )
}

export const CatalogEmptyView = memo(CatalogEmptyViewComponent)
