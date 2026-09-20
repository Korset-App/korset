import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import KorsetAvatar from '../components/KorsetAvatar.jsx'
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
  AI_PROMPT_SETS,
  getRotatedAIPrompts,
  getHomeDeptLabel,
  getShowcaseProducts,
  getProductDisplayBadges,
  getProductBadgeSummary,
  getStorePopularityMap,
  recordProductView,
  recordProductFavorite,
  loadSeenStories,
  loadStoryProgress,
  recordStorySlideView,
  markStorySeen,
  clearSeenStories,
  sortStoriesBySeen,
} from '../domain/home/homeScreenModel.js'
import { parseStoreSchedule } from '../domain/stores/schedule.js'
import { getCategoryLabel } from '../domain/product/categoryMap.js'
import { setLang, useI18n } from '../i18n/index.js'
import { useTheme } from '../utils/theme.js'
import { buildProductPath } from '../utils/routes.js'
import { WalletIcon } from '../components/icons/WalletIcon.jsx'
import { IconGallery } from '../components/icons/IconGallery.jsx'
import {
  StorefrontIcon,
  BarcodeScannerIcon,
  InventoryIcon,
  SparklesIcon,
} from '../components/icons/index.js'
import { DietIcon } from './ProfileScreen.jsx'
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

function SearchIcon({ className = '', width = 20, height = 20 }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 72 72"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M28.131 10.632c-6.262 0-12.141 3.348-15.342 8.738-.282.474-.126 1.089.349 1.37.16.096.336.141.51.141.342 0 .674-.174.861-.489 2.843-4.786 8.062-7.76 13.622-7.76.553 0 1-.447 1-1 0-.553-.447-1-1-1zM11.967 23.646a1 1 0 00-1.201.746c-.299 1.276-.468 2.067-.468 3.487 0 .553.448 1 1 1s1-.447 1-1c0-1.205.135-1.834.415-3.032a1 1 0 00-.746-1.201zM66.613 57.793L50.471 41.652a13.5 13.5 0 00-1.17-.877 24.46 24.46 0 003.33-12.311c0-13.51-10.99-24.5-24.5-24.5S3.631 14.954 3.631 28.464s10.991 24.5 24.5 24.5c4.81 0 9.296-1.399 13.084-3.801.205.339.462.666.77.974l16.142 16.143a5.99 5.99 0 004.244 1.756 5.99 5.99 0 004.243-1.756 5.99 5.99 0 001.756-4.242 5.99 5.99 0 00-1.756-4.244zM7.631 28.465c0-11.304 9.196-20.5 20.5-20.5s20.5 9.196 20.5 20.5-9.197 20.5-20.5 20.5-20.5-9.196-20.5-20.5zm56.153 34.986a2 2 0 01-2.83 0L44.813 47.309c-.14-.139-.192-.232-.199-.232.003-.043.058-.455 1.201-1.596 1.14-1.143 1.552-1.195 1.565-1.203.026.008.119.06.263.203l16.14 16.141a2 2 0 010 2.829z" />
    </svg>
  )
}

function HomeIcon({ name, className = '' }) {
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
      {name}
    </span>
  )
}

function PreferenceSlidersIcon({ size = 18, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
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
  )
}

function StoryCardIcon({ name, size = 13 }) {
  switch (name) {
    case 'storefront':
      return <StorefrontIcon size={size} color="#ffffff" />
    case 'auto_stories':
      return <InventoryIcon size={size} color="#ffffff" strokeWidth={1.8} />
    case 'barcode_scanner':
      return <BarcodeScannerIcon size={size} color="#ffffff" strokeWidth={1.8} />
    case 'shield_with_heart':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path
            d="M12 8a2.2 2.2 0 0 0-3.1 0 2.2 2.2 0 0 0 0 3.1L12 14.2l3.1-3.1a2.2 2.2 0 0 0 0-3.1 2.2 2.2 0 0 0-3.1 0z"
            fill="rgba(255,255,255,0.3)"
          />
        </svg>
      )
    case 'sparkles':
      return <SparklesIcon size={size} color="#ffffff" />
    default:
      return <HomeIcon name={name} />
  }
}

function BottomNavAiIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 1.99996C12.9057 1.99996 13.7829 2.12194 14.6172 2.34762C14.2223 3.14741 14 4.04768 14 4.99997C14 8.31368 16.6863 11 20 11C20.6685 11 21.3106 10.8882 21.9111 10.6865C21.9676 11.1165 22 11.5546 22 12C22 17.5228 17.5228 22 12 22C10.2975 22 8.69425 21.5746 7.29102 20.8242L2 22L3.17578 16.709C2.42542 15.3057 2 13.7025 2 12C2.00002 6.47714 6.47717 1.99996 12 1.99996ZM19.5293 1.3193C19.7058 0.893513 20.2942 0.8935 20.4707 1.3193L20.7236 1.93063C21.1555 2.97343 21.9615 3.80614 22.9746 4.2568L23.6914 4.57614C24.1022 4.75882 24.1022 5.35635 23.6914 5.53903L22.9326 5.87692C21.945 6.3162 21.1534 7.11943 20.7139 8.1279L20.4668 8.69333C20.2863 9.10747 19.7136 9.10747 19.5332 8.69333L19.2861 8.1279C18.8466 7.11942 18.0551 6.3162 17.0674 5.87692L16.3076 5.53903C15.8974 5.35618 15.8974 4.75895 16.3076 4.57614L17.0254 4.2568C18.0384 3.80614 18.8445 2.97343 19.2764 1.93063L19.5293 1.3193Z" />
    </svg>
  )
}

function BurgerIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 10a8 8 0 0 1 16 0H4z" />
      <rect x="2" y="13" width="20" height="3" rx="1.5" />
      <path d="M4 19a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1H4v1z" />
    </svg>
  )
}

function BreakfastIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <ellipse cx="12" cy="14" rx="8" ry="5" />
      <circle cx="12" cy="13" r="2.5" fill="currentColor" fillOpacity="0.25" />
      <path d="M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <line x1="8" y1="2" x2="8" y2="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="16" y1="2" x2="16" y2="4" />
    </svg>
  )
}

function SoupIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 11h18a1 1 0 0 1 1 1 8 8 0 0 1-8 8H10a8 8 0 0 1-8-8 1 1 0 0 1 1-1z" />
      <path d="M7 21h10" />
      <path d="M9 5c0 1.2.8 2 1 3M12 4c0 1.2.8 2 1 3M15 5c0 1.2.8 2 1 3" strokeWidth="1.4" />
    </svg>
  )
}

function TeaCupIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v7a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="2" x2="6" y2="4" strokeWidth="1.4" />
      <line x1="10" y1="2" x2="10" y2="4" strokeWidth="1.4" />
      <line x1="14" y1="2" x2="14" y2="4" strokeWidth="1.4" />
    </svg>
  )
}

function SaladIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 12h18a8 8 0 0 1-16 0z" />
      <path d="M12 12V4a4 4 0 0 1 4 4" />
      <path d="M8 8a3 3 0 0 1 4-3" />
    </svg>
  )
}

function AiArrowRightIcon({ size = 14, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function AiShuffleIcon({ size = 13, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function MicIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function AiArrowUpIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  )
}

function getAiScenarioIcon(iconKey, size = 16) {
  switch (iconKey) {
    case 'burger':
      return <BurgerIcon size={size} />
    case 'wallet':
      return <WalletIcon size={size} />
    case 'breakfast':
      return <BreakfastIcon size={size} />
    case 'halal':
      return <DietIcon name="halal" size={size} />
    case 'soup':
      return <SoupIcon size={size} />
    case 'sugar_free':
    case 'apple':
      return <DietIcon name="nosugar" size={size} />
    case 'tea':
      return <TeaCupIcon size={size} />
    case 'salad':
      return <SaladIcon size={size} />
    default:
      return <BottomNavAiIcon size={size} />
  }
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

  const [activeStoryKey, setActiveStoryKey] = useState(null)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [seenStories, setSeenStories] = useState(() =>
    isStoreApp && currentStore?.slug ? loadSeenStories(currentStore.slug) : new Set()
  )
  const [storyProgress, setStoryProgress] = useState(() =>
    isStoreApp && currentStore?.slug ? loadStoryProgress(currentStore.slug) : {}
  )
  const seenStoreRef = useRef(null)

  const [activePhotoIndex, setActivePhotoIndex] = useState(null)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [fitDrawerOpen, setFitDrawerOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(isStandalonePwa)
  const [failedImageEans, setFailedImageEans] = useState(() => new Set())

  // AI Chef block state & rotation logic
  const [aiQuery, setAiQuery] = useState('')
  const [aiPromptSetIndex, setAiPromptSetIndex] = useState(() => {
    if (typeof window === 'undefined') return 0
    const saved = window.localStorage.getItem('korset_home_ai_prompt_set')
    const count = Number(saved) || 0
    return count % (AI_PROMPT_SETS.length || 1)
  })

  const handleShuffleAiPrompts = () => {
    setAiPromptSetIndex((prev) => {
      const next = (prev + 1) % (AI_PROMPT_SETS.length || 1)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('korset_home_ai_prompt_set', String(next))
      }
      return next
    })
  }

  const handleAiSubmit = (e) => {
    if (e) e.preventDefault()
    const text = aiQuery.trim()
    if (!text) return
    navigate(routes.ai, { state: { initialPrompt: text } })
  }

  const handleAiPromptClick = (promptText) => {
    navigate(routes.ai, { state: { initialPrompt: promptText } })
  }

  const handleOpenAiCamera = () => {
    navigate(routes.ai, { state: { openCamera: true, openImagePicker: true } })
  }

  const handleStartAiVoice = () => {
    navigate(routes.ai, { state: { startVoice: true } })
  }

  const currentAiPrompts = useMemo(() => getRotatedAIPrompts(aiPromptSetIndex), [aiPromptSetIndex])

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

  // Sync seen stories and progress with active store slug
  useEffect(() => {
    if (!isStoreApp || !currentStore?.slug) return
    const slug = currentStore.slug
    if (seenStoreRef.current === slug) return
    seenStoreRef.current = slug
    setSeenStories(loadSeenStories(slug))
    setStoryProgress(loadStoryProgress(slug))
  }, [isStoreApp, currentStore?.slug])

  // Track progress on individual slide views
  const handleStorySlideView = (storyKey, slideIndex, totalSlides) => {
    if (!currentStore?.slug || !storyKey) return
    const { progressMap, isFullySeen } = recordStorySlideView(
      currentStore.slug,
      storyKey,
      slideIndex,
      totalSlides
    )
    setStoryProgress(progressMap)
    if (isFullySeen) {
      setSeenStories((prev) => {
        if (prev.has(storyKey)) return prev
        const next = new Set(prev)
        next.add(storyKey)
        return next
      })
    }
  }

  const sortedStories = useMemo(
    () => sortStoriesBySeen(HOME_STORY_KEYS, seenStories, storyProgress),
    [seenStories, storyProgress]
  )

  const popularityMap = useMemo(
    () => getStorePopularityMap(currentStore?.slug),
    [currentStore?.slug, favoritesCount]
  )

  const rawShowcaseProducts = useMemo(
    () => getShowcaseProducts(catalogProducts, 12, popularityMap),
    [catalogProducts, popularityMap]
  )

  const showcaseProducts = useMemo(
    () => rawShowcaseProducts.filter((product) => !failedImageEans.has(product.ean)),
    [rawShowcaseProducts, failedImageEans]
  )

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

  const QUICK_TOGGLES = useMemo(() => {
    const toggleDiet = (goalId) => {
      const diets = profile?.dietGoals || []
      const next = diets.includes(goalId) ? diets.filter((d) => d !== goalId) : [...diets, goalId]
      updateProfile({ dietGoals: next })
    }

    return [
      {
        id: 'halal',
        labelKey: 'home.filterHalal',
        fallback: 'Халал',
        iconName: 'halal',
        isActive: Boolean(profile?.halal || profile?.halalOnly),
        toggle: () => updateProfile({ halal: !(profile?.halal || profile?.halalOnly) }),
      },
      {
        id: 'sugar_free',
        labelKey: 'home.filterSugarFree',
        fallback: 'Без сахара',
        iconName: 'nosugar',
        isActive: (profile?.dietGoals || []).includes('sugar_free'),
        toggle: () => toggleDiet('sugar_free'),
      },
      {
        id: 'lactose_free',
        labelKey: 'home.filterLactoseFree',
        fallback: 'Без лактозы',
        iconName: 'nodairy',
        isActive: (profile?.dietGoals || []).includes('lactose_free'),
        toggle: () => toggleDiet('lactose_free'),
      },
      {
        id: 'gluten_free',
        labelKey: 'home.filterGlutenFree',
        fallback: 'Без глютена',
        iconName: 'nogluten',
        isActive: (profile?.dietGoals || []).includes('gluten_free'),
        toggle: () => toggleDiet('gluten_free'),
      },
      {
        id: 'vegan',
        labelKey: 'home.filterVegan',
        fallback: 'Веган',
        iconName: 'vegan',
        isActive: (profile?.dietGoals || []).includes('vegan'),
        toggle: () => toggleDiet('vegan'),
      },
    ]
  }, [profile, updateProfile])

  const categoryProductCounts = useMemo(() => {
    if (!Array.isArray(catalogProducts) || catalogProducts.length === 0) return {}
    const counts = {}
    for (const p of catalogProducts) {
      const cat = p.category || p.category_id
      if (cat) counts[cat] = (counts[cat] || 0) + 1
    }
    return counts
  }, [catalogProducts])

  const getDeptProductCount = (deptKey) => {
    const real = categoryProductCounts[deptKey]
    if (real && real > 0) return real
    const FALLBACK_COUNTS = {
      dairy_eggs: 480,
      sweets: 820,
      meat: 340,
      bread: 210,
      drinks: 650,
      fruits_veg: 290,
      grocery: 1150,
      frozen: 310,
    }
    return FALLBACK_COUNTS[deptKey] || 280
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (profile?.halal || profile?.halalOnly) count++
    count += (profile?.dietGoals || []).length
    count += (profile?.allergens || []).length
    count += (profile?.customAllergens || []).length
    return count
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

  const activeStory = activeStoryKey
    ? HOME_STORY_KEYS.find((s) => s.key === activeStoryKey) || null
    : null

  function moveStorySlide(direction) {
    if (!activeStory) return
    const next = activeSlideIndex + direction
    if (next >= 0 && next < activeStory.slides.length) {
      setActiveSlideIndex(next)
      return
    }
    const currentIndex = sortedStories.findIndex((s) => s.key === activeStory.key)
    const nextIndex = currentIndex + direction
    if (nextIndex >= 0 && nextIndex < sortedStories.length) {
      const nextStory = sortedStories[nextIndex]
      setActiveStoryKey(nextStory.key)
      setActiveSlideIndex(direction > 0 ? 0 : nextStory.slides.length - 1)
      return
    }
    setActiveStoryKey(null)
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
    setActiveStoryKey(null)
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

  const handleResetSeenStories = () => {
    if (currentStore?.slug) {
      clearSeenStories(currentStore.slug)
    }
    setSeenStories(new Set())
    setStoryProgress({})
    setAvatarMenuOpen(false)
  }

  function handleProductFavoriteClick(e, product) {
    e.stopPropagation()
    if (typeof window !== 'undefined' && navigator?.vibrate) {
      navigator.vibrate(18)
    }
    if (currentStore?.slug && product?.ean) {
      recordProductFavorite(currentStore.slug, product.ean)
    }
    if (toggleFavorite) {
      toggleFavorite(product)
    }
  }

  function handleProductCardClick(product) {
    if (currentStore?.slug && product?.ean) {
      recordProductView(currentStore.slug, product.ean)
    }
    navigate(buildProductPath(currentStore.slug, product.ean))
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

      {/* 1. HEADER GROUP: STORE BRANDING + SEARCH */}
      <div className="home-header-group">
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
                  <span
                    className={`home-status-dot${schedule.isOpen ? ' is-open' : ' is-closed'}`}
                  />
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

                  <button
                    className="home-avatar-menu__item"
                    type="button"
                    onClick={handleResetSeenStories}
                  >
                    <HomeIcon name="replay" />
                    <span>{t('home.resetStories') || 'Сбросить сторис (как новые)'}</span>
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
        <div className="home-top-bar-divider" aria-hidden="true" />

        {/* 2. STORIES SECTION (RECTANGULAR HERO CARDS) */}
        <section className="home-stories-bar" aria-label={t('home.storiesLabel')}>
          {sortedStories.map((story) => {
            const totalSlides = story.slides?.length || 3
            const viewedCount =
              storyProgress[story.key] !== undefined
                ? storyProgress[story.key]
                : seenStories.has(story.key)
                  ? totalSlides
                  : 0
            const isFullySeen = viewedCount >= totalSlides || seenStories.has(story.key)
            const isPartiallySeen = viewedCount > 0 && !isFullySeen
            const resumeSlide = viewedCount > 0 && viewedCount < totalSlides ? viewedCount : 0

            return (
              <button
                key={story.key}
                type="button"
                className={`home-story-card story-tone--${story.tone}${isFullySeen ? ' is-seen' : isPartiallySeen ? ' is-partial' : ' is-unseen'}`}
                onClick={() => {
                  setActiveStoryKey(story.key)
                  setActiveSlideIndex(resumeSlide)
                }}
              >
                {/* Top Micro Progress Dashes: dynamic segment indicators */}
                <div className="home-story-card__dashes" aria-hidden="true">
                  {Array.from({ length: totalSlides }).map((_, idx) => {
                    const isViewed = idx < viewedCount
                    return (
                      <span
                        key={idx}
                        className={`home-story-card__dash ${isViewed ? 'is-viewed' : 'is-unviewed'}`}
                      />
                    )
                  })}
                </div>

                <div className="home-story-card__media">
                  <img src={story.image} alt="" loading="lazy" />
                  <span className="home-story-card__overlay" />
                </div>
                <div className="home-story-card__footer">
                  <span className="home-story-card__badge" aria-hidden="true">
                    <StoryCardIcon name={story.icon} size={13} />
                  </span>
                  <span className="home-story-card__title">
                    {t(`home.stories.${story.key}.title`, { storeName })}
                  </span>
                </div>
              </button>
            )
          })}
        </section>

        {/* 3. SMART SEARCH & SCAN BAR */}
        <div className="home-search-container">
          <button
            type="button"
            className="home-search-bar"
            onClick={() => navigate(routes.catalog)}
            aria-label={t('catalog.searchPlaceholder')}
          >
            <SearchIcon className="home-search-bar__icon" />
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
      </div>

      {/* 4. SMART COMPOSITION FILTER — interactive quick toggles */}
      <section className="home-filter-section" aria-label={t('home.filterTitle')}>
        <div className={`home-filter-panel${isFitConfigured ? ' is-active' : ''}`}>
          <div className="home-filter-panel__header">
            <div className="home-filter-panel__title-row">
              <div className="home-filter-panel__emblem" aria-hidden="true">
                <PreferenceSlidersIcon size={18} color="currentColor" />
              </div>
              <div className="home-filter-panel__titles">
                <h3 className="home-filter-panel__heading">{t('home.filterTitle')}</h3>
                <span className="home-filter-panel__status">
                  {activeFilterCount > 0
                    ? (t('home.filterStatusActive') || '{count} фильтров активно').replace(
                        '{count}',
                        activeFilterCount
                      )
                    : t('home.filterStatusNone')}
                </span>
              </div>
            </div>
          </div>

          <div className="home-filter-grid" role="group" aria-label={t('home.filterTitle')}>
            {QUICK_TOGGLES.map(({ id, labelKey, fallback, iconName, isActive, toggle }) => (
              <button
                key={id}
                type="button"
                className={`home-filter-toggle${isActive ? ' is-on' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  toggle()
                }}
                aria-pressed={isActive}
              >
                <span className="home-filter-toggle__icon">
                  <DietIcon name={iconName} size={15} />
                </span>
                <span className="home-filter-toggle__label">{t(labelKey) || fallback}</span>
                {isActive && (
                  <span className="home-filter-toggle__check" aria-hidden="true">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
            <button
              type="button"
              className="home-filter-toggle home-filter-toggle--more"
              onClick={() => setFitDrawerOpen(true)}
            >
              <span className="home-filter-toggle__icon">
                <PreferenceSlidersIcon size={13} color="currentColor" />
              </span>
              <span className="home-filter-toggle__label">{t('home.filterMore') || 'Ещё'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. POPULAR DEPARTMENTS (8 CATEGORIES) */}
      <section className="home-departments-section" aria-label={t('home.departmentsTitle')}>
        <div className="home-section-header">
          <div className="home-section-header__titles">
            <h2>{t('home.departmentsTitle') || 'Отделы магазина'}</h2>
          </div>
          <button
            type="button"
            className="home-section-header__link"
            onClick={() => navigate(routes.catalog)}
          >
            <span>{t('home.viewCatalog') || 'В каталог'}</span>
            <HomeIcon name="chevron_right" />
          </button>
        </div>

        <div className="home-departments-scroll">
          {HOME_DEPARTMENTS.map((dept) => {
            const label = getHomeDeptLabel(dept.key, lang)
            const count = getDeptProductCount(dept.key)
            return (
              <button
                key={dept.key}
                type="button"
                className={`home-dept-item is-${dept.shape}`}
                onClick={() => navigate(routes.catalog, { state: { category: dept.key } })}
                aria-label={label}
              >
                <div className={`home-dept-tile is-${dept.shape} tone-${dept.key}`}>
                  <img src={dept.image} alt="" loading="lazy" decoding="async" />
                </div>
                <div className="home-dept-meta">
                  <span className="home-dept-label">{label}</span>
                  <span className="home-dept-count">
                    {t('home.deptProductsCount', { count }) || `${count} товаров`}
                  </span>
                </div>
              </button>
            )
          })}

          <button
            type="button"
            className="home-dept-item"
            onClick={() => navigate(routes.catalog)}
            aria-label={t('home.deptAll') || 'Весь каталог'}
          >
            <div className="all-tile">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="all-tile__icon"
              >
                <rect x="3" y="3" width="7" height="7" rx="2" />
                <rect x="14" y="3" width="7" height="7" rx="2" />
                <rect x="14" y="14" width="7" height="7" rx="2" />
                <rect x="3" y="14" width="7" height="7" rx="2" />
              </svg>
              <span className="all-tile__title">{t('home.allDepts') || 'Все'}</span>
            </div>
            <div className="home-dept-meta">
              <span className="home-dept-label">{t('home.deptAll') || 'Каталог'}</span>
              <span className="home-dept-count">
                {catalogProducts.length > 0
                  ? t('home.deptProductsCount', { count: catalogProducts.length }) ||
                    `${catalogProducts.length} товаров`
                  : '13 000+'}
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* 6. LIVE SHOWCASE SHELF: «ХИТЫ МАГАЗИНА» */}
      {showcaseProducts.length > 0 && (
        <section className="home-showcase-section" aria-label={t('home.popularTitle')}>
          <div className="home-section-header">
            <div className="home-section-header__titles">
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
              <span>{t('home.viewCatalog') || 'В каталог'}</span>
              <HomeIcon name="chevron_right" />
            </button>
          </div>

          <div className="home-products-scroll">
            {showcaseProducts.map((product) => {
              const isFav = checkIsFavorite ? checkIsFavorite(product.ean) : false
              const productImage = product.image || product.image_url
              const { badges, extraCount } = getProductBadgeSummary(product)
              const hasDiscount = Boolean(
                (product.discountPercent && product.discountPercent > 0) ||
                (product.oldPriceKzt && product.oldPriceKzt > product.priceKzt)
              )

              return (
                <div
                  key={product.ean}
                  className="home-product-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleProductCardClick(product)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleProductCardClick(product)
                    }
                  }}
                >
                  <div className="home-product-card__media">
                    {productImage ? (
                      <img
                        src={productImage}
                        alt={product.name}
                        loading="lazy"
                        className="home-product-card__image"
                        onError={() => {
                          setFailedImageEans((prev) => {
                            const next = new Set(prev)
                            next.add(product.ean)
                            return next
                          })
                        }}
                      />
                    ) : (
                      <div className="home-product-card__placeholder">
                        <HomeIcon name="grocery" />
                      </div>
                    )}

                    {badges.length > 0 && (
                      <div className="home-product-card__badges">
                        {badges.map((badge) => (
                          <span
                            key={badge.key}
                            className={`home-product-card__badge home-product-card__badge--${badge.type} home-product-card__badge--${badge.key}`}
                            aria-label={badge.label}
                          >
                            <span>{badge.label}</span>
                          </span>
                        ))}
                        {extraCount > 0 && (
                          <span
                            className="home-product-card__badge home-product-card__badge--more"
                            aria-label={`+${extraCount}`}
                          >
                            +{extraCount}
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      className={`home-product-card__fav-btn${isFav ? ' is-active' : ''}`}
                      onClick={(e) => handleProductFavoriteClick(e, product)}
                      aria-label={isFav ? t('home.addedToCart') : t('home.addToCart')}
                    >
                      {isFav ? (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className="home-product-card__info">
                    <div className="home-product-card__price-row">
                      <div className="home-product-card__prices">
                        <span className="home-product-card__price">
                          {product.priceKzt ? `${product.priceKzt.toLocaleString('ru-RU')} ₸` : ''}
                        </span>
                        {hasDiscount && product.oldPriceKzt && (
                          <span className="home-product-card__old-price">
                            {`${product.oldPriceKzt.toLocaleString('ru-RU')} ₸`}
                          </span>
                        )}
                      </div>
                      {product.quantity && (
                        <span className="home-product-card__qty">{product.quantity}</span>
                      )}
                    </div>
                    <h3 className="home-product-card__name">{product.name}</h3>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 7. AMBIENT AI COPILOT ISLAND (HIGH-END STORE CONVERSATIONAL MODULE) */}
      <section className="home-ai-island" aria-labelledby="home-ai-island-title">
        <div className="home-ai-island__ambient-glow" aria-hidden="true" />
        <div className="home-ai-island__container">
          <div className="home-ai-island__header">
            <div className="home-ai-island__brand">
              <div className="home-ai-island__avatar-wrap">
                <KorsetAvatar size={34} />
                <span className="home-ai-island__pulse-badge" aria-hidden="true" />
              </div>
              <div className="home-ai-island__meta">
                <h3 id="home-ai-island-title" className="home-ai-island__title">
                  {t('home.aiAssistantTitle') || 'ИИ-помощник'}
                </h3>
                <div className="home-ai-island__status">
                  <span className="home-ai-island__status-dot" aria-hidden="true" />
                  <span className="home-ai-island__status-label">
                    {t('home.aiOnlineStatus') || 'В сети'} · {storeName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="home-ai-island__prompts-section">
            <div className="home-ai-island__prompts-header">
              <span className="home-ai-island__prompts-label">
                {t('home.aiOptionsLabel') || 'Готовые сценарии'}
              </span>
              <button
                type="button"
                className="home-ai-island__shuffle-btn"
                onClick={handleShuffleAiPrompts}
                title={t('home.aiShufflePrompt') || 'Другие варианты'}
                aria-label={t('home.aiShufflePrompt') || 'Другие варианты'}
              >
                <AiShuffleIcon size={14} />
              </button>
            </div>

            <div className="home-ai-island__bento-grid">
              {currentAiPrompts.map((scenario) => {
                const prompt = t(scenario.promptKey)
                return (
                  <button
                    key={scenario.key}
                    type="button"
                    className="home-ai-bento-card"
                    onClick={() => handleAiPromptClick(prompt)}
                  >
                    <div className="home-ai-bento-card__icon-wrap">
                      {getAiScenarioIcon(scenario.icon, 16)}
                    </div>
                    <span className="home-ai-bento-card__query">{prompt}</span>
                    <div className="home-ai-bento-card__arrow" aria-hidden="true">
                      <AiArrowRightIcon size={12} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <form className="home-ai-island__search-form" onSubmit={handleAiSubmit}>
            <div className="home-ai-island__search-capsule">
              <input
                type="text"
                className="home-ai-island__input"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder={
                  t('home.aiInputPlaceholder') || 'Спросить о товаре, рецепте или цене...'
                }
                aria-label={
                  t('home.aiInputPlaceholder') || 'Спросить о товаре, рецепте или цене...'
                }
              />
              <div className="home-ai-island__tools">
                <button
                  type="button"
                  className="home-ai-island__tool-btn"
                  onClick={handleOpenAiCamera}
                  title={t('ai.image.open') || 'Прикрепить фото'}
                  aria-label={t('ai.image.open') || 'Прикрепить фото'}
                >
                  <IconGallery size={17} />
                </button>
                <button
                  type="button"
                  className="home-ai-island__tool-btn"
                  onClick={handleStartAiVoice}
                  title={t('ai.voice.start') || 'Голосовой ввод'}
                  aria-label={t('ai.voice.start') || 'Голосовой ввод'}
                >
                  <MicIcon size={17} />
                </button>
                <button
                  type="submit"
                  className={`home-ai-island__send-btn${aiQuery.trim() ? ' is-active' : ''}`}
                  aria-label={t('home.aiInputSubmit') || 'Спросить'}
                  disabled={!aiQuery.trim()}
                >
                  <AiArrowUpIcon size={15} />
                </button>
              </div>
            </div>
          </form>
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
          storyIndex={sortedStories.findIndex((s) => s.key === activeStory.key)}
          slideIndex={activeSlideIndex}
          store={currentStore}
          catalogProducts={catalogProducts}
          t={t}
          onClose={() => {
            setActiveStoryKey(null)
            setActiveSlideIndex(0)
          }}
          onSlide={moveStorySlide}
          onSlideView={handleStorySlideView}
          onCta={handleStoryCta}
        />
      )}
    </main>
  )
}
