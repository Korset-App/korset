import { useState } from 'react'

import { CompareIcon } from '../icons/CompareIcon.jsx'
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
  if (badge.id === 'halal') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" className="catalog-product-card__badge-icon">
        <path d="M8.95 2.05c-2.63.47-4.63 2.77-4.63 5.53 0 3.1 2.52 5.62 5.62 5.62 1.21 0 2.33-.38 3.25-1.03a6.07 6.07 0 0 1-4.73 2.27A6.43 6.43 0 0 1 2.03 8c0-3.27 2.44-5.97 5.6-6.38.45-.06.9.1 1.32.43Z" />
        <path d="M11.1 4.32 11.7 5.6l1.38.2-1 .98.24 1.38-1.22-.64-1.22.64.24-1.38-1-.98 1.38-.2.6-1.28Z" />
      </svg>
    )
  }

  if (badge.id === 'sugar_free') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" className="catalog-product-card__badge-icon">
        <path d="M8 2.1 13.6 5.3v5.4L8 13.9l-5.6-3.2V5.3L8 2.1Zm0 1.55L3.75 6.08v3.84L8 12.35l4.25-2.43V6.08L8 3.65Z" />
        <path d="M2.2 12.74 12.74 2.2l1.06 1.06L3.26 13.8 2.2 12.74Z" />
      </svg>
    )
  }

  if (badge.id === 'gluten_free') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" className="catalog-product-card__badge-icon">
        <path d="M7.25 2h1.5v12h-1.5V2Z" />
        <path d="M5.2 3.2c1.12.3 2.05 1.3 2.05 2.63v.75C6.13 6.28 5.2 5.28 5.2 3.95V3.2Zm5.6 0v.75c0 1.33-.93 2.33-2.05 2.63v-.75c0-1.33.93-2.33 2.05-2.63ZM4.6 7.05c1.36.28 2.65 1.42 2.65 3v.69c-1.36-.28-2.65-1.42-2.65-3v-.69Zm6.8 0v.69c0 1.58-1.29 2.72-2.65 3v-.69c0-1.58 1.29-2.72 2.65-3Z" />
      </svg>
    )
  }

  if (badge.id === 'lactose_free') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" className="catalog-product-card__badge-icon">
        <path d="M5.15 1.8h5.7v1.45l-.95 1.1v8.05c0 .99-.8 1.8-1.8 1.8H7.9c-.99 0-1.8-.81-1.8-1.8V4.35l-.95-1.1V1.8Zm1.5 1.32.95 1.1v8.18c0 .17.13.3.3.3h.2c.17 0 .3-.13.3-.3V4.22l.95-1.1h-2.7Z" />
        <path d="M2.2 12.74 12.74 2.2l1.06 1.06L3.26 13.8 2.2 12.74Z" />
      </svg>
    )
  }

  if (badge.id === 'vegan') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" className="catalog-product-card__badge-icon">
        <path d="M13.9 2.25c-3.5.08-6.13.83-7.87 2.28C4.36 5.92 3.6 7.9 3.74 10.46l-1.3 1.3 1.06 1.06 1.22-1.22c2.56.17 4.56-.58 5.96-2.25 1.44-1.72 2.18-4.1 2.22-7.1ZM5.4 9.8c.06-1.76.6-3.1 1.6-4 1.02-.92 2.5-1.52 4.42-1.78-.22 1.86-.82 3.3-1.8 4.3-.96.98-2.37 1.47-4.22 1.48Z" />
      </svg>
    )
  }

  if (badge.id === 'keto') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" className="catalog-product-card__badge-icon">
        <path d="M3.2 2.3h2.04v4.38L8.52 2.3h2.36L7.5 6.77l3.64 6.93H8.78L6.16 8.6l-.92 1.2v3.9H3.2V2.3Zm8.82 7.1c.5 0 .9.4.9.9v2.5c0 .5-.4.9-.9.9s-.9-.4-.9-.9v-2.5c0-.5.4-.9.9-.9Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="catalog-product-card__badge-icon">
      <path d="M8 2.2a5.8 5.8 0 1 1 0 11.6A5.8 5.8 0 0 1 8 2.2Zm0 1.5a4.3 4.3 0 1 0 0 8.6 4.3 4.3 0 0 0 0-8.6Z" />
    </svg>
  )
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
          <span className="material-symbols-outlined" aria-hidden="true">
            local_fire_department
          </span>
          {kcalLabel}
        </span>
      )}
    </div>
  )
}

function CompareButtonIcon({ compareState, size = 18 }) {
  if (compareState === 'active-pin') {
    return <span className="material-symbols-outlined">close</span>
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
