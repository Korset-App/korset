// TermsConsentSheet — одноразовая шторка согласия перед первым сканом.
//
// Логика:
//   - При первом открытии ScanScreen проверяется localStorage 'korset_terms_accepted'
//   - Если ключа нет — шторка открывается. Закрыть без согласия нельзя.
//   - После нажатия «Принять» сохраняется { accepted: true, at: ISO-дата }.
//
// Для ТЕСТИРОВАНИЯ (временно): кнопка «Сбросить согласие» в ProfileScreen позволяет
// вернуть шторку — она вынесена в ProfileScreen как dev-утилита.

const STORAGE_KEY = 'korset_terms_accepted'

export function isTermsAccepted() {
  try {
    return Boolean(JSON.parse(localStorage.getItem(STORAGE_KEY))?.accepted)
  } catch {
    return false
  }
}

export function resetTermsAccepted() {
  localStorage.removeItem(STORAGE_KEY)
}

function markTermsAccepted() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ accepted: true, at: new Date().toISOString() })
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/index.js'

export default function TermsConsentSheet({ open, onAccept, onNavigateTerms, onNavigatePolicy }) {
  const [checked, setChecked] = useState(false)
  const { t } = useI18n()
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const previousFocus = document.activeElement
    const dialog = dialogRef.current
    dialog?.querySelector('#consent-checkbox')?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      if (event.key !== 'Tab' || !dialog) return

      const focusable = [...dialog.querySelectorAll('input:not(:disabled), button:not(:disabled)')]
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      if (!dialog.contains(document.activeElement)) {
        event.preventDefault()
        const target = event.shiftKey ? last : first
        target.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const keepFocusInside = (event) => {
      if (!dialog?.contains(event.target)) dialog?.querySelector('#consent-checkbox')?.focus()
    }

    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('focusin', keepFocusInside, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('focusin', keepFocusInside, true)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [open])

  if (!open) return null

  const handleAccept = () => {
    if (!checked) return
    markTermsAccepted()
    onAccept()
  }

  return (
    <>
      {/* Backdrop — intentionally not clickable, forces deliberate choice */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 400,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
        }}
      />

      {/* Sheet */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 401,
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--glass-border)',
          borderRadius: '20px 20px 0 0',
          padding: '0 24px calc(96px + env(safe-area-inset-bottom))', // 96px accommodates bottom nav height
          animation: 'tcSlideUp 0.32s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 32,
            height: 4,
            borderRadius: 999,
            background: 'var(--glass-soft-border)',
            margin: '14px auto 28px',
          }}
        />

        {/* Title & Icon Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'var(--glass-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text)',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div
            id="consent-title"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            {t('scan.consent.title')}
          </div>
        </div>

        {/* Body */}
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--text-sub)',
            margin: '0 0 24px',
          }}
        >
          {t('scan.consent.bodyStart')}{' '}
          <strong style={{ color: 'var(--text)', fontWeight: 600 }}>
            {t('scan.consent.bodyEmphasis')}
          </strong>{' '}
          {t('scan.consent.bodyEnd')}
        </p>

        {/* Checkbox Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 28,
          }}
        >
          <input
            id="consent-checkbox"
            className="tc-checkbox"
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            aria-label={t('scan.consent.checkboxLabel')}
            style={{
              width: 22,
              height: 22,
              accentColor: 'var(--primary)',
              flexShrink: 0,
              marginTop: 2,
              marginLeft: 0,
              marginRight: 0,
              cursor: 'pointer',
            }}
          />
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--text-sub)',
              lineHeight: 1.5,
            }}
          >
            <label htmlFor="consent-checkbox" style={{ cursor: 'pointer' }}>
              {t('scan.consent.agreementStart')}{' '}
            </label>
            <button
              type="button"
              className="tc-link"
              onClick={onNavigateTerms}
              style={{ color: 'var(--text)', textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              {t('scan.consent.terms')}
            </button>{' '}
            {t('scan.consent.agreementJoin')}{' '}
            <button
              type="button"
              className="tc-link"
              onClick={onNavigatePolicy}
              style={{ color: 'var(--text)', textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              {t('scan.consent.policy')}
            </button>
            {t('scan.consent.agreementEnd')}
          </div>
        </div>

        {/* Accept button */}
        <button
          type="button"
          id="consent-accept-btn"
          disabled={!checked}
          onClick={handleAccept}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 14,
            border: 'none',
            background: checked ? 'var(--text)' : 'var(--glass-soft-border)',
            color: checked ? 'var(--bg-app)' : 'var(--text-disabled)',
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 700,
            cursor: checked ? 'pointer' : 'not-allowed',
            letterSpacing: 0.3,
            transition: 'all 0.2s ease',
          }}
        >
          {t('scan.consent.accept')}
        </button>
      </div>

      <style>{`
        @keyframes tcSlideUp {
          from { transform: translateY(100%) }
          to   { transform: translateY(0)    }
        }
        .tc-checkbox:focus-visible,
        .tc-link:focus-visible,
        #consent-accept-btn:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 3px;
        }
        .tc-link {
          display: inline;
          padding: 0;
          border: 0;
          background: transparent;
          font: inherit;
          line-height: inherit;
          cursor: pointer;
        }
      `}</style>
    </>
  )
}
