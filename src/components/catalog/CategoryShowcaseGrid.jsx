import { forwardRef, useLayoutEffect, useRef } from 'react'
import { getCategoryLabel } from '../../utils/fitCheck.js'
import { CategoryCard } from './CategoryCard.jsx'

export const CategoryShowcaseGrid = forwardRef(function CategoryShowcaseGrid(
  {
    activeCategoryKeys = [],
    pendingCategory,
    onCategoryClick,
    onScroll,
    scrollPositionRef,
    lang,
    t,
    _baseProductsCount = 0,
    _storeName = '',
    _isCatalogReady = true,
    _isCatalogLoading = false,
  },
  ref
) {
  const scrollElement = useRef(null)
  useLayoutEffect(() => {
    if (scrollElement.current) scrollElement.current.scrollTop = scrollPositionRef?.current || 0
  }, [scrollPositionRef])
  return (
    <div
      ref={(element) => {
        scrollElement.current = element
        if (typeof ref === 'function') ref(element)
        else if (ref) ref.current = element
      }}
      onScroll={onScroll}
      className={`catalog-showcase-scroll${pendingCategory ? ' is-exiting' : ''}`}
    >
      <div className="catalog-showcase-grid" role="group" aria-label={t('catalog.categoriesTitle')}>
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
