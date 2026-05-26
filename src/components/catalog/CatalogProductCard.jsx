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

export default function CatalogProductCard({
  mode,
  product,
  productName,
  productMeta,
  price,
  verdict,
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
        <div className="catalog-product-card__verdict catalog-product-card__verdict--grid">
          <VerdictBadge verdict={verdict} />
        </div>

        <div className="catalog-img-box catalog-product-card__thumb catalog-product-card__thumb--grid">
          <ProductThumb product={product} />
        </div>

        <div className="catalog-product-card__title catalog-product-card__title--grid">
          {productName}
        </div>

        <div className="catalog-product-card__meta catalog-product-card__meta--grid">
          {productMeta}
        </div>

        <div className="catalog-product-card__footer catalog-product-card__footer--grid">
          <div className="catalog-product-card__price catalog-product-card__price--grid">
            {price}
          </div>
        </div>

        <button
          type="button"
          className={`catalog-compare-btn-grid ${compareState}`}
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
          <VerdictBadge verdict={verdict} />
        </div>

        <div className="catalog-product-card__meta catalog-product-card__meta--list">
          {productMeta}
        </div>

        <div className="catalog-product-card__footer catalog-product-card__footer--list">
          <div className="catalog-product-card__price catalog-product-card__price--list">
            {price}
          </div>
          <button
            type="button"
            className={`catalog-compare-btn ${compareState}`}
            onClick={onCompare}
          >
            <span className="material-symbols-outlined">{compareIcon}</span>
            {compareLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
