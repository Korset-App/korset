import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { setLang, useI18n } from '../utils/i18n.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../utils/supabase.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { buildHistoryPath, buildNotificationSettingsPath, buildPrivacyPath, buildProfilePath } from '../utils/routes.js'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import { ALLERGENS } from '../data/allergens.js'
import { DIET_GOALS } from '../data/dietGoals.js'
import { buildAuthNavigateState } from '../utils/authFlow.js'

/* ─── DIET/ALLERGEN ICONS ─── */
function DietIcon({ name, size = 18 }) {
  const w = size, h = size, lc = 'round', lj = 'round'
  const icons = {
    nosugar: <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><rect x="4" y="9" width="16" height="11" rx="2" fill="#A78BFA" opacity=".25"/><rect x="4" y="9" width="16" height="11" rx="2" stroke="#A78BFA" strokeWidth="1.8"/><path d="M8 9V7a4 4 0 018 0v2" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap={lc}/><line x1="3" y1="3" x2="21" y2="21" stroke="#F87171" strokeWidth="2.2" strokeLinecap={lc}/></svg>,
    nodairy: <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M9 3h6l2 5v12a1 1 0 01-1 1H8a1 1 0 01-1-1V8l2-5z" fill="#60A5FA" opacity=".2"/><path d="M9 3h6l2 5v12a1 1 0 01-1 1H8a1 1 0 01-1-1V8l2-5z" stroke="#60A5FA" strokeWidth="1.8"/><line x1="3" y1="3" x2="21" y2="21" stroke="#F87171" strokeWidth="2.2" strokeLinecap={lc}/></svg>,
    nogluten: <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M12 2v20" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap={lc}/><path d="M9 8c1 .7 2 1 3 .5M15 8c-1 .7-2 1-3 .5M9 12c1 .7 2 1 3 .5M15 12c-1 .7-2 1-3 .5" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap={lc}/><line x1="3" y1="3" x2="21" y2="21" stroke="#F87171" strokeWidth="2.2" strokeLinecap={lc}/></svg>,
    vegan: <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M21 4C10 4 5 12 5 20" stroke="#34D399" strokeWidth="1.8" strokeLinecap={lc}/><path d="M5 20c3-7 8-12 16-11-1 4-4 10-16 11Z" stroke="#34D399" strokeWidth="1.8" fill="rgba(52,211,153,.18)"/></svg>,
    veggie: <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M12 4c4 2 5 5 5 8 0 5-5 8-5 8s-5-3-5-8c0-3 1-6 5-8Z" fill="rgba(249,115,22,.16)" stroke="#FB923C" strokeWidth="1.8"/><path d="M10 4c-1-2-2-3-3-2M12 4V1M14 4c1-2 2-3 3-2" stroke="#34D399" strokeWidth="1.7" strokeLinecap={lc}/></svg>,
    keto: <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M12 3c4.5 0 7 3.5 7 8 0 5.5-3.5 10-7 11-3.5-1-7-5.5-7-11 0-4.5 2.5-8 7-8z" fill="rgba(132,204,22,.14)" stroke="#84CC16" strokeWidth="1.8"/><circle cx="12" cy="13.5" r="3" fill="rgba(161,98,7,.42)" stroke="#A16207" strokeWidth="1.4"/></svg>,
    kids: <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="2.3" fill="rgba(96,165,250,.16)" stroke="#60A5FA" strokeWidth="1.6"/><circle cx="15.5" cy="9.5" r="1.8" fill="rgba(167,139,250,.16)" stroke="#A78BFA" strokeWidth="1.6"/><path d="M5.5 18c.7-2.5 2.5-4 4.5-4s3.8 1.5 4.5 4" stroke="#60A5FA" strokeWidth="1.7" strokeLinecap={lc}/><path d="M13.5 18c.4-1.6 1.5-2.7 3-2.7s2.7 1.1 3 2.7" stroke="#A78BFA" strokeWidth="1.7" strokeLinecap={lc}/></svg>,
    milk: <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M9 3h6l2 5v12H7V8l2-5Z" stroke="#60A5FA" strokeWidth="1.7" fill="rgba(96,165,250,.14)"/></svg>,
    egg: <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M12 3C8.8 3 6.5 8 6.5 12.3a5.5 5.5 0 1011 0C17.5 8 15.2 3 12 3Z" stroke="#FCD34D" strokeWidth="1.7" fill="rgba(252,211,77,.18)"/></svg>,
    wheat: <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M12 3v18" stroke="#F59E0B" strokeWidth="1.7" strokeLinecap={lc}/><path d="M9 8c1 .7 2 1 3 .5M15 8c-1 .7-2 1-3 .5M9 12c1 .7 2 1 3 .5M15 12c-1 .7-2 1-3 .5" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap={lc}/></svg>,
    nuts: <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M12 4c4.2 0 6.8 2.7 6.8 6.3 0 4.8-3.4 8.8-6.8 9.7-3.4-.9-6.8-4.9-6.8-9.7C5.2 6.7 7.8 4 12 4Z" stroke="#D97706" strokeWidth="1.7" fill="rgba(217,119,6,.14)"/></svg>,
    peanut: <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M10 4.5a3.5 3.5 0 100 7h4a3.5 3.5 0 100-7h-4ZM10 12.5a3.5 3.5 0 100 7h4a3.5 3.5 0 100-7h-4Z" stroke="#F59E0B" strokeWidth="1.7" fill="rgba(245,158,11,.14)"/></svg>,
    soy: <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><ellipse cx="9" cy="10" rx="3.6" ry="5.2" transform="rotate(-18 9 10)" stroke="#84CC16" strokeWidth="1.7" fill="rgba(132,204,22,.14)"/><ellipse cx="15" cy="10" rx="3.6" ry="5.2" transform="rotate(18 15 10)" stroke="#84CC16" strokeWidth="1.7" fill="rgba(132,204,22,.1)"/></svg>,
    fish: <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M20 12c-3-3.4-7-4.8-12-3.4L4 12l4 3.4c5 1.6 9 .2 12-3.4Z" stroke="#60A5FA" strokeWidth="1.7" fill="rgba(96,165,250,.14)"/></svg>,
    shell: <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M15 5c2 1.4 3 3.8 2 6.6l-2 2.8-2.8 1.7-1.7 3.4" stroke="#F472B6" strokeWidth="1.7" strokeLinecap={lc}/><path d="M15 5c-2 0-3.8 1-5 2.8L8.3 12l1.5 3.2" stroke="#F472B6" strokeWidth="1.7" strokeLinecap={lc}/></svg>,
    sesame: <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><ellipse cx="8" cy="12" rx="2.2" ry="3.4" transform="rotate(-18 8 12)" stroke="#FDE68A" strokeWidth="1.6" fill="rgba(253,230,138,.18)"/><ellipse cx="16" cy="12" rx="2.2" ry="3.4" transform="rotate(18 16 12)" stroke="#FDE68A" strokeWidth="1.6" fill="rgba(253,230,138,.12)"/></svg>,
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

  const toggleDiet = id => setProfile(p => ({
    ...p, dietGoals: p.dietGoals.includes(id) ? p.dietGoals.filter(x => x !== id) : [...p.dietGoals, id]
  }))
  const toggleAllergen = id => setProfile(p => ({
    ...p, allergens: p.allergens.includes(id) ? p.allergens.filter(x => x !== id) : [...p.allergens, id]
  }))
  const addCustom = () => {
    const val = allergenInput.trim()
    if (!val || profile.customAllergens.includes(val)) return
    setProfile(p => ({ ...p, customAllergens: [...p.customAllergens, val] }))
    setAllergenInput('')
  }
  const removeCustom = val => setProfile(p => ({ ...p, customAllergens: p.customAllergens.filter(x => x !== val) }))

  const dietCount = profile.dietGoals.length + (profile.halal ? 1 : 0)
  const allergenCount = profile.allergens.length + profile.customAllergens.length
  const totalPref = dietCount + allergenCount
  const tr = (val) => typeof val === 'object' ? (val[lang] || val.ru) : val

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

      <div className="screen" style={{ paddingTop: 0, paddingBottom: 100, overflowX: 'hidden', minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>

        {/* ── FLOATING ORBS (for glass effect) ── */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: 120, left: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(124,58,237,0.12)', filter: 'blur(60px)', animation: 'floatOrb1 8s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: 300, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(236,72,153,0.1)', filter: 'blur(50px)', animation: 'floatOrb2 10s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: 500, left: 60, width: 120, height: 120, borderRadius: '50%', background: 'rgba(52,211,153,0.08)', filter: 'blur(45px)', animation: 'floatOrb3 12s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: 50, right: 40, width: 100, height: 100, borderRadius: '50%', background: 'rgba(167,139,250,0.08)', filter: 'blur(40px)', animation: 'floatOrb2 9s ease-in-out infinite' }} />
        </div>

        {/* All content above orbs */}
        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* ── HEADER ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px 0' }}>
            <h1 style={{ fontFamily: fontAdvent, fontSize: 24, fontWeight: 500, color: '#fff', margin: 0, lineHeight: 1 }}>
              {lang === 'kz' ? 'Профиль' : 'Профиль'}
            </h1>
            {user && (<button onClick={() => navigate('/setup-profile?mode=edit')} style={{
              background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)',
              padding: '8px 16px', borderRadius: 12, color: '#A78BFA', fontSize: 12,
              fontWeight: 600, fontFamily: fontAdvent, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              {lang === 'kz' ? 'Өзгерту' : 'Изменить'}
            </button>)}
          </div>

          {/* ── AVATAR + NAME ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 22px 28px' }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%',
              border: '3.5px solid #7C3AED', padding: 4,
              boxShadow: '0 0 40px rgba(124,58,237,0.25), inset 0 0 20px rgba(124,58,237,0.1)',
              marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box'
            }}>
              {user ? (
                <ProfileAvatar avatarId={avatarId || user?.user_metadata?.avatar_id} name={displayName || user?.user_metadata?.full_name} rounded="circle" />
              ) : (
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
              )}
            </div>
            {user ? (
              <>
                <h2 style={{ fontFamily: fontAdvent, fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {displayName || user?.user_metadata?.full_name || 'Körset User'}
                </h2>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: fontAdvent }}>{user.email || ''}</div>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: fontAdvent, fontSize: 28, fontWeight: 700, color: '#fff', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 2 }}>
                  {t.profile.guest}
                </h2>
                <button onClick={() => navigate('/auth', { state: buildAuthNavigateState(location, { reason: 'profile_required', message: lang === 'kz' ? 'Профиль баптауларын пайдалану үшін аккаунтқа кіріңіз.' : 'Войдите в аккаунт, чтобы использовать настройки профиля.' }) })} style={{
                  background: 'transparent', border: '1.5px solid rgba(255,255,255,0.2)',
                  color: '#fff', fontSize: 13, fontFamily: fontAdvent, fontWeight: 500,
                  padding: '10px 28px', borderRadius: 12, cursor: 'pointer', letterSpacing: 0.5
                }}>{lang === 'kz' ? 'Аккаунтқа кіру' : 'Войти в аккаунт'}</button>
              </>
            )}
          </div>

          {/* ── STATS — 3 GLASS CARDS ── */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '30px 20px 28px' }}>
            {/* Favorites */}
            <div onClick={() => navigate(buildHistoryPath(currentStore?.slug || null, 'favorites'))} style={{ flex: 1, position: 'relative', paddingTop: 28, cursor: 'pointer' }}>
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 2,
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(220,38,38,0.25)', border: '2px solid rgba(220,38,38,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(220,38,38,0.25)'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#F87171" stroke="#F87171" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78Z"/></svg>
              </div>
              <div className="glass-card" style={{ padding: '44px 8px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', minHeight: 110 }}>
                <div style={{ fontFamily: fontAdvent, fontSize: 42, fontWeight: 600, color: '#fff', lineHeight: 1, flex: 1, display: 'flex', alignItems: 'center' }}>{favoritesCount}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8, fontFamily: fontAdvent, fontWeight: 500 }}>{t.profile.favorites}</div>
              </div>
            </div>

            {/* Preferences */}
            <div onClick={() => setPrefOpen(!prefOpen)} style={{ flex: 1, position: 'relative', paddingTop: 28, cursor: 'pointer' }}>
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 2,
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(124,58,237,0.25)', border: '2px solid rgba(124,58,237,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(124,58,237,0.25)'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
              </div>
              <div className="glass-card" style={{ padding: '44px 8px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', minHeight: 110, border: prefOpen ? '1px solid rgba(124,58,237,0.3)' : undefined }}>
                <div style={{ fontFamily: fontAdvent, fontSize: 42, fontWeight: 600, color: '#fff', lineHeight: 1, flex: 1, display: 'flex', alignItems: 'center' }}>{totalPref}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8, fontFamily: fontAdvent, fontWeight: 500 }}>
                  {lang === 'kz' ? 'Баптау' : 'Предпочтения'}
                </div>
              </div>
            </div>

            {/* Scans */}
            <div onClick={() => navigate(buildHistoryPath(currentStore?.slug || null, 'history'))} style={{ flex: 1, position: 'relative', paddingTop: 28, cursor: 'pointer' }}>
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 2,
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(16,185,129,0.25)', border: '2px solid rgba(16,185,129,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(16,185,129,0.25)'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V6a2 2 0 012-2h2"/><path d="M16 4h2a2 2 0 012 2v2"/><path d="M20 16v2a2 2 0 01-2 2h-2"/><path d="M8 20H6a2 2 0 01-2-2v-2"/><line x1="5" y1="12" x2="19" y2="12" strokeWidth="2.5"/></svg>
              </div>
              <div className="glass-card" style={{ padding: '44px 8px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', minHeight: 110 }}>
                <div style={{ fontFamily: fontAdvent, fontSize: 42, fontWeight: 600, color: '#fff', lineHeight: 1, flex: 1, display: 'flex', alignItems: 'center' }}>{scanCount}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8, fontFamily: fontAdvent, fontWeight: 500 }}>{t.profile.scans}</div>
              </div>
            </div>
          </div>

          {/* ── PREFERENCES EXPANDABLE ── */}
          <div style={{ padding: '0 22px 20px' }}>

            {/* Expanded preferences */}
            <div style={{
              maxHeight: prefOpen ? 2000 : 0, overflow: 'hidden',
              transition: 'max-height 0.5s cubic-bezier(.4,0,.2,1)',
              marginTop: prefOpen ? 8 : 0
            }}>
              <div className="glass-card" style={{ padding: 20 }}>
                {/* Diet */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
                    <span style={{ fontFamily: fontAdvent, fontSize: 13, fontWeight: 600, color: '#34D399', textTransform: 'uppercase', letterSpacing: 1 }}>{t.profile.diet}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <div className="pref-chip" onClick={() => setProfile(p => ({ ...p, halal: !p.halal }))} style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 14,
                      background: profile.halal ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${profile.halal ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    }}>
                      <span style={{ fontSize: 14 }}>🌙</span>
                      <span style={{ fontFamily: fontAdvent, fontSize: 13, fontWeight: 500, color: profile.halal ? '#C4B5FD' : 'rgba(255,255,255,0.4)' }}>{t.profile.halalLabel}</span>
                    </div>
                    {DIET_GOALS.map(d => {
                      const a = profile.dietGoals.includes(d.id)
                      return (
                        <div key={d.id} className="pref-chip" onClick={() => toggleDiet(d.id)} style={{
                          display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 14,
                          background: a ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${a ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        }}>
                          <DietIcon name={d.icon} size={15} />
                          <span style={{ fontFamily: fontAdvent, fontSize: 13, fontWeight: 500, color: a ? '#C4B5FD' : 'rgba(255,255,255,0.4)' }}>{tr(d.label)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 0 20px' }} />

                {/* Allergens */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F87171' }} />
                    <span style={{ fontFamily: fontAdvent, fontSize: 13, fontWeight: 600, color: '#F87171', textTransform: 'uppercase', letterSpacing: 1 }}>{t.profile.allergens}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    {ALLERGENS.map(al => {
                      const a = profile.allergens.includes(al.id)
                      return (
                        <div key={al.id} className="pref-chip" onClick={() => toggleAllergen(al.id)} style={{
                          display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 14,
                          background: a ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${a ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        }}>
                          <DietIcon name={al.icon} size={14} />
                          <span style={{ fontFamily: fontAdvent, fontSize: 12, fontWeight: 500, color: a ? '#FCA5A5' : 'rgba(255,255,255,0.4)' }}>{tr(al.label)}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input ref={allergenInputRef} value={allergenInput}
                      onChange={e => setAllergenInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCustom()}
                      placeholder={t.profile.customPlaceholder}
                      style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: 12, fontFamily: fontAdvent, outline: 'none' }}
                    />
                    <button onClick={addCustom} style={{ padding: '10px 14px', borderRadius: 12, background: '#7C3AED', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: fontAdvent, cursor: 'pointer' }}>{t.profile.add}</button>
                  </div>
                  {profile.customAllergens.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {profile.customAllergens.map(val => (
                        <span key={val} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, fontFamily: fontAdvent }}>
                          {val}
                          <span onClick={() => removeCustom(val)} style={{ cursor: 'pointer', fontSize: 14, lineHeight: 1, opacity: 0.6 }}>×</span>
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
              title: lang === 'kz' ? 'Негізгі' : 'Основное',
              items: [
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label: lang === 'kz' ? 'Жеке деректер' : 'Личные данные', onClick: () => user ? navigate('/setup-profile?mode=edit') : navigate('/auth', { state: buildAuthNavigateState(location, { reason: 'profile_required', message: lang === 'kz' ? 'Жеке деректерді көру және өзгерту үшін аккаунтқа кіріңіз.' : 'Сначала войдите в аккаунт, чтобы видеть и редактировать личные данные.' }) }) },
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>, label: lang === 'kz' ? 'Хабарландырулар' : 'Уведомления', onClick: () => navigate(buildNotificationSettingsPath(currentStore?.slug || null)) },
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>, label: lang === 'kz' ? 'Құпиялылық' : 'Приватность', onClick: () => navigate(buildPrivacyPath(currentStore?.slug || null)) },
              ]
            },
            {
              title: lang === 'kz' ? 'Параметрлер' : 'Настройки',
              items: [
                {
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
                  label: t.profile.languageHeader,
                  right: (
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3 }}>
                      {['ru', 'kz'].map(l => (
                        <button key={l} onClick={e => { e.stopPropagation(); setLang(l) }} style={{
                          background: lang === l ? '#7C3AED' : 'transparent', border: 'none', color: '#fff',
                          padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: fontAdvent, cursor: 'pointer'
                        }}>{l.toUpperCase()}</button>
                      ))}
                    </div>
                  )
                },
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>, label: lang === 'kz' ? 'Тақырып' : 'Тема', right: <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: fontAdvent, background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 6 }}>Скоро</span> },
              ]
            },
            {
              title: lang === 'kz' ? 'Қолдау' : 'Поддержка',
              items: [
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>, label: lang === 'kz' ? 'Анықтама' : 'Справка' },
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>, label: lang === 'kz' ? 'Қосымша туралы' : 'О приложении' },
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>, label: lang === 'kz' ? 'Кері байланыс' : 'Обратная связь' },
              ]
            }
          ].map((group, gi) => (
            <div key={gi} style={{ padding: '0 22px 14px' }}>
              <div style={{ fontFamily: fontAdvent, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.5, paddingLeft: 4 }}>{group.title}</div>
              <div className="glass-card" style={{ padding: 0 }}>
                {group.items.map((item, i) => (
                  <div key={i}>
                    <div className="settings-item" onClick={item.onClick || undefined} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 18px', cursor: item.onClick ? 'pointer' : 'default'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
                        <span style={{ fontFamily: fontAdvent, fontSize: 14, fontWeight: 500, color: '#fff' }}>{item.label}</span>
                      </div>
                      {item.right || (item.onClick && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>)}
                    </div>
                    {i < group.items.length - 1 && <div style={{ height: 1, background: 'rgba(255,255,255,0.03)', margin: '0 18px' }} />}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* ── ACTIONS ── */}
          <div style={{ padding: '0 22px 14px' }}>
            <div className="glass-card" style={{ padding: 0 }}>
              <div className="settings-item" onClick={() => { localStorage.removeItem('korset_onboarding_done'); window.location.reload() }} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer'
              }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                </div>
                <span style={{ fontFamily: fontAdvent, fontSize: 14, fontWeight: 500, color: '#fff' }}>{t.profile.restartOnboarding}</span>
              </div>
              {user && (
                <>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.03)', margin: '0 18px' }} />
                  <div className="settings-item" onClick={async () => { await logout(); navigate(buildProfilePath(currentStore?.slug || null), { replace: true }) }} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer'
                  }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    </div>
                    <span style={{ fontFamily: fontAdvent, fontSize: 14, fontWeight: 500, color: '#F87171' }}>{t.profile.logout}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{ textAlign: 'center', padding: '16px 22px 30px' }}>
            <div style={{ fontFamily: fontAdvent, fontSize: 11, color: 'rgba(255,255,255,0.1)', fontWeight: 400 }}>Körset v0.1.0 • Kazakhstan 🇰🇿</div>
          </div>

        </div>
      </div>
    </>
  )
}
