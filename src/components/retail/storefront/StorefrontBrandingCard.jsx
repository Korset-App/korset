import { useRef, useState } from 'react'
import { useI18n } from '../../../i18n/index.js'
import { supabase } from '../../../utils/supabase.js'
import { compressImage } from '../../../utils/imageCompressor.js'
import ImageCropModal from '../ImageCropModal.jsx'
import { STORE_TYPES } from '../../../domain/retail/storeSettings.js'
import {
  StorefrontIcon,
  CameraIcon,
  SyncIcon,
  ChevronDownIcon,
  AlertTriangleIcon,
} from '../../icons/index.js'

const CARD_STYLE = {
  background: 'var(--bg-card)',
  border: '1px solid var(--retail-border)',
  borderRadius: 20,
  padding: '24px',
  boxShadow: 'var(--shadow-card)',
}

const FIELD_LABEL = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: 'var(--text-dim)',
  marginBottom: 8,
}

const INPUT_STYLE = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 12,
  border: '1px solid var(--retail-border)',
  background: 'var(--glass-bg)',
  color: 'var(--text)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-body)',
  transition: 'border-color 0.15s ease',
}

export default function StorefrontBrandingCard({
  storeId,
  settings,
  logoUrl,
  onSettingChange,
  onLogoChange,
  disabled = false,
}) {
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'

  const [logoUploading, setLogoUploading] = useState(false)
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState(null)
  const [uploadError, setUploadError] = useState(null)

  const logoInputRef = useRef(null)

  const handleLogoFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    const objectUrl = URL.createObjectURL(file)
    setCropImageSrc(objectUrl)
    setIsCropModalOpen(true)
    e.target.value = ''
  }

  const handleCropConfirmed = async (croppedBlob) => {
    setIsCropModalOpen(false)
    if (!croppedBlob || !storeId) return

    setLogoUploading(true)
    setUploadError(null)

    try {
      const compressed = await compressImage(croppedBlob, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.85,
        targetSizeKB: 180,
      })

      const ext = 'webp'
      const path = `stores/${storeId}/logo_${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, compressed, { upsert: true, contentType: 'image/webp' })

      if (uploadErr) throw uploadErr

      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path)
      const nextUrl = publicData?.publicUrl

      if (nextUrl) {
        onLogoChange(nextUrl)
      }
    } catch (err) {
      setUploadError(err.message || (isKz ? 'Логотипті жүктеу қатесі' : 'Ошибка загрузки логотипа'))
    } finally {
      setLogoUploading(false)
      if (cropImageSrc) {
        URL.revokeObjectURL(cropImageSrc)
        setCropImageSrc(null)
      }
    }
  }

  return (
    <div style={CARD_STYLE}>
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropImageSrc}
        onConfirm={handleCropConfirmed}
        onClose={() => {
          setIsCropModalOpen(false)
          if (cropImageSrc) {
            URL.revokeObjectURL(cropImageSrc)
            setCropImageSrc(null)
          }
        }}
      />

      <div style={{ ...FIELD_LABEL, marginBottom: 16 }}>
        {isKz ? '1. БРЕНДИНГ ЖӘНЕ ЛОГОТИП' : '1. БРЕНДИНГ И ЛОГОТИП'}
      </div>

      {uploadError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'var(--error-soft, rgba(239,68,68,0.1))',
            border: '1px solid var(--error, #ef4444)',
            color: 'var(--error, #ef4444)',
            fontSize: 12.5,
            marginBottom: 16,
          }}
        >
          <AlertTriangleIcon size={16} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Logo Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
        <div
          onClick={() => !disabled && logoInputRef.current?.click()}
          title={logoUrl ? (isKz ? 'Логотипті өзгерту' : 'Изменить логотип') : (isKz ? 'Логотип жүктеу' : 'Загрузить логотип')}
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            border: '1.5px solid var(--retail-border)',
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
            cursor: disabled ? 'default' : 'pointer',
            flexShrink: 0,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Store logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <StorefrontIcon size={32} color="var(--text-dim)" />
          )}

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: logoUrl ? 0 : 1,
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (logoUrl) e.currentTarget.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              if (logoUrl) e.currentTarget.style.opacity = '0'
            }}
          >
            <CameraIcon size={24} color="#ffffff" />
          </div>

          {logoUploading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SyncIcon
                size={22}
                color="var(--retail-accent)"
                style={{ animation: 'spin 1s linear infinite' }}
              />
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
            {isKz ? 'Дүкен логотипі' : 'Логотип магазина'}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-dim)',
              lineHeight: 1.4,
              marginBottom: 10,
            }}
          >
            {isKz
              ? '1:1 шаршы формат · Автоматты қысу'
              : 'Квадрат 1:1 · Автоматическая обрезка и оптимизация'}
          </div>

          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={handleLogoFileSelect}
            disabled={disabled}
          />

          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={disabled || logoUploading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 10,
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: 'var(--retail-accent, #38BDF8)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <CameraIcon size={14} />
            <span>
              {logoUrl
                ? isKz
                  ? 'Өзгерту'
                  : 'Заменить фото'
                : isKz
                  ? 'Жүктеу'
                  : 'Загрузить логотип'}
            </span>
          </button>
        </div>
      </div>

      {/* Slogan / Short description */}
      <div style={{ marginBottom: 18 }}>
        <div style={FIELD_LABEL}>
          {isKz ? 'Слоган немесе қысқа сипаттама' : 'Слоган или подзаголовок'}
        </div>
        <input
          type="text"
          value={settings.short_description}
          onChange={(e) => onSettingChange('short_description', e.target.value)}
          placeholder={
            isKz
              ? 'Мысалы: Үй жанындағы жаңа піскен халал өнімдер'
              : 'Например: Свежая выпечка и халал-продукты у дома'
          }
          maxLength={120}
          style={INPUT_STYLE}
          disabled={disabled}
        />
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
          {isKz
            ? 'Витринада атаудың астында көрсетіледі'
            : 'Отображается сразу под названием на главной витрине'}
        </div>
      </div>

      {/* Store Type Format (SSOT) */}
      <div style={{ marginBottom: 18 }}>
        <div style={FIELD_LABEL}>
          {isKz ? 'Сауда нүктесінің форматы' : 'Формат торговой точки'}
        </div>
        <div style={{ position: 'relative' }}>
          <select
            value={settings.type || 'minimarket'}
            onChange={(e) => onSettingChange('type', e.target.value)}
            disabled={disabled}
            style={{
              ...INPUT_STYLE,
              appearance: 'none',
              WebkitAppearance: 'none',
              paddingRight: 36,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {STORE_TYPES.map((st) => (
              <option key={st.id} value={st.id}>
                {t(st.labelKey) || (isKz ? st.fallbackKz : st.fallbackRu)}
              </option>
            ))}
          </select>
          <div
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: 'var(--text-dim)',
            }}
          >
            <ChevronDownIcon size={16} />
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <div style={FIELD_LABEL}>
          {isKz ? 'Толық сипаттама' : 'Описание витрины для покупателей'}
        </div>
        <textarea
          value={settings.description}
          onChange={(e) => onSettingChange('description', e.target.value)}
          placeholder={
            isKz
              ? 'Дүкен ерекшеліктері, ассортимент, автотұрақ...'
              : 'Особенности магазина, свежие поставки, режим работы и парковка...'
          }
          rows={3}
          style={{
            ...INPUT_STYLE,
            resize: 'vertical',
            minHeight: 76,
            lineHeight: 1.45,
          }}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
