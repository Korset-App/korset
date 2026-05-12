import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import LandingScreen from './LandingScreen.jsx'
import './HomeScreen.css'

function StoreLogo({ store }) {
  const logo = store.logo_url || store.logo
  const initial = store.name?.[0]?.toUpperCase() || 'K'

  if (logo) {
    return <img className="home-store-logo" src={logo} alt={store.name} />
  }

  return <div className="home-store-logo home-store-logo--fallback">{initial}</div>
}

function HomeIcon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const { t, format } = useI18n()
  const {
    currentStore,
    isStoreApp,
    isStoreLoading,
    routes,
    catalogProducts = [],
    isCatalogReady,
  } = useStore()

  useEffect(() => {
    import('html5-qrcode').catch(() => {})
  }, [])

  if (!isStoreApp) {
    return <LandingScreen />
  }

  if (!currentStore || !routes) {
    return (
      <div className="screen home-screen home-screen--state">
        <div className="home-orb home-orb--left" />
        <div className="home-orb home-orb--right" />
        <div className="home-state-card">
          <div className="home-state-mark">
            <HomeIcon name={isStoreLoading ? 'progress_activity' : 'storefront'} />
          </div>
          <p className="home-eyebrow">{t('home.contextLabel')}</p>
          <h1>{isStoreLoading ? t('home.loadingTitle') : t('home.missingTitle')}</h1>
          <p>{isStoreLoading ? t('home.loadingText') : t('home.missingText')}</p>
          {!isStoreLoading && (
            <button className="home-pill-button" type="button" onClick={() => navigate('/stores')}>
              {t('home.chooseStore')}
            </button>
          )}
        </div>
      </div>
    )
  }

  const address = [currentStore.city, currentStore.address].filter(Boolean).join(' · ')
  const hasContacts = Boolean(
    currentStore.phone || currentStore.whatsapp_number || currentStore.instagram_url
  )
  const catalogCount = catalogProducts.length
  const catalogCountLabel = isCatalogReady
    ? t('home.catalogCount', { count: catalogCount, countText: format.number(catalogCount) })
    : t('home.catalogSyncing')

  const actions = [
    {
      key: 'catalog',
      icon: 'grid_view',
      title: t('home.catalog'),
      text: catalogCount > 0 ? catalogCountLabel : t('home.catalogSub'),
      path: routes.catalog,
      tone: 'sky',
    },
    {
      key: 'ai',
      icon: 'auto_awesome',
      title: t('home.ai'),
      text: t('home.aiSub'),
      path: routes.ai,
      tone: 'violet',
    },
    {
      key: 'history',
      icon: 'history',
      title: t('home.myHistory'),
      text: t('home.scannedProducts'),
      path: routes.history,
      tone: 'mint',
    },
  ]

  const fitSignals = [
    ['allergy', t('home.signalAllergens')],
    ['verified', t('home.signalHalal')],
    ['restaurant', t('home.signalNutrition')],
  ]

  return (
    <div className="screen home-screen">
      <div className="home-orb home-orb--left" />
      <div className="home-orb home-orb--right" />

      <header className="home-hero">
        <div className="home-store-row">
          <StoreLogo store={currentStore} />
          <div className="home-store-copy">
            <div className="home-verified">
              <HomeIcon name="verified" />
              <span>{t('home.officialStore')}</span>
            </div>
            <h1>{currentStore.name}</h1>
            {address && (
              <p className="home-address">
                <HomeIcon name="location_on" />
                <span>{address}</span>
              </p>
            )}
          </div>
        </div>

        {currentStore.short_description && (
          <p className="home-store-description">{currentStore.short_description}</p>
        )}

        <div className="home-hero-card">
          <p className="home-eyebrow">{t('home.heroEyebrow')}</p>
          <h2>{t('home.heroTitle')}</h2>
          <p>{t('home.heroText')}</p>

          <button className="home-scan-button" type="button" onClick={() => navigate(routes.scan)}>
            <span className="home-scan-button__icon">
              <HomeIcon name="barcode_scanner" />
            </span>
            <span className="home-scan-button__copy">
              <strong>{t('home.scanBtn')}</strong>
              <span>{t('home.scanSub')}</span>
            </span>
            <HomeIcon name="arrow_forward" className="home-scan-button__arrow" />
          </button>
        </div>
      </header>

      <section className="home-section home-fit-panel" aria-label={t('home.contextLabel')}>
        <div>
          <p className="home-eyebrow">{t('home.contextLabel')}</p>
          <h2>{t('home.contextTitle')}</h2>
          <p>{t('home.contextText')}</p>
        </div>
        <div className="home-fit-signals">
          {fitSignals.map(([icon, label]) => (
            <div className="home-fit-signal" key={label}>
              <HomeIcon name={icon} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="home-actions" aria-label={t('home.quickActions')}>
        {actions.map((action) => (
          <button
            className={`home-action-card home-action-card--${action.tone}`}
            key={action.key}
            type="button"
            onClick={() => navigate(action.path)}
          >
            <span className="home-action-card__icon">
              <HomeIcon name={action.icon} />
            </span>
            <span className="home-action-card__copy">
              <strong>{action.title}</strong>
              <span>{action.text}</span>
            </span>
            <HomeIcon name="chevron_right" className="home-action-card__arrow" />
          </button>
        ))}
      </section>

      <section className="home-section home-store-panel">
        <div>
          <p className="home-eyebrow">{t('home.storeTools')}</p>
          <h2>{t('home.storePage')}</h2>
          <p>{t('home.storePanelText')}</p>
        </div>

        {hasContacts && (
          <div className="home-contact-list" aria-label={t('home.storeContacts')}>
            {currentStore.phone && (
              <a href={`tel:${currentStore.phone.replace(/[^\d+]/g, '')}`}>
                <HomeIcon name="call" />
                <span>{currentStore.phone}</span>
              </a>
            )}
            {currentStore.whatsapp_number && (
              <a
                href={`https://wa.me/${currentStore.whatsapp_number.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <HomeIcon name="chat" />
                <span>WhatsApp</span>
              </a>
            )}
            {currentStore.instagram_url && (
              <a href={currentStore.instagram_url} target="_blank" rel="noopener noreferrer">
                <HomeIcon name="photo_camera" />
                <span>Instagram</span>
              </a>
            )}
          </div>
        )}

        <button
          className="home-ghost-button"
          type="button"
          onClick={() => navigate(routes.publicPage)}
        >
          <HomeIcon name="info" />
          <span>{t('home.moreInfo')}</span>
        </button>
      </section>
    </div>
  )
}
