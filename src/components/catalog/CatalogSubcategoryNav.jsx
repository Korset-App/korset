import { memo } from 'react'
import {
  ChevronDownIcon,
  SlidersIcon,
  ResetArrowIcon,
  CheckCircleIcon,
  SortFitIcon,
  SortCheapIcon,
  SortPriceyIcon,
  SortProteinIcon,
  SortSugarIcon,
} from '../icons/index.js'
import { getSubcategoryLabel } from '../../utils/fitCheck.js'

function SubcategoryIcon({ size = 16, className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" />
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" />
      <rect x="9" y="9" width="5.5" height="5.5" rx="1.5" />
    </svg>
  )
}

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

  const totalSubcategoryProducts = activeSubcategoryKeys.reduce(
    (acc, k) => acc + (subcategoryCountMap[k] || 0),
    0
  )

  return (
    <div className="catalog-subcategory-nav">
      {/* Click-away backdrop */}
      {(isSubMenuOpen || isSortMenuOpen) && (
        <div
          className="catalog-popover-backdrop"
          onClick={() => {
            setIsSubMenuOpen(false)
            setIsSortMenuOpen(false)
          }}
          aria-hidden="true"
        />
      )}

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
            <SubcategoryIcon size={16} />
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
            onClick={() => {
              setIsSubMenuOpen(false)
              setIsSortMenuOpen(false)
              onOpenFilterDrawer()
            }}
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

      {/* Floating Subcategories Popover */}
      {isSubMenuOpen && activeSubcategoryKeys.length > 1 && (
        <div className="catalog-popover catalog-popover--subcategories" role="dialog">
          <div className="catalog-popover__header">
            <span className="catalog-popover__title">
              {t('catalog.subcategoriesTitle') || 'Подкатегории'}
            </span>
            {selectedSubcategories.length > 0 && (
              <button
                type="button"
                className="catalog-popover__reset-link"
                onClick={() => {
                  onResetSubcategories()
                  setIsSubMenuOpen(false)
                }}
              >
                {t('catalog.quickReset') || 'Сбросить'}
              </button>
            )}
          </div>
          <div className="catalog-popover__list">
            <button
              type="button"
              className={`catalog-popover__item${selectedSubcategories.length === 0 ? ' is-active' : ''}`}
              onClick={() => {
                onResetSubcategories()
                setIsSubMenuOpen(false)
              }}
            >
              <span className="catalog-popover__item-label">{t('catalog.allSubcategories')}</span>
              <span className="catalog-popover__item-count">{totalSubcategoryProducts}</span>
              {selectedSubcategories.length === 0 && (
                <CheckCircleIcon size={16} className="catalog-popover__check" />
              )}
            </button>
            {activeSubcategoryKeys.map((subKey) => {
              const isSelected = selectedSubcategories.includes(subKey)
              return (
                <button
                  key={subKey}
                  type="button"
                  className={`catalog-popover__item${isSelected ? ' is-active' : ''}`}
                  onClick={() => {
                    onToggleSubcategory(subKey)
                    setIsSubMenuOpen(false)
                  }}
                >
                  <span className="catalog-popover__item-label">
                    {getSubcategoryLabel(selectedCategory, subKey, lang)}
                  </span>
                  <span className="catalog-popover__item-count">
                    {subcategoryCountMap[subKey] || 0}
                  </span>
                  {isSelected && <CheckCircleIcon size={16} className="catalog-popover__check" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Floating Sort Popover */}
      {isSortMenuOpen && (
        <div className="catalog-popover catalog-popover--sort" role="dialog">
          <div className="catalog-popover__header">
            <span className="catalog-popover__title">{t('catalog.sortTitle') || 'Сортировка'}</span>
          </div>
          <div className="catalog-popover__list">
            {SORT_OPTIONS.map(({ id, labelKey }) => {
              const Icon = SORT_ICONS[id] || SortFitIcon
              const isSelected = sort === id
              return (
                <button
                  key={id}
                  type="button"
                  className={`catalog-popover__item${isSelected ? ' is-active' : ''}`}
                  onClick={() => {
                    onSelectSort(id)
                    setIsSortMenuOpen(false)
                  }}
                >
                  <Icon size={16} className="catalog-popover__item-icon" />
                  <span className="catalog-popover__item-label">{t(labelKey)}</span>
                  {isSelected && <CheckCircleIcon size={16} className="catalog-popover__check" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

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
    </div>
  )
}

export const CatalogSubcategoryNav = memo(CatalogSubcategoryNavComponent)
