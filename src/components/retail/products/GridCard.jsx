import { formatPrice } from '../../../utils/formatPrice.js'
import { InventoryIcon, SparklesIcon } from '../../icons/index.js'
import StockBadge from './StockBadge.jsx'
import { displayName, displayBrand, displayImage, isInStock } from './productHelpers.js'

export default function GridCard({ product, tr, onEdit }) {
  const inStock = isInStock(product)
  const imgUrl = displayImage(product)
  const name = displayName(product)
  const brand = displayBrand(product)
  const hasDiscount =
    product.discount_percent || (product.old_price_kzt && product.old_price_kzt > product.price_kzt)
  const discountPct =
    product.discount_percent ||
    (product.old_price_kzt && product.price_kzt
      ? Math.round((1 - product.price_kzt / product.old_price_kzt) * 100)
      : null)

  return (
    <div
      onClick={() => onEdit(product)}
      style={{
        background: 'var(--glass-subtle)',
        border: '1px solid var(--glass-soft-border)',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        opacity: inStock ? 1 : 0.65,
        transition: 'border-color 0.2s, background 0.2s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div
        className="catalog-img-box"
        style={{
          position: 'relative',
          height: 120,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={name}
            className="product-img-blend"
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 10 }}
          />
        ) : (
          <InventoryIcon size={32} color="var(--text-dim)" />
        )}

        {/* Floating badges on grid image */}
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            zIndex: 1,
          }}
        >
          {Boolean(product.is_featured) && (
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 5px',
                borderRadius: 5,
                background: 'rgba(245,158,11,0.92)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                boxShadow: '0 2px 6px rgba(245,158,11,0.3)',
              }}
            >
              <SparklesIcon size={10} />
              {tr.badgeFeatured}
            </div>
          )}
          {hasDiscount && (
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 5px',
                borderRadius: 5,
                background: '#EF4444',
                color: '#fff',
                boxShadow: '0 2px 6px rgba(239,68,68,0.3)',
              }}
            >
              -{discountPct}%
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          padding: '8px 10px 10px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text)',
            lineHeight: 1.3,
            minHeight: '2.6em',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-dim)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minHeight: '1.5em',
          }}
        >
          {brand || ''}
        </div>
        <div
          style={{
            paddingTop: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: inStock ? (hasDiscount ? '#EF4444' : '#38BDF8') : 'var(--text-dim)',
              textDecoration: inStock ? 'none' : 'line-through',
              display: 'flex',
              alignItems: 'baseline',
              gap: 4,
            }}
          >
            {inStock && product.old_price_kzt && product.old_price_kzt > product.price_kzt && (
              <span
                style={{
                  fontSize: 10,
                  textDecoration: 'line-through',
                  color: 'var(--text-dim)',
                  fontWeight: 500,
                }}
              >
                {formatPrice(product.old_price_kzt)}
              </span>
            )}
            {product.price_kzt != null ? (
              formatPrice(product.price_kzt)
            ) : (
              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{tr.noPrice}</span>
            )}
          </div>
          <StockBadge status={product.stock_status} p={tr} />
        </div>
      </div>
    </div>
  )
}
