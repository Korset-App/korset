import { forwardRef } from 'react'
import { getCategoryLabel } from '../../utils/fitCheck.js'
import { CategoryCard } from './CategoryCard.jsx'

export const CategoryShowcaseGrid = forwardRef(function CategoryShowcaseGrid(
  {
    activeCategoryKeys = [],
    pendingCategory,
    onCategoryClick,
    onScroll,
    lang,
    t,
    _baseProductsCount = 0,
    _storeName = '',
    _isCatalogReady = true,
    _isCatalogLoading = false,
  },
  ref
) {
  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className={`catalog-showcase-scroll${pendingCategory ? ' is-exiting' : ''}`}
    >
      <h1 className="sr-only">{t('catalog.categoriesTitle')}</h1>

      <div className="catalog-showcase-grid">
        {activeCategoryKeys.map((catKey, index) => {
          const label = getCategoryLabel(catKey, lang)
          return (
            <CategoryCard
              key={catKey}
              categoryKey={catKey}
              label={label}
              onSelect={onCategoryClick}
              index={index}
              isActive={pendingCategory === catKey}
              lang={lang}
            />
          )
        })}
      </div>
    </div>
  )
})
