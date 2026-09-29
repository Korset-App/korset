import { memo } from 'react'
import {
  ChevronDownIcon,
  FilterIcon,
  FilterIconActive,
  SlidersIcon,
  ResetArrowIcon,
  SortFitIcon,
  SortCheapIcon,
  SortPriceyIcon,
  SortProteinIcon,
  SortSugarIcon,
} from '../icons/index.js'
import { getSubcategoryLabel } from '../../utils/fitCheck.js'

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

function CatalogSubcategoryNavComponent({
  selectedCategory,
  activeSubcategoryKeys = [],
  subcategoryCountMap = {},
  selectedSubcategories = [],
  onToggleSubcategory,
  onResetSubcategories,
  isSubMenuOpen,
  setIsSubMenuOpen,
  sort,
  onSelectSort,
  isSortMenuOpen,
  setIsSortMenuOpen,
  onOpenFilterDrawer,
  totalActiveFilterCount = 0,
  onResetAllFilters,
  t,
  lang,
}) {
  const ActiveSortIcon = SORT_ICONS[sort] || SortFitIcon
  const activeSortOption = SORT_OPTIONS.find((o) => o.id === sort) || SORT_OPTIONS[0]

  return (
    <div className="catalog-subcategory-nav">
      <div className="catalog-subcategory-controls">
        {activeSubcategoryKeys.length > 1 && (
          <button
            type="button"
            className={`catalog-dropdown-trigger${isSubMenuOpen || selectedSubcategories.length > 0 ? ' active' : ''}`}
            aria-expanded={isSubMenuOpen}
            onClick={() => {
              setIsSubMenuOpen(!isSubMenuOpen)
              setIsSortMenuOpen(false)
            }}
          >
            {isSubMenuOpen || selectedSubcategories.length > 0 ? (
              <FilterIconActive size={16} />
            ) : (
              <FilterIcon size={16} />
            )}
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
                  : t('catalog.selectedCount', { count: selectedSubcategories.length })}
            </span>
            <ChevronDownIcon
              size={18}
              style={{
                transition: 'transform 0.2s',
                transform: isSubMenuOpen ? 'rotate(180deg)' : 'none',
              }}
            />
          </button>
        )}

        <button
          type="button"
          className={`catalog-dropdown-trigger${isSortMenuOpen ? ' active' : ''}`}
          aria-expanded={isSortMenuOpen}
          onClick={() => {
            setIsSortMenuOpen(!isSortMenuOpen)
            setIsSubMenuOpen(false)
          }}
          style={{ flex: 1 }}
        >
          <ActiveSortIcon size={16} />
          <span
            style={{
              flex: 1,
              textAlign: 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {t(activeSortOption.labelKey)}
          </span>
          <ChevronDownIcon
            size={18}
            style={{
              transition: 'transform 0.2s',
              transform: isSortMenuOpen ? 'rotate(180deg)' : 'none',
            }}
          />
        </button>

        {onOpenFilterDrawer && (
          <button
            type="button"
            className={`catalog-filter-btn${totalActiveFilterCount > 0 ? ' active' : ''}`}
            onClick={onOpenFilterDrawer}
            aria-label={t('catalog.filtersButton')}
            title={t('catalog.filtersButton')}
          >
            <SlidersIcon size={16} />
            <span className="catalog-filter-btn-text">{t('catalog.filtersButton')}</span>
            {totalActiveFilterCount > 0 && (
              <span className="catalog-filter-btn-badge">{totalActiveFilterCount}</span>
            )}
          </button>
        )}
      </div>

      {totalActiveFilterCount > 0 && onResetAllFilters && (
        <div className="catalog-active-filters-bar">
          <span className="catalog-active-filters-text">
            {t('catalog.selectedCount', { count: totalActiveFilterCount })}
          </span>
          <button
            type="button"
            className="catalog-active-filters-reset-btn"
            onClick={onResetAllFilters}
          >
            <ResetArrowIcon size={12} />
            <span>{t('catalog.quickReset')}</span>
          </button>
        </div>
      )}

      {isSubMenuOpen && activeSubcategoryKeys.length > 1 && (
        <div
          className="catalog-chips-row"
          style={{ marginBottom: 12, animation: 'expandDropdown 0.2s ease-out' }}
        >
          <button
            type="button"
            className={`catalog-sub-chip${selectedSubcategories.length === 0 ? ' active' : ''}`}
            onClick={onResetSubcategories}
          >
            {t('catalog.allSubcategories')}
            <span className="catalog-sub-chip-count">
              {activeSubcategoryKeys.reduce((acc, k) => acc + (subcategoryCountMap[k] || 0), 0)}
            </span>
          </button>
          {activeSubcategoryKeys.map((subKey) => (
            <button
              key={subKey}
              type="button"
              className={`catalog-sub-chip${selectedSubcategories.includes(subKey) ? ' active' : ''}`}
              onClick={() => onToggleSubcategory(subKey)}
            >
              {getSubcategoryLabel(selectedCategory, subKey, lang)}
              <span className="catalog-sub-chip-count">{subcategoryCountMap[subKey] || 0}</span>
            </button>
          ))}
        </div>
      )}

      {isSortMenuOpen && (
        <div
          className="catalog-chips-row"
          style={{ marginBottom: 12, animation: 'expandDropdown 0.2s ease-out' }}
        >
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
                <Icon size={16} />
                {t(labelKey)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const CatalogSubcategoryNav = memo(CatalogSubcategoryNavComponent)
