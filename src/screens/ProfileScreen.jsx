import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { setLang, useI18n } from '../utils/i18n.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../utils/supabase.js'
import KorsetAvatar from '../components/KorsetAvatar.jsx'

const DIET_GOALS = [
  { id: 'sugar_free',  label: { ru: 'Без сахара', kz: 'Қантсыз' }, icon: 'nosugar' },
  { id: 'dairy_free',  label: { ru: 'Без лактозы', kz: 'Лактозасыз' }, icon: 'nodairy' },
  { id: 'gluten_free', label: { ru: 'Без глютена', kz: 'Глютенсіз' }, icon: 'nogluten' },
  { id: 'vegan',       label: { ru: 'Веган', kz: 'Веган' }, icon: 'vegan' },
  { id: 'vegetarian',  label: { ru: 'Вегетариан', kz: 'Вегетариан' }, icon: 'veggie' },
  { id: 'keto',        label: { ru: 'Кето', kz: 'Кето' }, icon: 'keto' },
  { id: 'kid_friendly',label: { ru: 'Для детей', kz: 'Балаларға' }, icon: 'kids' },
]

const ALLERGENS = [
  { id: 'milk', label: { ru: 'Молоко', kz: 'Сүт' }, icon: 'milk' },
  { id: 'eggs', label: { ru: 'Яйца', kz: 'Жұмыртқа' }, icon: 'egg' },
  { id: 'gluten', label: { ru: 'Глютен', kz: 'Глютен' }, icon: 'wheat' },
  { id: 'nuts', label: { ru: 'Орехи', kz: 'Жаңғақ' }, icon: 'nuts' },
  { id: 'peanuts', label: { ru: 'Арахис', kz: 'Жержаңғақ' }, icon: 'peanut' },
  { id: 'soy', label: { ru: 'Соя', kz: 'Соя' }, icon: 'soy' },
  { id: 'fish', label: { ru: 'Рыба', kz: 'Балық' }, icon: 'fish' },
  { id: 'shellfish', label: { ru: 'Морепродукты', kz: 'Теңіз өнімдері' }, icon: 'shell' },
  { id: 'sesame', label: { ru: 'Кунжут', kz: 'Күнжіт' }, icon: 'sesame' },
  { id: 'honey', label: { ru: 'Мёд', kz: 'Бал' }, icon: 'honey' },
]

const PRIORITIES = [
  { id: 'price',    label: { ru: 'Цена', kz: 'Баға' },     desc: { ru: 'Ең арзан', kz: 'Ең арзан' },   icon: 'price'   },
  { id: 'balanced', label: { ru: 'Баланс', kz: 'Теңгерім' },   desc: { ru: 'Цена + качество', kz: 'Баға + сапа' }, icon: 'balance' },
  { id: 'quality',  label: { ru: 'Качество', kz: 'Сапа' }, desc: { ru: 'Лучший состав', kz: 'Ең жақсы құрам' },   icon: 'quality' },
]

// Colored filled icons — no emoji
function Icon({ name, size = 20 }) {
  const w = size, h = size
  switch (name) {
    // DIET — colored, filled, instantly recognizable
    case 'nosugar': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        {/* Sugar = cube with slash */}
        <rect x="4" y="9" width="16" height="11" rx="2" fill="#A78BFA" opacity="0.25"/>
        <rect x="4" y="9" width="16" height="11" rx="2" stroke="#A78BFA" strokeWidth="1.8"/>
        <path d="M8 9V7a4 4 0 0 1 8 0v2" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="3" y1="3" x2="21" y2="21" stroke="#F87171" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    )
    case 'nodairy': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        <path d="M9 3h6l2 5v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8l2-5z" fill="#60A5FA" opacity="0.2"/>
        <path d="M9 3h6l2 5v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8l2-5z" stroke="#60A5FA" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M7 8h10" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="3" y1="3" x2="21" y2="21" stroke="#F87171" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    )
    case 'nogluten': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        <path d="M12 2v20" stroke="#FCD34D" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M8 6c1.3.9 2.7 1 4 .5s2.7-.4 4 .5M8 10c1.3.9 2.7 1 4 .5s2.7-.4 4 .5M8 14c1.3.9 2.7 1 4 .5" stroke="#FCD34D" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="3" y1="3" x2="21" y2="21" stroke="#F87171" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    )
    case 'vegan': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        <path d="M21 3C9 3 4 12 4 20" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M4 20c3-7 9-12 17-11C21 13 18 19 4 20z" fill="#34D399" opacity="0.3" stroke="#34D399" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    )
    case 'veggie': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        {/* Carrot */}
        <path d="M12 4c0 0 5 3 5 9s-5 9-5 9-5-3-5-9 5-9 5-9z" fill="#F97316" opacity="0.3" stroke="#F97316" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M10 4c-1-2-2-3-3-2M12 4c0-2 0-3.5 1-4M14 4c1-2 2-3 3-2" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M10 10h4M10 13h4" stroke="#E2724A" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    )
    case 'keto': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        {/* Avocado */}
        <path d="M12 3c4.5 0 7 3.5 7 8 0 5.5-3.5 10-7 11-3.5-1-7-5.5-7-11 0-4.5 2.5-8 7-8z" fill="#84CC16" opacity="0.25" stroke="#84CC16" strokeWidth="1.8"/>
        <circle cx="12" cy="13.5" r="3" fill="#A16207" opacity="0.5" stroke="#A16207" strokeWidth="1.5"/>
      </svg>
    )
    case 'lowcal': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        {/* Scale */}
        <path d="M12 3v18" stroke="#C084FC" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M4 12h16" stroke="#C084FC" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M5 12l-2 5h6l-2-5-2 0zM19 12l-2 5h6l-2-5-2 0z" fill="#C084FC" opacity="0.25" stroke="#C084FC" strokeWidth="1.6" strokeLinejoin="round"/>
        <path d="M6 21h12" stroke="#C084FC" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    )
    // ALLERGENS — distinctive colored icons
    case 'milk': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        <path d="M9 3h6l2 5v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8l2-5z" fill="#E2E8F0" opacity="0.15" stroke="#E2E8F0" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M7 8h10" stroke="#E2E8F0" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M9 14c1.5 1.5 5.5 1.5 7 0" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )
    case 'wheat': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        <path d="M12 2v20" stroke="#FCD34D" strokeWidth="1.8" strokeLinecap="round"/>
        <ellipse cx="8.5" cy="7" rx="3" ry="1.8" fill="#FCD34D" opacity="0.4" stroke="#FCD34D" strokeWidth="1.2" transform="rotate(-30 8.5 7)"/>
        <ellipse cx="15.5" cy="7" rx="3" ry="1.8" fill="#FCD34D" opacity="0.4" stroke="#FCD34D" strokeWidth="1.2" transform="rotate(30 15.5 7)"/>
        <ellipse cx="8" cy="11" rx="3" ry="1.8" fill="#FCD34D" opacity="0.4" stroke="#FCD34D" strokeWidth="1.2" transform="rotate(-30 8 11)"/>
        <ellipse cx="16" cy="11" rx="3" ry="1.8" fill="#FCD34D" opacity="0.4" stroke="#FCD34D" strokeWidth="1.2" transform="rotate(30 16 11)"/>
        <ellipse cx="9" cy="15" rx="2.5" ry="1.6" fill="#FCD34D" opacity="0.4" stroke="#FCD34D" strokeWidth="1.2" transform="rotate(-30 9 15)"/>
        <ellipse cx="15" cy="15" rx="2.5" ry="1.6" fill="#FCD34D" opacity="0.4" stroke="#FCD34D" strokeWidth="1.2" transform="rotate(30 15 15)"/>
      </svg>
    )
    case 'nuts': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        <path d="M12 3c5 0 8 3 8 7 0 5.5-4 10-8 11-4-1-8-5.5-8-11 0-4 3-7 8-7z" fill="#A16207" opacity="0.3" stroke="#A16207" strokeWidth="1.8"/>
        <path d="M12 3v5" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M9 7h6" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    )
    case 'peanut': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        <path d="M9.5 3.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 0 0-7h-5z" fill="#D97706" opacity="0.3" stroke="#D97706" strokeWidth="1.8"/>
        <path d="M9.5 13.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 0 0-7h-5z" fill="#D97706" opacity="0.3" stroke="#D97706" strokeWidth="1.8"/>
        <path d="M10 10.5c.5.5 1 .8 2 .8s1.5-.3 2-.8M10 13.5c.5-.5 1-.8 2-.8s1.5.3 2 .8" stroke="#D97706" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    )
    case 'soy': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        <ellipse cx="9" cy="8" rx="4" ry="6" fill="#84CC16" opacity="0.25" stroke="#84CC16" strokeWidth="1.6" transform="rotate(-15 9 8)"/>
        <ellipse cx="15" cy="8" rx="4" ry="6" fill="#84CC16" opacity="0.25" stroke="#84CC16" strokeWidth="1.6" transform="rotate(15 15 8)"/>
        <ellipse cx="12" cy="16" rx="3.5" ry="5" fill="#84CC16" opacity="0.35" stroke="#84CC16" strokeWidth="1.6"/>
      </svg>
    )
    case 'egg': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        <path d="M12 3C8.5 3 6 8 6 12.5a6 6 0 0 0 12 0C18 8 15.5 3 12 3z" fill="#FEF3C7" opacity="0.3" stroke="#FCD34D" strokeWidth="1.8"/>
        <ellipse cx="12" cy="14" rx="2.5" ry="2" fill="#FDE68A" opacity="0.6" stroke="#F59E0B" strokeWidth="1.2"/>
      </svg>
    )
    case 'fish': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        <path d="M20 12c-3-3.5-7-5-12-3.5L4 12l4 3.5c5 2 9 1 12-3.5z" fill="#60A5FA" opacity="0.3" stroke="#60A5FA" strokeWidth="1.8" strokeLinejoin="round"/>
        <circle cx="17.5" cy="9.5" r="1" fill="#60A5FA"/>
        <path d="M4 12L2 8M4 12l-2 4" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    )
    case 'shell': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        {/* Shrimp */}
        <path d="M16 4c2 1.5 3 4 2 7l-2 3-3 2-2 4" stroke="#F9A8D4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 4c-2 0-4 1-5 3l-2 5 2 4" stroke="#F9A8D4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="16.5" cy="4.5" r="1.5" fill="#F9A8D4" opacity="0.7"/>
        <path d="M11 20l2-2M9 19l3-2" stroke="#F9A8D4" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    )
    // PRIORITIES
    case 'price': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" fill="#34D399" opacity="0.15" stroke="#34D399" strokeWidth="1.8"/>
        <path d="M12 6v1.5M12 16.5V18" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M9.5 9.5c0-1.1.9-2 2.5-2s2.5.9 2.5 2c0 2.5-5 2.5-5 5 0 1.1.9 2 2.5 2s2.5-.9 2.5-2" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    )
    case 'balance': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        <path d="M12 3v18" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M4 7h16" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M5 7L2 13h6l-3-6zM19 7l3 6h-6l3-6z" fill="#A78BFA" opacity="0.25" stroke="#A78BFA" strokeWidth="1.6" strokeLinejoin="round"/>
        <path d="M4 21h16" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    )
    case 'quality': return (
      <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
        <path d="M12 2l2.5 7.5H22l-6.5 4.7 2.5 7.5L12 17l-6 4.7 2.5-7.5L2 9.5h7.5L12 2z" fill="#FCD34D" opacity="0.3" stroke="#FCD34D" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    )
    default: return null
  }
}


export default function ProfileScreen() {
  const navigate = useNavigate()
  const { lang, t } = useI18n()
  const allergenInputRef = useRef(null)
  const { profile, updateProfile: setProfile } = useProfile()
  const { user } = useAuth()
  const [allergenInput, setAllergenInput] = useState('')

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

  const activeCount = profile.dietGoals.length + profile.allergens.length + profile.customAllergens.length + (profile.halal ? 1 : 0)
  const tr = (val) => typeof val === 'object' ? (val[lang] || val.ru) : val

  return (
    <div className="screen" style={{ paddingTop: 0, overflowX: 'hidden' }}>

      {/* ── HERO ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(124,58,237,0.2) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
        paddingTop: 44,
      }}>
        <img src="/logo.png" alt="Körset"
          style={{ width: '60%', margin: '0 auto', display: 'block', objectFit: 'contain',
            filter: 'drop-shadow(0 0 48px rgba(139,92,246,0.95))' }}
        />
        <p style={{ color: 'rgba(180,175,210,0.85)', fontSize: 13, lineHeight: 1.6,
          textAlign: 'center', padding: '4px 24px 18px', margin: 0 }}>
          {t.profile.subtitle}
        </p>
      </div>


      <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* ── AUTH BLOCK ── */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {user ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <KorsetAvatar size={40} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{user.user_metadata?.full_name || 'Körset User'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{user.email || user.phone}</div>
                </div>
              </div>
              <button onClick={() => supabase.auth.signOut()} style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)', padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {lang === 'kz' ? 'Шығу' : 'Выйти'}
              </button>
            </>
          ) : (
            <>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Аккаунт Körset</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{lang === 'kz' ? 'Синхрондау үшін кіріңіз' : 'Войдите для синхронизации'}</div>
              </div>
              <button onClick={() => navigate('/auth')} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {lang === 'kz' ? 'Кіру' : 'Войти'}
              </button>
            </>
          )}
        </div>

        {/* ── LANGUAGE BLOCK ── */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '12px 12px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{t.profile.language}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.profile.languageSub}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setLang('ru')} style={{ padding: '9px 12px', borderRadius: 12, border: `1px solid ${lang === 'ru' ? 'rgba(124,58,237,0.55)' : 'var(--border)'}`, background: lang === 'ru' ? 'rgba(124,58,237,0.12)' : 'var(--surface)', color: lang === 'ru' ? 'var(--primary-bright)' : 'var(--text-sub)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Рус</button>
              <button onClick={() => setLang('kz')} style={{ padding: '9px 12px', borderRadius: 12, border: `1px solid ${lang === 'kz' ? 'rgba(124,58,237,0.55)' : 'var(--border)'}`, background: lang === 'kz' ? 'rgba(124,58,237,0.12)' : 'var(--surface)', color: lang === 'kz' ? 'var(--primary-bright)' : 'var(--text-sub)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Қаз</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── HALAL ── */}
      <div style={{ padding: '20px 20px 8px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 10 }}>
          {t.profile.religion}
        </div>
        <div onClick={() => setProfile(p => ({ ...p, halal: !p.halal }))} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: profile.halal ? 'rgba(124,58,237,0.1)' : 'var(--card)',
          border: `1.5px solid ${profile.halal ? 'var(--primary-mid)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12,
              background: profile.halal ? 'var(--primary-dim)' : 'var(--surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={profile.halal ? 'var(--primary-bright)' : 'var(--text-dim)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.2A8.5 8.5 0 1 1 11.8 3a7 7 0 1 0 9.2 9.2Z"/>
                <path d="M16.5 7.5l.6 1.6 1.7.1-1.3 1 .5 1.7-1.5-.9-1.5.9.5-1.7-1.3-1 1.7-.1.6-1.6Z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t.profile.halalTitle}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>{t.profile.halalSub}</div>
            </div>
          </div>
          <div style={{ width: 46, height: 26, borderRadius: 13,
            background: profile.halal ? 'var(--primary)' : 'var(--border-bright)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            boxShadow: profile.halal ? '0 0 10px var(--primary-glow)' : 'none' }}>
            <span style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%',
              background: 'white', top: 3, left: profile.halal ? 23 : 3,
              transition: 'left 0.2s cubic-bezier(0.34,1.3,0.64,1)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
          </div>
        </div>
      </div>

      {/* ── DIET ── */}
      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>{t.profile.diet}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', opacity: 0.6, marginTop: 3 }}>{t.profile.dietSub}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {DIET_GOALS.map(d => {
            const active = profile.dietGoals.includes(d.id)
            return (
              <button key={d.id} onClick={() => toggleDiet(d.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                borderRadius: 14, border: `1.5px solid ${active ? 'var(--primary-mid)' : 'var(--border)'}`,
                background: active ? 'rgba(124,58,237,0.1)' : 'var(--card)',
                cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: active ? 'var(--primary-dim)' : 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: active ? 'var(--primary-bright)' : 'rgba(200,200,240,1)' }}>
                  <Icon name={d.icon} size={16} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: active ? 'var(--primary-bright)' : 'rgba(210,210,240,0.95)', lineHeight: 1.3 }}>
                  {tr(d.label)}
                </span>
                {active && <div style={{ marginLeft: 'auto', width: 16, height: 16, borderRadius: '50%',
                  background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 10, color: 'white' }}>✓</div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── ALLERGENS ── */}
      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>{t.profile.allergens}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', opacity: 0.6, marginTop: 3 }}>{t.profile.allergensSub}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          {ALLERGENS.map(a => {
            const active = profile.allergens.includes(a.id)
            return (
              <button key={a.id} onClick={() => toggleAllergen(a.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                padding: '12px 6px', borderRadius: 14, position: 'relative',
                border: `1.5px solid ${active ? 'rgba(239,68,68,0.55)' : 'var(--border)'}`,
                background: active ? 'rgba(239,68,68,0.08)' : 'var(--card)',
                cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
              }}>
                <div style={{ width: 34, height: 34, borderRadius: 10,
                  background: active ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: active ? '#F87171' : 'rgba(200,200,240,1)' }}>
                  <Icon name={a.icon} size={17} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, textAlign: 'center', lineHeight: 1.2,
                  color: active ? '#F87171' : 'rgba(200,200,235,0.95)' }}>{tr(a.label)}</span>
                {active && <div style={{ position: 'absolute', top: -5, right: -5,
                  width: 16, height: 16, borderRadius: '50%', background: '#EF4444',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: 'white', fontWeight: 800 }}>✕</div>}
              </button>
            )
          })}
        </div>

        {/* Custom input */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{t.profile.customHint}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input ref={allergenInputRef} value={allergenInput}
              onChange={e => setAllergenInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
              placeholder={t.profile.customPlaceholder}
              style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border-bright)',
                borderRadius: 10, padding: '9px 12px', color: 'var(--text)',
                fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none' }}
            />
            <button onClick={addCustom} style={{ padding: '9px 14px', borderRadius: 10,
              background: 'var(--primary-dim)', border: '1px solid rgba(139,92,246,0.3)',
              color: 'var(--primary-bright)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
              {t.profile.add}
            </button>
          </div>
          {profile.customAllergens.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {profile.customAllergens.map(val => (
                <span key={val} style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20, fontSize: 12,
                  background: 'rgba(239,68,68,0.1)', color: '#F87171',
                  border: '1px solid rgba(239,68,68,0.25)' }}>
                  ⚠️ {val}
                  <span onClick={() => removeCustom(val)} style={{ cursor: 'pointer', opacity: 0.7, fontSize: 15 }}>×</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── PRIORITY ── */}
      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 12 }}>
          {t.profile.priority}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {PRIORITIES.map(p => {
            const active = profile.priority === p.id
            return (
              <button key={p.id} onClick={() => setProfile(prev => ({ ...prev, priority: p.id }))} style={{
                padding: '16px 8px', borderRadius: 16, cursor: 'pointer',
                border: `1.5px solid ${active ? 'var(--primary-mid)' : 'var(--border)'}`,
                background: active ? 'rgba(124,58,237,0.1)' : 'var(--card)',
                fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                boxShadow: active ? '0 0 18px rgba(124,58,237,0.12)' : 'none',
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 14,
                  background: active ? 'var(--primary-dim)' : 'rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: active ? 'var(--primary-bright)' : 'rgba(210,210,245,1)',
                  transition: 'all 0.15s' }}>
                  <Icon name={p.icon} size={22} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                    color: active ? 'var(--primary-bright)' : 'rgba(230,230,255,1)' }}>{tr(p.label)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.3 }}>{tr(p.desc)}</div>
                </div>
                {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── SUMMARY ── */}
      {activeCount > 0 && (
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)' }}>{t.profile.activeFilters || (lang === 'kz' ? 'Белсенді сүзгілер:' : 'Активных фильтров:')} {activeCount}</span>
              <button onClick={() => setProfile({ halal: false, dietGoals: [], allergens: [], customAllergens: [], priority: 'balanced' })}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                {t.profile.reset || (lang === 'kz' ? 'Тазалау' : 'Сбросить')}
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {profile.halal && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'var(--primary-dim)', color: 'var(--primary-bright)', border: '1px solid rgba(139,92,246,0.2)' }}>{t.profile.halalLabel}</span>}
              {profile.dietGoals.map(id => {
                const d = DIET_GOALS.find(x => x.id === id)
                return <span key={id} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'var(--primary-dim)', color: 'var(--primary-bright)', border: '1px solid rgba(139,92,246,0.2)' }}>{d ? tr(d.label) : ''}</span>
              })}
              {profile.allergens.map(id => {
                const a = ALLERGENS.find(x => x.id === id)
                return <span key={id} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>{a ? tr(a.label) : ''}</span>
              })}
              {profile.customAllergens.map(val => (
                <span key={val} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>{val}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CTA ── */}
      <div style={{ padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-primary btn-full" onClick={() => navigate('/catalog')}
          style={{ justifyContent: 'center', gap: 12 }}>
          <span>{t.profile.showFit}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
        <button className="btn btn-secondary btn-full" onClick={() => navigate('/scan')}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/>
            <rect x="3" y="16" width="5" height="5" rx="1"/>
            <path d="M16 16h5v5M16 16v5M3 12h4M10 3v4M12 10h7M10 16v5"/>
          </svg>
          {t.profile.scanBarcode}
        </button>
        <button onClick={() => { localStorage.removeItem('korset_onboarding_done'); window.location.reload() }} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-dim)', padding: '12px', borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
          {lang === 'kz' ? 'Нұсқаулықты қайта көру (Оқыту)' : 'Повторить обучение (Онбординг)'}
        </button>
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <span onClick={() => navigate('/qr-print')} style={{ fontSize: 11, color: 'var(--text-dim)', opacity: 0.2, cursor: 'pointer' }}>v1.0</span>
        </div>
      </div>
    </div>
  )
}
