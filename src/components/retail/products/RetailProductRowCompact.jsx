import {
  LockIcon,
  HalalBadgeIcon,
  InventoryIcon,
} from '../../icons/index.js'
import { displayName, displayBrand, displayImage } from './productHelpers.js'
import Highlight from './Highlight.jsx'
import StockBadge from './StockBadge.jsx'

export default function RetailProductRowCompact({
  product,
  search,
  onInspect,
  tr,
}) {
  const name = displayName(product)
  const brand = displayBrand(product)
  const img = displayImage(product)
  const isManaged = Boolean(product.sync_integration_id)
  const currentPrice = Number(product.price_kzt) || 0
  const oldPrice = Number(product.old_price_kzt) || 0
  const hasDiscount = Boolean(product.discount_percent && oldPrice > currentPrice)
  const isHalal = Boolean(product.global_products?.halal_status === 'halal' || product.is_halal)

  return (
    <div
      onClick={() => onInspect(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onInspect(product)
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: 'var(--rc-surface)',
        borderRadius: 14,
        border: '1px solid var(--rc-line)',
        marginBottom: 8,
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background-color 0.12s ease',
      }}
    >
      {/* ── Product Thumbnail ── */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          overflow: 'hidden',
          background: 'var(--rc-surface-2)',
          border: '1px solid var(--rc-line)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {img ? (
          <img
            src={img}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            loading="lazy"
          />
        ) : (
          <InventoryIcon size={22} color="var(--rc-ink-3)" />
        )}

        {isHalal && (
          <div
            style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              background: 'var(--rc-surface)',
              borderRadius: 4,
              padding: '1px',
              display: 'flex',
            }}
          >
            <HalalBadgeIcon size={11} color="var(--rc-pos)" />
          </div>
        )}
      </div>

      {/* ── Center Info (2-line title + subline) ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.28,
            color: 'var(--rc-ink)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          title={name}
        >
          <Highlight text={name} query={search} />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
            fontSize: 11,
            color: 'var(--rc-ink-2)',
            flexWrap: 'wrap',
          }}
        >
          {brand && (
            <span style={{ fontWeight: 600, color: 'var(--rc-ink)' }}>
              <Highlight text={brand} query={search} />
            </span>
          )}

          <span
            className="rc-num"
            style={{
              padding: '1px 5px',
              background: 'var(--rc-surface-2)',
              borderRadius: 4,
              border: '1px solid var(--rc-line)',
              color: 'var(--rc-ink-3)',
            }}
          >
            <Highlight text={product.ean} query={search} />
          </span>

          {isManaged ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                fontSize: 10.5,
                fontWeight: 600,
                padding: '1px 4px',
                borderRadius: 4,
                background: 'color-mix(in srgb, #38BDF8 14%, transparent)',
                color: '#0284C7',
              }}
            >
              <LockIcon size={10} />
              <span>POS</span>
            </span>
          ) : (
            <span
              style={{
                fontSize: 10.5,
                padding: '1px 4px',
                borderRadius: 4,
                background: 'var(--rc-surface-2)',
                color: 'var(--rc-ink-3)',
              }}
            >
              Körset
            </span>
          )}

          {(product.shelf_zone || product.shelf_position) && (
            <span
              style={{
                fontSize: 10.5,
                padding: '1px 4px',
                borderRadius: 4,
                background: 'color-mix(in srgb, var(--rc-accent) 12%, transparent)',
                color: 'var(--rc-accent)',
              }}
            >
              {[product.shelf_zone, product.shelf_position].filter(Boolean).join('·')}
            </span>
          )}
        </div>
      </div>

      {/* ── Right Info (Price + Stock) ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          flexShrink: 0,
          gap: 4,
        }}
      >
        {currentPrice > 0 ? (
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="rc-num" style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--rc-ink)' }}>
                {currentPrice.toLocaleString('ru-RU')} ₸
              </span>
              {hasDiscount && (
                <span
                  className="rc-num"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 3px',
                    borderRadius: 3,
                    background: 'var(--rc-accent-soft)',
                    color: 'var(--rc-ink)',
                  }}
                >
                  -{product.discount_percent}%
                </span>
              )}
            </div>
            {hasDiscount && (
              <div
                className="rc-num"
                style={{
                  fontSize: 10.5,
                  color: 'var(--rc-ink-3)',
                  textDecoration: 'line-through',
                }}
              >
                {oldPrice.toLocaleString('ru-RU')} ₸
              </div>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 11.5, color: 'var(--rc-warn)', fontWeight: 500 }}>
            {tr.noPrice || 'Без цены'}
          </span>
        )}

        <StockBadge status={product.stock_status} tr={tr} />
      </div>
    </div>
  )
}
