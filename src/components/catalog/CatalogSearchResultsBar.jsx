import { memo } from 'react'
import {
  ChevronDownIcon,
  SlidersIcon,
  ResetArrowIcon,
  SortFitIcon,
  SortCheapIcon,
  SortPriceyIcon,
  SortProteinIcon,
  SortSugarIcon,
} from '../icons/index.js'
import { getCategoryLabel } from '../../utils/fitCheck.js'
import './CatalogSearchResultsBar.css'

const SORT_ICONS = {
  fit: SortFitIcon,
  cheap: SortCheapIcon,
  pricey: SortPriceyIcon,
  protein: SortProteinIcon,
  sugar: SortSugarIcon,
}

const SORT_OPTIONS = [
  { id: 'fit', labelKey: 'catalog.sort.fit' },
  { id: 'cheap', labelKey: 'catalog.sort.cheap' },
  { id: 'pricey', labelKey: 'catalog.sort.pricey' },
  { id: 'protein', labelKey: 'catalog.sort.protein' },
  { id: 'sugar', labelKey: 'catalog.sort.sugar' },
]

function CatalogSearchResultsBarComponent({
  resultsCount = 0,
  rawResultsCount = 0,
  categoryCounts = {},
  selectedCategoryFilter = null,
  onSelectCategoryFilter,
  sort = 'fit',
  onSelectSort,
  isSortMenuOpen = false,
  setIsSortMenuOpen,
  onOpenFilterDrawer,
  totalActiveFilterCount = 0,
  onResetAllFilters,
  lang = 'ru',
  t,
}) {
  const ActiveSortIcon = SORT_ICONS[sort] || SortFitIcon
  const activeSortOption = SORT_OPTIONS.find((o) => o.id === sort) || SORT_OPTIONS[0]
  const facetEntries = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])
  const hasMultipleCategories = facetEntries.length > 1

  return (
    <div className="catalog-search-results-bar">
      <div className="catalog-search-bar-row">
        <div className="catalog-search-count-wrap">
          <span className="catalog-search-count-text">
            {t('catalog.searchResultsCount', { count: resultsCount })}
          </span>
          {rawResultsCount > resultsCount && (
            <span className="catalog-search-count-badge">
              {resultsCount} / {rawResultsCount}
            </span>
          )}
        </div>

        <div className="catalog-search-actions">
          <button
            type="button"
            className={`catalog-search-sort-btn${isSortMenuOpen ? ' active' : ''}`}
            aria-expanded={isSortMenuOpen}
            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
          >
            <ActiveSortIcon size={15} />
            <span>{t(activeSortOption.labelKey)}</span>
            <ChevronDownIcon
              size={16}
              style={{
                transition: 'transform 0.18s ease',
                transform: isSortMenuOpen ? 'rotate(180deg)' : 'none',
              }}
            />
          </button>

          {onOpenFilterDrawer && (
            <button
              type="button"
              className={`catalog-search-filter-btn${totalActiveFilterCount > 0 ? ' active' : ''}`}
              onClick={onOpenFilterDrawer}
              aria-label={t('catalog.filtersButton')}
              title={t('catalog.filtersButton')}
            >
              <SlidersIcon size={15} />
              <span className="catalog-search-filter-label">{t('catalog.filtersButton')}</span>
              {totalActiveFilterCount > 0 && (
                <span className="catalog-filter-btn-badge">{totalActiveFilterCount}</span>
              )}
            </button>
          )}
        </div>
      </div>

      {isSortMenuOpen && (
        <div className="catalog-search-sort-menu" role="menu">
          {SORT_OPTIONS.map(({ id, labelKey }) => {
            const Icon = SORT_ICONS[id] || SortFitIcon
            return (
              <button
                key={id}
                type="button"
                className={`catalog-sort-chip${sort === id ? ' active' : ''}`}
                onClick={() => {
                  onSelectSort(id)
                  setIsSortMenuOpen(false)
                }}
              >
                <Icon size={15} />
                <span>{t(labelKey)}</span>
              </button>
            )
          })}
        </div>
      )}

      {hasMultipleCategories && onSelectCategoryFilter && (
        <div
          className="catalog-search-facets"
          role="group"
          aria-label={t('catalog.categoriesTitle')}
        >
          {totalActiveFilterCount > 0 && onResetAllFilters && (
            <button
              type="button"
              className="catalog-search-facet-chip reset"
              onClick={onResetAllFilters}
              title={t('catalog.filtersReset')}
            >
              <ResetArrowIcon size={13} />
              <span>{t('catalog.quickReset')}</span>
            </button>
          )}
          <button
            type="button"
            className={`catalog-search-facet-chip${!selectedCategoryFilter ? ' active' : ''}`}
            onClick={() => onSelectCategoryFilter(null)}
          >
            <span>{t('catalog.allCategoriesFilter')}</span>
            <span className="catalog-search-facet-count">{rawResultsCount}</span>
          </button>
          {facetEntries.map(([catKey, count]) => (
            <button
              key={catKey}
              type="button"
              className={`catalog-search-facet-chip${selectedCategoryFilter === catKey ? ' active' : ''}`}
              onClick={() =>
                onSelectCategoryFilter(selectedCategoryFilter === catKey ? null : catKey)
              }
            >
              <span>{getCategoryLabel(catKey, lang)}</span>
              <span className="catalog-search-facet-count">{count}</span>
            </button>
          ))}
        </div>
      )}

      {!hasMultipleCategories && totalActiveFilterCount > 0 && onResetAllFilters && (
        <div className="catalog-search-facets">
          <button
            type="button"
            className="catalog-search-facet-chip reset"
            onClick={onResetAllFilters}
            title={t('catalog.filtersReset')}
          >
            <ResetArrowIcon size={13} />
            <span>{t('catalog.quickReset')}</span>
          </button>
        </div>
      )}
    </div>
  )
}

export const CatalogSearchResultsBar = memo(CatalogSearchResultsBarComponent)
