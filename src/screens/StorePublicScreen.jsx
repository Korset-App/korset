import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '../contexts/StoreContext.jsx'
import { useI18n } from '../i18n/index.js'
import { parseStoreSchedule } from '../domain/stores/schedule.js'
import {
  ArrowBackIcon,
  StorefrontIcon,
  LocationPinIcon,
  ArrowForwardIcon,
  BarcodeScannerIcon,
  CloseIcon,
  ChevronDownIcon,
  FactCheckIcon,
  SparklesIcon,
} from '../components/icons/index.js'
import './StorePublicScreen.css'

export default function StorePublicScreen() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { currentStore: store, isStoreLoading, rememberStore } = useStore()
  const [showFullDesc, setShowFullDesc] = useState(false)
  const showFullDescRef = useRef(false)
  const [activePhotoIndex, setActivePhotoIndex] = useState(null)

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

  const openingHours = store?.opening_hours
  const schedule = useMemo(() => {
    if (!openingHours) return null
    return parseStoreSchedule(openingHours)
  }, [openingHours])

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

  const storeType = store.type ? t(`stores.type.${store.type}`) : null
  const hasDescription = Boolean(store.description || store.short_description)
  const fullAddress = [store.city, store.address].filter(Boolean).join(', ')

  // TwoGIS link fallback to search query by address if explicit link is missing
  const twoGisUrl =
    store.twogis_url ||
    (store.city && store.address
      ? `https://2gis.kz/search/${encodeURIComponent(`${store.city} ${store.address}`)}`
      : null)

  const handleOpenStore = () => {
    rememberStore(store.slug)
    navigate(`/s/${store.slug}`)
  }

  const handleOpenScan = () => {
    rememberStore(store.slug)
    navigate(`/s/${store.slug}/scan`)
  }

  return (
    <div className="screen store-public-screen">
      <div className="store-public-container">
        {/* Top bar */}
        <header className="store-public-topbar">
          <button
            type="button"
            className="store-public-back-btn"
            onClick={() => navigate(-1)}
            aria-label={t('common.back')}
          >
            <ArrowBackIcon size={20} />
          </button>
          <div className="store-public-badge-korset">
            <StorefrontIcon size={14} />
            <span>Körset Store</span>
          </div>
        </header>

        {/* Store header presentation */}
        <article className="store-public-header">
          {store.logo_url || store.logo ? (
            <img
              src={store.logo_url || store.logo}
              alt={store.name}
              className="store-public-logo"
            />
          ) : (
            <div className="store-public-logo-fallback">
              {store.name?.[0]?.toUpperCase() || 'K'}
            </div>
          )}

          <div className="store-public-info">
            <div className="store-public-status-row">
              {schedule?.isConfigured && (
                <span
                  className={`store-public-status-tag ${
                    schedule.isOpen
                      ? 'store-public-status-tag--open'
                      : 'store-public-status-tag--closed'
                  }`}
                >
                  <span className="store-public-status-tag__dot" />
                  <span>
                    {schedule.isAlwaysOpen
                      ? t('home.storeAlwaysOpen')
                      : schedule.isOpen
                        ? schedule.closes
                          ? t('home.storeClosesAt', { time: schedule.closes })
                          : t('home.storeOpenNow')
                        : schedule.opens
                          ? t('home.storeOpensAt', { time: schedule.opens })
                          : t('home.storeClosedNow')}
                  </span>
                </span>
              )}
              {storeType && <span className="store-public-type-tag">{storeType}</span>}
            </div>

            <h1 className="store-public-name">{store.name}</h1>

            {fullAddress && (
              <div className="store-public-address">
                <LocationPinIcon size={16} />
                <span>{fullAddress}</span>
              </div>
            )}

            {store.short_description && (
              <p className="store-public-short-desc">{store.short_description}</p>
            )}
          </div>
        </article>

        {/* Primary CTAs: Digital Storefront first, shelf scanner second */}
        <div className="store-public-cta-group">
          <button type="button" className="store-public-cta-primary" onClick={handleOpenStore}>
            <span>{t('home.storeViewShowcase')}</span>
            <ArrowForwardIcon size={18} />
          </button>

          <button type="button" className="store-public-cta-secondary" onClick={handleOpenScan}>
            <BarcodeScannerIcon size={18} />
            <span>{t('home.storeScanInStore')}</span>
          </button>
        </div>

        {/* Quick Contacts Grid */}
        <section className="store-public-actions-grid" aria-label={t('home.storeContacts')}>
          {store.phone && (
            <a
              href={`tel:${store.phone.replace(/[^\d+]/g, '')}`}
              className="store-public-action-btn"
            >
              <div
                className="store-public-action-btn__icon"
                style={{
                  background: 'rgba(74, 222, 128, 0.12)',
                  color: '#4ade80',
                }}
              >
                <span className="material-symbols-outlined">call</span>
              </div>
              <span>{t('home.storeCall')}</span>
            </a>
          )}

          {store.whatsapp_number && (
            <a
              href={`https://wa.me/${store.whatsapp_number.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="store-public-action-btn"
            >
              <div
                className="store-public-action-btn__icon"
                style={{
                  background: 'rgba(37, 211, 102, 0.12)',
                  color: '#25d366',
                }}
              >
                <span className="material-symbols-outlined">chat</span>
              </div>
              <span>{t('home.storeWhatsApp')}</span>
            </a>
          )}

          {twoGisUrl && (
            <a
              href={twoGisUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="store-public-action-btn"
            >
              <div
                className="store-public-action-btn__icon"
                style={{
                  background: 'rgba(42, 110, 221, 0.12)',
                  color: '#38bdf8',
                }}
              >
                <span className="material-symbols-outlined">map</span>
              </div>
              <span>{t('home.storeRoute2Gis')}</span>
            </a>
          )}

          {store.instagram_url && (
            <a
              href={store.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="store-public-action-btn"
            >
              <div
                className="store-public-action-btn__icon"
                style={{
                  background: 'rgba(225, 48, 108, 0.12)',
                  color: '#f43f5e',
                }}
              >
                <span className="material-symbols-outlined">photo_camera</span>
              </div>
              <span>{t('home.storeInstagram')}</span>
            </a>
          )}
        </section>

        {/* Store Photos Gallery */}
        {store.images && store.images.length > 0 && (
          <section className="store-public-card">
            <h2 className="store-public-card__title">{t('home.storePhotos')}</h2>
            <div className="store-public-photos-grid">
              {store.images.map((url, idx) => (
                <div
                  key={url}
                  className="store-public-photo-item"
                  onClick={() => setActivePhotoIndex(idx)}
                >
                  <img src={url} alt={`${store.name} photo ${idx + 1}`} loading="lazy" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Lightbox for Store Photos */}
        {activePhotoIndex !== null && store.images && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2000,
              background: 'rgba(0,0,0,0.94)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => setActivePhotoIndex(null)}
          >
            <button
              type="button"
              style={{
                position: 'absolute',
                top: 'max(16px, env(safe-area-inset-top))',
                right: 16,
                background: 'rgba(255,255,255,0.14)',
                border: 'none',
                borderRadius: '50%',
                width: 42,
                height: 42,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setActivePhotoIndex(null)}
            >
              <CloseIcon size={22} />
            </button>
            <img
              src={store.images[activePhotoIndex]}
              alt="Store full view"
              style={{ maxWidth: '92%', maxHeight: '86%', objectFit: 'contain', borderRadius: 14 }}
            />
          </div>
        )}

        {/* About store accordion */}
        {hasDescription && (
          <section className="store-public-card">
            <button
              type="button"
              className={`store-public-desc-toggle ${showFullDesc ? 'is-open' : ''}`}
              onClick={() => {
                if (!showFullDesc) window.history.pushState(null, '')
                setShowFullDesc((v) => !v)
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>{t('home.storeAbout')}</span>
              <ChevronDownIcon size={18} />
            </button>
            {showFullDesc && (
              <div className="store-public-desc-body">
                {store.description || store.short_description}
              </div>
            )}
          </section>
        )}

        {/* Store features with Körset */}
        <section className="store-public-card">
          <h2 className="store-public-card__title">{t('home.storeFeatures')}</h2>
          <ul className="store-public-features-list">
            <li className="store-public-feature-item">
              <StorefrontIcon size={20} />
              <span>{t('home.storeFeature3')}</span>
            </li>
            <li className="store-public-feature-item">
              <FactCheckIcon size={20} />
              <span>{t('home.storeFeature2')}</span>
            </li>
            <li className="store-public-feature-item">
              <BarcodeScannerIcon size={20} />
              <span>{t('home.storeFeature1')}</span>
            </li>
            <li className="store-public-feature-item">
              <SparklesIcon size={20} />
              <span>{t('home.storeFeature4')}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
