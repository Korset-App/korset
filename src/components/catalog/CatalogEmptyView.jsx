import { memo } from 'react'
import { ExploreIcon, InventoryIcon, CloseIcon, ArrowBackIcon } from '../icons/index.js'
import { getCategoryLabel } from '../../utils/fitCheck.js'
import './CatalogEmptyView.css'

const POPULAR_SEARCH_CHIPS = ['Молоко', 'Хлеб', 'Сыр', 'Вода', 'Чипсы', 'Чай', 'Шоколад']

function CloudOffIcon({ size = 36, style }) {
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

function SearchOffIcon({ size = 36, style }) {
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
  hasQuery = false,
  isQueryTooShort = false,
  serverSearchStatus = 'idle',
  isSearchPending = false,
  q = '',
  searchSuggestions = [],
  onSelectSuggestion,
  onClearQuery,
  onSelectCategory,
  onBackToCategories,
  activeCategoryKeys = [],
  popularProducts = [],
  renderProductCard,
  storeName = '',
  isCatalogLoading = false,
  lang = 'ru',
  t,
}) {
  if (isCatalogLoading) {
    return (
      <div className="catalog-empty-view-scroll" role="status">
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

  if (hasQuery && serverSearchStatus === 'error') {
    return (
      <div className="catalog-empty-view-scroll">
        <div className="catalog-empty-hero">
          <div className="catalog-empty-icon-bubble" aria-hidden="true">
            <CloudOffIcon />
          </div>
          <div className="catalog-empty-hero-copy">
            <h2 className="catalog-empty-title">{t('catalog.searchError') || 'Ошибка поиска'}</h2>
            <p className="catalog-empty-desc">
              {t('catalog.searchErrorHint') || 'Показаны локальные результаты'}
            </p>
          </div>
          {onClearQuery && (
            <div className="catalog-empty-actions">
              <button
                type="button"
                className="catalog-empty-btn catalog-empty-btn--secondary"
                onClick={onClearQuery}
              >
                <CloseIcon size={14} />
                <span>{t('catalog.clearSearch')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (hasQuery && isSearchPending) {
    return (
      <div className="catalog-empty-view-scroll" role="status">
        <div className="catalog-empty-hero">
          <div className="catalog-empty-icon-bubble" aria-hidden="true">
            <ExploreIcon size={36} />
          </div>
          <div className="catalog-empty-hero-copy">
            <h2 className="catalog-empty-title">{t('catalog.searchLoadingTitle')}</h2>
            <p className="catalog-empty-desc">{t('catalog.searchLoadingSub')}</p>
          </div>
        </div>
      </div>
    )
  }

  const queryTrimmed = q.trim()
  const displayChips = Array.from(
    new Set([
      ...(searchSuggestions || []),
      ...POPULAR_SEARCH_CHIPS.filter((chip) => chip.toLowerCase() !== queryTrimmed.toLowerCase()),
    ])
  ).slice(0, 7)

  const topCategories = (activeCategoryKeys || []).slice(0, 6)
  const popularSectionTitle = storeName
    ? t('catalog.popularInStoreWithName', { storeName })
    : t('catalog.popularInStore')

  if (hasQuery && isQueryTooShort) {
    return (
      <div className="catalog-empty-view-scroll">
        <section className="catalog-empty-hero">
          <div className="catalog-empty-icon-bubble" aria-hidden="true">
            <ExploreIcon size={36} />
          </div>
          <div className="catalog-empty-hero-copy">
            <h2 className="catalog-empty-title">
              {t('catalog.searchTypingHint') || 'Продолжайте вводить…'}
            </h2>
            <p className="catalog-empty-desc">
              {t('catalog.searchTypingHintSub') || 'Поиск начнётся от 3 символов'}
            </p>
          </div>
        </section>
        {displayChips.length > 0 && onSelectSuggestion && (
          <section className="catalog-empty-section">
            <div className="catalog-empty-section-header">
              <span className="catalog-empty-section-title">{t('catalog.popularSearches')}</span>
            </div>
            <div className="catalog-empty-chips">
              {displayChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="catalog-empty-chip"
                  onClick={() => onSelectSuggestion(chip)}
                >
                  <span>{chip}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    )
  }

  if (hasQuery) {
    return (
      <div className="catalog-empty-view-scroll">
        {/* Zero-state Hero */}
        <section className="catalog-empty-hero">
          <div className="catalog-empty-icon-bubble" aria-hidden="true">
            <SearchOffIcon />
          </div>
          <div className="catalog-empty-hero-copy">
            <h2 className="catalog-empty-title">
              {t('catalog.emptySearch')}
              <span className="catalog-empty-query">«{queryTrimmed}»</span>
            </h2>
            <p className="catalog-empty-desc">{t('catalog.emptySearchHint')}</p>
          </div>
          {onClearQuery && (
            <div className="catalog-empty-actions">
              <button
                type="button"
                className="catalog-empty-btn catalog-empty-btn--primary"
                onClick={onClearQuery}
              >
                <CloseIcon size={14} />
                <span>{t('catalog.clearQueryAction')}</span>
              </button>
            </div>
          )}
        </section>

        {/* Popular / Suggested Query Chips */}
        {displayChips.length > 0 && onSelectSuggestion && (
          <section className="catalog-empty-section">
            <div className="catalog-empty-section-header">
              <span className="catalog-empty-section-title">{t('catalog.popularSearches')}</span>
            </div>
            <div className="catalog-empty-chips">
              {displayChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="catalog-empty-chip"
                  onClick={() => onSelectSuggestion(chip)}
                >
                  <span>{chip}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Store Categories Jump */}
        {topCategories.length > 0 && onSelectCategory && (
          <section className="catalog-empty-section">
            <div className="catalog-empty-section-header">
              <span className="catalog-empty-section-title">{t('catalog.browseCategories')}</span>
            </div>
            <div className="catalog-empty-category-pills">
              {topCategories.map((catKey) => (
                <button
                  key={catKey}
                  type="button"
                  className="catalog-empty-category-pill"
                  onClick={() => onSelectCategory(catKey)}
                >
                  <span>{getCategoryLabel(catKey, lang)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Popular Store Products Shelf */}
        {popularProducts.length > 0 && renderProductCard && (
          <section className="catalog-empty-section">
            <div className="catalog-empty-section-header">
              <span className="catalog-empty-section-title">{popularSectionTitle}</span>
            </div>
            <div className="catalog-empty-grid">
              {popularProducts.map((product, index) => (
                <div key={product.ean || index} className="catalog-empty-grid-item">
                  {renderProductCard(index, product)}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    )
  }

  // Non-query empty state (e.g. empty category or filter)
  return (
    <div className="catalog-empty-view-scroll">
      <section className="catalog-empty-hero">
        <div className="catalog-empty-icon-bubble" aria-hidden="true">
          <InventoryIcon size={36} />
        </div>
        <div className="catalog-empty-hero-copy">
          <h2 className="catalog-empty-title">{t('catalog.emptyCategory')}</h2>
        </div>
        {onBackToCategories && (
          <div className="catalog-empty-actions">
            <button
              type="button"
              className="catalog-empty-btn catalog-empty-btn--secondary"
              onClick={onBackToCategories}
            >
              <ArrowBackIcon size={16} />
              <span>{t('catalog.backToCategories')}</span>
            </button>
          </div>
        )}
      </section>

      {/* Store Categories Jump */}
      {topCategories.length > 0 && onSelectCategory && (
        <section className="catalog-empty-section">
          <div className="catalog-empty-section-header">
            <span className="catalog-empty-section-title">{t('catalog.browseCategories')}</span>
          </div>
          <div className="catalog-empty-category-pills">
            {topCategories.map((catKey) => (
              <button
                key={catKey}
                type="button"
                className="catalog-empty-category-pill"
                onClick={() => onSelectCategory(catKey)}
              >
                <span>{getCategoryLabel(catKey, lang)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Popular Store Products Shelf */}
      {popularProducts.length > 0 && renderProductCard && (
        <section className="catalog-empty-section">
          <div className="catalog-empty-section-header">
            <span className="catalog-empty-section-title">{popularSectionTitle}</span>
          </div>
          <div className="catalog-empty-grid">
            {popularProducts.map((product, index) => (
              <div key={product.ean || index} className="catalog-empty-grid-item">
                {renderProductCard(index, product)}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export const CatalogEmptyView = memo(CatalogEmptyViewComponent)
