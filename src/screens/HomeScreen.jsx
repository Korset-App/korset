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
  getHomeDeptLabel,
  getShowcaseProducts,
  getProductDisplayBadges,
  getStorePopularityMap,
  recordProductView,
  recordProductFavorite,
  loadSeenStories,
  markStorySeen,
  sortStoriesBySeen,
} from '../domain/home/homeScreenModel.js'
import { parseStoreSchedule } from '../domain/stores/schedule.js'
import { getCategoryLabel } from '../domain/product/categoryMap.js'
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

function FilterScanIcon({ size = 22 }) {
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
      aria-hidden="true"
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" strokeWidth="2" strokeDasharray="2 2.5" />
      <circle cx="12" cy="12" r="3.5" strokeWidth="1.5" fill="none" />
      <path d="M12 9.5v-1M12 15.5v-1" strokeWidth="1.2" opacity="0.5" />
    </svg>
  )
}

function HalalBadgeIcon({ size = 13, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 288 354"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="185.7 83.67 239.48 83.67 239.48 137.45" />
        <polyline points="49.26 216.23 49.26 270.01 103.04 270.01" />
        <polyline points="49.26 140.19 49.26 83.67 105.78 83.67" />
        <polyline points="239.48 213.49 239.48 270.01 182.96 270.01" />
        <polyline points="105.78 83.67 145.74 43.71 185.7 83.67" />
        <polyline points="49.26 216.23 11.24 178.21 49.26 140.19" />
        <polyline points="239.48 137.45 277.5 175.47 239.48 213.49" />
        <polyline points="103.04 270.01 143 309.97 182.96 270.01" />
      </g>
      <path d="M201.05,163.68c-2.41-1.11-4.79-2.13-7.09-3.31-1.78-.91-3.63-1.56-5.55-2.08-4.43-1.19-8.72-.9-12.64,1.59-2.1,1.33-3.99,2.99-5.54,4.99-.19.25-.5.41-.75.62-.09-.06-.17-.12-.26-.17.23-1.14.43-2.29.7-3.42.74-3.16,1.84-6.17,3.48-9.01,2.02-3.5,4.79-5.97,8.63-7.38,2.76-1.01,5.5-1,8.22-.3,2.6.67,5.03,1.87,7.45,3.05,2.98,1.45,6.07,2.69,9.05,4.15,3.46,1.7,7.1,2.89,10.75,4.08,3.64,1.18,7.37,2.02,11.16,2.52.93.12,1.88.15,2.85.23.17.68-.31,1.03-.7,1.37-2.06,1.79-3.88,3.8-5.35,6.11-.71,1.12-1.36,2.3-1.87,3.51-.34.81-.89.97-1.6.93-2.9-.17-5.74.25-8.5,1.06-2.55.74-5.05,1.64-7.54,2.56-4.02,1.48-7.99,3.12-12.04,4.52-3.62,1.25-7.37,2.11-11.2,2.43-2.7.23-5.42.39-8.14.4-3.54,0-6.99-.61-10.2-2.2-2.28-1.13-4.23-2.7-5.7-4.78-2.51-3.54-3.88-7.57-4.59-11.82-.29-1.72-.31-3.48-.6-5.2-.82-4.89-.46-9.82-.5-14.73,0-.39.08-.78.1-1.17.02-.37,0-.73-.09-1.11-.25,1.64-.49,3.28-.74,4.91-.29,1.95-.52,3.9-.86,5.84-.56,3.21-1.09,6.42-1.81,9.59-1.03,4.54-2.41,8.97-4.52,13.15-1.38,2.73-3.15,5.14-5.21,7.4-3.3,3.63-7.47,5.68-12.08,6.98-1.01.28-2.07.37-3.09.64-2.99.8-6.04.71-9.09.64-1.65-.04-3.33-.11-4.94-.41-4.24-.79-8.45-1.72-12.67-2.6-.18-.04-.36-.13-.54-.19,0-.06.02-.13.02-.19.87-.09,1.74-.2,2.61-.28,5.59-.56,11.06-1.7,16.2-4,4.26-1.91,8.33-4.19,11.82-7.37,2.48-2.26,4.88-4.62,6.79-7.39,1.56-2.25,3.05-4.57,4.35-6.97,2.48-4.61,4.32-9.5,5.67-14.56.72-2.69,1.37-5.41,1.9-8.15.5-2.59.88-5.2,1.16-7.82.41-3.93.81-7.87.99-11.82.21-4.68.2-9.36.25-14.05.01-1.27-.09-2.53-.12-3.8-.02-.8.36-1.05,1.07-.67,2.37,1.25,4.96,1.62,7.57,1.93.75.09,1.5.2,2.26.28.39.04.5.26.46.61-.16,1.18-.32,2.37-.47,3.55-.18,1.41-.39,2.82-.5,4.24-.26,3.3-.54,6.61-.67,9.91-.11,2.7-.09,5.41-.02,8.11.08,3.15.2,6.31.43,9.45.23,3.13.54,6.27.97,9.38.58,4.17,1.29,8.32,2.36,12.41.67,2.56,1.73,4.86,3.61,6.77,2.19,2.23,4.88,3.38,7.9,3.73,2.17.25,4.37.36,6.55.25,3.04-.15,6.03-.81,8.96-1.67.96-.28,1.95-.53,2.87-.93,2.93-1.31,5.97-2.39,8.64-4.33Z" />
      <path d="M65.45,148.91c-.15.96-.33,1.88-.45,2.82-.19,1.43-.39,2.87-.48,4.3-.11,1.75-.2,3.5-.13,5.25.13,3.16.52,6.29,1.88,9.22.75,1.62,1.83,2.94,3.12,4.15,1.36,1.27,3.06,1.75,4.75,2.3,2.37.77,4.81,1.21,7.31,1.17,3.27-.06,6.41-.8,9.04-2.8,2.71-2.06,4.78-4.69,6.09-7.9.91-2.23,1.69-4.5,2.1-6.87.34-1.98.63-3.99.75-5.99.15-2.51.24-5.03.13-7.54-.13-3.05-.38-6.1-.79-9.13-.48-3.49-1.1-6.97-1.81-10.42-.8-3.83-1.77-7.62-2.68-11.42-.52-2.16-1.1-4.3-1.58-6.47-.12-.55-.04-1.19.11-1.74.85-3.11,1.81-6.2,3.59-8.94.49-.76,1.08-1.43,1.99-1.71.87-.27,1.01-.2,1.22.66.84,3.45,2.4,6.57,4.35,9.51.85,1.28,1.79,2.49,2.61,3.78.19.3.21.86.07,1.21-.94,2.3-1.44,4.69-1.67,7.14-.21,2.31-.37,4.63-.43,6.96-.07,2.6-.06,5.2.04,7.79.11,2.96.31,5.92.55,8.88.27,3.25.62,6.49.96,9.73.29,2.76.72,5.51.89,8.27.11,1.78-.05,3.59-.24,5.37-.36,3.26-1.41,6.34-2.89,9.25-1.2,2.37-2.87,4.4-4.66,6.37-2.34,2.59-5.14,4.48-8.2,6.03-1.08.55-2.24.93-3.35,1.42-3.56,1.58-7.31,1.97-11.14,1.87-2.28-.06-4.55-.41-6.65-1.31-3.51-1.5-6.61-3.6-8.57-7-1.28-2.22-2.11-4.61-2.46-7.16-.7-5.09.11-10.01,1.52-14.88,1.16-4.01,2.78-7.84,4.59-11.59.09-.18.21-.35.32-.52.02-.03.08-.02.19-.04Z" />
      <path d="M138.02,159.13c-.36-1.71-.63-3.28-1.02-4.82-.78-3.12-2.19-5.92-4.18-8.48-2.66-3.42-6.23-5.44-10.13-7.06-3.6-1.5-7.36-2.34-11.17-3.02-.65-.12-1.31-.25-1.97-.27-.53-.02-.74-.26-.83-.72-.31-1.64-.79-3.26-.9-4.91-.13-1.95-.03-3.92.12-5.87.11-1.44.31-2.91.73-4.29.22-.71.26-1.43.48-2.12.27-.89.92-1.31,1.82-1.04,4.79,1.43,9.41,3.31,13.58,6.08,2.46,1.63,4.83,3.42,6.86,5.59,4.01,4.29,6.7,9.26,7.67,15.1.66,3.95.57,7.88-.13,11.81-.21,1.17-.47,2.33-.71,3.49-.03.15-.11.29-.22.54Z" />
      <g>
        <path d="M106.09,225.46h-17.3v14.13h-10.05v-34.32h10.05v13.44h17.3v-13.44h10.05v34.32h-10.05v-14.13Z" />
        <path d="M144.83,237.71c-2.76,1.69-6.16,2.53-10.2,2.53-1.73,0-3.44-.17-5.14-.52-1.7-.35-3.22-.9-4.55-1.66-1.33-.76-2.4-1.74-3.22-2.95-.81-1.21-1.22-2.65-1.22-4.34,0-1.52.46-2.82,1.37-3.89.91-1.07,2.12-1.96,3.62-2.65,1.5-.69,3.2-1.21,5.1-1.54,1.9-.33,3.86-.5,5.88-.5,1.63,0,3.08.15,4.36.45,1.28.3,2.41.71,3.4,1.24,0-1.88-.46-3.29-1.37-4.21s-2.48-1.39-4.69-1.39-4.26.21-5.99.64c-1.73.43-3.15.93-4.29,1.49l-4.14-5.36c1.43-.83,3.35-1.52,5.77-2.08,2.41-.56,5.27-.84,8.58-.84,4.93,0,8.75.92,11.46,2.75,2.71,1.83,4.07,4.83,4.07,9v15.72h-8.8v-1.88ZM144.24,228.54c-.69-.36-1.75-.67-3.18-.92-1.43-.25-2.86-.37-4.29-.37-2.22,0-3.91.27-5.06.82-1.16.55-1.74,1.45-1.74,2.7s.55,2.11,1.66,2.65c1.11.54,2.77.82,4.99.82.74,0,1.5-.06,2.29-.17.79-.12,1.53-.27,2.22-.47.69-.2,1.31-.41,1.85-.64.54-.23.96-.46,1.26-.69v-3.72Z" />
        <path d="M158.8,205.72l10.05-2.28v36.15h-10.05v-33.87Z" />
        <path d="M197.46,237.71c-2.76,1.69-6.16,2.53-10.2,2.53-1.73,0-3.44-.17-5.14-.52-1.7-.35-3.22-.9-4.55-1.66-1.33-.76-2.4-1.74-3.22-2.95-.81-1.21-1.22-2.65-1.22-4.34,0-1.52.46-2.82,1.37-3.89.91-1.07,2.12-1.96,3.62-2.65,1.5-.69,3.2-1.21,5.1-1.54,1.9-.33,3.86-.5,5.88-.5,1.63,0,3.08.15,4.36.45,1.28.3,2.41.71,3.4,1.24,0-1.88-.46-3.29-1.37-4.21s-2.48-1.39-4.69-1.39-4.26.21-5.99.64c-1.73.43-3.15.93-4.29,1.49l-4.14-5.36c1.43-.83,3.35-1.52,5.77-2.08,2.41-.56,5.27-.84,8.58-.84,4.93,0,8.75.92,11.46,2.75,2.71,1.83,4.07,4.83,4.07,9v15.72h-8.8v-1.88ZM196.87,228.54c-.69-.36-1.75-.67-3.18-.92-1.43-.25-2.86-.37-4.29-.37-2.22,0-3.91.27-5.06.82-1.16.55-1.74,1.45-1.74,2.7s.55,2.11,1.66,2.65c1.11.54,2.77.82,4.99.82.74,0,1.5-.06,2.29-.17.79-.12,1.53-.27,2.22-.47.69-.2,1.31-.41,1.85-.64.54-.23.96-.46,1.26-.69v-3.72Z" />
        <path d="M211.44,205.72l10.05-2.28v36.15h-10.05v-33.87Z" />
      </g>
    </svg>
  )
}

function HalalIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18.5c-4.69 0-8.5-3.81-8.5-8.5S7.31 3.5 12 3.5s8.5 3.81 8.5 8.5-3.81 8.5-8.5 8.5z"
        opacity="0.3"
      />
      <path d="M14.4 7.2c-.6.3-1.1.8-1.4 1.5-.5-.3-1-.5-1.6-.5-1.7 0-3 1.5-3 3.4 0 3 3.2 5.6 4.6 6.4.2.1.5.1.7 0 1.4-.8 4.6-3.4 4.6-6.4 0-1.9-1.4-3.4-3-3.4-.7 0-1.3.2-1.8.6l.9-1.6z" />
    </svg>
  )
}

function LactoseFreeIcon({ size = 16 }) {
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
      aria-hidden="true"
    >
      <path d="M8 2h8l1 6v2a4 4 0 0 1-1.5 3.12V20a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-6.88A4 4 0 0 1 7 10V8l1-6z" />
      <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2" stroke="currentColor" />
    </svg>
  )
}

function SugarFreeIcon({ size = 16 }) {
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
      aria-hidden="true"
    >
      <rect x="6" y="6" width="12" height="12" rx="2.5" />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.25" />
      <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2" stroke="currentColor" />
    </svg>
  )
}

function GlutenFreeIcon({ size = 16 }) {
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
      aria-hidden="true"
    >
      <path d="M12 21V12" />
      <path d="M12 12c-1.5-2-4-3-4-6s2-4 4-4" />
      <path d="M12 12c1.5-2 4-3 4-6s-2-4-4-4" />
      <path d="M9 16c-1-.5-2-1.5-2-3" />
      <path d="M15 16c1-.5 2-1.5 2-3" />
      <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2" stroke="currentColor" />
    </svg>
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
  const [failedImageEans, setFailedImageEans] = useState(() => new Set())

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

  const QUICK_TOGGLES = useMemo(
    () => [
      {
        id: 'halal',
        labelKey: 'home.filterHalal',
        fallback: 'Халал',
        Icon: HalalIcon,
        isActive: Boolean(profile?.halal || profile?.halalOnly),
        toggle: () => updateProfile({ halal: !(profile?.halal || profile?.halalOnly) }),
      },
      {
        id: 'lactose_free',
        labelKey: 'home.filterLactoseFree',
        fallback: 'Без лактозы',
        Icon: LactoseFreeIcon,
        isActive: (profile?.dietGoals || []).includes('lactose_free'),
        toggle: () => {
          const diets = profile?.dietGoals || []
          const next = diets.includes('lactose_free')
            ? diets.filter((d) => d !== 'lactose_free')
            : [...diets, 'lactose_free']
          updateProfile({ dietGoals: next })
        },
      },
      {
        id: 'sugar_free',
        labelKey: 'home.filterSugarFree',
        fallback: 'Без сахара',
        Icon: SugarFreeIcon,
        isActive: (profile?.dietGoals || []).includes('sugar_free'),
        toggle: () => {
          const diets = profile?.dietGoals || []
          const next = diets.includes('sugar_free')
            ? diets.filter((d) => d !== 'sugar_free')
            : [...diets, 'sugar_free']
          updateProfile({ dietGoals: next })
        },
      },
      {
        id: 'gluten_free',
        labelKey: 'home.filterGlutenFree',
        fallback: 'Без глютена',
        Icon: GlutenFreeIcon,
        isActive: (profile?.dietGoals || []).includes('gluten_free'),
        toggle: () => {
          const diets = profile?.dietGoals || []
          const next = diets.includes('gluten_free')
            ? diets.filter((d) => d !== 'gluten_free')
            : [...diets, 'gluten_free']
          updateProfile({ dietGoals: next })
        },
      },
    ],
    [profile, updateProfile]
  )

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

      {/* 3. STORIES SECTION (CARDS WITH WEBP COVERS) */}
      <section className="home-stories-bar" aria-label={t('home.storiesLabel')}>
        {sortedStories.map((story) => {
          const originalIndex = HOME_STORY_KEYS.indexOf(story)
          const isSeen = seenStories.has(story.key)
          return (
            <button
              key={story.key}
              type="button"
              className={`home-story-card story-tone--${story.tone}${isSeen ? ' is-seen' : ' is-unseen'}`}
              onClick={() => {
                setActiveStoryIndex(originalIndex)
                setActiveSlideIndex(0)
              }}
            >
              <div className="home-story-card__media">
                <img src={story.image} alt="" loading="lazy" />
                <span className="home-story-card__overlay" />
              </div>
              <div className="home-story-card__badge" aria-hidden="true">
                <HomeIcon name={story.icon} />
              </div>
              <span className="home-story-card__title">
                {t(`home.stories.${story.key}.title`, { storeName })}
              </span>
            </button>
          )
        })}
      </section>

      {/* 4. SMART COMPOSITION FILTER — interactive quick toggles */}
      <section className="home-filter-section" aria-label={t('home.filterTitle')}>
        <div className={`home-filter-panel${isFitConfigured ? ' is-active' : ''}`}>
          <div className="home-filter-panel__header">
            <div className="home-filter-panel__title-row">
              <div className="home-filter-panel__emblem">
                <FilterScanIcon size={20} />
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

          <div className="home-filter-toggles" role="group" aria-label={t('home.filterTitle')}>
            {QUICK_TOGGLES.map(({ id, labelKey, fallback, Icon, isActive, toggle }) => (
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
                  <Icon size={16} />
                </span>
                <span className="home-filter-toggle__label">{t(labelKey) || fallback}</span>
                {isActive && (
                  <span className="home-filter-toggle__check" aria-hidden="true">
                    <svg
                      width="12"
                      height="12"
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
                <HomeIcon name="add" />
              </span>
              <span className="home-filter-toggle__label">{t('home.filterMore')}</span>
            </button>
          </div>
        </div>
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
          {HOME_DEPARTMENTS.map((dept) => {
            const label = getHomeDeptLabel(dept.key, lang)
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
                <span className="home-dept-label">{label}</span>
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
            <span className="home-dept-label">{t('home.deptAll') || 'Каталог'}</span>
          </button>
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
              const productImage = product.image || product.image_url
              const badges = getProductDisplayBadges(product)
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
                            className={`home-product-card__badge home-product-card__badge--${badge.type}`}
                            aria-label={badge.label}
                          >
                            {badge.type === 'halal' && <HalalBadgeIcon size={12} />}
                            <span>{badge.label}</span>
                          </span>
                        ))}
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
