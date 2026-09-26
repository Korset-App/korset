import { useState, useRef, useEffect, useCallback } from 'react'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { supabase } from '../utils/supabase.js'
import QRCode from 'react-qr-code'
import { clearStoreCatalog } from '../utils/retailAnalytics.js'
import ConfirmDangerModal from '../components/ConfirmDangerModal.jsx'
import Toggle from '../components/Toggle.jsx'
import StorePhotosManager from '../components/retail/StorePhotosManager.jsx'
import StoreScheduleEditor from '../components/retail/StoreScheduleEditor.jsx'
import StoreLocationModal from '../components/retail/StoreLocationModal.jsx'
import StoreAmenitiesEditor from '../components/retail/StoreAmenitiesEditor.jsx'
import { compressImage } from '../utils/imageCompressor.js'
import {
  buildRetailStoreSettingsPayload,
  getAIStoreNotesLimit,
} from '../domain/retail/storeSettings.js'
import {
  StorefrontIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SyncIcon,
  ShareIcon,
  EyeIcon,
  CameraIcon,
  InstallIcon,
  TrashIcon,
  LocationPinIcon,
  BarcodeScannerIcon,
  InstagramIcon,
  WhatsAppIcon,
  TwoGisIcon,
  PhoneCallIcon,
} from '../components/icons/index.js'

// ── Phone mask utilities ──────────────────────────────────────────
const initLocalPhone = (stored) => {
  if (!stored) return ''
  const d = String(stored).replace(/\D/g, '')
  if (d.length > 10 && (d.startsWith('7') || d.startsWith('8'))) return d.slice(1, 11)
  return d.slice(0, 10)
}

const formatLocalPhone = (local) => {
  if (!local) return ''
  const d = local.slice(0, 10)
  let r = '+7 (' + d.slice(0, Math.min(3, d.length))
  if (d.length >= 3) r += ')'
  if (d.length > 3) r += ' ' + d.slice(3, Math.min(6, d.length))
  if (d.length > 6) r += '-' + d.slice(6, Math.min(8, d.length))
  if (d.length > 8) r += '-' + d.slice(8, 10)
  return r
}

export default function RetailSettingsScreen() {
  const { t } = useI18n()
  const { currentStore, updateStoreSettings } = useStore()

  const [settings, setSettings] = useState({
    name: currentStore?.name || '',
    address: currentStore?.address || '',
    phone: initLocalPhone(currentStore?.phone),
    opening_hours: currentStore?.opening_hours || '',
    short_description: currentStore?.short_description || '',
    description: currentStore?.description || '',
    instagram_url: currentStore?.instagram_url || '',
    whatsapp_number: initLocalPhone(currentStore?.whatsapp_number),
    twogis_url: currentStore?.twogis_url || '',
    website_url: currentStore?.website_url || '',
    ai_store_notes: currentStore?.ai_store_notes || '',
    notifyMissing: currentStore?.notify_oos_enabled ?? true,
    notifyDaily: currentStore?.notify_daily_enabled ?? false,
    images: Array.isArray(currentStore?.images) ? currentStore.images : [],
    latitude: currentStore?.latitude || '',
    longitude: currentStore?.longitude || '',
    is_published: currentStore?.is_published !== false,
    temporary_closure: currentStore?.temporary_closure || null,
    type: currentStore?.type || 'minimarket',
    features: Array.isArray(currentStore?.features) ? currentStore.features : [],
  })

  const [showQR, setShowQR] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'ok' | 'error'
  const [saveErrorMessage, setSaveErrorMessage] = useState('')
  const [savingToggle, setSavingToggle] = useState(null)
  const [showClearModal, setShowClearModal] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(currentStore?.logo_url || null)
  const [showMapModal, setShowMapModal] = useState(false)
  const [geocoding, setGeocoding] = useState(false)

  const logoInputRef = useRef(null)
  const qrRef = useRef(null)
  const lastSyncedStoreIdRef = useRef(null)

  // Re-sync with store when currentStore changes
  useEffect(() => {
    if (!currentStore) return
    if (currentStore.id === lastSyncedStoreIdRef.current) return
    lastSyncedStoreIdRef.current = currentStore.id

    setSettings({
      name: currentStore.name || '',
      address: currentStore.address || '',
      phone: initLocalPhone(currentStore.phone),
      opening_hours: currentStore.opening_hours || '',
      short_description: currentStore.short_description || '',
      description: currentStore.description || '',
      instagram_url: currentStore.instagram_url || '',
      whatsapp_number: initLocalPhone(currentStore.whatsapp_number),
      twogis_url: currentStore.twogis_url || '',
      website_url: currentStore.website_url || '',
      ai_store_notes: currentStore.ai_store_notes || '',
      notifyMissing: currentStore.notify_oos_enabled ?? true,
      notifyDaily: currentStore.notify_daily_enabled ?? false,
      images: Array.isArray(currentStore.images) ? currentStore.images : [],
      latitude: currentStore.latitude || '',
      longitude: currentStore.longitude || '',
      is_published: currentStore.is_published !== false,
      temporary_closure: currentStore.temporary_closure || null,
      type: currentStore.type || 'minimarket',
      features: Array.isArray(currentStore.features) ? currentStore.features : [],
    })
    setLogoUrl(currentStore.logo_url || null)
  }, [currentStore])

  const handleChange = useCallback((key, val) => {
    setSettings((p) => ({ ...p, [key]: val }))
    setSaveStatus(null)
    setSaveErrorMessage('')
  }, [])

  // Auto-save toggle to Supabase immediately
  const handleToggle = async (key, dbField) => {
    const newVal = !settings[key]
    setSettings((p) => ({ ...p, [key]: newVal }))
    setSavingToggle(key)
    const { error } = await updateStoreSettings({ [dbField]: newVal })
    setSavingToggle(null)
    if (error) {
      setSettings((p) => ({ ...p, [key]: !newVal }))
      alert(t('retail.settings.saveError') || 'Ошибка сохранения')
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus(null)
    setSaveErrorMessage('')
    const payload = buildRetailStoreSettingsPayload(settings)
    const { error } = await updateStoreSettings(payload)
    setIsSaving(false)
    if (error) {
      setSaveStatus('error')
      setSaveErrorMessage(error)
    } else {
      setSaveStatus('ok')
      setTimeout(() => setSaveStatus(null), 3500)
    }
  }

  // Logo upload with WebP compression
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !currentStore?.id) return

    const ALLOWED = ['image/png', 'image/jpeg', 'image/webp']
    if (!ALLOWED.includes(file.type)) {
      alert(t('retail.settings.logoFormatError') || 'Разрешены форматы PNG, JPG, WEBP')
      if (logoInputRef.current) logoInputRef.current.value = ''
      return
    }

    setLogoUploading(true)
    let uploadFile = file
    try {
      uploadFile = await compressImage(file, { maxWidth: 600, maxHeight: 600, quality: 0.85 })
    } catch (err) {
      console.warn('Logo compression fallback', err)
    }

    const ext = uploadFile.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${currentStore.id}/logo_${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('store-logos')
      .upload(path, uploadFile, { upsert: true, contentType: uploadFile.type })

    if (uploadError) {
      setLogoUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
      alert((t('retail.settings.logoUploadError') || 'Ошибка загрузки: ') + uploadError.message)
      return
    }

    const { data: urlData } = supabase.storage.from('store-logos').getPublicUrl(path)
    const url = urlData?.publicUrl
    if (url) {
      await updateStoreSettings({ logo_url: url })
      setLogoUrl(url + '?t=' + Date.now())
    }
    if (logoInputRef.current) logoInputRef.current.value = ''
    setLogoUploading(false)
  }

  const handleLogoDelete = async () => {
    if (!currentStore?.id) return
    const msg = t('retail.settings.confirmDeleteLogo') || 'Удалить логотип магазина?'
    if (!window.confirm(msg)) return

    setLogoUrl(null)
    await updateStoreSettings({ logo_url: null })
  }

  // Address geocoding helper with city context
  const handleGeocode = async () => {
    if (!settings.address) {
      alert(t('retail.settings.addressEmptyError') || 'Пожалуйста, введите адрес сначала')
      return
    }
    setGeocoding(true)
    try {
      const city = currentStore?.city || 'Астана'
      const query = settings.address.toLowerCase().includes(city.toLowerCase())
        ? `${settings.address}, Казахстан`
        : `${city}, ${settings.address}, Казахстан`

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&limit=1&countrycodes=kz&accept-language=ru`
      )
      const data = await res.json()
      if (data && data[0]) {
        const lat = Number(Number(data[0].lat).toFixed(6))
        const lon = Number(Number(data[0].lon).toFixed(6))
        handleChange('latitude', lat)
        handleChange('longitude', lon)
        await updateStoreSettings({ latitude: lat, longitude: lon })
        alert(
          t('retail.settings.geocodeSuccess') || `Координаты успешно определены: ${lat}, ${lon}`
        )
      } else {
        setShowMapModal(true)
      }
    } catch {
      setShowMapModal(true)
    } finally {
      setGeocoding(false)
    }
  }

  const handleLocationConfirmed = async ({ latitude, longitude, detectedAddress }) => {
    handleChange('latitude', latitude)
    handleChange('longitude', longitude)
    if (detectedAddress && !settings.address) {
      handleChange('address', detectedAddress)
    }
    await updateStoreSettings({ latitude, longitude })
  }

  // Store invite URL for QR code
  const storeInviteUrl = currentStore?.code
    ? `${window.location.origin}/join/${currentStore.code}`
    : `${window.location.origin}/join/demo-store`

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = 400
      canvas.height = 400
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, 400, 400)
      ctx.drawImage(img, 40, 40, 320, 320)
      ctx.fillStyle = '#7C3AED'
      ctx.fillRect(130, 350, 140, 30)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('KÖRSET', 200, 370)

      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `korset-store-${currentStore?.code || 'invite'}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const handleConfirmClear = async () => {
    if (!currentStore?.id) return
    try {
      setIsClearing(true)
      await clearStoreCatalog(currentStore.id)
      setIsClearing(false)
      setShowClearModal(false)
      alert(t('retail.products.allResolved') || 'Каталог успешно очищен')
    } catch (e) {
      setIsClearing(false)
      alert(t('retail.settings.clearError') + e.message)
    }
  }

  // Phone input formatting
  const handlePhoneInput = (key, newDisplayValue) => {
    const prevLocal = key === 'phone' ? settings.phone : settings.whatsapp_number
    const expectedDisplay = formatLocalPhone(prevLocal)
    if (newDisplayValue.length > expectedDisplay.length + 1) {
      const all = newDisplayValue.replace(/\D/g, '')
      const local =
        all.length > 10 && (all.startsWith('7') || all.startsWith('8'))
          ? all.slice(1, 11)
          : all.slice(0, 10)
      handleChange(key, local)
    } else if (newDisplayValue.length > expectedDisplay.length) {
      const newChar = newDisplayValue.replace(/\D/g, '').slice(-1)
      if (/\d/.test(newChar)) handleChange(key, (prevLocal + newChar).slice(0, 10))
    } else {
      handleChange(key, prevLocal.slice(0, -1))
    }
  }

  const aiNotesText = settings.ai_store_notes || ''
  const aiNotesWords = aiNotesText.trim() ? aiNotesText.trim().split(/\s+/).length : 0
  const aiNotesChars = aiNotesText.length
  const aiNotesLimit = getAIStoreNotesLimit()

  const SECTION_LABEL_STYLE = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingLeft: 4,
  }

  const CARD_STYLE = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 18,
    overflow: 'hidden',
    padding: 18,
    boxShadow: 'var(--shadow-card)',
  }

  const INPUT_STYLE = {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    padding: '11px 14px',
    borderRadius: 12,
    fontSize: 14,
    outline: 'none',
    fontFamily: 'var(--font-body)',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  }

  const FIELD_LABEL = {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: 6,
  }

  return (
    <>
      <ConfirmDangerModal
        open={showClearModal}
        title={t('retail.settings.clearModalTitle')}
        description={t('retail.settings.clearModalDesc')}
        confirmWord={t('retail.settings.clearModalWord')}
        confirmLabel={t('retail.settings.clearModalConfirm')}
        cancelLabel={t('retail.settings.clearModalCancel')}
        onConfirm={handleConfirmClear}
        onCancel={() => setShowClearModal(false)}
        loading={isClearing}
      />

      <StoreLocationModal
        isOpen={showMapModal}
        initialAddress={settings.address}
        initialCity={currentStore?.city || 'Астана'}
        initialLat={settings.latitude}
        initialLon={settings.longitude}
        onConfirm={handleLocationConfirmed}
        onClose={() => setShowMapModal(false)}
      />

      {/* ── Brand Sticky Topbar in Sky/Turquoise Gradient ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 25,
          padding: 'calc(14px + env(safe-area-inset-top, 0px)) 20px 18px',
          background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)',
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          boxShadow: '0 10px 24px rgba(2, 132, 199, 0.22)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Overscroll bleed element to prevent white ceiling when pulled down */}
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            height: 800,
            background: 'inherit',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />

        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              color: '#ffffff',
              letterSpacing: '-0.3px',
              lineHeight: 1.2,
            }}
          >
            {t('retail.settings.title') || 'Настройки профиля'}
          </h1>
          <div
            style={{
              margin: '3px 0 0',
              fontSize: 12,
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: 1.3,
            }}
          >
            {t('retail.settings.subtitle') || 'Управление витриной и данными магазина'}
          </div>
        </div>

        {currentStore?.slug ? (
          <a
            href={`/s/${currentStore.slug}#store-about`}
            target="_blank"
            rel="noopener noreferrer"
            title={t('retail.viewStoreFront') || 'Открыть витрину покупателя'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 14px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            <EyeIcon size={16} color="#ffffff" />
            <span>{t('retail.settings.previewStoreBtn') || 'Витрина'}</span>
          </a>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 14px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.15)',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'default',
            }}
          >
            <EyeIcon size={16} color="currentColor" />
            <span>{t('retail.settings.previewStoreBtn') || 'Витрина'}</span>
          </span>
        )}
      </div>

      <div
        style={{ padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        {/* ── 1. ОСНОВНАЯ ИНФОРМАЦИЯ ── */}
        <div>
          <div style={SECTION_LABEL_STYLE}>
            {t('retail.settings.infoTitle') || 'ОСНОВНАЯ ИНФОРМАЦИЯ'}
          </div>
          <div style={{ ...CARD_STYLE, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* 1.1 Логотип магазина */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '4px 0',
              }}
            >
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 20,
                  border: '1.5px solid var(--border-bright)',
                  background: 'var(--surface)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.16)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="logo"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }}
                  />
                ) : (
                  <StorefrontIcon size={36} color="var(--text-dim)" />
                )}
                {logoUploading && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0, 0, 0, 0.72)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SyncIcon
                      size={22}
                      color="var(--retail-accent, #38bdf8)"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 16,
                    color: 'var(--text)',
                    fontWeight: 700,
                    fontFamily: 'var(--font-display)',
                    marginBottom: 2,
                  }}
                >
                  {t('retail.settings.logoLabel') || 'Логотип магазина'}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-sub)',
                    lineHeight: 1.35,
                    marginBottom: 10,
                  }}
                >
                  Отображается на витрине, в поиске и в карточках товаров
                </div>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleLogoUpload}
                />

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: 'var(--retail-accent, #38BDF8)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: logoUploading ? 'default' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontFamily: 'var(--font-display)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {logoUploading ? (
                      <SyncIcon size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <CameraIcon size={15} />
                    )}
                    {logoUrl
                      ? t('retail.settings.replaceLogo') || 'Заменить'
                      : t('retail.settings.logoUpload') || 'Загрузить логотип'}
                  </button>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleLogoDelete}
                      disabled={logoUploading}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 10,
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: 'var(--error-bright, #EF4444)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontFamily: 'var(--font-display)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <TrashIcon size={14} />
                      {t('retail.settings.deleteLogo') || 'Удалить'}
                    </button>
                  )}
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
                  {t('retail.settings.logoHint') || 'PNG, JPG, WEBP · До 2MB'}
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--line-soft)', margin: '2px 0' }} />

            {/* 1.2 Название магазина */}
            <div>
              <div style={FIELD_LABEL}>{t('retail.settings.nameLabel') || 'Название магазина'}</div>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => handleChange('name', e.target.value)}
                style={INPUT_STYLE}
                placeholder="Например: Bereke Market"
                maxLength={80}
              />
            </div>

            {/* 1.3 Слоган магазина */}
            <div>
              <div style={FIELD_LABEL}>
                {t('retail.settings.sloganLabel') || 'Слоган магазина'}
                <span
                  style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6, fontWeight: 400 }}
                >
                  {t('retail.settings.sloganHint') || '(Отображается под названием на витрине)'}
                </span>
              </div>
              <input
                type="text"
                value={settings.short_description}
                onChange={(e) => handleChange('short_description', e.target.value)}
                placeholder={
                  t('retail.settings.sloganPlaceholder') ||
                  'Например: Свежая выпечка и халал-продукты у дома'
                }
                maxLength={120}
                style={INPUT_STYLE}
              />
            </div>

            {/* 1.4 Тип магазина */}
            <div>
              <div style={FIELD_LABEL}>
                {t('retail.settings.storeTypeLabel') || 'Тип магазина'}
                <span
                  style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6, fontWeight: 400 }}
                >
                  {t('retail.settings.storeTypeHint') || '(Формат торговой точки)'}
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: 8,
                  marginTop: 6,
                }}
              >
                {[
                  { id: 'minimarket', label: t('stores.type.minimarket') || 'Минимаркет' },
                  { id: 'supermarket', label: t('stores.type.supermarket') || 'Супермаркет' },
                  { id: 'halal', label: t('stores.type.halal') || 'Халал маркет' },
                  { id: 'specialty', label: t('stores.type.specialty') || 'Специализированный' },
                  { id: 'other', label: t('stores.type.other') || 'Магазин у дома' },
                ].map((item) => {
                  const isSelected = (settings.type || 'minimarket') === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleChange('type', item.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: isSelected
                          ? '1.5px solid var(--retail-accent, #38BDF8)'
                          : '1px solid var(--border)',
                        background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'var(--surface)',
                        color: isSelected ? 'var(--retail-accent, #38BDF8)' : 'var(--text)',
                        fontSize: 13,
                        fontWeight: isSelected ? 600 : 400,
                        fontFamily: 'var(--font-display)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1.25,
                      }}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 1.5 Полное описание магазина */}
            <div>
              <div style={FIELD_LABEL}>
                {t('retail.settings.fullDescLabel') || 'Полное описание магазина'}
              </div>
              <textarea
                value={settings.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder={
                  t('retail.settings.fullDescPlaceholder') ||
                  'Особенности магазина, ассортимент, парковка...'
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
        </div>

        {/* ── 2. КОНТАКТЫ И СОЦСЕТИ ── */}
        <div>
          <div style={SECTION_LABEL_STYLE}>
            {t('retail.settings.contactsTitle') || 'КОНТАКТЫ И СОЦСЕТИ'}
          </div>
          <div style={{ ...CARD_STYLE, padding: 0, overflow: 'hidden' }}>
            {[
              {
                key: 'phone',
                label: t('retail.settings.phoneLabel') || 'Телефон магазина',
                subLabel: t('retail.settings.phoneSubLabel') || 'Номер для звонков покупателей',
                icon: PhoneCallIcon,
                placeholder: '+7 (700) 000-00-00',
                type: 'tel',
                isPhone: true,
              },
              {
                key: 'whatsapp_number',
                label: 'WhatsApp',
                subLabel:
                  t('retail.settings.whatsappSubLabel') || 'Для быстрых сообщений и заказов',
                icon: WhatsAppIcon,
                placeholder: '+7 (700) 000-00-00',
                type: 'tel',
                isPhone: true,
              },
              {
                key: 'instagram_url',
                label: 'Instagram',
                subLabel: t('retail.settings.instagramSubLabel') || 'Профиль магазина или никнейм',
                icon: InstagramIcon,
                placeholder: 'https://instagram.com/store или @store',
                type: 'text',
              },
              {
                key: 'twogis_url',
                label: '2GIS',
                subLabel:
                  t('retail.settings.twogisSubLabel') || 'Ссылка на карточку филиала в 2GIS',
                icon: TwoGisIcon,
                placeholder: 'https://2gis.kz/astana/firm/...',
                type: 'url',
              },
            ].map((field, idx, arr) => {
              const IconComp = field.icon
              return (
                <div key={field.key}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--retail-accent, #38BDF8)',
                        flexShrink: 0,
                      }}
                    >
                      <IconComp size={18} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}
                      >
                        <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                          {field.label}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                          {field.subLabel}
                        </span>
                      </div>
                      <input
                        type={field.type}
                        value={
                          field.isPhone
                            ? formatLocalPhone(settings[field.key])
                            : settings[field.key] || ''
                        }
                        onChange={(e) => {
                          if (field.isPhone) handlePhoneInput(field.key, e.target.value)
                          else handleChange(field.key, e.target.value)
                        }}
                        placeholder={field.placeholder}
                        style={{
                          ...INPUT_STYLE,
                          padding: '7px 10px',
                          fontSize: 13,
                        }}
                      />
                    </div>
                  </div>
                  {idx < arr.length - 1 && (
                    <div style={{ height: 1, background: 'var(--line-soft)', margin: '0 16px' }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── 3. ФАКТИЧЕСКИЙ АДРЕС И КАРТА ── */}
        <div>
          <div style={SECTION_LABEL_STYLE}>
            {t('retail.settings.addressLabel') || 'ФАКТИЧЕСКИЙ АДРЕС И КАРТА'}
          </div>
          <div style={{ ...CARD_STYLE, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={FIELD_LABEL}>
                {t('retail.settings.addressLabel') || 'Фактический адрес'}
              </div>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Например: ул. Сыганак, 14"
                style={INPUT_STYLE}
              />

              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleGeocode}
                  disabled={geocoding}
                  style={{
                    flex: 1,
                    minWidth: 140,
                    padding: '9px 12px',
                    borderRadius: 10,
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    color: 'var(--retail-accent, #38BDF8)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: geocoding ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  {geocoding ? (
                    <SyncIcon size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <LocationPinIcon size={14} />
                  )}
                  {t('retail.settings.findCoords') || 'Определить координаты'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowMapModal(true)}
                  style={{
                    flex: 1,
                    minWidth: 140,
                    padding: '9px 12px',
                    borderRadius: 10,
                    background: 'rgba(124, 58, 237, 0.1)',
                    border: '1px solid rgba(124, 58, 237, 0.25)',
                    color: '#A78BFA',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <LocationPinIcon size={14} />
                  {t('retail.settings.viewOnMap') || 'Указать на карте'}
                </button>
              </div>

              {settings.latitude && settings.longitude && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: '#10B981',
                    marginTop: 10,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                  }}
                >
                  <CheckCircleIcon size={14} color="#10B981" />
                  <span>
                    {t('retail.settings.coordsSet') || 'Координаты зафиксированы:'}{' '}
                    {Number(settings.latitude).toFixed(5)}, {Number(settings.longitude).toFixed(5)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 4. ФОТОГРАФИИ МАГАЗИНА (ПО ЗОНАМ) ── */}
        <StorePhotosManager
          storeId={currentStore?.id}
          images={settings.images}
          onChange={(imgs) => handleChange('images', imgs)}
          onAutoSave={(imgs) => updateStoreSettings({ images: imgs })}
        />

        {/* ── 5. ОСОБЕННОСТИ И СЕРВИС МАГАЗИНА ── */}
        <StoreAmenitiesEditor
          selectedFeatures={settings.features}
          onChange={(feats) => handleChange('features', feats)}
        />

        {/* ── 6. ЗАМЕТКИ ДЛЯ KÖRSET AI ── */}
        <div>
          <div style={SECTION_LABEL_STYLE}>
            {t('retail.settings.aiNotesTitle') || 'ЗАМЕТКИ ДЛЯ KÖRSET AI'}
          </div>
          <div style={{ ...CARD_STYLE, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={FIELD_LABEL}>
                {t('retail.settings.aiNotesLabel') || 'Факты для ассистента у полки'}
                <span
                  style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6, fontWeight: 400 }}
                >
                  {t('retail.settings.aiNotesHint') || '(Видит только AI)'}
                </span>
              </div>
              <textarea
                value={settings.ai_store_notes}
                onChange={(e) => handleChange('ai_store_notes', e.target.value)}
                placeholder={
                  t('retail.settings.aiNotesPlaceholder') ||
                  'Например: доставка до двери после 18:00, свежая выпечка в 08:30, фермерская молочка по вторникам...'
                }
                maxLength={getAIStoreNotesLimit()}
                rows={4}
                style={{
                  ...INPUT_STYLE,
                  resize: 'vertical',
                  minHeight: 90,
                  lineHeight: 1.4,
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11,
                  color: 'var(--text-dim)',
                  marginTop: 6,
                }}
              >
                <span>
                  {t('retail.settings.aiNotesWarning') ||
                    'Пишите только проверяемые факты о магазине'}
                </span>
                <span style={{ fontWeight: 600 }}>
                  {aiNotesWords} {t('retail.settings.words') || 'слов'} · {aiNotesChars}/
                  {aiNotesLimit} {t('retail.settings.chars') || 'симв.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 7. ГРАФИК РАБОТЫ И ПЛАНОВЫЕ ЗАКРЫТИЯ ── */}
        <div>
          <div style={SECTION_LABEL_STYLE}>
            {t('retail.settings.openingHoursLabel') || 'ГРАФИК РАБОТЫ И ПЛАНОВЫЕ ЗАКРЫТИЯ'}
          </div>
          <div style={CARD_STYLE}>
            <StoreScheduleEditor
              openingHours={settings.opening_hours}
              temporaryClosure={settings.temporary_closure}
              onChange={({ opening_hours, temporary_closure }) => {
                handleChange('opening_hours', opening_hours)
                handleChange('temporary_closure', temporary_closure)
              }}
            />
          </div>
        </div>

        {/* ── 8. QR-КОД И ССЫЛКА ДЛЯ ПОКУПАТЕЛЕЙ ── */}
        <div>
          <div style={SECTION_LABEL_STYLE}>
            {t('retail.settings.inviteTitle') || 'ПРИГЛАШЕНИЕ В МАГАЗИН'}
          </div>
          <div style={CARD_STYLE}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(124,58,237,0.15)',
                  border: '1px solid rgba(124,58,237,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BarcodeScannerIcon size={20} color="#A78BFA" />
              </div>
              <div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
                  {t('retail.settings.qrConnect') || 'Подключение по QR-коду'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                  {t('retail.settings.qrHint') || 'Покупатели сканируют код для входа на витрину'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowQR(!showQR)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(124,58,237,0.1)',
                border: '1px solid rgba(124,58,237,0.25)',
                color: '#A78BFA',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <EyeIcon size={16} />
              {showQR
                ? t('retail.settings.hideQr') || 'Скрыть QR-код'
                : t('retail.settings.showQr') || 'Показать QR-код'}
            </button>

            {showQR && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px',
                  background: 'var(--input-bg)',
                  borderRadius: 12,
                  marginTop: 12,
                }}
              >
                <div
                  ref={qrRef}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: 12,
                    position: 'relative',
                  }}
                >
                  <QRCode
                    value={storeInviteUrl}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 16,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--primary)',
                      color: '#fff',
                      padding: '2px 10px',
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    KÖRSET
                  </div>
                </div>

                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
                    {t('retail.settings.linkLabel') || 'Прямая ссылка на магазин:'}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--retail-accent, #38BDF8)',
                      fontFamily: 'monospace',
                      background: 'rgba(56,189,248,0.08)',
                      padding: '6px 10px',
                      borderRadius: 8,
                      wordBreak: 'break-all',
                    }}
                  >
                    {storeInviteUrl}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(storeInviteUrl)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'rgba(56,189,248,0.12)',
                      border: '1px solid rgba(56,189,248,0.25)',
                      color: 'var(--retail-accent, #38BDF8)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <ShareIcon size={14} />
                    {t('retail.settings.copy') || 'Копировать'}
                  </button>

                  <button
                    type="button"
                    onClick={downloadQR}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'rgba(124,58,237,0.15)',
                      border: '1px solid rgba(124,58,237,0.3)',
                      color: '#A78BFA',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <InstallIcon size={14} />
                    {t('retail.settings.downloadPng') || 'Скачать PNG'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 9. УВЕДОМЛЕНИЯ (С ИСПОЛЬЗОВАНИЕМ TOGGLE) ── */}
        <div>
          <div style={SECTION_LABEL_STYLE}>{t('retail.settings.notifyTitle') || 'УВЕДОМЛЕНИЯ'}</div>
          <div style={{ ...CARD_STYLE, padding: 0 }}>
            {/* Toggle 1 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
              }}
            >
              <div>
                <div
                  style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, marginBottom: 2 }}
                >
                  {t('retail.settings.notifyMissingTitle') || 'Отсутствующие товары'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                  {t('retail.settings.notifyMissingHint') ||
                    'Пуш-уведомление, если покупатель не нашел товар'}
                </div>
              </div>
              <Toggle
                checked={settings.notifyMissing}
                onChange={() => handleToggle('notifyMissing', 'notify_oos_enabled')}
                disabled={savingToggle === 'notifyMissing'}
              />
            </div>

            <div style={{ height: 1, background: 'var(--line-soft)', margin: '0 16px' }} />

            {/* Toggle 2 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
              }}
            >
              <div>
                <div
                  style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, marginBottom: 2 }}
                >
                  {t('retail.settings.notifyDailyTitle') || 'Ежедневный отчет'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                  {t('retail.settings.notifyDailyHint') || 'Сводка сканирований каждый вечер'}
                </div>
              </div>
              <Toggle
                checked={settings.notifyDaily}
                onChange={() => handleToggle('notifyDaily', 'notify_daily_enabled')}
                disabled={savingToggle === 'notifyDaily'}
              />
            </div>
          </div>
        </div>

        {/* ── 10. ОПАСНАЯ ЗОНА ── */}
        <div>
          <div style={{ ...SECTION_LABEL_STYLE, color: '#EF4444' }}>
            {t('retail.settings.dangerTitle') || 'ОПАСНАЯ ЗОНА'}
          </div>
          <div
            style={{
              background: 'var(--card-bg, #0f172a)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 16,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {/* 10.1 Publication Status Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
                    {t('retail.settings.publishStatusTitle') || 'Публикация магазина'}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: settings.is_published
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(239, 68, 68, 0.12)',
                      color: settings.is_published ? '#10B981' : '#EF4444',
                      border: `1px solid ${
                        settings.is_published
                          ? 'rgba(16, 185, 129, 0.25)'
                          : 'rgba(239, 68, 68, 0.25)'
                      }`,
                    }}
                  >
                    {settings.is_published
                      ? t('retail.settings.published') || 'Опубликован'
                      : t('retail.settings.draft') || 'Черновик'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.3 }}>
                  {settings.is_published
                    ? t('retail.settings.publishedHint') ||
                      'Каталог виден покупателям, доступен по ссылке и индексируется поисковиками.'
                    : t('retail.settings.draftHint') ||
                      'Магазин скрыт от покупателей. Доступен только вам и супер-администрации.'}
                </div>
              </div>

              <Toggle
                checked={settings.is_published}
                onChange={() => handleToggle('is_published', 'is_published')}
                disabled={savingToggle === 'is_published'}
              />
            </div>

            <div style={{ height: 1, background: 'var(--line-soft)' }} />

            {/* 10.2 Clear Catalog */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: '#EF4444', fontWeight: 600, marginBottom: 2 }}>
                  {t('retail.settings.clearCatalog') || 'Очистить каталог'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.3 }}>
                  {t('retail.settings.clearCatalogDesc') ||
                    'Удалить все добавленные товары из каталога магазина'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                disabled={isClearing}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isClearing ? 'wait' : 'pointer',
                  flexShrink: 0,
                }}
              >
                {t('retail.settings.clearBtn') || 'Сброс'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── STICKY BOTTOM ACTION BAR (ВСЕГДА ПОД РУКОЙ) ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(62px + env(safe-area-inset-bottom, 0px))',
          left: 0,
          right: 0,
          zIndex: 90,
          padding: '10px 16px',
          background: 'var(--card-bg, #0f172a)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--retail-border, rgba(56,189,248,0.15))',
          boxShadow: '0 -10px 30px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '12px 18px',
            borderRadius: 12,
            background: isSaving ? 'rgba(56, 189, 248, 0.5)' : 'var(--retail-accent, #38BDF8)',
            border: 'none',
            color: '#07070F',
            fontSize: 14,
            fontWeight: 700,
            cursor: isSaving ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 14px rgba(56, 189, 248, 0.3)',
            transition: 'all 0.15s ease',
          }}
        >
          {isSaving ? (
            <>
              <SyncIcon size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span>{t('retail.settings.saving') || 'Сохраняем...'}</span>
            </>
          ) : (
            <>
              <CheckCircleIcon size={16} color="#07070F" />
              <span>{t('retail.settings.save') || 'Сохранить настройки'}</span>
            </>
          )}
        </button>

        {/* Floating status feedback */}
        {saveStatus === 'ok' && (
          <div
            style={{
              position: 'absolute',
              top: -40,
              left: 16,
              right: 16,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.95)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <CheckCircleIcon size={16} color="#fff" />
            <span>{t('retail.settings.saved') || 'Настройки успешно сохранены'}</span>
          </div>
        )}

        {saveStatus === 'error' && (
          <div
            style={{
              position: 'absolute',
              top: -40,
              left: 16,
              right: 16,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.95)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <AlertTriangleIcon size={16} color="#fff" />
            <span>{saveErrorMessage || t('retail.settings.saveError')}</span>
          </div>
        )}
      </div>
    </>
  )
}
