import { useState } from 'react'

import { CloseIcon } from '../icons/CloseIcon.jsx'
import { CompareIcon } from '../icons/CompareIcon.jsx'
import { DietIcon } from '../icons/DietIcon.jsx'
import './CatalogProductCard.css'

function ProductThumb({ product }) {
  const [imgOk, setImgOk] = useState(true)
  const src = product.image || product.imageUrl || product.images?.[0]

  if (src && imgOk) {
    return (
      <img
        src={src}
        alt={product.name}
        className="product-img-blend catalog-product-card__image"
        onError={() => setImgOk(false)}
      />
    )
  }

  return <div className="catalog-product-card__image-fallback">{product.name?.[0] || '•'}</div>
}

function FlameIcon({ size = 11 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="catalog-product-card__badge-icon"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  )
}

function VerdictIcon({ verdict }) {
  if (verdict.cls === 'danger') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" className="catalog-verdict-badge__icon">
        <path d="M8 1.25 14.75 8 8 14.75 1.25 8 8 1.25Zm0 1.95L3.2 8 8 12.8 12.8 8 8 3.2Zm-1.9 3.72 1.08-1.08L8 6.66l.82-.82 1.08 1.08L9.08 7.74l.82.82-1.08 1.08L8 8.82l-.82.82L6.1 8.56l.82-.82-.82-.82Z" />
      </svg>
    )
  }

  if (verdict.cls === 'warning' || verdict.cls === 'caution') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" className="catalog-verdict-badge__icon">
        <path d="M8 1.7c.38 0 .73.2.93.53l6.15 10.32c.44.73-.09 1.65-.93 1.65H1.85c-.84 0-1.37-.92-.93-1.65L7.07 2.23c.2-.33.55-.53.93-.53Zm0 1.82L2.76 12.3h10.48L8 3.52Zm-.7 3.05h1.4v3.35H7.3V6.57Zm0 4.32h1.4v1.24H7.3v-1.24Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="catalog-verdict-badge__icon">
      <path d="M8 1.6a6.4 6.4 0 1 1 0 12.8A6.4 6.4 0 0 1 8 1.6Zm3.18 4.45-.95-.95-3.05 3.04-1.41-1.4-.95.94 2.36 2.36 4-3.99Z" />
    </svg>
  )
}

function VerdictBadge({ verdict }) {
  return (
    <div className={`catalog-verdict-badge ${verdict.cls}`}>
      <VerdictIcon verdict={verdict} />
      {verdict.label}
    </div>
  )
}

function AttributeIcon({ badge }) {
  const iconMap = {
    halal: 'halal',
    sugar_free: 'nosugar',
    gluten_free: 'nogluten',
    lactose_free: 'nodairy',
    vegan: 'vegan',
    keto: 'keto',
    vegetarian: 'veggie',
    low_fat: 'lowfat',
    kid_friendly: 'kids',
  }
  const name = iconMap[badge.id] || badge.id
  return <DietIcon name={name} size={14} />
}

function AttributeBadge({ badge }) {
  return (
    <span className={`catalog-product-card__badge catalog-product-card__badge--${badge.className}`}>
      <AttributeIcon badge={badge} />
      {badge.label}
    </span>
  )
}

function CardBadges({ verdict, badges, kcalLabel }) {
  const badgeCount = 1 + badges.length + (kcalLabel ? 1 : 0)

  return (
    <div className="catalog-product-card__badges" data-badge-count={badgeCount}>
      <VerdictBadge verdict={verdict} />
      {badges.map((badge) => (
        <AttributeBadge key={badge.id} badge={badge} />
      ))}
      {kcalLabel && (
        <span className="catalog-product-card__badge catalog-product-card__badge--kcal">
          <FlameIcon />
          {kcalLabel}
        </span>
      )}
    </div>
  )
}

function CompareButtonIcon({ compareState, size = 18 }) {
  if (compareState === 'active-pin') {
    return <CloseIcon size={size} />
  }

  return <CompareIcon active={compareState === 'select-second'} size={size} />
}

export default function CatalogProductCard({
  mode,
  product,
  productName,
  productMeta,
  price,
  verdict,
  badges = [],
  kcalLabel = null,
  compareState,
  compareLabel,
  searchDiagnosticsAttrs,
  onOpen,
  onCompare,
}) {
  if (mode === 'grid') {
    return (
      <div
        {...searchDiagnosticsAttrs}
        className="catalog-product-card catalog-product-card--grid"
        onClick={onOpen}
      >
        <div className="catalog-img-box catalog-product-card__thumb catalog-product-card__thumb--grid">
          <ProductThumb product={product} />
        </div>

        <div className="catalog-product-card__title catalog-product-card__title--grid">
          {productName}
        </div>

        <div className="catalog-product-card__meta catalog-product-card__meta--grid">
          {productMeta}
        </div>

        <CardBadges verdict={verdict} badges={badges} kcalLabel={kcalLabel} />

        <div className="catalog-product-card__footer catalog-product-card__footer--grid">
          <div className="catalog-product-card__price catalog-product-card__price--grid">
            {price}
          </div>
          <button
            type="button"
            className={`catalog-compare-btn-grid ${compareState}`}
            aria-label={compareLabel}
            onClick={onCompare}
          >
            <CompareButtonIcon compareState={compareState} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      {...searchDiagnosticsAttrs}
      className="catalog-product-card catalog-product-card--list"
      onClick={onOpen}
    >
      <div className="catalog-img-box catalog-product-card__thumb catalog-product-card__thumb--list">
        <ProductThumb product={product} />
      </div>

      <div className="catalog-product-card__body">
        <div className="catalog-product-card__header">
          <div className="catalog-product-card__title catalog-product-card__title--list">
            {productName}
          </div>
        </div>

        <div className="catalog-product-card__meta catalog-product-card__meta--list">
          {productMeta}
        </div>

        <CardBadges verdict={verdict} badges={badges} kcalLabel={kcalLabel} />
      </div>

      <div className="catalog-product-card__actions catalog-product-card__actions--list">
        <div className="catalog-product-card__price catalog-product-card__price--list">{price}</div>
        <button
          type="button"
          className={`catalog-compare-btn ${compareState}`}
          aria-label={compareLabel}
          onClick={onCompare}
        >
          <CompareButtonIcon compareState={compareState} />
        </button>
      </div>
    </div>
  )
}
