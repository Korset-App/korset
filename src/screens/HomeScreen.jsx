import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import {
  HOME_STORY_KEYS,
  buildFitCheckSetupState,
  buildHomeQuickActions,
  buildHomeStoreFacts,
} from '../domain/home/homeScreenModel.js'
import { useI18n } from '../i18n/index.js'
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

function isIosDevice() {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent || '')
}

function isStandalonePwa() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { avatarId, displayName, user } = useAuth()
  const { profile } = useProfile()
  const { currentStore, isStoreApp, isStoreLoading, routes, appPath } = useStore()
  const [activeStoryIndex, setActiveStoryIndex] = useState(null)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installDismissed, setInstallDismissed] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('korset_home_install_dismissed') === '1'
  })
  const [isInstalled, setIsInstalled] = useState(isStandalonePwa)

  useEffect(() => {
    import('html5-qrcode').catch(() => {})
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const handleInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      setInstallDismissed(true)
      localStorage.setItem('korset_home_install_dismissed', '1')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveStoryIndex(null)
        setAvatarMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!isStoreApp) {
    return <LandingScreen />
  }

  if (!currentStore || !routes) {
    return (
      <div className="screen home-screen home-screen--state">
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

  const hasContacts = Boolean(
    currentStore.phone ||
    currentStore.whatsapp_number ||
    currentStore.instagram_url ||
    currentStore.twogis_url
  )
  const storeFacts = buildHomeStoreFacts(currentStore)
  const actions = buildHomeQuickActions({ routes })
  const profileName = displayName || user?.email || t('profile.title')
  const fitSetup = buildFitCheckSetupState(profile)
  const activeStory =
    activeStoryIndex === null ? null : HOME_STORY_KEYS[activeStoryIndex] || HOME_STORY_KEYS[0]
  const installAvailable = !isInstalled && !installDismissed && (installPrompt || isIosDevice())
  const fitSignals = [
    ['allergy', t('home.signalAllergens'), fitSetup.signals.allergens],
    ['verified', t('home.signalHalal'), fitSetup.signals.halal],
    ['water_drop', t('home.signalSugar'), fitSetup.signals.sugar],
  ]
  const menuItems = [
    ['person', t('home.menuProfile'), routes.profile],
    ['tune', t('home.menuPreferences'), routes.profile],
    ['language', t('home.menuLanguageTheme'), routes.profile],
    ['history', t('home.menuHistory'), routes.history],
    ['help', t('home.menuSupport'), appPath('/faq')],
  ]

  const dismissInstall = () => {
    setInstallDismissed(true)
    localStorage.setItem('korset_home_install_dismissed', '1')
  }

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      await installPrompt.userChoice.catch(() => null)
      setInstallPrompt(null)
      dismissInstall()
      return
    }
    setActiveStoryIndex(4)
  }

  const handleStoryCta = () => {
    if (!activeStory) return
    if (activeStory.cta === 'scan') navigate(routes.scan)
    if (activeStory.cta === 'profile') navigate(routes.profile)
    if (activeStory.cta === 'install') {
      handleInstallClick()
      if (!installPrompt && (isIosDevice() || isInstalled)) return
    }
    if (activeStory.cta === 'learn') navigate(routes.publicPage)
    setActiveStoryIndex(null)
  }

  return (
    <div className="screen home-screen">
      <header className="home-header">
        <div className="home-store-row">
          <StoreLogo store={currentStore} />
          <div className="home-store-copy">
            <h1>{currentStore.name}</h1>
            {storeFacts[0] && (
              <p className="home-address">
                <HomeIcon name={storeFacts[0].icon} />
                <span>{storeFacts[0].text}</span>
              </p>
            )}
          </div>
        </div>

        <button
          className="home-avatar-button"
          type="button"
          aria-label={t('profile.title')}
          aria-expanded={avatarMenuOpen}
          onClick={() => setAvatarMenuOpen((value) => !value)}
        >
          <ProfileAvatar avatarId={avatarId} name={profileName} rounded="circle" />
        </button>

        {avatarMenuOpen && (
          <>
            <button
              className="home-avatar-menu__backdrop"
              type="button"
              aria-label={t('common.close')}
              onClick={() => setAvatarMenuOpen(false)}
            />
            <div className="home-avatar-menu">
              {menuItems.map(([icon, label, path]) => (
                <button
                  className="home-avatar-menu__item"
                  key={label}
                  type="button"
                  onClick={() => {
                    setAvatarMenuOpen(false)
                    navigate(path)
                  }}
                >
                  <HomeIcon name={icon} />
                  <span>{label}</span>
                </button>
              ))}
              <button
                className="home-avatar-menu__item"
                type="button"
                onClick={() => {
                  setAvatarMenuOpen(false)
                  handleInstallClick()
                }}
              >
                <HomeIcon name="install_mobile" />
                <span>{t('home.menuInstall')}</span>
              </button>
            </div>
          </>
        )}
      </header>

      <section className="home-stories" aria-label={t('home.storiesLabel')}>
        {HOME_STORY_KEYS.map((story, index) => (
          <button
            className={`home-story home-story--${story.tone}`}
            key={story.key}
            type="button"
            onClick={() => setActiveStoryIndex(index)}
          >
            <span className="home-story__icon">
              <HomeIcon name={story.icon} />
            </span>
            <span>{t(`home.stories.${index}.title`)}</span>
          </button>
        ))}
      </section>

      <section className="home-scan-panel" aria-label={t('home.scanBtn')}>
        <div>
          <p className="home-eyebrow">{t('home.heroEyebrow')}</p>
          <h2>{t('home.heroTitle')}</h2>
          <p>{t('home.heroText')}</p>
        </div>

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
      </section>

      <section className="home-section home-fit-panel" aria-label={t('home.fitSetupTitle')}>
        <div>
          <p className="home-eyebrow">{t('home.fitSetupLabel')}</p>
          <h2>{fitSetup.isComplete ? t('home.fitSetupReadyTitle') : t('home.fitSetupTitle')}</h2>
          <p>{fitSetup.isComplete ? t('home.fitSetupReadyText') : t('home.fitSetupText')}</p>
        </div>
        <div className="home-fit-signals">
          {fitSignals.map(([icon, label, active]) => (
            <div
              className={`home-fit-signal${active ? ' home-fit-signal--active' : ''}`}
              key={label}
            >
              <HomeIcon name={icon} />
              <span>{label}</span>
            </div>
          ))}
        </div>
        <button className="home-fit-button" type="button" onClick={() => navigate(routes.profile)}>
          <HomeIcon name="tune" />
          <span>{t('home.fitSetupCta')}</span>
        </button>
      </section>

      {installAvailable && (
        <section className="home-install-banner" aria-label={t('home.installTitle')}>
          <div>
            <p className="home-eyebrow">{t('home.installLabel')}</p>
            <h2>{isIosDevice() ? t('home.installIosTitle') : t('home.installTitle')}</h2>
            <p>{isIosDevice() ? t('home.installIosText') : t('home.installText')}</p>
          </div>
          <div className="home-install-banner__actions">
            <button type="button" onClick={handleInstallClick}>
              <HomeIcon name="install_mobile" />
              <span>{t('home.installCta')}</span>
            </button>
            <button type="button" onClick={dismissInstall} aria-label={t('common.close')}>
              <HomeIcon name="close" />
            </button>
          </div>
        </section>
      )}

      <section className="home-actions" aria-label={t('home.quickActions')}>
        {actions.map((action) => (
          <button
            className={`home-action-card home-action-card--${action.tone}${
              action.featured ? ' home-action-card--featured' : ''
            }`}
            key={action.key}
            type="button"
            onClick={() => navigate(action.path)}
          >
            <span className="home-action-card__icon">
              <HomeIcon name={action.icon} />
            </span>
            <span className="home-action-card__copy">
              <strong>{t(action.titleKey)}</strong>
              <span>{t(action.textKey)}</span>
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

        <div className="home-store-facts">
          {storeFacts.map((fact) => (
            <div className="home-store-fact" key={fact.key}>
              <HomeIcon name={fact.icon} />
              <span>{fact.text}</span>
            </div>
          ))}
          {!currentStore.opening_hours && (
            <div className="home-store-fact">
              <HomeIcon name="schedule" />
              <span>{t('home.openingHoursFallback')}</span>
            </div>
          )}
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
            {currentStore.twogis_url && (
              <a href={currentStore.twogis_url} target="_blank" rel="noopener noreferrer">
                <HomeIcon name="map" />
                <span>2GIS</span>
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

      {activeStory && (
        <div className="home-story-modal" role="dialog" aria-modal="true">
          <button
            className="home-story-modal__backdrop"
            type="button"
            aria-label={t('common.close')}
            onClick={() => setActiveStoryIndex(null)}
          />
          <div className={`home-story-modal__card home-story--${activeStory.tone}`}>
            <button
              className="home-story-modal__close"
              type="button"
              aria-label={t('common.close')}
              onClick={() => setActiveStoryIndex(null)}
            >
              <HomeIcon name="close" />
            </button>
            <span className="home-story__icon">
              <HomeIcon name={activeStory.icon} />
            </span>
            <h2>{t(`home.stories.${activeStoryIndex}.title`)}</h2>
            <p>{t(`home.stories.${activeStoryIndex}.text`)}</p>
            <button className="home-story-modal__cta" type="button" onClick={handleStoryCta}>
              <span>{t(`home.stories.${activeStoryIndex}.cta`)}</span>
              <HomeIcon name="arrow_forward" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
