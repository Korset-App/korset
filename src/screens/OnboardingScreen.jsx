import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadProfile, saveProfile } from '../utils/profile.js'
import { setLang, useI18n } from '../utils/i18n.js'

const PREFERENCES = [
  { id: 'halal', icon: 'halal', ru: 'Халал', kz: 'Халал', width: '48%' },
  { id: 'sugar_free', icon: 'nosugar', ru: 'Без сахара', kz: 'Қантсыз', width: '42%' },
  { id: 'dairy_free', icon: 'nodairy', ru: 'Без лактозы', kz: 'Лактозасыз', width: '58%' },
  { id: 'gluten_free', icon: 'nogluten', ru: 'Без глютена', kz: 'Глютенсіз', width: '40%' },
  { id: 'vegan', icon: 'vegan', ru: 'Веган', kz: 'Веган', width: '34%' },
  { id: 'vegetarian', icon: 'veggie', ru: 'Вегетариан', kz: 'Вегетариан', width: '54%' },
  { id: 'keto', icon: 'keto', ru: 'Кето', kz: 'Кето', width: '30%' },
  { id: 'kid_friendly', icon: 'kids', ru: 'Для детей', kz: 'Балаларға', width: '46%' },
]

const ALLERGENS = [
  { id: 'milk', icon: 'milk', ru: 'Молоко', kz: 'Сүт', width: '36%' },
  { id: 'eggs', icon: 'egg', ru: 'Яйца', kz: 'Жұмыртқа', width: '34%' },
  { id: 'gluten', icon: 'wheat', ru: 'Глютен', kz: 'Глютен', width: '38%' },
  { id: 'nuts', icon: 'nuts', ru: 'Орехи', kz: 'Жаңғақ', width: '34%' },
  { id: 'peanuts', icon: 'peanut', ru: 'Арахис', kz: 'Жержаңғақ', width: '42%' },
  { id: 'soy', icon: 'soy', ru: 'Соя', kz: 'Соя', width: '28%' },
  { id: 'fish', icon: 'fish', ru: 'Рыба', kz: 'Балық', width: '30%' },
  { id: 'shellfish', icon: 'shell', ru: 'Морепродукты', kz: 'Теңіз өнімдері', width: '56%' },
  { id: 'sesame', icon: 'sesame', ru: 'Кунжут', kz: 'Күнжіт', width: '34%' },
  { id: 'honey', icon: 'honey', ru: 'Мёд', kz: 'Бал', width: '28%' },
]

const FEATURE_KEYS = [
  { key: 'fit', width: '52%' },
  { key: 'halal', width: '30%' },
  { key: 'ai', width: '40%' },
  { key: 'allergens', width: '56%' },
  { key: 'alternatives', width: '44%' },
  { key: 'facts', width: '36%' },
]

function FeatureIcon({ name }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none' }
  switch (name) {
    case 'fit':
      return <svg {...common}><path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 8.7l5.4-.8L12 3z" stroke="#A78BFA" strokeWidth="1.7" fill="rgba(167,139,250,0.16)" /></svg>
    case 'halal':
      return <svg {...common}><path d="M20 12.2A8.5 8.5 0 1 1 11.8 3a7 7 0 1 0 8.2 9.2Z" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round"/><path d="M16.5 7.5l.6 1.6 1.7.1-1.3 1 .5 1.7-1.5-.9-1.5.9.5-1.7-1.3-1 1.7-.1.6-1.6Z" fill="#A78BFA"/></svg>
    case 'allergens':
      return <svg {...common}><path d="M12 3 3 19h18L12 3Z" stroke="#F87171" strokeWidth="1.8" fill="rgba(248,113,113,0.12)"/><path d="M12 9v4" stroke="#FCA5A5" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1" fill="#FCA5A5"/></svg>
    case 'ai':
      return <svg {...common}><rect x="4" y="5" width="16" height="12" rx="4" stroke="#A78BFA" strokeWidth="1.8" fill="rgba(167,139,250,0.12)"/><path d="M9 11h6M9 14h4" stroke="#C4B5FD" strokeWidth="1.7" strokeLinecap="round"/></svg>
    case 'alternatives':
      return <svg {...common}><path d="M7 7h10M7 12h7M7 17h10" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round"/><path d="m14 10 3 2-3 2" stroke="#C4B5FD" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
    default:
      return <svg {...common}><path d="M6 7h12M5 12h14M7 17h10" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round"/></svg>
  }
}

function ChoiceIcon({ name, active = false, size = 18 }) {
  const color = active ? '#F3E8FF' : 'rgba(225,225,245,0.9)'
  const fill = active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)'
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' }
  switch (name) {
    case 'nosugar':
      return <svg {...common}><rect x="5" y="8" width="14" height="11" rx="2" stroke={color} strokeWidth="1.7" fill={fill}/><line x1="4" y1="4" x2="20" y2="20" stroke="#F87171" strokeWidth="2" strokeLinecap="round"/></svg>
    case 'nodairy':
      return <svg {...common}><path d="M9 3h6l2 5v12H7V8l2-5Z" stroke={color} strokeWidth="1.7" fill={fill}/><line x1="4" y1="4" x2="20" y2="20" stroke="#F87171" strokeWidth="2" strokeLinecap="round"/></svg>
    case 'nogluten':
      return <svg {...common}><path d="M12 2v20" stroke={color} strokeWidth="1.7" strokeLinecap="round"/><path d="M9 8c1 .7 1.8 1 3 .5M15 8c-1 .7-1.8 1-3 .5M9 12c1 .7 1.8 1 3 .5M15 12c-1 .7-1.8 1-3 .5" stroke={color} strokeWidth="1.6" strokeLinecap="round"/><line x1="4" y1="4" x2="20" y2="20" stroke="#F87171" strokeWidth="2" strokeLinecap="round"/></svg>
    case 'vegan':
      return <svg {...common}><path d="M21 4C10 4 5 12 5 20" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round"/><path d="M5 20c3-7 8-12 16-11-1 4-4 10-16 11Z" stroke="#34D399" strokeWidth="1.8" fill="rgba(52,211,153,0.18)"/></svg>
    case 'veggie':
      return <svg {...common}><path d="M12 4c4 2 5 5 5 8 0 5-5 8-5 8s-5-3-5-8c0-3 1-6 5-8Z" fill="rgba(249,115,22,0.16)" stroke="#FB923C" strokeWidth="1.8"/><path d="M10 4c-1-2-2-3-3-2M12 4V1M14 4c1-2 2-3 3-2" stroke="#34D399" strokeWidth="1.7" strokeLinecap="round"/></svg>
    case 'keto':
      return <svg {...common}><path d="M12 3c4.5 0 7 3.5 7 8 0 5.5-3.5 10-7 11-3.5-1-7-5.5-7-11 0-4.5 2.5-8 7-8z" fill="rgba(132,204,22,0.14)" stroke="#84CC16" strokeWidth="1.8"/><circle cx="12" cy="13.5" r="3" fill="rgba(161,98,7,0.42)" stroke="#A16207" strokeWidth="1.4"/></svg>
    case 'kids':
      return <svg {...common}><circle cx="9" cy="8" r="2.3" fill="rgba(96,165,250,0.16)" stroke="#60A5FA" strokeWidth="1.6"/><circle cx="15.5" cy="9.5" r="1.8" fill="rgba(167,139,250,0.16)" stroke="#A78BFA" strokeWidth="1.6"/><path d="M5.5 18c.7-2.5 2.5-4 4.5-4s3.8 1.5 4.5 4" stroke="#60A5FA" strokeWidth="1.7" strokeLinecap="round"/><path d="M13.5 18c.4-1.6 1.5-2.7 3-2.7s2.7 1.1 3 2.7" stroke="#A78BFA" strokeWidth="1.7" strokeLinecap="round"/></svg>
    case 'milk':
      return <svg {...common}><path d="M9 3h6l2 5v12H7V8l2-5Z" stroke={color} strokeWidth="1.7" fill={fill}/></svg>
    case 'egg':
      return <svg {...common}><path d="M12 3C8.8 3 6.5 8 6.5 12.3a5.5 5.5 0 1 0 11 0C17.5 8 15.2 3 12 3Z" stroke="#FCD34D" strokeWidth="1.7" fill="rgba(252,211,77,0.18)"/></svg>
    case 'wheat':
      return <svg {...common}><path d="M12 3v18" stroke={color} strokeWidth="1.7" strokeLinecap="round"/><path d="M9 8c1 .7 1.8 1 3 .5M15 8c-1 .7-1.8 1-3 .5M9 12c1 .7 1.8 1 3 .5M15 12c-1 .7-1.8 1-3 .5" stroke={color} strokeWidth="1.6" strokeLinecap="round"/></svg>
    case 'nuts':
      return <svg {...common}><path d="M12 4c4.2 0 6.8 2.7 6.8 6.3 0 4.8-3.4 8.8-6.8 9.7-3.4-.9-6.8-4.9-6.8-9.7C5.2 6.7 7.8 4 12 4Z" stroke="#D97706" strokeWidth="1.7" fill="rgba(217,119,6,0.14)"/></svg>
    case 'peanut':
      return <svg {...common}><path d="M10 4.5a3.5 3.5 0 1 0 0 7h4a3.5 3.5 0 1 0 0-7h-4ZM10 12.5a3.5 3.5 0 1 0 0 7h4a3.5 3.5 0 1 0 0-7h-4Z" stroke="#F59E0B" strokeWidth="1.7" fill="rgba(245,158,11,0.14)"/></svg>
    case 'soy':
      return <svg {...common}><ellipse cx="9" cy="9" rx="3.6" ry="5.2" transform="rotate(-18 9 9)" stroke="#84CC16" strokeWidth="1.7" fill="rgba(132,204,22,0.14)"/><ellipse cx="15" cy="9" rx="3.6" ry="5.2" transform="rotate(18 15 9)" stroke="#84CC16" strokeWidth="1.7" fill="rgba(132,204,22,0.1)"/></svg>
    case 'fish':
      return <svg {...common}><path d="M20 12c-3-3.4-7-4.8-12-3.4L4 12l4 3.4c5 1.6 9 .2 12-3.4Z" stroke="#60A5FA" strokeWidth="1.7" fill="rgba(96,165,250,0.14)"/><path d="M4 12 2.5 9M4 12l-1.5 3" stroke="#60A5FA" strokeWidth="1.6" strokeLinecap="round"/></svg>
    case 'shell':
      return <svg {...common}><path d="M15 5c2 1.4 3 3.8 2 6.6l-2 2.8-2.8 1.7-1.7 3.4" stroke="#F472B6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 5c-2 0-3.8 1-5 2.8L8.3 12l1.5 3.2" stroke="#F472B6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
    case 'sesame':
      return <svg {...common}><ellipse cx="8" cy="12" rx="2.2" ry="3.4" transform="rotate(-18 8 12)" stroke="#FDE68A" strokeWidth="1.6" fill="rgba(253,230,138,0.18)"/><ellipse cx="12" cy="10" rx="2.2" ry="3.4" stroke="#FDE68A" strokeWidth="1.6" fill="rgba(253,230,138,0.14)"/><ellipse cx="16" cy="12" rx="2.2" ry="3.4" transform="rotate(18 16 12)" stroke="#FDE68A" strokeWidth="1.6" fill="rgba(253,230,138,0.12)"/></svg>
    case 'honey':
      return <svg {...common}><path d="M9 5h6l2 4v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9l2-4Z" stroke="#F59E0B" strokeWidth="1.7" fill="rgba(245,158,11,0.14)"/><path d="M7 11h10M7 15h10" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round"/></svg>
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.7" fill={fill}/></svg>
  }
}

function StepIndicator({ step }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
      {[0, 1, 2].map((index) => (
        <div key={index} style={{ width: index === step ? 34 : 9, height: 9, borderRadius: 999, background: index === step ? 'linear-gradient(90deg, #8B5CF6, #7C3AED)' : 'rgba(255,255,255,0.12)', boxShadow: index === step ? '0 0 18px rgba(124,58,237,0.38)' : 'none', transition: 'all 0.28s ease' }} />
      ))}
    </div>
  )
}

function FloatingFlow({ items, renderCard }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 10 }}>
      {items.map((item, index) => (
        <div key={item.id || item.key || index} style={{ flex: `1 1 ${item.width}`, minWidth: index % 3 === 0 ? 118 : 108, maxWidth: item.width, transform: `translateY(${index % 3 === 1 ? 10 : index % 3 === 2 ? -4 : 0}px)` }}>
          {renderCard(item)}
        </div>
      ))}
    </div>
  )
}

function FeatureCard({ name, label }) {
  return (
    <div style={{ minHeight: 60, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', boxShadow: '0 10px 26px rgba(0,0,0,0.14)' }}>
      <FeatureIcon name={name} />
      <div style={{ fontSize: 13, fontWeight: 700, color: '#F4F0FF', lineHeight: 1.22 }}>{label}</div>
    </div>
  )
}

function ChoicePill({ item, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: 58,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 14px',
        borderRadius: 18,
        border: active ? '1px solid rgba(124,58,237,0.68)' : '1px solid rgba(255,255,255,0.08)',
        background: active ? 'linear-gradient(180deg, rgba(124,58,237,0.18), rgba(124,58,237,0.08))' : 'rgba(255,255,255,0.04)',
        color: '#F4F0FF',
        textAlign: 'left',
        boxShadow: active ? '0 0 0 1px rgba(124,58,237,0.14) inset, 0 12px 30px rgba(124,58,237,0.18)' : '0 8px 20px rgba(0,0,0,0.12)',
        cursor: 'pointer',
        transition: 'all 0.22s ease',
      }}
    >
      <ChoiceIcon name={item.icon} active={active} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{label}</div>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: active ? 'none' : '1px solid rgba(255,255,255,0.16)', background: active ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' : 'transparent', boxShadow: active ? '0 0 12px rgba(124,58,237,0.42)' : 'none', flexShrink: 0 }} />
    </button>
  )
}

export default function OnboardingScreen({ onDone }) {
  const navigate = useNavigate()
  const { lang, t } = useI18n()
  const profile = useMemo(() => loadProfile(), [])

  const [step, setStep] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [selectedPrefs, setSelectedPrefs] = useState(new Set(profile.dietGoals || []))
  const [selectedAllergens, setSelectedAllergens] = useState(new Set(profile.allergens || []))
  const [customItems, setCustomItems] = useState(profile.customAllergens || [])
  const [customInput, setCustomInput] = useState('')

  const featureLabels = t.onboarding.features

  function toggle(setter, value) {
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  function addCustom() {
    const value = customInput.trim()
    if (!value) return
    if (!customItems.includes(value)) setCustomItems((prev) => [...prev, value])
    setCustomInput('')
  }

  function nextStep() {
    setLeaving(true)
    setTimeout(() => {
      setStep((s) => Math.min(2, s + 1))
      setLeaving(false)
    }, 170)
  }

  function prevStep() {
    setLeaving(true)
    setTimeout(() => {
      setStep((s) => Math.max(0, s - 1))
      setLeaving(false)
    }, 170)
  }

  function finish() {
    const nextProfile = {
      ...profile,
      lang,
      halal: selectedPrefs.has('halal'),
      dietGoals: [...selectedPrefs].filter((x) => x !== 'halal'),
      allergens: [...selectedAllergens],
      customAllergens: customItems,
      presetId: 'custom',
    }

    saveProfile(nextProfile)
    localStorage.setItem('korset_onboarding_done', '1')
    setLang(lang)
    setLeaving(true)
    setTimeout(() => {
      onDone()
      navigate('/scan')
    }, 260)
  }

  const stepTitle = [
    t.onboarding.step1Title,
    t.onboarding.step2Title,
    t.onboarding.step3Title,
  ][step]

  const stepSub = [
    '',
    t.onboarding.step2Sub,
    t.onboarding.step3Sub,
  ][step]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'linear-gradient(180deg, #080811 0%, #05050D 100%)', overflowY: 'auto' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 50% -10%, rgba(124,58,237,0.18) 0%, transparent 45%)' }} />
      <div style={{ position: 'relative', padding: '24px 20px 34px', minHeight: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <img src="/korset_logo.svg" alt="Körset" style={{ height: 38, width: 'auto', filter: 'drop-shadow(0 8px 18px rgba(124,58,237,0.22))' }} />
          {step > 0 ? <div style={{ width: 84 }} /> : null}
        </div>

        <StepIndicator step={step} />

        <div style={{ textAlign: 'center', marginBottom: 18, opacity: leaving ? 0 : 1, transform: leaving ? 'translateY(10px)' : 'translateY(0)', transition: 'all 0.28s ease' }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: step === 0 ? 30 : 28, lineHeight: 1.08, color: '#fff', letterSpacing: '-0.7px' }}>{stepTitle}</h1>
          {step > 0 && <p style={{ margin: '10px auto 0', maxWidth: 330, fontSize: 14, lineHeight: 1.55, color: 'rgba(185,185,214,0.84)' }}>{stepSub}</p>}
        </div>

        <div style={{ opacity: leaving ? 0 : 1, transform: leaving ? 'translateY(16px)' : 'translateY(0)', transition: 'all 0.32s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          {step === 0 && (
            <>
              <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'rgba(185,185,214,0.76)', fontSize: 12, fontWeight: 700 }}>{t.onboarding.langTitle}</span>
                <button onClick={() => setLang('ru')} style={{ padding: '9px 12px', borderRadius: 999, border: `1px solid ${lang === 'ru' ? 'rgba(124,58,237,0.55)' : 'rgba(255,255,255,0.08)'}`, background: lang === 'ru' ? 'rgba(124,58,237,0.14)' : 'rgba(255,255,255,0.03)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Русский</button>
                <button onClick={() => setLang('kz')} style={{ padding: '9px 12px', borderRadius: 999, border: `1px solid ${lang === 'kz' ? 'rgba(124,58,237,0.55)' : 'rgba(255,255,255,0.08)'}`, background: lang === 'kz' ? 'rgba(124,58,237,0.14)' : 'rgba(255,255,255,0.03)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Қазақша</button>
              </div>
              <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 800, color: 'rgba(175,175,205,0.74)', textTransform: 'uppercase', letterSpacing: '1.05px' }}>{t.onboarding.featuresTitle}</div>
              <FloatingFlow
                items={FEATURE_KEYS}
                renderCard={({ key }) => <FeatureCard name={key} label={featureLabels[key]} />}
              />
            </>
          )}

          {step === 1 && (
            <FloatingFlow
              items={PREFERENCES}
              renderCard={(item) => {
                const active = selectedPrefs.has(item.id)
                return <ChoicePill item={item} label={lang === 'kz' ? item.kz : item.ru} active={active} onClick={() => toggle(setSelectedPrefs, item.id)} />
              }}
            />
          )}

          {step === 2 && (
            <>
              <FloatingFlow
                items={ALLERGENS}
                renderCard={(item) => {
                  const active = selectedAllergens.has(item.id)
                  return <ChoicePill item={item} label={lang === 'kz' ? item.kz : item.ru} active={active} onClick={() => toggle(setSelectedAllergens, item.id)} />
                }}
              />
              <div style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', padding: 14, marginTop: 16 }}>
                <div style={{ fontSize: 12, color: 'rgba(185,185,214,0.74)', marginBottom: 8 }}>{lang === 'kz' ? 'Өз шектеуіңізді қосыңыз' : 'Добавьте своё исключение'}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={customInput} onChange={(e) => setCustomInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} placeholder={t.onboarding.customPlaceholder} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none' }} />
                  <button onClick={addCustom} style={{ padding: '0 16px', borderRadius: 12, border: '1px solid rgba(124,58,237,0.32)', background: 'rgba(124,58,237,0.16)', color: '#E9D5FF', fontWeight: 700, cursor: 'pointer' }}>{t.onboarding.add}</button>
                </div>
                {customItems.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {customItems.map((item) => (
                      <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.18)', color: '#FCA5A5', fontSize: 12 }}>
                        {item}
                        <span onClick={() => setCustomItems((prev) => prev.filter((x) => x !== item))} style={{ cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24, paddingBottom: 18 }}>
          {step > 0 && (
            <button onClick={prevStep} style={{ flex: '0 0 110px', height: 52, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#EDE9FE', fontWeight: 700, cursor: 'pointer' }}>{t.onboarding.back}</button>
          )}
          <button onClick={step === 2 ? finish : nextStep} style={{ flex: 1, height: 52, borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: '#fff', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, boxShadow: '0 10px 30px rgba(124,58,237,0.34)', cursor: 'pointer' }}>
            {step === 2 ? t.onboarding.finish : t.onboarding.next}
          </button>
        </div>
      </div>
    </div>
  )
}
