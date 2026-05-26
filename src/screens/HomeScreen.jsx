import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import { ALLERGENS } from '../constants/allergens.js'
import { DIET_PREFERENCES } from '../constants/dietGoals.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import {
  HOME_STORY_KEYS,
  buildFitCheckSetupState,
  buildHomeQuickActions,
  buildHomeStoreFacts,
} from '../domain/home/homeScreenModel.js'
import { setLang, useI18n } from '../i18n/index.js'
import { useTheme } from '../utils/theme.js'
import LandingScreen from './LandingScreen.jsx'
import './HomeScreen.css'

function HomeIcon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

function StoreLogo({ store }) {
  const logo = store.logo_url || store.logo
  const initial = store.name?.[0]?.toUpperCase() || 'K'

  if (logo) {
    return <img className="home-store-logo" src={logo} alt={store.name} />
  }

  return <div className="home-store-logo home-store-logo--fallback">{initial}</div>
}

function BrandMark() {
  return (
    <span className="home-brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )
}

function isIosDevice() {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent || '')
}

function isStandalonePwa() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone
}

function getStoreName(store) {
  return store?.name || 'Korset'
}

function getLocalizedLabel(item, lang) {
  return item?.label?.[lang] || item?.label?.ru || item?.id || ''
}

function buildStoryVars(store) {
  return { storeName: getStoreName(store) }
}

function StoryViewer({ story, storyIndex, slideIndex, store, t, onClose, onSlide, onCta }) {
  const slideKey = story.slides[slideIndex] || story.slides[0]
  const vars = buildStoryVars(store)

  return (
    <div className="home-story-viewer" role="dialog" aria-modal="true">
      <button className="home-story-viewer__backdrop" type="button" onClick={onClose} />
      <article className={`home-story-viewer__frame home-story-tone--${story.tone}`}>
        <img className="home-story-viewer__image" src={story.image} alt="" aria-hidden="true" />
        <div className="home-story-viewer__shade" />
        <div className="home-story-viewer__progress" aria-hidden="true">
          {story.slides.map((slide, index) => (
            <span key={slide}>
              <i style={{ transform: index <= slideIndex ? 'scaleX(1)' : 'scaleX(0)' }} />
            </span>
          ))}
        </div>
        <header className="home-story-viewer__top">
          <div>
            <p>{t(`home.stories.${storyIndex}.kicker`, vars)}</p>
            <h2>{t(`home.storySlides.${slideKey}.title`, vars)}</h2>
          </div>
          <button type="button" aria-label={t('common.close')} onClick={onClose}>
            <HomeIcon name="close" />
          </button>
        </header>
        <p className="home-story-viewer__text">{t(`home.storySlides.${slideKey}.text`, vars)}</p>
        <div className="home-story-viewer__hit home-story-viewer__hit--prev">
          <button type="button" aria-label={t('home.storyPrev')} onClick={() => onSlide(-1)} />
        </div>
        <div className="home-story-viewer__hit home-story-viewer__hit--next">
          <button type="button" aria-label={t('home.storyNext')} onClick={() => onSlide(1)} />
        </div>
        <button className="home-story-viewer__cta" type="button" onClick={onCta}>
          <span>{t(`home.stories.${storyIndex}.cta`, vars)}</span>
          <HomeIcon name="arrow_forward" />
        </button>
      </article>
    </div>
  )
}

function BrandContactIcon({ type }) {
  if (type === 'whatsapp')
    return <span className="home-brand-contact home-brand-contact--wa">WA</span>
  if (type === 'instagram')
    return <span className="home-brand-contact home-brand-contact--ig">IG</span>
  if (type === 'twogis')
    return <span className="home-brand-contact home-brand-contact--gis">2G</span>
  return <HomeIcon name="call" />
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const { lang, t } = useI18n()
  const { theme, setTheme } = useTheme()
  const { avatarId, displayName, user } = useAuth()
  const { profile, updateProfile } = useProfile()
  const { currentStore, isStoreApp, isStoreLoading, routes } = useStore()
  const [activeStoryIndex, setActiveStoryIndex] = useState(null)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [fitPanelOpen, setFitPanelOpen] = useState(false)
  const [fitSaved, setFitSaved] = useState(false)
  const [draftDietGoals, setDraftDietGoals] = useState(profile?.dietGoals || [])
  const [draftHalal, setDraftHalal] = useState(Boolean(profile?.halal))
  const [draftNoPreferences, setDraftNoPreferences] = useState(Boolean(profile?.noDietPreferences))
  const [draftAllergens, setDraftAllergens] = useState(profile?.allergens || [])
  const [draftNoAllergies, setDraftNoAllergies] = useState(Boolean(profile?.noAllergies))
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installDismissed, setInstallDismissed] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('korset_home_install_dismissed') === '1'
  })
  const [isInstalled, setIsInstalled] = useState(isStandalonePwa)

  useEffect(() => {
    import('html5-qrcode').catch(() => {})
  }, [])

  function openFitPanel() {
    setDraftDietGoals(profile?.dietGoals || [])
    setDraftHalal(Boolean(profile?.halal))
    setDraftNoPreferences(Boolean(profile?.noDietPreferences))
    setDraftAllergens(profile?.allergens || [])
    setDraftNoAllergies(Boolean(profile?.noAllergies))
    setFitPanelOpen(true)
  }

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
        setFitPanelOpen(false)
      }
      if (activeStoryIndex !== null && event.key === 'ArrowRight') moveStorySlide(1)
      if (activeStoryIndex !== null && event.key === 'ArrowLeft') moveStorySlide(-1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  useEffect(() => {
    if (typeof document === 'undefined' || activeStoryIndex === null) return undefined
    document.body.classList.add('home-story-viewer-open')
    return () => document.body.classList.remove('home-story-viewer-open')
  }, [activeStoryIndex])

  const topAllergens = useMemo(
    () => ALLERGENS.filter((item) => item.frequency >= 2).slice(0, 10),
    []
  )

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

  const profileName = displayName || user?.email || t('profile.title')
  const storeFacts = buildHomeStoreFacts(currentStore)
  const actions = buildHomeQuickActions({ routes })
  const fitSetup = buildFitCheckSetupState(profile)
  const activeStory = activeStoryIndex === null ? null : HOME_STORY_KEYS[activeStoryIndex]
  const installAvailable = !isInstalled && !installDismissed && (installPrompt || isIosDevice())
  const hasContacts = Boolean(
    currentStore.phone ||
    currentStore.whatsapp_number ||
    currentStore.instagram_url ||
    currentStore.twogis_url
  )
  function dismissInstall() {
    setInstallDismissed(true)
    localStorage.setItem('korset_home_install_dismissed', '1')
  }

  async function handleInstallClick() {
    if (installPrompt) {
      installPrompt.prompt()
      await installPrompt.userChoice.catch(() => null)
      setInstallPrompt(null)
      dismissInstall()
      return
    }
    setActiveStoryIndex(4)
    setActiveSlideIndex(0)
  }

  function moveStorySlide(direction) {
    if (activeStoryIndex === null) return
    const story = HOME_STORY_KEYS[activeStoryIndex]
    const next = activeSlideIndex + direction
    if (next >= 0 && next < story.slides.length) {
      setActiveSlideIndex(next)
      return
    }
    const nextStory = activeStoryIndex + direction
    if (nextStory >= 0 && nextStory < HOME_STORY_KEYS.length) {
      setActiveStoryIndex(nextStory)
      setActiveSlideIndex(direction > 0 ? 0 : HOME_STORY_KEYS[nextStory].slides.length - 1)
      return
    }
    setActiveStoryIndex(null)
    setActiveSlideIndex(0)
  }

  function handleStoryCta() {
    if (!activeStory) return
    if (activeStory.cta === 'scan') navigate(routes.scan)
    if (activeStory.cta === 'fit') openFitPanel()
    if (activeStory.cta === 'install') handleInstallClick()
    if (activeStory.cta === 'learn' || activeStory.cta === 'store') navigate(routes.publicPage)
    setActiveStoryIndex(null)
    setActiveSlideIndex(0)
  }

  function toggleDietGoal(id) {
    setDraftNoPreferences(false)
    setDraftDietGoals((value) =>
      value.includes(id) ? value.filter((item) => item !== id) : [...value, id]
    )
  }

  function toggleNoPreferences() {
    setDraftNoPreferences(true)
    setDraftHalal(false)
    setDraftDietGoals([])
  }

  function toggleAllergen(id) {
    setDraftNoAllergies(false)
    setDraftAllergens((value) =>
      value.includes(id) ? value.filter((item) => item !== id) : [...value, id]
    )
  }

  function toggleNoAllergies() {
    setDraftNoAllergies(true)
    setDraftAllergens([])
  }

  async function saveFitSetup() {
    await updateProfile({
      halal: draftNoPreferences ? false : draftHalal,
      dietGoals: draftNoPreferences ? [] : draftDietGoals,
      noDietPreferences: draftNoPreferences,
      allergens: draftNoAllergies ? [] : draftAllergens,
      noAllergies: draftNoAllergies,
    })
    setFitSaved(true)
    window.setTimeout(() => {
      setFitPanelOpen(false)
      setFitSaved(false)
    }, 1200)
  }

  return (
    <main className="screen home-screen">
      <header className="home-hero">
        <div className="home-brand-row">
          <button className="home-brand-lockup" type="button" onClick={() => navigate(routes.home)}>
            <BrandMark />
            <span>Körset</span>
            <i aria-hidden="true">&</i>
            <strong>{getStoreName(currentStore)}</strong>
          </button>

          <div className="home-avatar-wrap">
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
                  <div className="home-avatar-menu__identity">
                    <ProfileAvatar avatarId={avatarId} name={profileName} rounded="circle" />
                    <div>
                      <strong>{profileName}</strong>
                      <span>{getStoreName(currentStore)}</span>
                    </div>
                  </div>
                  <button
                    className="home-avatar-menu__item"
                    type="button"
                    onClick={() => {
                      setAvatarMenuOpen(false)
                      navigate(routes.profile)
                    }}
                  >
                    <HomeIcon name="person" />
                    <span>{t('home.menuProfile')}</span>
                  </button>
                  <button
                    className="home-avatar-menu__item"
                    type="button"
                    onClick={() => {
                      setAvatarMenuOpen(false)
                      openFitPanel()
                    }}
                  >
                    <HomeIcon name="tune" />
                    <span>{t('home.menuPreferences')}</span>
                  </button>
                  <div className="home-avatar-menu__switches">
                    <div>
                      <span>{t('home.menuLanguage')}</span>
                      <div className="home-segment">
                        {['ru', 'kz'].map((item) => (
                          <button
                            className={lang === item ? 'is-active' : ''}
                            key={item}
                            type="button"
                            onClick={() => setLang(item)}
                          >
                            {item.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span>{t('home.menuTheme')}</span>
                      <div className="home-segment">
                        {['dark', 'light'].map((item) => (
                          <button
                            className={theme === item ? 'is-active' : ''}
                            key={item}
                            type="button"
                            onClick={() => setTheme(item)}
                          >
                            {t(`home.theme.${item}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {installAvailable && (
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
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <section className="home-stories" aria-label={t('home.storiesLabel')}>
          {HOME_STORY_KEYS.map((story, index) => (
            <button
              className={`home-story-card home-story-tone--${story.tone}`}
              key={story.key}
              type="button"
              onClick={() => {
                setActiveStoryIndex(index)
                setActiveSlideIndex(0)
              }}
            >
              <img src={story.image} alt="" aria-hidden="true" />
              <span className="home-story-card__shade" />
              <span className="home-story-card__kicker">{t(`home.stories.${index}.kicker`)}</span>
              <strong>{t(`home.stories.${index}.title`, buildStoryVars(currentStore))}</strong>
            </button>
          ))}
        </section>
      </header>

      <section className="home-scan-stage" aria-label={t('home.scanBtn')}>
        <button className="home-scan-button" type="button" onClick={() => navigate(routes.scan)}>
          <span className="home-scan-button__glyph">
            <HomeIcon name="barcode_scanner" />
          </span>
          <span className="home-scan-button__copy">
            <strong>{t('home.scanProduct')}</strong>
            <span>{t('home.scanProductSub')}</span>
          </span>
        </button>
      </section>

      <section className={`home-fit-card${fitPanelOpen ? ' is-open' : ''}`}>
        <button
          className="home-fit-card__summary"
          type="button"
          onClick={() => {
            if (fitPanelOpen) setFitPanelOpen(false)
            else openFitPanel()
          }}
          aria-expanded={fitPanelOpen}
        >
          <span>
            <i>{fitSetup.isComplete ? t('home.fitSetupReadyPill') : t('home.fitSetupLabel')}</i>
            <strong>
              {fitSetup.isComplete ? t('home.fitSetupReadyTitle') : t('home.fitSetupTitle')}
            </strong>
            <small>
              {fitSetup.isComplete ? t('home.fitSetupReadyText') : t('home.fitSetupText')}
            </small>
          </span>
          <HomeIcon name={fitPanelOpen ? 'expand_less' : 'expand_more'} />
        </button>

        {fitPanelOpen && (
          <div className="home-fit-card__editor">
            <div className="home-fit-step">
              <div className="home-fit-step__head">
                <span>1</span>
                <div>
                  <h3>{t('home.fitPreferencesTitle')}</h3>
                  <p>{t('home.fitPreferencesText')}</p>
                </div>
              </div>
              <div className="home-chip-grid">
                <button
                  className={`home-choice-chip${draftNoPreferences ? ' is-active' : ''}`}
                  type="button"
                  onClick={toggleNoPreferences}
                >
                  {t('home.noPreferences')}
                </button>
                <button
                  className={`home-choice-chip${draftHalal && !draftNoPreferences ? ' is-active' : ''}`}
                  type="button"
                  onClick={() => {
                    setDraftNoPreferences(false)
                    setDraftHalal((value) => !value)
                  }}
                >
                  {t('home.preferenceHalal')}
                </button>
                {DIET_PREFERENCES.filter((item) => item.id !== 'halal').map((item) => (
                  <button
                    className={`home-choice-chip${
                      draftDietGoals.includes(item.id) && !draftNoPreferences ? ' is-active' : ''
                    }`}
                    key={item.id}
                    type="button"
                    onClick={() => toggleDietGoal(item.id)}
                  >
                    {getLocalizedLabel(item, lang)}
                  </button>
                ))}
              </div>
            </div>

            <div className="home-fit-step">
              <div className="home-fit-step__head">
                <span>2</span>
                <div>
                  <h3>{t('home.fitAllergensTitle')}</h3>
                  <p>{t('home.fitAllergensText')}</p>
                </div>
              </div>
              <div className="home-chip-grid">
                <button
                  className={`home-choice-chip${draftNoAllergies ? ' is-active' : ''}`}
                  type="button"
                  onClick={toggleNoAllergies}
                >
                  {t('home.noAllergies')}
                </button>
                {topAllergens.map((item) => (
                  <button
                    className={`home-choice-chip${
                      draftAllergens.includes(item.id) && !draftNoAllergies ? ' is-active' : ''
                    }`}
                    key={item.id}
                    type="button"
                    onClick={() => toggleAllergen(item.id)}
                  >
                    {getLocalizedLabel(item, lang)}
                  </button>
                ))}
              </div>
            </div>

            <div className="home-fit-card__footer">
              <p>{fitSaved ? t('home.fitSaved') : t('home.fitProfileHint')}</p>
              <button type="button" onClick={saveFitSetup}>
                {t('home.fitSave')}
              </button>
            </div>
          </div>
        )}
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
            <span>
              <strong>{t(action.titleKey)}</strong>
              <small>{t(action.textKey)}</small>
            </span>
          </button>
        ))}
      </section>

      {installAvailable && (
        <section className="home-install-banner" aria-label={t('home.installTitle')}>
          <div>
            <strong>{isIosDevice() ? t('home.installIosTitle') : t('home.installTitle')}</strong>
            <p>{isIosDevice() ? t('home.installIosText') : t('home.installText')}</p>
          </div>
          <button type="button" onClick={handleInstallClick}>
            {t('home.installCta')}
          </button>
          <button type="button" onClick={dismissInstall} aria-label={t('common.close')}>
            <HomeIcon name="close" />
          </button>
        </section>
      )}

      <section className="home-store-card">
        <div className="home-store-card__top">
          <StoreLogo store={currentStore} />
          <div>
            <p>{t('home.storeTools')}</p>
            <h2>{getStoreName(currentStore)}</h2>
          </div>
        </div>
        {currentStore.short_description && (
          <p className="home-store-card__desc">{currentStore.short_description}</p>
        )}
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
                <BrandContactIcon type="phone" />
                <span>{t('home.storePhone')}</span>
              </a>
            )}
            {currentStore.whatsapp_number && (
              <a
                href={`https://wa.me/${currentStore.whatsapp_number.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <BrandContactIcon type="whatsapp" />
                <span>WhatsApp</span>
              </a>
            )}
            {currentStore.instagram_url && (
              <a href={currentStore.instagram_url} target="_blank" rel="noopener noreferrer">
                <BrandContactIcon type="instagram" />
                <span>Instagram</span>
              </a>
            )}
            {currentStore.twogis_url && (
              <a href={currentStore.twogis_url} target="_blank" rel="noopener noreferrer">
                <BrandContactIcon type="twogis" />
                <span>2GIS</span>
              </a>
            )}
          </div>
        )}

        <button
          className="home-store-card__link"
          type="button"
          onClick={() => navigate(routes.publicPage)}
        >
          <span>{t('home.moreInfo')}</span>
          <HomeIcon name="arrow_forward" />
        </button>
      </section>

      {activeStory && (
        <StoryViewer
          story={activeStory}
          storyIndex={activeStoryIndex}
          slideIndex={activeSlideIndex}
          store={currentStore}
          t={t}
          onClose={() => {
            setActiveStoryIndex(null)
            setActiveSlideIndex(0)
          }}
          onSlide={moveStorySlide}
          onCta={handleStoryCta}
        />
      )}
    </main>
  )
}
