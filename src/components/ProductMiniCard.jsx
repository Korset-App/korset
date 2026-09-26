import { useNavigate } from 'react-router-dom'
import { useStore } from '../contexts/StoreContext.jsx'
import { useI18n } from '../i18n/index.js'
import { useLocalName } from '../utils/localName.js'
import { buildProductPath } from '../utils/routes.js'
import { getDisplayQuantity } from '../utils/parseQuantity.js'

/**
 * Compact product card used in profile tabs (favorites / history).
 * Whole card is the only click target — opens the product detail screen.
 */
export default function ProductMiniCard({ product, onRemove }) {
  const navigate = useNavigate()
  const { currentStore } = useStore()
  const { lang } = useI18n()
  const localName = useLocalName(product)

  if (!product?.ean && !product?.id) return null

  const image = product.image || product.images?.[0] || null
  const country = product.manufacturer?.country || null
  const meta = [country || product.brand, getDisplayQuantity(product, lang)]
    .filter(Boolean)
    .join(' · ')

  const price = typeof product.priceKzt === 'number' && product.priceKzt > 0 ? product.priceKzt : null
  const oldPrice =
    typeof product.oldPriceKzt === 'number' && product.oldPriceKzt > (price || 0)
      ? product.oldPriceKzt
      : null

  const handleOpen = () => {
    if (!product.ean) return
    navigate(buildProductPath(currentStore?.slug || null, product.ean), {
      state: { product },
    })
  }

  return (
    <div
      className="product-mini-card"
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleOpen()
        }
      }}
    >
      <div className="product-mini-card__image-wrap catalog-img-box" style={{ position: 'relative' }}>
        {onRemove && (
          <button
            type="button"
            className="product-mini-card__remove-btn"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(product)
            }}
            aria-label="Удалить"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        {image ? (
          <img
            src={image}
            alt=""
            className="product-mini-card__image product-img-blend"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="product-mini-card__placeholder" aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
        )}
      </div>
      <div className="product-mini-card__body">
        {price ? (
          <div className="product-mini-card__price-row">
            <span className="product-mini-card__price">{price.toLocaleString('ru-RU')} ₸</span>
            {oldPrice ? (
              <span className="product-mini-card__old-price">{oldPrice.toLocaleString('ru-RU')} ₸</span>
            ) : null}
          </div>
        ) : null}
        <div className="product-mini-card__name" title={localName}>
          {localName}
        </div>
        {meta && <div className="product-mini-card__meta">{meta}</div>}
      </div>
    </div>
  )
}
