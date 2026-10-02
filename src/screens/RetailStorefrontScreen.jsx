import { useState, useRef, useEffect, useCallback } from 'react'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { supabase } from '../utils/supabase.js'
import { compressImage } from '../utils/imageCompressor.js'
import QRCode from 'react-qr-code'
import StoreLivePreviewCard from '../components/retail/StoreLivePreviewCard.jsx'
import StorePhotosManager from '../components/retail/StorePhotosManager.jsx'
import ImageCropModal from '../components/retail/ImageCropModal.jsx'
import RetailSaveBar from '../components/retail/RetailSaveBar.jsx'
import {
  EyeIcon,
  ExternalLinkIcon,
  QrCodeIcon,
  StorefrontIcon,
  CameraIcon,
  CheckCircleIcon,
  SyncIcon,
  ShareIcon,
  ChevronDownIcon,
} from '../components/icons/index.js'

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

export default function RetailStorefrontScreen() {
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'
  const { currentStore, updateStoreSettings } = useStore()

  const storeSlug = currentStore?.slug || ''
  const isPublished = currentStore?.is_published !== false
  const publicStoreUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/s/${storeSlug}`
      : `https://korset.kz/s/${storeSlug}`

  const [settings, setSettings] = useState({
    name: currentStore?.name || '',
    short_description: currentStore?.short_description || '',
    description: currentStore?.description || '',
    type: currentStore?.type || 'minimarket',
    images: Array.isArray(currentStore?.images) ? currentStore.images : [],
  })

  const [logoUrl, setLogoUrl] = useState(currentStore?.logo_url || null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState(null)

  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [saveErrorMessage, setSaveErrorMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const logoInputRef = useRef(null)

  // Sync state when store loads or changes
  useEffect(() => {
    if (!currentStore) return
    setSettings({
      name: currentStore.name || '',
      short_description: currentStore.short_description || '',
      description: currentStore.description || '',
      type: currentStore.type || 'minimarket',
      images: Array.isArray(currentStore.images) ? currentStore.images : [],
    })
    setLogoUrl(currentStore.logo_url || null)
    setIsDirty(false)
  }, [currentStore])

  const handleChange = useCallback((key, val) => {
    setSettings((prev) => ({ ...prev, [key]: val }))
    setIsDirty(true)
    setSaveStatus(null)
  }, [])

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(publicStoreUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    } catch {
      /* noop */
    }
  }

  // Logo file selection and crop modal trigger
  const handleLogoFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setCropImageSrc(objectUrl)
    setIsCropModalOpen(true)
    e.target.value = ''
  }

  // Confirmed crop -> compression -> upload to Supabase storage
  const handleCropConfirmed = async (croppedBlob) => {
    setIsCropModalOpen(false)
    if (!croppedBlob || !currentStore?.id) return

    setLogoUploading(true)
    try {
      const compressed = await compressImage(croppedBlob, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.85,
        targetSizeKB: 180,
      })

      const ext = 'webp'
      const path = `stores/${currentStore.id}/logo_${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, compressed, { upsert: true, contentType: 'image/webp' })

      if (uploadErr) throw uploadErr

      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path)
      const nextUrl = publicData?.publicUrl

      if (nextUrl) {
        setLogoUrl(nextUrl)
        setIsDirty(true)
        setSaveStatus(null)
        // Auto-persist logo url
        await updateStoreSettings({ logo_url: nextUrl })
      }
    } catch (err) {
      alert(err.message || 'Ошибка загрузки логотипа')
    } finally {
      setLogoUploading(false)
      if (cropImageSrc) {
        URL.revokeObjectURL(cropImageSrc)
        setCropImageSrc(null)
      }
    }
  }

  const handlePhotosChange = (nextImages) => {
    setSettings((prev) => ({ ...prev, images: nextImages }))
    setIsDirty(true)
    setSaveStatus(null)
  }

  const handlePhotosAutoSave = async (nextImages) => {
    if (!currentStore?.id) return
    await updateStoreSettings({ images: nextImages })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus(null)
    setSaveErrorMessage('')

    const payload = {
      name: settings.name,
      short_description: settings.short_description,
      description: settings.description,
      type: settings.type,
      logo_url: logoUrl,
      images: settings.images,
    }

    const { error } = await updateStoreSettings(payload)
    setIsSaving(false)

    if (error) {
      setSaveStatus('error')
      setSaveErrorMessage(error)
    } else {
      setIsDirty(false)
      setSaveStatus('ok')
      setTimeout(() => setSaveStatus(null), 3500)
    }
  }

  const handleDiscard = () => {
    if (!currentStore) return
    setSettings({
      name: currentStore.name || '',
      short_description: currentStore.short_description || '',
      description: currentStore.description || '',
      type: currentStore.type || 'minimarket',
      images: Array.isArray(currentStore.images) ? currentStore.images : [],
    })
    setLogoUrl(currentStore.logo_url || null)
    setIsDirty(false)
    setSaveStatus(null)
  }

  const previewSettingsAdapter = {
    name: settings.name || currentStore?.name,
    type: settings.type || 'minimarket',
    address: currentStore?.address,
    opening_hours: currentStore?.opening_hours,
    short_description: settings.short_description,
    phone: currentStore?.phone,
    is_published: isPublished,
  }

  return (
    <div className="retail-screen-canvas" style={{ padding: '0 0 100px' }}>
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

      {/* ── Top Bar: Title & Quick Actions ── */}
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--text)',
              margin: '0 0 6px',
              letterSpacing: '-0.3px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <EyeIcon size={24} color="var(--retail-accent, #38BDF8)" />
            <span>{t('retail.nav.storefront') || 'Витрина покупателя'}</span>
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.45 }}>
            {isKz
              ? 'Сатып алушылар дүкеніңізді смартфоннан қалай көретінін реттеңіз'
              : 'Настройте брендинг, логотип, фотографии и материалы витрины для покупателей'}
          </p>
        </div>

        {storeSlug && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 15px',
                borderRadius: 12,
                background: 'var(--glass-bg)',
                border: '1px solid var(--retail-border)',
                color: 'var(--text)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'all 0.15s ease',
              }}
            >
              {copied ? (
                <>
                  <CheckCircleIcon size={16} color="var(--success-bright, #10B981)" />
                  <span style={{ color: 'var(--success-bright, #10B981)' }}>
                    {isKz ? 'Көшірілді!' : 'Скопировано!'}
                  </span>
                </>
              ) : (
                <>
                  <ShareIcon size={16} color="var(--text-sub)" />
                  <span>{isKz ? 'Сілтемені көшіру' : 'Скопировать ссылку'}</span>
                </>
              )}
            </button>

            <a
              href={`/s/${storeSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                fontFamily: 'var(--font-display)',
                transition: 'transform 0.15s ease',
              }}
            >
              <EyeIcon size={16} color="#ffffff" />
              <span>{isKz ? 'Витринаны ашу' : 'Открыть витрину'}</span>
              <ExternalLinkIcon size={13} color="rgba(255,255,255,0.7)" />
            </a>
          </div>
        )}
      </div>

      {/* ── 2-Column Responsive Layout ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 28,
          alignItems: 'start',
        }}
      >
        {/* Left Column: Editor Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 1. Брендинг и логотип */}
          <div style={CARD_STYLE}>
            <div style={{ ...FIELD_LABEL, marginBottom: 16 }}>
              {isKz ? '1. БРЕНДИНГ ЖӘНЕ ЛОГОТИП' : '1. БРЕНДИНГ И ЛОГОТИП'}
            </div>

            {/* Logo Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
              <div
                onClick={() => logoInputRef.current?.click()}
                title={logoUrl ? 'Изменить логотип' : 'Загрузить логотип'}
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
                  cursor: 'pointer',
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
                <div
                  style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}
                >
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
                />

                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
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
                    cursor: 'pointer',
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
                onChange={(e) => handleChange('short_description', e.target.value)}
                placeholder={
                  isKz
                    ? 'Мысалы: Үй жанындағы жаңа піскен халал өнімдер'
                    : 'Например: Свежая выпечка и халал-продукты у дома'
                }
                maxLength={120}
                style={INPUT_STYLE}
              />
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                {isKz
                  ? 'Витринада атаудың астында көрсетіледі'
                  : 'Отображается сразу под названием на главной витрине'}
              </div>
            </div>

            {/* Store Type Format */}
            <div style={{ marginBottom: 18 }}>
              <div style={FIELD_LABEL}>
                {isKz ? 'Сауда нүктесінің форматы' : 'Формат торговой точки'}
              </div>
              <div style={{ position: 'relative' }}>
                <select
                  value={settings.type || 'minimarket'}
                  onChange={(e) => handleChange('type', e.target.value)}
                  style={{
                    ...INPUT_STYLE,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    paddingRight: 36,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <option value="minimarket">
                    {t('retail.settings.typeMinimarket') || 'Минимаркет'}
                  </option>
                  <option value="supermarket">
                    {t('retail.settings.typeSupermarket') || 'Супермаркет'}
                  </option>
                  <option value="halal">{t('retail.settings.typeHalal') || 'Халал маркет'}</option>
                  <option value="specialty">
                    {t('retail.settings.typeSpecialty') || 'Специализированный'}
                  </option>
                  <option value="convenience">
                    {t('retail.settings.typeConvenience') || 'Магазин у дома'}
                  </option>
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
                onChange={(e) => handleChange('description', e.target.value)}
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
              />
            </div>
          </div>

          {/* 2. Фотографии магазина */}
          <div style={CARD_STYLE}>
            <div style={{ ...FIELD_LABEL, marginBottom: 16 }}>
              {isKz ? '2. ДҮКЕННІҢ ФОТОСУРЕТТЕРІ' : '2. ФОТОГРАФИИ МАГАЗИНА И ПОЛОК'}
            </div>
            <StorePhotosManager
              storeId={currentStore?.id}
              images={settings.images}
              onChange={handlePhotosChange}
              onAutoSave={handlePhotosAutoSave}
              disabled={isSaving}
            />
          </div>

          {/* 3. Готовый комплект QR-материалов */}
          <div style={CARD_STYLE}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(56, 189, 248, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <QrCodeIcon size={22} color="var(--retail-accent, #38BDF8)" />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: 'var(--font-display)',
                    color: 'var(--text)',
                  }}
                >
                  {isKz ? '3. Касса мен сөрелерге арналған QR' : '3. Печать QR-материалов для зала'}
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {isKz
                    ? 'Сатып алушыларға арналған баспа макеті'
                    : 'Готовый фирменный комплект для входной группы'}
                </span>
              </div>
            </div>

            <p
              style={{
                margin: '0 0 16px',
                fontSize: 13,
                color: 'var(--text-sub)',
                lineHeight: 1.5,
              }}
            >
              {isKz
                ? 'Бұл QR-кодты басып шығарып, кассаның қасына немесе кіреберіске орнатыңыз. Сатып алушылар телефонмен сканерлеп, витринаны бірден ашады.'
                : 'Покупатели сканируют этот QR-код камерой смартфона при входе в магазин или на кассе, чтобы открыть мобильную витрину.'}
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '14px 16px',
                borderRadius: 14,
                background: 'var(--glass-subtle)',
                border: '1px solid var(--line-soft)',
              }}
            >
              <div
                style={{
                  padding: 8,
                  borderRadius: 10,
                  background: '#ffffff',
                  display: 'inline-flex',
                  flexShrink: 0,
                }}
              >
                <QRCode value={publicStoreUrl} size={64} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}
                >
                  {currentStore?.name || 'Körset Store'}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'var(--text-dim)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {publicStoreUrl}
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  padding: '9px 16px',
                  borderRadius: 10,
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.28)',
                  color: 'var(--retail-accent, #38BDF8)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                {isKz ? 'Басып шығару' : 'Печать А4'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Phone Mockup Preview Card (Sticky on desktop) */}
        <div style={{ position: 'sticky', top: 24 }}>
          <StoreLivePreviewCard
            settings={previewSettingsAdapter}
            logoUrl={logoUrl}
            phones={currentStore?.features?.contacts?.phones || []}
          />
        </div>
      </div>

      {/* Floating Save Bar when user modified fields */}
      <RetailSaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        saveStatus={saveStatus}
        saveErrorMessage={saveErrorMessage}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  )
}
