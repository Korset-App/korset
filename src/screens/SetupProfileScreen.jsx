import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useI18n } from '../utils/i18n.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { AVATAR_PRESETS } from '../data/avatarPresets.js'
import ProfileAvatar from '../components/ProfileAvatar.jsx'

const stepCount = 2

const compressImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = (event) => {
    const img = new Image()
    img.src = event.target.result
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX = 640
      let { width, height } = img
      const ratio = width > height ? MAX / width : MAX / height
      if (ratio < 1) {
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.86)
    }
    img.onerror = reject
  }
  reader.onerror = reject
})

function SurfaceCard({ children, style }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 24,
      boxShadow: '0 20px 40px rgba(0,0,0,0.24)',
      ...style,
    }}>{children}</div>
  )
}

function AvatarChoice({ selected, onClick, children }) {
  return (
    <button type="button" onClick={onClick} style={{
      appearance: 'none', background: 'transparent', border: 'none', padding: 0,
      aspectRatio: '1 / 1', cursor: 'pointer', position: 'relative', overflow: 'visible'
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 20,
        background: 'rgba(255,255,255,0.03)',
        border: selected ? '2px solid #8B5CF6' : '1px solid rgba(255,255,255,0.09)',
        boxShadow: selected ? '0 12px 28px rgba(124,58,237,0.22)' : 'none',
        overflow: 'hidden',
      }}>
        {children}
      </div>
      {selected && (
        <div style={{
          position: 'absolute', right: -7, bottom: -7,
          width: 28, height: 28, borderRadius: '50%',
          background: '#10B981', border: '3px solid #0F0F18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 18px rgba(16,185,129,0.28)',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06110d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      )}
    </button>
  )
}

function AvatarGrid({ fileInputRef, uploadingAvatar, texts, customAvatarUrl, selectedAvatarId, setSelectedAvatarId, handleFileChange, name }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{
          appearance: 'none', border: '1px dashed rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.03)',
          borderRadius: 20, aspectRatio: '1 / 1', cursor: 'pointer', position: 'relative', padding: 0,
        }}>
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'rgba(255,255,255,0.76)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{uploadingAvatar ? '...' : texts.gallery}</div>
          </div>
        </button>

        {customAvatarUrl && (
          <AvatarChoice selected={selectedAvatarId === 'custom'} onClick={() => setSelectedAvatarId('custom')}>
            <ProfileAvatar avatarId={customAvatarUrl} name={name} rounded="square" />
          </AvatarChoice>
        )}

        {AVATAR_PRESETS.map((avatar) => (
          <AvatarChoice key={avatar.id} selected={selectedAvatarId === avatar.id} onClick={() => setSelectedAvatarId(avatar.id)}>
            <ProfileAvatar avatarId={avatar.id} name={name} rounded="square" />
          </AvatarChoice>
        ))}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
    </>
  )
}

export default function SetupProfileScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentStore } = useStore()
  const { user } = useAuth()
  const { lang } = useI18n()
  const fileInputRef = useRef(null)

  const editMode = searchParams.get('mode') === 'edit'
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [selectedAvatarId, setSelectedAvatarId] = useState(AVATAR_PRESETS[0].id)
  const [customAvatarUrl, setCustomAvatarUrl] = useState(null)

  useEffect(() => {
    if (!user) return
    const currentName = user.user_metadata?.full_name || ''
    const currentAvatar = user.user_metadata?.avatar_id || user.user_metadata?.avatar_url || user.user_metadata?.picture || AVATAR_PRESETS[0].id
    setName(currentName)
    if (typeof currentAvatar === 'string' && /^https?:/i.test(currentAvatar)) {
      setCustomAvatarUrl(currentAvatar)
      setSelectedAvatarId('custom')
    } else {
      setSelectedAvatarId(currentAvatar || AVATAR_PRESETS[0].id)
    }
  }, [user])

  const backTarget = currentStore ? `/s/${currentStore.slug}/profile` : '/profile'
  const canContinueName = name.trim().length >= 2 && !nameError
  const hasAvatar = selectedAvatarId === 'custom' ? Boolean(customAvatarUrl) : Boolean(selectedAvatarId)
  const progress = (step / stepCount) * 100

  const texts = useMemo(() => ({
    setupTitle: lang === 'kz' ? 'Профильді аяқтау' : 'Завершите профиль',
    setupSubtitle: lang === 'kz' ? 'Атыңызды және аватарыңызды баптаңыз' : 'Укажите имя и выберите аватар',
    editTitle: lang === 'kz' ? 'Профильді өңдеу' : 'Редактировать профиль',
    nameLabel: lang === 'kz' ? 'Аты немесе лақап аты' : 'Имя или псевдоним',
    namePlaceholder: lang === 'kz' ? 'Атыңызды енгізіңіз' : 'Введите имя',
    avatarTitle: lang === 'kz' ? 'Аватар' : 'Аватар',
    avatarSubtitle: lang === 'kz' ? 'Фото жүктеңіз немесе дайын нұсқаны таңдаңыз' : 'Загрузите фото или выберите готовый вариант',
    save: lang === 'kz' ? 'Сақтау' : 'Сохранить',
    continue: lang === 'kz' ? 'Жалғастыру' : 'Продолжить',
    finish: lang === 'kz' ? 'Дайын' : 'Готово',
    gallery: lang === 'kz' ? 'Галерея' : 'Галерея',
    invalid: lang === 'kz' ? 'Тек әріптер, сандар және бос орын' : 'Только буквы, цифры и пробелы',
  }), [lang])

  const goBack = () => {
    if (editMode) {
      navigate(backTarget)
      return
    }
    if (step > 1) setStep((s) => s - 1)
    else navigate(backTarget)
  }

  const handleNameChange = (event) => {
    const value = event.target.value
    const regex = /^[a-zA-Zа-яА-ЯәіңғүұқөһӘІҢҒҮҰҚӨҺ0-9\s]*$/
    setName(value)
    setNameError(regex.test(value) ? '' : texts.invalid)
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    try {
      const compressed = await compressImage(file)
      const fileName = `${user.id}-${Date.now()}.jpg`
      const { error } = await supabase.storage.from('avatars').upload(fileName, compressed, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      setCustomAvatarUrl(data.publicUrl)
      setSelectedAvatarId('custom')
    } catch (error) {
      alert(error.message || 'Ошибка загрузки фото')
    } finally {
      setUploadingAvatar(false)
      if (event.target) event.target.value = ''
    }
  }

  const saveProfile = async () => {
    if (!user || !name.trim() || nameError || !hasAvatar) return
    setLoading(true)
    try {
      const avatarValue = selectedAvatarId === 'custom' ? customAvatarUrl : selectedAvatarId
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: name.trim(),
          avatar_id: avatarValue,
          profile_setup_done: true,
        },
      })
      if (error) throw error
      navigate(backTarget, { replace: true })
    } catch (error) {
      alert(error.message || 'Не удалось сохранить профиль')
    } finally {
      setLoading(false)
    }
  }

  const onPrimaryAction = () => {
    if (editMode) {
      saveProfile()
      return
    }
    if (step === 1) {
      if (!canContinueName) return
      setStep(2)
      return
    }
    saveProfile()
  }

  if (editMode) {
    return (
      <div className="screen" style={{ background: '#07070F', paddingTop: 0, paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }}>
        <div style={{ padding: 'max(20px, env(safe-area-inset-top)) 20px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
            <button onClick={goBack} style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{texts.editTitle}</h1>
          </div>

          <SurfaceCard style={{ padding: 22, marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#A78BFA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{texts.nameLabel}</div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${nameError ? 'rgba(248,113,113,0.45)' : 'rgba(255,255,255,0.09)'}`, borderRadius: 18, padding: '15px 16px' }}>
              <input value={name} onChange={handleNameChange} maxLength={24} placeholder={texts.namePlaceholder} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }} />
            </div>
            <div style={{ minHeight: 20, paddingTop: 10, fontSize: 12, color: nameError ? '#FCA5A5' : 'rgba(255,255,255,0.28)' }}>{nameError || `${name.trim().length}/24`}</div>
          </SurfaceCard>

          <SurfaceCard style={{ padding: 22, marginBottom: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#A78BFA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{texts.avatarTitle}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.48)', lineHeight: 1.5, marginBottom: 18 }}>{texts.avatarSubtitle}</div>
            <AvatarGrid
              fileInputRef={fileInputRef}
              uploadingAvatar={uploadingAvatar}
              texts={texts}
              customAvatarUrl={customAvatarUrl}
              selectedAvatarId={selectedAvatarId}
              setSelectedAvatarId={setSelectedAvatarId}
              handleFileChange={handleFileChange}
              name={name}
            />
          </SurfaceCard>

          <button onClick={onPrimaryAction} disabled={loading || !canContinueName || !hasAvatar} style={{
            width: '100%', height: 56, borderRadius: 18, border: 'none', cursor: loading ? 'default' : 'pointer',
            background: loading || !canContinueName || !hasAvatar ? 'rgba(139,92,246,0.35)' : '#7C3AED',
            color: '#fff', fontSize: 16, fontWeight: 700, boxShadow: loading ? 'none' : '0 18px 36px rgba(124,58,237,0.24)'
          }}>
            {loading ? '...' : texts.save}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen" style={{ background: '#07070F', paddingTop: 0, paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
      <div style={{ padding: 'max(20px, env(safe-area-inset-top)) 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <button onClick={goBack} style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{ minWidth: 96, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#A78BFA', letterSpacing: '0.12em' }}>{lang === 'kz' ? `${step} / ${stepCount}` : `ШАГ ${step} ИЗ ${stepCount}`}</div>
          </div>
          <div style={{ width: 42 }} />
        </div>

        <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#8B5CF6', transition: 'width 0.25s ease' }} />
        </div>

        {step === 1 ? (
          <SurfaceCard style={{ padding: 24, marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#A78BFA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>{texts.nameLabel}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: 10 }}>{texts.setupTitle}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.48)', lineHeight: 1.5, marginBottom: 18 }}>{texts.setupSubtitle}</div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${nameError ? 'rgba(248,113,113,0.45)' : 'rgba(255,255,255,0.09)'}`, borderRadius: 18, padding: '16px 18px' }}>
              <input value={name} onChange={handleNameChange} maxLength={24} placeholder={texts.namePlaceholder} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }} />
            </div>
            <div style={{ minHeight: 22, paddingTop: 10, fontSize: 12, color: nameError ? '#FCA5A5' : 'rgba(255,255,255,0.28)' }}>{nameError || `${name.trim().length}/24`}</div>
          </SurfaceCard>
        ) : (
          <SurfaceCard style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#A78BFA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>{texts.avatarTitle}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: 10 }}>{lang === 'kz' ? 'Аватарды таңдаңыз' : 'Выберите аватар'}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.48)', lineHeight: 1.5, marginBottom: 18 }}>{texts.avatarSubtitle}</div>
            <AvatarGrid
              fileInputRef={fileInputRef}
              uploadingAvatar={uploadingAvatar}
              texts={texts}
              customAvatarUrl={customAvatarUrl}
              selectedAvatarId={selectedAvatarId}
              setSelectedAvatarId={setSelectedAvatarId}
              handleFileChange={handleFileChange}
              name={name}
            />
          </SurfaceCard>
        )}

        <button onClick={onPrimaryAction} disabled={loading || (step === 1 ? !canContinueName : !hasAvatar)} style={{
          width: '100%', height: 56, borderRadius: 18, border: 'none', cursor: loading ? 'default' : 'pointer',
          background: loading || (step === 1 ? !canContinueName : !hasAvatar) ? 'rgba(139,92,246,0.35)' : '#7C3AED',
          color: '#fff', fontSize: 16, fontWeight: 700, boxShadow: loading ? 'none' : '0 18px 36px rgba(124,58,237,0.24)'
        }}>
          {loading ? '...' : step === 1 ? texts.continue : texts.finish}
        </button>
      </div>
    </div>
  )
}
