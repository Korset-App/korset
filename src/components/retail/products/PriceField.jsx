import { useState, useRef, useCallback, useEffect } from 'react'

export default function PriceField({ product, p, priceMutation, promotionMutation, managed }) {
  const productId = product.id
  const initialPrice = product.price_kzt
  const pending = priceMutation.isPending || promotionMutation.isPending
  const [draft, setDraft] = useState(initialPrice ?? '')
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saveState === 'idle') setDraft(initialPrice ?? '')
  }, [initialPrice]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBlur = useCallback(() => {
    if (managed || pending) return
    const val = Number(draft)
    if (String(draft).trim() === '' || !Number.isFinite(val) || val < 0) {
      setDraft(initialPrice ?? '')
      return
    }
    if (val === initialPrice) return
    clearTimeout(timerRef.current)
    setSaveState('saving')
    priceMutation.mutate(
      { id: productId, price: val, product },
      {
        onSuccess: () => {
          setSaveState('saved')
          timerRef.current = setTimeout(() => setSaveState('idle'), 2000)
        },
        onError: () => {
          setDraft(initialPrice ?? '')
          setSaveState('error')
        },
      }
    )
  }, [draft, initialPrice, productId, product, priceMutation, managed, pending])

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
            role={saveState === 'error' ? 'alert' : 'status'}
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
      <div style={{ display: 'flex', alignItems: 'stretch', minWidth: 0 }}>
        <input
          type="number"
          inputMode="numeric"
          value={draft}
          aria-label={p.priceLabel}
          readOnly={managed || pending}
          aria-readonly={managed || pending}
          onChange={(e) => {
            clearTimeout(timerRef.current)
            setSaveState('idle')
            setDraft(e.target.value)
          }}
          onBlur={handleBlur}
          style={{
            flex: 1,
            minWidth: 0,
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
