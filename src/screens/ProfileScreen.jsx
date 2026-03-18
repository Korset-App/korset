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
    <div className="screen" style={{ paddingTop: 0, paddingBottom: 100, overflowX: 'hidden', minHeight: '100vh', background: '#0F0F13' }}>
      
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '50px 24px 20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: 40, height: 40, borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{t.nav.profile}</div>
        <button onClick={() => navigate('/setup-profile')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: 40, height: 40, borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
      </div>

      {/* ── USER INFO ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 24px 24px' }}>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          {user ? (
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED, #EC4899)', padding: 3 }}>
              <KorsetAvatar size={94} style={{ border: '4px solid #0F0F13' }} />
            </div>
          ) : (
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.2)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
          )}
        </div>
        
        {user ? (
          <>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 4, fontFamily: 'var(--font-display)' }}>
              {user.user_metadata?.full_name || 'Körset User'}
            </h2>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{user.email || user.phone || 'Member'}</div>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{t.profile.guest}</h2>
            <button onClick={() => navigate('/auth')} style={{ marginTop: 10, background: 'none', border: 'none', color: '#7C3AED', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {t.profile.login}
            </button>
          </>
        )}
      </div>

      {/* ── STATS ROW (NO HEALTH) ── */}
      <div style={{ display: 'flex', gap: 12, padding: '0 24px 24px' }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '16px 12px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)' }}>0</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{t.profile.scans}</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '16px 12px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)' }}>0</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{t.profile.favorites}</div>
        </div>
      </div>

      {/* ── MY DIET ── */}
      <div style={{ padding: '0 24px 24px' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 16 }}>{t.profile.diet}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          
          <div onClick={() => setProfile(p => ({ ...p, halal: !p.halal }))} style={{ background: profile.halal ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${profile.halal ? '#7C3AED' : 'rgba(255,255,255,0.05)'}`, borderRadius: 20, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: profile.halal ? '#7C3AED' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>🌙</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: profile.halal ? '#fff' : 'rgba(255,255,255,0.5)' }}>{t.profile.halalLabel}</div>
          </div>

          {DIET_GOALS.map(d => {
            const active = profile.dietGoals.includes(d.id);
            return (
              <div key={d.id} onClick={() => toggleDiet(d.id)} style={{ background: active ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? '#7C3AED' : 'rgba(255,255,255,0.05)'}`, borderRadius: 20, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: active ? '#7C3AED' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Icon name={d.icon} size={20} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#fff' : 'rgba(255,255,255,0.5)' }}>{tr(d.label)}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── ALLERGENS ── */}
      <div style={{ padding: '0 24px 24px' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 16 }}>{t.profile.allergens}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          {ALLERGENS.map(a => {
            const active = profile.allergens.includes(a.id)
            return (
              <div key={a.id} onClick={() => toggleAllergen(a.id)} style={{ background: active ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? '#EF4444' : 'rgba(255,255,255,0.05)'}`, borderRadius: 16, padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: active ? '#EF4444' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                  <Icon name={a.icon} size={18} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: active ? '#fff' : 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.2 }}>{tr(a.label)}</div>
              </div>
            )
          })}
        </div>

        {/* Custom Input */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '16px', backdropFilter: 'blur(10px)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>{t.profile.customHint}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input ref={allergenInputRef} value={allergenInput}
              onChange={e => setAllergenInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
              placeholder={t.profile.customPlaceholder}
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px', color: '#fff', fontSize: 13, outline: 'none' }}
            />
            <button onClick={addCustom} style={{ padding: '10px 16px', borderRadius: 12, background: '#7C3AED', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t.profile.add}
            </button>
          </div>
          {profile.customAllergens.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              {profile.customAllergens.map(val => (
                <span key={val} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)', fontSize: 12, fontWeight: 600 }}>
                  ⚠️ {val}
                  <span onClick={() => removeCustom(val)} style={{ cursor: 'pointer', fontSize: 16, marginLeft: 4, lineHeight: 1 }}>×</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── PRIORITY ── */}
      <div style={{ padding: '0 24px 24px' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 16 }}>{t.profile.priority}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {PRIORITIES.map(p => {
            const active = profile.priority === p.id
            return (
              <div key={p.id} onClick={() => setProfile(prev => ({ ...prev, priority: p.id }))} style={{ background: active ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? '#7C3AED' : 'rgba(255,255,255,0.05)'}`, borderRadius: 20, padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: active ? '#7C3AED' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                  <Icon name={p.icon} size={22} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: active ? '#fff' : 'rgba(255,255,255,0.7)' }}>{tr(p.label)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.2 }}>{tr(p.desc)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── SETTINGS MENU ── */}
      <div style={{ padding: '0 24px 40px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: '8px 0', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{t.profile.languageHeader}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setLang('ru')} style={{ background: lang === 'ru' ? '#7C3AED' : 'transparent', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>RU</button>
              <button onClick={() => setLang('kz')} style={{ background: lang === 'kz' ? '#7C3AED' : 'transparent', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>KZ</button>
            </div>
          </div>
          
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 20px' }} />

          <div onClick={() => navigate('/setup-profile')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{t.profile.editProfile}</div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 20px' }} />
          
          <div onClick={() => { localStorage.removeItem('korset_onboarding_done'); window.location.reload() }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{t.profile.restartOnboarding}</div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>

          {user && (
            <>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 20px' }} />
              <div onClick={() => supabase.auth.signOut()} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#F87171' }}>{t.profile.logout}</div>
              </div>
            </>
          )}

        </div>
      </div>

    </div>
  )
}
