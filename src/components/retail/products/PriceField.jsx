import { useState, useRef, useCallback, useEffect } from 'react'

export default function PriceField({ productId, initialPrice, p, priceMutation, managed }) {
  const [draft, setDraft] = useState(initialPrice ?? '')
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saveState === 'idle') setDraft(initialPrice ?? '')
  }, [initialPrice]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBlur = useCallback(() => {
    if (managed) return
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
  }, [draft, initialPrice, productId, priceMutation, managed])

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
          readOnly={managed}
          aria-readonly={managed}
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
