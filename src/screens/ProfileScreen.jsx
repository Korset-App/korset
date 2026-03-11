import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadProfile, saveProfile } from '../utils/profile.js'

const DIET_GOALS = [
  { id: 'sugar_free',  label: 'Без сахара',    icon: 'nosugar'  },
  { id: 'dairy_free',  label: 'Без молочки',   icon: 'nodairy'  },
  { id: 'gluten_free', label: 'Без глютена',   icon: 'nogluten' },
  { id: 'vegan',       label: 'Веган',         icon: 'vegan'    },
  { id: 'vegetarian',  label: 'Вегетарианец',  icon: 'veggie'   },
  { id: 'keto',        label: 'Кето',          icon: 'keto'     },
  { id: 'low_calorie', label: 'Меньше калорий',icon: 'lowcal'   },
]

const ALLERGENS = [
  { id: 'milk',      label: 'Молоко',   icon: 'milk'     },
  { id: 'gluten',    label: 'Глютен',   icon: 'wheat'    },
  { id: 'nuts',      label: 'Орехи',    icon: 'nuts'     },
  { id: 'peanuts',   label: 'Арахис',   icon: 'peanut'   },
  { id: 'soy',       label: 'Соя',      icon: 'soy'      },
  { id: 'eggs',      label: 'Яйца',     icon: 'egg'      },
  { id: 'fish',      label: 'Рыба',     icon: 'fish'     },
  { id: 'shellfish', label: 'Моллюски', icon: 'shell'    },
]

const PRIORITIES = [
  { id: 'price',    label: 'Цена',     desc: 'Самый дешёвый',   icon: 'price'   },
  { id: 'balanced', label: 'Баланс',   desc: 'Цена + качество', icon: 'balance' },
  { id: 'quality',  label: 'Качество', desc: 'Лучший состав',   icon: 'quality' },
]

// All custom SVG icons — no emoji
function Icon({ name, size = 20, color = 'currentColor' }) {
  const s = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    // DIET — clear, recognizable
    case 'nosugar': return (
      // Sugar cube with X through it
      <svg {...s}><rect x="5" y="8" width="14" height="10" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><line x1="4" y1="4" x2="20" y2="20" strokeWidth="2.2"/></svg>
    )
    case 'nodairy': return (
      // Milk carton crossed out
      <svg {...s}><path d="M9 3h6l2 4v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7l2-4z"/><path d="M9 7h6"/><line x1="4" y1="4" x2="20" y2="20" strokeWidth="2.2"/></svg>
    )
    case 'nogluten': return (
      // Wheat stalk crossed out
      <svg {...s}><path d="M12 3v18"/><path d="M8 7c1 .8 2.5 1 4 .5s3-.3 4 .5M8 11c1 .8 2.5 1 4 .5s3-.3 4 .5M8 15c1 .8 2.5 1 4 .5"/><line x1="4" y1="4" x2="20" y2="20" strokeWidth="2.2"/></svg>
    )
    case 'vegan': return (
      // Leaf — clear vegan symbol
      <svg {...s}><path d="M21 3C9 3 4 12 4 19"/><path d="M4 19c3-6 8-10 17-10C21 12 19 18 4 19z"/></svg>
    )
    case 'veggie': return (
      // Carrot
      <svg {...s}><path d="M12 2c0 0-2 4-2 8s2 8 2 8"/><path d="M12 2c0 0 2 4 2 8s-2 8-2 8"/><path d="M5 9l7-7 7 7"/><path d="M12 2v4"/></svg>
    )
    case 'keto': return (
      // Fat droplet / avocado shape — keto = high fat
      <svg {...s}><path d="M12 3c4.4 0 7 3 7 7 0 5-3.5 9-7 11-3.5-2-7-6-7-11 0-4 2.6-7 7-7z"/><circle cx="12" cy="13" r="2.5"/></svg>
    )
    case 'lowcal': return (
      // Scale / weight
      <svg {...s}><path d="M12 3v2M5 9h14l-1.5 9a2 2 0 0 1-2 1.5h-7a2 2 0 0 1-2-1.5L5 9z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/></svg>
    )
    // ALLERGENS — distinct, clear icons
    case 'milk': return (
      <svg {...s}><path d="M9 3h6l2 4v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7l2-4z"/><path d="M9 7h6"/><path d="M8 14c1.5 2 6.5 2 8 0"/></svg>
    )
    case 'wheat': return (
      <svg {...s}><path d="M12 3v18"/><path d="M8 7c1 .8 2.5 1 4 .5s3-.3 4 .5M8 11c1 .8 2.5 1 4 .5s3-.3 4 .5M8 15c1 .8 2.5 1 4 .5"/></svg>
    )
    case 'nuts': return (
      // Walnut shape
      <svg {...s}><path d="M12 4c5 0 8 3 8 6 0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11 0-3 3-6 8-6z"/><path d="M12 4v4M9 7h6"/></svg>
    )
    case 'peanut': return (
      // Two bumps = peanut shape
      <svg {...s}><path d="M9.5 4a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 0 0-7h-5z"/><path d="M9.5 11a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 0 0-7h-5z"/><line x1="12" y1="11" x2="12" y2="11" strokeWidth="3"/></svg>
    )
    case 'soy': return (
      // Three beans / pods
      <svg {...s}><ellipse cx="8" cy="8" rx="3" ry="5" transform="rotate(-20 8 8)"/><ellipse cx="16" cy="8" rx="3" ry="5" transform="rotate(20 16 8)"/><ellipse cx="12" cy="16" rx="3" ry="5"/><path d="M8 13c2 1 6 1 8 0"/></svg>
    )
    case 'egg': return (
      <svg {...s}><path d="M12 3C8.5 3 6 8 6 12.5a6 6 0 0 0 12 0C18 8 15.5 3 12 3z"/></svg>
    )
    case 'fish': return (
      <svg {...s}><path d="M20 12c-4-4-8-5-13-3L4 12l3 3c5 2 9 1 13-3z"/><path d="M4 12l3-3"/><circle cx="17" cy="9" r="1" fill={color} stroke="none"/><path d="M21 7l1 5-1 5"/></svg>
    )
    case 'shell': return (
      // Shrimp / prawn shape
      <svg {...s}><path d="M14 4c3 1 5 4 5 7a7 7 0 0 1-12 4.9"/><path d="M7 16c-2-1.5-3-3.5-3-5.5a7 7 0 0 1 10-6.3"/><path d="M10 20l2-3-1-3 3-1 1-3"/></svg>
    )
    // PRIORITIES
    case 'price': return (
      <svg {...s}><circle cx="12" cy="12" r="9"/><path d="M12 6v2"/><path d="M12 16v2"/><path d="M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5c0 2.5-6 2.5-6 5 0 1.4 1.3 2.5 3 2.5s3-1.1 3-2.5"/></svg>
    )
    case 'balance': return (
      <svg {...s}><path d="M12 3v18"/><path d="M4 6h16"/><path d="M5 6L2 12h6L5 6z"/><path d="M19 6l3 6h-6l3-6z"/><path d="M5 20h14"/></svg>
    )
    case 'quality': return (
      <svg {...s}><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/></svg>
    )
    default: return null
  }
}

export default function ProfileScreen() {
  const navigate = useNavigate()
  const allergenInputRef = useRef(null)
  const [profile, setProfile] = useState(() => {
    const s = loadProfile()
    return {
      halal: s.halal || false,
      dietGoals: s.dietGoals || [],
      allergens: s.allergens || [],
      customAllergens: s.customAllergens || [],
      priority: s.priority || 'balanced',
    }
  })
  const [allergenInput, setAllergenInput] = useState('')

  useEffect(() => { saveProfile({ ...profile, presetId: 'custom' }) }, [profile])

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

  return (
    <div className="screen" style={{ paddingTop: 0, overflowX: 'hidden' }}>

      {/* ── HERO ── */}
      <div style={{
        padding: '52px 24px 24px',
        background: 'linear-gradient(160deg, rgba(124,58,237,0.15) 0%, transparent 65%)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <div style={{
            position: 'absolute', inset: -40,
            background: 'radial-gradient(circle, rgba(124,58,237,0.28) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}/>
          <img src="/logo.png" alt="Körset"
            style={{ height: 110, width: 110, objectFit: 'contain', position: 'relative',
              filter: 'drop-shadow(0 0 28px rgba(139,92,246,0.75))' }}
          />
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.7, textAlign: 'center', maxWidth: 260, marginTop: 4 }}>
          Настройте профиль — AI мгновенно покажет подходит ли товар вам
        </p>
      </div>

      {/* ── HALAL ── */}
      <div style={{ padding: '20px 20px 8px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 10 }}>
          Религиозные требования
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
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Только Халал</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>Исключит товары без маркировки</div>
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
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Диета и предпочтения</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', opacity: 0.6, marginTop: 3 }}>Нажмите всё что подходит</div>
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
                  {d.label}
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
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Мои аллергены</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', opacity: 0.6, marginTop: 3 }}>Товары с этим составом будут помечены ⚠️</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
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
                  color: active ? '#F87171' : 'rgba(200,200,235,0.95)' }}>{a.label}</span>
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
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Не нашли? Введите вручную</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input ref={allergenInputRef} value={allergenInput}
              onChange={e => setAllergenInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
              placeholder="Клубника, кунжут..."
              style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border-bright)',
                borderRadius: 10, padding: '9px 12px', color: 'var(--text)',
                fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none' }}
            />
            <button onClick={addCustom} style={{ padding: '9px 14px', borderRadius: 10,
              background: 'var(--primary-dim)', border: '1px solid rgba(139,92,246,0.3)',
              color: 'var(--primary-bright)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
              + Добавить
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
          Приоритет выбора
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
                    color: active ? 'var(--primary-bright)' : 'rgba(230,230,255,1)' }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.3 }}>{p.desc}</div>
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
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)' }}>Активных фильтров: {activeCount}</span>
              <button onClick={() => setProfile({ halal: false, dietGoals: [], allergens: [], customAllergens: [], priority: 'balanced' })}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Сбросить
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {profile.halal && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'var(--primary-dim)', color: 'var(--primary-bright)', border: '1px solid rgba(139,92,246,0.2)' }}>Халал</span>}
              {profile.dietGoals.map(id => {
                const d = DIET_GOALS.find(x => x.id === id)
                return <span key={id} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'var(--primary-dim)', color: 'var(--primary-bright)', border: '1px solid rgba(139,92,246,0.2)' }}>{d?.label}</span>
              })}
              {profile.allergens.map(id => {
                const a = ALLERGENS.find(x => x.id === id)
                return <span key={id} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>{a?.label}</span>
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
          <span>Показать подходящие товары</span>
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
          Сканировать QR-код
        </button>
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <span onClick={() => navigate('/qr-print')} style={{ fontSize: 11, color: 'var(--text-dim)', opacity: 0.2, cursor: 'pointer' }}>v1.0</span>
        </div>
      </div>
    </div>
  )
}
