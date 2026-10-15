import { createPortal } from 'react-dom'
import { buildProductPath } from '../../../utils/routes.js'
import {
  InventoryIcon,
  CloseIcon,
  ArrowForwardIcon,
  TrashIcon,
} from '../../icons/index.js'
import PriceField from './PriceField.jsx'
import StockToggle from './StockToggle.jsx'
import ShoppingRecommendationToggle from './ShoppingRecommendationToggle.jsx'
import PromotionSection from './PromotionSection.jsx'
import { displayName, displayBrand, displayImage } from './productHelpers.js'

export default function EditBottomSheet({
  product,
  tr,
  storeSlug,
  priceMutation,
  stockMutation,
  recommendationMutation,
  promotionMutation,
  onClose,
  onDeleteRequest,
}) {
  if (!product) return null

  const imgUrl = displayImage(product)
  const name = displayName(product)
  const brand = displayBrand(product)
  const managed = Boolean(product.sync_integration_id)

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9990,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          margin: '0 auto',
          background: 'linear-gradient(180deg, #14162a 0%, #0d0f1e 100%)',
          borderRadius: '20px 20px 0 0',
          maxHeight: '88vh',
          overflowY: 'auto',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Sheet handle */}
        <div
          style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}
        >
          <div
            style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--glass-handle)' }}
          />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px 0' }}>
          <div
            className="catalog-img-box"
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {imgUrl ? (
              <img
                src={imgUrl}
                alt=""
                className="product-img-blend"
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
              />
            ) : (
              <InventoryIcon size={24} color="var(--text-dim)" />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {name}
            </div>
            {brand && (
              <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>{brand}</div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--glass-soft-border)',
              border: 'none',
              borderRadius: 10,
              padding: 8,
              cursor: 'pointer',
              flexShrink: 0,
              color: 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Open card link */}
        {storeSlug && (
          <div style={{ padding: '10px 20px 0' }}>
            <a
              href={buildProductPath(storeSlug, product.ean)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: '#38BDF8',
                textDecoration: 'none',
                background: 'rgba(56,189,248,0.07)',
                border: '1px solid rgba(56,189,248,0.18)',
                borderRadius: 8,
                padding: '5px 11px',
              }}
            >
              <ArrowForwardIcon size={13} />
              {tr.openCard}
            </a>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--line-soft)', margin: '14px 20px 0' }} />

        {/* Editor fields */}
        <div
          style={{ padding: '16px 20px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          <PriceField
            productId={product.id}
            initialPrice={product.price_kzt}
            p={tr}
            priceMutation={priceMutation}
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
            managed={managed}
          />
          {managed && (
            <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 12 }}>
              {tr.sourceManagedNote}
            </p>
          )}

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
                padding: '12px 14px',
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
    </div>,
    document.body
  )
}
