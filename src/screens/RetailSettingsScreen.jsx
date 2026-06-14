import { useState, useRef, useEffect } from 'react'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { supabase } from '../utils/supabase.js'
import QRCode from 'react-qr-code'
import { clearStoreCatalog } from '../utils/retailAnalytics.js'
import ConfirmDangerModal from '../components/ConfirmDangerModal.jsx'
import { compressImage } from '../utils/imageCompressor.js'
import {
  buildRetailStoreSettingsPayload,
  getAIStoreNotesLimit,
} from '../domain/retail/storeSettings.js'

// ── Phone mask utilities (defined outside component) ────────────
// Store only 10 local digits (without country code) in state.
// Format only for display.
const initLocalPhone = (stored) => {
  if (!stored) return ''
  const d = stored.replace(/\D/g, '')
  // If starts with 7 or 8 and has more than 10 digits — strip country code
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

// Helper to load Leaflet assets dynamically
const loadLeaflet = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is undefined'))
      return
    }
    if (window.L) {
      resolve(window.L)
      return
    }
    // Load CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    // Load JS
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      if (window.L) resolve(window.L)
      else reject(new Error('Leaflet is not available on window'))
    }
    script.onerror = () => reject(new Error('Failed to load Leaflet script'))
    document.body.appendChild(script)
  })
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
    ai_store_notes: currentStore?.ai_store_notes || '',
    notifyMissing: currentStore?.notify_oos_enabled ?? true,
    notifyDaily: currentStore?.notify_daily_enabled ?? false,
    images: currentStore?.images || [],
    latitude: currentStore?.latitude || '',
    longitude: currentStore?.longitude || '',
    is_published: currentStore?.is_published !== false,
  })
  const [showQR, setShowQR] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'ok' | 'error'
  const [saveErrorMessage, setSaveErrorMessage] = useState('')
  const [saveWarningMessage, setSaveWarningMessage] = useState('')
  const [savingToggle, setSavingToggle] = useState(null)
  const [showClearModal, setShowClearModal] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(currentStore?.logo_url || null)
  const logoInputRef = useRef(null)
  const qrRef = useRef(null)

  const showQRRef = useRef(showQR)
  const showClearModalRef = useRef(showClearModal)
  useEffect(() => {
    showQRRef.current = showQR
    showClearModalRef.current = showClearModal
  })

  useEffect(() => {
    const handlePopState = () => {
      if (showClearModalRef.current) {
        setShowClearModal(false)
      } else if (showQRRef.current) {
        setShowQR(false)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const lastSyncedStoreIdRef = useRef(null)

  useEffect(() => {
    if (!currentStore) return
    if (currentStore.id === lastSyncedStoreIdRef.current) return
    lastSyncedStoreIdRef.current = currentStore.id

    async function sync() {
      setSettings((prev) => ({
        ...prev,
        name: currentStore.name || '',
        address: currentStore.address || '',
        phone: initLocalPhone(currentStore.phone),
        opening_hours: currentStore.opening_hours || '',
        short_description: currentStore.short_description || '',
        description: currentStore.description || '',
        instagram_url: currentStore.instagram_url || '',
        whatsapp_number: initLocalPhone(currentStore.whatsapp_number),
        twogis_url: currentStore.twogis_url || '',
        ai_store_notes: currentStore.ai_store_notes || '',
        notifyMissing: currentStore.notify_oos_enabled ?? prev.notifyMissing,
        notifyDaily: currentStore.notify_daily_enabled ?? prev.notifyDaily,
        images: currentStore.images || [],
        latitude: currentStore.latitude || '',
        longitude: currentStore.longitude || '',
        is_published: currentStore.is_published !== false,
      }))
      setLogoUrl(currentStore.logo_url || null)
    }
    sync()
  }, [currentStore])

  const handleChange = (key, val) => {
    setSettings((p) => ({ ...p, [key]: val }))
    setSaveStatus(null)
    setSaveErrorMessage('')
    setSaveWarningMessage('')
  }

  // Auto-save toggle to Supabase immediately on click
  const handleToggle = async (key, dbField) => {
    const newVal = !settings[key]
    // Optimistic update — feels instant
    setSettings((p) => ({ ...p, [key]: newVal }))
    setSavingToggle(key)
    const { error } = await updateStoreSettings({ [dbField]: newVal })
    setSavingToggle(null)
    if (error) {
      // Revert on failure
      setSettings((p) => ({ ...p, [key]: !newVal }))
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus(null)
    setSaveErrorMessage('')
    setSaveWarningMessage('')
    const { error, warning } = await updateStoreSettings(buildRetailStoreSettingsPayload(settings))
    setIsSaving(false)
    setSaveStatus(error ? 'error' : 'ok')
    setSaveErrorMessage(error || '')
    setSaveWarningMessage(
      warning?.missingColumn === 'opening_hours'
        ? t('retail.settings.openingHoursSchemaWarning')
        : ''
    )
    setTimeout(() => setSaveStatus(null), 3000)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !currentStore?.id) return

    // Client-side validation
    const ALLOWED = ['image/png', 'image/jpeg', 'image/webp']
    if (!ALLOWED.includes(file.type)) {
      alert(t('retail.settings.logoFormatError'))
      if (logoInputRef.current) logoInputRef.current.value = ''
      return
    }

    setLogoUploading(true)

    let uploadFile = file
    try {
      const compressed = await compressImage(file, { maxWidth: 600, maxHeight: 600, quality: 0.85 })
      uploadFile = compressed
    } catch (err) {
      console.warn('Logo compression failed, uploading original', err)
    }

    const ext =
      uploadFile.type === 'image/webp' ? 'webp' : uploadFile.type === 'image/png' ? 'png' : 'jpg'
    const path = `${currentStore.id}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('store-logos')
      .upload(path, uploadFile, { upsert: true, contentType: uploadFile.type })

    if (uploadError) {
      setLogoUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
      const msg = uploadError.message || uploadError.error || String(uploadError)
      const isBucketMissing = msg.includes('Bucket not found') || msg.includes('bucket')
      if (isBucketMissing) {
        alert(t('retail.settings.logoBucketError'))
      } else {
        alert(t('retail.settings.logoUploadError') + msg)
      }
      return
    }

    const { data: urlData } = supabase.storage.from('store-logos').getPublicUrl(path)
    const url = urlData?.publicUrl
    if (url) {
      await updateStoreSettings({ logo_url: url })
      setLogoUrl(url + '?t=' + Date.now()) // cache-bust
    }
    if (logoInputRef.current) logoInputRef.current.value = ''
    setLogoUploading(false)
  }

  // ─── Store Photos upload and deletion handlers ───
  const [imagesUploading, setImagesUploading] = useState(false)
  const imagesInputRef = useRef(null)

  const handleImagesUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0 || !currentStore?.id) return

    const currentCount = settings.images.length
    if (currentCount + files.length > 5) {
      alert(
        t('retail.settings.imagesLimitError') ||
          'Вы можете загрузить не более 5 фотографий магазина'
      )
      if (imagesInputRef.current) imagesInputRef.current.value = ''
      return
    }

    const ALLOWED = ['image/png', 'image/jpeg', 'image/webp']
    for (const file of files) {
      if (!ALLOWED.includes(file.type)) {
        alert(t('retail.settings.logoFormatError'))
        if (imagesInputRef.current) imagesInputRef.current.value = ''
        return
      }
      if (file.size > 8 * 1024 * 1024) {
        alert(t('retail.settings.imageSizeError') || 'Файл должен быть меньше 8 МБ')
        if (imagesInputRef.current) imagesInputRef.current.value = ''
        return
      }
    }

    setImagesUploading(true)
    const uploadedUrls = [...settings.images]

    try {
      for (const file of files) {
        let uploadFile = file
        try {
          const compressed = await compressImage(file, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 0.8,
          })
          uploadFile = compressed
        } catch (err) {
          console.warn('Store photo compression failed, uploading original', err)
        }

        const ext =
          uploadFile.type === 'image/webp'
            ? 'webp'
            : uploadFile.type === 'image/png'
              ? 'png'
              : 'jpg'
        const randomId = Math.random().toString(36).substring(2, 11)
        const path = `${currentStore.id}/photo_${Date.now()}_${randomId}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('store-images')
          .upload(path, uploadFile, { upsert: true, contentType: uploadFile.type })

        if (uploadError) {
          throw uploadError
        }

        const { data: urlData } = supabase.storage.from('store-images').getPublicUrl(path)
        const url = urlData?.publicUrl
        if (url) {
          uploadedUrls.push(url)
        }
      }

      handleChange('images', uploadedUrls)
      await updateStoreSettings({ images: uploadedUrls })
    } catch (err) {
      console.error('Images upload failed', err)
      alert(t('retail.settings.logoUploadError') || 'Не удалось загрузить изображения')
    } finally {
      setImagesUploading(false)
      if (imagesInputRef.current) imagesInputRef.current.value = ''
    }
  }

  const handleDeleteImage = async (indexToDelete) => {
    const nextUrls = settings.images.filter((_, idx) => idx !== indexToDelete)
    handleChange('images', nextUrls)
    await updateStoreSettings({ images: nextUrls })
  }

  // ─── Geocoding and Map Picker handlers ───
  const [geocoding, setGeocoding] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const settingsLatRef = useRef(settings.latitude)
  const settingsLonRef = useRef(settings.longitude)

  useEffect(() => {
    settingsLatRef.current = settings.latitude
    settingsLonRef.current = settings.longitude
  })

  const handleGeocode = async () => {
    if (!settings.address) {
      alert(t('retail.settings.addressEmptyError') || 'Пожалуйста, введите адрес сначала')
      return
    }
    setGeocoding(true)
    try {
      const query = encodeURIComponent(settings.address)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`
      )
      const data = await res.json()
      if (data && data[0]) {
        const lat = Number(data[0].lat)
        const lon = Number(data[0].lon)
        handleChange('latitude', lat)
        handleChange('longitude', lon)
        alert(
          t('retail.settings.geocodeSuccess') ||
            `Координаты успешно определены: ${lat.toFixed(4)}, ${lon.toFixed(4)}`
        )
      } else {
        alert(
          t('retail.settings.geocodeFailed') ||
            'Не удалось определить координаты автоматически. Попробуйте уточнить адрес или выбрать на карте.'
        )
      }
    } catch (err) {
      console.error('Geocoding failed', err)
      alert(t('retail.settings.geocodeError') || 'Ошибка при получении координат')
    } finally {
      setGeocoding(false)
    }
  }

  useEffect(() => {
    if (!showMapModal) return

    let active = true
    let mapInstance = null

    loadLeaflet()
      .then((L) => {
        if (!active) return

        const initialLat = settingsLatRef.current ? Number(settingsLatRef.current) : 51.1693
        const initialLon = settingsLonRef.current ? Number(settingsLonRef.current) : 71.4491

        mapInstance = L.map(mapContainerRef.current).setView([initialLat, initialLon], 15)
        mapRef.current = mapInstance

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapInstance)

        const marker = L.marker([initialLat, initialLon], { draggable: true }).addTo(mapInstance)
        markerRef.current = marker

        mapInstance.on('click', (e) => {
          marker.setLatLng(e.latlng)
        })
      })
      .catch((err) => {
        console.error('Leaflet failed to load', err)
      })

    return () => {
      active = false
      if (mapInstance) {
        mapInstance.remove()
      }
    }
  }, [showMapModal])

  const handleConfirmMapLocation = () => {
    if (markerRef.current) {
      const { lat, lng } = markerRef.current.getLatLng()
      handleChange('latitude', lat)
      handleChange('longitude', lng)
    }
    setShowMapModal(false)
  }

  // Generate store invite URL for QR code
  const storeInviteUrl = currentStore?.code
    ? `${window.location.origin}/join/${currentStore.code}`
    : `${window.location.origin}/join/demo-store`

  // Download QR code as PNG
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

      // Add KÖRSET label
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
    } catch (e) {
      setIsClearing(false)
      alert(t('retail.settings.clearError') + e.message)
    }
  }
  // Handles phone input: add digit / delete / paste
  const handlePhoneInput = (key, newDisplayValue) => {
    const prevLocal = key === 'phone' ? settings.phone : settings.whatsapp_number
    const expectedDisplay = formatLocalPhone(prevLocal)
    if (newDisplayValue.length > expectedDisplay.length + 1) {
      // Paste — extract all digits, strip country code if present
      const all = newDisplayValue.replace(/\D/g, '')
      const local =
        all.length > 10 && (all.startsWith('7') || all.startsWith('8'))
          ? all.slice(1, 11)
          : all.slice(0, 10)
      handleChange(key, local)
    } else if (newDisplayValue.length > expectedDisplay.length) {
      // Single digit added — take the last digit from the new string
      const newChar = newDisplayValue.replace(/\D/g, '').slice(-1)
      if (/\d/.test(newChar)) handleChange(key, (prevLocal + newChar).slice(0, 10))
    } else {
      // Deletion — remove last local digit
      handleChange(key, prevLocal.slice(0, -1))
    }
  }

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
    background: 'var(--glass-subtle)',
    border: '1px solid var(--glass-soft-border)',
    borderRadius: 16,
    overflow: 'hidden',
  }
  const INPUT_STYLE = {
    width: '100%',
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    color: 'var(--text)',
    padding: '12px 14px',
    borderRadius: 10,
    fontSize: 15,
    outline: 'none',
    fontFamily: 'var(--font-body)',
  }
  const FIELD_LABEL = { fontSize: 13, color: 'var(--text-sub)', marginBottom: 6 }
  const DIVIDER = { height: 1, background: 'var(--line-soft)' }

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
      <div style={{ padding: '20px 16px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--text)',
              margin: '0 0 4px',
            }}
          >
            {t('retail.settings.title')}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-sub)', margin: 0 }}>
            {t('retail.settings.subtitle')}
          </p>
        </div>

        {/* ── Статус публикации каталога ── */}
        <div>
          <div style={SECTION_LABEL_STYLE}>
            {t('retail.settings.publishStatusTitle') || 'Публикация каталога'}
          </div>
          <div style={CARD_STYLE}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
              }}
            >
              <div>
                <div
                  style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}
                >
                  {settings.is_published
                    ? t('retail.settings.published') || 'Опубликован'
                    : t('retail.settings.draft') || 'Черновик'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                  {settings.is_published
                    ? t('retail.settings.publishedHint') ||
                      'Каталог виден покупателям, доступен по ссылке и индексируется поисковиками.'
                    : t('retail.settings.draftHint') ||
                      'Магазин скрыт от покупателей. Доступен только вам и супер-администрации.'}
                </div>
              </div>
              <div
                onClick={() => {
                  const newVal = !settings.is_published
                  handleChange('is_published', newVal)
                  updateStoreSettings({ is_published: newVal })
                }}
                style={{
                  width: 50,
                  height: 28,
                  borderRadius: 14,
                  cursor: 'pointer',
                  background: settings.is_published ? '#38BDF8' : 'var(--glass-border)',
                  position: 'relative',
                  transition: 'background 0.3s, opacity 0.2s',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: settings.is_published ? 25 : 3,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'var(--text-inverse)',
                    transition: 'left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Лого магазина ── */}
        <div>
          <div style={SECTION_LABEL_STYLE}>{t('retail.settings.logoTitle')}</div>
          <div style={{ ...CARD_STYLE, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                className="catalog-img-box"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 16,
                  border: '1px dashed var(--glass-strong-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="logo"
                    className="product-img-blend"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                  />
                ) : (
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 28, color: 'var(--text-dim)' }}
                  >
                    store
                  </span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}
                >
                  {t('retail.settings.logoLabel')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
                  {t('retail.settings.logoHint')}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleLogoUpload}
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    background: 'rgba(56,189,248,0.1)',
                    border: '1px solid rgba(56,189,248,0.25)',
                    color: '#38BDF8',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: logoUploading ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    opacity: logoUploading ? 0.6 : 1,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    {logoUploading ? 'progress_activity' : 'upload'}
                  </span>
                  {logoUploading
                    ? t('retail.settings.logoUploading')
                    : t('retail.settings.logoUpload')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Фотографии магазина ── */}
        <div>
          <div style={SECTION_LABEL_STYLE}>
            {t('retail.settings.imagesTitle') || 'Фотографии магазина'}
          </div>
          <div
            style={{
              ...CARD_STYLE,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Grid of existing photos */}
            {settings.images && settings.images.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                  gap: 10,
                }}
              >
                {settings.images.map((url, idx) => (
                  <div
                    key={url}
                    style={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: 12,
                      border: '1px solid var(--glass-soft-border)',
                      overflow: 'hidden',
                      background: 'var(--input-bg)',
                    }}
                  >
                    <img
                      src={url}
                      alt="store photo"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(idx)}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: 'rgba(239, 68, 68, 0.85)',
                        border: 'none',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        close
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 4 }}>
                  {t('retail.settings.imagesCountLabel') || 'Загружено фотографий:'}{' '}
                  <strong>{settings.images.length}/5</strong>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {t('retail.settings.imagesHint') ||
                    'Добавьте фото интерьера и входа, чтобы покупатели узнавали ваш магазин. Максимум 5 фотографий.'}
                </div>
              </div>

              <input
                ref={imagesInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={handleImagesUpload}
              />

              <button
                type="button"
                onClick={() => imagesInputRef.current?.click()}
                disabled={imagesUploading || settings.images.length >= 5}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: 'rgba(56,189,248,0.1)',
                  border: '1px solid rgba(56,189,248,0.25)',
                  color: '#38BDF8',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: imagesUploading || settings.images.length >= 5 ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: imagesUploading || settings.images.length >= 5 ? 0.5 : 1,
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  {imagesUploading ? 'progress_activity' : 'add_a_photo'}
                </span>
                {imagesUploading
                  ? t('retail.settings.imagesUploading') || 'Загрузка...'
                  : t('retail.settings.imagesAdd') || 'Добавить'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Основная информация ── */}
        <div>
          <div style={SECTION_LABEL_STYLE}>{t('retail.settings.infoTitle')}</div>
          <div style={CARD_STYLE}>
            <div style={{ padding: '16px 16px' }}>
              <div style={FIELD_LABEL}>{t('retail.settings.nameLabel')}</div>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => handleChange('name', e.target.value)}
                style={INPUT_STYLE}
              />
            </div>

            <div style={DIVIDER} />

            <div style={{ padding: '16px 16px' }}>
              <div style={FIELD_LABEL}>{t('retail.settings.addressLabel')}</div>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => handleChange('address', e.target.value)}
                style={INPUT_STYLE}
              />
            </div>

            <div style={DIVIDER} />

            <div style={{ padding: '16px 16px' }}>
              <div style={FIELD_LABEL}>{t('retail.settings.phoneLabel')}</div>
              <input
                type="tel"
                value={formatLocalPhone(settings.phone)}
                onChange={(e) => handlePhoneInput('phone', e.target.value)}
                placeholder="+7 (700) 000-00-00"
                inputMode="numeric"
                style={INPUT_STYLE}
              />
            </div>

            <div style={DIVIDER} />

            <div style={{ padding: '16px 16px' }}>
              <div style={FIELD_LABEL}>{t('retail.settings.openingHoursLabel')}</div>
              <input
                type="text"
                value={settings.opening_hours}
                onChange={(e) => handleChange('opening_hours', e.target.value)}
                placeholder={t('retail.settings.openingHoursPlaceholder')}
                maxLength={240}
                style={INPUT_STYLE}
              />
            </div>

            <div style={DIVIDER} />

            <div style={{ padding: '16px 16px' }}>
              <div style={FIELD_LABEL}>
                {t('retail.settings.coordinatesLabel') || 'Гео-координаты (для SEO-поиска)'}
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Широта (Latitude)"
                  value={settings.latitude}
                  onChange={(e) => handleChange('latitude', e.target.value)}
                  style={{ ...INPUT_STYLE, flex: 1 }}
                />
                <input
                  type="text"
                  placeholder="Долгота (Longitude)"
                  value={settings.longitude}
                  onChange={(e) => handleChange('longitude', e.target.value)}
                  style={{ ...INPUT_STYLE, flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleGeocode}
                  disabled={geocoding}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: 'rgba(56,189,248,0.1)',
                    border: '1px solid rgba(56,189,248,0.25)',
                    color: '#38BDF8',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: geocoding ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    {geocoding ? 'progress_activity' : 'location_searching'}
                  </span>
                  {geocoding
                    ? t('retail.settings.geocoding') || 'Поиск...'
                    : t('retail.settings.geocodeBtn') || 'Определить по адресу'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMapModal(true)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
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
                    gap: 6,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    map
                  </span>
                  {t('retail.settings.mapBtn') || 'Выбрать на карте'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Описание магазина ── */}
        <div>
          <div style={SECTION_LABEL_STYLE}>{t('retail.settings.descTitle')}</div>
          <div style={CARD_STYLE}>
            <div style={{ padding: '16px' }}>
              <div style={FIELD_LABEL}>
                {t('retail.settings.shortDescLabel')}
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6 }}>
                  {t('retail.settings.shortDescHint')}
                </span>
              </div>
              <input
                type="text"
                value={settings.short_description}
                onChange={(e) => handleChange('short_description', e.target.value)}
                placeholder={t('retail.settings.shortDescPlaceholder')}
                maxLength={120}
                style={INPUT_STYLE}
              />
              <div
                style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, textAlign: 'right' }}
              >
                {(settings.short_description || '').length}/120
              </div>
            </div>

            <div style={DIVIDER} />

            <div style={{ padding: '16px' }}>
              <div style={FIELD_LABEL}>
                {t('retail.settings.fullDescLabel')}
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6 }}>
                  {t('retail.settings.fullDescHint')}
                </span>
              </div>
              <textarea
                value={settings.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder={t('retail.settings.fullDescPlaceholder')}
                rows={4}
                style={{
                  ...INPUT_STYLE,
                  resize: 'vertical',
                  minHeight: 100,
                  lineHeight: 1.5,
                }}
              />
            </div>
          </div>
        </div>

        {/* ── AI notes ── */}
        <div>
          <div style={SECTION_LABEL_STYLE}>{t('retail.settings.aiNotesTitle')}</div>
          <div style={CARD_STYLE}>
            <div style={{ padding: '16px' }}>
              <div style={FIELD_LABEL}>
                {t('retail.settings.aiNotesLabel')}
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6 }}>
                  {t('retail.settings.aiNotesHint')}
                </span>
              </div>
              <textarea
                value={settings.ai_store_notes}
                onChange={(e) => handleChange('ai_store_notes', e.target.value)}
                placeholder={t('retail.settings.aiNotesPlaceholder')}
                maxLength={getAIStoreNotesLimit()}
                rows={5}
                style={{
                  ...INPUT_STYLE,
                  resize: 'vertical',
                  minHeight: 120,
                  lineHeight: 1.5,
                }}
              />
              <div
                style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.5 }}
              >
                {t('retail.settings.aiNotesWarning')}
              </div>
              <div
                style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, textAlign: 'right' }}
              >
                {(settings.ai_store_notes || '').length}/{getAIStoreNotesLimit()}
              </div>
            </div>
          </div>
        </div>

        {/* ── Контакты и соцсети ── */}
        <div>
          <div style={SECTION_LABEL_STYLE}>{t('retail.settings.contactsTitle')}</div>
          <div style={CARD_STYLE}>
            {[
              {
                key: 'instagram_url',
                label: 'Instagram',
                icon: 'photo_camera',
                iconColor: '#E1306C',
                placeholder: 'https://instagram.com/yourstore',
                type: 'url',
              },
              {
                key: 'whatsapp_number',
                label: 'WhatsApp',
                icon: 'chat',
                iconColor: '#25D366',
                placeholder: '+7 (700) 000-00-00',
                type: 'tel',
                mask: true,
              },
              {
                key: 'twogis_url',
                label: '2GIS',
                icon: 'location_on',
                iconColor: '#2A6EDD',
                placeholder: 'https://2gis.kz/...',
                type: 'url',
              },
            ].map((field, idx, arr) => (
              <div key={field.key}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${field.iconColor}18`,
                      border: `1px solid ${field.iconColor}35`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18, color: field.iconColor }}
                    >
                      {field.icon}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
                      {field.label}
                    </div>
                    <input
                      type={field.type}
                      value={
                        field.mask ? formatLocalPhone(settings[field.key]) : settings[field.key]
                      }
                      onChange={(e) => {
                        if (field.mask) handlePhoneInput(field.key, e.target.value)
                        else handleChange(field.key, e.target.value)
                      }}
                      inputMode={field.mask ? 'numeric' : undefined}
                      placeholder={field.placeholder}
                      style={{
                        ...INPUT_STYLE,
                        padding: '8px 12px',
                        fontSize: 13,
                      }}
                    />
                  </div>
                </div>
                {idx < arr.length - 1 && <div style={{ ...DIVIDER, margin: '0 16px' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '13px 16px',
            borderRadius: 12,
            background: isSaving ? 'rgba(124,58,237,0.3)' : 'rgba(124,58,237,0.85)',
            border: 'none',
            color: 'var(--text-inverse)',
            fontSize: 15,
            fontWeight: 700,
            cursor: isSaving ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'background 0.2s',
          }}
        >
          {isSaving ? (
            <>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}
              >
                progress_activity
              </span>
              {t('retail.settings.saving')}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                save
              </span>
              {t('retail.settings.save')}
            </>
          )}
        </button>

        {/* Save status feedback */}
        {saveStatus === 'ok' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#4ADE80',
              fontSize: 13,
              marginTop: 8,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              check_circle
            </span>
            <span>
              {t('retail.settings.saved')}
              {saveWarningMessage ? ` ${saveWarningMessage}` : ''}
            </span>
          </div>
        )}
        {saveStatus === 'error' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#F87171',
              fontSize: 13,
              marginTop: 8,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              error
            </span>
            <span>
              {t('retail.settings.saveError')}
              {saveErrorMessage ? ` ${saveErrorMessage}` : ''}
            </span>
          </div>
        )}

        {/* QR Code for Store Invite */}
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 8,
              paddingLeft: 4,
            }}
          >
            {t('retail.settings.inviteTitle')}
          </div>
          <div
            style={{
              background: 'var(--glass-subtle)',
              border: '1px solid var(--glass-soft-border)',
              borderRadius: 16,
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(124,58,237,0.15)',
                  border: '1px solid rgba(124,58,237,0.3)',
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
                  stroke="#A78BFA"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600 }}>
                  {t('retail.settings.qrConnect')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
                  {t('retail.settings.qrHint')}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!showQR) {
                  window.history.pushState({}, '')
                }
                setShowQR(!showQR)
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(124,58,237,0.1)',
                border: '1px solid rgba(124,58,237,0.25)',
                color: '#A78BFA',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: showQR ? 16 : 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {showQR ? 'visibility_off' : 'qr_code'}
              </span>
              {showQR ? t('retail.settings.hideQr') : t('retail.settings.showQr')}
            </button>

            {showQR && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 16,
                  padding: '20px 16px',
                  background: 'var(--input-bg)',
                  borderRadius: 12,
                  border: '1px dashed rgba(124,58,237,0.3)',
                }}
              >
                {/* Real QR Code */}
                <div
                  ref={qrRef}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: 16,
                    position: 'relative',
                  }}
                >
                  <QRCode
                    value={storeInviteUrl}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 20,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--primary)',
                      color: 'var(--text-inverse)',
                      padding: '4px 14px',
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                    }}
                  >
                    KÖRSET
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
                    {t('retail.settings.linkLabel')}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#A78BFA',
                      fontFamily: 'monospace',
                      background: 'rgba(124,58,237,0.1)',
                      padding: '8px 12px',
                      borderRadius: 8,
                      wordBreak: 'break-all',
                    }}
                  >
                    {storeInviteUrl}
                  </div>
                </div>

                <div
                  style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}
                >
                  <button
                    onClick={() => navigator.clipboard?.writeText(storeInviteUrl)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 10,
                      background: 'rgba(56,189,248,0.1)',
                      border: '1px solid rgba(56,189,248,0.25)',
                      color: '#38BDF8',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      content_copy
                    </span>
                    {t('retail.settings.copy')}
                  </button>

                  <button
                    onClick={downloadQR}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 10,
                      background: 'rgba(124,58,237,0.15)',
                      border: '1px solid rgba(124,58,237,0.3)',
                      color: '#A78BFA',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      download
                    </span>
                    {t('retail.settings.downloadPng')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 8,
              paddingLeft: 4,
            }}
          >
            {t('retail.settings.notifyTitle')}
          </div>
          <div
            style={{
              background: 'var(--glass-subtle)',
              border: '1px solid var(--glass-soft-border)',
              borderRadius: 16,
            }}
          >
            {/* Toggle 1 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
              }}
            >
              <div>
                <div
                  style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500, marginBottom: 4 }}
                >
                  {t('retail.settings.notifyMissingTitle')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                  {t('retail.settings.notifyMissingHint')}
                </div>
              </div>
              <div
                onClick={() => handleToggle('notifyMissing', 'notify_oos_enabled')}
                style={{
                  width: 50,
                  height: 28,
                  borderRadius: 14,
                  cursor: savingToggle === 'notifyMissing' ? 'default' : 'pointer',
                  flexShrink: 0,
                  opacity: savingToggle === 'notifyMissing' ? 0.6 : 1,
                  background: settings.notifyMissing ? '#38BDF8' : 'var(--glass-border)',
                  position: 'relative',
                  transition: 'background 0.3s, opacity 0.2s',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: settings.notifyMissing ? 25 : 3,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'var(--text-inverse)',
                    transition: 'left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  }}
                />
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--line-soft)', margin: '0 16px' }} />

            {/* Toggle 2 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
              }}
            >
              <div>
                <div
                  style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500, marginBottom: 4 }}
                >
                  {t('retail.settings.notifyDailyTitle')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                  {t('retail.settings.notifyDailyHint')}
                </div>
              </div>
              <div
                onClick={() => handleToggle('notifyDaily', 'notify_daily_enabled')}
                style={{
                  width: 50,
                  height: 28,
                  borderRadius: 14,
                  cursor: savingToggle === 'notifyDaily' ? 'default' : 'pointer',
                  flexShrink: 0,
                  opacity: savingToggle === 'notifyDaily' ? 0.6 : 1,
                  background: settings.notifyDaily ? '#38BDF8' : 'var(--glass-border)',
                  position: 'relative',
                  transition: 'background 0.3s, opacity 0.2s',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: settings.notifyDaily ? 25 : 3,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'var(--text-inverse)',
                    transition: 'left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Опасная зона ── */}
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#EF4444',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 8,
              paddingLeft: 4,
            }}
          >
            {t('retail.settings.dangerTitle')}
          </div>
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 16,
            }}
          >
            <div
              style={{
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: '#EF4444', fontWeight: 500, marginBottom: 4 }}>
                  {t('retail.settings.clearCatalog')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {t('retail.settings.clearCatalogDesc')}
                </div>
              </div>
              <button
                onClick={() => {
                  window.history.pushState({}, '')
                  setShowClearModal(true)
                }}
                disabled={isClearing}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isClearing ? 'wait' : 'pointer',
                  flexShrink: 0,
                }}
              >
                {t('retail.settings.clearBtn')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showMapModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--glass-soft-border)',
              borderRadius: 24,
              width: '100%',
              maxWidth: 500,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 20px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--line-soft)',
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                {t('retail.settings.mapModalTitle') || 'Выбор на карте'}
              </span>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-sub)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Map Container */}
            <div
              ref={mapContainerRef}
              style={{
                width: '100%',
                height: 350,
                background: 'var(--input-bg)',
              }}
            />

            {/* Footer */}
            <div
              style={{
                padding: 16,
                display: 'flex',
                gap: 12,
                borderTop: '1px solid var(--line-soft)',
                background: 'var(--card-bg-hover)',
              }}
            >
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 12,
                  background: 'var(--glass-button-bg)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('retail.settings.mapModalCancel') || 'Отмена'}
              </button>
              <button
                type="button"
                onClick={handleConfirmMapLocation}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 12,
                  background: '#38BDF8',
                  border: 'none',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('retail.settings.mapModalConfirm') || 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
