import { memo } from 'react'
import { getCategoryShowcase } from '../../domain/product/catalogShowcase.js'

function CategoryCardComponent({ categoryKey, label, onSelect, index, isActive, lang }) {
  const showcase = getCategoryShowcase(categoryKey)

  return (
    <button
      type="button"
      className="catalog-category-card"
      data-category={categoryKey}
      data-variant={showcase.variant}
      data-tone={showcase.tone}
      data-text={showcase.textTone}
      data-active={isActive ? 'true' : 'false'}
      style={{
        '--catalog-card-index': index,
        '--cat-image-scale': showcase.imageScale || undefined,
        '--cat-image-x': showcase.imageX || undefined,
        '--cat-image-y': showcase.imageY || undefined,
      }}
      onClick={() => onSelect(categoryKey)}
      aria-label={label}
    >
      <span className="catalog-category-sheen" aria-hidden="true" />
      <span className="catalog-category-media" aria-hidden="true">
        <img
          src={showcase.image}
          alt=""
          loading={index < 4 ? 'eager' : 'lazy'}
          decoding="async"
        />
      </span>
      <span className="catalog-category-copy">
        <span className="catalog-category-title" lang={lang === 'kz' ? 'kk' : 'ru'}>
          {label}
        </span>
      </span>
    </button>
  )
}

export const CategoryCard = memo(CategoryCardComponent)
