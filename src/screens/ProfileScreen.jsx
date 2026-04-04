import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { setLang, useI18n } from '../utils/i18n.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { useUserData } from '../contexts/UserDataContext.jsx'
import { buildHistoryPath } from '../utils/routes.js'
import { supabase } from '../utils/supabase.js'
import { ALLERGENS } from '../data/allergens.js'
import { DIET_GOALS } from '../data/dietGoals.js'

function PrefIcon({ type, size = 18, active = false }) {
  const color = active ? '#fff' : '#C4B5FD'
  const fill = active ? 'rgba(124,58,237,0.22)' : 'rgba(124,58,237,0.10)'
  const stroke = color
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' }

  const icons = {
    diet: (
      <svg {...common}>
        <path d="M19 5c-6 0-11 4.5-11 11v3" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 19c2.4-5.7 6.8-9.8 13-10-1 3.6-3.7 9.4-13 10Z" stroke={stroke} strokeWidth="1.8" fill={fill} />
      </svg>
    ),
    halal: (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" stroke={stroke} strokeWidth="1.8" fill={fill} />
        <path d="M8.5 12.2l2.2 2.2 4.8-5.1" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    gluten: (
      <svg {...common}>
        <path d="M12 3v18" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 8c1 .7 2 1 3 .5M15 8c-1 .7-2 1-3 .5M9 12c1 .7 2 1 3 .5M15 12c-1 .7-2 1-3 .5" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M4 4l16 16" stroke="#F87171" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    sugar: (
      <svg {...common}>
        <rect x="6" y="8" width="12" height="10" rx="2" stroke={stroke} strokeWidth="1.8" fill={fill} />
        <path d="M8 8V6a4 4 0 018 0v2" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 4l16 16" stroke="#F87171" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    dairy: (
      <svg {...common}>
        <path d="M9 3h6l2 5v12H7V8l2-5Z" stroke={stroke} strokeWidth="1.8" fill={fill} />
        <path d="M4 4l16 16" stroke="#F87171" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    nuts: (
      <svg {...common}>
        <path d="M12 4c3.8 0 6.3 2.6 6.3 6.1 0 4.4-3.1 8.1-6.3 8.9-3.1-.8-6.3-4.5-6.3-8.9C5.7 6.6 8.2 4 12 4Z" stroke={stroke} strokeWidth="1.8" fill={fill} />
        <path d="M4 4l16 16" stroke="#F87171" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    fish: (
      <svg {...common}>
        <path d="M20 12c-3-3.2-7-4.6-12-3.3L4 12l4 3.3c5 1.5 9 .1 12-3.3Z" stroke={stroke} strokeWidth="1.8" fill={fill} />
        <path d="M4 4l16 16" stroke="#F87171" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    egg: (
      <svg {...common}>
        <path d="M12 3C8.8 3 6.5 8 6.5 12.3a5.5 5.5 0 1011 0C17.5 8 15.2 3 12 3Z" stroke={stroke} strokeWidth="1.8" fill={fill} />
        <path d="M4 4l16 16" stroke="#F87171" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    shellfish: (
      <svg {...common}>
        <path d="M8 15c0-4 3.2-7 7-7 0 4-3.2 7-7 7Z" stroke={stroke} strokeWidth="1.8" fill={fill} />
        <path d="M7 16c1.2 1.6 2.8 2.5 5 2.8" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
        <path d="M4 4l16 16" stroke="#F87171" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    sesame: (
      <svg {...common}>
        <ellipse cx="8.2" cy="12" rx="2.1" ry="3.3" transform="rotate(-18 8.2 12)" stroke={stroke} strokeWidth="1.6" fill={fill} />
        <ellipse cx="15.8" cy="12" rx="2.1" ry="3.3" transform="rotate(18 15.8 12)" stroke={stroke} strokeWidth="1.6" fill={fill} />
        <path d="M4 4l16 16" stroke="#F87171" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    custom: (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="12" r="8" stroke={stroke} strokeWidth="1.8" fill={fill} />
      </svg>
    ),
    balanced: (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" stroke={stroke} strokeWidth="1.8" fill={fill} />
        <path d="M12 8v4l2.5 2.5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  }
  return icons[type] || icons.balanced
}

function getAvatarUrl(userMetadata) {
  if (!userMetadata) return null
  const value = userMetadata.avatar_url || userMetadata.picture || userMetadata.avatar_id || null
  if (!value) return null
  if (value.startsWith('http')) return value
  const preset = {
    av1: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arman&backgroundColor=7C3AED&clotheColor=3B82F6',
    av2: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aisha&backgroundColor=EC4899&clotheColor=EC4899',
    av3: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Daulet&backgroundColor=34D399&clotheColor=10B981',
    av4: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Madina&backgroundColor=F59E0B&clotheColor=F97316',
    av5: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Timur&backgroundColor=8B5CF6&clotheColor=6366F1',
    av6: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dana&backgroundColor=06B6D4&clotheColor=0EA5E9',
    av7: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sultan&backgroundColor=EF4444&clotheColor=DC2626',
    av8: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aliya&backgroundColor=A78BFA&clotheColor=7C3AED',
    av9: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Neo&backgroundColor=111827&clotheColor=7C3AED'
  }
  return preset[value] || null
}

function Pill({ active, onClick, icon, children, tone = 'violet' }) {
  const palette = {
    violet: { activeBg: 'rgba(124,58,237,0.18)', activeBorder: 'rgba(124,58,237,0.34)', activeText: '#F5F3FF' },
    red: { activeBg: 'rgba(239,68,68,0.16)', activeBorder: 'rgba(239,68,68,0.32)', activeText: '#FEE2E2' },
  }[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        borderRadius: 16,
        border: `1px solid ${active ? palette.activeBorder : 'rgba(255,255,255,0.08)'}`,
        background: active ? palette.activeBg : 'rgba(255,255,255,0.03)',
        color: active ? palette.activeText : 'rgba(255,255,255,0.68)',
        cursor: 'pointer',
        fontSize: 12.5,
        fontWeight: 600,
        lineHeight: 1,
        transition: 'all .18s ease',
      }}
    >
      <span style={{ display: 'inline-flex', width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <span>{children}</span>
    </button>
  )
}

export default function ProfileScreen() {
  const navigate = useNavigate()
  const { currentStore } = useStore()
  const { lang, t } = useI18n()
  const allergenInputRef = useRef(null)
  const { profile, updateProfile } = useProfile()
  const { user } = useAuth()
  const { favoritesCount, scanCount } = useUserData()

  const [allergenInput, setAllergenInput] = useState('')
  const [prefOpen, setPrefOpen] = useState(false)

  const toggleDiet = (id) => {
    const next = profile.dietGoals.includes(id)
      ? profile.dietGoals.filter((x) => x !== id)
      : [...profile.dietGoals, id]
    updateProfile({ dietGoals: next })
  }

  const toggleAllergen = (id) => {
    const next = profile.allergens.includes(id)
      ? profile.allergens.filter((x) => x !== id)
      : [...profile.allergens, id]
    updateProfile({ allergens: next })
  }

  const toggleHalal = () => updateProfile({ halal: !profile.halal })

  const addCustom = () => {
    const val = allergenInput.trim()
    if (!val || profile.customAllergens.includes(val)) return
    updateProfile({ customAllergens: [...profile.customAllergens, val] })
    setAllergenInput('')
  }

  const removeCustom = (val) => updateProfile({ customAllergens: profile.customAllergens.filter((x) => x !== val) })

  const dietCount = profile.dietGoals.length + (profile.halal ? 1 : 0)
  const allergenCount = profile.allergens.length + profile.customAllergens.length
  const totalPref = dietCount + allergenCount
  const tr = (val) => (typeof val === 'object' ? (val[lang] || val.ru) : val)
  const avatarUrl = getAvatarUrl(user?.user_metadata)
  const fontAdvent = "'Advent Pro', sans-serif"

  return (
    <>
      <style>{`
        .glass-card {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(26px);
          -webkit-backdrop-filter: blur(26px);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 24px;
        }
        .settings-item { transition: background 0.15s; }
        .settings-item:active { background: rgba(255,255,255,0.03); }
      `}</style>

      <div className="screen" style={{ paddingTop: 0, paddingBottom: 100, minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ padding: '16px 22px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontFamily: fontAdvent, fontSize: 24, fontWeight: 600, color: '#fff', margin: 0, lineHeight: '24px', display: 'flex', alignItems: 'center' }}>
              {lang === 'kz' ? 'Профиль' : 'Профиль'}
            </h1>
            <button
              onClick={() => navigate('/setup-profile')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 36,
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.2)',
                padding: '0 14px',
                borderRadius: 12,
                color: '#C4B5FD',
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1,
                cursor: 'pointer'
              }}
            >
              {lang === 'kz' ? 'Өзгерту' : 'Изменить'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 22px 16px' }}>
          <div style={{ width: 120, height: 120, borderRadius: '50%', border: '3px solid #7C3AED', padding: 4, marginBottom: 14, boxSizing: 'border-box', boxShadow: '0 0 32px rgba(124,58,237,0.18)' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 38, color: '#fff', fontFamily: fontAdvent, fontWeight: 700 }}>
                  {user?.user_metadata?.full_name ? user.user_metadata.full_name.charAt(0).toUpperCase() : 'K'}
                </span>
              </div>
            )}
          </div>

          {user ? (
            <>
              <h2 style={{ fontFamily: fontAdvent, fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
                {user.user_metadata?.full_name || 'Körset User'}
              </h2>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.34)', fontFamily: fontAdvent }}>{user.email || ''}</div>
            </>
          ) : (
            <button onClick={() => navigate('/auth')} style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 13, fontFamily: fontAdvent, fontWeight: 500, padding: '10px 28px', borderRadius: 12, cursor: 'pointer' }}>
              {lang === 'kz' ? 'Аккаунтқа кіру' : 'Войти в аккаунт'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '14px 20px 18px' }}>
          <div onClick={() => navigate(buildHistoryPath(currentStore?.slug || null, 'favorites'))} style={{ flex: 1, position: 'relative', paddingTop: 28, cursor: 'pointer' }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 2, width: 56, height: 56, borderRadius: '50%', background: 'rgba(220,38,38,0.25)', border: '2px solid rgba(220,38,38,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(220,38,38,0.25)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#F87171" stroke="#F87171" strokeWidth="1"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78Z"/></svg>
            </div>
            <div className="glass-card" style={{ padding: '44px 8px 16px', textAlign: 'center', minHeight: 110 }}>
              <div style={{ fontFamily: fontAdvent, fontSize: 42, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{favoritesCount}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.44)', marginTop: 10, fontFamily: fontAdvent, fontWeight: 600 }}>{t.profile.favorites}</div>
            </div>
          </div>

          <div onClick={() => setPrefOpen((v) => !v)} style={{ flex: 1, position: 'relative', paddingTop: 28, cursor: 'pointer' }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 2, width: 56, height: 56, borderRadius: '50%', background: 'rgba(124,58,237,0.25)', border: '2px solid rgba(124,58,237,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(124,58,237,0.25)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C4B5FD" strokeWidth="2" strokeLinecap="round"><path d="M6 7h12M4 12h16M7 17h10"/></svg>
            </div>
            <div className="glass-card" style={{ padding: '44px 8px 16px', textAlign: 'center', minHeight: 110, border: prefOpen ? '1px solid rgba(124,58,237,0.34)' : undefined }}>
              <div style={{ fontFamily: fontAdvent, fontSize: 42, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{totalPref}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.44)', marginTop: 10, fontFamily: fontAdvent, fontWeight: 600 }}>{lang === 'kz' ? 'Баптау' : 'Предпочтения'}</div>
            </div>
          </div>

          <div onClick={() => navigate(buildHistoryPath(currentStore?.slug || null, 'history'))} style={{ flex: 1, position: 'relative', paddingTop: 28, cursor: 'pointer' }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 2, width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.25)', border: '2px solid rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(16,185,129,0.25)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round"><path d="M4 8V6a2 2 0 012-2h2"/><path d="M16 4h2a2 2 0 012 2v2"/><path d="M20 16v2a2 2 0 01-2 2h-2"/><path d="M8 20H6a2 2 0 01-2-2v-2"/><line x1="5" y1="12" x2="19" y2="12" strokeWidth="2.5"/></svg>
            </div>
            <div className="glass-card" style={{ padding: '44px 8px 16px', textAlign: 'center', minHeight: 110 }}>
              <div style={{ fontFamily: fontAdvent, fontSize: 42, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{scanCount}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.44)', marginTop: 10, fontFamily: fontAdvent, fontWeight: 600 }}>{t.profile.scans}</div>
            </div>
          </div>
        </div>

        {prefOpen && (
          <div style={{ padding: '0 20px 16px' }}>
            <div className="glass-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{lang === 'kz' ? 'Сіздің баптауларыңыз' : 'Ваши предпочтения'}</div>
                <button type="button" onClick={() => navigate('/setup-profile')} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#C4B5FD', borderRadius: 12, padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
                  {lang === 'kz' ? 'Өңдеу' : 'Изменить'}
                </button>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.34)', marginBottom: 10 }}>{lang === 'kz' ? 'Диета' : 'Диета'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <Pill active={profile.halal} onClick={toggleHalal} icon={<PrefIcon type="halal" active={profile.halal} />}>
                    Халал
                  </Pill>
                  {DIET_GOALS.map((goal) => (
                    <Pill key={goal.id} active={profile.dietGoals.includes(goal.id)} onClick={() => toggleDiet(goal.id)} icon={<PrefIcon type={goal.id === 'vegan' || goal.id === 'vegetarian' ? 'diet' : 'balanced'} active={profile.dietGoals.includes(goal.id)} />}>
                      {tr(goal.label)}
                    </Pill>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.34)', marginBottom: 10 }}>{lang === 'kz' ? 'Аллергендер мен алып тастау' : 'Аллергии и исключения'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {ALLERGENS.map((al) => {
                    const idMap = {
                      gluten: 'gluten',
                      lactose: 'dairy',
                      nuts: 'nuts',
                      fish: 'fish',
                      egg: 'egg',
                      shellfish: 'shellfish',
                      sesame: 'sesame',
                      sugar: 'sugar'
                    }
                    const active = profile.allergens.includes(al.id)
                    return (
                      <Pill key={al.id} active={active} onClick={() => toggleAllergen(al.id)} icon={<PrefIcon type={idMap[al.id] || 'custom'} active={active} />} tone="red">
                        {tr(al.label)}
                      </Pill>
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
                    style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '11px 14px', color: '#fff', fontSize: 13, outline: 'none' }}
                  />
                  <button onClick={addCustom} style={{ padding: '0 14px', borderRadius: 14, background: '#7C3AED', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{t.profile.add}</button>
                </div>

                {profile.customAllergens.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {profile.customAllergens.map((val) => (
                      <Pill key={val} active={true} onClick={() => removeCustom(val)} icon={<PrefIcon type="custom" active={true} />} tone="red">
                        {val}
                      </Pill>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: '0 22px 14px' }}>
          {[{
            title: lang === 'kz' ? 'Негізгі' : 'Основное',
            items: [
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label: lang === 'kz' ? 'Жеке деректер' : 'Личные данные', onClick: () => navigate('/setup-profile') },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>, label: lang === 'kz' ? 'Хабарландырулар' : 'Уведомления' },
            ]
          }].map((group, gi) => (
            <div key={gi}>
              <div style={{ fontFamily: fontAdvent, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.5, paddingLeft: 4 }}>{group.title}</div>
              <div className="glass-card" style={{ padding: 0 }}>
                {group.items.map((item, i) => (
                  <div key={i}>
                    <div className="settings-item" onClick={item.onClick || undefined} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', cursor: item.onClick ? 'pointer' : 'default' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
                        <span style={{ fontFamily: fontAdvent, fontSize: 14, fontWeight: 500, color: '#fff' }}>{item.label}</span>
                      </div>
                      {item.onClick && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>}
                    </div>
                    {i < group.items.length - 1 && <div style={{ height: 1, background: 'rgba(255,255,255,0.03)', margin: '0 18px' }} />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '0 22px 14px' }}>
          <div className="glass-card" style={{ padding: 0 }}>
            <div className="settings-item" onClick={() => { localStorage.removeItem('korset_onboarding_done'); window.location.reload() }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              </div>
              <span style={{ fontFamily: fontAdvent, fontSize: 14, fontWeight: 500, color: '#fff' }}>{t.profile.restartOnboarding}</span>
            </div>
            {user && (
              <>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.03)', margin: '0 18px' }} />
                <div className="settings-item" onClick={() => supabase.auth.signOut()} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  </div>
                  <span style={{ fontFamily: fontAdvent, fontSize: 14, fontWeight: 500, color: '#F87171' }}>{t.profile.logout}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
