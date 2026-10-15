import { memo } from 'react'
import { formatPrice } from '../../../utils/formatPrice.js'
import {
  InventoryIcon,
  ChevronDownIcon,
  SparklesIcon,
  TrashIcon,
} from '../../icons/index.js'
import Highlight from './Highlight.jsx'
import StockBadge from './StockBadge.jsx'
import PriceField from './PriceField.jsx'
import StockToggle from './StockToggle.jsx'
import ShoppingRecommendationToggle from './ShoppingRecommendationToggle.jsx'
import PromotionSection from './PromotionSection.jsx'
import ReadonlyBlock from './ReadonlyBlock.jsx'
import { displayName, displayBrand, displayImage, isInStock } from './productHelpers.js'

const ProductCard = memo(
  function ProductCard({
    product,
    isExpanded,
    search,
    tr,
    storeSlug,
    priceMutation,
    stockMutation,
    recommendationMutation,
    promotionMutation,
    setExpandedId,
    onDeleteRequest,
  }) {
    const inStock = isInStock(product)
    const imgUrl = displayImage(product)
    const name = displayName(product)
    const brand = displayBrand(product)
    const managed = Boolean(product.sync_integration_id)

    return (
      <div
        style={{
          background: isExpanded ? 'rgba(56,189,248,0.05)' : 'var(--glass-subtle)',
          border: `1px solid ${isExpanded ? 'rgba(56,189,248,0.28)' : 'var(--glass-soft-border)'}`,
          borderRadius: 18,
          overflow: 'hidden',
          transition: 'border-color 0.25s, background 0.25s',
        }}
      >
        {/* ── Card header (tap to expand) ── */}
        <div
          onClick={() =>
            setExpandedId((prev) => {
              if (prev === product.id) {
                return null
              }
              try {
                window.history.pushState(
                  { _retailInternal: true },
                  '',
                  window.location.pathname + window.location.search
                )
              } catch {
                /* noop */
              }
              return product.id
            })
          }
          style={{
            padding: '13px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
          }}
        >
          {/* Thumb */}
          <div
            className="catalog-img-box"
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
              opacity: inStock ? 1 : 0.4,
            }}
          >
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={name}
                className="product-img-blend"
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
              />
            ) : (
              <InventoryIcon size={22} color="var(--text-dim)" />
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0, opacity: inStock ? 1 : 0.55 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <Highlight text={name} q={search} />
            </div>
            {brand && (
              <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
                <Highlight text={brand} q={search} />
              </div>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 3,
                flexWrap: 'wrap',
              }}
            >
              {Boolean(product.is_featured) && (
                <div
                  title={tr.featuredLabel}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 5,
                    background: 'rgba(245,158,11,0.15)',
                    border: '1px solid rgba(245,158,11,0.35)',
                    color: '#F59E0B',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 2,
                    lineHeight: '13px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <SparklesIcon size={10} />
                  {tr.badgeFeatured}
                </div>
              )}
              {(product.discount_percent ||
                (product.old_price_kzt && product.old_price_kzt > product.price_kzt)) && (
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 5,
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.35)',
                    color: '#EF4444',
                    lineHeight: '13px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  -
                  {product.discount_percent ||
                    Math.round((1 - product.price_kzt / product.old_price_kzt) * 100)}
                  %
                </div>
              )}
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-disabled)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                <Highlight text={product.ean} q={search} />
              </div>
            </div>
          </div>

          {/* Price + status */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 5,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: inStock
                  ? product.old_price_kzt && product.old_price_kzt > product.price_kzt
                    ? '#EF4444'
                    : '#38BDF8'
                  : 'var(--text-dim)',
                textDecoration: inStock ? 'none' : 'line-through',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
              }}
            >
              {inStock && product.old_price_kzt && product.old_price_kzt > product.price_kzt && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    textDecoration: 'line-through',
                    color: 'var(--text-dim)',
                  }}
                >
                  {formatPrice(product.old_price_kzt)}
                </span>
              )}
              {product.price_kzt != null ? (
                formatPrice(product.price_kzt)
              ) : (
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{tr.noPrice}</span>
              )}
            </div>

            <StockBadge status={product.stock_status} p={tr} />
          </div>

          {/* Chevron */}
          <ChevronDownIcon
            size={18}
            color="var(--text-dim)"
            style={{
              flexShrink: 0,
              transform: isExpanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.25s',
            }}
          />
        </div>

        {/* ── Accordion editor ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: isExpanded ? '1fr' : '0fr',
            opacity: isExpanded ? 1 : 0,
            transition: 'grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s',
            background: 'rgba(0,0,0,0.18)',
            borderTop: isExpanded ? '1px solid var(--glass-soft-border)' : 'none',
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}
            >
              <PriceField
                product={product}
                p={tr}
                priceMutation={priceMutation}
                promotionMutation={promotionMutation}
                managed={managed}
              />
              <StockToggle
                product={product}
                label={tr.stockLabel}
                stockMutation={stockMutation}
                managed={managed}
              />
              <ShoppingRecommendationToggle
                product={product}
                label={tr.shoppingRecommendationLabel}
                recommendationMutation={recommendationMutation}
              />
              <PromotionSection
                product={product}
                p={tr}
                promotionMutation={promotionMutation}
                priceMutation={priceMutation}
                managed={managed}
              />
              {managed && (
                <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 12 }}>
                  {tr.sourceManagedNote}
                </p>
              )}
              <ReadonlyBlock product={product} p={tr} storeSlug={storeSlug} />

              {/* Delete button */}
              {!managed && (
                <button
                  onClick={() => onDeleteRequest?.(product.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(239,68,68,0.07)',
                    border: '1px solid rgba(239,68,68,0.18)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    color: '#F87171',
                    fontSize: 13,
                    fontWeight: 600,
                    width: '100%',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <TrashIcon size={18} />
                  {tr.deleteProduct}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  },
  (prev, next) =>
    prev.product === next.product &&
    prev.isExpanded === next.isExpanded &&
    prev.search === next.search &&
    prev.tr === next.tr &&
    prev.priceMutation.isPending === next.priceMutation.isPending &&
    prev.priceMutation.isError === next.priceMutation.isError &&
    prev.priceMutation.variables?.id === next.priceMutation.variables?.id &&
    prev.promotionMutation.isPending === next.promotionMutation.isPending &&
    prev.promotionMutation.isError === next.promotionMutation.isError &&
    prev.promotionMutation.variables?.id === next.promotionMutation.variables?.id &&
    prev.stockMutation.isPending === next.stockMutation.isPending &&
    prev.stockMutation.isError === next.stockMutation.isError &&
    prev.stockMutation.variables?.id === next.stockMutation.variables?.id &&
    prev.recommendationMutation.isPending === next.recommendationMutation.isPending &&
    prev.recommendationMutation.isError === next.recommendationMutation.isError &&
    prev.recommendationMutation.variables?.id === next.recommendationMutation.variables?.id &&
    prev.storeSlug === next.storeSlug
)

export default ProductCard
