import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import { DietIcon } from './ProfileScreen.jsx'
import { ALLERGENS } from '../constants/allergens.js'
import { DIET_PREFERENCES } from '../constants/dietGoals.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import SegmentedToggle from '../components/SegmentedToggle.jsx'
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

const STORE_LOGO_FALLBACKS = {
  mars: '/store-logos/mars.svg',
  nurly: '/store-logos/nurly.svg',
  kalina: '/store-logos/kalina.svg',
}

const STORE_HOURS_FALLBACKS = {
  mars: '09:00-23:00',
}

function HomeIcon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

function getStoreLogoUrl(store = {}) {
  return STORE_LOGO_FALLBACKS[store.slug || store.code] || store.logo_url || store.logo
}

function StoreLogo({ store, className = '' }) {
  const logo = getStoreLogoUrl(store)
  const initial = store.name?.[0]?.toUpperCase() || 'K'

  if (logo) {
    return <img className={`home-store-logo ${className}`.trim()} src={logo} alt={store.name} />
  }

  return (
    <div className={`home-store-logo home-store-logo--fallback ${className}`.trim()}>{initial}</div>
  )
}

function AboutChevronIcon() {
  return (
    <svg className="home-chevron-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M7.25 4.75L12.5 10l-5.25 5.25" />
    </svg>
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

function getStoreHours(store, t) {
  return (
    store.opening_hours ||
    STORE_HOURS_FALLBACKS[store.slug || store.code] ||
    t('home.openingHoursFallback')
  )
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

function SunGlyph({ filled }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 1.6 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`home-theme-glyph home-theme-glyph--sun${filled ? ' is-filled' : ''}`}
    >
      <circle cx="12" cy="12" r="4.6" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonGlyph({ filled }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 1.4 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`home-theme-glyph home-theme-glyph--moon${filled ? ' is-filled' : ''}`}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const { lang, t } = useI18n()
  const { theme, setTheme } = useTheme()
  const { avatarId, displayName, user } = useAuth()
  const { profile, updateProfile } = useProfile()
  const { currentStore, isStoreApp, isStoreLoading, routes } = useStore()
  const avatarButtonRef = useRef(null)
  const fitSectionRef = useRef(null)
  const installSectionRef = useRef(null)
  const [activeStoryIndex, setActiveStoryIndex] = useState(null)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [fitSaved, setFitSaved] = useState(false)
  const [fitSetupDismissed, setFitSetupDismissed] = useState(false)
  const [fitSetupStep, setFitSetupStep] = useState(1)
  const [draftDietGoals, setDraftDietGoals] = useState(profile?.dietGoals || [])
  const [draftHalal, setDraftHalal] = useState(Boolean(profile?.halal))
  const [draftNoPreferences, setDraftNoPreferences] = useState(Boolean(profile?.noDietPreferences))
  const [draftAllergens, setDraftAllergens] = useState(profile?.allergens || [])
  const [draftNoAllergies, setDraftNoAllergies] = useState(Boolean(profile?.noAllergies))
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installDismissed, setInstallDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('korset_home_install_dismissed') === '1'
  })
  const [isInstalled, setIsInstalled] = useState(isStandalonePwa)

  useEffect(() => {
    import('html5-qrcode').catch(() => {})
  }, [])

  function openFitSetup() {
    setDraftDietGoals(profile?.dietGoals || [])
    setDraftHalal(Boolean(profile?.halal))
    setDraftNoPreferences(Boolean(profile?.noDietPreferences))
    setDraftAllergens(profile?.allergens || [])
    setDraftNoAllergies(Boolean(profile?.noAllergies))
    setFitSetupStep(1)
    setFitSetupDismissed(false)
    window.setTimeout(() => {
      fitSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
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
      sessionStorage.setItem('korset_home_install_dismissed', '1')
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
        setFitSetupDismissed(true)
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
    () => ALLERGENS.filter((item) => item.frequency >= 2).slice(0, 5),
    []
  )
  const visibleDietPreferences = DIET_PREFERENCES.filter((item) =>
    ['halal', 'sugar_free', 'lactose_free', 'gluten_free'].includes(item.id)
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
  const fitSetupVisible = !fitSetup.isComplete && !fitSetupDismissed
  const activeStory = activeStoryIndex === null ? null : HOME_STORY_KEYS[activeStoryIndex]
  const installHelpVisible = !isInstalled && !installDismissed
  const isIos = isIosDevice()
  const hasContacts = Boolean(
    currentStore.phone ||
    currentStore.whatsapp_number ||
    currentStore.instagram_url ||
    currentStore.twogis_url
  )
  const storeHours = getStoreHours(currentStore, t)
  const korsetWordmarkSrc =
    theme === 'light' ? '/brand/korset-wordmark-dark.png' : '/brand/korset-wordmark-white.png'

  function dismissInstall() {
    setInstallDismissed(true)
    sessionStorage.setItem('korset_home_install_dismissed', '1')
  }

  async function handleInstallClick() {
    if (installPrompt) {
      installPrompt.prompt()
      await installPrompt.userChoice.catch(() => null)
      setInstallPrompt(null)
      dismissInstall()
    }
  }

  function scrollToInstall() {
    installSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function navigateProfileTab(tab) {
    setAvatarMenuOpen(false)
    navigate(`${routes.profile}?tab=${tab}`)
  }

  function handleMenuInstallClick() {
    setAvatarMenuOpen(false)
    setInstallDismissed(false)
    sessionStorage.removeItem('korset_home_install_dismissed')
    window.setTimeout(scrollToInstall, 50)
  }

  function handleThemeChange(nextTheme) {
    if (nextTheme === theme) return
    if (typeof document !== 'undefined' && avatarButtonRef.current) {
      const rect = avatarButtonRef.current.getBoundingClientRect()
      document.documentElement.style.setProperty(
        '--home-theme-x',
        `${rect.left + rect.width / 2}px`
      )
      document.documentElement.style.setProperty(
        '--home-theme-y',
        `${rect.top + rect.height / 2}px`
      )
      document.body.classList.add('home-theme-reveal')
      window.setTimeout(() => document.body.classList.remove('home-theme-reveal'), 460)
    }
    if (document.startViewTransition) {
      document.startViewTransition(() => setTheme(nextTheme))
      return
    }
    setTheme(nextTheme)
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
    if (activeStory.cta === 'fit') openFitSetup()
    if (activeStory.cta === 'install') scrollToInstall()
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
      setFitSetupDismissed(true)
      setFitSetupStep(1)
      setFitSaved(false)
    }, 900)
  }

  return (
    <main className="screen home-screen">
      <header className="home-hero">
        <div className="home-brand-row">
          <div className="home-store-header">
            <StoreLogo store={currentStore} className="home-store-logo--header" />
            <div className="home-store-header__copy">
              <div className="home-store-title-line">
                <h1>{getStoreName(currentStore)}</h1>
                <span className="home-powered-by" aria-label={t('home.poweredBy')}>
                  by
                  <img src={korsetWordmarkSrc} alt="Körset" />
                </span>
              </div>
              <p>
                <HomeIcon name="schedule" />
                <span>{storeHours}</span>
              </p>
            </div>
            <button
              className="home-store-about-button"
              type="button"
              onClick={() => navigate(routes.publicPage)}
            >
              <span>{t('home.storeAbout')}</span>
              <AboutChevronIcon />
            </button>
          </div>

          <div className="home-avatar-wrap">
            <button
              ref={avatarButtonRef}
              className={`home-avatar-button${avatarMenuOpen ? ' is-open' : ''}`}
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
                <div className="home-avatar-menu" role="menu">
                  <div className="home-avatar-menu__identity">
                    <div>
                      <strong>{profileName}</strong>
                      <span>{t('home.menuAccountHint')}</span>
                    </div>
                    <div className="home-avatar-menu__portrait">
                      <button
                        className="home-avatar-menu__portrait-button"
                        type="button"
                        aria-label={t('common.close')}
                        onClick={() => setAvatarMenuOpen(false)}
                      >
                        <ProfileAvatar avatarId={avatarId} name={profileName} rounded="circle" />
                      </button>
                      <button
                        className="home-avatar-menu__edit"
                        type="button"
                        aria-label={t('home.menuEditProfile')}
                        onClick={() => {
                          setAvatarMenuOpen(false)
                          navigate(`${routes.profile}/edit`)
                        }}
                      >
                        <HomeIcon name="edit" />
                      </button>
                    </div>
                  </div>
                  <button
                    className="home-avatar-menu__item"
                    type="button"
                    onClick={() => navigateProfileTab('preferences')}
                  >
                    <HomeIcon name="tune" />
                    <span>{t('home.menuPreferences')}</span>
                    <HomeIcon name="chevron_right" />
                  </button>
                  <button
                    className="home-avatar-menu__item"
                    type="button"
                    onClick={() => navigateProfileTab('favorites')}
                  >
                    <HomeIcon name="favorite" />
                    <span>{t('home.menuFavorites')}</span>
                    <HomeIcon name="chevron_right" />
                  </button>
                  <button
                    className="home-avatar-menu__item"
                    type="button"
                    onClick={() => navigateProfileTab('history')}
                  >
                    <HomeIcon name="history" />
                    <span>{t('home.menuChecks')}</span>
                    <HomeIcon name="chevron_right" />
                  </button>
                  <div className="home-avatar-menu__switches">
                    <div>
                      <span>{t('home.menuLanguage')}</span>
                      <SegmentedToggle
                        ariaLabel={t('home.menuLanguage')}
                        activeKey={lang}
                        onChange={(item) => setLang(item)}
                        options={[
                          { key: 'ru', label: 'RU', ariaLabel: t('common.langRu') },
                          { key: 'kz', label: 'KZ', ariaLabel: t('common.langKzAria') },
                        ]}
                      />
                    </div>
                    <div>
                      <span>{t('home.menuTheme')}</span>
                      <SegmentedToggle
                        ariaLabel={t('home.menuTheme')}
                        activeKey={theme === 'light' ? 'light' : 'dark'}
                        onChange={handleThemeChange}
                        options={[
                          {
                            key: 'light',
                            ariaLabel: t('home.theme.light'),
                            render: (active) => <SunGlyph filled={active} />,
                          },
                          {
                            key: 'dark',
                            ariaLabel: t('home.theme.dark'),
                            render: (active) => <MoonGlyph filled={active} />,
                          },
                        ]}
                      />
                    </div>
                  </div>
                  {!isInstalled && (
                    <button
                      className="home-avatar-menu__install"
                      type="button"
                      onClick={handleMenuInstallClick}
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
              <span className="home-story-card__badge" aria-hidden="true">
                <HomeIcon name={story.icon} />
              </span>
              <strong>{t(`home.stories.${index}.title`, buildStoryVars(currentStore))}</strong>
            </button>
          ))}
        </section>
      </header>

      <section className="home-scan-stage" aria-label={t('home.scanBtn')}>
        <div className="home-scan-card">
          <div className="home-scan-card__copy">
            <p className="home-scan-card__eyebrow">{t('home.scanEyebrow')}</p>
            <h2>{t('home.scanProduct')}</h2>
            <p className="home-scan-card__text">{t('home.scanProductSub')}</p>
            <button
              className="home-scan-card__cta"
              type="button"
              onClick={() => navigate(routes.scan)}
            >
              <HomeIcon name="barcode_scanner" />
              <span>{t('home.scanBtn')}</span>
            </button>
          </div>
          <div className="home-scan-card__visual" aria-hidden="true">
            <img src="/landing/how_step_2.png" alt="" />
            <span className="home-scan-card__badge">{t('home.scanVisualBadge')}</span>
          </div>
        </div>
      </section>

      {fitSetupVisible && (
        <section ref={fitSectionRef} className="home-fit-card home-fit-card--setup">
          <div className="home-fit-card__top">
            <span className="home-fit-card__mark" aria-hidden="true">
              <HomeIcon name={fitSetupStep === 1 ? 'tune' : 'verified'} />
            </span>
            <div className="home-fit-card__headline">
              <p className="home-fit-card__eyebrow">{t('home.fitSetupLabel')}</p>
              <div className="home-fit-card__meta">
                <span className="home-fit-card__status">
                  {fitSetupStep === 1
                    ? t('home.fitSetupStage1Badge')
                    : t('home.fitSetupStage2Badge')}
                </span>
                <span className="home-fit-card__step">
                  {fitSetupStep === 1 ? t('home.fitSetupStage1Pill') : t('home.fitSetupStage2Pill')}
                </span>
              </div>
              <h2>
                {fitSetupStep === 1 ? t('home.fitSetupStage1Title') : t('home.fitSetupStage2Title')}
              </h2>
              <p className="home-fit-card__lede">
                {fitSetupStep === 1 ? t('home.fitSetupStage1Text') : t('home.fitSetupStage2Text')}
              </p>
            </div>
            <button
              className="home-fit-card__dismiss"
              type="button"
              aria-label={t('common.close')}
              onClick={() => setFitSetupDismissed(true)}
            >
              <HomeIcon name="close" />
            </button>
          </div>

          <div className="home-fit-card__grid">
            {fitSetupStep === 1 ? (
              <div className="home-fit-step">
                <div className="home-fit-step__head">
                  <span>1</span>
                  <div>
                    <h3>{t('home.fitPreferencesTitle')}</h3>
                  </div>
                </div>
                <div className="home-fit-step__actions">
                  <p>{t('home.fitSetupStep1Hint')}</p>
                  <button type="button" onClick={() => setFitSetupStep(2)}>
                    <span>{t('home.fitNext')}</span>
                    <HomeIcon name="arrow_forward" />
                  </button>
                </div>
                <div className="home-chip-grid home-chip-grid--icon">
                  <button
                    className={`home-choice-chip home-choice-chip--icon${draftHalal && !draftNoPreferences ? ' is-active' : ''}`}
                    type="button"
                    onClick={() => {
                      setDraftNoPreferences(false)
                      setDraftHalal((value) => !value)
                    }}
                  >
                    <span className="home-choice-chip__icon" aria-hidden="true">
                      <DietIcon name="halal" size={18} />
                    </span>
                    <span>{t('home.preferenceHalal')}</span>
                  </button>
                  {visibleDietPreferences
                    .filter((item) => item.id !== 'halal')
                    .map((item) => (
                      <button
                        className={`home-choice-chip home-choice-chip--icon${
                          draftDietGoals.includes(item.id) && !draftNoPreferences
                            ? ' is-active'
                            : ''
                        }`}
                        key={item.id}
                        type="button"
                        onClick={() => toggleDietGoal(item.id)}
                      >
                        <span className="home-choice-chip__icon" aria-hidden="true">
                          <DietIcon name={item.icon} size={18} />
                        </span>
                        <span>{getLocalizedLabel(item, lang)}</span>
                      </button>
                    ))}
                  <button
                    className={`home-choice-chip home-choice-chip--icon home-choice-chip--full${
                      draftNoPreferences ? ' is-active' : ''
                    }`}
                    type="button"
                    onClick={toggleNoPreferences}
                  >
                    <span className="home-choice-chip__icon" aria-hidden="true">
                      <HomeIcon name="verified" />
                    </span>
                    <span>{t('home.noPreferences')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="home-fit-step">
                <div className="home-fit-step__head">
                  <span>2</span>
                  <div>
                    <h3>{t('home.fitAllergensTitle')}</h3>
                  </div>
                </div>
                <div className="home-fit-step__actions">
                  <p>{t('home.fitSetupStep2Hint')}</p>
                  <div className="home-fit-card__actions">
                    <button
                      type="button"
                      className="home-fit-card__back"
                      onClick={() => setFitSetupStep(1)}
                    >
                      <HomeIcon name="arrow_back" />
                      <span>{t('home.fitBack')}</span>
                    </button>
                    <button type="button" onClick={saveFitSetup}>
                      <span>{t('home.fitSetupCta')}</span>
                      <HomeIcon name="check" />
                    </button>
                  </div>
                </div>
                <div className="home-chip-grid home-chip-grid--icon">
                  {topAllergens.map((item) => (
                    <button
                      className={`home-choice-chip home-choice-chip--icon${
                        draftAllergens.includes(item.id) && !draftNoAllergies ? ' is-active' : ''
                      }`}
                      key={item.id}
                      type="button"
                      onClick={() => toggleAllergen(item.id)}
                    >
                      <span className="home-choice-chip__icon" aria-hidden="true">
                        <DietIcon name={item.icon} size={18} />
                      </span>
                      <span>{getLocalizedLabel(item, lang)}</span>
                    </button>
                  ))}
                  <button
                    className={`home-choice-chip home-choice-chip--icon home-choice-chip--full${
                      draftNoAllergies ? ' is-active' : ''
                    }`}
                    type="button"
                    onClick={toggleNoAllergies}
                  >
                    <span className="home-choice-chip__icon" aria-hidden="true">
                      <HomeIcon name="verified" />
                    </span>
                    <span>{t('home.noAllergies')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

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

      {installHelpVisible && (
        <section
          ref={installSectionRef}
          className="home-install-banner"
          aria-label={t('home.installTitle')}
        >
          <div>
            <strong>{isIos ? t('home.installIosTitle') : t('home.installTitle')}</strong>
            <p>
              {isIos
                ? t('home.installIosText')
                : installPrompt
                  ? t('home.installText')
                  : t('home.installBrowserText')}
            </p>
            {!installPrompt && (
              <ol className="home-install-steps">
                <li>{isIos ? t('home.installStepShare') : t('home.installStepMenu')}</li>
                <li>{isIos ? t('home.installStepHome') : t('home.installStepInstall')}</li>
              </ol>
            )}
          </div>
          <button type="button" onClick={installPrompt ? handleInstallClick : scrollToInstall}>
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
