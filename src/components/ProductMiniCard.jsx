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
export default function ProductMiniCard({ product }) {
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
      <div className="product-mini-card__image-wrap catalog-img-box">
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
        <div className="product-mini-card__name" title={localName}>
          {localName}
        </div>
        {meta && <div className="product-mini-card__meta">{meta}</div>}
      </div>
    </div>
  )
}
