import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useI18n } from '../utils/i18n.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { getImageUrl } from '../utils/imageUrl.js'
import {
  getStoreCatalogProducts,
  updateProductPrice,
  updateProductStock,
  updateProductShelf,
} from '../utils/retailAnalytics.js'
import RetailScannerModal from '../components/RetailScannerModal.jsx'

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
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
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
    idle: 'rgba(255,255,255,0.1)',
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
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${borderColor[saveState]}`,
            borderRight: 'none',
            color: '#fff',
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
      <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{label}</span>
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
          background: on ? '#10B981' : 'rgba(255,255,255,0.1)',
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
            background: '#fff',
            transition: 'left 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
          }}
        />
      </div>
    </div>
  )
}

// ── Shelf field with save-on-blur ──────────────────────────────────
function ShelfField({ productId, initialShelf, p, shelfMutation }) {
  const [draft, setDraft] = useState(initialShelf ?? '')
  const [saveState, setSaveState] = useState('idle')
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  useEffect(() => {
    if (saveState === 'idle') setDraft(initialShelf ?? '')
  }, [initialShelf]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBlur = useCallback(() => {
    const val = draft.trim()
    if (val === (initialShelf || '')) return
    setSaveState('saving')
    shelfMutation.mutate(
      { id: productId, shelfZone: val },
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
  }, [draft, initialShelf, productId, shelfMutation])

  const stateColor = {
    idle: 'var(--text-dim)',
    saving: '#38BDF8',
    saved: '#10B981',
    error: '#F87171',
  }
  const stateLabel = { idle: null, saving: p.saving, saved: `✓ ${p.saved}`, error: p.saveError }
  const borderColor = {
    idle: 'rgba(255,255,255,0.1)',
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
          {p.shelfLabel}
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
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        placeholder="Например: Стеллаж 4, Полка 2"
        style={{
          width: '100%',
          fontSize: 15,
          fontFamily: 'var(--font-body)',
          padding: '11px 16px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${borderColor[saveState]}`,
          color: '#fff',
          outline: 'none',
          margin: 0,
          transition: 'border-color 0.2s',
        }}
      />
    </div>
  )
}

// ── Readonly Block ─────────────────────────────────────────────────
function ReadonlyBlock({ product, p, lang }) {
  const gp = product.global_products
  if (!gp) return null

  const ingredients = lang === 'kz' ? gp.ingredients_kz || gp.ingredients_raw : gp.ingredients_raw

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 14,
        border: '1px solid rgba(255,255,255,0.05)',
        marginTop: 8,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 12,
        }}
      >
        Global Data
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
            padding: 4,
          }}
        >
          {gp.image_url ? (
            <img
              src={getImageUrl(gp.image_url)}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 28, color: 'var(--text-dim)' }}
            >
              inventory_2
            </span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {gp.category && (
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 6 }}>
                {p.categoryLabel}:
              </span>
              <span style={{ fontSize: 13, color: '#fff' }}>{gp.category}</span>
            </div>
          )}
          {gp.brand && (
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 6 }}>
                {p.brandLabel}:
              </span>
              <span style={{ fontSize: 13, color: '#fff' }}>{gp.brand}</span>
            </div>
          )}
          {gp.quantity && (
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 6 }}>
                {p.quantityLabel}:
              </span>
              <span style={{ fontSize: 13, color: '#fff' }}>{gp.quantity}</span>
            </div>
          )}
        </div>
      </div>

      {ingredients && (
        <div
          style={{ marginTop: 12, borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: 10 }}
        >
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
            {p.ingredientsLabel}:
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-sub)',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {ingredients}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main screen ────────────────────────────────────────────────────
export default function RetailProductsScreen() {
  const { t, lang } = useI18n()
  const { storeId } = useStore()
  const queryClient = useQueryClient()
  const p = t.retail.products

  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanToast, setScanToast] = useState(null) // { type: 'found'|'not_found', label }
  const toastTimer = useRef(null)

  // ── Query ──────────────────────────────────────────────────────
  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['retail-products', storeId],
    queryFn: () => getStoreCatalogProducts(storeId),
    enabled: Boolean(storeId),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  // ── Stock mutation (optimistic) ────────────────────────────────
  const stockMutation = useMutation({
    mutationFn: ({ id, status }) => updateProductStock(id, storeId, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['retail-products', storeId] })
      const prev = queryClient.getQueryData(['retail-products', storeId])
      queryClient.setQueryData(['retail-products', storeId], (old) =>
        old?.map((item) => (item.id === id ? { ...item, stock_status: status } : item))
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['retail-products', storeId], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-products', storeId] })
    },
  })

  // ── Price mutation (optimistic + rollback + invalidate) ─────────
  const priceMutation = useMutation({
    mutationFn: ({ id, price }) => updateProductPrice(id, storeId, price),
    onMutate: async ({ id, price }) => {
      await queryClient.cancelQueries({ queryKey: ['retail-products', storeId] })
      const prev = queryClient.getQueryData(['retail-products', storeId])
      queryClient.setQueryData(['retail-products', storeId], (old) =>
        old?.map((item) => (item.id === id ? { ...item, price_kzt: price } : item))
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['retail-products', storeId], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-products', storeId] })
    },
  })

  // ── Shelf mutation (optimistic + rollback + invalidate) ─────────
  const shelfMutation = useMutation({
    mutationFn: ({ id, shelfZone }) => updateProductShelf(id, storeId, shelfZone),
    onMutate: async ({ id, shelfZone }) => {
      await queryClient.cancelQueries({ queryKey: ['retail-products', storeId] })
      const prev = queryClient.getQueryData(['retail-products', storeId])
      queryClient.setQueryData(['retail-products', storeId], (old) =>
        old?.map((item) => (item.id === id ? { ...item, shelf_zone: shelfZone } : item))
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['retail-products', storeId], ctx.prev)
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
        setExpandedId(found.id)
        setScanToast({
          type: 'found',
          label: found.local_name || found.global_products?.name || ean,
        })
      } else {
        setScanToast({ type: 'not_found', label: ean })
      }
      toastTimer.current = setTimeout(() => setScanToast(null), 3000)
    },
    [products]
  )

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // ── Filter ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter(
      (item) =>
        displayName(item).toLowerCase().includes(q) ||
        (displayBrand(item) || '').toLowerCase().includes(q) ||
        item.ean.includes(q)
    )
  }, [products, search])

  // ── Render states ─────────────────────────────────────────────
  const renderBody = () => {
    if (isError) {
      return (
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
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 36, color: '#F87171', opacity: 0.7 }}
          >
            error_outline
          </span>
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
    }

    if (isLoading) {
      return Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
    }

    if (filtered.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 36, display: 'block', marginBottom: 10, opacity: 0.4 }}
          >
            {search ? 'search_off' : 'inventory_2'}
          </span>
          <div style={{ fontSize: 14 }}>{p.notFound}</div>
          {search && (
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>{p.notFoundSub}</div>
          )}
        </div>
      )
    }

    return filtered.map((product) => {
      const isExpanded = expandedId === product.id
      const inStock = isInStock(product)
      const imgUrl = displayImage(product)
      const name = displayName(product)
      const brand = displayBrand(product)

      return (
        <div
          key={product.id}
          style={{
            background: isExpanded ? 'rgba(56,189,248,0.05)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isExpanded ? 'rgba(56,189,248,0.28)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 18,
            overflow: 'hidden',
            transition: 'border-color 0.25s, background 0.25s',
          }}
        >
          {/* ── Card header (tap to expand) ── */}
          <div
            onClick={() => setExpandedId((prev) => (prev === product.id ? null : product.id))}
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
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
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
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                />
              ) : (
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 22, color: 'var(--text-dim)' }}
                >
                  inventory_2
                </span>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0, opacity: inStock ? 1 : 0.55 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
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
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.18)',
                  marginTop: 2,
                  fontFamily: 'var(--font-display)',
                }}
              >
                <Highlight text={product.ean} q={search} />
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
                  color: inStock ? '#38BDF8' : 'var(--text-dim)',
                  textDecoration: inStock ? 'none' : 'line-through',
                }}
              >
                {product.price_kzt != null ? (
                  `${product.price_kzt.toLocaleString()} ₸`
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{p.noPrice}</span>
                )}
              </div>
              <StockBadge status={product.stock_status} p={p} />
            </div>

            {/* Chevron */}
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 18,
                color: 'var(--text-dim)',
                flexShrink: 0,
                transform: isExpanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.25s',
              }}
            >
              expand_more
            </span>
          </div>

          {/* ── Accordion editor ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateRows: isExpanded ? '1fr' : '0fr',
              opacity: isExpanded ? 1 : 0,
              transition: 'grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s',
              background: 'rgba(0,0,0,0.18)',
              borderTop: isExpanded ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}
          >
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}
              >
                <PriceField
                  productId={product.id}
                  initialPrice={product.price_kzt}
                  p={p}
                  priceMutation={priceMutation}
                />
                <ShelfField
                  productId={product.id}
                  initialShelf={product.shelf_zone}
                  p={p}
                  shelfMutation={shelfMutation}
                />
                <StockToggle product={product} label={p.stockLabel} stockMutation={stockMutation} />
                <ReadonlyBlock product={product} p={p} lang={lang} />
              </div>
            </div>
          </div>
        </div>
      )
    })
  }

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
          padding: '12px 16px',
          borderBottom: '1px solid rgba(56,189,248,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 14,
              padding: '9px 14px',
              border: '1px solid rgba(255,255,255,0.08)',
              gap: 10,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: 'var(--text-dim)', flexShrink: 0 }}
            >
              search
            </span>
            <input
              type="search"
              placeholder={p.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: 15,
                outline: 'none',
                fontFamily: 'var(--font-body)',
                minWidth: 0,
              }}
            />
            {search && (
              <span
                className="material-symbols-outlined"
                onClick={() => setSearch('')}
                style={{ fontSize: 18, color: 'var(--text-dim)', cursor: 'pointer', flexShrink: 0 }}
              >
                close
              </span>
            )}
          </div>

          {/* Scanner Button */}
          <button
            onClick={() => setScannerOpen(true)}
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
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              barcode_scanner
            </span>
          </button>
        </div>

        {/* Count bar */}
        {!isLoading && !isError && (
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 7, paddingLeft: 2 }}>
            {search ? `${filtered.length} / ${products.length}` : p.countLabel(products.length)}
          </div>
        )}
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
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 20, color: '#fff', flexShrink: 0 }}
          >
            {scanToast.type === 'found' ? 'check_circle' : 'search_off'}
          </span>
          <div style={{ color: '#fff' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {scanToast.type === 'found' ? p.scanFound : p.scanNotFound}
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
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {renderBody()}
      </div>

      {/* ── Scanner modal ── */}
      {scannerOpen && (
        <RetailScannerModal onScan={handleScan} onClose={() => setScannerOpen(false)} />
      )}
    </div>
  )
}
