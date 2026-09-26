import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import ShoppingListButton from '../components/ShoppingListButton.jsx'
import KorsetAvatar from '../components/KorsetAvatar.jsx'
import SegmentedToggle from '../components/SegmentedToggle.jsx'
import { useOverlayLock } from '../hooks/useOverlayLock.js'
import StoryViewer from '../components/home/StoryViewer.jsx'
import FitCheckDrawer from '../components/home/FitCheckDrawer.jsx'
import InstallAppSheet from '../components/home/InstallAppSheet.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { useUserData } from '../contexts/UserDataContext.jsx'
import {
  HOME_STORY_KEYS,
  HOME_DEPARTMENTS,
  AI_PROMPT_SETS,
  getRotatedAIPrompts,
  getHomeDeptLabel,
  getShowcaseProducts,
  getProductBadgeSummary,
  getStorePopularityMap,
  recordProductView,
  recordProductFavorite,
  loadSeenStories,
  loadStoryProgress,
  recordStorySlideView,
  clearSeenStories,
  sortStoriesBySeen,
} from '../domain/home/homeScreenModel.js'
import { parseStoreSchedule } from '../domain/stores/schedule.js'
import { setLang, useI18n } from '../i18n/index.js'
import { useTheme } from '../utils/theme.js'
import { buildProductPath, buildProfileEditPath } from '../utils/routes.js'
import {
  StorefrontIcon,
  BarcodeScannerIcon,
  InventoryIcon,
  SparklesIcon,
  SyncIcon,
  ResetArrowIcon,
  DietIcon,
  SlidersIcon,
  InstallIcon,
  CameraIcon,
  CartIcon,
  LocationPinIcon,
  ChevronDownIcon,
  CloseIcon,
  ArrowBackIcon,
  ArrowForwardIcon,
  WalletIcon,
  IconGallery,
  TwoGisIcon,
  WhatsAppIcon,
  InstagramIcon,
  PhoneCallIcon,
  ParkingIcon,
  ClockIcon,
  AdvantagesIcon,
  KaspiQrIcon,
  KaspiAlaqanIcon,
  HalykIcon,
  FreedomIcon,
  BankCardIcon,
  MicrophoneIcon,
  SendIcon,
  BakeryTandyrIcon,
  AccessibleRampIcon,
  CookeryIcon,
  CoffeeToGoIcon,
  SelfCheckoutIcon,
  AtmTerminalIcon,
  PharmacyPointIcon,
  MeatCuttingIcon,
  FreshBarIcon,
  ScalesIcon,
  MicrowaveIcon,
  KidsCartIcon,
  LockerIcon,
  WifiIcon,
  OrderPickupIcon,
} from '../components/icons/index.js'
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

const STORE_PHOTO_FALLBACKS = {
  mars: [
    {
      url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80',
      label: 'Фасад и главный вход',
      category: 'facade',
    },
    {
      url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
      label: 'Торговый зал и ряды',
      category: 'interior',
    },
    {
      url: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=1200&q=80',
      label: 'Отдел свежих овощей и фруктов',
      category: 'produce',
    },
    {
      url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
      label: 'Бакалея и напитки',
      category: 'drinks',
    },
  ],
  nurly: [
    {
      url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
      label: 'Фасад и вход',
      category: 'facade',
    },
    {
      url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80',
      label: 'Торговый зал',
      category: 'interior',
    },
    {
      url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
      label: 'Бакалея и напитки',
      category: 'drinks',
    },
  ],
  kalina: [
    {
      url: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=1200&q=80',
      label: 'Главный вход',
      category: 'facade',
    },
    {
      url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80',
      label: 'Торговый зал',
      category: 'interior',
    },
    {
      url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
      label: 'Бакалея и напитки',
      category: 'drinks',
    },
  ],
  default: [
    {
      url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80',
      label: 'Фасад и главный вход',
      category: 'facade',
    },
    {
      url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
      label: 'Торговый зал',
      category: 'interior',
    },
    {
      url: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=1200&q=80',
      label: 'Свежие продукты',
      category: 'produce',
    },
    {
      url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
      label: 'Бакалея и напитки',
      category: 'drinks',
    },
  ],
}

function normalizeStorePhotoItem(item, index, t) {
  if (!item) return null
  if (typeof item === 'string') {
    const defaultLabels = [
      t('home.photoTypeFacade') || 'Фасад и вход',
      t('home.photoTypeInterior') || 'Торговый зал',
      t('home.photoTypeProduce') || 'Овощи и фрукты',
      t('home.photoTypeDrinks') || 'Напитки и бакалея',
    ]
    return {
      url: item,
      label: defaultLabels[index] || t('home.photoTypeGeneral') || 'Фото магазина',
      category:
        index === 0 ? 'facade' : index === 1 ? 'interior' : index === 2 ? 'produce' : 'drinks',
      isPlan: false,
    }
  }

  const isPlan = item.category === 'plan' || item.isPlan === true

  return {
    url: item.url || item.image || item.src,
    label:
      item.label ||
      item.title ||
      item.name ||
      (isPlan
        ? t('home.photoTypePlan') || 'Схема отделов и полок'
        : t('home.photoTypeGeneral') || 'Фото магазина'),
    category: item.category || (isPlan ? 'plan' : 'general'),
    isPlan,
  }
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
  try {
    if (window.localStorage?.getItem('korset:pwa-installed') === 'true') {
      return true
    }
  } catch {
    /* ignore storage error */
  }
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    Boolean(window.navigator?.standalone)
  )
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
  const {
    favoritesCount = 0,
    favoriteEans = new Set(),
    toggleFavorite,
    checkIsFavorite,
  } = useUserData() || {}

  const avatarButtonRef = useRef(null)
  const storeInfoRef = useRef(null)
  const screenRef = useRef(null)

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
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0)
  const [isHeroPaused, setIsHeroPaused] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [fitDrawerOpen, setFitDrawerOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(() => {
    if (typeof window !== 'undefined' && window.__korset_install_prompt) {
      return window.__korset_install_prompt
    }
    return null
  })
  const [isInstalled, setIsInstalled] = useState(isStandalonePwa)
  const [installSheetOpen, setInstallSheetOpen] = useState(false)
  const [failedImageEans, setFailedImageEans] = useState(() => new Set())
  const [isShoppingListExpanded, setIsShoppingListExpanded] = useState(false)
  const [isStoreDetailsExpanded, setIsStoreDetailsExpanded] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.location.hash === '#store-about' || window.location.hash === '#about'
  })
  const [avatarMenuPos, setAvatarMenuPos] = useState(null)

  useOverlayLock(avatarMenuOpen)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (hash === '#store-about' || hash === '#about') {
      const timer = setTimeout(() => {
        storeInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [currentStore?.slug])

  const measureAvatarMenuPos = useCallback(() => {
    const rect = avatarButtonRef.current?.getBoundingClientRect()
    if (!rect) return null
    return {
      top: rect.bottom + 10,
      right: window.innerWidth - rect.right,
    }
  }, [])

  useEffect(() => {
    if (!avatarMenuOpen) return undefined
    const updatePos = () => {
      const pos = measureAvatarMenuPos()
      if (pos) setAvatarMenuPos(pos)
    }
    window.addEventListener('resize', updatePos)
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setAvatarMenuOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [avatarMenuOpen, measureAvatarMenuPos])

  const handleCollapseStoreDetails = useCallback((e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    if (e?.currentTarget) {
      e.currentTarget.blur()
    }

    const target = storeInfoRef.current
    const container = screenRef.current

    setIsStoreDetailsExpanded(false)

    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (!target) return
          const targetRect = target.getBoundingClientRect()

          // 1. If screenRef (.home-screen) is scrolling:
          if (container && container.scrollHeight > container.clientHeight) {
            const containerRect = container.getBoundingClientRect()
            const targetScrollTop = container.scrollTop + (targetRect.top - containerRect.top) - 12
            container.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth',
            })
          } else if (
            window.scrollY > 0 ||
            (document.documentElement && document.documentElement.scrollHeight > window.innerHeight)
          ) {
            // 2. If window / document is scrolling:
            const windowTarget = (window.scrollY || window.pageYOffset || 0) + targetRect.top - 12
            window.scrollTo({
              top: Math.max(0, windowTarget),
              behavior: 'smooth',
            })
          } else {
            target.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
          }
        })
      })
    }
  }, [])

  // Home search bar state & submission
  const [homeSearchQuery, setHomeSearchQuery] = useState('')

  const handleHomeSearchSubmit = (e) => {
    if (e) e.preventDefault()
    const text = homeSearchQuery.trim()
    if (text) {
      navigate(`${routes.catalog}?q=${encodeURIComponent(text)}`, { state: { q: text } })
    } else {
      navigate(routes.catalog, { state: { resetCategory: true, resetAll: true } })
    }
  }

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
    if (typeof window !== 'undefined' && window.__korset_install_prompt) {
      setInstallPrompt(window.__korset_install_prompt)
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      window.__korset_install_prompt = e
      setInstallPrompt(e)
    }
    const handlePromptReady = (e) => {
      if (e?.detail) {
        setInstallPrompt(e.detail)
      } else if (window.__korset_install_prompt) {
        setInstallPrompt(window.__korset_install_prompt)
      }
    }
    const handleInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      if (typeof window !== 'undefined') {
        window.__korset_install_prompt = null
      }
      setInstallSheetOpen(false)
      try {
        localStorage.setItem('korset:pwa-installed', 'true')
      } catch {
        /* ignore storage error */
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('korset:install-prompt-ready', handlePromptReady)
    window.addEventListener('appinstalled', handleInstalled)
    window.addEventListener('korset:pwa-installed', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('korset:install-prompt-ready', handlePromptReady)
      window.removeEventListener('appinstalled', handleInstalled)
      window.removeEventListener('korset:pwa-installed', handleInstalled)
    }
  }, [])

  // Scroll restoration between navigations
  useEffect(() => {
    const el = screenRef.current
    const cache = window.__korset_scroll_cache || (window.__korset_scroll_cache = {})
    const key = `home_${currentStore?.slug || 'store'}`

    if (cache[key] !== undefined && cache[key] > 0) {
      const targetScroll = cache[key]
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        window.requestAnimationFrame(() => {
          if (el) el.scrollTop = targetScroll
          window.scrollTo(0, targetScroll)
        })
      }
    }

    const handleScroll = () => {
      const top =
        el && el.scrollTop > 0
          ? el.scrollTop
          : window.scrollY || document.documentElement?.scrollTop || 0
      cache[key] = top
    }

    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      if (el) {
        el.removeEventListener('scroll', handleScroll)
      }
      window.removeEventListener('scroll', handleScroll)
    }
  }, [currentStore?.slug])

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
    [currentStore?.slug]
  )

  const rawShowcaseProducts = useMemo(
    () => getShowcaseProducts(catalogProducts, 12, popularityMap),
    [catalogProducts, popularityMap]
  )

  const showcaseProducts = useMemo(
    () => rawShowcaseProducts.filter((product) => !failedImageEans.has(product.ean)),
    [rawShowcaseProducts, failedImageEans]
  )

  const shoppingListProducts = useMemo(() => {
    if (!favoriteEans || favoriteEans.size === 0 || !Array.isArray(catalogProducts)) return []
    return catalogProducts.filter((p) => favoriteEans.has(p.ean))
  }, [catalogProducts, favoriteEans])

  const storeHours = getStoreHours(currentStore, t)
  const schedule = useMemo(
    () => parseStoreSchedule(currentStore || storeHours),
    [currentStore, storeHours]
  )

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
        toggle: () => {
          const nextVal = !(profile?.halal || profile?.halalOnly)
          updateProfile({ halal: nextVal, halalOnly: nextVal })
        },
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

  const normalizedPhotos = useMemo(() => {
    const rawList =
      Array.isArray(currentStore?.images) && currentStore.images.length > 0
        ? currentStore.images
        : (currentStore?.slug && STORE_PHOTO_FALLBACKS[currentStore.slug]) ||
          STORE_PHOTO_FALLBACKS.default ||
          []
    return rawList.map((item, idx) => normalizeStorePhotoItem(item, idx, t)).filter(Boolean)
  }, [currentStore, t])

  // Auto-cycle hero banner photos every 3 seconds; paused on hover / touch
  useEffect(() => {
    if (!normalizedPhotos.length || normalizedPhotos.length <= 1 || isHeroPaused) return
    const timer = setInterval(() => {
      setHeroPhotoIndex((prev) => (prev + 1) % normalizedPhotos.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [normalizedPhotos.length, isHeroPaused])

  const touchStartXRef = useRef(null)

  const handleNextPhoto = useCallback(
    (e) => {
      if (e) e.stopPropagation()
      if (!normalizedPhotos.length) return
      setActivePhotoIndex((prev) => (prev === null ? 0 : (prev + 1) % normalizedPhotos.length))
    },
    [normalizedPhotos.length]
  )

  const handlePrevPhoto = useCallback(
    (e) => {
      if (e) e.stopPropagation()
      if (!normalizedPhotos.length) return
      setActivePhotoIndex((prev) =>
        prev === null ? 0 : (prev - 1 + normalizedPhotos.length) % normalizedPhotos.length
      )
    },
    [normalizedPhotos.length]
  )

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current
    if (deltaX > 45) {
      handlePrevPhoto()
    } else if (deltaX < -45) {
      handleNextPhoto()
    }
    touchStartXRef.current = null
  }

  useOverlayLock(activePhotoIndex !== null)

  useEffect(() => {
    if (activePhotoIndex === null) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActivePhotoIndex(null)
      if (e.key === 'ArrowRight') handleNextPhoto()
      if (e.key === 'ArrowLeft') handlePrevPhoto()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activePhotoIndex, handleNextPhoto, handlePrevPhoto])

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

  const store2GisUrl =
    currentStore?.twogis_url ||
    (storeAddress
      ? `https://2gis.kz/search/${encodeURIComponent([currentStore?.city || 'Усть-Каменогорск', storeAddress].filter(Boolean).join(' '))}`
      : `https://2gis.kz/search/${encodeURIComponent(storeName || 'Магазин')}`)

  const hasContacts = Boolean(
    store2GisUrl ||
    currentStore?.whatsapp_number ||
    currentStore?.instagram_url ||
    currentStore?.instagram ||
    currentStore?.phone
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

  function handleInstallApp() {
    setAvatarMenuOpen(false)
    setInstallSheetOpen(true)
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
    <main ref={screenRef} className="screen home-screen">
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
                  {schedule.isTemporarilyClosed
                    ? schedule.temporaryClosureReason ||
                      t('home.storeTemporaryClosed') ||
                      'Временно закрыт'
                    : schedule.isOpen
                      ? t('home.storeClosesAt', { time: schedule.closes }) ||
                        `до ${schedule.closes}`
                      : schedule.isConfigured
                        ? t('home.storeOpensAt', { time: schedule.opens }) || `с ${schedule.opens}`
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
              onClick={() => {
                const pos = measureAvatarMenuPos()
                if (pos) setAvatarMenuPos(pos)
                setAvatarMenuOpen((val) => !val)
              }}
            >
              <ProfileAvatar avatarId={avatarId} name={user ? profileName : ''} rounded="circle" />
            </button>

            {avatarMenuOpen &&
              avatarMenuPos &&
              createPortal(
                <>
                  <button
                    className="home-avatar-menu__backdrop"
                    type="button"
                    aria-label={t('common.close')}
                    onClick={() => setAvatarMenuOpen(false)}
                  />
                  <div
                    className="home-avatar-menu"
                    role="menu"
                    style={{ top: avatarMenuPos.top, right: avatarMenuPos.right }}
                  >
                    <div className="home-avatar-menu__identity">
                      <div>
                        <strong>{profileName}</strong>
                        <span>{t('home.menuAccountHint')}</span>
                      </div>
                      {user && (
                        <button
                          className="home-avatar-menu__edit"
                          type="button"
                          aria-label={t('home.menuEditProfile')}
                          onClick={() => {
                            setAvatarMenuOpen(false)
                            navigate(buildProfileEditPath(currentStore?.slug || null))
                          }}
                        >
                          <HomeIcon name="edit" />
                        </button>
                      )}
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
                      <SyncIcon size={18} />
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
                        <span className="home-avatar-menu__install-icon" aria-hidden="true">
                          <InstallIcon size={17} color="currentColor" />
                        </span>
                        <span>{t('home.menuInstall')}</span>
                      </button>
                    )}
                  </div>
                </>,
                document.body
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
          <form className="home-search-bar" onSubmit={handleHomeSearchSubmit}>
            <button
              type="submit"
              className="home-search-bar__icon-btn"
              aria-label={t('common.search') || 'Поиск'}
            >
              <SearchIcon className="home-search-bar__icon" />
            </button>
            <input
              type="search"
              className="home-search-bar__input"
              value={homeSearchQuery}
              onChange={(e) => setHomeSearchQuery(e.target.value)}
              placeholder={t('home.searchPlaceholder', { count: catalogProducts?.length || 10240 })}
              aria-label={t('catalog.searchPlaceholder')}
            />
            <button
              type="button"
              className="home-search-bar__scan-btn"
              aria-label={t('home.scanBtn')}
              onClick={(e) => {
                e.stopPropagation()
                navigate(routes.scan)
              }}
            >
              <BarcodeScannerIcon size={21} />
            </button>
          </form>
        </div>
      </div>

      {/* 4. SMART COMPOSITION FILTER — interactive quick toggles */}
      <section className="home-filter-section" aria-label={t('home.filterTitle')}>
        <div className={`home-filter-panel${isFitConfigured ? ' is-active' : ''}`}>
          <div className="home-filter-panel__header">
            <div className="home-filter-panel__title-row">
              <div className="home-filter-panel__emblem" aria-hidden="true">
                <SlidersIcon size={18} color="currentColor" />
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
                <SlidersIcon size={13} color="currentColor" />
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
            onClick={() =>
              navigate(routes.catalog, { state: { resetCategory: true, resetAll: true } })
            }
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
              const { badges, extraCount, discountBadge } = getProductBadgeSummary(product, lang)
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
                    if (e.target !== e.currentTarget) return
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
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

                    {(badges.length > 0 || discountBadge) && (
                      <div className="home-product-card__badges">
                        {discountBadge && (
                          <span className="home-product-card__badge home-product-card__badge--discount">
                            {discountBadge.label}
                          </span>
                        )}
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

                    <ShoppingListButton
                      className="home-product-card__shopping-action"
                      active={isFav}
                      onClick={(e) => handleProductFavoriteClick(e, product)}
                    />
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
                <ResetArrowIcon size={14} />
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
                      <ArrowForwardIcon size={12} strokeWidth={1.8} />
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
                placeholder={t('home.aiInputPlaceholder') || 'Спросить о товаре или цене...'}
                aria-label={t('home.aiInputPlaceholder') || 'Спросить о товаре или цене...'}
              />
              <div className="home-ai-island__tools">
                <button
                  type="button"
                  className="home-ai-island__tool-btn"
                  onClick={handleOpenAiCamera}
                  title={t('ai.image.open') || 'Прикрепить фото'}
                  aria-label={t('ai.image.open') || 'Прикрепить фото'}
                >
                  <IconGallery size={16} />
                </button>
                <button
                  type="button"
                  className="home-ai-island__tool-btn"
                  onClick={handleStartAiVoice}
                  title={t('ai.voice.start') || 'Голосовой ввод'}
                  aria-label={t('ai.voice.start') || 'Голосовой ввод'}
                >
                  <MicrophoneIcon size={18} />
                </button>
                <button
                  type="submit"
                  className={`home-ai-island__send-btn${aiQuery.trim() ? ' is-active' : ''}`}
                  aria-label={t('home.aiInputSubmit') || 'Спросить'}
                  disabled={!aiQuery.trim()}
                >
                  <SendIcon size={16} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* 8. SHOPPING LIST SUMMARY (WHEN ITEMS EXIST) */}
      {favoritesCount > 0 && (
        <section className="home-shopping-summary" aria-label={t('home.shoppingListTitle')}>
          <div className="home-shopping-card">
            <div
              className="home-shopping-card__header"
              onClick={() => setIsShoppingListExpanded((prev) => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setIsShoppingListExpanded((prev) => !prev)
                }
              }}
              aria-expanded={isShoppingListExpanded}
            >
              <div className="home-shopping-card__icon">
                <HomeIcon name="checklist" />
              </div>
              <div className="home-shopping-card__info">
                <h4>{t('home.shoppingListTitle') || 'Список покупок'}</h4>
                <p>
                  {favoritesCount > 0
                    ? `${favoritesCount} ${favoritesCount === 1 ? 'товар' : favoritesCount < 5 ? 'товара' : 'товаров'}`
                    : t('home.shoppingEmpty') || 'Пока пусто'}
                </p>
              </div>
              <div className="home-shopping-card__header-actions">
                <ChevronDownIcon
                  size={18}
                  className={`home-shopping-card__chevron${isShoppingListExpanded ? ' is-open' : ''}`}
                />
              </div>
            </div>

            {isShoppingListExpanded && (
              <div className="home-shopping-card__body">
                {shoppingListProducts.length > 0 ? (
                  <div className="home-shopping-carousel">
                    {shoppingListProducts.slice(0, 8).map((product) => {
                      const productImage = product.image || product.image_url
                      return (
                        <div
                          key={product.ean}
                          className="home-shopping-carousel__item"
                          onClick={() => handleProductCardClick(product)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="home-shopping-carousel__media">
                            {productImage ? (
                              <img src={productImage} alt={product.name} loading="lazy" />
                            ) : (
                              <HomeIcon name="grocery" />
                            )}
                          </div>
                          <span className="home-shopping-carousel__price">
                            {product.priceKzt
                              ? `${product.priceKzt.toLocaleString('ru-RU')} ₸`
                              : ''}
                          </span>
                          <span className="home-shopping-carousel__name">{product.name}</span>
                        </div>
                      )
                    })}
                    <button
                      type="button"
                      className="home-shopping-carousel__more-btn"
                      onClick={() => navigate(`${routes.history}?tab=favorites`)}
                    >
                      <HomeIcon name="arrow_forward" />
                      <span>{t('home.openShoppingList') || 'Открыть'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="home-shopping-card__compact-action">
                    <button
                      type="button"
                      className="home-shopping-card__open-list-btn"
                      onClick={() => navigate(`${routes.history}?tab=favorites`)}
                    >
                      <HomeIcon name="format_list_bulleted" />
                      <span>{t('home.openShoppingList') || 'Открыть список покупок'}</span>
                      <HomeIcon name="arrow_forward" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 9. STORE COMPACT PROFILE & STORE GUIDE */}
      <section ref={storeInfoRef} id="store-about" className="home-store-details-section">
        <div className="home-section-header home-store-header">
          <div className="home-section-header__titles">
            <h2>{t('home.storeAbout') || 'О магазине'}</h2>
          </div>
        </div>

        <div className={`home-store-compact-card${isStoreDetailsExpanded ? ' is-expanded' : ''}`}>
          {/* Hero Photo Banner with 3s progress ticker */}
          {normalizedPhotos.length > 0 && (
            <div
              className="home-store-hero-banner"
              onMouseEnter={() => setIsHeroPaused(true)}
              onMouseLeave={() => setIsHeroPaused(false)}
              onTouchStart={() => setIsHeroPaused(true)}
              onTouchEnd={() => setIsHeroPaused(false)}
              onClick={() => setActivePhotoIndex(heroPhotoIndex)}
              role="button"
              tabIndex={0}
              aria-label={t('home.storeOpenPhoto', { storeName }) || 'Открыть фото магазина'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActivePhotoIndex(heroPhotoIndex)
                }
              }}
            >
              <img
                src={(normalizedPhotos[heroPhotoIndex] || normalizedPhotos[0]).url}
                alt={(normalizedPhotos[heroPhotoIndex] || normalizedPhotos[0]).label || storeName}
                className="home-store-hero-banner__img"
                loading="lazy"
              />
              <div className="home-store-hero-banner__overlay" />
              {normalizedPhotos.length > 1 && (
                <div className="home-store-hero-ticker" aria-hidden="true">
                  {normalizedPhotos.map((_, idx) => (
                    <div
                      key={idx}
                      className={`home-store-hero-ticker__bar${
                        idx === heroPhotoIndex
                          ? ' is-active'
                          : idx < heroPhotoIndex
                            ? ' is-passed'
                            : ''
                      }`}
                    />
                  ))}
                </div>
              )}
              <div className="home-store-hero-banner__badges">
                <span className="home-store-hero-badge">
                  <CameraIcon size={12} />
                  <span>
                    {(normalizedPhotos[heroPhotoIndex] || normalizedPhotos[0]).label ||
                      t('home.photoTypeGeneral')}
                  </span>
                </span>
                {normalizedPhotos.length > 1 && (
                  <span className="home-store-hero-count">
                    {heroPhotoIndex + 1} / {normalizedPhotos.length}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="home-store-card__content">
            {/* Advance Notice / Temporary Closure Banner (Санитарный день, Ревизия и т.д.) */}
            {schedule.specialNotice && (
              <div className="home-store-notice-bar">
                <span className="home-store-notice-bar__icon" aria-hidden="true">
                  ⚠️
                </span>
                <span className="home-store-notice-bar__text">{schedule.specialNotice}</span>
              </div>
            )}

            {/* Header Block: Top Line (Name + Status Pill), Sub Line (Hours + Address) */}
            <div className="home-store-card__header-block">
              <div className="home-store-card__top-line">
                <h3 className="home-store-card__name">{storeName}</h3>
                {schedule.isConfigured && (
                  <span
                    className={`home-store-status-pill${schedule.isOpen ? ' is-open' : ' is-closed'}`}
                  >
                    <span className="home-store-status-dot" />
                    <span>
                      {schedule.isTemporarilyClosed
                        ? schedule.temporaryClosureReason || t('home.storeClosedNow') || 'Закрыто'
                        : schedule.isOpen
                          ? t('home.storeOpenNow') || 'Открыто'
                          : t('home.storeClosedNow') || 'Закрыто'}
                    </span>
                  </span>
                )}
              </div>

              {/* Sub Line: Hours on left, Address on right */}
              {(storeHours || storeAddress) && (
                <div className="home-store-card__sub-line">
                  {storeHours && (
                    <div className="home-store-card__meta-item home-store-card__hours-col">
                      <ClockIcon size={13} className="home-store-card__meta-icon" />
                      <span className="home-store-card__hours-text">
                        {schedule.isTodayDayOff
                          ? t('home.storeDayOff') || 'Выходной'
                          : `${schedule.todayHours || storeHours}, ${t('home.storeScheduleDaily') || 'ежедневно'}`}
                      </span>
                    </div>
                  )}
                  {storeAddress && (
                    <div
                      className="home-store-card__meta-item home-store-card__address-col"
                      title={storeAddress}
                    >
                      <LocationPinIcon size={13} className="home-store-card__meta-icon" />
                      <span className="home-store-card__address-text">{storeAddress}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Action Contact Pills (2GIS, WhatsApp, Instagram, Телефон) */}
            {hasContacts && (
              <div
                className={`home-store-contact-row${
                  [
                    store2GisUrl,
                    currentStore?.whatsapp_number,
                    currentStore?.instagram_url || currentStore?.instagram,
                    currentStore?.phone,
                  ].filter(Boolean).length >= 4
                    ? ' home-store-contact-row--scrollable'
                    : ''
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {store2GisUrl && (
                  <a
                    href={store2GisUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="home-store-action-pill"
                    aria-label={t('home.storeRoute2Gis') || '2GIS'}
                  >
                    <TwoGisIcon size={14} />
                    <span>2GIS</span>
                  </a>
                )}
                {currentStore?.whatsapp_number && (
                  <a
                    href={`https://wa.me/${currentStore.whatsapp_number.replace(/\D/g, '').replace(/^8(?=\d{10}$)/, '7')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="home-store-action-pill"
                    aria-label="WhatsApp"
                  >
                    <WhatsAppIcon size={14} />
                    <span>WhatsApp</span>
                  </a>
                )}
                {(currentStore?.instagram_url || currentStore?.instagram) && (
                  <a
                    href={
                      currentStore.instagram_url ||
                      `https://instagram.com/${currentStore.instagram.replace('@', '')}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="home-store-action-pill"
                    aria-label="Instagram"
                  >
                    <InstagramIcon size={14} />
                    <span>Instagram</span>
                  </a>
                )}
                {currentStore?.phone && (
                  <a
                    href={`tel:${currentStore.phone.replace(/[^\d+]/g, '')}`}
                    className="home-store-action-pill"
                    aria-label={t('home.storeCall') || 'Позвонить'}
                  >
                    <PhoneCallIcon size={14} />
                    <span>{t('home.storeCall') || 'Позвонить'}</span>
                  </a>
                )}
              </div>
            )}

            {/* Expand Trigger Button */}
            <button
              type="button"
              className={`home-store-expand-btn${isStoreDetailsExpanded ? ' is-open' : ''}`}
              onClick={(e) => {
                if (isStoreDetailsExpanded) {
                  handleCollapseStoreDetails(e)
                } else {
                  setIsStoreDetailsExpanded(true)
                }
              }}
              aria-expanded={isStoreDetailsExpanded}
            >
              <div className="home-store-expand-btn__left">
                <span>
                  {isStoreDetailsExpanded ? t('home.storeDetailsLess') : t('home.storeDetailsMore')}
                </span>
                {normalizedPhotos.length > 0 && !isStoreDetailsExpanded && (
                  <span className="home-store-photos-badge">
                    <CameraIcon size={12} />
                    <span>
                      {(t('home.storePhotosAndInfo') || '{n} фото · инфо').replace(
                        '{n}',
                        normalizedPhotos.length
                      )}
                    </span>
                  </span>
                )}
              </div>
              <ChevronDownIcon
                size={18}
                className={`home-store-expand-chevron${isStoreDetailsExpanded ? ' is-open' : ''}`}
              />
            </button>

            {/* EXPANDED CONTENT ACCORDION */}
            {isStoreDetailsExpanded && (
              <div className="home-store-expanded-body">
                {/* 1. Categorized Store Photos Carousel */}
                {normalizedPhotos.length > 0 && (
                  <div className="home-store-gallery-section">
                    <div className="home-store-subhead">
                      <CameraIcon size={14} />
                      <h4>{t('home.storeGalleryTitle') || 'Фотографии магазина'}</h4>
                    </div>

                    <div className="home-store-gallery-scroll">
                      {normalizedPhotos.map((photo, idx) => (
                        <button
                          key={`${photo.url}-${idx}`}
                          type="button"
                          className="home-store-gallery-item"
                          onClick={() => setActivePhotoIndex(idx)}
                          aria-label={`${photo.label} (${idx + 1}/${normalizedPhotos.length})`}
                        >
                          <div className="home-store-gallery-thumb">
                            <img src={photo.url} alt={photo.label} loading="lazy" />
                            <span className="home-store-gallery-tag">
                              <span>{photo.label}</span>
                            </span>
                          </div>
                        </button>
                      ))}
                      {normalizedPhotos.length > 1 && (
                        <button
                          type="button"
                          className="home-store-gallery-all-tile"
                          onClick={() => setActivePhotoIndex(0)}
                          aria-label={(t('home.storeAllPhotosBtn') || 'Все фото ({n})').replace(
                            '{n}',
                            normalizedPhotos.length
                          )}
                        >
                          <IconGallery size={20} />
                          <span>
                            {(t('home.storeAllPhotosBtn') || 'Все фото ({n})').replace(
                              '{n}',
                              normalizedPhotos.length
                            )}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Description */}
                <div className="home-store-info-section">
                  <div className="home-store-subhead">
                    <StorefrontIcon size={14} />
                    <h4>{t('home.storeAbout')}</h4>
                  </div>
                  <p className="home-store-desc-text">
                    {currentStore.description || t('home.storeAboutFallback', { storeName })}
                  </p>
                </div>

                {/* 3. Payment Methods */}
                {(!Array.isArray(currentStore?.features) ||
                  currentStore.features.length === 0 ||
                  ['kaspi_qr', 'kaspi_alaqan', 'halyk', 'freedom', 'card', 'cash'].some((f) =>
                    currentStore.features.includes(f)
                  )) && (
                  <div className="home-store-payments-section">
                    <div className="home-store-subhead">
                      <WalletIcon size={14} />
                      <h4>{t('home.storePaymentTitle') || 'Способы оплаты'}</h4>
                    </div>
                    <div className="home-store-payment-grid">
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('kaspi_qr')) && (
                        <div
                          className="home-store-payment-badge home-store-payment-badge--kaspi-qr"
                          aria-label="Kaspi QR"
                          title="Kaspi QR"
                        >
                          <KaspiQrIcon size={20} />
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('kaspi_alaqan')) && (
                        <div className="home-store-payment-badge">
                          <span className="home-store-payment-badge__icon">
                            <KaspiAlaqanIcon size={16} />
                          </span>
                          <span>{t('home.payKaspiAlaqan') || 'Kaspi Alaqan'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('halyk')) && (
                        <div className="home-store-payment-badge">
                          <span className="home-store-payment-badge__icon">
                            <HalykIcon size={16} />
                          </span>
                          <span>{t('home.payHalyk') || 'Halyk QR'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('freedom')) && (
                        <div className="home-store-payment-badge">
                          <span className="home-store-payment-badge__icon">
                            <FreedomIcon size={16} />
                          </span>
                          <span>{t('home.payFreedom') || 'Freedom QR'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('card')) && (
                        <div className="home-store-payment-badge">
                          <span className="home-store-payment-badge__icon">
                            <BankCardIcon size={16} />
                          </span>
                          <span>{t('home.payCards') || 'Банковские карты'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('cash')) && (
                        <div className="home-store-payment-badge">
                          <span className="home-store-payment-badge__icon">
                            <WalletIcon size={16} />
                          </span>
                          <span>{t('home.payCash') || 'Наличные'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Amenities & Services */}
                {(!Array.isArray(currentStore?.features) ||
                  currentStore.features.length === 0 ||
                  [
                    'halal',
                    'bakery',
                    'cookery',
                    'coffee',
                    'self_checkout',
                    'atm',
                    'parking',
                    'carts',
                    'ramp',
                    'pharmacy',
                    'meat_cutting',
                    'fresh_bar',
                    'scales',
                    'microwave',
                    'kids_carts',
                    'lockers',
                    'wifi',
                    'pickup',
                  ].some((f) => currentStore.features.includes(f))) && (
                  <div className="home-store-amenities-section">
                    <div className="home-store-subhead">
                      <AdvantagesIcon size={14} />
                      <h4>{t('home.storeAmenitiesTitle') || 'Особенности и сервис'}</h4>
                    </div>
                    <div className="home-store-amenities-grid">
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('halal')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <DietIcon name="halal" size={15} />
                          </span>
                          <span>{t('home.amenityHalal') || 'Халал-отдел'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('bakery')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <BakeryTandyrIcon size={15} />
                          </span>
                          <span>{t('home.amenityBakery') || 'Свежая выпечка'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('cookery')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <CookeryIcon size={15} />
                          </span>
                          <span>{t('home.amenityCookery') || 'Кулинария и готовая еда'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('coffee')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <CoffeeToGoIcon size={15} />
                          </span>
                          <span>{t('home.amenityCoffee') || 'Кофе с собой'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('self_checkout')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <SelfCheckoutIcon size={15} />
                          </span>
                          <span>{t('home.amenitySelfCheckout') || 'Кассы самообслуживания'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('atm')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <AtmTerminalIcon size={15} />
                          </span>
                          <span>{t('home.amenityAtm') || 'Терминалы и банкоматы'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('parking')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <ParkingIcon size={15} />
                          </span>
                          <span>{t('home.amenityParking') || 'Удобная парковка'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('carts')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <CartIcon size={15} />
                          </span>
                          <span>{t('home.amenityCarts') || 'Корзины и тележки'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('ramp')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <AccessibleRampIcon size={15} />
                          </span>
                          <span>{t('home.amenityRamp') || 'Пандус и доступная среда'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('pharmacy')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <PharmacyPointIcon size={15} />
                          </span>
                          <span>{t('home.amenityPharmacy') || 'Аптечный пункт'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('meat_cutting')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <MeatCuttingIcon size={15} />
                          </span>
                          <span>{t('home.amenityMeatCutting') || 'Мясной цех и разделка'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('fresh_bar')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <FreshBarIcon size={15} />
                          </span>
                          <span>{t('home.amenityFreshBar') || 'Фреш и свежие соки'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('scales')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <ScalesIcon size={15} />
                          </span>
                          <span>{t('home.amenityScales') || 'Контрольные весы'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('microwave')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <MicrowaveIcon size={15} />
                          </span>
                          <span>{t('home.amenityMicrowave') || 'Зона разогрева еды'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('kids_carts')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <KidsCartIcon size={15} />
                          </span>
                          <span>{t('home.amenityKidsCarts') || 'Детские тележки'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('lockers')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <LockerIcon size={15} />
                          </span>
                          <span>{t('home.amenityLockers') || 'Камера хранения'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('wifi')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <WifiIcon size={15} />
                          </span>
                          <span>{t('home.amenityWifi') || 'Бесплатный Wi-Fi'}</span>
                        </div>
                      )}
                      {(!currentStore?.features?.length ||
                        currentStore.features.includes('pickup')) && (
                        <div className="home-store-amenity-chip">
                          <span className="home-store-amenity-chip__icon">
                            <OrderPickupIcon size={15} />
                          </span>
                          <span>{t('home.amenityPickup') || 'Самовывоз интернет-заказов'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. 7-Day Schedule Table */}
                <div className="home-store-schedule-section">
                  <div className="home-store-subhead">
                    <ClockIcon size={14} />
                    <h4>{t('home.storeScheduleTitle') || 'График работы'}</h4>
                  </div>
                  <div className="home-store-schedule-card">
                    {schedule.isConfigured && (
                      <div className="home-store-schedule-today-banner">
                        <span className="home-store-schedule-badge">
                          <span
                            className={`home-status-dot${schedule.isOpen ? ' is-open' : ' is-closed'}`}
                          />
                          <span>
                            {schedule.isOpen ? t('home.storeOpenNow') : t('home.storeClosedNow')}
                          </span>
                        </span>
                        <strong className="home-store-schedule-today-time">
                          {schedule.isTodayDayOff
                            ? t('home.storeDayOff') || 'Выходной'
                            : schedule.isOpen
                              ? t('home.storeClosesAt', { time: schedule.closes }) ||
                                `до ${schedule.closes}`
                              : t('home.storeOpensAt', { time: schedule.opens }) ||
                                `в ${schedule.opens}`}
                        </strong>
                      </div>
                    )}
                    {Array.isArray(schedule.weeklySchedule) &&
                    schedule.weeklySchedule.length > 0 ? (
                      <div className="home-store-schedule-table">
                        {schedule.weeklySchedule.map((dayItem) => {
                          const dayName = lang === 'kz' ? dayItem.dayKz : dayItem.dayRu
                          const shortName = lang === 'kz' ? dayItem.shortKz : dayItem.shortRu
                          return (
                            <div
                              key={dayItem.dayKey}
                              className={`home-store-schedule-row${dayItem.isToday ? ' is-today' : ''}${dayItem.isDayOff ? ' is-dayoff' : ''}`}
                            >
                              <div className="home-store-schedule-col-day">
                                {dayItem.isToday && (
                                  <span
                                    className="home-store-schedule-today-dot"
                                    aria-hidden="true"
                                  />
                                )}
                                <span className="home-store-schedule-dayname">{dayName}</span>
                                <span className="home-store-schedule-shortname">{shortName}</span>
                                {dayItem.isToday && (
                                  <span className="home-store-schedule-today-tag">
                                    {t('home.storeToday') || 'Сегодня'}
                                  </span>
                                )}
                              </div>
                              <div className="home-store-schedule-col-time">
                                {dayItem.isDayOff ? (
                                  <span className="home-store-schedule-off-badge">
                                    {t('home.storeDayOff') || 'Выходной'}
                                  </span>
                                ) : (
                                  <span>{dayItem.hours}</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="home-store-schedule-row">
                        <span className="home-store-schedule-days">
                          {t('home.storeScheduleAllDays')}
                        </span>
                        <span className="home-store-schedule-time">{storeHours}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Collapse Bottom Button */}
                <button
                  type="button"
                  className="home-store-collapse-bottom-btn"
                  onClick={handleCollapseStoreDetails}
                >
                  <span>{t('home.storeDetailsLess')}</span>
                  <ChevronDownIcon size={16} className="is-rotated" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Lightbox for Store Photos (Interactive with arrows, counter, touch swipe & thumbnails) */}
      {/* Portaled to body: pageEnter animation leaves a transform on .screen, which would
          turn it into the containing block for position:fixed and clip the modal */}
      {activePhotoIndex !== null &&
        normalizedPhotos?.[activePhotoIndex] &&
        createPortal(
          <div
            className="home-lightbox-modal"
            onClick={() => setActivePhotoIndex(null)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            role="dialog"
            aria-modal="true"
          >
            {/* Top Bar: Counter & Close */}
            <div className="home-lightbox-topbar" onClick={(e) => e.stopPropagation()}>
              <div className="home-lightbox-pill">
                <CameraIcon size={14} />
                <span>
                  {activePhotoIndex + 1} / {normalizedPhotos.length}
                </span>
              </div>
              <button
                type="button"
                className="home-lightbox-close"
                onClick={() => setActivePhotoIndex(null)}
                aria-label={t('common.close')}
              >
                <CloseIcon size={20} />
              </button>
            </div>

            {/* Main Stage with Navigation Arrows */}
            <div className="home-lightbox-stage" onClick={(e) => e.stopPropagation()}>
              {normalizedPhotos.length > 1 && (
                <button
                  type="button"
                  className="home-lightbox-nav home-lightbox-nav--prev"
                  onClick={handlePrevPhoto}
                  aria-label={t('home.photoPrev')}
                >
                  <ArrowBackIcon size={20} />
                </button>
              )}

              <div className="home-lightbox-img-wrap">
                <img
                  src={normalizedPhotos[activePhotoIndex].url}
                  alt={
                    normalizedPhotos[activePhotoIndex].label ||
                    `${storeName} ${activePhotoIndex + 1}`
                  }
                  className="home-lightbox-img"
                />
              </div>

              {normalizedPhotos.length > 1 && (
                <button
                  type="button"
                  className="home-lightbox-nav home-lightbox-nav--next"
                  onClick={handleNextPhoto}
                  aria-label={t('home.photoNext')}
                >
                  <ArrowForwardIcon size={20} />
                </button>
              )}
            </div>

            {/* Bottom Caption Bar */}
            <div className="home-lightbox-footer" onClick={(e) => e.stopPropagation()}>
              <div className="home-lightbox-caption">
                <span className="home-lightbox-badge">
                  <CameraIcon size={12} />
                  <span>{normalizedPhotos[activePhotoIndex].label}</span>
                </span>
              </div>

              {/* Thumbnails */}
              {normalizedPhotos.length > 1 && (
                <div className="home-lightbox-thumbs">
                  {normalizedPhotos.map((photo, idx) => (
                    <button
                      key={`${photo.url}-${idx}`}
                      type="button"
                      className={`home-lightbox-thumb-btn${idx === activePhotoIndex ? ' is-active' : ''}`}
                      onClick={() => setActivePhotoIndex(idx)}
                      aria-label={t('home.photoOf', { n: idx + 1 })}
                    >
                      <img src={photo.url} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* MODAL / SHEET: FitCheck Drawer */}
      <FitCheckDrawer
        open={fitDrawerOpen}
        onClose={() => setFitDrawerOpen(false)}
        profile={profile}
        updateProfile={updateProfile}
        onOpenFullPreferences={() => navigate(`${routes.profile}?tab=preferences`)}
      />

      {/* MODAL / SHEET: Install App Guide */}
      <InstallAppSheet
        open={installSheetOpen}
        onClose={() => setInstallSheetOpen(false)}
        installPrompt={installPrompt}
        onPromptUsed={() => setInstallPrompt(null)}
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
