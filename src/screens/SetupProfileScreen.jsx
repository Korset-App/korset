/* global FileReader, Image */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import {
  getOrCreateDeviceId,
  writeCachedProfileAvatar,
  writeCachedProfileName,
} from '../utils/userIdentity.js'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { AVATAR_PRESETS } from '../constants/avatarPresets.js'
import ProfileAvatar from '../components/ProfileAvatar.jsx'

const stepCount = 2

const compressImage = (file) =>
  new Promise((resolve, reject) => {
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
    <div
      style={{
        background: 'var(--glass-muted)',
        border: '1px solid var(--glass-soft-border)',
        borderRadius: 24,
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function AvatarChoice({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: 'none',
        background: 'transparent',
        border: 'none',
        padding: 0,
        aspectRatio: '1 / 1',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 20,
          background: 'var(--image-bg)',
          border: selected ? '2px solid var(--primary-mid)' : '1px solid var(--glass-soft-border)',
          boxShadow: selected ? '0 12px 28px var(--primary-glow)' : 'none',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
      {selected && (
        <div
          style={{
            position: 'absolute',
            right: -7,
            bottom: -7,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--success-bright)',
            border: '3px solid var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(16,185,129,0.28)',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#06110d"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </button>
  )
}

function AvatarGrid({
  fileInputRef,
  uploadingAvatar,
  t,
  customAvatarUrl,
  selectedAvatarId,
  setSelectedAvatarId,
  handleFileChange,
  name,
}) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            appearance: 'none',
            border: '1px dashed var(--glass-border)',
            background: 'var(--glass-subtle)',
            borderRadius: 20,
            aspectRatio: '1 / 1',
            cursor: 'pointer',
            position: 'relative',
            padding: 0,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 10,
              color: 'var(--text-soft)',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'var(--glass-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>
              {uploadingAvatar ? '...' : t('profileSetup.gallery')}
            </div>
          </div>
        </button>

        {customAvatarUrl && (
          <AvatarChoice
            selected={selectedAvatarId === 'custom'}
            onClick={() => setSelectedAvatarId('custom')}
          >
            <ProfileAvatar avatarId={customAvatarUrl} name={name} rounded="square" />
          </AvatarChoice>
        )}

        {AVATAR_PRESETS.map((avatar) => (
          <AvatarChoice
            key={avatar.id}
            selected={selectedAvatarId === avatar.id}
            onClick={() => setSelectedAvatarId(avatar.id)}
          >
            <ProfileAvatar avatarId={avatar.id} name={name} rounded="square" />
          </AvatarChoice>
        ))}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </>
  )
}

function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

async function updateAuthUserWithRetry(payload, retries = 1) {
  let lastError = null
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { error } = await supabase.auth.updateUser({ data: payload })
    if (!error) return
    lastError = error
    if (!/lock request|lock is aborted/i.test(error.message || '') || attempt === retries) break
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw lastError || new Error('auth_update_failed')
}

export default function SetupProfileScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentStore } = useStore()
  const { user, displayName, avatarId, refreshAccountProfile, applyProfileSnapshot } = useAuth()
  const { t } = useI18n()
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
    const currentName =
      displayName || user.user_metadata?.full_name || user.user_metadata?.name || ''
    const currentAvatar =
      avatarId ||
      user.user_metadata?.avatar_id ||
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      AVATAR_PRESETS[0].id
    if (currentName !== name) setName(currentName)
    if (typeof currentAvatar === 'string' && /^https?:/i.test(currentAvatar)) {
      setCustomAvatarUrl(currentAvatar)
      if (selectedAvatarId !== 'custom') setSelectedAvatarId('custom')
    } else {
      const targetId = currentAvatar || AVATAR_PRESETS[0].id
      if (selectedAvatarId !== targetId) setSelectedAvatarId(targetId)
    }
  }, [user, displayName, avatarId, name, selectedAvatarId])

  const backTarget = currentStore ? `/s/${currentStore.slug}/profile` : '/profile'
  const canContinueName = name.trim().length >= 3 && !nameError
  const hasAvatar =
    selectedAvatarId === 'custom' ? Boolean(customAvatarUrl) : Boolean(selectedAvatarId)
  const progress = (step / stepCount) * 100

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
    if (!regex.test(value)) {
      setNameError(t('profileSetup.invalid'))
      return
    }
    if (value.trim().length > 0 && value.trim().length < 3) {
      setNameError(t('profileSetup.minName'))
      return
    }
    setNameError('')
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    try {
      const compressed = await compressImage(file)
      const fileName = `${user.id}-${Date.now()}.jpg`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressed, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      setCustomAvatarUrl(data.publicUrl)
      setSelectedAvatarId('custom')
    } catch (error) {
      alert(error.message || t('common.photoUploadError'))
    } finally {
      setUploadingAvatar(false)
      if (event.target) event.target.value = ''
    }
  }

  const saveProfile = async () => {
    const trimmedName = name.trim()
    if (!user || !trimmedName || nameError || !hasAvatar) return
    setLoading(true)
    const avatarValue = selectedAvatarId === 'custom' ? customAvatarUrl : selectedAvatarId
    const deviceId = getOrCreateDeviceId()

    try {
      const { error: userRowError } = await withTimeout(
        supabase.from('users').upsert(
          {
            auth_id: user.id,
            device_id: deviceId,
            name: trimmedName,
          },
          { onConflict: 'auth_id' }
        ),
        8000
      )
      if (userRowError) throw userRowError

      await withTimeout(
        updateAuthUserWithRetry({
          full_name: trimmedName,
          avatar_id: avatarValue,
          profile_setup_done: true,
        }),
        8000
      )

      writeCachedProfileName(user.id, trimmedName)
      writeCachedProfileAvatar(user.id, avatarValue)
      applyProfileSnapshot(user.id, { name: trimmedName, avatarId: avatarValue })

      refreshAccountProfile(user).catch((error) => {
        console.warn('Background profile refresh failed', error)
      })

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
      <div
        className="screen"
        style={{
          background: 'var(--bg-app)',
          paddingTop: 0,
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        }}
      >
        <div style={{ padding: 'max(20px, env(safe-area-inset-top)) 20px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
            <button
              onClick={goBack}
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: 'var(--glass-muted)',
                border: '1px solid var(--glass-soft-border)',
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--text)',
                letterSpacing: '-0.02em',
              }}
            >
              {t('profileSetup.editTitle')}
            </h1>
          </div>

          <SurfaceCard style={{ padding: 22, marginBottom: 18 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--primary-bright)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              {t('profileSetup.nameLabel')}
            </div>
            <div
              style={{
                background: 'var(--input-bg)',
                border: `1px solid ${nameError ? 'rgba(248,113,113,0.45)' : 'var(--input-border)'}`,
                borderRadius: 18,
                padding: '15px 16px',
              }}
            >
              <input
                value={name}
                onChange={handleNameChange}
                maxLength={24}
                placeholder={t('profileSetup.namePlaceholder')}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                }}
              />
            </div>
            <div
              style={{
                minHeight: 20,
                paddingTop: 10,
                fontSize: 12,
                color: nameError ? 'var(--error-bright)' : 'var(--text-disabled)',
              }}
            >
              {nameError || `${name.trim().length}/24`}
            </div>
          </SurfaceCard>

          <SurfaceCard style={{ padding: 22, marginBottom: 22 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--primary-bright)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              {t('profileSetup.avatarTitle')}
            </div>
            <div
              style={{
                fontSize: 14,
                color: 'var(--text-faint)',
                lineHeight: 1.5,
                marginBottom: 18,
              }}
            >
              {t('profileSetup.avatarSubtitle')}
            </div>
            <AvatarGrid
              fileInputRef={fileInputRef}
              uploadingAvatar={uploadingAvatar}
              t={t}
              customAvatarUrl={customAvatarUrl}
              selectedAvatarId={selectedAvatarId}
              setSelectedAvatarId={setSelectedAvatarId}
              handleFileChange={handleFileChange}
              name={name}
            />
          </SurfaceCard>

          <button
            onClick={onPrimaryAction}
            disabled={loading || !canContinueName || !hasAvatar}
            style={{
              width: '100%',
              height: 56,
              borderRadius: 18,
              border: 'none',
              cursor: loading ? 'default' : 'pointer',
              background:
                loading || !canContinueName || !hasAvatar ? 'var(--primary-dim)' : 'var(--primary)',
              color: 'var(--text-inverse)',
              fontSize: 16,
              fontWeight: 700,
              boxShadow: loading ? 'none' : '0 18px 36px var(--primary-glow)',
            }}
          >
            {loading ? '...' : t('profileSetup.save')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="screen"
      style={{
        background: 'var(--bg-app)',
        paddingTop: 0,
        paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
      }}
    >
      <div style={{ padding: 'max(20px, env(safe-area-inset-top)) 20px 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <button
            onClick={goBack}
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: 'var(--glass-muted)',
              border: '1px solid var(--glass-soft-border)',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div style={{ minWidth: 96, textAlign: 'center' }}>
            <div
              style={{ fontSize: 12, fontWeight: 700, color: '#A78BFA', letterSpacing: '0.12em' }}
            >
              {t('profileSetup.stepOf', { step, stepCount })}
            </div>
          </div>
          <div style={{ width: 42 }} />
        </div>

        <div
          style={{
            height: 4,
            borderRadius: 999,
            background: 'var(--glass-bg)',
            overflow: 'hidden',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'var(--primary-mid)',
              transition: 'width 0.25s ease',
            }}
          />
        </div>

        {step === 1 ? (
          <SurfaceCard style={{ padding: 24, marginBottom: 18 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--primary-bright)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              {t('profileSetup.nameLabel')}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: 'var(--text)',
                lineHeight: 1.15,
                marginBottom: 10,
              }}
            >
              {t('profileSetup.setupTitle')}
            </div>
            <div
              style={{
                fontSize: 14,
                color: 'var(--text-faint)',
                lineHeight: 1.5,
                marginBottom: 18,
              }}
            >
              {t('profileSetup.setupSubtitle')}
            </div>
            <div
              style={{
                background: 'var(--input-bg)',
                border: `1px solid ${nameError ? 'rgba(248,113,113,0.45)' : 'var(--input-border)'}`,
                borderRadius: 18,
                padding: '16px 18px',
              }}
            >
              <input
                value={name}
                onChange={handleNameChange}
                maxLength={24}
                placeholder={t('profileSetup.namePlaceholder')}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                }}
              />
            </div>
            <div
              style={{
                minHeight: 22,
                paddingTop: 10,
                fontSize: 12,
                color: nameError ? 'var(--error-bright)' : 'var(--text-disabled)',
              }}
            >
              {nameError || `${name.trim().length}/24`}
            </div>
          </SurfaceCard>
        ) : (
          <SurfaceCard style={{ padding: 24, marginBottom: 24 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--primary-bright)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              {t('profileSetup.avatarTitle')}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: 'var(--text)',
                lineHeight: 1.15,
                marginBottom: 10,
              }}
            >
              {t('profileSetup.chooseAvatar')}
            </div>
            <div
              style={{
                fontSize: 14,
                color: 'var(--text-faint)',
                lineHeight: 1.5,
                marginBottom: 18,
              }}
            >
              {t('profileSetup.avatarSubtitle')}
            </div>
            <AvatarGrid
              fileInputRef={fileInputRef}
              uploadingAvatar={uploadingAvatar}
              t={t}
              customAvatarUrl={customAvatarUrl}
              selectedAvatarId={selectedAvatarId}
              setSelectedAvatarId={setSelectedAvatarId}
              handleFileChange={handleFileChange}
              name={name}
            />
          </SurfaceCard>
        )}

        <button
          onClick={onPrimaryAction}
          disabled={loading || (step === 1 ? !canContinueName : !hasAvatar)}
          style={{
            width: '100%',
            height: 56,
            borderRadius: 18,
            border: 'none',
            cursor: loading ? 'default' : 'pointer',
            background:
              loading || (step === 1 ? !canContinueName : !hasAvatar)
                ? 'var(--primary-dim)'
                : 'var(--primary)',
            color: 'var(--text-inverse)',
            fontSize: 16,
            fontWeight: 700,
            boxShadow: loading ? 'none' : '0 18px 36px rgba(124,58,237,0.24)',
          }}
        >
          {loading ? '...' : step === 1 ? t('profileSetup.continue') : t('profileSetup.finish')}
        </button>
      </div>
    </div>
  )
}
