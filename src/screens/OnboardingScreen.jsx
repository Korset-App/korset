import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadProfile, saveProfile } from '../utils/profile.js'
import { setLang, useI18n } from '../utils/i18n.js'

const FEATURE_ITEMS = [
  { id: 'scan', size: 106, shiftX: -10, shiftY: 0 },
  { id: 'fit', size: 118, shiftX: 14, shiftY: 20 },
  { id: 'halal', size: 94, shiftX: -26, shiftY: -4 },
  { id: 'ai', size: 102, shiftX: 18, shiftY: 6 },
  { id: 'alternatives', size: 110, shiftX: -14, shiftY: -10 },
  { id: 'facts', size: 96, shiftX: 22, shiftY: 10 },
]

const PREFERENCES = [
  { id: 'halal', icon: 'halal', ru: 'Халал', kz: 'Халал', size: 118, shiftX: -14, shiftY: 0 },
  { id: 'sugar_free', icon: 'nosugar', ru: 'Без сахара', kz: 'Қантсыз', size: 92, shiftX: 18, shiftY: 16 },
  { id: 'dairy_free', icon: 'nodairy', ru: 'Без лактозы', kz: 'Лактозасыз', size: 116, shiftX: 12, shiftY: -8 },
  { id: 'gluten_free', icon: 'nogluten', ru: 'Без глютена', kz: 'Глютенсіз', size: 102, shiftX: -18, shiftY: 8 },
  { id: 'vegan', icon: 'vegan', ru: 'Веган', kz: 'Веган', size: 94, shiftX: -6, shiftY: -6 },
  { id: 'vegetarian', icon: 'veggie', ru: 'Вегетариан', kz: 'Вегетариан', size: 120, shiftX: 18, shiftY: 6 },
  { id: 'keto', icon: 'keto', ru: 'Кето', kz: 'Кето', size: 88, shiftX: -18, shiftY: -14 },
  { id: 'kid_friendly', icon: 'kids', ru: 'Для детей', kz: 'Балаларға', size: 110, shiftX: 8, shiftY: 8 },
]

const ALLERGENS = [
  { id: 'milk', icon: 'milk', ru: 'Молоко', kz: 'Сүт', size: 102, shiftX: -18, shiftY: 0 },
  { id: 'eggs', icon: 'egg', ru: 'Яйца', kz: 'Жұмыртқа', size: 88, shiftX: 12, shiftY: 18 },
  { id: 'gluten', icon: 'wheat', ru: 'Глютен', kz: 'Глютен', size: 98, shiftX: 18, shiftY: -10 },
  { id: 'nuts', icon: 'nuts', ru: 'Орехи', kz: 'Жаңғақ', size: 92, shiftX: -14, shiftY: 8 },
  { id: 'peanuts', icon: 'peanut', ru: 'Арахис', kz: 'Жержаңғақ', size: 104, shiftX: 14, shiftY: -4 },
  { id: 'soy', icon: 'soy', ru: 'Соя', kz: 'Соя', size: 82, shiftX: -10, shiftY: 14 },
  { id: 'fish', icon: 'fish', ru: 'Рыба', kz: 'Балық', size: 84, shiftX: 16, shiftY: -8 },
  { id: 'shellfish', icon: 'shell', ru: 'Морепродукты', kz: 'Теңіз өнімдері', size: 122, shiftX: -8, shiftY: 10 },
  { id: 'sesame', icon: 'sesame', ru: 'Кунжут', kz: 'Күнжіт', size: 90, shiftX: 12, shiftY: -10 },
  { id: 'honey', icon: 'honey', ru: 'Мёд', kz: 'Бал', size: 86, shiftX: -10, shiftY: 10 },
]

function ScanIcon({ active = false }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#C4B5FD'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8V6a2 2 0 0 1 2-2h2"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v2"/>
      <path d="M20 16v2a2 2 0 0 1-2 2h-2"/>
      <path d="M8 20H6a2 2 0 0 1-2-2v-2"/>
      <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2.3"/>
    </svg>
  )
}

function AIIcon({ active = false }) {
  const color = active ? '#fff' : '#C4B5FD'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="12" rx="4" fill={active ? 'rgba(255,255,255,0.16)' : 'rgba(167,139,250,0.10)'} />
      <path d="M9 11h6M9 14h4"/>
      <path d="M9 17v2l3-2h2"/>
    </svg>
  )
}

function AlternativeIcon({ active = false }) {
  const color = active ? '#fff' : '#C4B5FD'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3h5v5" />
      <path d="M8 3H3v5" />
      <path d="M21 3l-7.6 7.6A5 5 0 0 0 12 14.1V21" />
      <path d="M6 6v.01M8 8v.01M10 10v.01" />
    </svg>
  )
}

function LanguageIcon({ active = false }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#fff' : '#C4B5FD'}>
      <path d="M5 15V17C5 18.0544 5.81588 18.9182 6.85074 18.9945L7 19H10V21H7C4.79086 21 3 19.2091 3 17V15H5ZM18 10L22.4 21H20.245L19.044 18H14.954L13.755 21H11.601L16 10H18ZM17 12.8852L15.753 16H18.245L17 12.8852ZM8 2V4H12V11H8V14H6V11H2V4H6V2H8ZM17 3C19.2091 3 21 4.79086 21 7V9H19V7C19 5.89543 18.1046 5 17 5H14V3H17ZM6 6H4V9H6V6ZM10 6H8V9H10V6Z"/>
    </svg>
  )
}

function HalalIcon({ active = false }) {
  const stroke = active ? '#fff' : '#C4B5FD'
  const fill = active ? 'rgba(255,255,255,0.12)' : 'rgba(124,58,237,0.08)'
  return (
    <svg width="28" height="28" viewBox="0 0 512 512" fill="none">
      <path d="M477.65698,250.34254l-60.92188-60.9209V103.26441c0-4.41797-3.58154-8-8-8h-86.15674l-60.92188-60.92188c-3.12402-3.12305-8.18945-3.12305-11.31348,0l-60.92139,60.92188H103.26489c-4.41846,0-8,3.58203-8,8v86.15723l-60.92188,60.9209c-3.12323,3.12425-3.12323,8.1902,0,11.31445l60.92188,60.9209v86.15723c0,4.41797,3.58154,8,8,8h86.15674l60.92139,60.92188c3.12465,3.12367,8.18883,3.12367,11.31348,0l60.92188-60.92188h33.28027c4.41846,0,8-3.58203,8-8s-3.58154-8-8-8h-36.59375c-2.12158,0-4.15674,.84277-5.65674,2.34277l-57.6084,57.6084-57.60791-57.6084c-1.5-1.5-3.53516-2.34277-5.65674-2.34277H111.26489v-81.4707c0-2.12207-.84277-4.15625-2.34326-5.65723l-57.60791-57.60742,57.60791-57.60742c1.50049-1.50098,2.34326-3.53516,2.34326-5.65723V111.26441h81.47021c2.12158,0,4.15674-.84277,5.65674-2.34277l57.60791-57.6084,57.6084,57.6084c1.5,1.5,3.53516,2.34277,5.65674,2.34277h81.47021v81.4707c0,2.12207,.84277,4.15625,2.34326,5.65723l57.60791,57.60742-57.60791,57.60742c-1.50049,1.50098-2.34326,3.53516-2.34326,5.65723v62.72949c0,4.41797,3.58154,8,8,8s8-3.58203,8-8v-59.41602l60.92188-60.9209c3.12323-3.12425,3.12323-8.1902,0-11.31445Z" stroke={stroke} strokeWidth="18" fill={fill}/>
      <path d="M157.00513,362.99488h54.67627l38.66162,38.66211c1.56201,1.56152,3.60889,2.34277,5.65674,2.34277,2.04736,0,4.09473-.78125,5.65674-2.34277l38.66211-38.66211h54.67627c4.41846,0,8-3.58203,8-8v-54.67676l38.66162-38.66113c3.12451-3.125,3.12451-8.18945,0-11.31445l-38.66162-38.66113v-54.67676c0-4.41797-3.58154-8-8-8h-54.67627l-38.66211-38.66211c-3.12402-3.12305-8.18945-3.12305-11.31348,0l-38.66162,38.66211h-54.67627c-4.41846,0-8,3.58203-8,8v54.67676l-38.66211,38.66113c-3.12323,3.12425-3.12323,8.1902,0,11.31445l38.66211,38.66113v54.67676c0,4.41797,3.58154,8,8,8Zm-29.69141-106.99512l35.34814-35.34766c1.50049-1.50098,2.34326-3.53516,2.34326-5.65723v-49.99023h49.98975c2.12158,0,4.15674-.84277,5.65674-2.34277l35.34814-35.34863,35.34863,35.34863c1.5,1.5,3.53516,2.34277,5.65674,2.34277h49.98975v49.99023c0,2.12207,.84277,4.15625,2.34326,5.65723l35.34814,35.34766-35.34814,35.34766c-1.50049,1.50098-2.34326,3.53516-2.34326,5.65723v49.99023h-49.98975c-2.12158,0-4.15674,.84277-5.65674,2.34277l-35.34863,35.34863-35.34814-35.34863c-1.5-1.5-3.53516-2.34277-5.65674-2.34277h-49.98975v-49.99023c0-2.12207-.84277-4.15625-2.34326-5.65723l-35.34814-35.34766Z" stroke={stroke} strokeWidth="18" fill="none"/>
    </svg>
  )
}

function NutritionIcon({ active = false }) {
  const stroke = active ? '#fff' : '#C4B5FD'
  return (
    <svg width="26" height="26" viewBox="0 0 115 123" fill="none">
      <path d="M35.54 27.99c4.78.59 9.92-.51 15.46-3.5-.55 4.13-.59 8.62-.09 13.5-2.69-.22-5.38-.77-8.07-1.59-20.7-6.5-35.42 6.58-38.76 24.53H1.41C.53 61-.05 61.68 0 62.45L1.86 86.3c.02.76.65 1.37 1.42 1.37h4.08c.69 1.57 1.47 3.13 2.34 4.67 4.97 8.73 10.99 17.72 20.33 25.89 8.88 6.36 16.7 5.49 23.93 1.55 5.75 2.73 11.83 3.81 18.35 1.36.97-.36 1.94-.84 2.91-1.4h38.34c.41 0 .82-.18 1.1-.52.49-.6.4-1.49-.2-1.99l-12.71-10.32 12.61-9.5c.38-.25.63-.69.63-1.18 0-.78-.63-1.42-1.42-1.42H96.38c1.15-2.21 2.22-4.49 3.17-6.81h1.66c.65 0 1.24-.45 1.38-1.12l5.23-23.84c.03-.12.05-.24.05-.36 0-.78-.63-1.42-1.42-1.42h-2.67c-1.34-8.96-6.2-17.01-16.37-22.45-6.13-3.29-13.79-4.25-23.5-2.07-2.31.79-4.61 1.29-6.92 1.53-.81-7.45-.24-13.82 1.54-19.23 1.74-5.3 4.67-9.72 8.62-13.37 1.22-1.12 1.29-3.01.18-4.23-1.12-1.22-3.01-1.29-4.23-.18-4.7 4.34-8.18 9.6-10.26 15.92-.27.82-.52 1.66-.74 2.52-6-10.65-16.17-16.16-32.91-13.6l-6.56.68C17.35 16.3 23.28 26.49 35.54 27.99Z" stroke={stroke} strokeWidth="6" fill={active ? 'rgba(255,255,255,0.10)' : 'rgba(124,58,237,0.08)'} />
    </svg>
  )
}

function CheckIcon({ active = false }) {
  const fill = active ? '#8B5CF6' : 'none'
  const stroke = active ? '#fff' : '#C4B5FD'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7.2a2.2 2.2 0 0 1 2.2 -2.2h1a2.2 2.2 0 0 0 1.55 -.64l.7 -.7a2.2 2.2 0 0 1 3.12 0l.7 .7c.412 .41 .97 .64 1.55 .64h1a2.2 2.2 0 0 1 2.2 2.2v1c0 .58 .23 1.138 .64 1.55l.7 .7a2.2 2.2 0 0 1 0 3.12l-.7 .7a2.2 2.2 0 0 0 -.64 1.55v1a2.2 2.2 0 0 1 -2.2 2.2h-1a2.2 2.2 0 0 0 -1.55 .64l-.7 .7a2.2 2.2 0 0 1 -3.12 0l-.7 -.7a2.2 2.2 0 0 0 -1.55 -.64h-1a2.2 2.2 0 0 1 -2.2 -2.2v-1a2.2 2.2 0 0 0 -.64 -1.55l-.7 -.7a2.2 2.2 0 0 1 0 -3.12l.7 -.7a2.2 2.2 0 0 0 .64 -1.55v-1"/>
      <path d="M9 12l2 2l4 -4"/>
    </svg>
  )
}

function VeganIcon({ active = false }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M21 4C10 4 5 12 5 20" stroke={active ? '#fff' : '#4ADE80'} strokeWidth="1.9" strokeLinecap="round"/>
      <path d="M5 20c3-7 8-12 16-11-1 4-4 10-16 11Z" stroke={active ? '#fff' : '#4ADE80'} strokeWidth="1.9" fill={active ? 'rgba(255,255,255,0.14)' : 'rgba(74,222,128,0.14)'} />
    </svg>
  )
}

function KetoIcon({ active = false }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M12 3c4.5 0 7 3.5 7 8 0 5.5-3.5 10-7 11-3.5-1-7-5.5-7-11 0-4.5 2.5-8 7-8z" fill={active ? 'rgba(255,255,255,0.14)' : 'rgba(244,114,182,0.14)'} stroke={active ? '#fff' : '#FB7185'} strokeWidth="1.8"/>
      <circle cx="12" cy="13.5" r="3" fill={active ? '#fff' : '#FB7185'} opacity=".9"/>
    </svg>
  )
}

function KidsIcon({ active = false }) {
  const strokeA = active ? '#fff' : '#60A5FA'
  const strokeB = active ? '#fff' : '#A78BFA'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <circle cx="9" cy="8" r="2.3" fill={active ? 'rgba(255,255,255,0.14)' : 'rgba(96,165,250,0.16)'} stroke={strokeA} strokeWidth="1.6"/>
      <circle cx="15.5" cy="9.5" r="1.8" fill={active ? 'rgba(255,255,255,0.10)' : 'rgba(167,139,250,0.16)'} stroke={strokeB} strokeWidth="1.6"/>
      <path d="M5.5 18c.7-2.5 2.5-4 4.5-4s3.8 1.5 4.5 4" stroke={strokeA} strokeWidth="1.7"/>
      <path d="M13.5 18c.4-1.6 1.5-2.7 3-2.7s2.7 1.1 3 2.7" stroke={strokeB} strokeWidth="1.7"/>
    </svg>
  )
}

function VegetarianIcon({ active = false }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M12 4c4 2 6 5 6 8 0 5-4 8-6 9-2-1-6-4-6-9 0-3 2-6 6-8z" fill={active ? 'rgba(255,255,255,0.14)' : 'rgba(74,222,128,0.14)'} stroke={active ? '#fff' : '#34D399'} strokeWidth="1.8"/>
      <path d="M12 6c1.8 2.8 1.6 7.2-.3 11.2" stroke={active ? '#fff' : '#FB923C'} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function ChoiceIcon({ name, active = false }) {
  switch (name) {
    case 'scan': return <ScanIcon active={active} />
    case 'fit': return <CheckIcon active={active} />
    case 'halal': return <HalalIcon active={active} />
    case 'facts': return <NutritionIcon active={active} />
    case 'ai': return <AIIcon active={active} />
    case 'alternatives': return <AlternativeIcon active={active} />
    case 'language': return <LanguageIcon active={active} />
    case 'vegan': return <VeganIcon active={active} />
    case 'veggie': return <VegetarianIcon active={active} />
    case 'keto': return <KetoIcon active={active} />
    case 'kids': return <KidsIcon active={active} />
    case 'nosugar': return <NutritionIcon active={active} />
    case 'nodairy': return <NutritionIcon active={active} />
    case 'nogluten': return <NutritionIcon active={active} />
    default: return <CheckIcon active={active} />
  }
}

function StepHeader({ step }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '34px 1fr 34px 1fr 34px', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      {[0,1,2].map((n) => (
        <>
          <div key={`c${n}`} style={{ width: 34, height: 34, borderRadius: '50%', border: `1px solid ${step === n ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.18)'}`, background: step === n ? '#fff' : 'transparent', color: step === n ? '#0B0B12' : 'rgba(255,255,255,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>{n+1}</div>
          {n < 2 && <div key={`l${n}`} style={{ height: 1, background: 'rgba(255,255,255,0.18)' }} />}
        </>
      ))}
    </div>
  )
}

function CircleCloud({ items, labelFor, activeSet, onToggle, mode = 'show' }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, paddingTop: 8 }}>
      {items.map((item) => {
        const active = activeSet?.has?.(item.id) || false
        const size = item.size
        return (
          <button
            key={item.id}
            type="button"
            onClick={onToggle ? () => onToggle(item.id) : undefined}
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              border: active ? '1px solid rgba(139,92,246,0.66)' : '1px solid rgba(255,255,255,0.08)',
              background: active
                ? 'radial-gradient(circle at 30% 25%, rgba(139,92,246,0.44), rgba(88,28,135,0.94))'
                : 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
              boxShadow: active
                ? '0 0 0 1px rgba(139,92,246,0.15) inset, 0 14px 34px rgba(124,58,237,0.34)'
                : '0 10px 24px rgba(0,0,0,0.18)',
              transform: `translate(${item.shiftX || 0}px, ${item.shiftY || 0}px) scale(${active ? 1.04 : 1})`,
              transition: 'transform .22s ease, box-shadow .22s ease, background .22s ease, border-color .22s ease',
              cursor: onToggle ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: 14,
              color: '#fff',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <ChoiceIcon name={item.icon || item.id} active={active || mode === 'show'} />
            <div style={{ fontSize: size > 110 ? 14 : 12.5, fontWeight: 800, lineHeight: 1.15, color: '#F8F5FF' }}>{labelFor(item)}</div>
          </button>
        )
      })}
    </div>
  )
}

function LangSwitcher({ lang, onChange, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(225,225,245,0.75)' }}>{label}</span>
      <div style={{ display: 'inline-flex', padding: 4, borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {[
          ['ru', 'Рус'],
          ['kz', 'Қаз'],
        ].map(([code, text]) => (
          <button key={code} onClick={() => onChange(code)} style={{ border: 'none', cursor: 'pointer', padding: '8px 12px', borderRadius: 999, background: lang === code ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' : 'transparent', color: '#fff', fontWeight: 800, fontSize: 12 }}>
            {text}
          </button>
        ))}
      </div>
    </div>
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

  const labelForPref = (item) => (lang === 'kz' ? item.kz : item.ru)

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
    }, 150)
  }

  function prevStep() {
    setLeaving(true)
    setTimeout(() => {
      setStep((s) => Math.max(0, s - 1))
      setLeaving(false)
    }, 150)
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
    onDone?.()
    navigate('/scan')
  }

  const titles = [
    t.onboarding.step1Title,
    t.onboarding.step2Title,
    t.onboarding.step3Title,
  ]
  const subs = [
    lang === 'kz' ? 'Körset мүмкіндіктері' : 'Körset умеет',
    t.onboarding.step2Sub,
    t.onboarding.step3Sub,
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'linear-gradient(180deg, #07070E 0%, #04040A 100%)', overflowY: 'auto' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 15% 0%, rgba(124,58,237,0.18) 0%, transparent 34%), radial-gradient(circle at 100% 30%, rgba(139,92,246,0.08) 0%, transparent 30%)' }} />
      <div style={{ position: 'relative', padding: '22px 20px 30px', minHeight: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <img src="/korset_logo.svg" alt="Körset" style={{ height: 54, width: 'auto', filter: 'drop-shadow(0 10px 20px rgba(124,58,237,0.28))' }} />
          {step === 0 ? <LangSwitcher lang={lang} onChange={setLang} label={t.onboarding.langTitle} /> : <div style={{ width: 120 }} />}
        </div>

        <StepHeader step={step} />

        <div style={{ opacity: leaving ? 0 : 1, transform: leaving ? 'translateY(16px)' : 'translateY(0)', transition: 'all .28s cubic-bezier(.22,1,.36,1)' }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <h1 style={{ margin: 0, fontSize: step === 0 ? 30 : 28, lineHeight: 1.06, color: '#fff', fontWeight: 900, letterSpacing: '-0.8px' }}>{titles[step]}</h1>
            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: 'rgba(188,188,218,0.72)', letterSpacing: '.2px' }}>{subs[step]}</div>
          </div>

          {step === 0 && (
            <CircleCloud
              items={FEATURE_ITEMS.map((item) => ({ ...item, icon: item.id }))}
              labelFor={(item) => featureLabels[item.id]}
              mode="show"
            />
          )}

          {step === 1 && (
            <CircleCloud
              items={PREFERENCES}
              labelFor={labelForPref}
              activeSet={selectedPrefs}
              onToggle={(id) => toggle(setSelectedPrefs, id)}
            />
          )}

          {step === 2 && (
            <>
              <CircleCloud
                items={ALLERGENS}
                labelFor={labelForPref}
                activeSet={selectedAllergens}
                onToggle={(id) => toggle(setSelectedAllergens, id)}
              />
              <div style={{ marginTop: 18, borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', padding: 14 }}>
                <div style={{ fontSize: 12, color: 'rgba(185,185,214,0.74)', marginBottom: 8 }}>{lang === 'kz' ? 'Өз шектеуіңізді қосыңыз' : 'Добавьте своё исключение'}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={customInput} onChange={(e) => setCustomInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} placeholder={t.onboarding.customPlaceholder} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none' }} />
                  <button onClick={addCustom} style={{ padding: '0 16px', borderRadius: 14, border: '1px solid rgba(124,58,237,0.32)', background: 'rgba(124,58,237,0.16)', color: '#E9D5FF', fontWeight: 800, cursor: 'pointer' }}>{t.onboarding.add}</button>
                </div>
                {customItems.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {customItems.map((item) => (
                      <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 999, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.18)', color: '#FCA5A5', fontSize: 12 }}>
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

        <div style={{ display: 'flex', gap: 10, marginTop: 26, paddingBottom: 18 }}>
          {step > 0 && (
            <button onClick={prevStep} style={{ flex: '0 0 108px', height: 54, borderRadius: 18, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)', color: '#EDE9FE', fontWeight: 800, cursor: 'pointer' }}>{t.onboarding.back}</button>
          )}
          <button onClick={step === 2 ? finish : nextStep} style={{ flex: 1, height: 54, borderRadius: 18, border: 'none', background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: '#fff', fontSize: 16, fontWeight: 900, boxShadow: '0 10px 30px rgba(124,58,237,0.34)', cursor: 'pointer' }}>
            {step === 2 ? t.onboarding.finish : t.onboarding.next}
          </button>
        </div>
      </div>
    </div>
  )
}
