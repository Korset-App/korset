import { memo } from 'react'
import { getCategoryShowcase } from '../../domain/product/catalogShowcase.js'
import './CategoryArtwork.css'

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
      }}
      onClick={() => onSelect(categoryKey)}
      aria-label={label}
    >
      <span className="catalog-category-copy">
        <span className="catalog-category-title" lang={lang === 'kz' ? 'kk' : 'ru'}>
          {label}
        </span>
      </span>
      <span className="catalog-category-media" aria-hidden="true">
        <img
          src={showcase.image}
          alt=""
          loading={index < 8 ? 'eager' : 'lazy'}
          fetchpriority={index < 2 ? 'high' : 'auto'}
          decoding="async"
        />
      </span>
    </button>
  )
}

export const CategoryCard = memo(CategoryCardComponent)
