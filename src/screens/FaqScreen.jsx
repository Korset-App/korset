import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/index.js'
import SupportBottomSheet from '../components/SupportBottomSheet.jsx'

// ─── FAQ data — buyers only ───────────────────────────────────────────────────
// FAQ data lives in locales/faq.json

// ─── Accordion item ──────────────────────────────────────────────────────────
function FaqItem({ item, open, onToggle, isLast }) {
  return (
    <div
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--glass-soft-border)',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '17px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.45,
            color: open ? 'var(--primary)' : 'var(--text)',
            flex: 1,
            transition: 'color 0.2s ease',
          }}
        >
          {item.q}
        </span>
        <span
          style={{
            flexShrink: 0,
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: '1.5px solid var(--glass-soft-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: open ? 'var(--primary)' : 'transparent',
            transition: 'all 0.25s ease',
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke={open ? '#fff' : 'var(--text-sub)'}
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d={open ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
          </svg>
        </span>
      </button>

      {/* Animated answer panel */}
      <div
        style={{
          overflow: 'hidden',
          maxHeight: open ? 400 : 0,
          opacity: open ? 1 : 0,
          transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
        }}
      >
        <div
          style={{
            padding: '0 20px 18px',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            lineHeight: 1.65,
            color: 'var(--text-sub)',
          }}
        >
          {item.a}
        </div>
      </div>
    </div>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function FaqScreen() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [openIndex, setOpenIndex] = useState(null)
  const [supportOpen, setSupportOpen] = useState(false)
  const openIndexRef = useRef(openIndex)
  const supportOpenRef = useRef(supportOpen)
  useEffect(() => {
    openIndexRef.current = openIndex
    supportOpenRef.current = supportOpen
  })

  useEffect(() => {
    const handlePopState = () => {
      if (supportOpenRef.current) {
        setSupportOpen(false)
      } else if (openIndexRef.current !== null) {
        setOpenIndex(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const items = Array.from({ length: 10 }, (_, i) => ({
    q: t('faq.items.' + i + '.q'),
    a: t('faq.items.' + i + '.a'),
  }))
  const toggle = (i) => {
    if (openIndexRef.current !== i) {
      try {
        window.history.pushState(
          { _internal: true },
          '',
          window.location.pathname + window.location.search
        )
      } catch (e) {
        /* noop */
      }
    }
    setOpenIndex((prev) => (prev === i ? null : i))
  }

  return (
    <>
      <div
        className="screen"
        style={{
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
          overflowY: 'auto',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 22px 20px',
          }}
        >
          <button
            onClick={() => navigate(-1)}
            aria-label={t('common.back')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: '1px solid var(--glass-soft-border)',
              background: 'var(--glass-muted)',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                letterSpacing: 0.5,
                color: 'var(--text)',
              }}
            >
              {t('faq.title')}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'var(--text-dim)',
                marginTop: 2,
              }}
            >
              FAQ
            </div>
          </div>

          <div style={{ width: 44 }} />
        </div>

        {/* ── Hero intro ── */}
        <div style={{ padding: '0 22px 24px' }}>
          <div
            className="glass-card"
            style={{
              padding: '20px 22px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background: 'var(--glass-subtle)',
                border: '1px solid var(--glass-soft-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text)',
                  marginBottom: 5,
                }}
              >
                {t('faq.heroTitle')}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'var(--text-sub)',
                }}
              >
                {t('faq.heroDesc')}
              </div>
            </div>
          </div>
        </div>

        {/* ── Accordion ── */}
        <div style={{ padding: '0 22px 8px' }}>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-disabled)',
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              marginBottom: 10,
            }}
          >
            {t('faq.sectionLabel')}
          </div>
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {items.map((item, i) => (
              <FaqItem
                key={i}
                item={item}
                open={openIndex === i}
                onToggle={() => toggle(i)}
                isLast={i === items.length - 1}
              />
            ))}
          </div>
        </div>

        {/* ── CTA: contact support ── */}
        <div style={{ padding: '24px 22px 0' }}>
          <div
            className="glass-card"
            style={{
              padding: '22px',
              background: 'var(--glass-subtle)',
              border: '1px solid var(--glass-soft-border)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: 6,
              }}
            >
              {t('faq.supportTitle')}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--text-sub)',
                marginBottom: 16,
              }}
            >
              {t('faq.supportDesc')}
            </div>
            <button
              type="button"
              onClick={() => {
                try {
                  window.history.pushState(
                    { _internal: true },
                    '',
                    window.location.pathname + window.location.search
                  )
                } catch (e) {
                  /* noop */
                }
                setSupportOpen(true)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 18px',
                borderRadius: 14,
                border: 'none',
                background: 'var(--primary)',
                color: '#fff',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%',
                justifyContent: 'center',
              }}
            >
              {/* Telegram paper-plane icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              {t('faq.supportButton')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Support Bottom Sheet ── */}
      <SupportBottomSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  )
}
