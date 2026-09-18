import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import SegmentedToggle from '../components/SegmentedToggle.jsx'
import StoryViewer from '../components/home/StoryViewer.jsx'
import FitCheckDrawer from '../components/home/FitCheckDrawer.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { useUserData } from '../contexts/UserDataContext.jsx'
import {
  HOME_STORY_KEYS,
  HOME_DEPARTMENTS,
  AI_PROMPT_CHIPS,
  getShowcaseProducts,
  loadSeenStories,
  markStorySeen,
  sortStoriesBySeen,
} from '../domain/home/homeScreenModel.js'
import { parseStoreSchedule } from '../domain/stores/schedule.js'
import { setLang, useI18n } from '../i18n/index.js'
import { useTheme } from '../utils/theme.js'
import { buildProductPath } from '../utils/routes.js'
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
  const initial = store?.name?.[0]?.toUpperCase() || 'K'

  if (logo) {
    return (
      <img
        className={`home-store-logo ${className}`.trim()}
        src={logo}
        alt={store?.name || 'Store logo'}
        style={{ objectFit: 'contain' }}
      />
    )
  }

  return (
    <div className={`home-store-logo home-store-logo--fallback ${className}`.trim()}>{initial}</div>
  )
}

function isStandalonePwa() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone
}

function getStoreName(store) {
  return store?.name || 'Körset'
}

function getStoreHours(store, t) {
  return (
    store?.opening_hours ||
    STORE_HOURS_FALLBACKS[store?.slug || store?.code] ||
    t('home.openingHoursFallback')
  )
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
  const {
    currentStore,
    isStoreApp,
    isStoreLoading,
    routes,
    isStoreOwnerOrAdmin,
    catalogProducts = [],
  } = useStore()
  const { favoritesCount = 0, toggleFavorite, checkIsFavorite } = useUserData() || {}

  const avatarButtonRef = useRef(null)
  const storeInfoRef = useRef(null)

  const [activeStoryIndex, setActiveStoryIndex] = useState(null)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [seenStories, setSeenStories] = useState(() =>
    isStoreApp && currentStore?.slug ? loadSeenStories(currentStore.slug) : new Set()
  )
  const seenStoreRef = useRef(null)

  const [activePhotoIndex, setActivePhotoIndex] = useState(null)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [fitDrawerOpen, setFitDrawerOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(isStandalonePwa)

  // PWA install prompt handler
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    const handleInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  // Sync seen stories with active store slug
  useEffect(() => {
    if (!isStoreApp || !currentStore?.slug) return
    const slug = currentStore.slug
    if (seenStoreRef.current === slug) return
    seenStoreRef.current = slug
    const fresh = loadSeenStories(slug)
    setSeenStories(fresh)
  }, [isStoreApp, currentStore?.slug])

  // Mark story seen upon viewing
  useEffect(() => {
    if (activeStoryIndex === null) return
    const story = HOME_STORY_KEYS[activeStoryIndex]
    if (!story || !currentStore?.slug) return
    setSeenStories((prev) => {
      if (prev.has(story.key)) return prev
      const next = new Set(prev)
      next.add(story.key)
      markStorySeen(currentStore.slug, story.key)
      return next
    })
  }, [activeStoryIndex, currentStore?.slug])

  const sortedStories = useMemo(
    () => sortStoriesBySeen(HOME_STORY_KEYS, seenStories),
    [seenStories]
  )

  const showcaseProducts = useMemo(() => getShowcaseProducts(catalogProducts, 8), [catalogProducts])

  const storeHours = getStoreHours(currentStore, t)
  const schedule = useMemo(() => parseStoreSchedule(storeHours), [storeHours])

  // Fit-Check configuration status
  const isFitConfigured = useMemo(() => {
    if (!profile) return false
    const hasDiet = Boolean(profile.halal || profile.halalOnly || profile.dietGoals?.length)
    const hasAllergen = Boolean(profile.allergens?.length || profile.customAllergens?.length)
    const hasExplicitNo = Boolean(profile.noDietPreferences && profile.noAllergies)
    return hasDiet || hasAllergen || hasExplicitNo
  }, [profile])

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

  const storeName = getStoreName(currentStore)
  const storeCity = currentStore?.city || 'Астана'
  const storeAddress = currentStore?.address || ''
  const storeUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/s/${currentStore?.slug || currentStore?.code}`
      : ''
  const storeLogo = getStoreLogoUrl(currentStore)
  const fullLogoUrl = storeLogo
    ? storeLogo.startsWith('http')
      ? storeLogo
      : typeof window !== 'undefined'
        ? window.location.origin + storeLogo
        : ''
    : ''

  const profileName = displayName || user?.email || t('profile.title')
  const hasContacts = Boolean(
    currentStore.phone ||
    currentStore.whatsapp_number ||
    currentStore.instagram_url ||
    currentStore.twogis_url
  )

  const activeStory = activeStoryIndex === null ? null : HOME_STORY_KEYS[activeStoryIndex]

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
    if (activeStory.cta === 'fit') setFitDrawerOpen(true)
    if (activeStory.cta === 'catalog') navigate(routes.catalog)
    if (activeStory.cta === 'ai') navigate(routes.ai)
    if (activeStory.cta === 'store') {
      storeInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setActiveStoryIndex(null)
    setActiveSlideIndex(0)
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

  async function handleInstallApp() {
    setAvatarMenuOpen(false)
    if (installPrompt) {
      installPrompt.prompt()
      await installPrompt.userChoice.catch(() => null)
      setInstallPrompt(null)
    }
  }

  function handleProductFavoriteClick(e, product) {
    e.stopPropagation()
    if (toggleFavorite) {
      toggleFavorite(product)
    }
  }

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': 'GroceryStore',
    name: storeName,
    image:
      fullLogoUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/favicon.png`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: storeAddress,
      addressLocality: storeCity,
      addressCountry: 'KZ',
    },
  }

  return (
    <main className="screen home-screen">
      <Helmet>
        <title>{`${storeName} — онлайн-каталог товаров, цены | Körset`}</title>
        <meta
          name="description"
          content={`Смотрите каталог товаров магазина ${storeName} в городе ${storeCity}. Цены, состав продуктов, Fit-Check на аллергены и халал.`}
        />
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
        {storeUrl && <meta property="og:url" content={storeUrl} />}
        {storeUrl && <link rel="canonical" href={storeUrl} />}
        <script type="application/ld+json">{JSON.stringify(schemaOrg)}</script>
      </Helmet>

      {/* 1. STORE HEADER */}
      <header className="home-top-bar">
        <div
          className="home-store-badge"
          role="button"
          tabIndex={0}
          onClick={() => {
            storeInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              storeInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }}
          aria-label={t('home.storeAbout')}
        >
          <StoreLogo store={currentStore} className="home-store-logo--top" />
          <div className="home-store-badge__info">
            <div className="home-store-badge__title-row">
              <h1 className="home-store-badge__name">{storeName}</h1>
              <HomeIcon name="expand_more" className="home-store-badge__arrow" />
              {isStoreOwnerOrAdmin && currentStore?.isPublished === false && (
                <span className="home-draft-badge">{t('home.draftBadge') || 'Черновик'}</span>
              )}
            </div>

            <div className="home-store-badge__sub">
              {schedule.isConfigured && (
                <span className={`home-status-dot${schedule.isOpen ? ' is-open' : ' is-closed'}`} />
              )}
              <span className="home-store-badge__status-text">
                {schedule.isOpen
                  ? t('home.storeClosesAt', { time: schedule.closes }) ||
                    `Открыто до ${schedule.closes}`
                  : schedule.isConfigured
                    ? t('home.storeOpensAt', { time: schedule.opens }) ||
                      `Закрыто до ${schedule.opens}`
                    : storeHours}
              </span>
              {storeAddress && (
                <>
                  <span className="home-store-badge__sep">·</span>
                  <span className="home-store-badge__address">{storeAddress}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Profile Avatar Button & Menu */}
        <div className="home-avatar-wrap">
          <button
            ref={avatarButtonRef}
            className={`home-avatar-button${avatarMenuOpen ? ' is-open' : ''}`}
            type="button"
            aria-label={t('profile.title')}
            aria-expanded={avatarMenuOpen}
            onClick={() => setAvatarMenuOpen((val) => !val)}
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

                <button
                  className="home-avatar-menu__item"
                  type="button"
                  onClick={() => {
                    setAvatarMenuOpen(false)
                    navigate(`${routes.profile}?tab=preferences`)
                  }}
                >
                  <HomeIcon name="tune" />
                  <span>{t('home.menuPreferences')}</span>
                  <HomeIcon name="chevron_right" />
                </button>

                <button
                  className="home-avatar-menu__item"
                  type="button"
                  onClick={() => {
                    setAvatarMenuOpen(false)
                    navigate(`${routes.profile}?tab=favorites`)
                  }}
                >
                  <HomeIcon name="checklist" />
                  <span>{t('home.menuFavorites')}</span>
                  <HomeIcon name="chevron_right" />
                </button>

                <button
                  className="home-avatar-menu__item"
                  type="button"
                  onClick={() => {
                    setAvatarMenuOpen(false)
                    navigate(`${routes.profile}?tab=history`)
                  }}
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
                    onClick={handleInstallApp}
                  >
                    <HomeIcon name="install_mobile" />
                    <span>{t('home.menuInstall')}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* 2. SMART SEARCH & SCAN BAR */}
      <div className="home-search-container">
        <button
          type="button"
          className="home-search-bar"
          onClick={() => navigate(routes.catalog)}
          aria-label={t('catalog.searchPlaceholder')}
        >
          <HomeIcon name="search" className="home-search-bar__icon" />
          <span className="home-search-bar__placeholder">
            {t('home.searchPlaceholder', { count: catalogProducts?.length || 10240 })}
          </span>
          <span
            className="home-search-bar__scan-btn"
            role="button"
            tabIndex={0}
            aria-label={t('home.scanBtn')}
            onClick={(e) => {
              e.stopPropagation()
              navigate(routes.scan)
            }}
          >
            <HomeIcon name="barcode_scanner" />
          </span>
        </button>
      </div>

      {/* 3. STORIES SECTION (ROUND AVATARS / VARIANT A) */}
      <section className="home-stories-bar" aria-label={t('home.storiesLabel')}>
        {sortedStories.map((story) => {
          const originalIndex = HOME_STORY_KEYS.indexOf(story)
          const isSeen = seenStories.has(story.key)
          return (
            <button
              key={story.key}
              type="button"
              className={`home-story-avatar-btn story-tone--${story.tone}${isSeen ? ' is-seen' : ' is-unseen'}`}
              onClick={() => {
                setActiveStoryIndex(originalIndex)
                setActiveSlideIndex(0)
              }}
            >
              <div className="home-story-avatar-ring">
                <div className="home-story-avatar-inner">
                  <HomeIcon name={story.icon} />
                </div>
              </div>
              <span className="home-story-avatar-label">
                {t(`home.stories.${story.key}.title`, { storeName })}
              </span>
            </button>
          )
        })}
      </section>

      {/* 4. COMPACT FIT-CHECK SHIELD WIDGET */}
      <section className="home-shield-widget">
        <button
          type="button"
          className={`home-shield-card${isFitConfigured ? ' is-active' : ' is-pending'}`}
          onClick={() => setFitDrawerOpen(true)}
        >
          <div className="home-shield-card__icon-wrap">
            <span className="material-symbols-outlined home-shield-card__icon">
              shield_with_heart
            </span>
          </div>
          <div className="home-shield-card__content">
            <div className="home-shield-card__title-row">
              <span className="home-shield-card__title">
                {t('home.shieldTitle') || 'Защитный Fit-Check'}
              </span>
              <span className="home-shield-card__badge">
                {isFitConfigured
                  ? t('home.shieldActive') || 'Активен'
                  : t('home.shieldSetupCta') || 'Настроить за 10 сек'}
              </span>
            </div>
            <p className="home-shield-card__desc">
              {isFitConfigured
                ? t('home.shieldConfigured') || 'Халал и персональные фильтры включены'
                : t('home.shieldNotConfigured') || 'Включите фильтр Халал и аллергенов у полки'}
            </p>
          </div>
          <HomeIcon name="chevron_right" className="home-shield-card__chevron" />
        </button>
      </section>

      {/* 5. POPULAR DEPARTMENTS (8 CATEGORIES) */}
      <section className="home-departments-section" aria-label={t('home.departmentsTitle')}>
        <div className="home-section-header">
          <h2>{t('home.departmentsTitle') || 'Отделы магазина'}</h2>
          <button
            type="button"
            className="home-section-header__link"
            onClick={() => navigate(routes.catalog)}
          >
            <span>{t('home.viewAllCatalog') || 'Каталог'}</span>
            <HomeIcon name="chevron_right" />
          </button>
        </div>

        <div className="home-departments-scroll">
          {HOME_DEPARTMENTS.map((dept) => (
            <button
              key={dept.key}
              type="button"
              className="home-dept-pill"
              onClick={() => navigate(routes.catalog, { state: { category: dept.key } })}
            >
              <span className={`home-dept-pill__icon dept-tone--${dept.tone}`}>
                <HomeIcon name={dept.icon} />
              </span>
              <span className="home-dept-pill__label">{t(dept.labelKey) || dept.key}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 6. LIVE SHOWCASE SHELF: «ХИТЫ МАГАЗИНА» */}
      {showcaseProducts.length > 0 && (
        <section className="home-showcase-section" aria-label={t('home.popularTitle')}>
          <div className="home-section-header">
            <div>
              <h2>{t('home.popularTitle') || 'Хиты магазина'}</h2>
              <span className="home-section-header__sub">
                {t('home.popularSubtitle', { storeName }) || `Популярно в ${storeName}`}
              </span>
            </div>
            <button
              type="button"
              className="home-section-header__link"
              onClick={() => navigate(routes.catalog)}
            >
              <span>{t('home.viewAll', { count: catalogProducts.length }) || 'Все товары'}</span>
              <HomeIcon name="chevron_right" />
            </button>
          </div>

          <div className="home-products-scroll">
            {showcaseProducts.map((product) => {
              const isFav = checkIsFavorite ? checkIsFavorite(product.ean) : false
              const isHalal =
                product.halalStatus === 'certified' ||
                product.halalStatus === 'halal' ||
                product.halalStatus === 'yes'

              return (
                <div
                  key={product.ean}
                  className="home-product-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(buildProductPath(currentStore.slug, product.ean))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(buildProductPath(currentStore.slug, product.ean))
                    }
                  }}
                >
                  <div className="home-product-card__image-wrap">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        className="home-product-card__image"
                      />
                    ) : (
                      <div className="home-product-card__placeholder">
                        <HomeIcon name="grocery" />
                      </div>
                    )}

                    {isHalal && (
                      <span className="home-product-card__badge home-product-card__badge--halal">
                        Халал
                      </span>
                    )}

                    <button
                      type="button"
                      className={`home-product-card__fav-btn${isFav ? ' is-active' : ''}`}
                      onClick={(e) => handleProductFavoriteClick(e, product)}
                      aria-label={isFav ? t('home.addedToCart') : t('home.addToCart')}
                    >
                      <HomeIcon name={isFav ? 'check' : 'add'} />
                    </button>
                  </div>

                  <div className="home-product-card__info">
                    <div className="home-product-card__price">
                      {product.priceKzt ? `${product.priceKzt.toLocaleString('ru-RU')} ₸` : ''}
                    </div>
                    <h3 className="home-product-card__name">{product.name}</h3>
                    {product.quantity && (
                      <span className="home-product-card__qty">{product.quantity}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 7. AI CHEF / ASSISTANT BAR */}
      <section className="home-ai-chef-card">
        <div className="home-ai-chef-card__header">
          <div className="home-ai-chef-card__icon">
            <HomeIcon name="auto_awesome" />
          </div>
          <div>
            <h3 className="home-ai-chef-card__title">
              {t('home.aiChefTitle') || 'ИИ-Шеф магазина'}
            </h3>
            <p className="home-ai-chef-card__subtitle">
              {t('home.aiChefSubtitle') || 'Подберет рецепт или товары из наличия'}
            </p>
          </div>
        </div>

        <div className="home-ai-chips">
          {AI_PROMPT_CHIPS.map((chip) => {
            const promptText = t(chip.promptKey)
            return (
              <button
                key={chip.key}
                type="button"
                className="home-ai-chip"
                onClick={() => navigate(routes.ai, { state: { initialPrompt: promptText } })}
              >
                <HomeIcon name={chip.icon} />
                <span>{promptText}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* 8. SHOPPING LIST SUMMARY (WHEN ITEMS EXIST) */}
      {favoritesCount > 0 && (
        <section className="home-shopping-summary">
          <button
            type="button"
            className="home-shopping-card"
            onClick={() => navigate(`${routes.profile}?tab=favorites`)}
          >
            <div className="home-shopping-card__icon">
              <HomeIcon name="checklist" />
            </div>
            <div className="home-shopping-card__info">
              <h4>{t('home.shoppingListTitle') || 'Ваш список покупок'}</h4>
              <p>
                {t('home.shoppingItemsCount', { count: favoritesCount }) ||
                  `${favoritesCount} товаров в списке`}
              </p>
            </div>
            <HomeIcon name="chevron_right" className="home-shopping-card__arrow" />
          </button>
        </section>
      )}

      {/* 9. STORE LOCATION, PHOTOS & CONTACTS */}
      <section ref={storeInfoRef} className="home-store-details-section">
        <div className="home-section-header">
          <h2>{t('home.storeAboutTitle', { storeName }) || `О магазине ${storeName}`}</h2>
        </div>

        {/* Store Interior Photos Carousel with Lightbox */}
        {currentStore?.images && currentStore.images.length > 0 && (
          <div className="home-store-photos-carousel">
            {currentStore.images.map((url, idx) => (
              <div
                key={url}
                className="home-store-photo-thumb"
                onClick={() => setActivePhotoIndex(idx)}
                role="button"
                tabIndex={0}
                aria-label={`Photo ${idx + 1}`}
              >
                <img src={url} alt={`${storeName} ${idx + 1}`} loading="lazy" />
              </div>
            ))}
          </div>
        )}

        {/* Store Contacts & Facts */}
        <div className="home-store-facts-card">
          {storeAddress && (
            <div className="home-store-fact-row">
              <HomeIcon name="location_on" />
              <span>
                {storeCity} · {storeAddress}
              </span>
            </div>
          )}
          <div className="home-store-fact-row">
            <HomeIcon name="schedule" />
            <span>{storeHours}</span>
          </div>

          {hasContacts && (
            <div className="home-store-contact-buttons">
              {currentStore.twogis_url && (
                <a
                  href={currentStore.twogis_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="home-store-contact-btn home-store-contact-btn--2gis"
                >
                  <span className="home-btn-glyph">2G</span>
                  <span>{t('home.storeRoute2Gis') || '2GIS'}</span>
                </a>
              )}
              {currentStore.whatsapp_number && (
                <a
                  href={`https://wa.me/${currentStore.whatsapp_number.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="home-store-contact-btn home-store-contact-btn--wa"
                >
                  <span className="home-btn-glyph">WA</span>
                  <span>WhatsApp</span>
                </a>
              )}
              {currentStore.phone && (
                <a
                  href={`tel:${currentStore.phone.replace(/[^\d+]/g, '')}`}
                  className="home-store-contact-btn home-store-contact-btn--call"
                >
                  <HomeIcon name="call" />
                  <span>{t('home.storeCall') || 'Звонок'}</span>
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox for Store Photos */}
      {activePhotoIndex !== null && currentStore?.images && (
        <div
          className="home-lightbox-modal"
          onClick={() => setActivePhotoIndex(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="home-lightbox-close"
            onClick={() => setActivePhotoIndex(null)}
            aria-label={t('common.close')}
          >
            <HomeIcon name="close" />
          </button>
          <img
            src={currentStore.images[activePhotoIndex]}
            alt="Store full view"
            className="home-lightbox-img"
          />
        </div>
      )}

      {/* MODAL / SHEET: FitCheck Drawer */}
      <FitCheckDrawer
        open={fitDrawerOpen}
        onClose={() => setFitDrawerOpen(false)}
        profile={profile}
        updateProfile={updateProfile}
        onOpenFullPreferences={() => navigate(`${routes.profile}?tab=preferences`)}
      />

      {/* MODAL: Standalone Cinematic Story Viewer */}
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
