import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/index.js'
import { AIChatIcon, CompareIcon, HistoryIcon } from '../components/icons/index.js'

const APP_VERSION = '1.0.0'
const APP_YEAR = new Date().getFullYear()

// ─── Feature list ─────────────────────────────────────────────────────────────
const getFeatures = (t) => [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
        <g transform="translate(42.666667, 41.600000)">
          <path d="M85.334,107.733 L85.335,150.399 L42.6666667,150.4 L42.6666667,342.4 L175.702784,342.4 L192,350.539 L192,250.91 L202.665434,256.831437 L213.331989,262.740708 L223.998544,256.831437 L234.666,250.909 L234.666,350.539 L250.963883,342.4 L384,342.4 L384,150.4 L341.332,150.399 L341.331,107.733 L426.666667,107.733333 L426.666667,385.066667 L261.013333,385.066667 L213.333333,408.918058 L165.632,385.066667 L3.55271368e-14,385.066667 L3.55271368e-14,107.733333 L85.334,107.733 Z M362.666667,278.4 L362.666667,310.4 L256,310.4 L256,278.4 L362.666667,278.4 Z M170.666667,278.4 L170.666667,310.4 L64,310.4 L64,278.4 L170.666667,278.4 Z M362.666667,214.4 L362.666667,246.4 L256,246.4 L256,239.065 L300.43,214.399 L362.666667,214.4 Z M126.237,214.399 L170.666,239.065 L170.666667,246.4 L64,246.4 L64,214.4 L126.237,214.399 Z M213.333333,7.10542736e-15 L320,59.2604278 L320,177.780929 L213.333333,237.041357 L106.666667,177.780929 L106.666667,59.2604278 L213.333333,7.10542736e-15 Z M170.666667,107.370667 L170.666667,188.928 L192,200.789333 L192,119.232 L170.666667,107.370667 Z M128,83.6693333 L128,165.226723 L149.333333,177.088 L149.333333,95.5306667 L128,83.6693333 Z M256.768,48.5333333 L182.037333,89.28 L202.346667,100.565333 L276.373333,59.4133333 L256.768,48.5333333 Z M213.333333,24.4053901 L139.306667,65.536 L159.957333,77.0133333 L234.688,36.2666667 L213.333333,24.4053901 Z" />
        </g>
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
        aria-hidden="true"
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
    icon: <AIChatIcon size={20} />,
    title: t('about.feat3Title'),
    desc: t('about.feat3Desc'),
  },
  {
    icon: <CompareIcon size={20} />,
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
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z" />
        <path d="M6 15.8L7.14286 17L10 14" />
        <path d="M6 8.8L7.14286 10L10 7" />
        <path d="M13 9L18 9" />
        <path d="M13 16L18 16" />
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
        aria-hidden="true"
      >
        <path d="M4 8V6a2 2 0 0 1 2-2h2" />
        <path d="M16 4h2a2 2 0 0 1 2 2v2" />
        <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
        <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
        <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2.2" />
      </svg>
    ),
    title: t('about.feat6Title'),
    desc: t('about.feat6Desc'),
  },
  {
    icon: <HistoryIcon size={20} />,
    title: t('about.feat7Title'),
    desc: t('about.feat7Desc'),
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M19.4491 6.94063V9.45062C19.4491 10.1606 18.7291 10.6206 18.0591 10.3706C17.2191 10.0606 16.2891 9.94062 15.3091 10.0406C12.9291 10.3006 10.4891 12.5906 10.0891 14.9606C9.75906 16.9306 10.3891 18.7706 11.5991 20.0706C12.1491 20.6706 11.7791 21.6406 10.9691 21.7306C10.2791 21.8106 9.59906 21.7906 9.21906 21.5106L3.71906 17.4006C3.06906 16.9106 2.53906 15.8506 2.53906 15.0306V6.94063C2.53906 5.81063 3.39906 4.57063 4.44906 4.17063L9.94906 2.11062C10.5191 1.90063 11.4591 1.90063 12.0291 2.11062L17.5291 4.17063C18.5891 4.57063 19.4491 5.81063 19.4491 6.94063Z" />
        <path d="M16 11.5117C13.52 11.5117 11.5 13.5317 11.5 16.0117C11.5 18.4917 13.52 20.5117 16 20.5117C18.48 20.5117 20.5 18.4917 20.5 16.0117C20.5 13.5217 18.48 11.5117 16 11.5117Z" />
        <path d="M21 22.0009C20.73 22.0009 20.48 21.8909 20.29 21.7109C20.25 21.6609 20.2 21.6109 20.17 21.5509C20.13 21.5009 20.1 21.4409 20.08 21.3809C20.05 21.3209 20.03 21.2609 20.02 21.2009C20.01 21.1309 20 21.0709 20 21.0009C20 20.8709 20.03 20.7409 20.08 20.6209C20.13 20.4909 20.2 20.3909 20.29 20.2909C20.52 20.0609 20.87 19.9509 21.19 20.0209C21.26 20.0309 21.32 20.0509 21.38 20.0809C21.44 20.1009 21.5 20.1309 21.55 20.1709C21.61 20.2009 21.66 20.2509 21.71 20.2909C21.8 20.3909 21.87 20.4909 21.92 20.6209C21.97 20.7409 22 20.8709 22 21.0009C22 21.2609 21.89 21.5209 21.71 21.7109C21.66 21.7509 21.61 21.7909 21.55 21.8309C21.5 21.8709 21.44 21.9009 21.38 21.9209C21.32 21.9509 21.26 21.9709 21.19 21.9809C21.13 21.9909 21.06 22.0009 21 22.0009Z" />
      </svg>
    ),
    title: t('about.feat8Title'),
    desc: t('about.feat8Desc'),
  },
]

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AboutScreen() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const features = getFeatures(t)
  const missionParagraphs = String(t('about.missionText') || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

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

      {/* ── Hero brand block ── */}
      <div style={{ padding: '0 22px 24px' }}>
        <div
          className="glass-card"
          style={{
            padding: '28px 24px 22px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Single full wordmark on signature dark brand surface so the white
              logo is crisp and high-contrast in both dark and light themes */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 28px',
              borderRadius: 22,
              background: 'linear-gradient(135deg, #090d1a 0%, #171638 100%)',
              border: '1px solid rgba(160, 135, 255, 0.32)',
              boxShadow:
                '0 10px 28px rgba(15, 23, 42, 0.24), 0 0 24px rgba(124, 58, 237, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
              marginBottom: 16,
              maxWidth: '100%',
            }}
          >
            <img
              src="/brand/korset-wordmark-white.svg"
              alt="Körset"
              style={{
                height: 44,
                width: 'auto',
                maxWidth: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>

          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              lineHeight: 1.5,
              color: 'var(--text-sub)',
              maxWidth: 320,
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
        <div
          className="glass-card"
          style={{
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {missionParagraphs.map((paragraph, idx) => (
            <p
              key={idx}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                lineHeight: 1.68,
                color: 'var(--text-sub)',
                margin: 0,
              }}
            >
              {paragraph}
            </p>
          ))}
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
