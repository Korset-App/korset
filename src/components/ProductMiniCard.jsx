import { useNavigate } from 'react-router-dom'
import { useStore } from '../contexts/StoreContext.jsx'
import { useI18n } from '../i18n/index.js'
import { useLocalName } from '../utils/localName.js'
import { buildProductPath } from '../utils/routes.js'
import { getDisplayQuantity } from '../utils/parseQuantity.js'
import ShoppingListButton from './ShoppingListButton.jsx'
import './ProductMiniCard.css'

export default function ProductMiniCard({ product, onRemove, onAdd }) {
  const navigate = useNavigate()
  const { currentStore } = useStore()
  const { lang, t } = useI18n()
  const resolvedName = useLocalName(product)
  const localName = product?.source === 'unknown' ? t('shopping.unknownProduct') : resolvedName

  if (!product?.ean && !product?.id) return null

  const image = product.image || product.images?.[0] || null
  const country = product.manufacturer?.country || null
  const meta = [country || product.brand, getDisplayQuantity(product, lang)]
    .filter(Boolean)
    .join(' · ')

  const price =
    typeof product.priceKzt === 'number' && product.priceKzt > 0 ? product.priceKzt : null
  const oldPrice =
    typeof product.oldPriceKzt === 'number' && product.oldPriceKzt > (price || 0)
      ? product.oldPriceKzt
      : null

  const handleOpen = () => {
    if (!product.ean || product.storeUnavailable) return
    navigate(buildProductPath(currentStore?.slug || null, product.ean), {
      state: { product },
    })
  }

  return (
    <article className="product-mini-card">
      <button
        type="button"
        className="product-mini-card__open"
        disabled={product.storeUnavailable}
        onClick={handleOpen}
        aria-label={localName}
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
          {product.storeOutOfStock && (
            <div className="product-mini-card__unavailable">{t('shopping.outOfStock')}</div>
          )}
          {product.storeUnavailable ? (
            <div className="product-mini-card__unavailable">{t('shopping.storeUnavailable')}</div>
          ) : price ? (
            <div className="product-mini-card__price-row">
              <span className="product-mini-card__price">{price.toLocaleString('ru-RU')} ₸</span>
              {oldPrice ? (
                <span className="product-mini-card__old-price">
                  {oldPrice.toLocaleString('ru-RU')} ₸
                </span>
              ) : null}
            </div>
          ) : (
            <div className="product-mini-card__unavailable">{t('shopping.priceUnknown')}</div>
          )}
          <div className="product-mini-card__name" title={localName}>
            {localName}
          </div>
          {meta && <div className="product-mini-card__meta">{meta}</div>}
        </div>
      </button>
      {(onRemove || onAdd) && (
        <ShoppingListButton
          active={Boolean(onRemove)}
          className="product-mini-card__list-action"
          onClick={() => {
            if (onRemove) onRemove(product)
            else onAdd(product)
          }}
        />
      )}
    </article>
  )
}
