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
import { Helmet } from 'react-helmet-async'
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
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
      {name}
    </span>
  )
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

function buildStoryVars(store, catalogProducts = []) {
  return {
    storeName: getStoreName(store),
    catalogCount: catalogProducts?.length || 0,
    address: [store?.city, store?.address].filter(Boolean).join(', ') || '',
  }
}

function StoryViewer({
  story,
  storyIndex,
  slideIndex,
  store,
  catalogProducts,
  t,
  onClose,
  onSlide,
  onCta,
}) {
  const slideKey = story.slides[slideIndex] || story.slides[0]
  const vars = buildStoryVars(store, catalogProducts)

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
  const { currentStore, isStoreApp, isStoreLoading, routes, isStoreOwnerOrAdmin, catalogProducts } =
    useStore()
  const avatarButtonRef = useRef(null)
  const fitSectionRef = useRef(null)
  const installSectionRef = useRef(null)
  const [activeStoryIndex, setActiveStoryIndex] = useState(null)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [activePhotoIndex, setActivePhotoIndex] = useState(null)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [fitSetupDismissed, setFitSetupDismissed] = useState(false)
  const [fitSetupStep, setFitSetupStep] = useState(1)
  const [draftDietGoals, setDraftDietGoals] = useState(profile?.dietGoals || [])
  const [draftHalal, setDraftHalal] = useState(Boolean(profile?.halal))
  const [draftNoPreferences, setDraftNoPreferences] = useState(Boolean(profile?.noDietPreferences))
  const [draftAllergens, setDraftAllergens] = useState(profile?.allergens || [])
  const [draftCustomAllergens, setDraftCustomAllergens] = useState(profile?.customAllergens || [])
  const [draftNoAllergies, setDraftNoAllergies] = useState(Boolean(profile?.noAllergies))
  const [customAllergenInput, setCustomAllergenInput] = useState('')
  const [showAllAllergens, setShowAllAllergens] = useState(false)
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
    setDraftCustomAllergens(profile?.customAllergens || [])
    setDraftNoAllergies(Boolean(profile?.noAllergies))
    setCustomAllergenInput('')
    setShowAllAllergens(false)
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

  const primaryAllergens = useMemo(
    () => ALLERGENS.filter((item) => item.frequency >= 2).slice(0, 6),
    []
  )
  const visibleAllergens = showAllAllergens ? ALLERGENS : primaryAllergens
  const hasHiddenAllergens = primaryAllergens.length < ALLERGENS.length
  const visibleDietPreferences = DIET_PREFERENCES

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
  const isIos = isIosDevice()
  const hasContacts = Boolean(
    currentStore.phone ||
    currentStore.whatsapp_number ||
    currentStore.instagram_url ||
    currentStore.twogis_url
  )
  const storeHours = getStoreHours(currentStore, t)
  const storeFacts = buildHomeStoreFacts(currentStore, storeHours)
  const actions = buildHomeQuickActions({ routes })
  const fitSetup = buildFitCheckSetupState(profile)
  const fitSetupVisible = !fitSetup.isComplete && !fitSetupDismissed
  const activeStory = activeStoryIndex === null ? null : HOME_STORY_KEYS[activeStoryIndex]
  const installHelpVisible = !isInstalled && !installDismissed
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
    if (activeStory.cta === 'catalog') navigate(routes.catalog)
    if (activeStory.cta === 'ai') navigate(routes.ai)
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
    setDraftCustomAllergens([])
    setCustomAllergenInput('')
  }

  function addCustomAllergen() {
    const value = customAllergenInput.trim()
    if (!value) return
    const normalized = value.toLowerCase()
    const alreadyExists = draftCustomAllergens.some((item) => item.toLowerCase() === normalized)
    if (alreadyExists) {
      setCustomAllergenInput('')
      return
    }
    setDraftNoAllergies(false)
    setDraftCustomAllergens((items) => [...items, value])
    setCustomAllergenInput('')
  }

  function removeCustomAllergen(value) {
    setDraftCustomAllergens((items) => items.filter((item) => item !== value))
  }

  async function saveFitSetup() {
    await updateProfile({
      halal: draftNoPreferences ? false : draftHalal,
      dietGoals: draftNoPreferences ? [] : draftDietGoals,
      noDietPreferences: draftNoPreferences,
      allergens: draftNoAllergies ? [] : draftAllergens,
      customAllergens: draftNoAllergies ? [] : draftCustomAllergens,
      noAllergies: draftNoAllergies,
    })
    window.setTimeout(() => {
      setFitSetupDismissed(true)
      setFitSetupStep(1)
    }, 900)
  }

  const storeName = getStoreName(currentStore)
  const storeCity = currentStore?.city || 'Астана'
  const storeAddress = currentStore?.address || ''
  const storeUrl = window.location.origin + `/s/${currentStore?.slug || currentStore?.code}`
  const storeLogo = getStoreLogoUrl(currentStore)
  const fullLogoUrl = storeLogo
    ? storeLogo.startsWith('http')
      ? storeLogo
      : window.location.origin + storeLogo
    : ''

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': 'GroceryStore',
    name: storeName,
    image: fullLogoUrl || `${window.location.origin}/favicon.png`,
    url: storeUrl,
    telephone: currentStore?.phone || '',
    address: {
      '@type': 'PostalAddress',
      addressLocality: storeCity,
      streetAddress: storeAddress,
      addressCountry: 'KZ',
    },
    priceRange: '$$',
  }

  if (currentStore?.latitude && currentStore?.longitude) {
    schemaOrg.geo = {
      '@type': 'GeoCoordinates',
      latitude: Number(currentStore.latitude),
      longitude: Number(currentStore.longitude),
    }
  }

  if (currentStore?.opening_hours) {
    const hoursParts = currentStore.opening_hours.split('-')
    const opens = (hoursParts[0] || '').trim()
    const closes = (hoursParts[1] || '').trim()
    if (opens && closes) {
      schemaOrg.openingHoursSpecification = {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens,
        closes,
      }
    }
  }

  return (
    <main className="screen home-screen">
      <Helmet>
        <title>{`${storeName} — онлайн-каталог товаров, цены | Körset`}</title>
        <meta
          name="description"
          content={`Смотрите каталог товаров магазина ${storeName} в городе ${storeCity}. Цены, состав продуктов, Fit-Check на аллергены и халал.`}
        />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content={`${storeName} — онлайн-каталог товаров, цены | Körset`}
        />
        <meta
          property="og:description"
          content={`Смотрите каталог товаров магазина ${storeName} в городе ${storeCity}. Цены, состав продуктов, Fit-Check на аллергены и халал.`}
        />
        {fullLogoUrl && <meta property="og:image" content={fullLogoUrl} />}
        <meta property="og:url" content={storeUrl} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={`${storeName} — онлайн-каталог товаров, цены | Körset`}
        />
        <meta
          name="twitter:description"
          content={`Смотрите каталог товаров магазина ${storeName} в городе ${storeCity}. Цены, состав продуктов, Fit-Check на аллергены и халал.`}
        />
        {fullLogoUrl && <meta name="twitter:image" content={fullLogoUrl} />}

        {/* Canonical */}
        <link rel="canonical" href={storeUrl} />

        {/* Structured Data */}
        <script type="application/ld+json">{JSON.stringify(schemaOrg)}</script>
      </Helmet>
      <header className="home-hero">
        <div className="home-brand-row">
          <div
            className="home-store-header"
            onClick={() => navigate(routes.publicPage)}
            role="button"
            tabIndex={0}
            aria-label={t('home.storeAbout')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                navigate(routes.publicPage)
              }
            }}
          >
            <StoreLogo store={currentStore} className="home-store-logo--header" />
            <div className="home-store-header__copy">
              <div className="home-store-title-line">
                <h1>{getStoreName(currentStore)}</h1>
                <HomeIcon name="chevron_right" className="home-store-chevron" />
                {isStoreOwnerOrAdmin && currentStore?.isPublished === false && (
                  <span
                    className="home-draft-badge"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: '#F59E0B',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginLeft: 8,
                      verticalAlign: 'middle',
                      height: 'fit-content',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 10 }}>
                      visibility_off
                    </span>
                    {t('home.draftBadge') || 'Черновик'}
                  </span>
                )}
              </div>
              <p>
                <HomeIcon name="schedule" />
                <span>{storeHours}</span>
                <span className="home-store-more-dot">·</span>
                <span className="home-store-more-text">{t('home.storeAbout')}</span>
              </p>
            </div>
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

        {/* Store Photos Carousel */}
        {currentStore?.images && currentStore.images.length > 0 && (
          <div
            className="home-photos-carousel"
            style={{
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              padding: '0 20px 16px',
              margin: '12px -20px 0',
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {currentStore.images.map((url, idx) => (
              <div
                key={url}
                style={{
                  flex: '0 0 140px',
                  height: 94,
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: '1.5px solid var(--glass-soft-border)',
                  background: 'var(--input-bg)',
                  scrollSnapAlign: 'start',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-card)',
                }}
                onClick={() => setActivePhotoIndex(idx)}
              >
                <img
                  src={url}
                  alt={`${storeName} photo ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Lightbox for Store Photos */}
        {activePhotoIndex !== null && currentStore?.images && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2000,
              background: 'rgba(0,0,0,0.92)',
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
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: 40,
                height: 40,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setActivePhotoIndex(null)}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <img
              src={currentStore.images[activePhotoIndex]}
              alt="Store full view"
              style={{ maxWidth: '90%', maxHeight: '85%', objectFit: 'contain', borderRadius: 12 }}
            />
          </div>
        )}

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
              <strong>
                {t(`home.stories.${index}.title`, buildStoryVars(currentStore, catalogProducts))}
              </strong>
            </button>
          ))}
        </section>
      </header>

      {fitSetupVisible && (
        <section ref={fitSectionRef} className="home-fit-card home-fit-card--setup">
          <div className="home-fit-card__top">
            <div className="home-fit-card__headline">
              <div className="home-fit-card__meta">
                <span className="home-fit-card__status">
                  {fitSetupStep === 1
                    ? t('home.fitSetupStage1Badge')
                    : t('home.fitSetupStage2Badge')}
                </span>
              </div>
              <h2 className={fitSetupStep === 1 ? 'home-fit-card__title-single' : ''}>
                {fitSetupStep === 1 ? t('home.fitSetupStage1Title') : t('home.fitSetupStage2Title')}
              </h2>
              <p className="home-fit-card__lede">
                {fitSetupStep === 1 ? t('home.fitSetupStage1Text') : t('home.fitSetupStage2Text')}
              </p>
            </div>
            <button
              className="home-fit-card__dismiss"
              type="button"
              aria-label={t('home.fitSetupLater')}
              onClick={() => setFitSetupDismissed(true)}
            >
              <span>{t('home.fitSetupLater')}</span>
            </button>
          </div>

          <div className="home-fit-card__grid">
            {fitSetupStep === 1 ? (
              <>
                <div className="home-chip-grid home-chip-grid--icon home-chip-grid--icon-wide">
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
                    className={`home-choice-chip home-choice-chip--icon home-choice-chip--summary${
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
                <div className="home-fit-card__actions home-fit-card__actions--solo">
                  <button
                    type="button"
                    className="home-fit-card__primary"
                    onClick={() => setFitSetupStep(2)}
                  >
                    <span>{t('home.fitNext')}</span>
                    <HomeIcon name="east" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="home-chip-grid home-chip-grid--icon">
                  {visibleAllergens.map((item) => (
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
                </div>
                {hasHiddenAllergens && (
                  <button
                    className="home-fit-step__toggle"
                    type="button"
                    onClick={() => setShowAllAllergens((value) => !value)}
                  >
                    <span>
                      {showAllAllergens
                        ? t('home.fitShowLessAllergens')
                        : t('home.fitShowAllAllergens')}
                    </span>
                    <HomeIcon name={showAllAllergens ? 'expand_less' : 'expand_more'} />
                  </button>
                )}
                <div className="home-fit-custom">
                  <label className="home-fit-custom__label" htmlFor="home-custom-allergen">
                    {t('home.fitCustomAllergenLabel')}
                  </label>
                  <div className="home-fit-custom__input-row">
                    <input
                      id="home-custom-allergen"
                      className="home-fit-custom__input"
                      type="text"
                      value={customAllergenInput}
                      onChange={(event) => setCustomAllergenInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addCustomAllergen()
                        }
                      }}
                      placeholder={t('profile.customPlaceholder')}
                    />
                    <button
                      type="button"
                      className="home-fit-card__primary home-fit-card__primary--compact"
                      onClick={addCustomAllergen}
                    >
                      {t('profile.add')}
                    </button>
                  </div>
                  {draftCustomAllergens.length > 0 && (
                    <div className="home-fit-custom__list">
                      {draftCustomAllergens.map((item) => (
                        <button
                          className="home-fit-custom__pill"
                          key={item}
                          type="button"
                          onClick={() => removeCustomAllergen(item)}
                        >
                          <span>{item}</span>
                          <HomeIcon name="close" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className={`home-choice-chip home-choice-chip--icon home-choice-chip--summary home-choice-chip--summary-soft${
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
                <div className="home-fit-card__actions">
                  <button
                    type="button"
                    className="home-fit-card__back"
                    onClick={() => setFitSetupStep(1)}
                  >
                    <HomeIcon name="west" />
                    <span>{t('home.fitBack')}</span>
                  </button>
                  <button type="button" className="home-fit-card__primary" onClick={saveFitSetup}>
                    <span>{t('home.fitSetupCta')}</span>
                    <HomeIcon name="check_circle" />
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <section className="home-actions" aria-label={t('home.quickActions')}>
        {actions.map((action) => (
          <button
            className={`home-action-card home-action-card--${action.key}`}
            key={action.key}
            type="button"
            onClick={() =>
              navigate(action.path, action.navState ? { state: action.navState } : undefined)
            }
          >
            <span className="home-action-card__icon">
              <HomeIcon name={action.icon} />
            </span>
            <span className="home-action-card__copy">
              <strong>{t(action.titleKey)}</strong>
              <small>{t(action.textKey)}</small>
            </span>
          </button>
        ))}
      </section>

      {installHelpVisible && (
        <section
          ref={installSectionRef}
          className="home-install-card"
          aria-label={t('home.installTitle')}
        >
          <div className="home-install-card__visual" aria-hidden="true">
            <div className="home-install-card__app-icon">
              <HomeIcon name="barcode_scanner" />
            </div>
            <div className="home-install-card__phone">
              <span />
              <strong>Körset</strong>
              <small>{t('home.installVisualText')}</small>
            </div>
          </div>
          <div className="home-install-card__content">
            <span className="home-install-card__label">{t('home.installLabel')}</span>
            <div className="home-install-card__headline">
              <h2>{isIos ? t('home.installIosTitle') : t('home.installTitle')}</h2>
              <button type="button" onClick={dismissInstall} aria-label={t('common.close')}>
                <HomeIcon name="close" />
              </button>
            </div>
            <p>
              {isIos
                ? t('home.installIosText')
                : installPrompt
                  ? t('home.installText')
                  : t('home.installBrowserText')}
            </p>
            <div className="home-install-benefits" aria-label={t('home.installBenefitsLabel')}>
              {[0, 1, 2].map((item) => (
                <span key={item}>
                  <HomeIcon
                    name={item === 0 ? 'bolt' : item === 1 ? 'inventory_2' : 'storefront'}
                  />
                  {t(`home.installBenefit${item + 1}`)}
                </span>
              ))}
            </div>
            {installPrompt ? (
              <button className="home-install-card__cta" type="button" onClick={handleInstallClick}>
                <span>{t('home.installCta')}</span>
                <HomeIcon name="download" />
              </button>
            ) : (
              <div className="home-install-guide">
                <span className="home-install-guide__title">{t('home.installGuideTitle')}</span>
                <ol className="home-install-steps">
                  <li>{isIos ? t('home.installStepShare') : t('home.installStepMenu')}</li>
                  <li>{isIos ? t('home.installStepHome') : t('home.installStepInstall')}</li>
                </ol>
              </div>
            )}
          </div>
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
          catalogProducts={catalogProducts}
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
