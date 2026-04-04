import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setLang, useI18n } from '../utils/i18n.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { buildHistoryPath } from '../utils/routes.js'
import { supabase } from '../utils/supabase.js'
import { ALLERGENS } from '../data/allergens.js'
import { DIET_GOALS } from '../data/dietGoals.js'
import { useUserData } from '../contexts/UserDataContext.jsx'
import ProfileAvatar from '../components/ProfileAvatar.jsx'

const displayText = (value, lang) => (typeof value === 'object' ? value?.[lang] || value?.ru : value)

function CircleIcon({ color, bg, children }) {
  return (
    <div style={{ width: 52, height: 52, borderRadius: '50%', background: bg, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 10px 24px ${color}26` }}>
      {children}
    </div>
  )
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
  )
}

function TraitIcon({ kind, color = '#A78BFA' }) {
  const common = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (kind) {
    case 'halal':
      return <svg {...common}><path d="M12 3c3.8 0 6.5 2.5 6.5 6.3 0 6-6.5 11.7-6.5 11.7S5.5 15.3 5.5 9.3C5.5 5.5 8.2 3 12 3Z"/><path d="M9.3 10.2c1.4-1 2.6-1.8 5.1-1.8"/></svg>
    case 'vegan':
      return <svg {...common}><path d="M19 5c-6 0-10 3.8-12 10"/><path d="M5 19c4.6-.6 8.6-3.2 11-8-3.3-.3-7.7.7-11 8Z"/></svg>
    case 'vegetarian':
      return <svg {...common}><path d="M12 4c4 2 5 5 5 8 0 4.5-5 8-5 8s-5-3.5-5-8c0-3 1-6 5-8Z"/><path d="M12 4V1"/></svg>
    case 'keto':
      return <svg {...common}><path d="M12 3c4 0 7 3 7 7 0 6-4 10-7 11-3-1-7-5-7-11 0-4 3-7 7-7Z"/><circle cx="12" cy="13" r="2.7"/></svg>
    case 'kids':
      return <svg {...common}><circle cx="9" cy="9" r="2.2"/><circle cx="15.4" cy="10" r="1.8"/><path d="M6 18c.7-2.2 2.2-3.7 4.2-3.7s3.5 1.5 4.2 3.7"/><path d="M13.3 18c.4-1.4 1.3-2.4 2.7-2.4 1.4 0 2.3 1 2.7 2.4"/></svg>
    case 'nosugar':
      return <svg {...common}><rect x="5" y="9" width="14" height="10" rx="2"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/><path d="M4 4l16 16" stroke="#F87171"/></svg>
    case 'nodairy':
      return <svg {...common}><path d="M9 3h6l2 5v12H7V8l2-5Z"/><path d="M4 4l16 16" stroke="#F87171"/></svg>
    case 'nogluten':
      return <svg {...common}><path d="M12 3v18"/><path d="M9 8c1 .8 2 1.1 3 .5M15 8c-1 .8-2 1.1-3 .5M9 12c1 .8 2 1.1 3 .5M15 12c-1 .8-2 1.1-3 .5"/><path d="M4 4l16 16" stroke="#F87171"/></svg>
    case 'milk':
      return <svg {...common}><path d="M9 3h6l2 5v12H7V8l2-5Z"/></svg>
    case 'egg':
      return <svg {...common}><path d="M12 4c-3 0-5 4.8-5 8a5 5 0 0 0 10 0c0-3.2-2-8-5-8Z"/></svg>
    case 'wheat':
      return <svg {...common}><path d="M12 3v18"/><path d="M9 8c1 .8 2 1.1 3 .5M15 8c-1 .8-2 1.1-3 .5M9 12c1 .8 2 1.1 3 .5M15 12c-1 .8-2 1.1-3 .5"/></svg>
    case 'nuts':
      return <svg {...common}><path d="M12 4c4 0 6.5 2.6 6.5 6.1 0 4.4-3.3 8.3-6.5 9.1-3.2-.8-6.5-4.7-6.5-9.1C5.5 6.6 8 4 12 4Z"/></svg>
    case 'peanut':
      return <svg {...common}><path d="M10 4.5a3.5 3.5 0 1 0 0 7h4a3.5 3.5 0 1 0 0-7h-4ZM10 12.5a3.5 3.5 0 1 0 0 7h4a3.5 3.5 0 1 0 0-7h-4Z"/></svg>
    case 'soy':
      return <svg {...common}><ellipse cx="9" cy="11" rx="3" ry="4.6" transform="rotate(-18 9 11)"/><ellipse cx="15" cy="11" rx="3" ry="4.6" transform="rotate(18 15 11)"/></svg>
    case 'fish':
      return <svg {...common}><path d="M20 12c-3-3.2-7-4.4-12-3l-4 3 4 3c5 1.4 9 .2 12-3Z"/></svg>
    case 'shell':
      return <svg {...common}><path d="M7 18c1.5-5.4 4.4-8.4 8.8-10.8"/><path d="M8 7c2.6 0 5 1.5 6.2 4"/><path d="M13 18l2-4 4-2"/></svg>
    case 'sesame':
      return <svg {...common}><ellipse cx="8" cy="12" rx="2" ry="3.2" transform="rotate(-20 8 12)"/><ellipse cx="16" cy="12" rx="2" ry="3.2" transform="rotate(20 16 12)"/></svg>
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8"/></svg>
  }
}

function StatCard({ icon, value, label, onClick, accent }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, appearance: 'none', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
      borderRadius: 22, padding: '18px 12px 16px', cursor: 'pointer', textAlign: 'left',
      display: 'flex', flexDirection: 'column', gap: 14,
      boxShadow: '0 12px 28px rgba(0,0,0,0.18)'
    }}>
      <CircleIcon color={accent} bg={`${accent}1A`}>{icon}</CircleIcon>
      <div>
        <div style={{ fontSize: 34, lineHeight: 1, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em' }}>{value}</div>
        <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: 600 }}>{label}</div>
      </div>
    </button>
  )
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)', marginBottom: 10, paddingLeft: 4 }}>{children}</div>
}

function SettingsCard({ items }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 16px 32px rgba(0,0,0,0.18)' }}>
      {items.map((item, index) => (
        <div key={item.label + index}>
          <button onClick={item.onClick} style={{
            width: '100%', appearance: 'none', background: 'transparent', border: 'none', padding: '16px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: item.onClick ? 'pointer' : 'default', textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
              <div style={{ color: item.danger ? '#F87171' : '#fff', fontSize: 14, fontWeight: 600 }}>{item.label}</div>
            </div>
            {item.right || (item.onClick ? <Chevron /> : null)}
          </button>
          {index < items.length - 1 && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 18px' }} />}
        </div>
      ))}
    </div>
  )
}

export default function ProfileScreen() {
  const navigate = useNavigate()
  const { currentStore } = useStore()
  const { lang, t } = useI18n()
  const { profile, updateProfile } = useProfile()
  const { user } = useAuth()
  const { favoritesCount, scanCount } = useUserData()
  const allergenInputRef = useRef(null)
  const [allergenInput, setAllergenInput] = useState('')
  const [prefOpen, setPrefOpen] = useState(false)

  const totalPref = profile.dietGoals.length + profile.allergens.length + profile.customAllergens.length + (profile.halal ? 1 : 0)
  const displayName = user?.user_metadata?.full_name || 'Körset User'
  const avatarId = user?.user_metadata?.avatar_id || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null

  const toggleDiet = (id) => {
    const nextGoals = profile.dietGoals.includes(id)
      ? profile.dietGoals.filter((item) => item !== id)
      : [...profile.dietGoals, id]
    updateProfile({ dietGoals: nextGoals })
  }

  const toggleAllergen = (id) => {
    const nextAllergens = profile.allergens.includes(id)
      ? profile.allergens.filter((item) => item !== id)
      : [...profile.allergens, id]
    updateProfile({ allergens: nextAllergens })
  }

  const toggleHalal = () => updateProfile({ halal: !profile.halal })

  const addCustom = () => {
    const value = allergenInput.trim()
    if (!value) return
    if (profile.customAllergens.includes(value)) {
      setAllergenInput('')
      return
    }
    updateProfile({ customAllergens: [...profile.customAllergens, value] })
    setAllergenInput('')
  }

  const removeCustom = (value) => {
    updateProfile({ customAllergens: profile.customAllergens.filter((item) => item !== value) })
  }

  const commonSettings = useMemo(() => ([
    {
      label: lang === 'kz' ? 'Жеке деректер' : 'Личные данные',
      onClick: () => navigate('/setup-profile?mode=edit'),
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    },
    {
      label: lang === 'kz' ? 'Уведомления' : 'Уведомления',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
    },
    {
      label: lang === 'kz' ? 'Приваттылық' : 'Приватность',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    }
  ]), [lang, navigate])

  const settingsSettings = useMemo(() => ([
    {
      label: lang === 'kz' ? 'Тіл' : 'Язык',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
      right: (
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 3 }}>
          {['ru', 'kz'].map((code) => (
            <button key={code} onClick={(event) => { event.stopPropagation(); setLang(code) }} style={{ background: lang === code ? '#7C3AED' : 'transparent', color: '#fff', border: 'none', borderRadius: 9, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{code.toUpperCase()}</button>
          ))}
        </div>
      )
    },
    {
      label: lang === 'kz' ? 'Тақырып' : 'Тема',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
      right: <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.36)', padding: '6px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.05)' }}>{lang === 'kz' ? 'Жақында' : 'Скоро'}</span>
    }
  ]), [lang])

  const supportSettings = useMemo(() => ([
    {
      label: lang === 'kz' ? 'Анықтама' : 'Справка',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    },
    {
      label: lang === 'kz' ? 'Қосымша туралы' : 'О приложении',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
    },
    {
      label: lang === 'kz' ? 'Кері байланыс' : 'Обратная связь',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    }
  ]), [lang])

  const actionsSettings = useMemo(() => ([
    {
      label: t.profile.restartOnboarding,
      onClick: () => { localStorage.removeItem('korset_onboarding_done'); window.location.reload() },
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
    },
    ...(user ? [{
      label: t.profile.logout,
      onClick: () => supabase.auth.signOut(),
      danger: true,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
    }] : [])
  ]), [t, user])

  return (
    <div className="screen" style={{ paddingTop: 0, paddingBottom: 'calc(160px + env(safe-area-inset-bottom))', background: '#07070F' }}>
      <div style={{ padding: 'max(16px, env(safe-area-inset-top)) 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.2 }}>{lang === 'kz' ? 'Профиль' : 'Профиль'}</div>
          <button onClick={() => navigate('/setup-profile?mode=edit')} style={{ height: 40, padding: '0 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {lang === 'kz' ? 'Өңдеу' : 'Изменить'}
          </button>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 28, padding: 22, boxShadow: '0 18px 40px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: 112, height: 112, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(139,92,246,0.7)', boxShadow: '0 0 0 8px rgba(139,92,246,0.08), 0 12px 30px rgba(124,58,237,0.18)' }}>
              <ProfileAvatar avatarId={avatarId} name={displayName} rounded="circle" />
            </div>
            <div style={{ marginTop: 18, fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1.1 }}>{displayName}</div>
            <div style={{ marginTop: 8, fontSize: 14, color: 'rgba(255,255,255,0.38)' }}>{user?.email || ''}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16, marginBottom: 20 }}>
          <StatCard accent="#F87171" onClick={() => navigate(buildHistoryPath(currentStore?.slug || null, 'favorites'))} value={favoritesCount} label={t.profile.favorites} icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="#F87171" stroke="#F87171" strokeWidth="1"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/></svg>} />
          <StatCard accent="#A78BFA" onClick={() => setPrefOpen((value) => !value)} value={totalPref} label={lang === 'kz' ? 'Баптаулар' : 'Предпочтения'} icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>} />
          <StatCard accent="#10B981" onClick={() => navigate(buildHistoryPath(currentStore?.slug || null, 'history'))} value={scanCount} label={t.profile.scans} icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M20 16v2a2 2 0 0 1-2 2h-2"/><path d="M8 20H6a2 2 0 0 1-2-2v-2"/><line x1="5" y1="12" x2="19" y2="12"/></svg>} />
        </div>

        <div style={{ maxHeight: prefOpen ? 1400 : 0, overflow: 'hidden', transition: 'max-height 0.28s ease', marginBottom: prefOpen ? 18 : 0 }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 18, boxShadow: '0 16px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{lang === 'kz' ? 'Сіздің параметрлеріңіз' : 'Ваши параметры'}</div>
                <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{lang === 'kz' ? 'Аллергия мен диета үшін басқару' : 'Управляйте диетой, халяль и исключениями'}</div>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{t.profile.diet}</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <button onClick={toggleHalal} style={{ appearance: 'none', border: `1px solid ${profile.halal ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.08)'}`, background: profile.halal ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: profile.halal ? '#A7F3D0' : 'rgba(255,255,255,0.72)', fontWeight: 700 }}>
                  <TraitIcon kind="halal" color={profile.halal ? '#34D399' : '#A78BFA'} />
                  <span>{t.profile.halalLabel}</span>
                </button>
                {DIET_GOALS.map((goal) => {
                  const active = profile.dietGoals.includes(goal.id)
                  return (
                    <button key={goal.id} onClick={() => toggleDiet(goal.id)} style={{ appearance: 'none', border: `1px solid ${active ? 'rgba(124,58,237,0.38)' : 'rgba(255,255,255,0.08)'}`, background: active ? 'rgba(124,58,237,0.16)' : 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: active ? '#DDD6FE' : 'rgba(255,255,255,0.72)', fontWeight: 700 }}>
                      <TraitIcon kind={goal.icon} color={active ? '#A78BFA' : '#C4B5FD'} />
                      <span>{displayText(goal.label, lang)}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 0 16px' }} />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F87171' }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: '#F87171', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{t.profile.allergens}</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {ALLERGENS.map((allergen) => {
                  const active = profile.allergens.includes(allergen.id)
                  return (
                    <button key={allergen.id} onClick={() => toggleAllergen(allergen.id)} style={{ appearance: 'none', border: `1px solid ${active ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.08)'}`, background: active ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: active ? '#FECACA' : 'rgba(255,255,255,0.72)', fontWeight: 700 }}>
                      <TraitIcon kind={allergen.icon} color={active ? '#F87171' : '#FCA5A5'} />
                      <span>{displayText(allergen.label, lang)}</span>
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <input ref={allergenInputRef} value={allergenInput} onChange={(event) => setAllergenInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addCustom()} placeholder={t.profile.customPlaceholder} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none' }} />
                <button onClick={addCustom} style={{ appearance: 'none', border: 'none', borderRadius: 14, background: '#7C3AED', color: '#fff', padding: '0 16px', fontWeight: 700, cursor: 'pointer' }}>{t.profile.add}</button>
              </div>

              {profile.customAllergens.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {profile.customAllergens.map((value) => (
                    <div key={value} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 14, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.24)', color: '#FECACA', fontSize: 13, fontWeight: 700 }}>
                      <span>{value}</span>
                      <button onClick={() => removeCustom(value)} style={{ background: 'transparent', border: 'none', color: '#FECACA', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <SectionTitle>{lang === 'kz' ? 'Негізгі' : 'Основное'}</SectionTitle>
        <SettingsCard items={commonSettings} />

        <div style={{ height: 16 }} />
        <SectionTitle>{lang === 'kz' ? 'Баптаулар' : 'Настройки'}</SectionTitle>
        <SettingsCard items={settingsSettings} />

        <div style={{ height: 16 }} />
        <SectionTitle>{lang === 'kz' ? 'Қолдау' : 'Поддержка'}</SectionTitle>
        <SettingsCard items={supportSettings} />

        <div style={{ height: 16 }} />
        <SettingsCard items={actionsSettings} />

        <div style={{ textAlign: 'center', padding: '22px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>Körset v0.1.0</div>
      </div>
    </div>
  )
}
