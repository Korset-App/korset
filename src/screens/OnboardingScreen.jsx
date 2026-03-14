import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveProfile, loadProfile } from '../utils/profile.js'
import { setLang, useI18n } from '../utils/i18n.js'

const OPTIONS = [
  {
    id: 'halal',
    emoji: '☪️',
    label: 'Халал',
    sub: 'Только разрешённые продукты',
    apply: p => ({ ...p, halalOnly: true }),
  },
  {
    id: 'allergy_milk',
    emoji: '🥛',
    label: 'Без молока',
    sub: 'Аллергия или непереносимость',
    apply: p => ({ ...p, allergens: [...(p.allergens||[]).filter(a=>a!=='milk'), 'milk'] }),
  },
  {
    id: 'allergy_gluten',
    emoji: '🌾',
    label: 'Без глютена',
    sub: 'Целиакия или диета',
    apply: p => ({ ...p, allergens: [...(p.allergens||[]).filter(a=>a!=='gluten'), 'gluten'], dietGoals: [...(p.dietGoals||[]).filter(g=>g!=='gluten_free'), 'gluten_free'] }),
  },
  {
    id: 'allergy_nuts',
    emoji: '🥜',
    label: 'Без орехов',
    sub: 'Аллергия на орехи / арахис',
    apply: p => ({ ...p, allergens: [...(p.allergens||[]).filter(a=>a!=='nuts'&&a!=='peanuts'), 'nuts', 'peanuts'] }),
  },
  {
    id: 'sugar_free',
    emoji: '🚫',
    label: 'Без сахара',
    sub: 'Диабет, диета или ЗОЖ',
    apply: p => ({ ...p, sugarFree: true, dietGoals: [...(p.dietGoals||[]).filter(g=>g!=='sugar_free'), 'sugar_free'] }),
  },
  {
    id: 'vegan',
    emoji: '🌱',
    label: 'Веган',
    sub: 'Без мяса, молока и яиц',
    apply: p => ({ ...p, dietGoals: [...(p.dietGoals||[]).filter(g=>g!=='vegan'), 'vegan'] }),
  },
]

export default function OnboardingScreen({ onDone }) {
  const navigate = useNavigate()
  const { lang, t } = useI18n()
  const [selected, setSelected] = useState(new Set())
  const [leaving, setLeaving] = useState(false)

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const finish = () => {
    // Собираем профиль из выбранных опций
    let profile = loadProfile()
    OPTIONS.forEach(opt => {
      if (selected.has(opt.id)) profile = opt.apply(profile)
    })
    saveProfile(profile)
    localStorage.setItem('korset_onboarding_done', '1')
    setLang(lang)
    setLang(lang)

    setLeaving(true)
    setTimeout(() => {
      onDone()
      navigate('/scan')
    }, 300)
  }

  const skip = () => {
    localStorage.setItem('korset_onboarding_done', '1')
    setLeaving(true)
    setTimeout(() => { onDone(); navigate('/scan') }, 300)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'var(--bg, #07070F)',
      display: 'flex', flexDirection: 'column',
      opacity: leaving ? 0 : 1,
      transition: 'opacity 0.3s ease',
      overflowY: 'auto',
    }}>

      {/* ── Хэдер ── */}
      <div style={{ padding: '56px 24px 0', flexShrink: 0 }}>
        {/* Лого */}
        <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginBottom: 28 }}>
          kö<span style={{ color: '#7C3AED' }}>r</span>set
        </div>

        {/* Заголовок — дерзко */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}><button onClick={() => setLang('ru')} style={{ padding: '8px 12px', borderRadius: 12, border: `1px solid ${lang === 'ru' ? 'rgba(124,58,237,0.55)' : 'rgba(255,255,255,0.08)'}`, background: lang === 'ru' ? 'rgba(124,58,237,0.14)' : 'rgba(255,255,255,0.03)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Русский</button><button onClick={() => setLang('kz')} style={{ padding: '8px 12px', borderRadius: 12, border: `1px solid ${lang === 'kz' ? 'rgba(124,58,237,0.55)' : 'rgba(255,255,255,0.08)'}`, background: lang === 'kz' ? 'rgba(124,58,237,0.14)' : 'rgba(255,255,255,0.03)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Қазақша</button></div><div style={{ fontSize: 12, color: 'rgba(180,180,210,0.72)', marginBottom: 18 }}>{t.onboarding.langTitle}</div><h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 30, fontWeight: 900,
          lineHeight: 1.15, color: '#fff',
          marginBottom: 10,
          letterSpacing: '-0.5px',
        }}>
          {t.onboarding.title1}<br />
          <span style={{
            background: 'linear-gradient(90deg, #A78BFA, #7C3AED)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>{t.onboarding.title2}</span>
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(180,180,210,0.8)', lineHeight: 1.55, marginBottom: 32 }}>
          {t.onboarding.subtitle}
        </p>
      </div>

      {/* ── Карточки выбора ── */}
      <div style={{ padding: '0 24px', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {OPTIONS.map(opt => {
            const on = selected.has(opt.id)
            return (
              <button
                key={opt.id}
                onClick={() => toggle(opt.id)}
                style={{
                  padding: '14px 14px 13px',
                  borderRadius: 16,
                  border: on
                    ? '1.5px solid rgba(124,58,237,0.7)'
                    : '1.5px solid rgba(255,255,255,0.08)',
                  background: on
                    ? 'linear-gradient(135deg, rgba(124,58,237,0.22), rgba(109,40,217,0.12))'
                    : 'rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s ease',
                  boxShadow: on ? '0 0 20px rgba(124,58,237,0.2)' : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Галочка */}
                {on && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#7C3AED',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
                <div style={{ fontSize: 26, marginBottom: 6 }}>{opt.emoji}</div>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: on ? '#E9D5FF' : 'rgba(220,220,240,0.9)',
                  marginBottom: 2, fontFamily: 'var(--font-display)',
                }}>
                  {t.onboarding.options[opt.id][0]}
                </div>
                <div style={{ fontSize: 11, color: on ? 'rgba(196,181,253,0.8)' : 'rgba(140,140,170,0.7)', lineHeight: 1.4 }}>
                  {t.onboarding.options[opt.id][1]}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Кнопки ── */}
      <div style={{ padding: '20px 24px 44px', flexShrink: 0 }}>
        <button
          onClick={finish}
          style={{
            width: '100%', padding: '16px',
            borderRadius: 16, border: 'none', cursor: 'pointer',
            background: selected.size > 0
              ? 'linear-gradient(135deg, #7C3AED, #6D28D9)'
              : 'rgba(124,58,237,0.35)',
            color: '#fff',
            fontFamily: 'var(--font-display)',
            fontSize: 16, fontWeight: 700,
            boxShadow: selected.size > 0 ? '0 4px 24px rgba(124,58,237,0.4)' : 'none',
            transition: 'all 0.2s ease',
            marginBottom: 10,
          }}
        >
          {selected.size > 0 ? t.onboarding.start : t.onboarding.continueNoSetup}
        </button>

        {selected.size > 0 && (
          <button
            onClick={skip}
            style={{
              width: '100%', padding: '12px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(140,140,170,0.7)', fontSize: 13,
              fontFamily: 'var(--font-body)',
            }}
          >
            {t.onboarding.skip}
          </button>
        )}
      </div>
    </div>
  )
}
