import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { setLang, useI18n } from '../i18n/index.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { supabase } from '../utils/supabase.js'
import {
  hydrateProductsFromFavoriteRows,
  hydrateProductsFromScanRows,
} from '../domain/product/resolver.js'
import { buildHistoryOwnerKey, readLocalScanHistory } from '../utils/localHistory.js'
import { loadSoundSettings, saveSoundSettings } from '../utils/soundSettings.js'
import {
  browserNotificationStatus,
  DEFAULT_NOTIFICATION_SETTINGS,
  loadNotificationSettings,
  registerPushServiceWorker,
  saveNotificationSettings,
  urlBase64ToUint8Array,
} from '../utils/notificationSettings.js'
import ProfileStatsTabs from '../components/profile/ProfileStatsTabs.jsx'
import {
  buildAccountPath,
  buildHistoryPath,
  buildPrivacyPath,
  buildProfileEditPath,
  buildFaqPath,
  buildAboutPath,
  buildTermsPath,
} from '../utils/routes.js'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import AuthPromptModal from '../components/AuthPromptModal.jsx'
import SegmentedToggle from '../components/SegmentedToggle.jsx'
import Toggle from '../components/Toggle.jsx'
import SupportBottomSheet from '../components/SupportBottomSheet.jsx'
import { ALLERGENS } from '../constants/allergens.js'
import { DIET_GOALS } from '../constants/dietGoals.js'
import { buildAuthNavigateState } from '../utils/authFlow.js'
import { useTheme } from '../utils/theme.js'
import { resolveBannerSrc } from '../constants/bannerPresets.js'

/* ─── DIET/ALLERGEN ICONS ─── */
export function DietIcon({ name, size = 24 }) {
  const w = size,
    h = size,
    lc = 'round',
    lj = 'round'
  const icons = {
    halal: (
      <svg width={w} height={h} viewBox="0 0 16 16" fill="currentColor">
        <path d="M0.191809375 8c0 -4.330375 3.509625 -7.84 7.84 -7.84 1.010625 0 1.978375 0.1929375 2.8665 0.5420625 0.226625 0.0888125 0.3521875 0.3276875 0.300125 0.5635s-0.2695 0.398125 -0.5114375 0.37975c-0.147 -0.0091875 -0.2970625 -0.0153125 -0.447125 -0.0153125 -3.5188125 0 -6.37 2.8511875 -6.37 6.37s2.8511875 6.37 6.37 6.37c0.1500625 0 0.300125 -0.006125 0.447125 -0.0153125 0.2419375 -0.0153125 0.459375 0.1439375 0.5114375 0.37975s-0.0735 0.4746875 -0.300125 0.5635c-0.888125 0.349125 -1.855875 0.5420625 -2.8665 0.5420625 -4.330375 0 -7.84 -3.509625 -7.84 -7.84Zm11.496625 -3.632125c0.1071875 -0.2174375 0.4195625 -0.2174375 0.52675 0l0.9646875 1.953875c0.042875 0.08575 0.1255625 0.147 0.2205 0.1623125l2.156 0.312375c0.2419375 0.0336875 0.336875 0.33075 0.1623125 0.50225l-1.5588125 1.519c-0.0704375 0.067375 -0.1010625 0.165375 -0.08575 0.2603125l0.3675 2.1468125c0.0398125 0.238875 -0.2113125 0.422625 -0.4256875 0.3093125l-1.929375 -1.0136875c-0.08575 -0.0459375 -0.1868125 -0.0459375 -0.2725625 0l-1.929375 1.0136875c-0.214375 0.1133125 -0.4685625 -0.0704375 -0.4256875 -0.3093125l0.3675 -2.1468125c0.0153125 -0.0949375 -0.0153125 -0.1929375 -0.08575 -0.2603125l-1.55575 -1.519c-0.1745625 -0.1715 -0.079625 -0.4655 0.1623125 -0.50225l2.156 -0.312375c0.0949375 -0.0153125 0.177625 -0.0735 0.2205 -0.1623125l0.9646875 -1.953875Z" />
      </svg>
    ),
    nosugar: (
      <svg
        width={w}
        height={h}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap={lc}
        strokeLinejoin={lj}
      >
        <path d="M12 4l7 3.5v7l-7 3.5-7-3.5v-7l7-3.5z" />
        <path d="M12 10.5l7-3.5M12 10.5l-7-3.5M12 10.5v7" />
        <line x1="2" y1="22" x2="22" y2="2" stroke="currentColor" />
      </svg>
    ),
    nodairy: (
      <svg
        width={w}
        height={h}
        viewBox="0 0 256 256"
        fill="none"
        stroke="currentColor"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M128 224a80 80 0 01-80-80V120a80 80 0 0180 80Z" />
        <line x1="48" y1="40" x2="208" y2="216" />
        <path d="M208 120V64a79.9 79.9 0 00-64.8 33.1" />
        <path d="M205.1 165.3A80.3 80.3 0 00208 144V120a79.6 79.6 0 00-36.2 8.6" />
        <path d="M146.7 148.6A79.7 79.7 0 00128 200v24a79.9 79.9 0 0061.3-28.6" />
        <path d="M48 120V64a79.9 79.9 0 0125.6 4.2" />
        <path d="M98.5 48A104.7 104.7 0 01128 24S160.4 40.2 172 72.6" />
      </svg>
    ),
    nogluten: (
      <svg
        width={w}
        height={h}
        viewBox="0 0 256 256"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <path d="M53.92,34.62A8,8,0,1,0,42.08,45.38l9.73,10.71Q49.91,56,48,56a8,8,0,0,0-8,8v80a88.1,88.1,0,0,0,88,88h0a87.82,87.82,0,0,0,61.21-24.78l12.87,14.16a8,8,0,1,0,11.84-10.76ZM136.29,149A88.17,88.17,0,0,0,128,163.37a88.16,88.16,0,0,0-72-51V72.44a71.31,71.31,0,0,1,13.18,2.75ZM120,215.56A72.1,72.1,0,0,1,56,144V128.44A72.1,72.1,0,0,1,120,200Zm16,0V200a72.09,72.09,0,0,1,11.36-38.81l31.08,34.19A71.85,71.85,0,0,1,136,215.56ZM216,144a88.13,88.13,0,0,1-3.15,23.4,8,8,0,0,1-7.71,5.88A7.79,7.79,0,0,1,203,173a8,8,0,0,1-5.59-9.83A72.55,72.55,0,0,0,200,144V128.43a71.07,71.07,0,0,0-24.56,7.33,8,8,0,1,1-7.24-14.26,86.64,86.64,0,0,1,31.8-9.14V72.45a72.33,72.33,0,0,0-50.35,29.36,8,8,0,1,1-13-9.39,88.15,88.15,0,0,1,25.16-23.3C152.62,49.8,135.45,37.74,128,33.2A100.2,100.2,0,0,0,104.6,53.14,8,8,0,1,1,92.39,42.81a112.32,112.32,0,0,1,32-26,8,8,0,0,1,7.16,0c1.32.66,30.27,15.43,44.59,45.15A87.91,87.91,0,0,1,208,56a8,8,0,0,1,8,8Z"></path>
      </svg>
    ),
    vegan: (
      <svg
        width={w}
        height={h}
        viewBox="0 0 432 432"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="15"
        strokeLinejoin="round"
      >
        <path d="M313.7 43.7c6.2-5.4 11.8-10.9 15.6-17.8 1.7-3.1 4.2-4.8 7.7-4.6 3.7.2 6.1 2.4 7.3 5.9 3.2 9.3 5.5 18.8 7.8 28.4 5.8 24.4 9.4 49.1 8.9 74.2-.8 39.6-8 78-27.4 113-27.3 49.2-68.5 80.6-123.6 93.6-19.5 4.6-39.2 5.6-59 4.9-5.6-.2-8.9-3.3-9.1-8-0.3-5 2.3-8.2 8.1-8.7 5.5-.5 11-.3 16.5-.3 32.9-.3 63.8-8.2 91.8-25.4 36.2-22.3 60.2-54.6 73.5-94.8 13.6-41.1 15.8-83.1 7.5-125.6-1.7-9-3.7-17.9-5.6-26.9-0.1-.4-.5-.8-.8-1.3-0.5.1-1.1.1-1.4.4-19.2 19.5-43.5 29.7-68.9 38-17.8 5.8-36.1 9.5-54 14.9-34.6 10.5-62.8 29.7-82.3 60.5-13.8 21.8-20.9 45.9-23.1 71.5-1.4 16.5-1.1 32.9 1.7 49.3.7 4.3-.7 8-4.4 10.4-4.5 3-9.7.6-11.6-5.3-2.2-6.7-2.6-13.8-3-20.7-1.6-27.1.3-54 9.3-79.8 16.5-47.3 49-79.1 95.3-97.4 17.9-7.1 36.7-10.7 55.1-16 22-6.3 44-13.4 62.6-27.4 1.9-1.4 3.7-2.9 5.8-4.6z" />
        <path d="M119.7 295.8c16.9-28.8 36.7-54.9 59.7-78.5 24.3-24.9 51.5-46.4 79.8-66.5 5.6-4 10.6-3.4 13.5 1 2.7 4.1 1.8 8.4-3.2 12-15.1 10.8-29.7 22.1-43.8 34-52.7 44.4-94 97-115.6 163.4-5.2 16-8.5 32.5-10 49.3-0.8 8.5-4.1 12.3-9.9 11.6-5.4-.6-7.9-5.8-7.1-13.8 3.9-40.1 17.1-77.1 36.6-112.5z" />
      </svg>
    ),
    veggie: (
      <svg
        width={w}
        height={h}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 21h10" />
        <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" />
        <path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.51 2.51 0 0 1 .03 1.1" />
        <path d="m13 12 4-4" />
        <path d="M10.9 7.25A3.99 3.99 0 0 0 4 10c0 .73.2 1.41.54 2" />
      </svg>
    ),
    lowfat: (
      <svg
        width={w}
        height={h}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3c-2.8 3.4-5 6.3-5 9.2A5 5 0 0 0 12 17a5 5 0 0 0 5-4.8c0-2.9-2.2-5.8-5-9.2Z" />
        <path d="M9 20h6" />
      </svg>
    ),
    keto: (
      <svg
        width={w}
        height={h}
        viewBox="325 160 330 410"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinejoin="round"
      >
        <path d="M572.7 184.2c21.1 15 34.9 35.5 45.6 58.2 6.5 13.6 7.1 10.6-6 16.9-12 5.7-24.8 8.7-37.9 10.1-2.6.3-5.3.4-8.3 1.8 3.2 8.6 7.2 16.6 11.5 24.4 10.5 18.6 22.1 36.6 30.8 56.1 8.6 19.1 15.2 38.8 15.5 60 .5 33.7-9.4 64-32.2 89.4-21.9 24.4-49.1 39.4-81.6 43.5-47.3 6-87.9-8.2-120.2-43.8-17.9-19.7-28.2-43.1-31-69.5-2.8-25.1 1.8-49 11.5-72.2 6.3-14.9 13.5-29.4 22.1-43 16-25.2 28.2-52.2 36-81 8-29.3 27.7-43.3 56.7-46.5 2.7-.3 4.6-1.9 6.7-3.2 20.2-12.7 41.5-17.7 64.7-9.6 5.8 2 11 4.9 16.3 8.4zM496.3 523.7c31.3-1.7 57.8-14.1 78.6-37.5 24.5-27.5 33.3-60.1 27.9-96.4-3.3-22.6-12.8-43.1-24.2-62.5-15.3-26-27.9-53-35.7-82.2-1.7-6.6-4.1-13.1-8.8-18.3-14-15.9-31.8-22.3-52.5-18.8-21.4 3.7-36.4 15.4-42.5 37.2-6.2 22-13.6 44-25.1 63.9-6.8 11.8-13.8 23.6-19.6 36-11.2 23.9-18.9 48.5-16.3 75.6 2.3 24 10.8 45.3 26.4 63.4 23.9 27.6 54.3 41.1 91.9 40z" />
        <path d="M500.8 335.9c29.7 6.8 45.5 27 52.9 54.5 7.5 28 3 54.3-14.5 77.6-12.1 16.2-28.4 25.8-49.1 25.3-21.3-.5-37.2-11.3-49.1-28.3-22.9-32.6-20-80.4 6.8-109.8 14-15.4 31.6-22.3 53-19.3zm-46.1 93.6c-5.8-25.8 1.7-46.9 22-63.6 4.2-3.5 5.5-7.4 3-10.6-2.4-3.2-6.8-3.2-11.1 0-5.1 3.8-9.5 8.3-13.5 13.3-25.4 32-19.2 80 13.6 104 4.4 3.2 8.6 3.1 11.1-.2 2.4-3.2 1.4-6.9-2.8-10.2-10.6-8.4-18.1-18.9-22.2-32.7z" />
      </svg>
    ),
    kids: (
      <svg
        width={w}
        height={h}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap={lc}
        strokeLinejoin={lj}
      >
        <circle cx="9" cy="8" r="2.3" />
        <circle cx="15.5" cy="9.5" r="1.8" />
        <path d="M5.5 18c.7-2.5 2.5-4 4.5-4s3.8 1.5 4.5 4M13.5 18c.4-1.6 1.5-2.7 3-2.7s2.7 1.1 3 2.7" />
      </svg>
    ),
    milk: (
      <svg
        width={w}
        height={h}
        viewBox="0 0 256 256"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="round"
      >
        <path d="M174 47.8a254.2 254.2 0 00-41.5-38.3 8 8 0 00-9.2 0 254.2 254.2 0 00-41.3 38.3C54.5 79.3 40 112.6 40 144a88 88 0 00176 0c0-31.4-14.5-64.7-42-96.3zM128 216a72.1 72.1 0 01-72-72c0-57.2 55.5-105 72-118 16.5 13 72 60.8 72 118a72.1 72.1 0 01-72 72zm55.9-62.7a57.6 57.6 0 01-46.6 46.6 8.8 8.8 0 01-8 0 8 8 0 01-1.3-15.9c16.6-2.8 30.6-16.9 33.4-33.5a8 8 0 0115.8 2.7z" />
      </svg>
    ),
    egg: (
      <svg
        width={w}
        height={h}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap={lc}
        strokeLinejoin={lj}
      >
        <path d="M12 3C8.8 3 6.5 8 6.5 12.3a5.5 5.5 0 1011 0C17.5 8 15.2 3 12 3Z" />
      </svg>
    ),
    wheat: (
      <svg
        width={w}
        height={h}
        viewBox="0 0 256 256"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="round"
      >
        <path d="M208 56a87.5 87.5 0 00-31.9 6c-14.3-29.7-43.3-44.5-44.6-45.1a8 8 0 00-7.2 0c-1.3.7-30.3 15.4-44.6 45.1A87.5 87.5 0 0048 56a8 8 0 00-8 8v80a88 88 0 00176 0V64a8 8 0 00-8-8zM120 215.6a72.1 72.1 0 01-64-71.6V128.4a72.1 72.1 0 0164 71.6zm0-66.1a88 88 0 00-64-37.1V72.4a72.1 72.1 0 0164 71.6zm-25.9-80.4c9.2-19.2 26.4-31.3 33.9-35.9 7.4 4.6 24.6 16.7 33.8 35.9A88.6 88.6 0 00128 107.4a88.6 88.6 0 00-33.9-38.3zM200 144a72.1 72.1 0 01-64 71.6V200a72.1 72.1 0 0164-71.6zm0-31.6a88 88 0 00-64 37.1V144a72.1 72.1 0 0164-71.6z" />
      </svg>
    ),
    nuts: (
      <svg
        width={w}
        height={h}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap={lc}
        strokeLinejoin={lj}
      >
        <path d="M12 4c4.2 0 6.8 2.7 6.8 6.3 0 4.8-3.4 8.8-6.8 9.7-3.4-.9-6.8-4.9-6.8-9.7C5.2 6.7 7.8 4 12 4Z" />
      </svg>
    ),
    peanut: (
      <svg
        width={w}
        height={h}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap={lc}
        strokeLinejoin={lj}
      >
        <path d="M10 4.5a3.5 3.5 0 100 7h4a3.5 3.5 0 100-7h-4ZM10 12.5a3.5 3.5 0 100 7h4a3.5 3.5 0 100-7h-4Z" />
      </svg>
    ),
    soy: (
      <svg
        width={w}
        height={h}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap={lc}
        strokeLinejoin={lj}
      >
        <ellipse cx="9" cy="10" rx="3.6" ry="5.2" transform="rotate(-18 9 10)" />
        <ellipse cx="15" cy="10" rx="3.6" ry="5.2" transform="rotate(18 15 10)" />
      </svg>
    ),
    fish: (
      <svg
        width={w}
        height={h}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap={lc}
        strokeLinejoin={lj}
      >
        <path d="M20 12c-3-3.4-7-4.8-12-3.4L4 12l4 3.4c5 1.6 9 .2 12-3.4Z" />
      </svg>
    ),
    shell: (
      <svg
        width={w}
        height={h}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap={lc}
        strokeLinejoin={lj}
      >
        <path d="M15 5c2 1.4 3 3.8 2 6.6l-2 2.8-2.8 1.7-1.7 3.4" />
        <path d="M15 5c-2 0-3.8 1-5 2.8L8.3 12l1.5 3.2" />
      </svg>
    ),
    sesame: (
      <svg
        width={w}
        height={h}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap={lc}
        strokeLinejoin={lj}
      >
        <ellipse cx="8" cy="12" rx="2.2" ry="3.4" transform="rotate(-18 8 12)" />
        <ellipse cx="16" cy="12" rx="2.2" ry="3.4" transform="rotate(18 16 12)" />
      </svg>
    ),
  }
  return icons[name] || null
}

import { useUserData } from '../contexts/UserDataContext.jsx'

/* ─── Sun / Moon SVG glyphs (outline + filled variants) ───
 * Same 18×18 viewbox as the language buttons' visual height so both
 * controls end up identically sized. The "filled" variant kicks in when
 * the option is active, giving a subtle hint that the option is "lit". */

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
      style={{
        transition: 'transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: filled ? 'scale(1.05) rotate(0deg)' : 'scale(0.92) rotate(-12deg)',
      }}
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
      style={{
        transition: 'transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: filled ? 'scale(1.05) rotate(-8deg)' : 'scale(0.92) rotate(12deg)',
      }}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

/**
 * ThemeModeToggle — wrapper around SegmentedToggle. Always renders Sun
 * on the left, Moon on the right. Active glyph is "filled", inactive is
 * outline; the sliding thumb plus the glyph fill swap give the toggle
 * a tactile, animated feel without any of the layout-based jankiness
 * that the previous (sliding thumb + box-shadow) implementation had.
 */
function ThemeModeToggle({ theme, onToggle, label, t }) {
  return (
    <SegmentedToggle
      ariaLabel={label}
      activeKey={theme === 'light' ? 'light' : 'dark'}
      onChange={() => onToggle()}
      options={[
        {
          key: 'light',
          ariaLabel: t('profile.lightTheme'),
          render: (active) => <SunGlyph filled={active} />,
        },
        {
          key: 'dark',
          ariaLabel: t('profile.darkTheme'),
          render: (active) => <MoonGlyph filled={active} />,
        },
      ]}
    />
  )
}

function useScrollRestore(key) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const cache = window.__korset_scroll_cache || (window.__korset_scroll_cache = {})
    if (cache[key] !== undefined) {
      el.scrollTop = cache[key]
    }
    const handleScroll = () => {
      cache[key] = el.scrollTop
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [key])
  return ref
}

export default function ProfileScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { lang, t } = useI18n()
  const allergenInputRef = useRef(null)
  const { profile, updateProfile: setProfile } = useProfile()
  const { user, displayName, avatarId, bannerUrl, internalUserId, logout } = useAuth()
  const { favoritesCount, scanCount } = useUserData()
  const { currentStore } = useStore()
  const { theme, toggleTheme } = useTheme()
  const scrollRef = useScrollRestore('profile')

  const [allergenInput, setAllergenInput] = useState('')
  // Active stats tab: 'favorites' | 'preferences' | 'history' | null
  const [activeTab, setActiveTab] = useState(() => {
    const tab = new URLSearchParams(location.search).get('tab')
    return ['favorites', 'preferences', 'history'].includes(tab) ? tab : null
  })
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [scannerSettingsExpanded, setScannerSettingsExpanded] = useState(false)
  const [notificationsExpanded, setNotificationsExpanded] = useState(false)

  const activeTabRef = useRef(activeTab)
  const authPromptOpenRef = useRef(authPromptOpen)
  const supportOpenRef = useRef(supportOpen)

  useEffect(() => {
    activeTabRef.current = activeTab
    authPromptOpenRef.current = authPromptOpen
    supportOpenRef.current = supportOpen
  })

  useEffect(() => {
    const handlePopState = () => {
      if (authPromptOpenRef.current) {
        setAuthPromptOpen(false)
      } else if (supportOpenRef.current) {
        setSupportOpen(false)
      } else if (activeTabRef.current) {
        setActiveTab(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const [pushBusy, setPushBusy] = useState(false)
  const [pushStatus, setPushStatus] = useState('')
  const [pushSettings, setPushSettings] = useState(() => ({
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...loadNotificationSettings(),
    ...browserNotificationStatus(),
  }))

  useEffect(() => {
    setPushSettings((prev) => ({
      ...prev,
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...loadNotificationSettings(),
      ...browserNotificationStatus(),
    }))
  }, [profile])

  useEffect(() => {
    const syncOnFocus = () => {
      setPushSettings((prev) => {
        const browser = browserNotificationStatus()
        const needsUpdate =
          prev.status !== browser.status || prev.pushSupported !== browser.pushSupported
        if (!needsUpdate) return prev
        const next = { ...prev, ...browser }
        saveNotificationSettings(next)
        return next
      })
    }
    window.addEventListener('focus', syncOnFocus)
    return () => window.removeEventListener('focus', syncOnFocus)
  }, [])

  // Lazy-loaded mini-grids for favorites/history tabs (top 6 each).
  // null = not loaded yet, [] = loaded but empty, [items] = loaded with content.
  const [topFavorites, setTopFavorites] = useState(null)
  const [soundSettings, setSoundSettings] = useState(() => loadSoundSettings())
  const [topHistory, setTopHistory] = useState(null)
  const [loadingTab, setLoadingTab] = useState(null)

  const deviceId =
    typeof window !== 'undefined'
      ? localStorage.getItem('korset_device_id') || crypto.randomUUID?.() || null
      : null

  useEffect(() => {
    if (deviceId && !localStorage.getItem('korset_device_id')) {
      localStorage.setItem('korset_device_id', deviceId)
    }
  }, [deviceId])

  async function togglePush(checked) {
    if (!checked) {
      try {
        setPushBusy(true)
        const registration = await navigator.serviceWorker?.getRegistration('/sw.js')
        const subscription = await registration?.pushManager?.getSubscription?.()
        if (subscription) {
          try {
            await fetch('/api/push/unsubscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: subscription.endpoint, deviceId }),
            })
          } catch {
            // server unsubscribe failed — continue with local cleanup
          }
          await subscription.unsubscribe()
        }
        const next = {
          ...pushSettings,
          ...browserNotificationStatus(),
          enabled: false,
          subscriptionActive: false,
        }
        setPushSettings(next)
        saveNotificationSettings(next)
        setPushStatus(t('notification.unsubscribed'))
      } catch {
        setPushStatus(t('notification.unsubscribeFailed'))
      } finally {
        setPushBusy(false)
        setTimeout(() => setPushStatus(''), 3000)
      }
      return
    }

    if (!pushSettings.pushSupported) {
      setPushStatus(t('notification.pushUnsupported'))
      setTimeout(() => setPushStatus(''), 3000)
      return
    }
    try {
      setPushBusy(true)
      const result = await Notification.requestPermission()
      if (result !== 'granted') {
        const next = { ...pushSettings, ...browserNotificationStatus(), enabled: false }
        setPushSettings(next)
        saveNotificationSettings(next)
        setPushStatus(t('notification.accessNotGranted'))
        return
      }
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        setPushStatus(t('notification.vapidNotSet'))
        return
      }
      const registration = await registerPushServiceWorker()
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })
      }
      let authHeaders = {}
      if (user) {
        const { data } = await supabase.auth.getSession()
        if (data?.session?.access_token) {
          authHeaders = { Authorization: `Bearer ${data.session.access_token}` }
        }
      }
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          subscription,
          authUserId: user?.id || null,
          deviceId,
          storeSlug: currentStore?.slug || null,
        }),
      })
      if (!response.ok) {
        if (response.status === 401) {
          setPushStatus(t('notification.loginForSubscribe'))
          return
        }
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'subscribe_failed')
      }
      const next = {
        ...pushSettings,
        ...browserNotificationStatus(),
        enabled: true,
        subscriptionActive: true,
      }
      setPushSettings(next)
      saveNotificationSettings(next)
      setPushStatus(t('notification.deviceSubscribed'))
    } catch {
      setPushStatus(t('notification.subscribeFailed'))
    } finally {
      setPushBusy(false)
      setTimeout(() => setPushStatus(''), 3000)
    }
  }

  useEffect(() => {
    if (activeTab !== 'favorites' || topFavorites !== null) return
    if (!user || !internalUserId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTopFavorites([])
      return
    }
    let cancelled = false

    setLoadingTab('favorites')
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('user_favorites')
          .select('ean, global_product_id, added_at')
          .eq('user_id', internalUserId)
          .order('added_at', { ascending: false })
          .limit(6)
        if (error) throw error
        const hydrated = await hydrateProductsFromFavoriteRows(data || [])
        if (!cancelled) setTopFavorites(hydrated)
      } catch {
        // favorites fetch failed silently
        if (!cancelled) setTopFavorites([])
      } finally {
        if (!cancelled) setLoadingTab((cur) => (cur === 'favorites' ? null : cur))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeTab, user, internalUserId, topFavorites])

  useEffect(() => {
    if (activeTab !== 'history' || topHistory !== null) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingTab('history')
    ;(async () => {
      try {
        const ownerKey = buildHistoryOwnerKey(user)
        const local = readLocalScanHistory(ownerKey)
        let remoteHydrated = []
        if (user && internalUserId) {
          const { data, error } = await supabase
            .from('scan_events')
            .select('ean, global_product_id, scanned_at')
            .eq('user_id', internalUserId)
            .order('scanned_at', { ascending: false })
            .limit(20)
          if (!error) {
            remoteHydrated = await hydrateProductsFromScanRows(data || [])
          }
        }
        // Merge by ean, keep most recent occurrence
        const map = new Map()
        for (const item of [...remoteHydrated, ...local]) {
          if (!item?.ean) continue
          const time = new Date(item.scanDate || item.scannedAt || item.scanned_at || 0).getTime()
          const existing = map.get(item.ean)
          if (!existing || time >= existing._time) {
            map.set(item.ean, { ...item, _time: time })
          }
        }
        const merged = Array.from(map.values())
          .sort((a, b) => b._time - a._time)
          .slice(0, 6)
          .map(({ _time, ...rest }) => rest)
        if (!cancelled) setTopHistory(merged)
      } catch {
        // history fetch failed silently
        if (!cancelled) setTopHistory([])
      } finally {
        if (!cancelled) setLoadingTab((cur) => (cur === 'history' ? null : cur))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeTab, user, internalUserId, topHistory])

  const toggleDiet = (id) =>
    setProfile((p) => ({
      ...p,
      dietGoals: p.dietGoals.includes(id)
        ? p.dietGoals.filter((x) => x !== id)
        : [...p.dietGoals, id],
    }))
  const toggleAllergen = (id) =>
    setProfile((p) => ({
      ...p,
      allergens: p.allergens.includes(id)
        ? p.allergens.filter((x) => x !== id)
        : [...p.allergens, id],
    }))
  const addCustom = () => {
    const val = allergenInput.trim()
    if (!val || profile.customAllergens.includes(val)) return
    setProfile((p) => ({ ...p, customAllergens: [...p.customAllergens, val] }))
    setAllergenInput('')
  }
  const removeCustom = (val) =>
    setProfile((p) => ({ ...p, customAllergens: p.customAllergens.filter((x) => x !== val) }))

  const dietCount = profile.dietGoals.length + (profile.halal ? 1 : 0)
  const allergenCount = profile.allergens.length + profile.customAllergens.length
  const totalPref = dietCount + allergenCount
  const tr = (val) => (typeof val === 'object' ? val[lang] || val.ru : val)

  return (
    <>
      <style>{`
        @keyframes floatOrb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.1)} }
        @keyframes floatOrb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-25px,15px) scale(0.9)} }
        @keyframes floatOrb3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(15px,25px) scale(1.05)} }
        .pref-chip { transition: all 0.2s ease; cursor: pointer; }
        .pref-chip:active { transform: scale(0.95); }
        .settings-item { transition: background 0.15s; }
        .settings-item:active { background: var(--glass-bg) !important; }
      `}</style>

      <div
        className="screen"
        ref={scrollRef}
        style={{
          paddingTop: 0,
          overflowX: 'hidden',
          background: 'transparent',
          position: 'relative',
        }}
      >
        {/* ── FLOATING ORBS (for glass effect) ── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 120,
              left: -40,
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: 'rgba(124,58,237,0.12)',
              filter: 'blur(60px)',
              animation: 'floatOrb1 8s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 300,
              right: -30,
              width: 140,
              height: 140,
              borderRadius: '50%',
              background: 'rgba(236,72,153,0.1)',
              filter: 'blur(50px)',
              animation: 'floatOrb2 10s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 500,
              left: 60,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(52,211,153,0.08)',
              filter: 'blur(45px)',
              animation: 'floatOrb3 12s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 50,
              right: 40,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(167,139,250,0.08)',
              filter: 'blur(40px)',
              animation: 'floatOrb2 9s ease-in-out infinite',
            }}
          />
        </div>

        {/* All content above orbs */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* ── HEADER (compact) ── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 22px 10px',
            }}
          >
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 30,
                fontWeight: 500,
                color: 'var(--text)',
                margin: 0,
                lineHeight: 1,
                letterSpacing: 0.2,
              }}
            >
              {t('profile.title')}
            </h1>
            {user && (
              <button
                onClick={() => navigate(buildProfileEditPath(currentStore?.slug || null))}
                aria-label={t('profile.editBtn')}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 0,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: 'var(--text)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
            )}
            {user && new URLSearchParams(window.location.search).has('dev') && (
              <button
                onClick={() => navigate('/setup-profile')}
                style={{
                  marginLeft: 4,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'var(--error-dim)',
                  border: '1px solid var(--error-border)',
                  color: 'var(--error-bright)',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  cursor: 'pointer',
                }}
              >
                DEV: Wizard
              </button>
            )}
          </div>

          {/* ── BANNER CARD ──────────────────────────────────────────────
            Two distinct rendering paths:

            • AUTHENTICATED: full preset banner image + avatar + name pill,
              same as before. The whole card is decorative (not clickable);
              edit happens via the pencil button in the header.

            • GUEST: a clean, theme-aware placeholder (NO patterns or
              stripes — those looked busy). The card itself + the avatar
              circle are buttons that open the AuthPromptModal. The "Войти"
              CTA at the bottom navigates straight to /auth (preserving
              the previous behaviour the user had). All colours come from
              CSS theme variables so the placeholder reads correctly in
              both light and dark themes — no more avatar-blends-into-bg.
            ────────────────────────────────────────────────────────────── */}
          <div style={{ padding: '0 16px 0' }}>
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 8.5',
                maxHeight: 247,
                minHeight: 190,
                borderRadius: 24,
                overflow: 'hidden',
                background: user
                  ? 'linear-gradient(135deg, #1E0A3C 0%, #6D28D9 100%)'
                  : 'var(--bg-card)',
                boxShadow: user ? '0 12px 40px rgba(0,0,0,0.35)' : '0 8px 24px rgba(0,0,0,0.10)',
                border: user ? 'none' : '1px solid var(--glass-border)',
              }}
            >
              {user ? (
                <>
                  <img
                    src={resolveBannerSrc(bannerUrl || user?.user_metadata?.banner_url || null)}
                    alt=""
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      pointerEvents: 'none',
                    }}
                  />
                  {/* Bottom gradient for legibility */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)',
                      pointerEvents: 'none',
                    }}
                  />
                </>
              ) : (
                /* Guest backdrop: a soft radial highlight in the upper
                   area gives the placeholder a sense of depth without
                   reading as "broken". A single click anywhere on this
                   layer opens the auth prompt. */
                <button
                  type="button"
                  onClick={() => {
                    try {
                      window.history.pushState(
                        { _profileInternal: true, _key: 'auth' },
                        '',
                        window.location.pathname + window.location.search
                      )
                    } catch (e) {
                      /* noop */
                    }
                    setAuthPromptOpen(true)
                  }}
                  aria-label={t('profile.authPromptTitle')}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    cursor: 'pointer',
                    background:
                      'radial-gradient(ellipse 70% 60% at 50% 28%, var(--bg-surface) 0%, transparent 75%)',
                  }}
                />
              )}

              {/* Avatar — centered, raised toward upper area.
                For guests this is a separate button (stops propagation
                so it doesn't double-fire with the backdrop button). */}
              {user ? (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '8%',
                    transform: 'translateX(-50%)',
                    width: 115,
                    height: 115,
                    borderRadius: '50%',
                    border: '3px solid var(--avatar-ring-color)',
                    padding: 3,
                    background: 'var(--avatar-ring-bg)',
                    boxShadow: 'var(--avatar-ring-shadow)',
                    boxSizing: 'border-box',
                  }}
                >
                  <ProfileAvatar
                    avatarId={avatarId || user?.user_metadata?.avatar_id}
                    name={displayName || user?.user_metadata?.full_name}
                    rounded="circle"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    try {
                      window.history.pushState(
                        { _profileInternal: true, _key: 'auth' },
                        '',
                        window.location.pathname + window.location.search
                      )
                    } catch (e) {
                      /* noop */
                    }
                    setAuthPromptOpen(true)
                  }}
                  aria-label={t('profile.authPromptTitle')}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '8%',
                    transform: 'translateX(-50%)',
                    width: 115,
                    height: 115,
                    borderRadius: '50%',
                    border: '2px solid var(--glass-border)',
                    padding: 3,
                    background: 'var(--bg-surface)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.10)',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    color: 'var(--text-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </button>
              )}

              {/* Bottom slot: name pill (auth) or Login button (guest) */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 14,
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '0 16px',
                  pointerEvents: 'none',
                }}
              >
                {user ? (
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '6px 16px',
                      borderRadius: 12,
                      background: 'var(--glass-strong)',
                      border: '1px solid var(--glass-border)',
                      backdropFilter: 'blur(6px)',
                      WebkitBackdropFilter: 'blur(6px)',
                      fontFamily: 'var(--font-display)',
                      fontSize: 22,
                      fontWeight: 600,
                      color: 'var(--text)',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      lineHeight: 1.1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {displayName || user?.user_metadata?.full_name || t('profileSetup.defaultName')}
                  </div>
                ) : (
                  /* "Войти" CTA — same behaviour as before: navigates
                     directly to /auth. The backdrop / avatar click open
                     the prompt modal as a softer pre-step. */
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/auth', {
                        state: buildAuthNavigateState(location, {
                          reason: 'profile_required',
                          message: t('profile.authRequiredMsg'),
                        }),
                      })
                    }}
                    style={{
                      pointerEvents: 'auto',
                      background: 'var(--primary)',
                      border: 'none',
                      color: 'var(--text-inverse)',
                      fontSize: 14,
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      padding: '10px 26px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      letterSpacing: 0.4,
                      boxShadow: '0 6px 18px var(--primary-glow)',
                    }}
                  >
                    {t('profile.loginBtn')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Modal: shown when a guest clicks the banner backdrop or the
              avatar slot (NOT when they click the explicit Login button). */}
          <AuthPromptModal open={authPromptOpen} onClose={() => setAuthPromptOpen(false)} />

          {/* ── STATS TABS (favorites / preferences / history) ── */}
          <div style={{ padding: '38px 20px 28px' }}>
            <ProfileStatsTabs
              activeTab={activeTab}
              onTabChange={(tab) => {
                if (tab && !activeTab) {
                  try {
                    window.history.pushState(
                      { _profileInternal: true, _key: 'tab' },
                      '',
                      window.location.pathname + window.location.search
                    )
                  } catch (e) {
                    /* noop */
                  }
                }
                setActiveTab(tab)
              }}
              favoritesCount={favoritesCount}
              scanCount={scanCount}
              preferencesCount={totalPref}
              topFavorites={topFavorites}
              topHistory={topHistory}
              loadingTab={loadingTab}
              onViewAllFavorites={() =>
                navigate(buildHistoryPath(currentStore?.slug || null, 'favorites'))
              }
              onViewAllHistory={() =>
                navigate(buildHistoryPath(currentStore?.slug || null, 'history'))
              }
              onAuthPrompt={() => {
                try {
                  window.history.pushState(
                    { _profileInternal: true, _key: 'auth' },
                    '',
                    window.location.pathname + window.location.search
                  )
                } catch (e) {
                  /* noop */
                }
                setAuthPromptOpen(true)
              }}
              t={t}
              isGuest={!user}
              preferencesContent={
                <>
                  {/* Diet */}
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--success-bright)',
                        }}
                      />
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--success-bright)',
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                        }}
                      >
                        {t('profile.diet')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <div
                        className="pref-chip"
                        onClick={() => setProfile((p) => ({ ...p, halal: !p.halal }))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          padding: '8px 14px',
                          borderRadius: 14,
                          background: profile.halal ? 'var(--primary-dim)' : 'var(--glass-subtle)',
                          border: `1px solid ${profile.halal ? 'var(--primary-mid)' : 'var(--glass-soft-border)'}`,
                        }}
                      >
                        <svg
                          width="24"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          style={{
                            transition: 'opacity 0.2s ease',
                            opacity: profile.halal ? 1 : 0.3,
                          }}
                        >
                          <path d="M0.191809375 8c0 -4.330375 3.509625 -7.84 7.84 -7.84 1.010625 0 1.978375 0.1929375 2.8665 0.5420625 0.226625 0.0888125 0.3521875 0.3276875 0.300125 0.5635s-0.2695 0.398125 -0.5114375 0.37975c-0.147 -0.0091875 -0.2970625 -0.0153125 -0.447125 -0.0153125 -3.5188125 0 -6.37 2.8511875 -6.37 6.37s2.8511875 6.37 6.37 6.37c0.1500625 0 0.300125 -0.006125 0.447125 -0.0153125 0.2419375 -0.0153125 0.459375 0.1439375 0.5114375 0.37975s-0.0735 0.4746875 -0.300125 0.5635c-0.888125 0.349125 -1.855875 0.5420625 -2.8665 0.5420625 -4.330375 0 -7.84 -3.509625 -7.84 -7.84Zm11.496625 -3.632125c0.1071875 -0.2174375 0.4195625 -0.2174375 0.52675 0l0.9646875 1.953875c0.042875 0.08575 0.1255625 0.147 0.2205 0.1623125l2.156 0.312375c0.2419375 0.0336875 0.336875 0.33075 0.1623125 0.50225l-1.5588125 1.519c-0.0704375 0.067375 -0.1010625 0.165375 -0.08575 0.2603125l0.3675 2.1468125c0.0398125 0.238875 -0.2113125 0.422625 -0.4256875 0.3093125l-1.929375 -1.0136875c-0.08575 -0.0459375 -0.1868125 -0.0459375 -0.2725625 0l-1.929375 1.0136875c-0.214375 0.1133125 -0.4685625 -0.0704375 -0.4256875 -0.3093125l0.3675 -2.1468125c0.0153125 -0.0949375 -0.0153125 -0.1929375 -0.08575 -0.2603125l-1.55575 -1.519c-0.1745625 -0.1715 -0.079625 -0.4655 0.1623125 -0.50225l2.156 -0.312375c0.0949375 -0.0153125 0.177625 -0.0735 0.2205 -0.1623125l0.9646875 -1.953875Z" />
                        </svg>
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 13,
                            fontWeight: 500,
                            color: profile.halal ? 'var(--success-bright)' : 'var(--text-disabled)',
                            transition: 'color 0.2s ease',
                          }}
                        >
                          {t('profile.halalLabel')}
                        </span>
                      </div>
                      {DIET_GOALS.map((d) => {
                        const a = profile.dietGoals.includes(d.id)
                        return (
                          <div
                            key={d.id}
                            className="pref-chip"
                            onClick={() => toggleDiet(d.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 7,
                              padding: '8px 14px',
                              borderRadius: 14,
                              background: a ? 'var(--primary-dim)' : 'var(--glass-subtle)',
                              border: `1px solid ${a ? 'var(--primary-mid)' : 'var(--glass-soft-border)'}`,
                            }}
                          >
                            <DietIcon name={d.icon} size={24} />
                            <span
                              style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: 13,
                                fontWeight: 500,
                                color: a ? 'var(--primary)' : 'var(--text-disabled)',
                              }}
                            >
                              {tr(d.label)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div
                    style={{
                      height: 1,
                      background: 'var(--glass-soft-border)',
                      margin: '0 0 20px',
                    }}
                  />

                  {/* Allergens */}
                  <div>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--error-bright)',
                        }}
                      />
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--error-bright)',
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                        }}
                      >
                        {t('profile.allergens')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                      {ALLERGENS.map((al) => {
                        const a = profile.allergens.includes(al.id)
                        return (
                          <div
                            key={al.id}
                            className="pref-chip"
                            onClick={() => toggleAllergen(al.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 7,
                              padding: '8px 12px',
                              borderRadius: 14,
                              background: 'var(--error-dim)',
                              border: '1px solid var(--error-border)',
                              color: a ? 'var(--error-bright)' : 'var(--text-disabled)',
                            }}
                          >
                            <DietIcon name={al.icon} size={14} />
                            <span
                              style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: 12,
                                fontWeight: 500,
                                color: a ? 'var(--error-bright)' : 'var(--text-disabled)',
                              }}
                            >
                              {tr(al.label)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        ref={allergenInputRef}
                        value={allergenInput}
                        onChange={(e) => setAllergenInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                        placeholder={t('profile.customPlaceholder')}
                        style={{
                          flex: 1,
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-soft-border)',
                          borderRadius: 12,
                          padding: '10px 14px',
                          color: 'var(--text)',
                          fontSize: 12,
                          fontFamily: 'var(--font-display)',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={addCustom}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 12,
                          background: 'var(--primary)',
                          border: 'none',
                          color: 'var(--text-inverse)',
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: 'var(--font-display)',
                          cursor: 'pointer',
                        }}
                      >
                        {t('profile.add')}
                      </button>
                    </div>
                    {profile.customAllergens.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                        {profile.customAllergens.map((val) => (
                          <span
                            key={val}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '5px 10px',
                              borderRadius: 12,
                              background: 'var(--error-dim)',
                              color: 'var(--error-bright)',
                              border: '1px solid var(--error-border)',
                              fontSize: 11,
                              fontFamily: 'var(--font-display)',
                            }}
                          >
                            {val}
                            <span
                              onClick={() => removeCustom(val)}
                              style={{
                                cursor: 'pointer',
                                fontSize: 14,
                                lineHeight: 1,
                                opacity: 0.6,
                              }}
                            >
                              Г—
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              }
            />
          </div>

          {/* ── SETTINGS ── */}
          {[
            {
              title: t('profile.sectionAccount'),
              items: [
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  ),
                  label: t('profile.sectionPersonal'),
                  onClick: () =>
                    user
                      ? navigate(buildAccountPath(currentStore?.slug || null))
                      : navigate('/auth', {
                          state: buildAuthNavigateState(location, {
                            reason: 'profile_required',
                            message: t('profile.authRequiredPDataMsg'),
                          }),
                        }),
                },
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  ),
                  label: t('profile.sectionPrivacy'),
                  onClick: () => navigate(buildPrivacyPath(currentStore?.slug || null)),
                },
              ],
            },
            {
              title: t('profile.sectionSettings'),
              items: [
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                  ),
                  label: t('profile.sectionNotifications'),
                  onClick: () => setNotificationsExpanded(!notificationsExpanded),
                  right: (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-dim)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      style={{
                        transform: notificationsExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  ),
                  children: notificationsExpanded && (
                    <div
                      style={{
                        padding: '4px 18px 14px 66px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: 12,
                          lineHeight: 1.45,
                          color: 'var(--text-faint)',
                        }}
                      >
                        {t('notification.introShort')}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>
                          {t('notification.pushNotifications')}
                        </span>
                        <Toggle
                          checked={
                            pushSettings.enabled &&
                            pushSettings.subscriptionActive &&
                            pushSettings.status === 'granted'
                          }
                          disabled={
                            pushBusy ||
                            !pushSettings.pushSupported ||
                            pushSettings.status === 'denied'
                          }
                          onChange={togglePush}
                        />
                      </div>
                      {pushSettings.status === 'denied' && (
                        <div style={{ fontSize: 11, color: 'var(--error-bright)' }}>
                          {t('notification.permissionDenied')}
                        </div>
                      )}
                      {!pushSettings.pushSupported && pushSettings.status !== 'denied' && (
                        <div style={{ fontSize: 11, color: 'var(--text-disabled)' }}>
                          {t('notification.pushUnsupported')}
                        </div>
                      )}
                      {pushBusy && (
                        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                          {t('notification.subscribing')}
                        </div>
                      )}
                      {pushStatus && !pushBusy && (
                        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{pushStatus}</div>
                      )}
                    </div>
                  ),
                },
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                    </svg>
                  ),
                  label: t('profile.languageHeader'),
                  right: (
                    <SegmentedToggle
                      ariaLabel={t('profile.languageHeader')}
                      activeKey={lang}
                      onChange={(k) => setLang(k)}
                      options={[
                        { key: 'ru', label: 'RU', ariaLabel: t('common.langRu') },
                        { key: 'kz', label: 'KZ', ariaLabel: 'Қазақ' },
                      ]}
                    />
                  ),
                },
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                    </svg>
                  ),
                  label: t('profile.theme'),
                  onClick: toggleTheme,
                  right: (
                    <ThemeModeToggle
                      theme={theme}
                      onToggle={toggleTheme}
                      label={`${t('profile.theme')}: ${theme === 'light' ? 'Light' : 'Dark'}`}
                      t={t}
                    />
                  ),
                },
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                  ),
                  label: t('profile.scannerSettings') || 'Настройки сканера',
                  onClick: () => setScannerSettingsExpanded(!scannerSettingsExpanded),
                  right: (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-dim)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      style={{
                        transform: scannerSettingsExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  ),
                  children: scannerSettingsExpanded && (
                    <div
                      style={{
                        padding: '0 18px 14px 66px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>
                          {t('profile.soundScanner')}
                        </span>
                        <Toggle
                          checked={soundSettings.sound}
                          onChange={(val) => {
                            const next = { ...soundSettings, sound: val }
                            setSoundSettings(next)
                            saveSoundSettings(next)
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>
                          {t('profile.vibration')}
                        </span>
                        <Toggle
                          checked={soundSettings.vibration}
                          onChange={(val) => {
                            const next = { ...soundSettings, vibration: val }
                            setSoundSettings(next)
                            saveSoundSettings(next)
                          }}
                        />
                      </div>
                    </div>
                  ),
                },
              ],
            },
            {
              title: t('profile.sectionSupport'),
              items: [
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  ),
                  label: t('profile.faq'),
                  onClick: () => navigate(buildFaqPath(currentStore?.slug || null)),
                },
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                  ),
                  label: t('profile.feedback'),
                  onClick: () => {
                    try {
                      window.history.pushState(
                        { _profileInternal: true, _key: 'support' },
                        '',
                        window.location.pathname + window.location.search
                      )
                    } catch (e) {
                      /* noop */
                    }
                    setSupportOpen(true)
                  },
                },
              ],
            },
            {
              title: t('profile.about'),
              items: [
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                  ),
                  label: t('profile.about'),
                  onClick: () => navigate(buildAboutPath(currentStore?.slug || null)),
                },
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  ),
                  label: t('profile.terms'),
                  onClick: () => navigate(buildTermsPath(currentStore?.slug || null)),
                },
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  ),
                  label: t('profile.policy'),
                  onClick: () => navigate('/privacy-policy'),
                },
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--error-bright)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                  ),
                  label: t('profile.logout'),
                  onClick: () => logout(),
                },
              ],
            },
            ...(user && currentStore?.owner_id === user?.id
              ? [
                  {
                    title: t('account.storeOwnerTitle'),
                    items: [
                      {
                        icon: (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--primary)"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <rect x="3" y="3" width="7" height="9" rx="1" />
                            <rect x="14" y="3" width="7" height="5" rx="1" />
                            <rect x="14" y="12" width="7" height="9" rx="1" />
                            <rect x="3" y="16" width="7" height="5" rx="1" />
                          </svg>
                        ),
                        label: t('profile.retailManage'),
                        labelStyle: { color: 'var(--primary)', fontWeight: 600 },
                        iconStyle: { background: 'var(--primary-dim)' },
                        onClick: () =>
                          currentStore?.slug && navigate(`/retail/${currentStore.slug}`),
                      },
                    ],
                  },
                ]
              : []),
          ].map((group, gi) => (
            <div key={gi} style={{ padding: '0 22px 14px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-dim)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 1.5,
                  paddingLeft: 4,
                }}
              >
                {group.title}
              </div>
              <div className="glass-card" style={{ padding: 0 }}>
                {group.items.map((item, i) => (
                  <div key={i}>
                    <div
                      className="settings-item"
                      onClick={item.onClick || undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        cursor: item.onClick ? 'pointer' : 'default',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: item.iconStyle?.background || 'var(--primary-dim)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {item.icon}
                        </div>
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 15,
                            fontWeight: item.labelStyle?.fontWeight || 500,
                            color: item.labelStyle?.color || 'var(--text)',
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.label}
                        </span>
                      </div>
                      {item.right ||
                        (item.onClick && (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--text-dim)"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        ))}
                    </div>
                    {i < group.items.length - 1 && (
                      <div
                        style={{
                          height: 1,
                          background: 'var(--border)',
                          margin: '0 18px',
                        }}
                      />
                    )}
                    {item.children}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* ── FOOTER ── */}
          <div
            style={{
              textAlign: 'center',
              padding: '16px 22px calc(24px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 11,
                color: 'var(--text-faint)',
                fontWeight: 400,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Körset v1.0.0 · kz
              </span>
            </div>
          </div>
        </div>
      </div>
      <SupportBottomSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  )
}
