import { useEffect, useMemo, useRef, useState } from 'react'
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
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import { AVATAR_PRESETS } from '../constants/avatarPresets.js'
import { BANNER_PRESETS, resolveBannerSrc } from '../constants/bannerPresets.js'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const NAME_MAX = 40

/* global FileReader, Image */
function compressImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        const ratio = Math.min(maxDim / width, maxDim / height, 1)
        if (ratio < 1) {
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('blob_failed'))),
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => reject(new Error('image_load_failed'))
      img.src = event.target.result
    }
    reader.onerror = () => reject(new Error('file_read_failed'))
  })
}

function compressBanner(file) {
  return compressImage(file, 1200, 0.85).then(async (blob) => {
    if (blob.type === 'image/jpeg') return blob
    const img = new Image()
    const url = URL.createObjectURL(blob)
    return new Promise((resolve, reject) => {
      img.onload = () => {
        const MAX_W = 1200
        const MAX_H = 540
        let { width, height } = img
        const ratio = Math.min(MAX_W / width, MAX_H / height, 1)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('blob_failed'))),
          'image/jpeg',
          0.85
        )
        URL.revokeObjectURL(url)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('image_load_failed'))
      }
      img.src = url
    })
  })
}

function compressAvatar(file) {
  return compressImage(file, 640, 0.86)
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

export default function ProfileEditScreen() {
  const navigate = useNavigate()
  const { currentStore } = useStore()
  const { user, displayName, avatarId, bannerUrl, applyProfileSnapshot, refreshAccountProfile } =
    useAuth()
  const { lang, t } = useI18n()
  const fileInputRef = useRef(null)
  const avatarFileInputRef = useRef(null)

  const backTarget = buildProfilePath(currentStore?.slug || null)

  const initialBannerSelection = useMemo(() => {
    const value = bannerUrl || user?.user_metadata?.banner_url || null
    if (!value) return { type: 'preset', id: BANNER_PRESETS[0].id }
    if (isPresetBanner(value)) return { type: 'preset', id: value.slice(7) }
    if (/^https?:/i.test(value)) return { type: 'url', url: value }
    return { type: 'preset', id: BANNER_PRESETS[0].id }
  }, [bannerUrl, user])

  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [selectedAvatarId, setSelectedAvatarId] = useState(AVATAR_PRESETS[0].id)
  const [bannerSelection, setBannerSelection] = useState(initialBannerSelection)
  const [uploading, setUploading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [customAvatarUrl, setCustomAvatarUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(displayName || user.user_metadata?.full_name || '')
    const initialAvatar = avatarId || user.user_metadata?.avatar_id || AVATAR_PRESETS[0].id
    if (typeof initialAvatar === 'string' && /^https?:/i.test(initialAvatar)) {
      setCustomAvatarUrl(initialAvatar)
      setSelectedAvatarId('custom')
    } else {
      setSelectedAvatarId(initialAvatar || AVATAR_PRESETS[0].id)
    }
    setBannerSelection(initialBannerSelection)
  }, [user, displayName, avatarId, initialBannerSelection])

  if (!user) {
    // Not authenticated — bounce back.
    navigate('/auth', { replace: true })
    return null
  }

  const trimmedName = name.trim()
  const canSave =
    trimmedName.length >= 2 &&
    trimmedName.length <= NAME_MAX &&
    !nameError &&
    !saving &&
    !uploading &&
    !uploadingAvatar

  const handleNameChange = (e) => {
    const value = e.target.value
    setName(value)
    if (value.trim().length > NAME_MAX) {
      setNameError(t('profile.edit.nameTooLong'))
    } else {
      setNameError('')
    }
  }

  const handleBannerUpload = async (file) => {
    setError('')
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('profile.edit.uploadInvalid'))
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(t('profile.edit.uploadTooLarge'))
      return
    }
    if (!navigator.onLine) {
      setError(t('profile.edit.offline'))
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
      // Cache-bust to force refresh
      const cacheBusted = `${url}?t=${Date.now()}`
      setBannerSelection({ type: 'url', url: cacheBusted })
    } catch (err) {
      console.warn('[ProfileEdit] banner upload failed', err)
      setError(t('profile.edit.uploadFailed'))
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
    setError('')
    if (!file || !user) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('profile.edit.uploadInvalid'))
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(t('profile.edit.uploadTooLarge'))
      return
    }
    if (!navigator.onLine) {
      setError(t('profile.edit.offline'))
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
      console.warn('[ProfileEdit] avatar upload failed', err)
      setError(t('profile.edit.uploadFailed'))
    } finally {
      setUploadingAvatar(false)
    }
  }

  const onAvatarFileChange = (event) => {
    const file = event.target.files?.[0]
    if (event.target) event.target.value = ''
    if (file) handleAvatarUpload(file)
  }

  const handleSave = async () => {
    if (!canSave) return
    setError('')
    setSaving(true)
    const avatarValue = selectedAvatarId === 'custom' ? customAvatarUrl : selectedAvatarId
    const bannerValue = bannerToStoredValue(bannerSelection)
    const deviceId = getOrCreateDeviceId()

    try {
      // Upsert into public.users (cross-device sync). Includes avatar_id + banner_url
      // — gracefully degrades if migration 016 not applied yet.
      const userPayload = {
        auth_id: user.id,
        device_id: deviceId,
        name: trimmedName,
        avatar_id: avatarValue,
        banner_url: bannerValue,
      }
      let { error: dbError } = await supabase
        .from('users')
        .upsert(userPayload, { onConflict: 'auth_id' })
      if (dbError && /column .* does not exist/i.test(dbError.message || '')) {
        // Fallback for stores without migration 016
        const fallback = await supabase
          .from('users')
          .upsert(
            { auth_id: user.id, device_id: deviceId, name: trimmedName },
            { onConflict: 'auth_id' }
          )
        dbError = fallback.error
      }
      if (dbError) throw dbError

      // Mirror to auth.user_metadata so other devices see banner immediately on login.
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: trimmedName,
            avatar_id: avatarValue,
            banner_url: bannerValue,
          },
        })
      } catch (metaErr) {
        console.warn('[ProfileEdit] auth metadata update failed', metaErr)
      }

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
      console.error('[ProfileEdit] save failed', err)
      setError(err?.message || t('profile.edit.uploadFailed'))
    } finally {
      setSaving(false)
    }
  }

  const previewBannerSrc =
    bannerSelection?.type === 'url'
      ? bannerSelection.url
      : resolveBannerSrc(`preset:${bannerSelection?.id || BANNER_PRESETS[0].id}`)

  return (
    <div
      className="screen"
      style={{
        paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))',
        background: 'var(--bg-app)',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
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
            background: canSave
              ? 'linear-gradient(135deg, #7C3AED, #6D28D9)'
              : 'rgba(124,58,237,0.25)',
            color: 'var(--text-inverse)',
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            fontWeight: 700,
            cursor: canSave ? 'pointer' : 'not-allowed',
            opacity: canSave ? 1 : 0.6,
            flexShrink: 0,
            boxShadow: canSave ? '0 6px 18px rgba(124,58,237,0.35)' : 'none',
          }}
        >
          {saving ? t('profile.edit.saving') : t('profile.edit.save')}
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Banner preview */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 8.5',
            maxHeight: 247,
            minHeight: 190,
            borderRadius: 24,
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #1E0A3C 0%, #6D28D9 100%)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
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
              border: '3px solid #7C3AED',
              padding: 3,
              background: 'rgba(12,10,30,0.55)',
              boxShadow: '0 6px 24px rgba(124,58,237,0.45)',
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
                textTransform: 'uppercase',
                letterSpacing: 1,
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {trimmedName || displayName || 'Körset User'}
            </div>
          </div>
        </div>

        {/* Name */}
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
              border: `1px solid ${nameError ? 'var(--error-bright)' : 'var(--glass-border)'}`,
              color: 'var(--text)',
              fontSize: 15,
              fontFamily: 'var(--font-display)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {nameError && (
            <div style={{ fontSize: 12, color: 'var(--error-bright)', marginTop: 6 }}>
              {nameError}
            </div>
          )}
        </Section>

        {/* Avatar */}
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
                  background: 'rgba(124,58,237,0.08)',
                  border:
                    selectedAvatarId === 'custom'
                      ? '2px solid #7C3AED'
                      : '1px dashed rgba(167,139,250,0.4)',
                  borderRadius: 18,
                  color: '#A78BFA',
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
                  <img
                    src={customAvatarUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
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
              {selectedAvatarId === 'custom' && customAvatarUrl && (
                <div
                  style={{
                    position: 'absolute',
                    right: -6,
                    top: -6,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#10B981',
                    border: '2.5px solid var(--bg-app)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(16,185,129,0.4)',
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
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
                    aspectRatio: '1 / 1',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 18,
                      overflow: 'hidden',
                      border: selected ? '2px solid #7C3AED' : '1px solid var(--glass-border)',
                      boxShadow: selected ? '0 6px 18px rgba(124,58,237,0.35)' : 'none',
                    }}
                  >
                    <ProfileAvatar avatarId={preset.id} name="" rounded="square" />
                  </div>
                  {selected && <SelectedDot />}
                </button>
              )
            })}
          </div>
          <input
            ref={avatarFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onAvatarFileChange}
            style={{ display: 'none' }}
          />
        </Section>

        {/* Banner */}
        <Section label={t('profile.edit.bannerLabel')}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
            }}
          >
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
                    aspectRatio: '16 / 8',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 16,
                      overflow: 'hidden',
                      border: selected ? '2px solid #7C3AED' : '1px solid var(--glass-border)',
                      boxShadow: selected ? '0 6px 18px rgba(124,58,237,0.35)' : 'none',
                    }}
                  >
                    <img
                      src={preset.src}
                      alt={preset.label[lang] || preset.label.ru}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </div>
                  {selected && <SelectedDot />}
                </button>
              )
            })}

            {/* Upload tile — wrapped in a positioned div so SelectedDot
                can sit OUTSIDE the button's overflow:hidden boundary. This
                mirrors the preset-tile pattern where the dot is rendered
                outside the inner overflow-hidden wrapper. */}
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
                  background: 'rgba(124,58,237,0.08)',
                  border:
                    bannerSelection?.type === 'url'
                      ? '2px solid #7C3AED'
                      : '1px dashed rgba(167,139,250,0.4)',
                  borderRadius: 16,
                  color: '#A78BFA',
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
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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
                      <path d="M12 4v16M4 12h16" />
                    </svg>
                    <span style={{ textAlign: 'center', padding: '0 6px' }}>
                      {uploading ? t('profile.edit.saving') : t('profile.edit.uploadOwn')}
                    </span>
                  </>
                )}
              </button>
              {bannerSelection?.type === 'url' && <SelectedDot />}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
        </Section>

        {error && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: 'var(--error-bright)',
              fontSize: 13,
              fontFamily: 'var(--font-display)',
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  )
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
        background: '#10B981',
        border: '2.5px solid var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 10px rgba(16,185,129,0.4)',
      }}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  )
}
