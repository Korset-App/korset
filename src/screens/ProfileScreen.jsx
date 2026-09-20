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
import { clearSeenStories } from '../domain/home/homeScreenModel.js'
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

/* ─── DIET/ALLERGEN ICONS (Optically Balanced & Cleaned) ─── */
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
        viewBox="-12 -12 280 280"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="round"
      >
        <path d="M174 47.8a254.2 254.2 0 00-41.5-38.3 8 8 0 00-9.2 0 254.2 254.2 0 00-41.3 38.3C54.5 79.3 40 112.6 40 144a88 88 0 00176 0c0-31.4-14.5-64.7-42-96.3zM128 216a72.1 72.1 0 01-72-72c0-57.2 55.5-105 72-118 16.5 13 72 60.8 72 118a72.1 72.1 0 01-72 72zm55.9-62.7a57.6 57.6 0 01-46.6 46.6 8.8 8.8 0 01-8 0 8 8 0 01-1.3-15.9c16.6-2.8 30.6-16.9 33.4-33.5a8 8 0 0115.8 2.7z" />
        <line
          x1="32"
          y1="32"
          x2="224"
          y2="224"
          stroke="currentColor"
          strokeWidth="22"
          strokeLinecap="round"
        />
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
      <svg width={w} height={h} viewBox="-1 -1 34 34" fill="currentColor">
        <circle cx="15" cy="23" r="1" />
        <path d="M27.4 13.3c-1-3.2-3.4-5.8-6.4-7.2-0.4-1.4-1.2-2.6-2.4-3.6-0.4-0.3-1.1-0.3-1.4 0.2-0.3 0.4-0.3 1.1 0.2 1.4 2 1.6 2.6 4.4 1.4 6.7-1 2-3.5 2.7-5.5 1.7-1.5-0.8-2.1-2.6-1.3-4.1 0.3-0.5 0.7-0.9 1.3-1.1 0.6-0.2 1.2-0.1 1.7 0.2 0.4 0.2 0.7 0.5 0.8 0.9 0.1 0.4 0.1 0.8-0.1 1.2-0.3 0.5-0.1 1.1 0.4 1.4 0.5 0.3 1.1 0.1 1.4-0.4 0.4-0.8 0.5-1.8 0.3-2.7s-0.9-1.7-1.8-2.1c-1-0.5-2.2-0.6-3.2-0.3-0.4 0.1-0.8 0.3-1.1 0.6-3.3 1.3-5.8 4-6.9 7.4C3.1 13.8 2 15.3 2 17c0 1.7 1.1 3.2 2.6 3.8C6.2 25.6 10.8 29 16 29s9.8-3.4 11.4-8.3c1.5-0.6 2.6-2.1 2.6-3.8C30 15.3 28.9 13.8 27.4 13.3z M12 16c0-0.6 0.4-1 1-1s1 0.4 1 1v2c0 0.6-0.4 1-1 1s-1-0.4-1-1V16z M15 26c-1.7 0-3-1.3-3-3s1.3-3 3-3s3 1.3 3 3S16.7 26 15 26z M20 18c0-0.6-0.4 1-1 1s-1-0.4-1-1v-2c0-0.6 0.4-1 1-1s1 0.4 1 1V18z" />
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
      <svg width={w} height={h} viewBox="1 0 22 24" fill="currentColor">
        <path d="M12 2A6.194 6.194 0 0 0 8 4a12.675 12.675 0 0 0-4 9c0 3 2 9 8 9s8-6 8-9a12.675 12.675 0 0 0-4-9A6.194 6.194 0 0 0 12 2Zm0 17a4.655 4.655 0 0 1-4.188-2.511 1 1 0 1 1 1.745-.978A2.662 2.662 0 0 0 12 17a1 1 0 0 1 0 2Z" />
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
      <svg width={w} height={h} viewBox="-24 -12 560 536" fill="currentColor">
        <path d="M508.157 118.055c-4.773-17.082-14.156-34.14-30.252-50.795c-16.034-16.562-33.1-26.006-50.57-30.392c-17.462-4.346-35.537-3.586-53.395 1.389c-22.685 6.302-44.901 19.503-63.693 37.112c-18.829 17.602-34.172 39.558-43.481 62.802c-5.976 14.932-12.969 26.977-21.001 36.655c-8.017 9.678-17.12 16.872-26.768 21.994c-6.418 3.422-13.054 5.93-19.751 7.8c-8.692 2.406-17.505 3.756-26.314 4.664c-8.824 0.9-17.668 1.343-26.492 1.84c-17.679 0.985-35.284 2.242-52.642 7.078c-8.797 2.452-17.532 5.798-26.313 10.532c-23.586 12.743-40.088 28.335-50.943 45.727C5.72 291.845 0.408 311.185 0.023 332.016c-0.264 13.892 1.735 28.421 5.859 43.252c2.484 8.925 5.744 17.958 9.763 27.031c7.404 16.756 21.413 34.086 39.841 47.753c18.429 13.691 41.129 23.749 65.817 26.877c16.46 2.095 33.83 1.171 51.703-3.804c3.524-0.986 7.078-2.134 10.644-3.438c19.503-7.163 36.639-16.476 52.32-27.226c15.684-10.764 29.914-22.98 43.468-35.932c27.121-25.875 51.393-54.715 79.499-79.62c18.735-16.577 39.278-31.408 63.523-41.894c7.358-3.174 16.034-8.529 24.827-15.669c8.824-7.132 17.811-16.002 26.123-26.169c16.655-20.295 30.485-45.619 35.948-71.92C513.031 153.709 513.093 135.789 508.157 118.055z M58.524 293.382c1.646-0.45 3.571-0.66 5.786-0.893c2.616-0.295 5.596-0.613 8.56-1.435c2.969-0.822 5.67-2.088 8.079-3.205c2.01-0.939 3.76-1.747 5.402-2.204c4.334-1.218 7.388 0.52 8.592 4.851c2.422 8.692-4.859 18.339-16.24 21.513c-11.381 3.151-22.599-1.327-25.021-10.019C52.475 297.658 54.194 294.593 58.524 293.382z M66.573 378.659c-1.761 1.35-3.908 2.422-6.196 3.05c-2.833 0.8-5.802 0.954-8.84 0.505c-5.829-0.87-11.118-4.176-13.773-8.638c-2.688-4.362-2.572-9.499 0.381-13.729c1.044-1.513 2.364-3.096 4.246-3.624c1.862-0.52 3.403 0.171 4.668 0.938l0.838 0.528c1.704 1.102 4.036 2.584 6.931 3.027c2.526 0.381 5.095-0.031 7.342-0.411c0.896-0.148 1.731-0.28 2.48-0.358c1.691-0.171 3.849-0.171 5.568 1.312c1.335 1.156 2.042 2.933 2.142 5.417C72.533 371.332 70.422 375.694 66.573 378.659z M101.214 438.029c-1.439 0.924-3.1 1.646-4.889 2.143c-3.407 0.954-7.152 1.039-10.807 0.233c-5.596-1.188-10.411-4.362-13.232-8.646c-2.774-4.175-3.318-9.065-1.482-13.396c1.028-2.468 2.453-3.904 4.315-4.431c2.615-0.722 5.111 0.66 7.742 2.126c2.099 1.156 4.477 2.484 7.295 3.096c2.852 0.636 5.642 0.396 8.106 0.194c0.838-0.077 1.619-0.132 2.32-0.163c1.751-0.062 3.951 0.078 5.581 1.677c1.276 1.234 1.882 3.026 1.851 5.471C107.954 431.084 105.486 435.337 101.214 438.029z M126.029 371.224c-0.617 0.24-1.234 0.442-1.851 0.604c-5.243 1.452-10.718 0.894-14.991-1.567c-3.465-1.987-5.89-5.068-6.845-8.685c-0.628-2.243-0.528-4.082 0.311-5.58c0.792-1.389 2.115-2.329 4.082-2.872c1.176-0.326 2.626-0.536 4.256-0.722c1.808-0.225 3.85-0.474 5.876-1.047c0.528-0.14 1.055-0.303 1.587-0.513c2.538-0.938 4.726-2.406 6.651-3.686c1.862-1.25 3.481-2.337 5.169-2.802c1.82-0.497 5.196-0.644 7.43 4.144c1.715 3.539 1.805 7.691 0.206 11.672C135.912 365.132 131.582 369.175 126.029 371.224z M175.194 413.225c-1.323 5.402-5.274 10.245-10.838 13.256c-1.571 0.854-3.232 1.529-4.936 2.003c-3.508 0.962-7.047 1.086-10.248 0.302c-4.858-1.156-8.634-4.284-10.322-8.591c-0.912-2.298-0.955-4.207-0.148-5.852c1.16-2.352 3.656-3.206 5.902-3.834l3.834-1.017c1.556-0.442 3.597-1.055 5.596-2.142c2.51-1.366 4.594-3.205 6.43-4.835c2.057-1.816 3.834-3.392 5.875-3.958c1.878-0.528 4.64-0.372 7.062 3.33C175.559 405.061 176.208 409.113 175.194 413.225z M189.673 333.118c-2.542 2.336-5.553 4.043-8.724 4.92c-1.688 0.474-3.364 0.706-5.021 0.691c-4.862-0.039-9.192-2.158-11.909-5.813c-1.514-2.057-2.057-3.92-1.661-5.728c0.632-2.879 3.364-4.346 6.255-5.906c2.041-1.086 4.334-2.329 6.329-4.168c1.998-1.832 3.438-4.067 4.699-6.038c0.574-0.876 1.086-1.668 1.602-2.36c0.807-1.101 2.126-2.646 4.125-3.205c1.455-0.411 3.76-0.396 6.329 2.042c3.376 3.143 5.052 7.52 4.699 12.278C196.044 324.666 193.607 329.509 189.673 333.118z M225.606 381.593c-2.658 2.289-5.77 3.981-8.987 4.873c-6.713 1.871-13.217 0.179-16.977-4.4c-1.583-1.94-2.216-3.787-1.878-5.658c0.559-3.112 3.523-4.827 6.973-6.83c2.115-1.226 4.524-2.608 6.682-4.478c2.158-1.848 3.908-4.004 5.433-5.914c2.262-2.794 4.055-5.021 6.55-5.697c2.352-0.66 4.583 0.202 6.651 2.538c2.5 2.832 3.718 6.666 3.439 10.78C233.106 372.225 230.231 377.619 225.606 381.593z M239.451 284.473c-2.48 2.111-5.39 3.671-8.398 4.509c-6.461 1.808-12.716 0.28-16.729-4.067c-1.746-1.909-2.464-3.749-2.185-5.642c0.455-3.198 3.493-5.022 7.005-7.125c1.967-1.187 4.214-2.538 6.208-4.222c1.983-1.707 3.671-3.702 5.158-5.464c2.2-2.63 4.108-4.889 6.561-5.564c1.688-0.473 4.23-0.372 6.772 2.817C249.423 266.747 247.484 277.627 239.451 284.473z M280.948 333.149c-2.669 2.289-5.797 3.981-9.03 4.889c-6.651 1.855-12.922 0.311-16.798-4.114c-1.645-1.878-2.336-3.772-2.041-5.618c0.5-3.213 3.566-5.053 7.136-7.179c2.084-1.25 4.462-2.678 6.592-4.494c2.116-1.824 3.877-3.943 5.433-5.805c2.368-2.833 4.23-5.061 6.756-5.766c1.673-0.474 4.183-0.38 6.725 2.7C291.492 314.755 289.392 325.908 280.948 333.149z M294.402 243.371c-1.967 1.303-4.098 2.274-6.317 2.894c-7.49 2.08-14.816-0.116-18.708-5.627c-1.467-2.126-1.937-4.036-1.424-5.874c0.87-3.097 4.083-4.509 7.784-6.124c2.115-0.939 4.509-1.98 6.709-3.431c2.189-1.443 4.114-3.22 5.786-4.804c2.278-2.118 4.246-3.934 6.45-4.555c1.936-0.544 4.726-0.365 7.105 3.454C306.47 226.995 303.226 237.557 294.402 243.371z M337.906 288.803c-2.216 1.482-4.606 2.6-7.09 3.275c-7.427 2.088-14.73 0.062-18.576-5.122c-1.482-2.026-1.994-3.982-1.54-5.821c0.822-3.213 4.198-4.78 8.102-6.635c2.189-1.04 4.657-2.188 6.962-3.741c2.267-1.514 4.261-3.361 6.038-4.983c2.484-2.258 4.64-4.229 6.958-4.889c1.629-0.442 4.742-0.582 7.194 3.5C350.416 272.031 346.877 282.742 337.906 288.803z M364.657 196.883c-1.334 5.184-5.122 9.716-10.361 12.48c-1.381 0.722-2.84 1.303-4.361 1.715c-1.048 0.295-2.072 0.505-3.058 0.621c-2.375 0.249-4.672 0.117-6.868-0.396c-4.746-1.118-8.471-3.896-10.482-7.8c-1.132-2.174-1.365-4.066-0.722-5.782c0.869-2.328 3.128-3.414 4.742-4.042c1.172-0.443 2.554-0.838 4.078-1.265l1.334-0.381c1.723-0.481 3.508-1.024 5.231-1.932c2.406-1.265 4.377-2.996 6.124-4.509c1.955-1.708 3.64-3.19 5.595-3.734c1.893-0.528 4.656-0.349 7.062 3.454C365.147 188.61 365.744 192.723 364.657 196.883z M360.459 110.054c-1.731-1.739-2.522-3.539-2.375-5.41c0.264-3.314 3.197-5.432 6.9-8.118c2.142-1.544 4.578-3.306 6.744-5.479c2.172-2.188 3.919-4.625 5.448-6.783c2.375-3.345 4.268-5.991 7.032-6.752c2.22-0.621 4.377 0.101 6.441 2.142c3.221 3.221 4.556 7.846 3.749 13.054c-0.761 4.874-3.321 9.74-7.257 13.675c-3.29 3.314-7.21 5.665-11.323 6.822C369.772 114.897 364.176 113.741 360.459 110.054z M412.472 244.589c-1.746 4.641-5.533 8.755-10.384 11.292c-1.498 0.807-3.096 1.443-4.726 1.894c-3.594 1.002-7.225 1.086-10.5 0.248c-4.843-1.202-8.576-4.376-10.221-8.708c-0.878-2.29-0.908-4.198-0.086-5.828c1.102-2.189 3.337-3.065 5.596-3.702c0.66-0.171 1.397-0.365 2.158-0.543c0.808-0.187 1.676-0.412 2.554-0.644c2.041-0.574 3.655-1.203 5.099-1.956c2.569-1.35 4.641-3.182 6.472-4.812c2.002-1.777 3.734-3.306 5.727-3.864c1.863-0.528 4.595-0.38 7.048 3.275C413.753 235.043 414.219 239.917 412.472 244.589z M412.985 164.924c-2.716 2.863-6.046 4.889-9.616 5.89c-6.092 1.692-12.185 0.116-15.886-4.122c-1.692-1.886-2.414-3.717-2.158-5.557c0.396-2.964 2.934-4.625 5.898-6.565c1.956-1.258 4.145-2.686 6.008-4.634c1.894-1.987 3.205-4.261 4.361-6.27c1.645-2.848 3.058-5.317 5.696-6.054c2.895-0.807 5.332 1.118 6.124 1.746c3.57 2.825 5.548 7.226 5.433 12.076C418.728 156.216 416.602 161.136 412.985 164.924z M428.949 113.515c-2.351-0.954-3.802-2.243-4.416-3.966c-0.946-2.654 0.42-5.153 1.878-7.776c1.087-1.987 2.305-4.206 2.833-6.83c0.528-2.662 0.217-5.27-0.078-7.567c-0.085-0.76-0.171-1.451-0.233-2.08-0.295-3.788 1.149-6.155 4.261-7.024c0.744-0.202 1.583-0.319 2.584-0.365c4.741-0.163 9.104 2.057 11.936 6.076c2.879 4.044 3.966 9.74 2.848 15.242c-1.102 5.479-4.136 10.175-8.366 12.883c-1.327 0.862-2.747 1.513-4.214 1.909C434.956 114.866 431.843 114.695 428.949 113.515z M461.886 206.087c-2.995 3.733-6.993 6.433-11.23 7.606c-0.574 0.179-1.148 0.295-1.723 0.412c-4.92 0.854-9.615-0.474-12.906-3.671c-1.808-1.731-2.63-3.493-2.522-5.348c0.156-3.019 2.639-4.959 5.502-7.179c1.941-1.513 4.144-3.213 5.945-5.464c1.823-2.258 3.011-4.773 4.075-6.97c1.552-3.267 2.886-6.084 5.796-6.892c1.778-0.496 3.672-0.062 5.767 1.32c3.834 2.514 6.154 6.814 6.364 11.812C467.156 196.588 465.309 201.826 461.886 206.087z M495.995 135.308c-1.024 5.534-3.904 10.416-7.924 13.396c-1.606 1.202-3.352 2.064-5.169 2.584c-2.678 0.73-5.464 0.675-8.063-0.21c-2.368-0.792-3.881-1.995-4.594-3.687c-1.149-2.716 0.186-5.518 1.598-8.482c1.056-2.189 2.228-4.672 2.764-7.505c0.528-2.864 0.264-5.642 0.039-8.094c-0.086-0.97-0.179-1.863-0.202-2.654c-0.062-1.467-0.225-5.906 4.316-7.171c0.822-0.233 1.746-0.349 2.832-0.334c4.688 0.07 8.941 2.522 11.688 6.753C496.026 124.133 497.028 129.759 495.995 135.308z" />
      </svg>
    ),
    soy: (
      <svg width={w} height={h} viewBox="70 -10 372 500" fill="currentColor">
        <path d="M416.009 212.883c27.266-46.047 19.078-105.43-19.922-144.414L336.994 9.375c-12.5-12.5-32.75-12.5-45.25 0l-60.656 60.648c-29.875 29.875-41.453 73.805-30.219 114.656c1.352 4.898 1.094 11.344-2.531 14.688c-23.086 21.289-36.346 51.195-37.401 82.859c-48.18 15.688-80.947 60.914-80.947 112V480c0 17.672 13.567 32 31.239 32h83.43c51.406 0 96.977-31.531 113.391-78.453c4.055-11.586 6.289-23.57 6.656-35.664c48.086-15.68 81.32-61.156 81.32-111.992c0-11.18-1.578-22.281-4.703-33c-1.469-5.047 0.039-10.313 4.023-14.078C403.361 231.227 410.314 222.5 416.009 212.883z M191.931 448c-26.508 0-48-21.49-48-48s21.492-48 48-48c26.508 0 48 21.49 48 48S218.439 448 191.931 448z M287.931 336c-26.508 0-48-21.49-48-48s21.492-48 48-48 c26.508 0 48 21.49 48 48S314.439 336 287.931 336z M319.931 192c-26.508 0-48-21.49-48-48s21.492-48 48-48c26.508 0 48 21.49 48 48 S346.439 192 319.931 192z" />
      </svg>
    ),
    fish: (
      <svg width={w} height={h} viewBox="-16 35 544 380" fill="currentColor">
        <path d="M473.472 266.477l38.172-98.609c0.844-2.203 0.141-4.688-1.719-6.109c-1.875-1.438-4.453-1.453-6.344-0.063l-99.094 73.094c-21.328-2.516-44.391-53.469-145.922-78.75l29.672-4.234c4.734-0.672 8.891-3.438 11.359-7.547c2.453-4.094 2.922-9.078 1.297-13.563l-14.922-41.031c-1.828-5.016-6.047-8.781-11.234-10.016s-10.641 0.219-14.531 3.875l-67.922 63.938C82.394 149.867 0.003 238.32 0.003 266.477c3.734 23.609 48.891 77.875 117.25 104.25c7.141-9.969 12.906-19.594 17.516-28.766c13.453-26.828 17.234-49.875 17.234-65.734c0-6.391-0.625-11.609-1.422-15.266c-1.281-6.047 2.563-11.984 8.609-13.266c6.047-1.297 11.984 2.563 13.281 8.594c1.156 5.453 1.891 12.109 1.891 19.938c0 19.344-4.578 45.813-19.609 75.766c-4.219 8.422-9.313 17.125-15.328 26.016c23.5 6.406 49.203 9.297 76.484 6.703l20.25 39.453c2.047 4 5.688 6.938 10.031 8.094c4.344 1.141 8.969 0.406 12.75-2.063l15.453-10.109c4.266-2.781 6.906-7.422 7.172-12.484c0.234-5.063-1.938-9.953-5.891-13.141l-20.703-16.672c104.594-24.938 127.953-77.078 149.516-79.625l99.094 73.094c1.891 1.391 4.469 1.375 6.344-0.047c1.859-1.422 2.563-3.922 1.719-6.109L473.472 266.477z M76.425 273.945c-9.266 0-16.781-7.531-16.781-16.781c0-9.266 7.516-16.781 16.781-16.781s16.781 7.516 16.781 16.781C93.206 266.414 85.69 273.945 76.425 273.945z" />
      </svg>
    ),
    shell: (
      <svg width={w} height={h} viewBox="8 10 84 76" fill="currentColor">
        <path d="M81.6 38.6C72 29 57.5 27.4 46.3 33.6L40.8 39c-6.4 6.4-7 17.4-1.1 24.2c6.5 7.4 17.8 7.9 24.9 1.3c3.4-3.1 4.1-8.2 1.3-11.9c-3.2-4.2-9.2-4.5-12.9-1.1c-1.1 1-1.4 2.8-0.5 4c0.9 1.3 2.6 1.6 3.8 0.9c0.5-0.2 1-0.2 1.4 0.2c0.5 0.5 0.4 1.4-0.2 1.8c-2.3 1.3-5.3 0.7-6.9-1.6c-1.6-2.2-1-5.2 1-7.1c4.6-4.1 11.8-3.7 15.9 1.3c3.7 4.6 2.7 11.5-1.7 15.4C58 73.4 45.9 73 38.6 65.3c-7.4-7.8-6.9-20.2 0.7-27.9l4.5-4.5c3.5-7.5 1.2-16.5-8-25.7L22.1 20.9C5.6 37.3 5.6 64 22.1 80.4c16.4 16.4 43.1 16.4 59.5 0C93.1 68.9 93.1 50.1 81.6 38.6z M44.3 44.4c-2.9 2.9-3.7 7.4-2 11.5c0.2 0.4 0 1-0.5 1.1c-0.1 0-0.2 0.1-0.3 0.1c-0.3 0-0.7-0.2-0.8-0.5c-1.9-4.8-1-10 2.4-13.4c0.3-0.3 0.9-0.3 1.2 0C44.6 43.6 44.6 44.1 44.3 44.4z M25.6 26c-9.8 9.8-12.5 25.1-6.9 38.9c0.2 0.4 0 1-0.5 1.1c-0.1 0-0.2 0.1-0.3 0.1c-0.3 0-0.7-0.2-0.8-0.5c-5.9-14.5-3-30.5 7.3-40.8c0.3-0.3 0.9-0.3 1.2 0C26 25.1 26 25.7 25.6 26z" />
      </svg>
    ),
    sesame: (
      <svg width={w} height={h} viewBox="-20 -20 552 552" fill="currentColor">
        <path d="M208.4 25.12c-30.5.3-61.8 19.64-76.4 47.46 39.5 30.52 98.8 5.06 118.5-33.01-12.5-10.18-27.2-14.59-42.1-14.45zm89.1 33.98c-30.6 38.5-7.1 96.9 34.5 118.2 30.1-40 3.8-99-34.5-118.2zm119.8 10.65c-20.4 44.55 16.2 95.65 61.8 106.35 19.6-46-20-96.89-61.8-106.35zM86.29 71.19C38.12 80.72 18.2 140.3 36.19 183.5c48.72-11 66.91-72.9 50.1-112.31zM186.6 171.4c-42.3 0-76.5 42.7-77 85.1 49.2 9 90.3-40.9 90.3-83.7-4.5-1-9-1.4-13.3-1.4zm114.6 24.8c-30.6 38.5-7.1 96.9 34.5 118.2 30.1-40 3.8-99-34.5-118.2zM458 248.9c-49.9 2.1-79 59.8-69.5 101.6 49.1-.8 79.4-55.9 69.5-101.6zm-318.8 65.8c-39.4 29.3-31.8 91.7 3 123 39.3-30.9 29.1-94.7-3-123zM265.3 325c-24.8-.2-50.2 9.9-65.8 26.5 28.2 40.3 90.8 34.5 123.1.7-13.9-18.9-35.4-27.1-57.3-27.2zM53.46 365.7c-29.71 39-5.16 96.9 36.9 117.4 29.24-40.6 1.8-99-36.9-117.4zm362.74 24.2c-45.4-.3-78.8 47.9-75 92.3 49.9 4.3 86-49.3 81.8-91.9-2.3-.3-4.5-.4-6.8-.4z" />
      </svg>
    ),
    celery: (
      <svg width={w} height={h} viewBox="40 30 270 280" fill="currentColor">
        <g transform="translate(0.000000,350.000000) scale(0.100000,-0.100000)">
          <path d="M2621 3135 c-44 -41 -64 -74 -91 -148 l-10 -28 -38 41 c-62 64 -112 50 -164 -47 -53 -97 -56 -219 -9 -352 10 -30 16 -63 12 -72 -21 -58 -444 -487 -751 -764 -318 -285 -395 -373 -475 -538 -46 -96 -92 -234 -81 -244 9 -9 118 23 192 57 169 77 319 204 508 433 203 245 677 742 780 818 47 35 75 36 168 8 131 -40 285 -8 353 72 35 42 32 65 -15 111 -22 22 -40 41 -40 43 0 1 20 10 45 20 61 23 139 85 155 124 17 42 -6 76 -71 105 -27 11 -47 26 -44 31 49 116 59 148 63 211 6 89 -6 104 -84 104 -55 0 -160 -29 -201 -56 -33 -21 -37 -18 -63 37 -24 50 -52 79 -78 79 -7 0 -34 -20 -61 -45z" />
          <path d="M1858 3130 c-26 -22 -59 -60 -75 -85 -15 -25 -30 -44 -33 -42 -79 42 -102 51 -118 41 -30 -19 -42 -57 -42 -135 l0 -77 -52 2 c-46 1 -54 -2 -65 -24 -19 -34 -11 -125 16 -185 13 -28 47 -73 87 -111 75 -73 75 -73 11 -169 -62 -93 -195 -217 -402 -375 -251 -192 -342 -268 -452 -381 -237 -242 -340 -448 -359 -719 -4 -53 -15 -116 -25 -143 -36 -91 -21 -142 68 -243 69 -78 148 -141 194 -155 77 -22 157 20 202 105 19 37 22 63 28 251 7 225 20 307 69 457 78 233 198 395 470 633 249 217 362 350 450 526 l49 96 63 13 c116 22 209 88 249 175 33 71 19 105 -48 120 -18 3 -33 9 -33 11 0 2 13 28 29 57 35 63 47 117 32 146 -10 18 -21 21 -75 21 l-63 0 -6 55 c-3 30 -18 81 -34 112 -24 50 -33 58 -59 61 -23 2 -40 -6 -76 -38z" />
          <path d="M2575 2184 c-79 -41 -146 -141 -160 -239 -4 -27 -11 -57 -16 -66 -4 -8 -43 -34 -86 -57 -166 -90 -321 -228 -518 -462 -264 -314 -465 -454 -737 -515 l-78 -17 0 -152 c0 -120 -4 -170 -20 -231 -11 -43 -20 -80 -20 -82 0 -10 96 0 157 17 144 40 289 122 432 244 130 111 227 224 479 556 94 124 206 261 249 304 81 82 166 146 193 146 9 0 40 -25 70 -56 69 -71 136 -105 217 -112 84 -6 117 13 111 66 -3 21 -7 43 -9 51 -3 11 11 13 67 12 82 -3 139 16 149 48 4 14 -3 39 -22 73 -19 34 -24 53 -16 55 6 2 31 19 54 37 54 44 101 113 97 145 -4 34 -63 66 -160 88 l-78 16 0 53 c0 56 -17 84 -49 84 -32 0 -85 -22 -133 -56 -48 -34 -58 -34 -58 0 0 58 -54 82 -115 50z" />
        </g>
      </svg>
    ),
    mustard: (
      <svg width={w} height={h} viewBox="80 -10 352 532" fill="currentColor">
        <polygon points="359.418,105.112 291.604,105.112 281.433,0 230.567,0 220.396,105.112 152.582,105.112 152.582,166.149 359.418,166.149" />
        <path d="M387.344,459.045l-27.926-272.552H152.582l-27.926,272.552c-1.388,13.522,3.022,27.008,12.134,37.104 c9.111,10.09,22.074,15.851,35.671,15.851h167.075c13.597,0,26.567-5.761,35.672-15.851 C384.321,486.052,388.731,472.567,387.344,459.045z M352.56,475.694c-3.321,3.679-8.068,5.791-13.022,5.791H172.462 c-4.955,0-9.701-2.112-13.015-5.783c-3.321-3.679-4.94-8.619-4.433-13.545l25.119-245.149h151.732l25.119,245.142 C357.492,467.082,355.881,472.023,352.56,475.694z" />
        <polygon points="201.776,305.164 186.836,450.97 325.164,450.97 310.224,305.164" />
      </svg>
    ),
    sulfites: (
      <svg width={w} height={h} viewBox="0 0 140 140" fill="currentColor">
        <g transform="translate(0.000000,135.000000) scale(0.100000,-0.100000)">
          <path d="M425 1225 c-45 -44 -22 -102 43 -107 l37 -3 0 -115 -1 -115 -127 -332 c-70 -183 -127 -340 -127 -348 0 -9 11 -27 25 -40 l24 -25 336 0 c322 0 336 1 355 20 11 11 20 33 20 48 0 16 -56 176 -125 356 l-125 328 0 114 0 114 33 0 c63 0 94 74 47 112 -20 16 -44 18 -207 18 -182 0 -184 0 -208 -25z m405 -24 c13 -25 13 -27 -6 -45 -9 -9 -32 -16 -55 -16 l-39 0 0 -124 c0 -123 0 -125 45 -242 29 -74 42 -121 36 -127 -23 -23 -99 -20 -175 8 -63 23 -86 27 -131 21 l-55 -6 31 82 c55 147 60 169 57 279 l-3 104 -40 3 c-45 4 -65 17 -65 41 0 37 19 41 207 41 170 0 183 -1 193 -19z m-152 -688 c5 -17 -26 -29 -40 -15 -6 6 -7 15 -3 22 9 14 37 9 43 -7z m-133 -113 c0 -18 -6 -26 -23 -28 -27 -4 -40 22 -22 44 19 22 45 13 45 -16z m222 -106 c6 -16 -23 -54 -42 -54 -7 0 -20 9 -29 19 -30 33 7 79 47 59 10 -5 21 -16 24 -24z" />
        </g>
      </svg>
    ),
  }
  icons.nutrition = icons.celery
  icons.science = icons.sulfites
  const svg = icons[name] || null
  if (!svg) return null
  return (
    <span
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        lineHeight: 1,
        overflow: 'visible',
      }}
    >
      {svg}
    </span>
  )
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
  const [resetStoriesDone, setResetStoriesDone] = useState(false)

  const handleResetStories = () => {
    clearSeenStories(currentStore?.slug)
    setResetStoriesDone(true)
    setTimeout(() => setResetStoriesDone(false), 2500)
  }

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
                      aria-hidden="true"
                    >
                      <path d="M1 4v6h6M23 20v-6h-6" />
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                    </svg>
                  ),
                  label: t('profile.resetStories') || 'Сбросить историю сторис',
                  onClick: handleResetStories,
                  right: (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: resetStoriesDone ? 'var(--primary-bright)' : 'var(--text-dim)',
                      }}
                    >
                      {resetStoriesDone ? '✓ ' + (t('common.done') || 'Готово') : ''}
                    </span>
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
                      width="21"
                      height="21"
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
