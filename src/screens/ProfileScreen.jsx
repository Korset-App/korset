import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadProfile, saveProfile } from '../utils/profile.js'

const DIET_GOALS = [
  { id: 'sugar_free', label: 'Без сахара', icon: 'nosugar' },
  { id: 'dairy_free', label: 'Без молочки', icon: 'nodairy' },
  { id: 'gluten_free', label: 'Без глютена', icon: 'nogluten' },
  { id: 'vegan', label: 'Веган', icon: 'leaf' },
  { id: 'vegetarian', label: 'Вегетарианец', icon: 'leaf2' },
  { id: 'keto', label: 'Кето', icon: 'bolt' },
  { id: 'low_calorie', label: 'Меньше калорий', icon: 'scale' },
]
const ALLERGENS = [
  { id: 'milk', label: 'Молоко' },
  { id: 'gluten', label: 'Глютен' },
  { id: 'nuts', label: 'Орехи' },
  { id: 'peanuts', label: 'Арахис' },
  { id: 'soy', label: 'Соя' },
  { id: 'eggs', label: 'Яйца' },
  { id: 'fish', label: 'Рыба' },
  { id: 'shellfish', label: 'Моллюски' },
]
const PRIORITIES = [
  { id: 'price', label: 'Цена', icon: 'tag', desc: 'Самый дешёвый' },
  { id: 'balanced', label: 'Баланс', icon: 'sliders', desc: 'Цена + качество' },
  { id: 'quality', label: 'Качество', icon: 'star', desc: 'Лучший состав' },
]

function MiniIcon({ name }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'nosugar':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 16c2-2 6-6 8-8" />
          <path d="M9 9h6" />
        </svg>
      )
    case 'nodairy':
      return (
        <svg {...common}>
          <path d="M8 3h8l1 3v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6l1-3Z" />
          <path d="M9 6h6" />
          <path d="M5 5l14 14" />
        </svg>
      )
    case 'nogluten':
      return (
        <svg {...common}>
          <path d="M12 3v18" />
          <path d="M8 7c2 0 2-2 4-2s2 2 4 2" />
          <path d="M8 12c2 0 2-2 4-2s2 2 4 2" />
          <path d="M8 17c2 0 2-2 4-2s2 2 4 2" />
          <path d="M5 5l14 14" />
        </svg>
      )
    case 'leaf':
      return (
        <svg {...common}>
          <path d="M20 4c-7 0-12 4-12 11 0 3 2 5 5 5 7 0 11-5 11-12 0-1.6-.6-3-1-4Z" />
          <path d="M8 15c4-1 7-4 9-8" />
        </svg>
      )
    case 'leaf2':
      return (
        <svg {...common}>
          <path d="M4 14c4-8 12-10 16-10-1 10-7 16-14 16-2 0-3-1-2-6Z" />
          <path d="M7 15c3-2 6-5 9-9" />
        </svg>
      )
    case 'bolt':
      return (
        <svg {...common}>
          <path d="M13 2L3 14h7l-1 8 11-14h-7l0-6Z" />
        </svg>
      )
    case 'scale':
      return (
        <svg {...common}>
          <path d="M12 3v18" />
          <path d="M5 7h14" />
          <path d="M7 7l-3 6h6l-3-6Z" />
          <path d="M17 7l-3 6h6l-3-6Z" />
        </svg>
      )
    case 'tag':
      return (
        <svg {...common}>
          <path d="M20 10l-9 9-7-7 9-9h7v7Z" />
          <path d="M16 6h.01" />
        </svg>
      )
    case 'sliders':
      return (
        <svg {...common}>
          <path d="M4 21v-7" />
          <path d="M4 10V3" />
          <path d="M12 21v-9" />
          <path d="M12 8V3" />
          <path d="M20 21v-5" />
          <path d="M20 12V3" />
          <path d="M2 14h4" />
          <path d="M10 12h4" />
          <path d="M18 16h4" />
        </svg>
      )
    case 'star':
      return (
        <svg {...common}>
          <path d="M12 2l3 7 7 .6-5.3 4.6 1.7 7-6.4-3.8-6.4 3.8 1.7-7L2 9.6 9 9l3-7Z" />
        </svg>
      )
    default:
      return null
  }
}

function SectionBlock({ title, subtitle, children }) {
  return (
    <div style={{ padding: '20px 20px 4px' }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {title}
        </div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 3, lineHeight: 1.4 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}
function DietChip({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '9px 14px', borderRadius: 12, fontSize: 13, fontWeight: 500,
      border: '1.5px solid', cursor: 'pointer', whiteSpace: 'nowrap',
      transition: 'all 0.15s', fontFamily: 'var(--font-body)',
      borderColor: active ? 'var(--primary-mid)' : 'var(--border)',
      background: active ? 'var(--primary-dim)' : 'var(--card)',
      color: active ? 'var(--primary-bright)' : 'var(--text-sub)',
    }}>{children}</button>
  )
}
function AllergenChip({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 13px', borderRadius: 10, fontSize: 13, fontWeight: 500,
      border: '1.5px solid', cursor: 'pointer',
      transition: 'all 0.15s', fontFamily: 'var(--font-body)',
      borderColor: active ? 'var(--error-bright)' : 'var(--border)',
      background: active ? 'rgba(220,38,38,0.1)' : 'var(--card)',
      color: active ? 'var(--error-bright)' : 'var(--text-sub)',
    }}>{children}</button>
  )
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

  useEffect(() => {
    saveProfile({ ...profile, presetId: 'custom' })
  }, [profile])

  const toggleDiet = (id) => setProfile(p => ({
    ...p,
    dietGoals: p.dietGoals.includes(id) ? p.dietGoals.filter(x => x !== id) : [...p.dietGoals, id]
  }))
  const toggleAllergen = (id) => setProfile(p => ({
    ...p,
    allergens: p.allergens.includes(id) ? p.allergens.filter(x => x !== id) : [...p.allergens, id]
  }))
  const addCustomAllergen = () => {
    const val = allergenInput.trim()
    if (!val) return
    if (profile.customAllergens.includes(val)) return
    setProfile(p => ({ ...p, customAllergens: [...p.customAllergens, val] }))
    setAllergenInput('')
  }
  const removeCustomAllergen = (val) => setProfile(p => ({
    ...p, customAllergens: p.customAllergens.filter(x => x !== val)
  }))

  const activeCount = profile.dietGoals.length + profile.allergens.length + profile.customAllergens.length + (profile.halal ? 1 : 0)

  return (
    <div className="screen" style={{ paddingTop: 0 }}>

      {/* ── Logo header ── */}
      <div style={{
        padding: '52px 24px 24px',
        background: 'linear-gradient(180deg, rgba(124,58,237,0.12) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <img
            src="/logo.png"
            alt="Körset"
            style={{ height: 36, objectFit: 'contain' }}
          />
        </div>
        <p style={{ color: 'var(--text-sub)', fontSize: 14, lineHeight: 1.6, maxWidth: 290 }}>
          Настройте фильтры — AI мгновенно покажет подходит ли товар
        </p>
      </div>

      {/* ── Halal toggle ── */}
      <SectionBlock title="Религиозные требования">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '14px 16px',
          borderColor: profile.halal ? 'var(--primary-mid)' : 'var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 22, height: 22, color: 'var(--primary-bright)', display: 'inline-flex' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.2A8.5 8.5 0 1 1 11.8 3a7 7 0 1 0 9.2 9.2Z" />
                <path d="M16.5 7.5l.7 1.7 1.8.1-1.4 1.1.5 1.8-1.6-1-1.6 1 .5-1.8-1.4-1.1 1.8-.1.7-1.7Z" />
              </svg>
            </span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                Только Халал
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>
                Исключит товары без халал-маркировки
              </div>
            </div>
          </div>
          <button
            onClick={() => setProfile(p => ({ ...p, halal: !p.halal }))}
            style={{
              width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
              background: profile.halal ? 'var(--primary)' : 'var(--border-bright)',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              boxShadow: profile.halal ? '0 0 12px var(--primary-glow)' : 'none',
            }}
          >
            <span style={{
              position: 'absolute', width: 22, height: 22, borderRadius: '50%',
              background: 'white', top: 3,
              left: profile.halal ? 23 : 3,
              transition: 'left 0.2s cubic-bezier(0.34,1.3,0.64,1)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
          </button>
        </div>
      </SectionBlock>

      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

      {/* ── Diet goals ── */}
      <SectionBlock title="Диета и предпочтения" subtitle="Выберите всё что подходит">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {DIET_GOALS.map(d => (
            <DietChip key={d.id} active={profile.dietGoals.includes(d.id)} onClick={() => toggleDiet(d.id)}>
              <span style={{ width: 18, height: 18, display: 'inline-flex', color: profile.dietGoals.includes(d.id) ? 'var(--primary-bright)' : 'var(--text-dim)' }}>
                <MiniIcon name={d.icon} />
              </span>
              {d.label}
            </DietChip>
          ))}
        </div>
      </SectionBlock>

      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

      {/* ── Allergens ── */}
      <SectionBlock title="Аллергены — исключить" subtitle="Красным — то что нельзя">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {ALLERGENS.map(a => (
            <AllergenChip key={a.id} active={profile.allergens.includes(a.id)} onClick={() => toggleAllergen(a.id)}>
              {profile.allergens.includes(a.id) ? '✕ ' : ''}{a.label}
            </AllergenChip>
          ))}
        </div>

        {/* Custom allergen input */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '12px 14px',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
            Другой аллерген — ввести вручную
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={allergenInputRef}
              value={allergenInput}
              onChange={e => setAllergenInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomAllergen()}
              placeholder="Например: клубника, кунжут..."
              style={{
                flex: 1, background: 'var(--surface)', border: '1px solid var(--border-bright)',
                borderRadius: 10, padding: '9px 12px', color: 'var(--text)',
                fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none',
              }}
            />
            <button
              onClick={addCustomAllergen}
              style={{
                padding: '9px 14px', borderRadius: 10, background: 'var(--primary-dim)',
                border: '1px solid rgba(139,92,246,0.3)', color: 'var(--primary-bright)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                whiteSpace: 'nowrap',
              }}
            >+ Добавить</button>
          </div>
          {profile.customAllergens.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {profile.customAllergens.map(val => (
                <span key={val} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 20, fontSize: 12,
                  background: 'rgba(220,38,38,0.1)', color: 'var(--error-bright)',
                  border: '1px solid rgba(220,38,38,0.2)',
                }}>
                  ⚠️ {val}
                  <span onClick={() => removeCustomAllergen(val)} style={{ cursor: 'pointer', opacity: 0.7 }}>×</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </SectionBlock>

      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

      {/* ── Priority ── */}
      <SectionBlock title="Приоритет выбора">
        <div style={{ display: 'flex', gap: 8 }}>
          {PRIORITIES.map(p => (
            <button
              key={p.id}
              onClick={() => setProfile(prev => ({ ...prev, priority: p.id }))}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: 'var(--radius)',
                border: '1.5px solid', cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.15s', background: 'none', fontFamily: 'var(--font-body)',
                borderColor: profile.priority === p.id ? 'var(--primary-mid)' : 'var(--border)',
                backgroundColor: profile.priority === p.id ? 'var(--primary-dim)' : 'var(--card)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, color: profile.priority === p.id ? 'var(--primary-bright)' : 'var(--text-dim)' }}>
                <MiniIcon name={p.icon} />
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600,
                color: profile.priority === p.id ? 'var(--primary-bright)' : 'var(--text)',
              }}>{p.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.3 }}>{p.desc}</div>
            </button>
          ))}
        </div>
      </SectionBlock>

      {/* ── Active summary pill row ── */}
      {activeCount > 0 && (
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>Активно:</span>
            {profile.halal && <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--primary-dim)', color: 'var(--primary-bright)', border: '1px solid rgba(139,92,246,0.2)' }}>☪️ Халал</span>}
            {profile.dietGoals.map(id => {
              const d = DIET_GOALS.find(x => x.id === id)
              return (
                <span key={id} style={{
                  fontSize: 12, padding: '3px 10px', borderRadius: 20,
                  background: 'var(--primary-dim)', color: 'var(--primary-bright)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  display: 'inline-flex', alignItems: 'center', gap: 6
                }}>
                  <span style={{ display: 'inline-flex', color: 'var(--primary-bright)' }}>
                    <MiniIcon name={d?.icon} />
                  </span>
                  {d?.label}
                </span>
              )
            })}
            {profile.allergens.map(id => {
              const a = ALLERGENS.find(x => x.id === id)
              return <span key={id} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'rgba(220,38,38,0.1)', color: 'var(--error-bright)', border: '1px solid rgba(220,38,38,0.2)' }}>⚠️ {a?.label}</span>
            })}
            {profile.customAllergens.map(val => (
              <span key={val} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'rgba(220,38,38,0.1)', color: 'var(--error-bright)', border: '1px solid rgba(220,38,38,0.2)' }}>⚠️ {val}</span>
            ))}
            <button onClick={() => setProfile({ halal: false, dietGoals: [], allergens: [], customAllergens: [], priority: 'balanced' })}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0 }}>
              Сбросить
            </button>
          </div>
        </div>
      )}

      {/* ── CTA buttons ── */}
      <div style={{ padding: '20px 20px 36px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Primary: show results from catalog */}
        <button className="btn btn-primary btn-full" onClick={() => navigate('/catalog')}>
          {activeCount > 0 && (
            <span style={{
              background: 'rgba(255,255,255,0.2)', borderRadius: 20,
              padding: '2px 9px', fontSize: 12, fontWeight: 700,
            }}>{activeCount}</span>
          )}
          Показать подходящие товары →
        </button>

        {/* Secondary: real scan */}
        <button
          className="btn btn-secondary btn-full"
          onClick={() => navigate('/scan')}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          Сканировать товар
        </button>
      </div>

    </div>
  )
}
