import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/index.js'
import { useTheme } from '../utils/theme.js'

const APP_VERSION = '1.0.0'
const APP_YEAR = new Date().getFullYear()

// ─── Feature list ─────────────────────────────────────────────────────────────
const getFeatures = (t) => [
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 8V6a2 2 0 0 1 2-2h2" />
        <path d="M16 4h2a2 2 0 0 1 2 2v2" />
        <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
        <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
        <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2.2" />
      </svg>
    ),
    title: t('about.feat1Title'),
    desc: t('about.feat1Desc'),
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
    title: t('about.feat2Title'),
    desc: t('about.feat2Desc'),
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 6h11M9 12h11M9 18h11" />
        <polyline points="4 6 5.5 7.5 7.5 4.5" />
        <polyline points="4 12 5.5 13.5 7.5 10.5" />
        <polyline points="4 18 5.5 19.5 7.5 16.5" />
      </svg>
    ),
    title: t('about.feat3Title'),
    desc: t('about.feat3Desc'),
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l2-5h14l2 5" />
        <path d="M21 9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9" />
        <path d="M3 9h18" />
        <path d="M10 13a2 2 0 0 0 4 0" />
      </svg>
    ),
    title: t('about.feat4Title'),
    desc: t('about.feat4Desc'),
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 8v4l2.5 2.5" />
        <path d="M5.6 5.6 4.34 6.87l2.54.01M4.32 4.33l.02 2.54M3 12a9 9 0 0 0 13.5 7.79M19.8 16.5A9 9 0 0 0 5.67 5.6" />
      </svg>
    ),
    title: t('about.feat5Title'),
    desc: t('about.feat5Desc'),
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9.5 12l1.8 1.8 3.5-3.6" />
      </svg>
    ),
    title: t('about.feat6Title'),
    desc: t('about.feat6Desc'),
  },
]

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AboutScreen() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { isLight } = useTheme()
  const features = getFeatures(t)

  return (
    <div
      className="screen"
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'calc(48px + env(safe-area-inset-bottom))',
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
            {t('profile.about')}
          </div>
        </div>
        <div style={{ width: 44 }} />
      </div>

      {/* ── Hero logo block ── */}
      <div style={{ padding: '0 22px 24px' }}>
        <div
          className="glass-card"
          style={{
            padding: '24px 24px 20px',
            textAlign: 'center',
          }}
        >
          {/* Logo container */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: 'var(--bg-app)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              border: '1px solid var(--glass-soft-border)',
              overflow: 'hidden',
              padding: 8,
            }}
          >
            <img
              src="/brand/korset-icon.svg"
              alt="Korset Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          <div style={{ marginBottom: 6 }}>
            <img
              src={isLight ? '/brand/korset-wordmark-dark.png' : '/brand/korset-wordmark-white.png'}
              alt="Körset"
              style={{ height: 34, objectFit: 'contain', display: 'block', margin: '0 auto' }}
            />
          </div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-sub)',
              marginBottom: 16,
            }}
          >
            {t('about.subtitle')}
          </div>

          {/* Version badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 999,
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-soft-border)',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#34d399',
                boxShadow: '0 0 8px rgba(52,211,153,0.6)',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              {t('about.version', { version: APP_VERSION })}
            </span>
          </div>
        </div>
      </div>

      {/* ── Mission ── */}
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
          {t('about.missionTitle')}
        </div>
        <div className="glass-card" style={{ padding: '20px 22px' }}>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              lineHeight: 1.7,
              color: 'var(--text-sub)',
              margin: 0,
            }}
          >
            {t('about.missionText')}
          </p>
        </div>
      </div>

      {/* ── Features grid ── */}
      <div style={{ padding: '24px 22px 8px' }}>
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
          {t('about.featuresTitle')}
        </div>
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {features.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                padding: '16px 20px',
                borderBottom:
                  i < features.length - 1 ? '1px solid var(--glass-soft-border)' : 'none',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'rgba(124,58,237,0.1)',
                  border: '1px solid rgba(124,58,237,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: 'var(--primary)',
                }}
              >
                {f.icon}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: 3,
                  }}
                >
                  {f.title}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: 'var(--text-sub)',
                  }}
                >
                  {f.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer copyright ── */}
      <div style={{ padding: '28px 22px 0', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--text-disabled)',
            lineHeight: 1.6,
          }}
        >
          {t('about.copyright', { year: APP_YEAR })}
          <br />
          {t('about.madeIn')}
        </div>
      </div>
    </div>
  )
}
