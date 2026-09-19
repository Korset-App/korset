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
        <path d="M10 2h4M9 5h6" />
        <path d="M7 8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V8Z" />
        <line x1="10" y1="11" x2="14" y2="11" />
        <line x1="10" y1="14" x2="13" y2="14" />
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
        <path d="M12 2.5C8.5 2.5 6 8 6 13.5a6 6 0 0 0 12 0c0-5.5-2.5-11-6-11Z" />
        <path d="M9.5 9c0 2 1.5 3 2.5 3" opacity="0.6" />
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
        <path d="M8 6.5a4.5 4.5 0 0 1 8 0c0 2-1 3.5-1.5 4.5.5 1 1.5 2.5 1.5 4.5a4.5 4.5 0 0 1-8 0c0-2 1-3.5 1.5-4.5C9 10 8 8.5 8 6.5Z" />
        <line x1="10" y1="11" x2="14" y2="11" opacity="0.6" />
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
        <path d="M4 19c4-1 9-4 13-9 2-2.5 3-6 3-7-1 0-4.5 1-7 3-5 4-8 9-9 13Z" />
        <circle cx="9.5" cy="13.5" r="1.6" fill="currentColor" opacity="0.35" />
        <circle cx="14" cy="9" r="1.6" fill="currentColor" opacity="0.35" />
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
        <path d="M19 12c-3-4-8-5-14-3 1 1 2 2 2 3s-1 2-2 3c6 2 11 1 14-3Z" />
        <path d="M19 12l4-3v6l-4-3Z" />
        <circle cx="10" cy="11" r="1" fill="currentColor" />
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
        <circle cx="12" cy="14" r="5" />
        <path d="M9 9c-2-2-4-2-6 0 0 3 2 4 4 3" />
        <path d="M15 9c2-2 4-2 6 0 0 3-2 4-4 3" />
        <path d="M5 14H3M5 17l-2 1M5 11l-2-1" />
        <path d="M19 14h2M19 17l2 1M19 11l2-1" />
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
        <path d="M8.5 7.5C8.5 9.5 7 11.5 6 12.5 5 11.5 3.5 9.5 3.5 7.5a2.5 2.5 0 0 1 5 0Z" />
        <path d="M15.5 13.5c0 2-1.5 4-2.5 5-1-1-2.5-3-2.5-5a2.5 2.5 0 0 1 5 0Z" />
        <path d="M20.5 7.5c0 2-1.5 4-2.5 5-1-1-2.5-3-2.5-5a2.5 2.5 0 0 1 5 0Z" />
      </svg>
    ),
    celery: (
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
        <path d="M8 21c1-6 2-11 3-15" />
        <path d="M12 21c0-5 1-10 2-14" />
        <path d="M16 21c-1-6-1-11-1-15" />
        <path d="M9 5c-1.5-1.5-1.5-3 0-3s3 1.5 1.5 3" />
        <path d="M14 6c1.5-1.5 3-1.5 3 0s-1.5 3-3 1.5" />
        <path d="M11 3c0-1.5 1.5-2 2-1s1 2 0 3" />
      </svg>
    ),
    mustard: (
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
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <circle cx="12" cy="6" r="3" />
        <circle cx="12" cy="18" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="12" r="3" />
      </svg>
    ),
    sulfites: (
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
        <path d="M10 3h4M11 3v4.5L6.5 17A2 2 0 0 0 8.2 20h7.6a2 2 0 0 0 1.7-3L13 7.5V3" />
        <line x1="8" y1="15" x2="16" y2="15" opacity="0.6" />
        <circle cx="12" cy="17.5" r="0.75" fill="currentColor" />
      </svg>
    ),
  }
  icons.nutrition = icons.celery
  icons.science = icons.sulfites
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
  const { user, displayName, avatarId, bannerUrl, internalUserId, logout, isSuperadmin } = useAuth()
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
                            <DietIcon name={al.icon} size={16} />
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
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M7.25007 2.38782C8.54878 2.0992 10.1243 2 12 2C13.8757 2 15.4512 2.0992 16.7499 2.38782C18.06 2.67897 19.1488 3.176 19.9864 4.01358C20.824 4.85116 21.321 5.94002 21.6122 7.25007C21.9008 8.54878 22 10.1243 22 12C22 13.8757 21.9008 15.4512 21.6122 16.7499C21.321 18.06 20.824 19.1488 19.9864 19.9864C19.1488 20.824 18.06 21.321 16.7499 21.6122C15.4512 21.9008 13.8757 22 12 22C10.1243 22 8.54878 21.9008 7.25007 21.6122C5.94002 21.321 4.85116 20.824 4.01358 19.9864C3.176 19.1488 2.67897 18.06 2.38782 16.7499C2.0992 15.4512 2 13.8757 2 12C2 10.1243 2.0992 8.54878 2.38782 7.25007C2.67897 5.94002 3.176 4.85116 4.01358 4.01358C4.85116 3.176 5.94002 2.67897 7.25007 2.38782ZM12 6C9.79086 6 8 7.79086 8 10C8 12.2091 9.79086 14 12 14C14.2091 14 16 12.2091 16 10C16 7.79086 14.2091 6 12 6ZM18.3775 17.2942C18.7303 17.8695 18.6055 18.63 18.0369 18.9935C17.5199 19.3241 16.9158 19.5265 16.3159 19.6598C15.2322 19.9006 13.8299 20 11.9998 20C10.1698 20 8.76744 19.9006 7.68381 19.6598C7.09516 19.529 6.50205 19.3319 5.99131 19.012C5.41247 18.6495 5.28523 17.8786 5.64674 17.2991C6.06303 16.6318 6.63676 16.1075 7.40882 15.7344C8.58022 15.1684 10.1157 15 11.9996 15C13.8771 15 15.4109 15.1548 16.5807 15.7047C17.3727 16.077 17.9572 16.6089 18.3775 17.2942Z"
                        fill="var(--primary)"
                      />
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
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M19.4491 6.94063V9.45062C19.4491 10.1606 18.7291 10.6206 18.0591 10.3706C17.2191 10.0606 16.2891 9.94062 15.3091 10.0406C12.9291 10.3006 10.4891 12.5906 10.0891 14.9606C9.75906 16.9306 10.3891 18.7706 11.5991 20.0706C12.1491 20.6706 11.7791 21.6406 10.9691 21.7306C10.2791 21.8106 9.59906 21.7906 9.21906 21.5106L3.71906 17.4006C3.06906 16.9106 2.53906 15.8506 2.53906 15.0306V6.94063C2.53906 5.81063 3.39906 4.57063 4.44906 4.17063L9.94906 2.11062C10.5191 1.90063 11.4591 1.90063 12.0291 2.11062L17.5291 4.17063C18.5891 4.57063 19.4491 5.81063 19.4491 6.94063Z"
                        fill="var(--primary)"
                      />
                      <path
                        d="M16 11.5117C13.52 11.5117 11.5 13.5317 11.5 16.0117C11.5 18.4917 13.52 20.5117 16 20.5117C18.48 20.5117 20.5 18.4917 20.5 16.0117C20.5 13.5217 18.48 11.5117 16 11.5117Z"
                        fill="var(--primary)"
                      />
                      <path
                        d="M21 22.0009C20.73 22.0009 20.48 21.8909 20.29 21.7109C20.25 21.6609 20.2 21.6109 20.17 21.5509C20.13 21.5009 20.1 21.4409 20.08 21.3809C20.05 21.3209 20.03 21.2609 20.02 21.2009C20.01 21.1309 20 21.0709 20 21.0009C20 20.8709 20.03 20.7409 20.08 20.6209C20.13 20.4909 20.2 20.3909 20.29 20.2909C20.52 20.0609 20.87 19.9509 21.19 20.0209C21.26 20.0309 21.32 20.0509 21.38 20.0809C21.44 20.1009 21.5 20.1309 21.55 20.1709C21.61 20.2009 21.66 20.2509 21.71 20.2909C21.8 20.3909 21.87 20.4909 21.92 20.6209C21.97 20.7409 22 20.8709 22 21.0009C22 21.2609 21.89 21.5209 21.71 21.7109C21.66 21.7509 21.61 21.7909 21.55 21.8309C21.5 21.8709 21.44 21.9009 21.38 21.9209C21.32 21.9509 21.26 21.9709 21.19 21.9809C21.13 21.9909 21.06 22.0009 21 22.0009Z"
                        fill="var(--primary)"
                      />
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
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="var(--primary)"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M20,18H4l2-2V10a6,6,0,0,1,5-5.91V3a1,1,0,0,1,2,0V4.09a5.9,5.9,0,0,1,1.3.4A3.992,3.992,0,0,0,18,10v6Zm-8,4a2,2,0,0,0,2-2H10A2,2,0,0,0,12,22ZM18,4a2,2,0,1,0,2,2A2,2,0,0,0,18,4Z" />
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
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: notificationsExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <path d="M9 14L4 9M20 9L12 17" />
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
                      width="16"
                      height="16"
                      viewBox="3.5 3.5 17 17"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M14.6921 5H9.30807C8.15914 5.00635 7.0598 5.46885 6.25189 6.28576C5.44398 7.10268 4.99368 8.20708 5.00007 9.356V14.644C4.99368 15.7929 5.44398 16.8973 6.25189 17.7142C7.0598 18.5311 8.15914 18.9937 9.30807 19H14.6921C15.841 18.9937 16.9403 18.5311 17.7482 17.7142C18.5562 16.8973 19.0064 15.7929 19.0001 14.644V9.356C19.0064 8.20708 18.5562 7.10268 17.7482 6.28576C16.9403 5.46885 15.841 5.00635 14.6921 5Z"
                        stroke="var(--primary)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8.00012 9C7.58591 9 7.25012 9.33579 7.25012 9.75C7.25012 10.1642 7.58591 10.5 8.00012 10.5V9ZM12.0001 10.5C12.4143 10.5 12.7501 10.1642 12.7501 9.75C12.7501 9.33579 12.4143 9 12.0001 9V10.5ZM11.2501 9.75C11.2501 10.1642 11.5859 10.5 12.0001 10.5C12.4143 10.5 12.7501 10.1642 12.7501 9.75H11.2501ZM12.7501 8C12.7501 7.58579 12.4143 7.25 12.0001 7.25C11.5859 7.25 11.2501 7.58579 11.2501 8H12.7501ZM12.0001 9C11.5859 9 11.2501 9.33579 11.2501 9.75C11.2501 10.1642 11.5859 10.5 12.0001 10.5V9ZM15.5001 10.5C15.9143 10.5 16.2501 10.1642 16.2501 9.75C16.2501 9.33579 15.9143 9 15.5001 9V10.5ZM15.5001 9C15.0859 9 14.7501 9.33579 14.7501 9.75C14.7501 10.1642 15.0859 10.5 15.5001 9.5V9ZM16.0001 10.5C16.4143 10.5 16.7501 10.1642 16.7501 9.75C16.7501 9.33579 16.4143 9 16.0001 9V10.5ZM16.1138 10.1811C16.3519 9.84222 16.2702 9.37443 15.9313 9.13631C15.5923 8.8982 15.1246 8.97992 14.8864 9.31885L16.1138 10.1811ZM11.2737 13.2783C10.9579 13.5464 10.9193 14.0197 11.1874 14.3354C11.4555 14.6512 11.9288 14.6898 12.2445 14.4217L11.2737 13.2783ZM9.29973 14.9003C8.96852 15.149 8.90167 15.6192 9.15041 15.9504C9.39916 16.2816 9.8693 16.3485 10.2005 16.0997L9.29973 14.9003ZM12.2569 14.407C12.5667 14.1321 12.595 13.6581 12.3201 13.3483C12.0453 13.0384 11.5712 13.0101 11.2614 13.285L12.2569 14.407ZM11.1691 14.3091C11.4249 14.6349 11.8963 14.6917 12.2222 14.436C12.548 14.1802 12.6048 13.7088 12.3491 13.3829L11.1691 14.3091ZM11.186 11.4467C11.0185 11.0678 10.5756 10.8966 10.1968 11.0641C9.81796 11.2316 9.64667 11.6745 9.8142 12.0533L11.186 11.4467ZM12.3609 13.4024C12.1137 13.07 11.6439 13.001 11.3115 13.2482C10.9792 13.4954 10.9101 13.9652 11.1573 14.2976L12.3609 13.4024ZM13.8953 16.6608C14.2602 16.8567 14.7149 16.7198 14.9109 16.3548C15.1068 15.9899 14.9699 15.5352 14.605 15.3392L13.8953 16.6608ZM8.00012 10.5H12.0001V9H8.00012V10.5ZM12.7501 9.75V8H11.2501V9.75H12.7501ZM12.0001 10.5H15.5001V9H12.0001V10.5ZM15.5001 10.5H16.0001V9H15.5001V10.5ZM14.8864 9.31885C13.8552 10.7867 12.6412 12.1172 11.2737 13.2783L12.2445 14.4217C13.7091 13.1782 15.0093 11.7532 16.1138 10.1811L14.8864 9.31885ZM10.2005 16.0997C10.7113 15.7161 11.4531 15.1201 12.2569 14.407L11.2614 13.285C10.4871 13.9719 9.77692 14.5419 9.29973 14.9003L10.2005 16.0997ZM12.3491 13.3829C11.8824 12.7884 11.4917 12.1379 11.186 11.4467L9.8142 12.0533C10.1703 12.8586 10.6255 13.6164 11.1691 14.3091L12.3491 13.3829ZM11.1573 14.2976C11.8855 15.2767 12.8203 16.0835 13.8953 16.6608L14.605 15.3392C13.7239 14.8661 12.9578 14.2048 12.3609 13.4024L11.1573 14.2976Z"
                        fill="var(--primary)"
                      />
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
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 0C11.4477 0 11 0.447715 11 1V3C11 3.55228 11.4477 4 12 4C12.5523 4 13 3.55228 13 3V1C13 0.447715 12.5523 0 12 0Z"
                        fill="var(--primary)"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18ZM9.21518 14.7848C8.50248 14.0721 8.06167 13.0875 8.06167 12C8.06167 9.82492 9.82492 8.06167 12 8.06167C13.0875 8.06167 14.0721 8.50248 14.7848 9.21518L9.21518 14.7848Z"
                        fill="var(--primary)"
                      />
                      <path
                        d="M19.0711 3.51472C19.4616 3.12419 20.0947 3.12419 20.4853 3.51472C20.8758 3.90524 20.8758 4.53841 20.4853 4.92893L19.0711 6.34315C18.6805 6.73367 18.0474 6.73367 17.6568 6.34315C17.2663 5.95262 17.2663 5.31946 17.6568 4.92893L19.0711 3.51472Z"
                        fill="var(--primary)"
                      />
                      <path
                        d="M0 12C0 12.5523 0.447715 13 1 13H3C3.55228 13 4 12.5523 4 12C4 11.4477 3.55228 11 3 11H1C0.447715 11 0 11.4477 0 12Z"
                        fill="var(--primary)"
                      />
                      <path
                        d="M3.51472 4.92893C3.1242 4.53841 3.1242 3.90524 3.51472 3.51472C3.90525 3.12419 4.53841 3.12419 4.92894 3.51472L6.34315 4.92893C6.73368 5.31946 6.73368 5.95262 6.34315 6.34314C5.95263 6.73367 5.31946 6.73367 4.92894 6.34314L3.51472 4.92893Z"
                        fill="var(--primary)"
                      />
                      <path
                        d="M12 20C11.4477 20 11 20.4477 11 21V23C11 23.5523 11.4477 24 12 24C12.5523 24 13 23.5523 13 23V21C13 20.4477 12.5523 20 12 20Z"
                        fill="var(--primary)"
                      />
                      <path
                        d="M4.92894 17.6569C5.31946 17.2663 5.95263 17.2663 6.34315 17.6569C6.73368 18.0474 6.73368 18.6805 6.34315 19.0711L4.92894 20.4853C4.53842 20.8758 3.90525 20.8758 3.51473 20.4853C3.1242 20.0948 3.1242 19.4616 3.51473 19.0711L4.92894 17.6569Z"
                        fill="var(--primary)"
                      />
                      <path
                        d="M20 12C20 12.5523 20.4477 13 21 13H23C23.5523 13 24 12.5523 24 12C24 11.4477 23.5523 11 23 11H21C20.4477 11 20 11.4477 20 12Z"
                        fill="var(--primary)"
                      />
                      <path
                        d="M17.6568 19.0711C17.2663 18.6805 17.2663 18.0474 17.6568 17.6569C18.0474 17.2663 18.6805 17.2663 19.0711 17.6569L20.4853 19.0711C20.8758 19.4616 20.8758 20.0948 20.4853 20.4853C20.0947 20.8758 19.4616 20.8758 19.0711 20.4853L17.6568 19.0711Z"
                        fill="var(--primary)"
                      />
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
                      width="16.5"
                      height="16.5"
                      viewBox="0 0 28 28"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M14.395 3.90244C15.1932 3.15384 16.5 3.71986 16.5 4.81425V23.1843C16.5 24.2785 15.1937 24.8446 14.3953 24.0964L9.45832 19.4703C9.134 19.1664 8.70619 18.9973 8.26174 18.9973H5.25C3.45507 18.9973 2 17.5422 2 15.7473V12.2553C2 10.4604 3.45508 9.00529 5.25 9.00529H8.26119C8.70587 9.00529 9.13388 8.836 9.45826 8.53182L14.395 3.90244Z"
                        fill="var(--primary)"
                      />
                      <path
                        d="M21.6436 5.18437C21.9546 4.91079 22.4285 4.94114 22.702 5.25215C24.7544 7.58537 26 10.6481 26 13.9999C26 17.3517 24.7544 20.4145 22.702 22.7477C22.4285 23.0587 21.9546 23.089 21.6436 22.8155C21.3325 22.5419 21.3022 22.068 21.5758 21.757C23.3966 19.687 24.5 16.9733 24.5 13.9999C24.5 11.0266 23.3966 8.31278 21.5758 6.24286C21.3022 5.93185 21.3325 5.45795 21.6436 5.18437Z"
                        fill="var(--primary)"
                      />
                      <path
                        d="M20.3528 8.3028C20.1042 7.9715 19.6341 7.90448 19.3028 8.1531C18.9715 8.40173 18.9044 8.87185 19.1531 9.20315C20.156 10.5397 20.75 12.1993 20.75 13.9999C20.75 15.8005 20.156 17.4602 19.1531 18.7967C18.9044 19.128 18.9715 19.5981 19.3028 19.8467C19.6341 20.0954 20.1042 20.0283 20.3528 19.697C21.544 18.1098 22.25 16.1362 22.25 13.9999C22.25 11.8636 21.544 9.89006 20.3528 8.3028Z"
                        fill="var(--primary)"
                      />
                    </svg>
                  ),
                  label: t('profile.scannerSettings') || 'Звук',
                  onClick: () => setScannerSettingsExpanded(!scannerSettingsExpanded),
                  right: (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-dim)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: scannerSettingsExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <path d="M9 14L4 9M20 9L12 17" />
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
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <mask id="profile-faq-mask">
                        <rect width="24" height="24" fill="white" />
                        <path
                          d="M9.6 9a2.4 2.4 0 0 1 4.8 0c0 1.6-2.4 2.3-2.4 3.9"
                          stroke="black"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                        <circle cx="12" cy="16.8" r="1.3" fill="black" />
                      </mask>
                      <path
                        d="M1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.937 1.25 22.75 6.06293 22.75 12C22.75 17.937 17.937 22.75 12 22.75C10.1437 22.75 8.39536 22.2788 6.87016 21.4493L2.63727 22.2373C2.39422 22.2826 2.14448 22.2051 1.96967 22.0303C1.79485 21.8555 1.71742 21.6058 1.76267 21.3627L2.55076 17.1298C1.72113 15.6046 1.25 13.8563 1.25 12Z"
                        fill="var(--primary)"
                        mask="url(#profile-faq-mask)"
                      />
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
                      strokeLinejoin="round"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M18 9h-2c-1.105 0-2 .895-2 2v2c0 1.105.895 2 2 2h0c1.105 0 2-.895 2-2V9c0-4.97-4.03-9-9-9s-9 4.03-9 9v4c0 1.105.895 2 2 2h0c1.105 0 2-.895 2-2v-2c0-1.105-.895-2-2-2H0"
                        transform="translate(3 3)"
                      />
                      <path d="M21 14v4c0 2-.667 3-2 3s-3 0-5 0" />
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
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <mask id="profile-about-mask">
                        <rect width="24" height="24" fill="white" />
                        <line
                          x1="12"
                          y1="11"
                          x2="12"
                          y2="17.5"
                          stroke="black"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                        <circle cx="12" cy="7.2" r="1.3" fill="black" />
                      </mask>
                      <path
                        d="M12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22Z"
                        fill="var(--primary)"
                        mask="url(#profile-about-mask)"
                      />
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
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2.5C12 2.22386 11.7761 2 11.5 2H8C5.79086 2 4 3.79086 4 6V18C4 20.2091 5.79086 22 8 22H16C18.2091 22 20 20.2091 20 18V10.5C20 10.2239 19.7761 10 19.5 10H17C14.2386 10 12 7.76142 12 5V2.5ZM19.2195 8C19.552 8 19.7909 7.67893 19.6312 7.3873C19.4956 7.13969 19.3245 6.91032 19.1213 6.70711L15.2929 2.87868C15.0897 2.67546 14.8603 2.50441 14.6127 2.3688C14.3211 2.20909 14 2.44805 14 2.78055V5C14 6.65685 15.3431 8 17 8H19.2195ZM9 9C8.44772 9 8 9.44772 8 10C8 10.5523 8.44772 11 9 11H10C10.5523 11 11 10.5523 11 10C11 9.44772 10.5523 9 10 9H9ZM8 14C8 13.4477 8.44772 13 9 13H15C15.5523 13 16 13.4477 16 14C16 14.5523 15.5523 15 15 15H9C8.44772 15 8 14.5523 8 14ZM8 18C8 17.4477 8.44772 17 9 17H15C15.5523 17 16 17.4477 16 18C16 18.5523 15.5523 19 15 19H9C8.44772 19 8 18.5523 8 18Z"
                        fill="var(--primary)"
                      />
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
                      viewBox="8 8 176 176"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g fill="none" stroke="var(--primary)" strokeWidth="12">
                        <path
                          strokeLinecap="round"
                          d="M151.8 144.5a74 74 0 0 1-85.59 19.21A74 74 0 0 1 22.42 87.7a74 74 0 0 1 59.55-64.42m28.03.06a74 74 0 0 1 50.06 35.61 74 74 0 0 1 5.915 61.15"
                        />
                        <path d="M76 92h40c4.432 0 8 3.568 8 8v22c0 4.432-3.568 8-8 8H76c-4.432 0-8-3.568-8-8v-22c0-4.432 3.568-8 8-8zm4 0V77.7C80 69.029 87.163 62 96 62s16 7.029 16 15.7V92" />
                      </g>
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
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
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
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <rect x="3" y="3" width="7" height="9" rx="1.5" fill="var(--primary)" />
                            <rect
                              x="14"
                              y="3"
                              width="7"
                              height="5"
                              rx="1.5"
                              fill="var(--primary)"
                            />
                            <rect
                              x="14"
                              y="12"
                              width="7"
                              height="9"
                              rx="1.5"
                              fill="var(--primary)"
                            />
                            <rect
                              x="3"
                              y="16"
                              width="7"
                              height="5"
                              rx="1.5"
                              fill="var(--primary)"
                            />
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
            ...(isSuperadmin
              ? [
                  {
                    title: t('profile.platformAdminSection'),
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
                            strokeLinejoin="round"
                          >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                        ),
                        label: t('profile.superAdminPanel'),
                        labelStyle: { color: 'var(--primary)', fontWeight: 600 },
                        iconStyle: { background: 'var(--primary-dim)' },
                        onClick: () => navigate('/korset-admin/stores'),
                      },
                      ...(currentStore?.slug
                        ? [
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
                                  strokeLinejoin="round"
                                >
                                  <path d="M20 20a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16z" />
                                  <path d="M3 7l2-4h14l2 4" />
                                  <path d="M3 12h18" />
                                </svg>
                              ),
                              label: t('profile.retailCabinet'),
                              onClick: () => navigate(`/retail/${currentStore.slug}`),
                            },
                          ]
                        : []),
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
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              transform: 'rotate(-90deg)',
                            }}
                          >
                            <path d="M9 14L4 9M20 9L12 17" />
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
