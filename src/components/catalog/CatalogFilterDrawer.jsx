import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  CloseIcon,
  ResetArrowIcon,
  HalalBadgeIcon,
  SortFitIcon,
  SortCheapIcon,
  SortPriceyIcon,
  SortProteinIcon,
  SortSugarIcon,
} from '../icons/index.js'
import { getSubcategoryLabel } from '../../utils/fitCheck.js'
import './CatalogFilterDrawer.css'

const SORT_OPTIONS = [
  { id: 'fit', labelKey: 'catalog.sort.fit', icon: SortFitIcon },
  { id: 'cheap', labelKey: 'catalog.sort.cheap', icon: SortCheapIcon },
  { id: 'pricey', labelKey: 'catalog.sort.pricey', icon: SortPriceyIcon },
  { id: 'protein', labelKey: 'catalog.sort.protein', icon: SortProteinIcon },
  { id: 'sugar', labelKey: 'catalog.sort.sugar', icon: SortSugarIcon },
]

export default function CatalogFilterDrawer({
  isOpen,
  onClose,
  totalResultsCount = 0,
  sort = 'fit',
  onSelectSort,
  selectedCategory,
  activeSubcategoryKeys = [],
  subcategoryCountMap = {},
  selectedSubcategories = [],
  onToggleSubcategory,
  onResetSubcategories,
  extraFilters = {},
  onToggleExtraFilter,
  totalActiveFilterCount = 0,
  onResetAllFilters,
  lang,
  t,
}) {
  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return undefined
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  // Escape key handler
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (!isOpen) return undefined
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const content = (
    <div className="catalog-filter-drawer-overlay" onClick={onClose}>
      <div
        className="catalog-filter-drawer-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-filter-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="catalog-filter-drawer-handle" />

        <div className="catalog-filter-drawer-header">
          <div className="catalog-filter-drawer-title-wrap">
            <h2 id="catalog-filter-drawer-title" className="catalog-filter-drawer-title">
              {t('catalog.filtersTitle')}
            </h2>
            {totalActiveFilterCount > 0 && (
              <span className="catalog-filter-drawer-badge">{totalActiveFilterCount}</span>
            )}
          </div>

          <div className="catalog-filter-drawer-actions">
            <button
              type="button"
              className="catalog-filter-drawer-reset-btn"
              onClick={onResetAllFilters}
              disabled={totalActiveFilterCount === 0}
            >
              <ResetArrowIcon size={14} />
              <span>{t('catalog.filtersReset')}</span>
            </button>
            <button
              type="button"
              className="catalog-filter-drawer-close-btn"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        <div className="catalog-filter-drawer-body">
          {/* Section: Sort */}
          <div className="catalog-filter-section">
            <h3 className="catalog-filter-section-title">{t('catalog.filterSectionSort')}</h3>
            <div className="catalog-filter-sort-pills">
              {SORT_OPTIONS.map(({ id, labelKey, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`catalog-filter-sort-pill${sort === id ? ' is-active' : ''}`}
                  onClick={() => onSelectSort?.(id)}
                >
                  <Icon size={16} />
                  <span>{t(labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Subcategories (when category is selected and has multiple subcategories) */}
          {selectedCategory && activeSubcategoryKeys.length > 1 && (
            <div className="catalog-filter-section">
              <div className="catalog-filter-section-header">
                <h3 className="catalog-filter-section-title">
                  {t('catalog.filterSectionSubcategories')}
                </h3>
                {selectedSubcategories.length > 0 && (
                  <button
                    type="button"
                    className="catalog-filter-section-clear"
                    onClick={onResetSubcategories}
                  >
                    {t('catalog.quickReset')}
                  </button>
                )}
              </div>
              <div className="catalog-filter-chips-grid">
                <button
                  type="button"
                  className={`catalog-filter-chip${selectedSubcategories.length === 0 ? ' is-active' : ''}`}
                  onClick={onResetSubcategories}
                >
                  <span>{t('catalog.allSubcategories')}</span>
                  <span className="catalog-filter-chip-count">
                    {activeSubcategoryKeys.reduce(
                      (acc, k) => acc + (subcategoryCountMap[k] || 0),
                      0
                    )}
                  </span>
                </button>
                {activeSubcategoryKeys.map((subKey) => {
                  const isSelected = selectedSubcategories.includes(subKey)
                  const count = subcategoryCountMap[subKey] || 0
                  return (
                    <button
                      key={subKey}
                      type="button"
                      className={`catalog-filter-chip${isSelected ? ' is-active' : ''}`}
                      onClick={() => onToggleSubcategory?.(subKey)}
                    >
                      <span>{getSubcategoryLabel(selectedCategory, subKey, lang)}</span>
                      <span className="catalog-filter-chip-count">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Section: Diet & Halal */}
          <div className="catalog-filter-section">
            <h3 className="catalog-filter-section-title">{t('catalog.filterSectionDiet')}</h3>
            <div className="catalog-filter-toggles-list">
              <label className="catalog-filter-toggle-row">
                <div className="catalog-filter-toggle-label">
                  <HalalBadgeIcon size={18} className="catalog-filter-icon--halal" />
                  <span>{t('catalog.filterHalalOnly')}</span>
                </div>
                <input
                  type="checkbox"
                  className="catalog-filter-toggle-input"
                  checked={Boolean(extraFilters.halalOnly)}
                  onChange={() => onToggleExtraFilter?.('halalOnly')}
                />
                <span className="catalog-filter-toggle-switch" />
              </label>

              <label className="catalog-filter-toggle-row">
                <div className="catalog-filter-toggle-label">
                  <span>{t('catalog.filterSugarFree')}</span>
                </div>
                <input
                  type="checkbox"
                  className="catalog-filter-toggle-input"
                  checked={Boolean(extraFilters.sugarFree)}
                  onChange={() => onToggleExtraFilter?.('sugarFree')}
                />
                <span className="catalog-filter-toggle-switch" />
              </label>

              <label className="catalog-filter-toggle-row">
                <div className="catalog-filter-toggle-label">
                  <span>{t('catalog.filterLactoseFree')}</span>
                </div>
                <input
                  type="checkbox"
                  className="catalog-filter-toggle-input"
                  checked={Boolean(extraFilters.lactoseFree)}
                  onChange={() => onToggleExtraFilter?.('lactoseFree')}
                />
                <span className="catalog-filter-toggle-switch" />
              </label>

              <label className="catalog-filter-toggle-row">
                <div className="catalog-filter-toggle-label">
                  <span>{t('catalog.filterGlutenFree')}</span>
                </div>
                <input
                  type="checkbox"
                  className="catalog-filter-toggle-input"
                  checked={Boolean(extraFilters.glutenFree)}
                  onChange={() => onToggleExtraFilter?.('glutenFree')}
                />
                <span className="catalog-filter-toggle-switch" />
              </label>
            </div>
          </div>

          {/* Section: Availability & Offers */}
          <div className="catalog-filter-section">
            <h3 className="catalog-filter-section-title">
              {t('catalog.filterSectionAvailability')}
            </h3>
            <div className="catalog-filter-toggles-list">
              <label className="catalog-filter-toggle-row">
                <div className="catalog-filter-toggle-label">
                  <span>{t('catalog.filterOnSaleOnly')}</span>
                </div>
                <input
                  type="checkbox"
                  className="catalog-filter-toggle-input"
                  checked={Boolean(extraFilters.onSaleOnly)}
                  onChange={() => onToggleExtraFilter?.('onSaleOnly')}
                />
                <span className="catalog-filter-toggle-switch" />
              </label>

              <label className="catalog-filter-toggle-row">
                <div className="catalog-filter-toggle-label">
                  <span>{t('catalog.filterInStockOnly')}</span>
                </div>
                <input
                  type="checkbox"
                  className="catalog-filter-toggle-input"
                  checked={Boolean(extraFilters.inStockOnly)}
                  onChange={() => onToggleExtraFilter?.('inStockOnly')}
                />
                <span className="catalog-filter-toggle-switch" />
              </label>

              <label className="catalog-filter-toggle-row">
                <div className="catalog-filter-toggle-label">
                  <span>{t('catalog.filterWithPhotoOnly')}</span>
                </div>
                <input
                  type="checkbox"
                  className="catalog-filter-toggle-input"
                  checked={Boolean(extraFilters.withPhotoOnly)}
                  onChange={() => onToggleExtraFilter?.('withPhotoOnly')}
                />
                <span className="catalog-filter-toggle-switch" />
              </label>
            </div>
          </div>
        </div>

        {/* Sticky Apply Button */}
        <div className="catalog-filter-drawer-footer">
          <button type="button" className="catalog-filter-drawer-apply-btn" onClick={onClose}>
            {totalResultsCount > 0
              ? t('catalog.filtersApply', { count: totalResultsCount })
              : t('catalog.filtersEmptyApply')}
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null
}
