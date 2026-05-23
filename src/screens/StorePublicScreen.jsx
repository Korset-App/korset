import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '../contexts/StoreContext.jsx'
import { useI18n } from '../i18n/index.js'

const CONTACT_LABELS = { phone: 'home.storePhone' }

const CONTACTS = [
  {
    key: 'phone',
    icon: 'call',
    color: '#4ADE80',
    label: 'Телефон',
    href: (v) => `tel:${v.replace(/[^\d+]/g, '')}`,
  },
  {
    key: 'whatsapp_number',
    icon: 'chat',
    color: '#25D366',
    label: 'WhatsApp',
    href: (v) => `https://wa.me/${v.replace(/\D/g, '')}`,
  },
  {
    key: 'instagram_url',
    icon: 'photo_camera',
    color: '#E1306C',
    label: 'Instagram',
    href: (v) => v,
  },
  { key: 'twogis_url', icon: 'location_on', color: '#2A6EDD', label: '2GIS', href: (v) => v },
]

export default function StorePublicScreen() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { currentStore: store, isStoreLoading, rememberStore } = useStore()
  const [showFullDesc, setShowFullDesc] = useState(false)
  const showFullDescRef = useRef(false)

  useEffect(() => {
    showFullDescRef.current = showFullDesc
  }, [showFullDesc])

  useEffect(() => {
    const handlePopState = () => {
      if (showFullDescRef.current) {
        setShowFullDesc(false)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  if (isStoreLoading) {
    return (
      <div
        className="app-frame"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            border: '3px solid rgba(56,189,248,0.15)',
            borderTop: '3px solid var(--accent-sky)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!store) return <Navigate to="/stores" replace />

  const hasContacts = CONTACTS.some((c) => store[c.key])
  const hasDescription = store.description || store.short_description

  return (
    <div className="screen" style={{ paddingBottom: 40 }}>
      <div style={{ padding: '28px 20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-soft-border)',
            color: 'var(--text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'flex-start',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            arrow_back
          </span>
        </button>

        {/* Store header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {store.logo_url || store.logo ? (
            <img
              src={store.logo_url || store.logo}
              alt={store.name}
              style={{
                width: 80,
                height: 80,
                borderRadius: 22,
                objectFit: 'cover',
                flexShrink: 0,
                boxShadow: 'var(--shadow-card)',
              }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 22,
                background: 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(124,58,237,0.25))',
                border: '1px solid var(--accent-sky-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 30,
                fontWeight: 800,
                color: 'var(--text-inverse)',
                fontFamily: 'var(--font-display)',
                flexShrink: 0,
              }}
            >
              {store.name?.[0]?.toUpperCase() || 'K'}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--primary-bright)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              {t('home.storePage')}
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 26,
                fontWeight: 900,
                color: 'var(--text)',
                lineHeight: 1.15,
                margin: '0 0 6px',
              }}
            >
              {store.name}
            </h1>
            {(store.city || store.address) && (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  location_on
                </span>
                {[store.city, store.address].filter(Boolean).join(' · ')}
              </div>
            )}
            {store.short_description && (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-soft)',
                  marginTop: 6,
                  lineHeight: 1.5,
                }}
              >
                {store.short_description}
              </div>
            )}
          </div>
        </div>

        {/* Full description */}
        {hasDescription && (
          <div
            style={{
              background: 'var(--glass-subtle)',
              border: '1px solid var(--glass-soft-border)',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => {
                if (!showFullDesc) window.history.pushState(null, '')
                setShowFullDesc((v) => !v)
              }}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'var(--text)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18, color: 'var(--primary-bright)' }}
                >
                  description
                </span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{t('home.storeAbout')}</span>
              </div>
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 18,
                  color: 'var(--text-dim)',
                  transition: 'transform 0.2s',
                  transform: showFullDesc ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                expand_more
              </span>
            </button>
            {showFullDesc && (
              <div
                style={{
                  padding: '0 16px 16px',
                  fontSize: 14,
                  color: 'var(--text-soft)',
                  lineHeight: 1.65,
                  borderTop: '1px solid var(--line-soft)',
                }}
              >
                <div style={{ paddingTop: 12 }}>{store.description || store.short_description}</div>
              </div>
            )}
          </div>
        )}

        {/* Contacts */}
        {hasContacts && (
          <div
            style={{
              background: 'var(--glass-subtle)',
              border: '1px solid var(--glass-soft-border)',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: 1,
                borderBottom: '1px solid var(--line-soft)',
              }}
            >
              {t('home.storeContacts')}
            </div>
            {CONTACTS.filter((c) => store[c.key]).map((c, i, arr) => (
              <div key={c.key}>
                <a
                  href={c.href(store[c.key])}
                  target={c.key !== 'phone' ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    textDecoration: 'none',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${c.color}18`,
                      border: `1px solid ${c.color}35`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18, color: c.color }}
                    >
                      {c.icon}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>
                      {CONTACT_LABELS[c.key] ? t(CONTACT_LABELS[c.key]) : c.label}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--text)',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {store[c.key]}
                    </div>
                  </div>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16, color: 'var(--text-dim)' }}
                  >
                    open_in_new
                  </span>
                </a>
                {i < arr.length - 1 && (
                  <div style={{ height: 1, background: 'var(--line-soft)', margin: '0 16px' }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Körset features */}
        <div
          style={{
            padding: '16px 18px',
            borderRadius: 18,
            background: 'var(--glass-subtle)',
            border: '1px solid var(--glass-soft-border)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            {t('home.storeFeatures')}
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              color: 'var(--text-soft)',
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            <li>{t('home.storeFeature1')}</li>
            <li>{t('home.storeFeature2')}</li>
            <li>{t('home.storeFeature3')}</li>
            <li>{t('home.storeFeature4')}</li>
          </ul>
        </div>

        {/* CTA buttons */}
        <button
          onClick={() => {
            rememberStore(store.slug)
            navigate(`/s/${store.slug}`)
          }}
          style={{
            width: '100%',
            padding: '18px',
            borderRadius: 18,
            cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.22), rgba(109,40,217,0.1))',
            border: '1.5px solid rgba(124,58,237,0.4)',
            color: 'var(--text)',
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          {t('home.storeOpen')}
        </button>

        <button
          onClick={() => {
            rememberStore(store.slug)
            navigate(`/s/${store.slug}/scan`)
          }}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 18,
            cursor: 'pointer',
            background: 'var(--glass-muted)',
            border: '1px solid var(--glass-border)',
            color: 'var(--primary-bright)',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {t('home.storeScan')}
        </button>
      </div>
    </div>
  )
}
