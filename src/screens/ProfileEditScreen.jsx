import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { useI18n } from '../i18n/index.js'
import { supabase } from '../utils/supabase.js'
import { buildProfilePath } from '../utils/routes.js'
import {
  getOrCreateDeviceId,
  writeCachedProfileAvatar,
  writeCachedProfileBanner,
  writeCachedProfileName,
} from '../utils/userIdentity.js'
import { compressAvatar, compressBanner, validateImageFile } from '../utils/imageCompress.js'
import {
  NAME_MAX,
  canSaveName,
  withTimeout,
  updateAuthUserWithRetry,
} from '../utils/profileHelpers.js'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import { AVATAR_PRESETS } from '../constants/avatarPresets.js'
import { BANNER_PRESETS, resolveBannerSrc } from '../constants/bannerPresets.js'

function isPresetBanner(value) {
  return typeof value === 'string' && value.startsWith('preset:')
}

function bannerToStoredValue(selection) {
  if (!selection) return null
  if (selection.type === 'preset') return `preset:${selection.id}`
  if (selection.type === 'url') return selection.url
  return null
}

function Section({ label, children }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          marginBottom: 10,
          paddingLeft: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

function SelectedDot() {
  return (
    <div
      style={{
        position: 'absolute',
        right: -6,
        top: -6,
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: 'var(--success-bright)',
        border: '2.5px solid var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 10px var(--success-glow)',
      }}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-inverse)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  )
}

const TOAST_ERR_KEYS = {
  invalid_type: 'profile.edit.uploadInvalid',
  too_large: 'profile.edit.uploadTooLarge',
  offline: 'profile.edit.offline',
}

export default function ProfileEditScreen() {
  const navigate = useNavigate()
  const { currentStore } = useStore()
  const { user, displayName, avatarId, bannerUrl, applyProfileSnapshot, refreshAccountProfile } =
    useAuth()
  const { lang, t } = useI18n()
  const fileInputRef = useRef(null)
  const avatarFileInputRef = useRef(null)

  const backTarget = buildProfilePath(currentStore?.slug || null)

  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [selectedAvatarId, setSelectedAvatarId] = useState(AVATAR_PRESETS[0].id)
  const [bannerSelection, setBannerSelection] = useState({
    type: 'preset',
    id: BANNER_PRESETS[0].id,
  })
  const [uploading, setUploading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [customAvatarUrl, setCustomAvatarUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!user || initializedRef.current) return
    initializedRef.current = true
    setName(displayName || user.user_metadata?.full_name || '')
    const initialAvatar = avatarId || user.user_metadata?.avatar_id || AVATAR_PRESETS[0].id
    if (typeof initialAvatar === 'string' && /^https?:/i.test(initialAvatar)) {
      setCustomAvatarUrl(initialAvatar)
      setSelectedAvatarId('custom')
    } else {
      setSelectedAvatarId(initialAvatar || AVATAR_PRESETS[0].id)
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

  if (!user) {
    navigate('/auth', { replace: true })
    return null
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const trimmedName = name.trim()
  const canSave = canSaveName(name) && !nameError && !saving && !uploading && !uploadingAvatar

  const handleNameChange = (e) => {
    const value = e.target.value
    setName(value)
    if (value.trim().length > NAME_MAX) {
      setNameError(t('profileSetup.nameTooLong', { max: NAME_MAX }))
    } else {
      setNameError('')
    }
  }

  const handleFileValidationError = (code) => {
    const key = TOAST_ERR_KEYS[code]
    if (key) showToast(t(key))
    else showToast(t('profile.edit.uploadFailed'))
  }

  const handleBannerUpload = async (file) => {
    if (!file) return
    const validation = validateImageFile(file)
    if (validation) {
      handleFileValidationError(validation)
      return
    }
    setUploading(true)
    try {
      const blob = await compressBanner(file)
      const path = `${user.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('profile-banners')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('profile-banners').getPublicUrl(path)
      const url = data?.publicUrl
      if (!url) throw new Error('no_public_url')
      setBannerSelection({ type: 'url', url: `${url}?t=${Date.now()}` })
    } catch (err) {
      showToast(t('profile.edit.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  const onFileChange = (event) => {
    const file = event.target.files?.[0]
    if (event.target) event.target.value = ''
    if (file) handleBannerUpload(file)
  }

  const handleAvatarUpload = async (file) => {
    if (!file || !user) return
    const validation = validateImageFile(file)
    if (validation) {
      handleFileValidationError(validation)
      return
    }
    setUploadingAvatar(true)
    try {
      const blob = await compressAvatar(file)
      const path = `${user.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = data?.publicUrl
      if (!url) throw new Error('no_public_url')
      setCustomAvatarUrl(`${url}?t=${Date.now()}`)
      setSelectedAvatarId('custom')
    } catch (err) {
      showToast(t('profile.edit.uploadFailed'))
    } finally {
      setUploadingAvatar(false)
    }
  }

  const onAvatarFileChange = (event) => {
    const file = event.target.files?.[0]
    if (file) handleAvatarUpload(file)
    setTimeout(() => {
      if (event.target) event.target.value = ''
    }, 0)
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    const avatarValue = selectedAvatarId === 'custom' ? customAvatarUrl : selectedAvatarId
    const bannerValue = bannerToStoredValue(bannerSelection)
    const deviceId = getOrCreateDeviceId()

    try {
      const userPayload = {
        auth_id: user.id,
        device_id: deviceId,
        name: trimmedName,
        avatar_id: avatarValue,
        banner_url: bannerValue,
      }
      const { error: dbError } = await withTimeout(
        supabase.from('users').upsert(userPayload, { onConflict: 'auth_id' }),
        8000
      )
      if (dbError && /column .* does not exist/i.test(dbError.message || '')) {
        const fallback = await supabase
          .from('users')
          .upsert(
            { auth_id: user.id, device_id: deviceId, name: trimmedName },
            { onConflict: 'auth_id' }
          )
        if (fallback.error) throw fallback.error
      } else if (dbError) {
        throw dbError
      }

      await withTimeout(
        updateAuthUserWithRetry({
          full_name: trimmedName,
          avatar_id: avatarValue,
          banner_url: bannerValue,
        }),
        8000
      )

      writeCachedProfileName(user.id, trimmedName)
      writeCachedProfileAvatar(user.id, avatarValue)
      writeCachedProfileBanner(user.id, bannerValue)
      applyProfileSnapshot(user.id, {
        name: trimmedName,
        avatarId: avatarValue,
        bannerUrl: bannerValue,
      })
      refreshAccountProfile(user).catch(() => {})
      navigate(backTarget, { replace: true })
    } catch (err) {
      showToast(err?.message || t('profile.edit.uploadFailed'))
    } finally {
      setSaving(false)
    }
  }

  const previewBannerSrc =
    bannerSelection?.type === 'url'
      ? bannerSelection.url
      : resolveBannerSrc(`preset:${bannerSelection?.id || BANNER_PRESETS[0].id}`)

  return (
    <>
      <style>{`@keyframes profileToastIn{0%{opacity:0;transform:translateY(-8px)}100%{opacity:1;transform:translateY(0)}}`}</style>

      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 'max(16px, env(safe-area-inset-top))',
            left: 16,
            right: 16,
            zIndex: 100,
            padding: '14px 18px',
            borderRadius: 16,
            background: 'var(--error-dim)',
            border: '1px solid var(--error-border)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: 'var(--error-bright)',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
            textAlign: 'center',
            boxShadow: 'var(--shadow-glass)',
            animation: 'profileToastIn 0.3s ease',
          }}
        >
          {toast}
        </div>
      )}

      <div
        className="screen"
        style={{
          paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))',
          background: 'var(--bg-app)',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'var(--glass-strong)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--glass-border)',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <button
            onClick={() => navigate(backTarget)}
            aria-label={t('common.back')}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text)"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: 'center',
              fontSize: 15,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {t('profile.edit.title')}
          </div>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: '9px 16px',
              borderRadius: 12,
              border: 'none',
              background: canSave ? 'var(--primary)' : 'var(--primary-dim)',
              color: 'var(--text-inverse)',
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 700,
              cursor: canSave ? 'pointer' : 'not-allowed',
              opacity: canSave ? 1 : 0.6,
              flexShrink: 0,
              boxShadow: canSave ? '0 6px 18px var(--primary-glow)' : 'none',
            }}
          >
            {saving ? t('profile.edit.saving') : t('profile.edit.save')}
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 8.5',
              maxHeight: 247,
              minHeight: 190,
              borderRadius: 24,
              overflow: 'hidden',
              background: 'var(--bg-card)',
              boxShadow: 'var(--shadow-card)',
              border: '1px solid var(--glass-soft-border)',
            }}
          >
            <img
              src={previewBannerSrc}
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
                width: 115,
                height: 115,
                borderRadius: '50%',
                border: '3px solid var(--avatar-ring-color)',
                padding: 3,
                background: 'var(--avatar-ring-bg)',
                boxShadow: 'var(--avatar-ring-shadow)',
                boxSizing: 'border-box',
              }}
            >
              <ProfileAvatar
                avatarId={selectedAvatarId === 'custom' ? customAvatarUrl : selectedAvatarId}
                name={trimmedName || displayName}
                rounded="circle"
              />
            </div>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 14,
                display: 'flex',
                justifyContent: 'center',
                padding: '0 16px',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '6px 16px',
                  borderRadius: 12,
                  background: 'var(--glass-strong)',
                  border: '1px solid var(--glass-border)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
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
                {trimmedName || displayName || t('profileSetup.defaultName')}
              </div>
            </div>
          </div>

          <Section label={t('profile.edit.nameLabel')}>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder={t('profile.edit.namePlaceholder')}
              maxLength={NAME_MAX + 5}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 14,
                background: 'var(--glass-bg)',
                border: `1px solid ${nameError ? 'var(--error-border)' : 'var(--glass-border)'}`,
                color: 'var(--text)',
                fontSize: 15,
                fontFamily: 'var(--font-display)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div
              style={{
                minHeight: 18,
                paddingTop: 6,
                fontSize: 12,
                color: nameError ? 'var(--error-bright)' : 'var(--text-disabled)',
              }}
            >
              {nameError || `${trimmedName.length}/${NAME_MAX}`}
            </div>
          </Section>

          <Section label={t('profile.edit.avatarLabel')}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                gap: 10,
              }}
            >
              <div style={{ position: 'relative', aspectRatio: '1 / 1' }}>
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  style={{
                    width: '100%',
                    height: '100%',
                    appearance: 'none',
                    padding: 0,
                    cursor: uploadingAvatar ? 'wait' : 'pointer',
                    position: 'relative',
                    background: 'var(--primary-dim)',
                    border:
                      selectedAvatarId === 'custom'
                        ? '2px solid var(--primary-mid)'
                        : '1px dashed var(--primary-bright)',
                    borderRadius: 18,
                    color: 'var(--primary-bright)',
                    fontFamily: 'var(--font-display)',
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    overflow: 'hidden',
                  }}
                >
                  {selectedAvatarId === 'custom' && customAvatarUrl ? (
                    <>
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
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: '5px 0',
                          background: 'var(--avatar-ring-bg)',
                          backdropFilter: 'blur(4px)',
                          WebkitBackdropFilter: 'blur(4px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                          color: 'var(--text-inverse)',
                          fontSize: 10,
                          fontWeight: 600,
                          lineHeight: 1,
                        }}
                      >
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ flexShrink: 0 }}
                        >
                          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                          <circle cx="12" cy="13" r="3" />
                        </svg>
                        <span style={{ whiteSpace: 'nowrap' }}>
                          {uploadingAvatar ? '...' : t('profile.edit.uploadOwn')}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
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
                      <span style={{ textAlign: 'center', padding: '0 4px' }}>
                        {uploadingAvatar ? '...' : t('profile.edit.uploadOwn')}
                      </span>
                    </>
                  )}
                </button>
                {selectedAvatarId === 'custom' && customAvatarUrl && <SelectedDot />}
              </div>
              {AVATAR_PRESETS.map((preset) => {
                const selected = selectedAvatarId === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedAvatarId(preset.id)}
                    aria-pressed={selected}
                    style={{
                      appearance: 'none',
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      width: '100%',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'block',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        paddingTop: '100%',
                        position: 'relative',
                        borderRadius: 18,
                        overflow: 'hidden',
                        border: selected
                          ? '2px solid var(--primary-mid)'
                          : '1px solid var(--glass-border)',
                        boxShadow: selected ? '0 6px 18px var(--primary-glow)' : 'none',
                        transition: 'border 0.15s, box-shadow 0.15s',
                      }}
                    >
                      <div style={{ position: 'absolute', inset: 0 }}>
                        <ProfileAvatar avatarId={preset.id} name="" rounded="square" />
                      </div>
                    </div>
                    {selected && <SelectedDot />}
                  </button>
                )
              })}
            </div>
            <input
              ref={avatarFileInputRef}
              type="file"
              accept="image/*"
              onChange={onAvatarFileChange}
              style={{ display: 'none' }}
            />
          </Section>

          <Section label={t('profile.edit.bannerLabel')}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 10,
              }}
            >
              <div style={{ position: 'relative', aspectRatio: '16 / 8' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    width: '100%',
                    height: '100%',
                    appearance: 'none',
                    padding: 0,
                    cursor: uploading ? 'wait' : 'pointer',
                    position: 'relative',
                    background: 'var(--primary-dim)',
                    border:
                      bannerSelection?.type === 'url'
                        ? '2px solid var(--primary-mid)'
                        : '1px dashed var(--primary-bright)',
                    borderRadius: 16,
                    color: 'var(--primary-bright)',
                    fontFamily: 'var(--font-display)',
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
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
                      <span style={{ textAlign: 'center', padding: '0 6px' }}>
                        {uploading ? t('profile.edit.saving') : t('profile.edit.uploadOwn')}
                      </span>
                    </>
                  )}
                </button>
                {bannerSelection?.type === 'url' && <SelectedDot />}
              </div>
              {BANNER_PRESETS.map((preset) => {
                const selected =
                  bannerSelection?.type === 'preset' && bannerSelection.id === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setBannerSelection({ type: 'preset', id: preset.id })}
                    aria-pressed={selected}
                    style={{
                      appearance: 'none',
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      width: '100%',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'block',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        paddingTop: '50%',
                        position: 'relative',
                        borderRadius: 16,
                        overflow: 'hidden',
                        border: selected
                          ? '2px solid var(--primary-mid)'
                          : '1px solid var(--glass-border)',
                        boxShadow: selected ? '0 6px 18px var(--primary-glow)' : 'none',
                        transition: 'border 0.15s, box-shadow 0.15s',
                      }}
                    >
                      <div style={{ position: 'absolute', inset: 0 }}>
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
                      </div>
                    </div>
                    {selected && <SelectedDot />}
                  </button>
                )
              })}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange}
              style={{ display: 'none' }}
            />
          </Section>
        </div>
      </div>
    </>
  )
}
