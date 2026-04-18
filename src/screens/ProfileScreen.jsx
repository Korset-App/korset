import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { setLang, useI18n } from '../utils/i18n.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../utils/supabase.js'
import { useStore } from '../contexts/StoreContext.jsx'
import {
  buildHistoryPath,
  buildNotificationSettingsPath,
  buildPrivacyPath,
  buildProfilePath,
} from '../utils/routes.js'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import { ALLERGENS } from '../constants/allergens.js'
import { DIET_GOALS } from '../constants/dietGoals.js'
import { buildAuthNavigateState } from '../utils/authFlow.js'

/* ─── DIET/ALLERGEN ICONS ─── */
function DietIcon({ name, size = 24 }) {
  const w = size,
    h = size,
    lc = 'round',
    lj = 'round'
  const icons = {
    nosugar: (
      <svg
        width={w}
        height={h}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap={lc}
        strokeLinejoin={lj}
      >
        <path d="M12 4l7 3.5v7l-7 3.5-7-3.5v-7l7-3.5z" />
        <path d="M12 10.5l7-3.5M12 10.5l-7-3.5M12 10.5v7" />
        <line x1="2" y1="22" x2="22" y2="2" stroke="#FFFFFF" />
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
        stroke="#FFFFFF"
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
        stroke="#FFFFFF"
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
        stroke="#FFFFFF"
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
        stroke="#FFFFFF"
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
        stroke="#FFFFFF"
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
        stroke="#FFFFFF"
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
        stroke="#FFFFFF"
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
        stroke="#FFFFFF"
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

export default function ProfileScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { lang, t } = useI18n()
  const allergenInputRef = useRef(null)
  const { profile, updateProfile: setProfile } = useProfile()
  const { user, displayName, avatarId, logout } = useAuth()
  const { favoritesCount, scanCount } = useUserData()
  const { currentStore } = useStore()

  const [allergenInput, setAllergenInput] = useState('')
  const [prefOpen, setPrefOpen] = useState(false)

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

  const fontAdvent = "'Advent Pro', sans-serif"

  return (
    <>
      <style>{`
        @keyframes floatOrb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.1)} }
        @keyframes floatOrb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-25px,15px) scale(0.9)} }
        @keyframes floatOrb3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(15px,25px) scale(1.05)} }
        .glass-card {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          position: relative;
        }
        .pref-chip { transition: all 0.2s ease; cursor: pointer; }
        .pref-chip:active { transform: scale(0.95); }
        .settings-item { transition: background 0.15s; }
        .settings-item:active { background: rgba(255,255,255,0.03) !important; }
      `}</style>

      <div
        className="screen"
        style={{
          paddingTop: 0,
          paddingBottom: 100,
          overflowX: 'hidden',
          minHeight: '100vh',
          background: 'var(--bg)',
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
          {/* ── HEADER ── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 22px 0',
            }}
          >
            <h1
              style={{
                fontFamily: fontAdvent,
                fontSize: 24,
                fontWeight: 500,
                color: '#fff',
                margin: 0,
                lineHeight: 1,
              }}
            >
              {t.profile.title}
            </h1>
            {user && (
              <button
                onClick={() => navigate('/setup-profile?mode=edit')}
                style={{
                  background: 'rgba(124,58,237,0.12)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  padding: '8px 16px',
                  borderRadius: 12,
                  color: '#A78BFA',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: fontAdvent,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                {t.profile.editBtn}
              </button>
            )}
          </div>

          {/* ── AVATAR + NAME ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '28px 22px 28px',
            }}
          >
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                border: '3.5px solid #7C3AED',
                padding: 4,
                boxShadow: '0 0 40px rgba(124,58,237,0.25), inset 0 0 20px rgba(124,58,237,0.1)',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              {user ? (
                <ProfileAvatar
                  avatarId={avatarId || user?.user_metadata?.avatar_id}
                  name={displayName || user?.user_metadata?.full_name}
                  rounded="circle"
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: '#7C3AED',
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
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
            </div>
            {user ? (
              <>
                <h2
                  style={{
                    fontFamily: fontAdvent,
                    fontSize: 26,
                    fontWeight: 700,
                    color: '#fff',
                    margin: '0 0 4px',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  {displayName || user?.user_metadata?.full_name || 'Körset User'}
                </h2>
                <div
                  style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: fontAdvent }}
                >
                  {user.email || ''}
                </div>
              </>
            ) : (
              <>
                <h2
                  style={{
                    fontFamily: fontAdvent,
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#fff',
                    margin: '0 0 12px',
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                  }}
                >
                  {t.profile.guest}
                </h2>
                <button
                  onClick={() =>
                    navigate('/auth', {
                      state: buildAuthNavigateState(location, {
                        reason: 'profile_required',
                        message: t.profile.authRequiredMsg,
                      }),
                    })
                  }
                  style={{
                    background: 'transparent',
                    border: '1.5px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    fontSize: 13,
                    fontFamily: fontAdvent,
                    fontWeight: 500,
                    padding: '10px 28px',
                    borderRadius: 12,
                    cursor: 'pointer',
                    letterSpacing: 0.5,
                  }}
                >
                  {t.profile.loginBtn}
                </button>
              </>
            )}
          </div>

          {/* ── STATS — 3 GLASS CARDS ── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              padding: '30px 20px 28px',
            }}
          >
            {/* Favorites */}
            <div
              onClick={() => navigate(buildHistoryPath(currentStore?.slug || null, 'favorites'))}
              style={{ flex: 1, position: 'relative', paddingTop: 28, cursor: 'pointer' }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 2,
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(220,38,38,0.25)',
                  border: '2px solid rgba(220,38,38,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(220,38,38,0.25)',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="#F87171"
                  stroke="#F87171"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78Z" />
                </svg>
              </div>
              <div
                className="glass-card"
                style={{
                  padding: '44px 8px 16px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  minHeight: 110,
                }}
              >
                <div
                  style={{
                    fontFamily: fontAdvent,
                    fontSize: 42,
                    fontWeight: 600,
                    color: '#fff',
                    lineHeight: 1,
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {favoritesCount}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: 8,
                    fontFamily: fontAdvent,
                    fontWeight: 500,
                  }}
                >
                  {t.profile.favorites}
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div
              onClick={() => setPrefOpen(!prefOpen)}
              style={{ flex: 1, position: 'relative', paddingTop: 28, cursor: 'pointer' }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 2,
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(124,58,237,0.25)',
                  border: '2px solid rgba(124,58,237,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(124,58,237,0.25)',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#A78BFA"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
              </div>
              <div
                className="glass-card"
                style={{
                  padding: '44px 8px 16px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  minHeight: 110,
                  border: prefOpen ? '1px solid rgba(124,58,237,0.3)' : undefined,
                }}
              >
                <div
                  style={{
                    fontFamily: fontAdvent,
                    fontSize: 42,
                    fontWeight: 600,
                    color: '#fff',
                    lineHeight: 1,
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {totalPref}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: 8,
                    fontFamily: fontAdvent,
                    fontWeight: 500,
                  }}
                >
                  {t.profile.preferencesTitle}
                </div>
              </div>
            </div>

            {/* Scans */}
            <div
              onClick={() => navigate(buildHistoryPath(currentStore?.slug || null, 'history'))}
              style={{ flex: 1, position: 'relative', paddingTop: 28, cursor: 'pointer' }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 2,
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(16,185,129,0.25)',
                  border: '2px solid rgba(16,185,129,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(16,185,129,0.25)',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 8V6a2 2 0 012-2h2" />
                  <path d="M16 4h2a2 2 0 012 2v2" />
                  <path d="M20 16v2a2 2 0 01-2 2h-2" />
                  <path d="M8 20H6a2 2 0 01-2-2v-2" />
                  <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2.5" />
                </svg>
              </div>
              <div
                className="glass-card"
                style={{
                  padding: '44px 8px 16px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  minHeight: 110,
                }}
              >
                <div
                  style={{
                    fontFamily: fontAdvent,
                    fontSize: 42,
                    fontWeight: 600,
                    color: '#fff',
                    lineHeight: 1,
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {scanCount}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: 8,
                    fontFamily: fontAdvent,
                    fontWeight: 500,
                  }}
                >
                  {t.profile.scans}
                </div>
              </div>
            </div>
          </div>

          {/* ── PREFERENCES EXPANDABLE ── */}
          <div style={{ padding: '0 22px 20px' }}>
            {/* Expanded preferences */}
            <div
              style={{
                maxHeight: prefOpen ? 2000 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.5s cubic-bezier(.4,0,.2,1)',
                marginTop: prefOpen ? 8 : 0,
              }}
            >
              <div className="glass-card" style={{ padding: 20 }}>
                {/* Diet */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div
                      style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }}
                    />
                    <span
                      style={{
                        fontFamily: fontAdvent,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#34D399',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}
                    >
                      {t.profile.diet}
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
                        background: profile.halal
                          ? 'rgba(124,58,237,0.2)'
                          : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${profile.halal ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 16 16"
                        fill="#FFFFFF"
                        style={{
                          transition: 'opacity 0.2s ease',
                          opacity: profile.halal ? 1 : 0.3,
                        }}
                      >
                        <path d="M0.191809375 8c0 -4.330375 3.509625 -7.84 7.84 -7.84 1.010625 0 1.978375 0.1929375 2.8665 0.5420625 0.226625 0.0888125 0.3521875 0.3276875 0.300125 0.5635s-0.2695 0.398125 -0.5114375 0.37975c-0.147 -0.0091875 -0.2970625 -0.0153125 -0.447125 -0.0153125 -3.5188125 0 -6.37 2.8511875 -6.37 6.37s2.8511875 6.37 6.37 6.37c0.1500625 0 0.300125 -0.006125 0.447125 -0.0153125 0.2419375 -0.0153125 0.459375 0.1439375 0.5114375 0.37975s-0.0735 0.4746875 -0.300125 0.5635c-0.888125 0.349125 -1.855875 0.5420625 -2.8665 0.5420625 -4.330375 0 -7.84 -3.509625 -7.84 -7.84Zm11.496625 -3.632125c0.1071875 -0.2174375 0.4195625 -0.2174375 0.52675 0l0.9646875 1.953875c0.042875 0.08575 0.1255625 0.147 0.2205 0.1623125l2.156 0.312375c0.2419375 0.0336875 0.336875 0.33075 0.1623125 0.50225l-1.5588125 1.519c-0.0704375 0.067375 -0.1010625 0.165375 -0.08575 0.2603125l0.3675 2.1468125c0.0398125 0.238875 -0.2113125 0.422625 -0.4256875 0.3093125l-1.929375 -1.0136875c-0.08575 -0.0459375 -0.1868125 -0.0459375 -0.2725625 0l-1.929375 1.0136875c-0.214375 0.1133125 -0.4685625 -0.0704375 -0.4256875 -0.3093125l0.3675 -2.1468125c0.0153125 -0.0949375 -0.0153125 -0.1929375 -0.08575 -0.2603125l-1.55575 -1.519c-0.1745625 -0.1715 -0.079625 -0.4655 0.1623125 -0.50225l2.156 -0.312375c0.0949375 -0.0153125 0.177625 -0.0735 0.2205 -0.1623125l0.9646875 -1.953875Z" />
                      </svg>
                      <span
                        style={{
                          fontFamily: fontAdvent,
                          fontSize: 13,
                          fontWeight: 500,
                          color: profile.halal ? '#10B981' : 'rgba(255,255,255,0.4)',
                          transition: 'color 0.2s ease',
                        }}
                      >
                        {t.profile.halalLabel}
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
                            background: a ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${a ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)'}`,
                          }}
                        >
                          <DietIcon name={d.icon} size={24} />
                          <span
                            style={{
                              fontFamily: fontAdvent,
                              fontSize: 13,
                              fontWeight: 500,
                              color: a ? '#C4B5FD' : 'rgba(255,255,255,0.4)',
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
                  style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 0 20px' }}
                />

                {/* Allergens */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div
                      style={{ width: 6, height: 6, borderRadius: '50%', background: '#F87171' }}
                    />
                    <span
                      style={{
                        fontFamily: fontAdvent,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#F87171',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}
                    >
                      {t.profile.allergens}
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
                            background: a ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${a ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                          }}
                        >
                          <DietIcon name={al.icon} size={14} />
                          <span
                            style={{
                              fontFamily: fontAdvent,
                              fontSize: 12,
                              fontWeight: 500,
                              color: a ? '#FCA5A5' : 'rgba(255,255,255,0.4)',
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
                      placeholder={t.profile.customPlaceholder}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 12,
                        padding: '10px 14px',
                        color: '#fff',
                        fontSize: 12,
                        fontFamily: fontAdvent,
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={addCustom}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: '#7C3AED',
                        border: 'none',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: fontAdvent,
                        cursor: 'pointer',
                      }}
                    >
                      {t.profile.add}
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
                            background: 'rgba(239,68,68,0.1)',
                            color: '#FCA5A5',
                            border: '1px solid rgba(239,68,68,0.2)',
                            fontSize: 11,
                            fontFamily: fontAdvent,
                          }}
                        >
                          {val}
                          <span
                            onClick={() => removeCustom(val)}
                            style={{ cursor: 'pointer', fontSize: 14, lineHeight: 1, opacity: 0.6 }}
                          >
                            ×
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── SETTINGS ── */}
          {[
            {
              title: t.profile.sectionMain,
              items: [
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#A78BFA"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  ),
                  label: t.profile.sectionPersonal,
                  onClick: () =>
                    user
                      ? navigate('/setup-profile?mode=edit')
                      : navigate('/auth', {
                          state: buildAuthNavigateState(location, {
                            reason: 'profile_required',
                            message: t.profile.authRequiredPDataMsg,
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
                      stroke="#A78BFA"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                  ),
                  label: t.profile.sectionNotifications,
                  onClick: () =>
                    navigate(buildNotificationSettingsPath(currentStore?.slug || null)),
                },
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#A78BFA"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  ),
                  label: t.profile.sectionPrivacy,
                  onClick: () => navigate(buildPrivacyPath(currentStore?.slug || null)),
                },
              ],
            },
            {
              title: t.profile.sectionSettings,
              items: [
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#A78BFA"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                    </svg>
                  ),
                  label: t.profile.languageHeader,
                  right: (
                    <div
                      style={{
                        display: 'flex',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 10,
                        padding: 3,
                      }}
                    >
                      {['ru', 'kz'].map((l) => (
                        <button
                          key={l}
                          onClick={(e) => {
                            e.stopPropagation()
                            setLang(l)
                          }}
                          style={{
                            background: lang === l ? '#7C3AED' : 'transparent',
                            border: 'none',
                            color: '#fff',
                            padding: '5px 14px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: fontAdvent,
                            cursor: 'pointer',
                          }}
                        >
                          {l.toUpperCase()}
                        </button>
                      ))}
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
                      stroke="#A78BFA"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                    </svg>
                  ),
                  label: t.profile.theme,
                  right: (
                    <span
                      style={{
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.25)',
                        fontFamily: fontAdvent,
                        background: 'rgba(255,255,255,0.05)',
                        padding: '3px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {t.profile.comingSoon}
                    </span>
                  ),
                },
              ],
            },
            {
              title: t.profile.sectionSupport,
              items: [
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#A78BFA"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  ),
                  label: t.profile.help,
                },
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#A78BFA"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  ),
                  label: t.profile.about,
                },
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#A78BFA"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  ),
                  label: t.profile.feedback,
                },
                {
                  icon: (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#A78BFA"
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
                  label: t.profile.policy,
                  onClick: () => navigate('/privacy-policy'),
                },
              ],
            },
          ].map((group, gi) => (
            <div key={gi} style={{ padding: '0 22px 14px' }}>
              <div
                style={{
                  fontFamily: fontAdvent,
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.2)',
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: 'rgba(124,58,237,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {item.icon}
                        </div>
                        <span
                          style={{
                            fontFamily: fontAdvent,
                            fontSize: 14,
                            fontWeight: 500,
                            color: '#fff',
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
                            stroke="rgba(255,255,255,0.15)"
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
                          background: 'rgba(255,255,255,0.03)',
                          margin: '0 18px',
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* ── ACTIONS ── */}
          <div style={{ padding: '0 22px 14px' }}>
            <div className="glass-card" style={{ padding: 0 }}>
              {/* Temporary Button for Retail Cabinet */}
              {user && (
                <>
                  <div
                    className="settings-item"
                    onClick={() => navigate(`/retail/${currentStore?.slug || 'store-one'}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 18px',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: 'rgba(56,189,248,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#38BDF8"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <rect x="3" y="3" width="7" height="9" rx="1" />
                        <rect x="14" y="3" width="7" height="5" rx="1" />
                        <rect x="14" y="12" width="7" height="9" rx="1" />
                        <rect x="3" y="16" width="7" height="5" rx="1" />
                      </svg>
                    </div>
                    <span
                      style={{
                        fontFamily: fontAdvent,
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#38BDF8',
                      }}
                    >
                      Управление магазином (Beta)
                    </span>
                  </div>
                  <div
                    style={{ height: 1, background: 'rgba(255,255,255,0.03)', margin: '0 18px' }}
                  />
                </>
              )}

              <div
                className="settings-item"
                onClick={() => {
                  localStorage.removeItem('korset_onboarding_done')
                  window.location.reload()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: 'rgba(124,58,237,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#A78BFA"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                  </svg>
                </div>
                <span
                  style={{ fontFamily: fontAdvent, fontSize: 14, fontWeight: 500, color: '#fff' }}
                >
                  {t.profile.restartOnboarding}
                </span>
              </div>
              {user && (
                <>
                  <div
                    style={{ height: 1, background: 'rgba(255,255,255,0.03)', margin: '0 18px' }}
                  />
                  <div
                    className="settings-item"
                    onClick={async () => {
                      await logout()
                      navigate(buildProfilePath(currentStore?.slug || null), { replace: true })
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 18px',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: 'rgba(220,38,38,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#F87171"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                    </div>
                    <span
                      style={{
                        fontFamily: fontAdvent,
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#F87171',
                      }}
                    >
                      {t.profile.logout}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{ textAlign: 'center', padding: '16px 22px 30px' }}>
            <div
              style={{
                fontFamily: fontAdvent,
                fontSize: 11,
                color: 'rgba(255,255,255,0.1)',
                fontWeight: 400,
              }}
            >
              Körset v0.1.0 • Kazakhstan 🇰🇿
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
