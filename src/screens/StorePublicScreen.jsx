import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  PhoneCallIcon,
  WhatsAppIcon,
  TwoGisIcon,
  InstagramIcon,
  AlertTriangleIcon,
} from '../components/icons/index.js'
import './StorePublicScreen.css'

function getContactRoleLabel(role, customLabel, isKz) {
  if (customLabel) return customLabel
  switch (role) {
    case 'admin':
      return isKz ? 'Әкімші' : 'Администратор'
    case 'sales':
      return isKz ? 'Сату бөлімі' : 'Отдел продаж'
    case 'delivery':
      return isKz ? 'Жеткізу / Тапсырыстар' : 'Доставка / Заказы'
    case 'main':
    default:
      return isKz ? 'Негізгі' : 'Основной'
  }
}

function formatDisplayPhone(number) {
  const digits = String(number || '').replace(/\D/g, '')
  if (!digits) return ''
  const local =
    digits.length > 10 && (digits.startsWith('7') || digits.startsWith('8'))
      ? digits.slice(1, 11)
      : digits.slice(0, 10)
  let res = '+7'
  if (local.length > 0) res += ` (${local.slice(0, 3)}`
  if (local.length >= 3) res += `) ${local.slice(3, 6)}`
  if (local.length >= 6) res += `-${local.slice(6, 8)}`
  if (local.length >= 8) res += `-${local.slice(8, 10)}`
  return res
}

const STORE_FEATURE_DEFINITIONS = [
  { id: 'kaspi_qr', labelRu: 'Kaspi QR', labelKz: 'Kaspi QR' },
  { id: 'kaspi_alaqan', labelRu: 'Kaspi Alaqan', labelKz: 'Kaspi Alaqan' },
  { id: 'halyk', labelRu: 'Halyk QR', labelKz: 'Halyk QR' },
  { id: 'freedom', labelRu: 'Freedom QR', labelKz: 'Freedom QR' },
  { id: 'card', labelRu: 'Банковские карты', labelKz: 'Банк карталары' },
  { id: 'cash', labelRu: 'Наличный расчет', labelKz: 'Қолма-қол ақша' },
  { id: 'halal', labelRu: 'Халал-отдел', labelKz: 'Халал бөлімі' },
  { id: 'bakery', labelRu: 'Свежая выпечка', labelKz: 'Жаңа піскен нан' },
  { id: 'cookery', labelRu: 'Кулинария', labelKz: 'Кулинария' },
  { id: 'coffee', labelRu: 'Кофе с собой', labelKz: 'Өзімен бірге кофе' },
  { id: 'self_checkout', labelRu: 'Кассы самообслуживания', labelKz: 'Өзіне-өзі қызмет кассалары' },
  { id: 'atm', labelRu: 'Терминалы и банкоматы', labelKz: 'Терминалдар мен банкоматтар' },
  { id: 'parking', labelRu: 'Удобная парковка', labelKz: 'Ыңғайлы автотұрақ' },
  { id: 'carts', labelRu: 'Корзины и тележки', labelKz: 'Себеттер мен арбалар' },
  { id: 'ramp', labelRu: 'Пандус', labelKz: 'Пандус' },
  { id: 'pharmacy', labelRu: 'Аптечный пункт', labelKz: 'Дәріхана пункті' },
  { id: 'meat_cutting', labelRu: 'Мясной цех', labelKz: 'Ет бөлімі' },
  { id: 'fresh_bar', labelRu: 'Фреш-бар', labelKz: 'Фреш-бар' },
  { id: 'scales', labelRu: 'Контрольные весы', labelKz: 'Бақылау таразысы' },
  { id: 'microwave', labelRu: 'Разогрев еды', labelKz: 'Тамақ жылыту' },
  { id: 'kids_carts', labelRu: 'Детские тележки', labelKz: 'Балалар арбалары' },
  { id: 'lockers', labelRu: 'Камеры хранения', labelKz: 'Жүк сақтау' },
  { id: 'wifi', labelRu: 'Wi-Fi', labelKz: 'Wi-Fi' },
  { id: 'pickup', labelRu: 'Самовывоз', labelKz: 'Алып кету' },
]

export default function StorePublicScreen() {
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'
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

  const schedule = useMemo(() => {
    if (!store) return null
    return parseStoreSchedule(store)
  }, [store])

  const [activeContactsModal, setActiveContactsModal] = useState(null)

  const phoneContacts = useMemo(() => {
    if (!store) return []
    const list = store.features?.contacts?.phones
    if (Array.isArray(list) && list.length > 0) {
      return list.filter((p) => Boolean(p.number))
    }
    return store.phone ? [{ number: store.phone, role: 'main' }] : []
  }, [store])

  const whatsappContacts = useMemo(() => {
    if (!store) return []
    const list = store.features?.contacts?.whatsapps
    if (Array.isArray(list) && list.length > 0) {
      return list.filter((w) => Boolean(w.number))
    }
    return store.whatsapp_number ? [{ number: store.whatsapp_number, role: 'main' }] : []
  }, [store])

  const amenitiesList = useMemo(() => {
    if (!store?.features) return []
    if (Array.isArray(store.features)) return store.features
    const res = []
    if (Array.isArray(store.features.amenities)) res.push(...store.features.amenities)
    if (Array.isArray(store.features.payments)) res.push(...store.features.payments)
    return res
  }, [store])

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
                    {schedule.isTemporarilyClosed
                      ? schedule.temporaryClosureReason || t('home.storeClosedNow')
                      : schedule.isAlwaysOpen
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

        {/* Advance Notice / Temporary Closure Banner */}
        {schedule?.specialNotice && (
          <div
            className="store-public-notice-bar"
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.28)',
              borderRadius: '12px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <AlertTriangleIcon size={16} color="#f59e0b" />
            <span>{schedule.specialNotice}</span>
          </div>
        )}

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
          {phoneContacts.length === 1 ? (
            <a
              href={`tel:${phoneContacts[0].number.replace(/[^\d+]/g, '')}`}
              className="store-public-action-btn"
            >
              <div
                className="store-public-action-btn__icon"
                style={{
                  background: 'rgba(74, 222, 128, 0.12)',
                  color: '#4ade80',
                }}
              >
                <PhoneCallIcon size={18} />
              </div>
              <span>{t('home.storeCall')}</span>
            </a>
          ) : phoneContacts.length > 1 ? (
            <button
              type="button"
              onClick={() => setActiveContactsModal('phones')}
              className="store-public-action-btn"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <div
                className="store-public-action-btn__icon"
                style={{
                  background: 'rgba(74, 222, 128, 0.12)',
                  color: '#4ade80',
                  position: 'relative',
                }}
              >
                <PhoneCallIcon size={18} />
                <span
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    background: '#10B981',
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 700,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {phoneContacts.length}
                </span>
              </div>
              <span>{t('home.storeCall')}</span>
            </button>
          ) : null}

          {whatsappContacts.length === 1 ? (
            <a
              href={`https://wa.me/${whatsappContacts[0].number.replace(/\D/g, '')}`}
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
                <WhatsAppIcon size={18} />
              </div>
              <span>{t('home.storeWhatsApp')}</span>
            </a>
          ) : whatsappContacts.length > 1 ? (
            <button
              type="button"
              onClick={() => setActiveContactsModal('whatsapps')}
              className="store-public-action-btn"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <div
                className="store-public-action-btn__icon"
                style={{
                  background: 'rgba(37, 211, 102, 0.12)',
                  color: '#25d366',
                  position: 'relative',
                }}
              >
                <WhatsAppIcon size={18} />
                <span
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    background: '#25D366',
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 700,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {whatsappContacts.length}
                </span>
              </div>
              <span>{t('home.storeWhatsApp')}</span>
            </button>
          ) : null}

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
                <TwoGisIcon size={18} />
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
                <InstagramIcon size={18} />
              </div>
              <span>{t('home.storeInstagram')}</span>
            </a>
          )}
        </section>

        {/* Modal for Multiple Phones / WhatsApps */}
        {activeContactsModal &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              onClick={() => setActiveContactsModal(null)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                padding: '0 0 max(16px, env(safe-area-inset-bottom))',
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'var(--bg-card, #1e293b)',
                  border: '1px solid var(--border)',
                  borderRadius: '24px 24px 18px 18px',
                  width: '100%',
                  maxWidth: 440,
                  padding: '20px 20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background:
                          activeContactsModal === 'phones'
                            ? 'rgba(74, 222, 128, 0.15)'
                            : 'rgba(37, 211, 102, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: activeContactsModal === 'phones' ? '#4ade80' : '#25d366',
                      }}
                    >
                      {activeContactsModal === 'phones' ? (
                        <PhoneCallIcon size={18} />
                      ) : (
                        <WhatsAppIcon size={18} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                        {activeContactsModal === 'phones'
                          ? isKz
                            ? 'Байланыс телефондары'
                            : 'Телефоны магазина'
                          : isKz
                            ? 'WhatsApp нөмірлері'
                            : 'WhatsApp магазина'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                        {isKz ? 'Қажетті бөлімді таңдаңыз' : 'Выберите подходящий контакт'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveContactsModal(null)}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      color: 'var(--text-sub)',
                      cursor: 'pointer',
                      padding: 6,
                      display: 'flex',
                    }}
                  >
                    <CloseIcon size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(activeContactsModal === 'phones' ? phoneContacts : whatsappContacts).map(
                    (contact, idx) => {
                      const roleLabel = getContactRoleLabel(
                        contact.role,
                        contact.label || contact.customLabel,
                        isKz
                      )
                      const isPhone = activeContactsModal === 'phones'
                      const href = isPhone
                        ? `tel:${contact.number.replace(/[^\d+]/g, '')}`
                        : `https://wa.me/${contact.number.replace(/\D/g, '')}`

                      return (
                        <a
                          key={contact.id || idx}
                          href={href}
                          target={isPhone ? '_self' : '_blank'}
                          rel={isPhone ? undefined : 'noopener noreferrer'}
                          onClick={() => setActiveContactsModal(null)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            borderRadius: 14,
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            textDecoration: 'none',
                            color: 'inherit',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: 'var(--retail-accent, #38bdf8)',
                              }}
                            >
                              {roleLabel}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                              {formatDisplayPhone(contact.number)}
                            </span>
                          </div>
                          <div
                            style={{
                              padding: '6px 12px',
                              borderRadius: 8,
                              background: isPhone
                                ? 'rgba(74, 222, 128, 0.15)'
                                : 'rgba(37, 211, 102, 0.15)',
                              color: isPhone ? '#4ade80' : '#25d366',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {isPhone
                              ? isKz
                                ? 'Қоңырау'
                                : 'Позвонить'
                              : isKz
                                ? 'Жазу'
                                : 'Написать'}
                          </div>
                        </a>
                      )
                    }
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* Store Photos Gallery */}
        {store.images && store.images.length > 0 && (
          <section className="store-public-card">
            <h2 className="store-public-card__title">{t('home.storePhotos')}</h2>
            <div className="store-public-photos-grid">
              {store.images.map((item, idx) => {
                const url = typeof item === 'string' ? item : item?.url
                if (!url) return null
                return (
                  <div
                    key={url || idx}
                    className="store-public-photo-item"
                    onClick={() => setActivePhotoIndex(idx)}
                  >
                    <img
                      src={url}
                      alt={item?.caption || `${store.name} photo ${idx + 1}`}
                      loading="lazy"
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Lightbox for Store Photos */}
        {activePhotoIndex !== null && store.images?.[activePhotoIndex] && (
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
              src={
                typeof store.images[activePhotoIndex] === 'string'
                  ? store.images[activePhotoIndex]
                  : store.images[activePhotoIndex]?.url
              }
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

        {/* Store Amenities and Payments */}
        {amenitiesList.length > 0 && (
          <section className="store-public-card">
            <h2 className="store-public-card__title">
              {t('home.storeAmenitiesTitle') || 'Особенности и сервис'}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {amenitiesList.map((featureId) => {
                const def = STORE_FEATURE_DEFINITIONS.find((f) => f.id === featureId)
                if (!def) return null
                const label = isKz ? def.labelKz : def.labelRu
                return (
                  <span
                    key={featureId}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '6px 12px',
                      borderRadius: 10,
                      background: 'rgba(56, 189, 248, 0.08)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      color: 'var(--text-primary)',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </span>
                )
              })}
            </div>
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
