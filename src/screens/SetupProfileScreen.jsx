import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import {
  getOrCreateDeviceId,
  writeCachedProfileAvatar,
  writeCachedProfileBanner,
  writeCachedProfileName,
} from '../utils/userIdentity.js'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { AVATAR_PRESETS } from '../constants/avatarPresets.js'
import { BANNER_PRESETS, resolveBannerSrc } from '../constants/bannerPresets.js'
import { compressAvatar, compressBanner, validateImageFile } from '../utils/imageCompress.js'
import {
  NAME_MAX,
  canSaveName,
  withTimeout,
  updateAuthUserWithRetry,
} from '../utils/profileHelpers.js'
import ProfileAvatar from '../components/ProfileAvatar.jsx'

const stepCount = 2

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

function SelectionDot() {
  return (
    <div
      style={{
        position: 'absolute',
        right: -6,
        bottom: -6,
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: 'var(--success-bright)',
        border: '3px solid var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 14px var(--success-glow)',
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-inverse)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
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
          boxShadow: selected ? '0 8px 20px var(--primary-glow)' : 'none',
          overflow: 'hidden',
          transition: 'border 0.15s, box-shadow 0.15s',
        }}
      >
        {children}
      </div>
      {selected && <SelectionDot />}
    </button>
  )
}

function BannerChoice({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: 'none',
        background: 'transparent',
        border: 'none',
        padding: 0,
        aspectRatio: '16 / 8',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 16,
          overflow: 'hidden',
          border: selected ? '2px solid var(--primary-mid)' : '1px solid var(--glass-soft-border)',
          boxShadow: selected ? '0 6px 18px var(--primary-glow)' : 'none',
          transition: 'border 0.15s, box-shadow 0.15s',
        }}
      >
        {children}
      </div>
      {selected && <SelectionDot />}
    </button>
  )
}

function isPresetBanner(value) {
  return typeof value === 'string' && value.startsWith('preset:')
}

function bannerToStoredValue(selection) {
  if (!selection) return null
  if (selection.type === 'preset') return `preset:${selection.id}`
  if (selection.type === 'url') return selection.url
  return null
}

function LivePreview({ avatarValue, bannerSrc, trimmedName, displayName }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 8.5',
        maxHeight: 220,
        minHeight: 160,
        borderRadius: 24,
        overflow: 'hidden',
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--glass-soft-border)',
      }}
    >
      <img
        src={bannerSrc}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '8%',
          transform: 'translateX(-50%)',
          width: 90,
          height: 90,
          borderRadius: '50%',
          border: '3px solid var(--avatar-ring-color)',
          padding: 3,
          background: 'var(--avatar-ring-bg)',
          boxShadow: 'var(--avatar-ring-shadow)',
          boxSizing: 'border-box',
        }}
      >
        <ProfileAvatar avatarId={avatarValue} name={trimmedName || displayName} rounded="circle" />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 12,
          display: 'flex',
          justifyContent: 'center',
          padding: '0 16px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            maxWidth: '85%',
            padding: '5px 14px',
            borderRadius: 12,
            background: 'var(--glass-strong)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text)',
            textTransform: 'uppercase',
            letterSpacing: 1,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {trimmedName || displayName || ''}
        </div>
      </div>
    </div>
  )
}

function StepHeader({ onBack, step, stepCount, t }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
      }}
    >
      <button
        onClick={onBack}
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
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--primary-bright)',
            letterSpacing: '0.12em',
          }}
        >
          {t('profileSetup.stepOf', { step, stepCount })}
        </div>
      </div>
      <div style={{ width: 42 }} />
    </div>
  )
}

function ProgressBar({ progress }) {
  return (
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
          transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  )
}

function ErrorBlock({ error }) {
  if (!error) return null
  return (
    <div
      role="alert"
      style={{
        background: 'var(--error-dim)',
        border: '1px solid var(--error-border)',
        color: 'var(--error-bright)',
        padding: '12px 16px',
        borderRadius: 12,
        fontSize: 13,
        fontFamily: 'var(--font-display)',
        textAlign: 'center',
        marginBottom: 12,
      }}
    >
      {error}
    </div>
  )
}

export default function SetupProfileScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentStore } = useStore()
  const { user, displayName, avatarId, bannerUrl, refreshAccountProfile, applyProfileSnapshot } =
    useAuth()
  const { lang, t } = useI18n()
  const avatarFileInputRef = useRef(null)
  const bannerFileInputRef = useRef(null)
  const initializedRef = useRef(false)

  const editMode = searchParams.get('mode') === 'edit'
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [profileError, setProfileError] = useState(null)
  const [selectedAvatarId, setSelectedAvatarId] = useState(AVATAR_PRESETS[0].id)
  const [customAvatarUrl, setCustomAvatarUrl] = useState(null)
  const [bannerSelection, setBannerSelection] = useState({
    type: 'preset',
    id: BANNER_PRESETS[0].id,
  })
  const [stepDirection, setStepDirection] = useState('forward')

  useEffect(() => {
    if (!user || initializedRef.current) return
    initializedRef.current = true
    const currentName =
      displayName || user.user_metadata?.full_name || user.user_metadata?.name || ''
    const currentAvatar =
      avatarId ||
      user.user_metadata?.avatar_id ||
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      AVATAR_PRESETS[0].id
    setName(currentName)
    if (typeof currentAvatar === 'string' && /^https?:/i.test(currentAvatar)) {
      setCustomAvatarUrl(currentAvatar)
      setSelectedAvatarId('custom')
    } else {
      setSelectedAvatarId(currentAvatar || AVATAR_PRESETS[0].id)
    }
    const bannerValue = bannerUrl || user.user_metadata?.banner_url || null
    if (!bannerValue) {
      setBannerSelection({ type: 'preset', id: BANNER_PRESETS[0].id })
    } else if (isPresetBanner(bannerValue)) {
      setBannerSelection({ type: 'preset', id: bannerValue.slice(7) })
    } else if (/^https?:/i.test(bannerValue)) {
      setBannerSelection({ type: 'url', url: bannerValue })
    } else {
      setBannerSelection({ type: 'preset', id: BANNER_PRESETS[0].id })
    }
  }, [user])

  const backTarget = currentStore ? `/s/${currentStore.slug}/profile` : '/profile'
  const trimmedName = name.trim()
  const canContinueName = canSaveName(name) && !nameError
  const hasAvatar =
    selectedAvatarId === 'custom' ? Boolean(customAvatarUrl) : Boolean(selectedAvatarId)
  const progress = (step / stepCount) * 100
  const avatarValue = selectedAvatarId === 'custom' ? customAvatarUrl : selectedAvatarId
  const previewBannerSrc =
    bannerSelection?.type === 'url'
      ? bannerSelection.url
      : resolveBannerSrc(`preset:${bannerSelection?.id || BANNER_PRESETS[0].id}`)

  const goBack = () => {
    if (editMode) {
      navigate(backTarget)
      return
    }
    if (step > 1) {
      setStepDirection('backward')
      setStep((s) => s - 1)
    } else {
      navigate(backTarget)
    }
  }

  const handleNameChange = (event) => {
    const value = event.target.value
    const regex = /^[a-zA-Zа-яА-ЯәіңғүұқөһӘІҢҒҮҰҚӨҺ0-9\s]*$/
    setName(value)
    if (profileError) setProfileError(null)
    if (!regex.test(value)) {
      setNameError(t('profileSetup.invalid'))
      return
    }
    if (value.trim().length > NAME_MAX) {
      setNameError(t('profileSetup.nameTooLong', { max: NAME_MAX }))
      return
    }
    setNameError('')
  }

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !user) return
    const validation = validateImageFile(file)
    if (validation) {
      setProfileError(t('profileSetup.saveError'))
      return
    }
    setUploadingAvatar(true)
    try {
      const compressed = await compressAvatar(file)
      const fileName = `${user.id}/${Date.now()}.jpg`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressed, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      const url = data?.publicUrl
      if (!url) throw new Error('no_public_url')
      setCustomAvatarUrl(`${url}?t=${Date.now()}`)
      setSelectedAvatarId('custom')
    } catch (_e) {
      setProfileError(t('profileSetup.saveError'))
    } finally {
      setUploadingAvatar(false)
      if (event.target) event.target.value = ''
    }
  }

  const handleBannerUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !user) return
    const validation = validateImageFile(file)
    if (validation) {
      setProfileError(t('profileSetup.saveError'))
      return
    }
    setUploadingBanner(true)
    try {
      const compressed = await compressBanner(file)
      const path = `${user.id}/${Date.now()}.jpg`
      const { error } = await supabase.storage
        .from('profile-banners')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('profile-banners').getPublicUrl(path)
      const url = data?.publicUrl
      if (!url) throw new Error('no_public_url')
      setBannerSelection({ type: 'url', url: `${url}?t=${Date.now()}` })
    } catch (_e) {
      setProfileError(t('profileSetup.saveError'))
    } finally {
      setUploadingBanner(false)
      if (event.target) event.target.value = ''
    }
  }

  const saveProfile = async () => {
    if (!user || !trimmedName || nameError || !hasAvatar) return
    setLoading(true)
    setProfileError(null)
    const avatarVal = selectedAvatarId === 'custom' ? customAvatarUrl : selectedAvatarId
    const bannerVal = bannerToStoredValue(bannerSelection)
    const deviceId = getOrCreateDeviceId()

    try {
      const userPayload = {
        auth_id: user.id,
        device_id: deviceId,
        name: trimmedName,
        avatar_id: avatarVal,
        banner_url: bannerVal,
      }
      const { error: userRowError } = await withTimeout(
        supabase.from('users').upsert(userPayload, { onConflict: 'auth_id' }),
        8000
      )
      if (userRowError) {
        if (/column .* does not exist/i.test(userRowError.message || '')) {
          const fallback = await supabase
            .from('users')
            .upsert(
              { auth_id: user.id, device_id: deviceId, name: trimmedName },
              { onConflict: 'auth_id' }
            )
          if (fallback.error) throw fallback.error
        } else {
          throw userRowError
        }
      }

      await withTimeout(
        updateAuthUserWithRetry({
          full_name: trimmedName,
          avatar_id: avatarVal,
          banner_url: bannerVal,
          profile_setup_done: true,
        }),
        8000
      )

      writeCachedProfileName(user.id, trimmedName)
      writeCachedProfileAvatar(user.id, avatarVal)
      writeCachedProfileBanner(user.id, bannerVal)
      applyProfileSnapshot(user.id, {
        name: trimmedName,
        avatarId: avatarVal,
        bannerUrl: bannerVal,
      })

      refreshAccountProfile(user).catch(() => {})
      navigate(backTarget, { replace: true })
    } catch (_e) {
      setProfileError(t('profileSetup.saveError'))
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
      setStepDirection('forward')
      setStep(2)
      return
    }
    saveProfile()
  }

  const slideIn = {
    animation:
      stepDirection === 'forward'
        ? 'stepSlideIn 0.38s cubic-bezier(0.22, 1, 0.36, 1)'
        : 'stepSlideBack 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
  }

  if (editMode) {
    return (
      <>
        <style>{`
          @keyframes stepSlideIn {
            from { opacity: 0; transform: translateX(40px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes stepSlideBack {
            from { opacity: 0; transform: translateX(-40px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
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
                  border: `1px solid ${nameError ? 'var(--error-border)' : 'var(--input-border)'}`,
                  borderRadius: 18,
                  padding: '15px 16px',
                }}
              >
                <input
                  value={name}
                  onChange={handleNameChange}
                  maxLength={NAME_MAX + 5}
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
                {nameError || `${trimmedName.length}/${NAME_MAX}`}
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
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 14,
                }}
              >
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  style={{
                    appearance: 'none',
                    border:
                      selectedAvatarId === 'custom' && customAvatarUrl
                        ? '2px solid var(--primary-mid)'
                        : '1px dashed var(--glass-border)',
                    background: 'var(--glass-subtle)',
                    borderRadius: 20,
                    aspectRatio: '1 / 1',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: 0,
                    overflow: 'hidden',
                  }}
                >
                  {selectedAvatarId === 'custom' && customAvatarUrl ? (
                    <img
                      src={customAvatarUrl}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 8,
                        color: 'var(--text-soft)',
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
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                        <circle cx="12" cy="13" r="3" />
                      </svg>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>
                        {uploadingAvatar ? '...' : t('profileSetup.gallery')}
                      </div>
                    </div>
                  )}
                </button>
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
                ref={avatarFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
            </SurfaceCard>

            <ErrorBlock error={profileError} />
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
                  loading || !canContinueName || !hasAvatar
                    ? 'var(--primary-dim)'
                    : 'var(--primary)',
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
      </>
    )
  }

  return (
    <>
      <style>{`
        @keyframes stepSlideIn {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes stepSlideBack {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div
        className="screen"
        style={{
          background: 'var(--bg-app)',
          paddingTop: 0,
          paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
        }}
      >
        <div style={{ padding: 'max(20px, env(safe-area-inset-top)) 20px 24px' }}>
          <StepHeader onBack={goBack} step={step} stepCount={stepCount} t={t} />
          <ProgressBar progress={progress} />

          <div key={step} style={slideIn}>
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
                    border: `1px solid ${nameError ? 'var(--error-border)' : 'var(--input-border)'}`,
                    borderRadius: 18,
                    padding: '16px 18px',
                  }}
                >
                  <input
                    value={name}
                    onChange={handleNameChange}
                    maxLength={NAME_MAX + 5}
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
                  {nameError || `${trimmedName.length}/${NAME_MAX}`}
                </div>
              </SurfaceCard>
            ) : (
              <>
                <LivePreview
                  avatarValue={avatarValue}
                  bannerSrc={previewBannerSrc}
                  trimmedName={trimmedName}
                  displayName={displayName}
                />

                <SurfaceCard style={{ padding: 20, marginTop: 18, marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-dim)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: 12,
                    }}
                  >
                    {t('profileSetup.avatarTitle')}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                      gap: 10,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      style={{
                        appearance: 'none',
                        border:
                          selectedAvatarId === 'custom' && customAvatarUrl
                            ? '2px solid var(--primary-mid)'
                            : '1px dashed var(--glass-border)',
                        background: 'var(--glass-subtle)',
                        borderRadius: 18,
                        aspectRatio: '1 / 1',
                        cursor: 'pointer',
                        position: 'relative',
                        padding: 0,
                        overflow: 'hidden',
                      }}
                    >
                      {selectedAvatarId === 'custom' && customAvatarUrl ? (
                        <img
                          src={customAvatarUrl}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-soft)',
                          }}
                        >
                          <svg
                            width="18"
                            height="18"
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
                      )}
                    </button>
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
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                  />
                </SurfaceCard>

                <SurfaceCard style={{ padding: 20, marginBottom: 18 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-dim)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: 12,
                    }}
                  >
                    {t('profile.edit.bannerLabel')}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    <div style={{ position: 'relative', aspectRatio: '16 / 8' }}>
                      <button
                        type="button"
                        onClick={() => bannerFileInputRef.current?.click()}
                        disabled={uploadingBanner}
                        style={{
                          width: '100%',
                          height: '100%',
                          appearance: 'none',
                          padding: 0,
                          cursor: uploadingBanner ? 'wait' : 'pointer',
                          position: 'relative',
                          background: 'var(--glass-subtle)',
                          border:
                            bannerSelection?.type === 'url'
                              ? '2px solid var(--primary-mid)'
                              : '1px dashed var(--glass-border)',
                          borderRadius: 16,
                          color: 'var(--text-soft)',
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: 'var(--font-display)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                          overflow: 'hidden',
                        }}
                      >
                        {bannerSelection?.type === 'url' ? (
                          <img
                            src={bannerSelection.url}
                            alt=""
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        ) : (
                          <>
                            <svg
                              width="18"
                              height="18"
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
                            <span>{uploadingBanner ? '...' : t('profile.edit.uploadOwn')}</span>
                          </>
                        )}
                      </button>
                      {bannerSelection?.type === 'url' && <SelectionDot />}
                    </div>
                    {BANNER_PRESETS.map((preset) => {
                      const selected =
                        bannerSelection?.type === 'preset' && bannerSelection.id === preset.id
                      return (
                        <BannerChoice
                          key={preset.id}
                          selected={selected}
                          onClick={() => setBannerSelection({ type: 'preset', id: preset.id })}
                        >
                          <img
                            src={preset.thumb || preset.src}
                            alt={preset.label[lang] || preset.label.ru}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        </BannerChoice>
                      )
                    })}
                  </div>
                  <input
                    ref={bannerFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleBannerUpload}
                    style={{ display: 'none' }}
                  />
                </SurfaceCard>
              </>
            )}
          </div>

          <ErrorBlock error={profileError} />
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
              boxShadow: loading ? 'none' : '0 18px 36px var(--primary-glow)',
            }}
          >
            {loading ? '...' : step === 1 ? t('profileSetup.continue') : t('profileSetup.finish')}
          </button>
        </div>
      </div>
    </>
  )
}
