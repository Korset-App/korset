import { useState, useMemo, useRef, useEffect } from 'react'
import { SparklesIcon, VerifiedBadgeIcon } from '../../icons/index.js'

export default function PromotionSection({ product, p, promotionMutation, managed }) {
  const isFeatured = Boolean(product.is_featured)
  const currentPrice = Number(product.price_kzt) || 0
  const [oldPriceDraft, setOldPriceDraft] = useState(product.old_price_kzt ?? '')
  const [saveState, setSaveState] = useState('idle')
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saveState === 'idle') setOldPriceDraft(product.old_price_kzt ?? '')
  }, [product.old_price_kzt, saveState])

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
      managed,
    })
  }

  const handleOldPriceBlur = () => {
    if (managed) return
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
    if (managed) return
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
            {product.old_price_kzt && !managed && (
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
            readOnly={managed}
            aria-readonly={managed}
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
