import { useState, useMemo, useRef, useCallback, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Virtuoso } from 'react-virtuoso'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { getImageUrl } from '../utils/imageUrl.js'
import { formatPrice } from '../utils/formatPrice.js'
import {
  getStoreCatalogProducts,
  updateProductPrice,
  updateProductPromotion,
  updateProductShoppingRecommendation,
  updateProductStock,
  deleteStoreProduct,
} from '../utils/retailAnalytics.js'
import RetailScannerModal from '../components/RetailScannerModal.jsx'
import AddScannedProductModal from '../components/retail/AddScannedProductModal.jsx'
import { buildProductPath } from '../utils/routes.js'
import { useNavigate } from 'react-router-dom'
import {
  CloseIcon,
  InventoryIcon,
  StorefrontIcon,
  BarcodeScannerIcon,
  ArrowForwardIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  VerifiedBadgeIcon,
  SparklesIcon,
  ExploreIcon,
  AlertTriangleIcon,
  TrashIcon,
  UploadFileIcon,
} from '../components/icons/index.js'

// ── Helpers ────────────────────────────────────────────────────────
function displayName(p) {
  return p.local_name || p.global_products?.name || p.ean
}
function displayBrand(p) {
  return p.global_products?.brand ?? null
}
function displayImage(p) {
  return getImageUrl(p.global_products?.image_url) ?? null
}
function isInStock(p) {
  return p.stock_status !== 'out_of_stock'
}
function nextStockStatus(p) {
  return p.stock_status === 'out_of_stock' ? 'in_stock' : 'out_of_stock'
}

// ── Highlight helper ───────────────────────────────────────────────
function Highlight({ text, q }) {
  if (!q || !q.trim() || !text) return <>{text}</>
  const regex = new RegExp(`(${q.trim()})`, 'gi')
  const parts = String(text).split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span
            key={i}
            style={{
              backgroundColor: 'rgba(56,189,248,0.25)',
              color: '#38BDF8',
              borderRadius: 3,
              padding: '0 2px',
            }}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// ── Skeleton row ───────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: 'var(--glass-subtle)',
        border: '1px solid var(--line-soft)',
        borderRadius: 18,
      }}
    >
      <div
        className="retail-skel"
        style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div className="retail-skel" style={{ height: 14, width: '65%', borderRadius: 6 }} />
        <div className="retail-skel" style={{ height: 11, width: '35%', borderRadius: 5 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
        <div className="retail-skel" style={{ height: 16, width: 60, borderRadius: 6 }} />
        <div className="retail-skel" style={{ height: 18, width: 48, borderRadius: 6 }} />
      </div>
    </div>
  )
}

// ── Stock badge ────────────────────────────────────────────────────
function StockBadge({ status, p }) {
  const cfg = {
    in_stock: {
      bg: 'rgba(16,185,129,0.14)',
      border: 'rgba(16,185,129,0.3)',
      color: '#10B981',
      label: p.inStock,
    },
    low_stock: {
      bg: 'rgba(245,158,11,0.14)',
      border: 'rgba(245,158,11,0.3)',
      color: '#F59E0B',
      label: p.lowStock,
    },
    out_of_stock: {
      bg: 'rgba(239,68,68,0.12)',
      border: 'rgba(239,68,68,0.25)',
      color: '#F87171',
      label: p.outOfStock,
    },
  }
  const c = cfg[status] ?? cfg.in_stock
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: 6,
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        whiteSpace: 'nowrap',
      }}
    >
      {c.label}
    </div>
  )
}

// ── Price field with save-on-blur ──────────────────────────────────
function PriceField({ productId, initialPrice, p, priceMutation }) {
  const [draft, setDraft] = useState(initialPrice ?? '')
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saveState === 'idle') setDraft(initialPrice ?? '')
  }, [initialPrice]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBlur = useCallback(() => {
    const val = Number(draft)
    if (isNaN(val) || val < 0 || val === initialPrice) return
    setSaveState('saving')
    priceMutation.mutate(
      { id: productId, price: val },
      {
        onSuccess: () => {
          setSaveState('saved')
          timerRef.current = setTimeout(() => setSaveState('idle'), 2000)
        },
        onError: () => {
          setSaveState('error')
          timerRef.current = setTimeout(() => setSaveState('idle'), 3000)
        },
      }
    )
  }, [draft, initialPrice, productId, priceMutation])

  const stateColor = {
    idle: 'var(--text-dim)',
    saving: '#38BDF8',
    saved: '#10B981',
    error: '#F87171',
  }
  const stateLabel = { idle: null, saving: p.saving, saved: `✓ ${p.saved}`, error: p.saveError }
  const borderColor = {
    idle: 'var(--glass-border)',
    saving: 'rgba(56,189,248,0.4)',
    saved: 'rgba(16,185,129,0.4)',
    error: 'rgba(248,113,113,0.4)',
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <label style={{ fontSize: 12, color: 'var(--text-sub)', fontWeight: 500 }}>
          {p.priceLabel}
        </label>
        {stateLabel[saveState] && (
          <span
            style={{
              fontSize: 11,
              color: stateColor[saveState],
              fontWeight: 600,
              transition: 'color 0.2s',
            }}
          >
            {stateLabel[saveState]}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <input
          type="number"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          style={{
            flex: 1,
            fontSize: 22,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            padding: '11px 16px',
            borderRadius: '12px 0 0 12px',
            background: 'var(--input-bg)',
            border: `1px solid ${borderColor[saveState]}`,
            borderRight: 'none',
            color: 'var(--text)',
            outline: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'textfield',
            margin: 0,
            transition: 'border-color 0.2s',
          }}
        />
        <div
          style={{
            background: 'rgba(56,189,248,0.12)',
            border: '1px solid rgba(56,189,248,0.25)',
            borderRadius: '0 12px 12px 0',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            color: '#38BDF8',
            fontWeight: 700,
            fontSize: 17,
          }}
        >
          ₸
        </div>
      </div>
    </div>
  )
}

// ── Stock toggle ───────────────────────────────────────────────────
function StockToggle({ product, label, stockMutation }) {
  const on = isInStock(product)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
      <div
        role="switch"
        aria-checked={on}
        onClick={(e) => {
          e.stopPropagation()
          stockMutation.mutate({ id: product.id, status: nextStockStatus(product) })
        }}
        style={{
          width: 52,
          height: 30,
          borderRadius: 15,
          cursor: 'pointer',
          background: on ? '#10B981' : 'var(--glass-border)',
          position: 'relative',
          transition: 'background 0.25s',
          opacity: stockMutation.isPending ? 0.7 : 1,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 3,
            left: on ? 25 : 3,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'var(--text-inverse)',
            transition: 'left 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
          }}
        />
      </div>
    </div>
  )
}

function ShoppingRecommendationToggle({ product, label, recommendationMutation }) {
  if (!Object.hasOwn(product, 'is_shopping_recommended')) return null
  const on = Boolean(product.is_shopping_recommended)
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
    >
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={recommendationMutation?.isPending}
        onClick={(e) => {
          e.stopPropagation()
          recommendationMutation?.mutate({ id: product.id, isRecommended: !on })
        }}
        style={{
          width: 52,
          height: 30,
          border: 0,
          padding: 0,
          borderRadius: 15,
          cursor: recommendationMutation?.isPending ? 'default' : 'pointer',
          background: on ? '#10B981' : 'var(--glass-border)',
          position: 'relative',
          transition: 'background 0.25s',
          opacity: recommendationMutation?.isPending ? 0.7 : 1,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: on ? 25 : 3,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'var(--text-inverse)',
            transition: 'left 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
          }}
        />
      </button>
    </div>
  )
}

// ── Promotion & Featured section ──────────────────────────────────
function PromotionSection({ product, p, promotionMutation }) {
  const isFeatured = Boolean(product.is_featured)
  const currentPrice = Number(product.price_kzt) || 0
  const [oldPriceDraft, setOldPriceDraft] = useState(product.old_price_kzt ?? '')
  const [saveState, setSaveState] = useState('idle')
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saveState === 'idle') setOldPriceDraft(product.old_price_kzt ?? '')
  }, [product.old_price_kzt])

  const calculatedPct = useMemo(() => {
    const old = Number(oldPriceDraft)
    if (Number.isFinite(old) && old > currentPrice && currentPrice > 0) {
      return Math.round((1 - currentPrice / old) * 100)
    }
    return product.discount_percent ?? null
  }, [oldPriceDraft, currentPrice, product.discount_percent])

  const handleToggleFeatured = (e) => {
    e.stopPropagation()
    promotionMutation?.mutate({
      id: product.id,
      isFeatured: !isFeatured,
      oldPriceKzt: product.old_price_kzt,
      discountPercent: product.discount_percent,
    })
  }

  const handleOldPriceBlur = () => {
    const val = oldPriceDraft === '' ? null : Number(oldPriceDraft)
    if (val !== null && (!Number.isFinite(val) || val <= currentPrice)) {
      setOldPriceDraft('')
      if (product.old_price_kzt) {
        promotionMutation?.mutate({
          id: product.id,
          isFeatured,
          oldPriceKzt: null,
          discountPercent: null,
        })
      }
      return
    }

    if (val === (product.old_price_kzt ?? null)) return

    const pct = val && currentPrice > 0 ? Math.round((1 - currentPrice / val) * 100) : null
    setSaveState('saving')
    promotionMutation?.mutate(
      {
        id: product.id,
        isFeatured,
        oldPriceKzt: val,
        discountPercent: pct,
      },
      {
        onSuccess: () => {
          setSaveState('saved')
          timerRef.current = setTimeout(() => setSaveState('idle'), 2000)
        },
        onError: () => {
          setSaveState('error')
          timerRef.current = setTimeout(() => setSaveState('idle'), 3000)
        },
      }
    )
  }

  const handleClearDiscount = (e) => {
    e.stopPropagation()
    setOldPriceDraft('')
    promotionMutation?.mutate({
      id: product.id,
      isFeatured,
      oldPriceKzt: null,
      discountPercent: null,
    })
  }

  const stateColor = {
    idle: 'var(--text-dim)',
    saving: '#38BDF8',
    saved: '#10B981',
    error: '#F87171',
  }
  const stateLabel = { idle: null, saving: p.saving, saved: `✓ ${p.saved}`, error: p.saveError }
  const borderColor = {
    idle: 'var(--glass-border)',
    saving: 'rgba(56,189,248,0.4)',
    saved: 'rgba(16,185,129,0.4)',
    error: 'rgba(248,113,113,0.4)',
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        background: 'var(--glass-subtle)',
        border: '1px solid var(--line-soft)',
        borderRadius: 14,
        padding: 14,
      }}
    >
      {/* 1. Featured Toggle */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <SparklesIcon
            size={20}
            color={isFeatured ? '#F59E0B' : 'var(--text-dim)'}
            style={{ transition: 'color 0.2s' }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {p.featuredLabel}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
              {p.featuredHint}
            </div>
          </div>
        </div>

        <div
          role="switch"
          aria-checked={isFeatured}
          onClick={handleToggleFeatured}
          style={{
            width: 52,
            height: 30,
            borderRadius: 15,
            cursor: 'pointer',
            background: isFeatured ? '#F59E0B' : 'var(--glass-border)',
            position: 'relative',
            transition: 'background 0.25s',
            flexShrink: 0,
            opacity: promotionMutation?.isPending ? 0.7 : 1,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 3,
              left: isFeatured ? 25 : 3,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--text-inverse)',
              transition: 'left 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
            }}
          />
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--line-soft)' }} />

      {/* 2. Promotion & Strikethrough Price */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <VerifiedBadgeIcon size={17} color={calculatedPct ? '#EF4444' : 'var(--text-dim)'} />
            <label style={{ fontSize: 12, color: 'var(--text-sub)', fontWeight: 600 }}>
              {p.oldPriceLabel}
            </label>
            {calculatedPct && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: 'rgba(239,68,68,0.14)',
                  color: '#EF4444',
                  border: '1px solid rgba(239,68,68,0.25)',
                }}
              >
                -{calculatedPct}%
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {stateLabel[saveState] && (
              <span style={{ fontSize: 11, color: stateColor[saveState], fontWeight: 600 }}>
                {stateLabel[saveState]}
              </span>
            )}
            {product.old_price_kzt && (
              <button
                type="button"
                onClick={handleClearDiscount}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 11,
                  color: '#EF4444',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {p.clearDiscount}
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <input
            type="number"
            inputMode="numeric"
            placeholder={currentPrice > 0 ? String(Math.round(currentPrice * 1.25)) : ''}
            value={oldPriceDraft}
            onChange={(e) => setOldPriceDraft(e.target.value)}
            onBlur={handleOldPriceBlur}
            style={{
              flex: 1,
              fontSize: 17,
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              padding: '9px 14px',
              borderRadius: '10px 0 0 10px',
              background: 'var(--input-bg)',
              border: `1px solid ${borderColor[saveState]}`,
              borderRight: 'none',
              color: 'var(--text)',
              outline: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'textfield',
              margin: 0,
              transition: 'border-color 0.2s',
            }}
          />
          <div
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '0 10px 10px 0',
              padding: '0 14px',
              display: 'flex',
              alignItems: 'center',
              color: '#EF4444',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            ₸
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Readonly Block ─────────────────────────────────────────────────
function ReadonlyBlock({ product, p, storeSlug }) {
  const gp = product.global_products
  if (!gp) return null

  return (
    <div
      style={{
        background: 'var(--glass-subtle)',
        borderRadius: 12,
        padding: 14,
        border: '1px solid var(--line-soft)',
        marginTop: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 14 }}>
        <div
          className="catalog-img-box"
          style={{
            width: 64,
            height: 64,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {gp.image_url ? (
            <img
              src={getImageUrl(gp.image_url)}
              alt=""
              className="product-img-blend"
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
            />
          ) : (
            <InventoryIcon size={28} color="var(--text-dim)" />
          )}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            justifyContent: 'center',
          }}
        >
          {gp.brand && (
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 6 }}>
                {p.brandLabel}:
              </span>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{gp.brand}</span>
            </div>
          )}
          {gp.category && (
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 6 }}>
                {p.categoryLabel}:
              </span>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{gp.category}</span>
            </div>
          )}
          {gp.quantity && (
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 6 }}>
                {p.quantityLabel}:
              </span>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{gp.quantity}</span>
            </div>
          )}
        </div>
      </div>

      {storeSlug && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--line-soft)', paddingTop: 10 }}>
          <a
            href={buildProductPath(storeSlug, product.ean)}
            target="_blank"
            rel="noopener noreferrer"
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
            {p.openCard}
          </a>
        </div>
      )}
    </div>
  )
}

// ── Product card (memoized — re-renders only when product/expanded/search changes) ──
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
              } catch (e) {
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
                productId={product.id}
                initialPrice={product.price_kzt}
                p={tr}
                priceMutation={priceMutation}
              />
              <StockToggle product={product} label={tr.stockLabel} stockMutation={stockMutation} />
              <ShoppingRecommendationToggle
                product={product}
                label={tr.shoppingRecommendationLabel}
                recommendationMutation={recommendationMutation}
              />
              <PromotionSection product={product} p={tr} promotionMutation={promotionMutation} />
              <ReadonlyBlock product={product} p={tr} storeSlug={storeSlug} />

              {/* Delete button */}
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
    prev.storeSlug === next.storeSlug
)

// ── Grid card ──────────────────────────────────────────────────────
function GridCard({ product, tr, onEdit }) {
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

// ── Edit bottom sheet (grid mode) ─────────────────────────────────
function EditBottomSheet({
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
          />
          <StockToggle product={product} label={tr.stockLabel} stockMutation={stockMutation} />
          <ShoppingRecommendationToggle
            product={product}
            label={tr.shoppingRecommendationLabel}
            recommendationMutation={recommendationMutation}
          />
          <PromotionSection product={product} p={tr} promotionMutation={promotionMutation} />

          {/* Delete button */}
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
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Confirm delete modal ────────────────────────────────────
function ConfirmDeleteModal({ product, tr, deleteMutation, onClose }) {
  if (!product) return null
  const name = displayName(product)
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9995,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'linear-gradient(180deg, #1a1c33 0%, #111320 100%)',
          borderRadius: 20,
          padding: '24px 20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(239,68,68,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <TrashIcon size={22} color="#F87171" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {tr.deleteProduct}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
              {tr.deleteHint}
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 13,
            color: 'var(--text-sub)',
            background: 'var(--glass-subtle)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 20,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 12,
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-bg)',
              color: 'var(--text-sub)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            {tr.deleteCancel}
          </button>
          <button
            onClick={() => deleteMutation.mutate({ id: product.id })}
            disabled={deleteMutation.isPending}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 12,
              border: 'none',
              background: deleteMutation.isPending ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.85)',
              color: 'var(--text-inverse)',
              fontSize: 14,
              fontWeight: 700,
              cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            {deleteMutation.isPending ? '...' : tr.deleteConfirm}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Main screen ────────────────────────────────────────────────────
export default function RetailProductsScreen() {
  const { t } = useI18n()
  const { storeId, currentStore } = useStore()
  const queryClient = useQueryClient()
  const p = useMemo(
    () => ({
      searchPlaceholder: t('retail.products.searchPlaceholder'),
      viewList: t('retail.products.viewList'),
      viewGrid: t('retail.products.viewGrid'),
      countLabel: (n) => t('retail.products.countLabel', { count: n }),
      scanFound: t('retail.products.scanFound'),
      scanNotFound: t('retail.products.scanNotFound'),
      allLoaded: (n) => t('retail.products.allLoaded', { count: n }),
      notFound: t('retail.products.notFound'),
      emptyCatalog: t('retail.products.emptyCatalog'),
      notFoundSub: t('retail.products.notFoundSub'),
      loadError: t('retail.products.loadError'),
      retry: t('retail.products.retry'),
      noPrice: t('retail.products.noPrice'),
      stockLabel: t('retail.products.stockLabel'),
      shoppingRecommendationLabel: t('retail.products.shoppingRecommendationLabel'),
      recommendationLimitTitle: t('retail.products.recommendationLimitTitle'),
      recommendationLimitMessage: t('retail.products.recommendationLimitMessage'),
      recommendationSaveFailed: t('retail.products.recommendationSaveFailed'),
      deleteProduct: t('retail.products.deleteProduct'),
      saving: t('retail.products.saving'),
      saved: t('retail.products.saved'),
      saveError: t('retail.products.saveError'),
      priceLabel: t('retail.products.priceLabel'),
      inStock: t('retail.products.inStock'),
      lowStock: t('retail.products.lowStock'),
      outOfStock: t('retail.products.outOfStock'),
      brandLabel: t('retail.products.brandLabel'),
      categoryLabel: t('retail.products.categoryLabel'),
      quantityLabel: t('retail.products.quantityLabel'),
      openCard: t('retail.products.openCard'),
      deleteHint: t('retail.products.deleteHint'),
      deleteCancel: t('retail.products.deleteCancel'),
      deleteConfirm: t('retail.products.deleteConfirm'),
      featuredLabel: t('retail.products.featuredLabel'),
      featuredHint: t('retail.products.featuredHint'),
      badgeFeatured: t('retail.products.badgeFeatured'),
      promotionSection: t('retail.products.promotionSection'),
      oldPriceLabel: t('retail.products.oldPriceLabel'),
      discountPercentLabel: t('retail.products.discountPercentLabel'),
      clearDiscount: t('retail.products.clearDiscount'),
    }),
    [t]
  )
  const navigate = useNavigate()
  const storeSlug = currentStore?.slug ?? null

  const [viewMode, setViewMode] = useState(() => localStorage.getItem('retail_view_mode') || 'list')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [gridSelectedId, setGridSelectedId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [unrecognizedEan, setUnrecognizedEan] = useState(null)

  const scannerOpenRef = useRef(scannerOpen)
  const confirmDeleteIdRef = useRef(confirmDeleteId)
  const gridSelectedIdRef = useRef(gridSelectedId)
  const expandedIdRef = useRef(expandedId)
  const viewModeRef = useRef(viewMode)
  const unrecognizedEanRef = useRef(unrecognizedEan)

  useEffect(() => {
    scannerOpenRef.current = scannerOpen
    confirmDeleteIdRef.current = confirmDeleteId
    gridSelectedIdRef.current = gridSelectedId
    expandedIdRef.current = expandedId
    viewModeRef.current = viewMode
    unrecognizedEanRef.current = unrecognizedEan
  })

  useEffect(() => {
    const handlePopState = () => {
      if (scannerOpenRef.current) {
        setScannerOpen(false)
      } else if (unrecognizedEanRef.current) {
        setUnrecognizedEan(null)
      } else if (confirmDeleteIdRef.current) {
        setConfirmDeleteId(null)
      } else if (gridSelectedIdRef.current) {
        setGridSelectedId(null)
      } else if (expandedIdRef.current) {
        setExpandedId(null)
      } else if (viewModeRef.current !== 'list') {
        const next = 'list'
        setViewMode(next)
        localStorage.setItem('retail_view_mode', next)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  const [scanToast, setScanToast] = useState(null) // { type: 'found'|'not_found', label }
  const toastTimer = useRef(null)
  const searchTimer = useRef(null)
  const [scrollParent, setScrollParent] = useState(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScrollParent(document.querySelector('.screen'))
  }, [])

  // Debounce search 350ms
  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  // ── Infinite Query ───────────────────────────────────────
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['retail-products', storeId, debouncedSearch],
      queryFn: ({ pageParam = 0 }) =>
        getStoreCatalogProducts(storeId, { page: pageParam, search: debouncedSearch }),
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => {
        const loaded = allPages.reduce((acc, p) => acc + p.products.length, 0)
        return loaded < lastPage.total ? allPages.length : undefined
      },
      enabled: Boolean(storeId),
      staleTime: 30_000,
      gcTime: 10 * 60_000,
    })

  const products = useMemo(() => data?.pages.flatMap((p) => p.products) ?? [], [data])
  const totalCount = data?.pages[0]?.total ?? 0

  // Optimistic updater for infinite query pages
  const patchPages = useCallback(
    (patcher) => {
      queryClient.setQueriesData({ queryKey: ['retail-products', storeId] }, (old) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((pg) => ({ ...pg, products: pg.products.map(patcher) })),
        }
      })
    },
    [queryClient, storeId]
  )

  // ── Stock mutation (optimistic) ──────────────────────────────
  const stockMutation = useMutation({
    mutationFn: ({ id, status }) => updateProductStock(id, storeId, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['retail-products', storeId] })
      const prev = queryClient.getQueriesData({ queryKey: ['retail-products', storeId] })
      patchPages((item) => (item.id === id ? { ...item, stock_status: status } : item))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => queryClient.setQueryData(key, val))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-products', storeId] })
    },
  })

  const recommendationMutation = useMutation({
    mutationFn: ({ id, isRecommended }) =>
      updateProductShoppingRecommendation(id, storeId, isRecommended),
    onMutate: async ({ id, isRecommended }) => {
      await queryClient.cancelQueries({ queryKey: ['retail-products', storeId] })
      const prev = queryClient.getQueriesData({ queryKey: ['retail-products', storeId] })
      patchPages((item) =>
        item.id === id ? { ...item, is_shopping_recommended: isRecommended } : item
      )
      return { prev }
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => queryClient.setQueryData(key, val))
      if (error?.message?.includes('Maximum 10 shopping recommendation candidates per store')) {
        clearTimeout(toastTimer.current)
        setScanToast({
          type: 'recommendation_limit',
          label: p.recommendationLimitMessage,
        })
        toastTimer.current = setTimeout(() => setScanToast(null), 4000)
      } else {
        clearTimeout(toastTimer.current)
        setScanToast({ type: 'recommendation_error', label: p.recommendationSaveFailed })
        toastTimer.current = setTimeout(() => setScanToast(null), 4000)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-products', storeId] })
    },
  })

  // ── Price mutation (optimistic + rollback + invalidate) ───────────
  const priceMutation = useMutation({
    mutationFn: ({ id, price }) => updateProductPrice(id, storeId, price),
    onMutate: async ({ id, price }) => {
      await queryClient.cancelQueries({ queryKey: ['retail-products', storeId] })
      const prev = queryClient.getQueriesData({ queryKey: ['retail-products', storeId] })
      patchPages((item) => (item.id === id ? { ...item, price_kzt: price } : item))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => queryClient.setQueryData(key, val))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-products', storeId] })
    },
  })

  // ── Promotion mutation (optimistic + rollback + invalidate) ───────
  const promotionMutation = useMutation({
    mutationFn: ({ id, isFeatured, oldPriceKzt, discountPercent }) =>
      updateProductPromotion(id, storeId, {
        is_featured: isFeatured,
        old_price_kzt: oldPriceKzt,
        discount_percent: discountPercent,
      }),
    onMutate: async ({ id, isFeatured, oldPriceKzt, discountPercent }) => {
      await queryClient.cancelQueries({ queryKey: ['retail-products', storeId] })
      const prev = queryClient.getQueriesData({ queryKey: ['retail-products', storeId] })
      patchPages((item) =>
        item.id === id
          ? {
              ...item,
              is_featured: isFeatured,
              old_price_kzt: oldPriceKzt,
              discount_percent: discountPercent,
            }
          : item
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => queryClient.setQueryData(key, val))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-products', storeId] })
    },
  })

  // ── Delete mutation (optimistic: remove from list) ─────────────
  const deleteMutation = useMutation({
    mutationFn: ({ id }) => deleteStoreProduct(id, storeId),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['retail-products', storeId] })
      const prev = queryClient.getQueriesData({ queryKey: ['retail-products', storeId] })
      queryClient.setQueriesData({ queryKey: ['retail-products', storeId] }, (old) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((pg) => ({
            ...pg,
            products: pg.products.filter((item) => item.id !== id),
            total: Math.max(0, (pg.total ?? 0) - 1),
          })),
        }
      })
      setConfirmDeleteId(null)
      setExpandedId(null)
      setGridSelectedId(null)
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => queryClient.setQueryData(key, val))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-products', storeId] })
    },
  })

  // ── Scanner handler ────────────────────────────────────────────
  const handleScan = useCallback(
    (ean) => {
      setScannerOpen(false)
      clearTimeout(toastTimer.current)
      const found = products.find((item) => item.ean === ean)
      if (found) {
        setSearch('')
        try {
          window.history.pushState(
            { _retailInternal: true },
            '',
            window.location.pathname + window.location.search
          )
        } catch (e) {
          /* noop */
        }
        setExpandedId(found.id)
        setScanToast({
          type: 'found',
          label: found.local_name || found.global_products?.name || ean,
        })
        toastTimer.current = setTimeout(() => setScanToast(null), 3000)
      } else {
        try {
          window.history.pushState(
            { _retailInternal: true },
            '',
            window.location.pathname + window.location.search
          )
        } catch (e) {
          /* noop */
        }
        setUnrecognizedEan(ean)
      }
    },
    [products]
  )

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // With server-side search, products is already filtered
  const filtered = products

  const gridPairs = useMemo(() => {
    const pairs = []
    for (let i = 0; i < filtered.length; i += 2) {
      pairs.push({ first: filtered[i], second: filtered[i + 1] ?? null })
    }
    return pairs
  }, [filtered])

  const gridSelectedProduct = useMemo(
    () => (gridSelectedId ? (filtered.find((pr) => pr.id === gridSelectedId) ?? null) : null),
    [filtered, gridSelectedId]
  )

  const toggleViewMode = useCallback(() => {
    const next = viewMode === 'list' ? 'grid' : 'list'
    if (next !== 'list') {
      try {
        window.history.pushState(
          { _retailInternal: true },
          '',
          window.location.pathname + window.location.search
        )
      } catch (e) {
        /* noop */
      }
    }
    setViewMode(next)
    localStorage.setItem('retail_view_mode', next)
  }, [viewMode])

  // ── Inline states (error / empty) ──────────────────────────────
  const renderEmpty = () => (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
      {search ? (
        <ExploreIcon size={36} style={{ display: 'block', marginBottom: 10, opacity: 0.4 }} />
      ) : (
        <InventoryIcon size={36} style={{ display: 'block', marginBottom: 10, opacity: 0.4 }} />
      )}
      <div style={{ fontSize: 14 }}>{search ? p.notFound : p.emptyCatalog}</div>
      {search && <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>{p.notFoundSub}</div>}
      {!search && (
        <button
          onClick={() => navigate(`/retail/${storeSlug}/import`)}
          style={{
            marginTop: 16,
            padding: '12px 24px',
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: 'var(--text-inverse)',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 8px 24px rgba(16,185,129,0.25)',
          }}
        >
          <UploadFileIcon size={20} />
          {t('retail.nav.import')}
        </button>
      )}
    </div>
  )

  const renderError = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        padding: '32px 20px',
        textAlign: 'center',
      }}
    >
      <AlertTriangleIcon size={36} color="#F87171" style={{ opacity: 0.7 }} />
      <div style={{ fontSize: 14, color: '#F87171' }}>{p.loadError}</div>
      <button
        onClick={() => refetch()}
        style={{
          marginTop: 4,
          fontSize: 13,
          color: '#38BDF8',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        {p.retry}
      </button>
    </div>
  )

  return (
    <div style={{ paddingBottom: 8 }}>
      {/* ── Sticky Search Bar ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(8,12,24,0.96)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(56,189,248,0.1)',
        }}
      >
        {/* Row 1: search + scanner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 8px' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: 'var(--input-bg)',
              borderRadius: 14,
              padding: '9px 14px',
              border: '1px solid var(--input-border)',
              gap: 10,
            }}
          >
            <ExploreIcon size={20} color="var(--text-dim)" style={{ flexShrink: 0 }} />
            <input
              type="search"
              placeholder={p.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                fontSize: 15,
                outline: 'none',
                fontFamily: 'var(--font-body)',
                minWidth: 0,
              }}
            />
            {search && (
              <CloseIcon
                size={18}
                color="var(--text-dim)"
                onClick={() => setSearch('')}
                style={{ cursor: 'pointer', flexShrink: 0 }}
              />
            )}
          </div>

          {/* Scanner */}
          <button
            onClick={() => {
              try {
                window.history.pushState(
                  { _retailInternal: true },
                  '',
                  window.location.pathname + window.location.search
                )
              } catch (e) {
                /* noop */
              }
              setScannerOpen(true)
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: 'none',
              cursor: 'pointer',
              background: 'rgba(56,189,248,0.12)',
              color: '#38BDF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.2s',
            }}
          >
            <BarcodeScannerIcon size={22} />
          </button>

          {/* Import */}
          <button
            onClick={() => navigate(`/retail/${storeSlug}/import`)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: 'none',
              cursor: 'pointer',
              background: 'rgba(16,185,129,0.12)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.2s',
            }}
          >
            <UploadFileIcon size={22} />
          </button>

          {/* EAN Recovery */}
          <button
            onClick={() => navigate(`/retail/${storeSlug}/ean-recovery`)}
            title="EAN Recovery — fix products without barcode"
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: '1px solid rgba(251,146,60,0.3)',
              cursor: 'pointer',
              background: 'rgba(251,146,60,0.12)',
              color: '#FB923C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <BarcodeScannerIcon size={22} />
          </button>
        </div>

        {/* Row 2: view toggle pills + count */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px 10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              background: 'var(--glass-bg)',
              borderRadius: 10,
              padding: 3,
              gap: 2,
            }}
          >
            <button
              onClick={() => viewMode !== 'list' && toggleViewMode()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: viewMode === 'list' ? 'rgba(56,189,248,0.14)' : 'transparent',
                border: `1px solid ${viewMode === 'list' ? 'rgba(56,189,248,0.25)' : 'transparent'}`,
                borderRadius: 8,
                padding: '4px 11px',
                cursor: 'pointer',
                color: viewMode === 'list' ? '#38BDF8' : 'var(--text-dim)',
                fontSize: 12,
                fontWeight: 600,
                transition: 'all 0.2s',
                fontFamily: 'var(--font-body)',
              }}
            >
              <InventoryIcon size={15} />
              {p.viewList}
            </button>
            <button
              onClick={() => viewMode !== 'grid' && toggleViewMode()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: viewMode === 'grid' ? 'rgba(56,189,248,0.14)' : 'transparent',
                border: `1px solid ${viewMode === 'grid' ? 'rgba(56,189,248,0.25)' : 'transparent'}`,
                borderRadius: 8,
                padding: '4px 11px',
                cursor: 'pointer',
                color: viewMode === 'grid' ? '#38BDF8' : 'var(--text-dim)',
                fontSize: 12,
                fontWeight: 600,
                transition: 'all 0.2s',
                fontFamily: 'var(--font-body)',
              }}
            >
              <StorefrontIcon size={15} />
              {p.viewGrid}
            </button>
          </div>

          {!isLoading && !isError && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {debouncedSearch ? `${filtered.length} / ${totalCount}` : p.countLabel(totalCount)}
            </div>
          )}
        </div>
      </div>

      {/* ── Scan toast ── */}
      {scanToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 90,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 150,
            pointerEvents: 'none',
            background:
              scanToast.type === 'found' ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.9)',
            backdropFilter: 'blur(12px)',
            borderRadius: 14,
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            maxWidth: 'calc(100vw - 32px)',
          }}
        >
          {scanToast.type === 'found' ? (
            <CheckCircleIcon size={20} color="var(--text-inverse)" style={{ flexShrink: 0 }} />
          ) : (
            <ExploreIcon size={20} color="var(--text-inverse)" style={{ flexShrink: 0 }} />
          )}
          <div style={{ color: 'var(--text)' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {scanToast.type === 'found'
                ? p.scanFound
                : scanToast.type === 'recommendation_limit'
                  ? p.recommendationLimitTitle
                  : scanToast.type === 'recommendation_error'
                    ? p.recommendationSaveFailed
                    : p.scanNotFound}
            </div>
            <div
              style={{
                fontSize: 11,
                opacity: 0.85,
                marginTop: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 220,
              }}
            >
              {scanToast.label}
            </div>
          </div>
        </div>
      )}

      {/* ── List ── */}
      {isError ? (
        <div style={{ padding: '0 16px' }}>{renderError()}</div>
      ) : isLoading ? (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        renderEmpty()
      ) : viewMode === 'list' ? (
        <Virtuoso
          customScrollParent={scrollParent}
          data={filtered}
          increaseViewportBy={{ top: 600, bottom: 600 }}
          endReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage()
          }}
          itemContent={(_, product) => (
            <div style={{ padding: '5px 16px' }}>
              <ProductCard
                product={product}
                isExpanded={expandedId === product.id}
                search={search}
                tr={p}
                storeSlug={storeSlug}
                priceMutation={priceMutation}
                stockMutation={stockMutation}
                recommendationMutation={recommendationMutation}
                promotionMutation={promotionMutation}
                setExpandedId={setExpandedId}
                onDeleteRequest={(id) => {
                  try {
                    window.history.pushState(
                      { _retailInternal: true },
                      '',
                      window.location.pathname + window.location.search
                    )
                  } catch (e) {
                    /* noop */
                  }
                  setConfirmDeleteId(id)
                }}
              />
            </div>
          )}
          components={{
            Footer: () => (
              <div style={{ padding: '4px 16px 12px' }}>
                {isFetchingNextPage && <SkeletonRow />}
                {!hasNextPage && filtered.length > 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: 12,
                      color: 'var(--text-dim)',
                      padding: '12px 0',
                    }}
                  >
                    {p.allLoaded(totalCount)}
                  </div>
                )}
              </div>
            ),
          }}
        />
      ) : (
        <>
          <Virtuoso
            customScrollParent={scrollParent}
            data={gridPairs}
            increaseViewportBy={{ top: 800, bottom: 800 }}
            endReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage()
            }}
            itemContent={(_, pair) => (
              <div style={{ display: 'flex', gap: 10, padding: '5px 16px', alignItems: 'stretch' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <GridCard
                    product={pair.first}
                    tr={p}
                    onEdit={(prod) => {
                      try {
                        window.history.pushState(
                          { _retailInternal: true },
                          '',
                          window.location.pathname + window.location.search
                        )
                      } catch (e) {
                        /* noop */
                      }
                      setGridSelectedId(prod.id)
                    }}
                  />
                </div>
                {pair.second ? (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <GridCard
                      product={pair.second}
                      tr={p}
                      onEdit={(prod) => {
                        try {
                          window.history.pushState(
                            { _retailInternal: true },
                            '',
                            window.location.pathname + window.location.search
                          )
                        } catch (e) {
                          /* noop */
                        }
                        setGridSelectedId(prod.id)
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ flex: 1 }} />
                )}
              </div>
            )}
            components={{
              Footer: () => (
                <div style={{ padding: '4px 16px 12px' }}>
                  {isFetchingNextPage && (
                    <div style={{ display: 'flex', gap: 10, padding: '0 16px' }}>
                      <div style={{ flex: 1 }}>
                        <SkeletonRow />
                      </div>
                      <div style={{ flex: 1 }}>
                        <SkeletonRow />
                      </div>
                    </div>
                  )}
                  {!hasNextPage && filtered.length > 0 && (
                    <div
                      style={{
                        textAlign: 'center',
                        fontSize: 12,
                        color: 'var(--text-dim)',
                        padding: '12px 0',
                      }}
                    >
                      {p.allLoaded(totalCount)}
                    </div>
                  )}
                </div>
              ),
            }}
          />
          <EditBottomSheet
            product={gridSelectedProduct}
            tr={p}
            storeSlug={storeSlug}
            priceMutation={priceMutation}
            stockMutation={stockMutation}
            recommendationMutation={recommendationMutation}
            promotionMutation={promotionMutation}
            onClose={() => setGridSelectedId(null)}
            onDeleteRequest={(id) => {
              try {
                window.history.pushState(
                  { _retailInternal: true },
                  '',
                  window.location.pathname + window.location.search
                )
              } catch (e) {
                /* noop */
              }
              setConfirmDeleteId(id)
            }}
          />
        </>
      )}

      {/* ── Confirm delete modal ── */}
      <ConfirmDeleteModal
        product={filtered.find((pr) => pr.id === confirmDeleteId) ?? null}
        tr={p}
        deleteMutation={deleteMutation}
        onClose={() => setConfirmDeleteId(null)}
      />

      {/* ── Scanner modal ── */}
      {scannerOpen && (
        <RetailScannerModal onScan={handleScan} onClose={() => setScannerOpen(false)} />
      )}

      {/* ── Add Scanned Product Modal ── */}
      {unrecognizedEan && (
        <AddScannedProductModal
          ean={unrecognizedEan}
          storeId={storeId}
          onClose={() => setUnrecognizedEan(null)}
          onAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['retail-products', storeId] })
            setScanToast({
              type: 'found',
              label: t('retail.products.productAdded'),
            })
            toastTimer.current = setTimeout(() => setScanToast(null), 3000)
          }}
        />
      )}
    </div>
  )
}
