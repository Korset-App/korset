import { useMemo, useState } from 'react'
import {
  loadProfile,
  saveProfile,
  DIET_GOAL_OPTIONS,
  ALLERGEN_OPTIONS,
  PRIORITY_OPTIONS,
} from '../utils/profile.js'

function iconWrap(bg, stroke, child) {
  return (
    <div style={{
      width: 42,
      height: 42,
      borderRadius: 14,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: bg,
      border: `1px solid ${stroke}`,
      boxShadow: `0 0 18px ${stroke}22`,
      flexShrink: 0,
    }}>
      {child}
    </div>
  )
}

function MainIcon({ type, active }) {
  const violet = active ? '#A78BFA' : 'rgba(200,200,240,0.55)'
  const green = active ? '#34D399' : 'rgba(200,200,240,0.55)'
  const red = active ? '#F87171' : 'rgba(200,200,240,0.55)'

  if (type === 'halal') {
    return iconWrap(active ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.03)', active ? '#7C3AED' : 'rgba(255,255,255,0.08)',
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={violet} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.2A8.5 8.5 0 1 1 11.8 3a7 7 0 1 0 9.2 9.2Z"/>
        <path d="M16.5 7.5l.6 1.6 1.7.1-1.3 1 .5 1.7-1.5-.9-1.5.9.5-1.7-1.3-1 1.7-.1.6-1.6Z"/>
      </svg>
    )
  }

  if (type === 'diet') {
    return iconWrap(active ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.03)', active ? '#10B981' : 'rgba(255,255,255,0.08)',
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M21 3C9 3 4 12 4 20" stroke={green} strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M4 20c3-7 9-12 17-11C21 13 18 19 4 20z" fill={active ? '#34D39933' : 'transparent'} stroke={green} strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    )
  }

  return iconWrap(active ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.03)', active ? '#EF4444' : 'rgba(255,255,255,0.08)',
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={red} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v16"/>
      <path d="M6 9c2 .8 3.5.8 6 0s4-.8 6 0"/>
      <path d="M6 13c2 .8 3.5.8 6 0s4-.8 6 0"/>
    </svg>
  )
}

function StatCard({ value, label, tone = 'violet' }) {
  const tones = {
    violet: { color: '#A78BFA', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.18)' },
    green: { color: '#34D399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.18)' },
    blue: { color: '#60A5FA', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.18)' },
  }
  const t = tones[tone]
  return (
    <div style={{
      background: t.bg,
      border: `1px solid ${t.border}`,
      borderRadius: 18,
      padding: '14px 14px 12px',
      minHeight: 78,
    }}>
      <div style={{ color: t.color, fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 6 }}>{label}</div>
    </div>
  )
}

function Pill({ active, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      borderRadius: 14,
      padding: '12px 14px',
      border: `1.5px solid ${active ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.08)'}`,
      background: active ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)',
      color: active ? '#E9D5FF' : 'var(--text-sub)',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      boxShadow: active ? '0 0 18px rgba(124,58,237,0.14)' : 'none',
    }}>{label}</button>
  )
}

function SectionTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState(loadProfile())

  const activeSummary = useMemo(() => {
    const allergenCount = profile.allergens.length + profile.customAllergens.length
    const goalCount = profile.dietGoals.length
    const ruleCount = (profile.halal ? 1 : 0) + allergenCount + goalCount
    return {
      ruleCount,
      allergenCount,
      modeLabel: PRIORITY_OPTIONS.find((item) => item.id === profile.priority)?.label || 'Баланс',
    }
  }, [profile])

  const commit = (next) => {
    setProfile(next)
    saveProfile(next)
  }

  const toggleGoal = (goalId) => {
    const exists = profile.dietGoals.includes(goalId)
    const nextGoals = exists
      ? profile.dietGoals.filter((id) => id !== goalId)
      : [...profile.dietGoals, goalId]
    commit({ ...profile, dietGoals: nextGoals })
  }

  const toggleAllergen = (allergenId) => {
    const exists = profile.allergens.includes(allergenId)
    const nextAllergens = exists
      ? profile.allergens.filter((id) => id !== allergenId)
      : [...profile.allergens, allergenId]
    commit({ ...profile, allergens: nextAllergens })
  }

  return (
    <div className="screen" style={{ paddingBottom: 108 }}>
      <div className="header">
        <div className="header-row">
          <div className="screen-title">Профиль</div>
          <button style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-sub)',
            cursor: 'pointer',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/>
              <path d="M5.6 5.6l2.1 2.1"/><path d="M16.3 16.3l2.1 2.1"/><path d="M18.4 5.6l-2.1 2.1"/><path d="M7.7 16.3l-2.1 2.1"/>
              <circle cx="12" cy="12" r="3.5"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ padding: '18px 20px 24px' }}>
        <div style={{
          borderRadius: 24,
          border: '1px solid rgba(124,58,237,0.18)',
          background: 'linear-gradient(180deg, rgba(124,58,237,0.10), rgba(255,255,255,0.03))',
          padding: '20px 18px 18px',
          boxShadow: '0 14px 40px rgba(10,10,20,0.35), inset 0 1px 0 rgba(255,255,255,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 68,
              height: 68,
              borderRadius: 24,
              background: 'radial-gradient(circle at 30% 30%, rgba(167,139,250,0.55), rgba(124,58,237,0.18))',
              border: '1px solid rgba(167,139,250,0.34)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 28px rgba(124,58,237,0.24)',
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#E9D5FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21a8 8 0 0 0-16 0"/>
                <circle cx="12" cy="8" r="4"/>
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 700, color: 'var(--text)' }}>
                Ваш профиль питания
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 3 }}>
                Körset будет проверять товар под ваши реальные ограничения, а не гадать на упаковке.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 18 }}>
            <StatCard value={activeSummary.ruleCount} label="активных правил" tone="violet" />
            <StatCard value={activeSummary.allergenCount} label="аллергенов" tone="blue" />
            <StatCard value={activeSummary.modeLabel} label="режим подбора" tone="green" />
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionTitle title="Главные фильтры" sub="Три вещи, которые реально влияют на решение у полки." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            <button onClick={() => commit({ ...profile, halal: !profile.halal })} style={{
              textAlign: 'left',
              borderRadius: 22,
              padding: '16px 14px',
              border: `1.5px solid ${profile.halal ? 'rgba(124,58,237,0.55)' : 'rgba(255,255,255,0.08)'}`,
              background: profile.halal ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)',
              boxShadow: profile.halal ? '0 0 24px rgba(124,58,237,0.16)' : 'none',
              cursor: 'pointer',
            }}>
              <MainIcon type="halal" active={profile.halal} />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginTop: 12, color: 'var(--text)' }}>Халал</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 4 }}>{profile.halal ? 'учитывается всегда' : 'не проверяется'}</div>
            </button>

            <div style={{
              borderRadius: 22,
              padding: '16px 14px',
              border: `1.5px solid ${profile.allergens.length ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)'}`,
              background: profile.allergens.length ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.03)',
            }}>
              <MainIcon type="allergy" active={profile.allergens.length > 0} />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginTop: 12, color: 'var(--text)' }}>Аллергии</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 4 }}>{profile.allergens.length ? `${profile.allergens.length} актив.` : 'не выбраны'}</div>
            </div>

            <div style={{
              borderRadius: 22,
              padding: '16px 14px',
              border: `1.5px solid ${profile.dietGoals.length ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
              background: profile.dietGoals.length ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.03)',
            }}>
              <MainIcon type="diet" active={profile.dietGoals.length > 0} />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginTop: 12, color: 'var(--text)' }}>Диета</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 4 }}>{profile.dietGoals.length ? `${profile.dietGoals.length} фильтр.` : 'не выбрана'}</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <SectionTitle title="Диетические цели" sub="Выбирай только то, что действительно влияет на покупку." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {DIET_GOAL_OPTIONS.map((item) => (
              <Pill
                key={item.id}
                active={profile.dietGoals.includes(item.id)}
                label={item.label}
                onClick={() => toggleGoal(item.id)}
              />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <SectionTitle title="Аллергены и исключения" sub="Это отдельный блок, потому что ошибки здесь самые неприятные." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {ALLERGEN_OPTIONS.map((item) => (
              <Pill
                key={item.id}
                active={profile.allergens.includes(item.id)}
                label={item.label}
                onClick={() => toggleAllergen(item.id)}
              />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <SectionTitle title="Как подбирать альтернативы" sub="Это влияет на то, что Körset покажет первым, если текущий товар не подходит." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PRIORITY_OPTIONS.map((item) => {
              const active = profile.priority === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => commit({ ...profile, priority: item.id })}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    borderRadius: 18,
                    padding: '14px 15px',
                    border: `1.5px solid ${active ? 'rgba(124,58,237,0.55)' : 'rgba(255,255,255,0.08)'}`,
                    background: active ? 'rgba(124,58,237,0.10)' : 'rgba(255,255,255,0.03)',
                    boxShadow: active ? '0 0 18px rgba(124,58,237,0.12)' : 'none',
                    cursor: 'pointer',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{item.desc}</div>
                    </div>
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: `1.5px solid ${active ? '#8B5CF6' : 'rgba(255,255,255,0.16)'}`,
                      background: active ? '#7C3AED' : 'transparent',
                      boxShadow: active ? '0 0 14px rgba(124,58,237,0.22)' : 'none',
                    }} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{
          marginTop: 24,
          borderRadius: 20,
          border: '1px solid rgba(124,58,237,0.26)',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(17,17,32,0.85))',
          padding: '16px 16px 14px',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Синхронизация</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 5, lineHeight: 1.5 }}>
            Позже сюда можно подключить аккаунт и перенести ваш профиль между устройствами без повторной настройки.
          </div>
          <button className="btn btn-primary" style={{ marginTop: 14, width: '100%' }}>Войти в аккаунт</button>
        </div>
      </div>
    </div>
  )
}
