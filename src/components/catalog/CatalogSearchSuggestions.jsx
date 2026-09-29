import { memo, useMemo, useEffect } from 'react'
import { HistoryIcon, CloseIcon, SearchIcon } from '../icons/index.js'
import './CatalogSearchSuggestions.css'
import { HighlightMatch } from './HighlightMatch.jsx'
import { getCategoryLabel } from '../../utils/fitCheck.js'
import { getLocalName } from '../../utils/localName.js'
import { formatPrice } from '../../utils/fitCheck.js'

const POPULAR_CHIPS = ['Молоко', 'Хлеб', 'Сыр', 'Вода', 'Чипсы', 'Чай', 'Шоколад']

// Detects if server results contain a dominant brand match
function detectBrandFromResults(results) {
  if (!results || results.length === 0) return null
  const brandMatches = results.filter((p) => p.matchType === 'brand_match' && p.brand)
  if (brandMatches.length === 0) return null
  // Return brand only if majority of results share it
  const firstBrand = brandMatches[0].brand
  const sameCount = brandMatches.filter((p) => p.brand === firstBrand).length
  return sameCount >= Math.min(2, brandMatches.length) ? firstBrand : null
}

// Detects if server results cluster into a single category
function detectCategoryFromResults(results, lang) {
  if (!results || results.length < 2) return null
  const categoryCount = {}
  for (const p of results) {
    if (p.category) {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1
    }
  }
  const sorted = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])
  const top = sorted[0]
  if (!top || top[1] < 2) return null
  const share = top[1] / results.length
  if (share < 0.5) return null
  return { key: top[0], label: getCategoryLabel(top[0], lang) }
}

function CatalogSearchSuggestionsComponent({
  isOpen,
  q,
  hasQuery,
  recentSearches,
  serverSearch,
  onSelectQuery,
  onSelectCategory,
  onRemoveHistoryEntry,
  onClearHistory,
  activeIndex = -1,
  onTotalItemsChange,
  triggerSelectIndex = null,
  lang,
  t,
}) {
  const topResults = (serverSearch?.results || []).slice(0, 3)
  const totalCount = (serverSearch?.results || []).length
  const detectedBrand = hasQuery ? detectBrandFromResults(serverSearch?.results) : null
  const detectedCategory = hasQuery ? detectCategoryFromResults(serverSearch?.results, lang) : null

  const items = useMemo(() => {
    if (!isOpen) return []
    if (!hasQuery) {
      const list = []
      for (const item of recentSearches) {
        list.push({ key: `hist-${item.query}`, onSelect: () => onSelectQuery(item.query) })
      }
      for (const chip of POPULAR_CHIPS) {
        list.push({ key: `chip-${chip}`, onSelect: () => onSelectQuery(chip) })
      }
      return list
    }
    const list = []
    if (detectedBrand) {
      list.push({ key: 'brand', onSelect: () => onSelectQuery(q) })
    } else if (detectedCategory) {
      list.push({ key: 'cat', onSelect: () => onSelectCategory(detectedCategory.key) })
    }
    for (const product of topResults) {
      const name = getLocalName(product)
      list.push({ key: `prod-${product.ean}`, onSelect: () => onSelectQuery(name) })
    }
    if (totalCount > 0) {
      list.push({ key: 'all', onSelect: () => onSelectQuery(q) })
    }
    return list
  }, [
    isOpen,
    hasQuery,
    recentSearches,
    detectedBrand,
    detectedCategory,
    topResults,
    totalCount,
    q,
    onSelectQuery,
    onSelectCategory,
  ])

  useEffect(() => {
    if (onTotalItemsChange) {
      onTotalItemsChange(items.length)
    }
  }, [items.length, onTotalItemsChange])

  useEffect(() => {
    if (
      triggerSelectIndex != null &&
      triggerSelectIndex >= 0 &&
      triggerSelectIndex < items.length
    ) {
      items[triggerSelectIndex].onSelect()
    }
  }, [triggerSelectIndex, items])

  const hintOffset = hasQuery && (detectedBrand || detectedCategory) ? 1 : 0

  if (!isOpen) return null

  return (
    <div className="csr-overlay" role="listbox" aria-label={t('catalog.search')}>
      {/* Empty query: history + popular */}
      {!hasQuery && (
        <>
          {recentSearches.length > 0 && (
            <section className="csr-section">
              <div className="csr-section__header">
                <span className="csr-section__title">{t('catalog.recentSearches')}</span>
                <button
                  type="button"
                  className="csr-section__action"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onClearHistory}
                >
                  {t('catalog.recentSearchesClear')}
                </button>
              </div>
              <ul className="csr-list" role="group">
                {recentSearches.map((item, i) => {
                  const isSelected = activeIndex === i
                  return (
                    <li key={`${item.storeKey}:${item.query}`} className="csr-history-row">
                      <button
                        type="button"
                        className={`csr-row csr-row--history${isSelected ? ' is-active' : ''}`}
                        aria-selected={isSelected}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onSelectQuery(item.query)}
                      >
                        <span className="csr-row__icon" aria-hidden="true">
                          <HistoryIcon size={15} />
                        </span>
                        <span className="csr-row__label">{item.query}</span>
                      </button>
                      <button
                        type="button"
                        className="csr-history-remove"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onRemoveHistoryEntry(item.query)}
                        aria-label={`${t('catalog.recentSearchRemove')}: ${item.query}`}
                      >
                        <CloseIcon size={12} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <section className="csr-section">
            <div className="csr-section__header">
              <span className="csr-section__title">{t('catalog.popularSearches')}</span>
            </div>
            <div className="csr-chips">
              {POPULAR_CHIPS.map((chip, chipIdx) => {
                const isSelected = activeIndex === recentSearches.length + chipIdx
                return (
                  <button
                    key={chip}
                    type="button"
                    className={`csr-chip${isSelected ? ' is-active' : ''}`}
                    aria-selected={isSelected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSelectQuery(chip)}
                  >
                    {chip}
                  </button>
                )
              })}
            </div>
          </section>
        </>
      )}

      {/* With query: smart hints + live results */}
      {hasQuery && (
        <>
          {/* Brand intent hint */}
          {detectedBrand && (
            <button
              type="button"
              className={`csr-row csr-row--hint csr-row--brand${activeIndex === 0 ? ' is-active' : ''}`}
              aria-selected={activeIndex === 0}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelectQuery(q)}
            >
              <span className="csr-brand-badge" aria-hidden="true">
                B
              </span>
              <span className="csr-row__label">
                {t('catalog.searchBrand', { brand: detectedBrand })}
              </span>
            </button>
          )}

          {/* Category intent hint */}
          {detectedCategory && !detectedBrand && (
            <button
              type="button"
              className={`csr-row csr-row--hint csr-row--category${activeIndex === 0 ? ' is-active' : ''}`}
              aria-selected={activeIndex === 0}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelectCategory(detectedCategory.key)}
            >
              <span className="csr-row__icon" aria-hidden="true">
                <SearchIcon size={15} />
              </span>
              <span className="csr-row__label">
                {t('catalog.goToCategory', { label: detectedCategory.label })}
              </span>
            </button>
          )}

          {/* Top 3 live results */}
          {topResults.length > 0 && (
            <section className="csr-section csr-section--results">
              <ul className="csr-list" role="group">
                {topResults.map((product, prodIdx) => {
                  const name = getLocalName(product)
                  const isSelected = activeIndex === hintOffset + prodIdx
                  return (
                    <li key={product.ean}>
                      <button
                        type="button"
                        className={`csr-row csr-row--product${isSelected ? ' is-active' : ''}`}
                        aria-selected={isSelected}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onSelectQuery(name)}
                      >
                        {product.image ? (
                          <img
                            className="csr-product-thumb"
                            src={product.image}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                          />
                        ) : (
                          <span
                            className="csr-product-thumb csr-product-thumb--empty"
                            aria-hidden="true"
                          />
                        )}
                        <span className="csr-row__label">
                          <HighlightMatch text={name} query={q} />
                        </span>
                        {product.priceKzt != null && (
                          <span className="csr-row__price">{formatPrice(product.priceKzt)}</span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {/* Footer: all results */}
          {totalCount > 0 && (
            <button
              type="button"
              className={`csr-row csr-row--all${activeIndex === hintOffset + topResults.length ? ' is-active' : ''}`}
              aria-selected={activeIndex === hintOffset + topResults.length}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelectQuery(q)}
            >
              <span className="csr-row__label">
                {t('catalog.allResults', { count: totalCount })}
              </span>
              <span className="csr-row__chevron" aria-hidden="true">
                ›
              </span>
            </button>
          )}
        </>
      )}
    </div>
  )
}

export const CatalogSearchSuggestions = memo(CatalogSearchSuggestionsComponent)
