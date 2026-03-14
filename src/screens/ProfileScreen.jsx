import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadProfile, saveProfile } from '../utils/profile.js'
import { languageOptions, useI18n } from '../utils/i18n.js'

const DIET_GOAL_IDS = [
  { id: 'sugar_free', icon: 'nosugar' },
  { id: 'dairy_free', icon: 'nodairy' },
  { id: 'gluten_free', icon: 'nogluten' },
  { id: 'vegan', icon: 'vegan' },
  { id: 'vegetarian', icon: 'veggie' },
  { id: 'keto', icon: 'keto' },
  { id: 'low_calorie', icon: 'lowcal' },
]

const ALLERGEN_IDS = [
  { id: 'milk', icon: 'milk' },
  { id: 'gluten', icon: 'wheat' },
  { id: 'nuts', icon: 'nuts' },
  { id: 'peanuts', icon: 'peanut' },
  { id: 'soy', icon: 'soy' },
  { id: 'eggs', icon: 'egg' },
  { id: 'fish', icon: 'fish' },
  { id: 'shellfish', icon: 'shell' },
]

const PRIORITY_IDS = [
  { id: 'price', icon: 'price' },
  { id: 'balanced', icon: 'balance' },
  { id: 'quality', icon: 'quality' },
]

function localizeDietLabel(id, t) {
  const map = {
    sugar_free: { ru: 'Без сахара', kz: 'Қантсыз' }, dairy_free: { ru: 'Без молочки', kz: 'Сүтсіз' }, gluten_free: { ru: 'Без глютена', kz: 'Глютенсіз' },
    vegan: { ru: 'Веган', kz: 'Веган' }, vegetarian: { ru: 'Вегетарианец', kz: 'Вегетариан' }, keto: { ru: 'Кето', kz: 'Кето' }, low_calorie: { ru: 'Меньше калорий', kz: 'Калориясы аз' },
  }
  return map[id]?.[t('common.language') === 'Тіл' ? 'kz' : 'ru'] || id
}

function localizeAllergenLabel(id, lang) {
  const map = {
    milk: { ru: 'Молоко', kz: 'Сүт' }, gluten: { ru: 'Глютен', kz: 'Глютен' }, nuts: { ru: 'Орехи', kz: 'Жаңғақ' }, peanuts: { ru: 'Арахис', kz: 'Жержаңғақ' }, soy: { ru: 'Соя', kz: 'Соя' }, eggs: { ru: 'Яйца', kz: 'Жұмыртқа' }, fish: { ru: 'Рыба', kz: 'Балық' }, shellfish: { ru: 'Моллюски', kz: 'Теңіз өнімдері' },
  }
  return map[id]?.[lang] || id
}

function localizePriority(id, lang) {
  const map = {
    price: { ru: ['Цена', 'Самый дешёвый'], kz: ['Баға', 'Ең арзан'] },
    balanced: { ru: ['Баланс', 'Цена + качество'], kz: ['Теңгерім', 'Баға + сапа'] },
    quality: { ru: ['Качество', 'Лучший состав'], kz: ['Сапа', 'Ең жақсы құрам'] },
  }
  const pair = map[id]?.[lang] || [id, '']
  return { label: pair[0], desc: pair[1] }
}

function Icon({ name, size = 18 }) {
  const w = size, h = size
  switch (name) {
    case 'nosugar': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M7 11h10M9 7h6M7 15h10M5 4l14 16" stroke="#F87171" strokeWidth="1.8" strokeLinecap="round"/></svg>
    case 'nodairy': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M8 4h6l2 4v8a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8l2-4Z" stroke="#60A5FA" strokeWidth="1.8"/><path d="M5 5l14 14" stroke="#F87171" strokeWidth="1.8" strokeLinecap="round"/></svg>
    case 'nogluten': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M12 3c0 6-3 8-3 12a3 3 0 0 0 6 0c0-4-3-6-3-12Z" stroke="#FBBF24" strokeWidth="1.8"/><path d="M5 5l14 14" stroke="#F87171" strokeWidth="1.8" strokeLinecap="round"/></svg>
    case 'vegan': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M6 13c4.5-.2 6.6-2.7 8-7 3.6 1.2 5 4.6 4 8-1.3 4-6.1 6.2-10.3 4.9C5.3 18.2 4 16.1 4 14" stroke="#34D399" strokeWidth="1.8"/></svg>
    case 'veggie': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M12 20c4-2.5 6-5.5 6-9a6 6 0 0 0-12 0c0 3.5 2 6.5 6 9Z" stroke="#A3E635" strokeWidth="1.8"/></svg>
    case 'keto': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#F59E0B" strokeWidth="1.8"/><path d="M12 7v10M9 10.5h6" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round"/></svg>
    case 'lowcal': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M13 3L6 14h5l-1 7 8-11h-5l0-7Z" fill="#FBBF24" opacity="0.28" stroke="#FBBF24" strokeWidth="1.4"/></svg>
    case 'milk': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M8 3h7l2 4v9a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V7l1-4Z" stroke="#93C5FD" strokeWidth="1.8"/></svg>
    case 'wheat': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M12 3v18M9 7l3 2 3-2M8 11l4 2 4-2M8 15l4 2 4-2" stroke="#FCD34D" strokeWidth="1.8"/></svg>
    case 'nuts': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M8 9a4 4 0 1 1 8 0v4a4 4 0 1 1-8 0V9Z" stroke="#F9A8D4" strokeWidth="1.8"/></svg>
    case 'peanut': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M9 6c-2 1-3 3-3 5s1 4 3 5m6-10c2 1 3 3 3 5s-1 4-3 5M9 6c1 0 2 1 3 2 1-1 2-2 3-2" stroke="#D6A35D" strokeWidth="1.8" strokeLinecap="round"/></svg>
    case 'soy': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M7 15c0-5 4-8 10-9 0 6-3 10-8 10-1 0-2-.3-2-1Z" stroke="#22C55E" strokeWidth="1.8"/></svg>
    case 'egg': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M12 4c3 2.8 5 6 5 9a5 5 0 0 1-10 0c0-3 2-6.2 5-9Z" stroke="#FDE68A" strokeWidth="1.8"/></svg>
    case 'fish': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M4 12c2.5-3.5 6-5 10-5 2.2 0 4.2.5 6 1.8-1.8 1.3-3.8 3.7-6 5-4 0-7.5-1.5-10-5Z" stroke="#60A5FA" strokeWidth="1.8"/><circle cx="17.5" cy="9.5" r="1" fill="#60A5FA"/></svg>
    case 'shell': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M16 4c2 1.5 3 4 2 7l-2 3-3 2-2 4" stroke="#F9A8D4" strokeWidth="1.8" strokeLinecap="round"/></svg>
    case 'price': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="#34D399" opacity="0.15" stroke="#34D399" strokeWidth="1.8"/><path d="M12 6v1.5M12 16.5V18" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round"/><path d="M9.5 9.5c0-1.1.9-2 2.5-2s2.5.9 2.5 2c0 2.5-5 2.5-5 5 0 1.1.9 2 2.5 2s2.5-.9 2.5-2" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round"/></svg>
    case 'balance': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M12 3v18M4 7h16" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round"/><path d="M5 7L2 13h6l-3-6zM19 7l3 6h-6l3-6z" fill="#A78BFA" opacity="0.25" stroke="#A78BFA" strokeWidth="1.6"/></svg>
    case 'quality': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none"><path d="M12 2l2.5 7.5H22l-6.5 4.7 2.5 7.5L12 17l-6 4.7 2.5-7.5L2 9.5h7.5L12 2z" fill="#FCD34D" opacity="0.3" stroke="#FCD34D" strokeWidth="1.8"/></svg>
    default: return null
  }
}

export default function ProfileScreen() {
  const navigate = useNavigate()
  const { t, lang, setLang } = useI18n()
  const [profile, setProfile] = useState(() => {
    const s = loadProfile()
    return { halal: s.halal || s.halalOnly || false, dietGoals: s.dietGoals || [], allergens: s.allergens || [], customAllergens: s.customAllergens || [], priority: s.priority || 'balanced', lang: s.lang || lang }
  })
  const [allergenInput, setAllergenInput] = useState('')

  useEffect(() => { saveProfile({ ...profile, presetId: 'custom', lang }) }, [profile, lang])

  const toggleDiet = id => setProfile(p => ({ ...p, dietGoals: p.dietGoals.includes(id) ? p.dietGoals.filter(x => x !== id) : [...p.dietGoals, id] }))
  const toggleAllergen = id => setProfile(p => ({ ...p, allergens: p.allergens.includes(id) ? p.allergens.filter(x => x !== id) : [...p.allergens, id] }))
  const addCustom = () => { const val = allergenInput.trim(); if (!val || profile.customAllergens.includes(val)) return; setProfile(p => ({ ...p, customAllergens: [...p.customAllergens, val] })); setAllergenInput('') }
  const removeCustom = val => setProfile(p => ({ ...p, customAllergens: p.customAllergens.filter(x => x !== val) }))
  const activeCount = profile.dietGoals.length + profile.allergens.length + profile.customAllergens.length + (profile.halal ? 1 : 0)

  return (
    <div className="screen" style={{ paddingTop: 0, overflowX: 'hidden' }}>
      <div style={{ background: 'linear-gradient(180deg, rgba(124,58,237,0.2) 0%, transparent 100%)', borderBottom: '1px solid var(--border)', position: 'relative', overflow: 'hidden', paddingTop: 44 }}>
        <img src="/logo.png" alt="Körset" style={{ width: '60%', margin: '0 auto', display: 'block', objectFit: 'contain', filter: 'drop-shadow(0 0 48px rgba(139,92,246,0.95))' }} />
        <p style={{ color: 'rgba(180,175,210,0.85)', fontSize: 13, lineHeight: 1.6, textAlign: 'center', padding: '4px 24px 18px', margin: 0 }}>{t('profile.hero')}</p>
      </div>

      <div style={{ padding: '18px 20px 4px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 10 }}>{t('profile.prefsLanguage')}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {languageOptions.map(option => {
            const active = lang === option.id
            return <button key={option.id} onClick={() => setLang(option.id)} style={{ flex: 1, padding: '12px 14px', borderRadius: 14, border: `1.5px solid ${active ? 'var(--primary-mid)' : 'var(--border)'}`, background: active ? 'rgba(124,58,237,0.1)' : 'var(--card)', color: active ? 'var(--primary-bright)' : 'rgba(210,210,240,0.95)', fontWeight: 700, cursor: 'pointer' }}>{t(option.labelKey)}</button>
          })}
        </div>
      </div>

      <div style={{ padding: '20px 20px 8px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 10 }}>{t('profile.religious')}</div>
        <div onClick={() => setProfile(p => ({ ...p, halal: !p.halal }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: profile.halal ? 'rgba(124,58,237,0.1)' : 'var(--card)', border: `1.5px solid ${profile.halal ? 'var(--primary-mid)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '14px 16px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: profile.halal ? 'var(--primary-dim)' : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={profile.halal ? 'var(--primary-bright)' : 'var(--text-dim)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.2A8.5 8.5 0 1 1 11.8 3a7 7 0 1 0 9.2 9.2Z"/><path d="M16.5 7.5l.6 1.6 1.7.1-1.3 1 .5 1.7-1.5-.9-1.5.9.5-1.7-1.3-1 1.7-.1.6-1.6Z"/></svg></div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t('profile.halalOnly')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>{t('profile.halalOnlySub')}</div>
            </div>
          </div>
          <div style={{ width: 46, height: 26, borderRadius: 13, background: profile.halal ? 'var(--primary)' : 'var(--border-bright)', position: 'relative', flexShrink: 0, boxShadow: profile.halal ? '0 0 10px var(--primary-glow)' : 'none' }}><span style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: 'white', top: 3, left: profile.halal ? 23 : 3, transition: 'left 0.2s cubic-bezier(0.34,1.3,0.64,1)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} /></div>
        </div>
      </div>

      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>{t('profile.dietPrefs')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', opacity: 0.6, marginTop: 3 }}>{t('profile.dietHint')}</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {DIET_GOAL_IDS.map(d => {
            const active = profile.dietGoals.includes(d.id)
            const label = localizeDietLabel(d.id, t)
            return <button key={d.id} onClick={() => toggleDiet(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, border: `1.5px solid ${active ? 'var(--primary-mid)' : 'var(--border)'}`, background: active ? 'rgba(124,58,237,0.1)' : 'var(--card)', cursor: 'pointer' }}><div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: active ? 'var(--primary-dim)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={d.icon} size={16} /></div><span style={{ fontSize: 13, fontWeight: 500, color: active ? 'var(--primary-bright)' : 'rgba(210,210,240,0.95)', lineHeight: 1.3 }}>{label}</span>{active && <div style={{ marginLeft: 'auto', width: 16, height: 16, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white' }}>✓</div>}</button>
          })}
        </div>
      </div>

      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>{t('profile.allergens')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', opacity: 0.6, marginTop: 3 }}>{t('profile.allergensHint')}</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
          {ALLERGEN_IDS.map(a => {
            const active = profile.allergens.includes(a.id)
            return <button key={a.id} onClick={() => toggleAllergen(a.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '12px 6px', borderRadius: 14, position: 'relative', border: `1.5px solid ${active ? 'rgba(239,68,68,0.55)' : 'var(--border)'}`, background: active ? 'rgba(239,68,68,0.08)' : 'var(--card)', cursor: 'pointer' }}><div style={{ width: 34, height: 34, borderRadius: 10, background: active ? 'rgba(239,68,68,0.16)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={a.icon} size={18} /></div><span style={{ fontSize: 11, textAlign: 'center', lineHeight: 1.2, color: active ? '#FCA5A5' : 'rgba(210,210,240,0.85)' }}>{localizeAllergenLabel(a.id, lang)}</span>{active && <div style={{ position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: '50%', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 800 }}>✕</div>}</button>
          })}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{t('profile.customHint')}</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input value={allergenInput} onChange={(e) => setAllergenInput(e.target.value)} placeholder={t('profile.customPlaceholder')} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none' }} />
          <button onClick={addCustom} style={{ padding: '0 16px', borderRadius: 14, border: '1px solid rgba(124,58,237,0.35)', background: 'rgba(124,58,237,0.1)', color: '#E9D5FF', fontWeight: 700, cursor: 'pointer' }}>+ {t('common.add')}</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {profile.customAllergens.map((val) => <div key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 999, background: 'rgba(239,68,68,0.08)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12 }}>⚠️ {val}<span onClick={() => removeCustom(val)} style={{ cursor: 'pointer', opacity: 0.7, fontSize: 15 }}>×</span></div>)}
        </div>
      </div>

      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 10 }}>{t('profile.priority')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
          {PRIORITY_IDS.map(item => {
            const active = profile.priority === item.id
            const localized = localizePriority(item.id, lang)
            return <button key={item.id} onClick={() => setProfile(p => ({ ...p, priority: item.id }))} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, border: `1.5px solid ${active ? 'var(--primary-mid)' : 'var(--border)'}`, background: active ? 'rgba(124,58,237,0.1)' : 'var(--card)', cursor: 'pointer' }}><div style={{ width: 36, height: 36, borderRadius: 12, background: active ? 'var(--primary-dim)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={item.icon} size={18} /></div><div style={{ textAlign: 'left' }}><div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>{localized.label}</div><div style={{ color: 'var(--text-dim)', fontSize: 12 }}>{localized.desc}</div></div></button>
          })}
        </div>
      </div>

      <div style={{ padding: '18px 20px 24px' }}>
        <div style={{ padding: '14px 16px', borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)' }}>{t('profile.activeFilters', { count: activeCount })}</span><button onClick={() => setProfile({ halal: false, dietGoals: [], allergens: [], customAllergens: [], priority: 'balanced', lang })} style={{ border: 'none', background: 'transparent', color: 'var(--primary-bright)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>{t('common.reset')}</button></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {profile.halal && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'var(--primary-dim)', color: 'var(--primary-bright)', border: '1px solid rgba(139,92,246,0.2)' }}>{t('onboarding.halalLabel')}</span>}
            {profile.dietGoals.map(id => <span key={id} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'rgba(220,220,240,0.85)' }}>{localizeDietLabel(id, t)}</span>)}
            {profile.allergens.map(id => <span key={id} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.08)', color: '#FCA5A5' }}>{localizeAllergenLabel(id, lang)}</span>)}
            {profile.customAllergens.map(id => <span key={id} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.08)', color: '#FCA5A5' }}>{id}</span>)}
          </div>
        </div>

        <button onClick={() => navigate('/catalog')} style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: '#fff', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 10 }}><span>{t('profile.showProducts')}</span></button>
        <button onClick={() => navigate('/qr-print')} style={{ width: '100%', padding: '14px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}>{t('profile.scanQr')}</button>
      </div>
    </div>
  )
}
