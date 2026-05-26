import { useState } from 'react'

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

function VerdictBadge({ verdict }) {
  return (
    <div className={`catalog-verdict-badge ${verdict.cls}`}>
      <span className="material-symbols-outlined">{verdict.icon}</span>
      {verdict.label}
    </div>
  )
}

function AttributeBadge({ badge }) {
  return (
    <span className={`catalog-product-card__badge catalog-product-card__badge--${badge.className}`}>
      <span className="material-symbols-outlined" aria-hidden="true">
        {badge.icon}
      </span>
      {badge.label}
    </span>
  )
}

function CardBadges({ verdict, badges, kcalLabel }) {
  return (
    <div className="catalog-product-card__badges">
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
  compareIcon,
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
        </div>

        <button
          type="button"
          className={`catalog-compare-btn-grid ${compareState}`}
          aria-label={compareLabel}
          onClick={onCompare}
        >
          <span className="material-symbols-outlined">{compareIcon}</span>
        </button>
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
          <div className="catalog-product-card__price catalog-product-card__price--list">
            {price}
          </div>
        </div>

        <div className="catalog-product-card__meta catalog-product-card__meta--list">
          {productMeta}
        </div>

        <CardBadges verdict={verdict} badges={badges} kcalLabel={kcalLabel} />

        <div className="catalog-product-card__footer catalog-product-card__footer--list">
          <button
            type="button"
            className={`catalog-compare-btn ${compareState}`}
            aria-label={compareLabel}
            onClick={onCompare}
          >
            <span className="material-symbols-outlined">{compareIcon}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
