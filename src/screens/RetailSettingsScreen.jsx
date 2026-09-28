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
import StoreAmenitiesEditor from '../components/retail/StoreAmenitiesEditor.jsx'
import StoreContactsEditor from '../components/retail/StoreContactsEditor.jsx'
import ImageCropModal from '../components/retail/ImageCropModal.jsx'
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
  TwoGisIcon,
  QrCodeIcon,
  SearchIcon,
  ChevronDownIcon,
} from '../components/icons/index.js'

// ── Phone mask utilities ──────────────────────────────────────────
const initLocalPhone = (stored) => {
  if (!stored) return ''
  const d = String(stored).replace(/\D/g, '')
  if (d.length > 10 && (d.startsWith('7') || d.startsWith('8'))) return d.slice(1, 11)
  return d.slice(0, 10)
}

function getInitialContacts(store) {
  const storePhones = store?.features?.contacts?.phones
  const storeWhatsapps = store?.features?.contacts?.whatsapps

  const phones =
    Array.isArray(storePhones) && storePhones.length > 0
      ? storePhones
      : [{ id: 'p_1', number: store?.phone || '', role: 'main', customLabel: '' }]

  const whatsapps =
    Array.isArray(storeWhatsapps) && storeWhatsapps.length > 0
      ? storeWhatsapps
      : [{ id: 'w_1', number: store?.whatsapp_number || '', role: 'main', customLabel: '' }]

  return { phones, whatsapps }
}

export default function RetailSettingsScreen() {
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'
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
    features: currentStore?.features || {},
  })

  const [phones, setPhones] = useState(() => getInitialContacts(currentStore).phones)
  const [whatsapps, setWhatsapps] = useState(() => getInitialContacts(currentStore).whatsapps)

  const [showQR, setShowQR] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'ok' | 'error'
  const [saveErrorMessage, setSaveErrorMessage] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [savingToggle, setSavingToggle] = useState(null)
  const [showClearModal, setShowClearModal] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(currentStore?.logo_url || null)
  const [showManualCoords, setShowManualCoords] = useState(false)
  const [showSeoExplanation, setShowSeoExplanation] = useState(false)
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState(null)

  const logoInputRef = useRef(null)
  const qrRef = useRef(null)
  const lastSyncedStoreIdRef = useRef(null)

  // Re-sync with store when currentStore changes
  useEffect(() => {
    if (!currentStore) return
    if (currentStore.id === lastSyncedStoreIdRef.current) return
    lastSyncedStoreIdRef.current = currentStore.id

    const syncedContacts = getInitialContacts(currentStore)
    setPhones(syncedContacts.phones)
    setWhatsapps(syncedContacts.whatsapps)

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
      features: currentStore.features || {},
    })
    setLogoUrl(currentStore.logo_url || null)
    setIsDirty(false)
  }, [currentStore])

  const handlePhonesChange = (nextPhones) => {
    setPhones(nextPhones)
    setSettings((prev) => {
      const prevFeatures =
        prev.features && typeof prev.features === 'object' && !Array.isArray(prev.features)
          ? prev.features
          : {}
      return {
        ...prev,
        phone: nextPhones[0]?.number || '',
        features: {
          ...prevFeatures,
          contacts: {
            ...(prevFeatures.contacts || {}),
            phones: nextPhones,
            whatsapps,
          },
        },
      }
    })
    setIsDirty(true)
    setSaveStatus(null)
  }

  const handleWhatsappsChange = (nextWhatsapps) => {
    setWhatsapps(nextWhatsapps)
    setSettings((prev) => {
      const prevFeatures =
        prev.features && typeof prev.features === 'object' && !Array.isArray(prev.features)
          ? prev.features
          : {}
      return {
        ...prev,
        whatsapp_number: nextWhatsapps[0]?.number || '',
        features: {
          ...prevFeatures,
          contacts: {
            ...(prevFeatures.contacts || {}),
            phones,
            whatsapps: nextWhatsapps,
          },
        },
      }
    })
    setIsDirty(true)
    setSaveStatus(null)
  }

  const handleChange = useCallback((key, val) => {
    setSettings((p) => ({ ...p, [key]: val }))
    setIsDirty(true)
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

    const prevFeatures =
      settings.features &&
      typeof settings.features === 'object' &&
      !Array.isArray(settings.features)
        ? settings.features
        : {}

    const payload = buildRetailStoreSettingsPayload({
      ...settings,
      features: {
        ...prevFeatures,
        contacts: {
          phones,
          whatsapps,
        },
      },
    })

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

  // Logo file selection and crop handler
  const handleLogoFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ALLOWED = ['image/png', 'image/jpeg', 'image/webp']
    if (!ALLOWED.includes(file.type)) {
      alert(t('retail.settings.logoFormatError') || 'Разрешены форматы PNG, JPG, WEBP')
      if (logoInputRef.current) logoInputRef.current.value = ''
      return
    }

    const objUrl = URL.createObjectURL(file)
    setCropImageSrc(objUrl)
    setIsCropModalOpen(true)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleCropConfirmed = async (croppedBlob) => {
    setIsCropModalOpen(false)
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc)
      setCropImageSrc(null)
    }
    if (!croppedBlob || !currentStore?.id) return

    setLogoUploading(true)
    let uploadFile = croppedBlob
    try {
      uploadFile = await compressImage(croppedBlob, { maxWidth: 512, maxHeight: 512, quality: 0.9 })
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
      alert((t('retail.settings.logoUploadError') || 'Ошибка загрузки: ') + uploadError.message)
      return
    }

    const { data: urlData } = supabase.storage.from('store-logos').getPublicUrl(path)
    const url = urlData?.publicUrl
    if (url) {
      await updateStoreSettings({ logo_url: url })
      setLogoUrl(url + '?t=' + Date.now())
    }
    setLogoUploading(false)
  }

  const handleLogoDelete = async () => {
    if (!currentStore?.id) return
    const msg = t('retail.settings.confirmDeleteLogo') || 'Удалить логотип магазина?'
    if (!window.confirm(msg)) return

    setLogoUrl(null)
    await updateStoreSettings({ logo_url: null })
  }

  const handle2GisUrlChange = (val) => {
    handleChange('twogis_url', val)
    if (!val) return

    try {
      const decoded = decodeURIComponent(val)
      const mMatch =
        decoded.match(/[?&]m=([0-9.]+)[,/%2C]+([0-9.]+)/i) ||
        decoded.match(/\/center\/([0-9.]+)[,/%2C]+([0-9.]+)/i) ||
        decoded.match(/[?&]points=([0-9.]+)[,/%2C]+([0-9.]+)/i)
      if (mMatch) {
        const v1 = parseFloat(mMatch[1])
        const v2 = parseFloat(mMatch[2])
        let lat = null
        let lon = null
        if (v2 >= 40 && v2 <= 56 && v1 >= 46 && v1 <= 88) {
          lat = v2
          lon = v1
        } else if (v1 >= 40 && v1 <= 56 && v2 >= 46 && v2 <= 88) {
          lat = v1
          lon = v2
        }
        if (lat && lon) {
          handleChange('latitude', lat)
          handleChange('longitude', lon)
        }
      }
    } catch {
      // Ignore URL decode error
    }
  }

  // Store invite URL for QR code
  const storeInviteUrl = currentStore?.code
    ? `${window.location.origin}/join/${currentStore.code}`
    : `${window.location.origin}/join/demo-store`

  const downloadQRSvg = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const storeName = (currentStore?.name || 'Körset').replace(/[<>&"]/g, '')
    const storeCode = currentStore?.code || 'store'
    const inviteUrl = storeInviteUrl.replace(/[<>&"]/g, '')
    const scanLabel = (
      t('retail.settings.scanWithCamera') || 'Отсканируйте камерой телефона'
    ).replace(/[<>&"]/g, '')
    const innerQr = svg.innerHTML

    const svgWidth = 440
    const svgHeight = 520
    const qrSize = 300
    const qrX = (svgWidth - qrSize) / 2
    const qrY = 70

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <defs>
    <style>
      .bg { fill: #ffffff; }
      .border { fill: none; stroke: #E2E8F0; stroke-width: 2; rx: 24; }
      .title { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 800; fill: #0F172A; text-anchor: middle; }
      .brand-badge { fill: #0284c7; rx: 12; }
      .brand-text { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 900; fill: #ffffff; letter-spacing: 1.5px; text-anchor: middle; }
      .subtext { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; fill: #475569; text-anchor: middle; }
      .url { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; font-weight: 500; fill: #94A3B8; text-anchor: middle; }
    </style>
  </defs>

  <rect width="${svgWidth}" height="${svgHeight}" rx="24" class="bg" />
  <rect x="2" y="2" width="${svgWidth - 4}" height="${svgHeight - 4}" class="border" />

  <text x="${svgWidth / 2}" y="44" class="title">${storeName}</text>

  <g transform="translate(${qrX}, ${qrY}) scale(${qrSize / 180})">
    ${innerQr}
  </g>

  <rect x="${(svgWidth - 110) / 2}" y="${qrY + qrSize - 16}" width="110" height="26" class="brand-badge" />
  <text x="${svgWidth / 2}" y="${qrY + qrSize + 2}" class="brand-text">KÖRSET</text>

  <text x="${svgWidth / 2}" y="${qrY + qrSize + 52}" class="subtext">${scanLabel}</text>
  <text x="${svgWidth / 2}" y="${qrY + qrSize + 76}" class="url">${inviteUrl}</text>
</svg>`.trim()

    const blob = new window.Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.download = `korset-qr-${storeCode}.svg`
    a.href = url
    a.click()
    setTimeout(() => window.URL.revokeObjectURL(url), 1000)
  }

  const downloadQRPng = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    const w = 880
    const h = 1040
    canvas.width = w
    canvas.height = h

    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)

      ctx.fillStyle = '#0F172A'
      ctx.font =
        '800 40px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(currentStore?.name || 'Körset', w / 2, 88)

      const qrSize = 600
      const qrX = (w - qrSize) / 2
      const qrY = 140
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize)

      const badgeW = 220
      const badgeH = 52
      ctx.fillStyle = '#0284c7'
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath()
        ctx.roundRect((w - badgeW) / 2, qrY + qrSize - 32, badgeW, badgeH, 26)
        ctx.fill()
      } else {
        ctx.fillRect((w - badgeW) / 2, qrY + qrSize - 32, badgeW, badgeH)
      }

      ctx.fillStyle = '#ffffff'
      ctx.font =
        '900 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText('KÖRSET', w / 2, qrY + qrSize + 2)

      ctx.fillStyle = '#475569'
      ctx.font =
        '600 26px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(
        t('retail.settings.scanWithCamera') || 'Отсканируйте камерой телефона',
        w / 2,
        qrY + qrSize + 110
      )

      ctx.fillStyle = '#94A3B8'
      ctx.font = '500 22px monospace'
      ctx.fillText(storeInviteUrl, w / 2, qrY + qrSize + 155)

      const pngFile = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.download = `korset-qr-${currentStore?.code || 'store'}.png`
      a.href = pngFile
      a.click()
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

      <ImageCropModal
        key={cropImageSrc || 'cropper'}
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

      {/* ── Brand Sticky Topbar in Solid Retail Blue ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 25,
          padding: 'calc(14px + env(safe-area-inset-top, 0px)) 16px 14px',
          background: '#0ea5e9',
          borderBottomLeftRadius: 26,
          borderBottomRightRadius: 26,
          boxShadow: '0 8px 24px rgba(14, 165, 233, 0.22)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
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
            background: '#0ea5e9',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />

        <div style={{ minWidth: 0, flex: 1 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              color: '#ffffff',
              letterSpacing: '-0.3px',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {t('retail.settings.title') || 'Настройки профиля'}
          </h1>
          <div
            style={{
              margin: '2px 0 0',
              fontSize: 11,
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.92)',
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {t('retail.settings.subtitle') || 'Управление витриной и данными магазина'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {currentStore?.slug ? (
            <a
              href={`/s/${currentStore.slug}#store-about`}
              target="_blank"
              rel="noopener noreferrer"
              title={t('retail.viewStoreFront') || 'Открыть витрину покупателя'}
              style={{
                height: 34,
                boxSizing: 'border-box',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '0 10px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <EyeIcon size={14} color="#ffffff" />
              <span>{t('retail.settings.previewStoreBtn') || 'Витрина'}</span>
            </a>
          ) : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              height: 34,
              boxSizing: 'border-box',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: '0 12px',
              borderRadius: 10,
              background: '#ffffff',
              border: 'none',
              color: '#0284c7',
              fontSize: 12,
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              cursor: isSaving ? 'default' : 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
              transition: 'all 0.15s ease',
              position: 'relative',
            }}
          >
            {isSaving ? (
              <SyncIcon size={13} style={{ animation: 'spin 1s linear infinite' }} />
            ) : saveStatus === 'ok' ? (
              <CheckCircleIcon size={14} color="#10B981" />
            ) : null}
            <span>
              {isSaving
                ? t('retail.settings.saving') || '...'
                : saveStatus === 'ok'
                  ? t('retail.settings.saved') || 'Готово'
                  : t('retail.settings.save') || 'Сохранить'}
            </span>
            {isDirty && saveStatus !== 'ok' && !isSaving && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#EF4444',
                  boxShadow: '0 0 0 2px #0ea5e9',
                }}
                title={t('retail.settings.unsavedChanges') || 'Есть несохраненные изменения'}
              />
            )}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                onClick={() => logoInputRef.current?.click()}
                title={
                  logoUrl
                    ? t('retail.settings.replaceLogo') || 'Изменить логотип'
                    : t('retail.settings.logoUpload') || 'Загрузить логотип'
                }
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="logo"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <StorefrontIcon size={32} color="var(--text-dim)" />
                )}

                {/* Subtle camera hover overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: logoUrl ? 'rgba(0, 0, 0, 0.38)' : 'transparent',
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
                  {logoUrl && <CameraIcon size={26} color="#ffffff" />}
                </div>

                {logoUploading && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0, 0, 0, 0.72)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 3,
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
                    fontSize: 15,
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
                    fontSize: 11,
                    color: 'var(--text-dim)',
                    lineHeight: 1.35,
                    marginBottom: 10,
                  }}
                >
                  {isKz
                    ? '1:1 форматы · Кадрирлеу және авто-қысу'
                    : 'Квадрат 1:1 · Автоматическое сжатие без ограничений'}
                </div>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleLogoFileSelect}
                />

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 10,
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
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
                      <SyncIcon size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <CameraIcon size={17} />
                    )}
                    <span>
                      {logoUrl
                        ? t('retail.settings.replaceLogo') || 'Изменить'
                        : t('retail.settings.logoUpload') || 'Загрузить'}
                    </span>
                  </button>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleLogoDelete}
                      disabled={logoUploading}
                      style={{
                        padding: '7px 11px',
                        borderRadius: 10,
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
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
                      <span>
                        {t('retail.settings.deleteLogo') || t('common.delete') || 'Удалить'}
                      </span>
                    </button>
                  )}
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
              <div style={{ position: 'relative', marginTop: 6 }}>
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
                    {t('retail.settings.typeMinimarket') ||
                      t('stores.type.minimarket') ||
                      'Минимаркет'}
                  </option>
                  <option value="supermarket">
                    {t('retail.settings.typeSupermarket') ||
                      t('stores.type.supermarket') ||
                      'Супермаркет'}
                  </option>
                  <option value="halal">
                    {t('retail.settings.typeHalal') || t('stores.type.halal') || 'Халал маркет'}
                  </option>
                  <option value="specialty">
                    {t('retail.settings.typeSpecialty') ||
                      t('stores.type.specialty') ||
                      'Специализированный'}
                  </option>
                  <option value="other">
                    {t('retail.settings.typeOther') || t('stores.type.other') || 'Магазин у дома'}
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
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronDownIcon size={16} />
                </div>
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
          <StoreContactsEditor
            phones={phones}
            whatsapps={whatsapps}
            instagramUrl={settings.instagram_url}
            twogisUrl={settings.twogis_url}
            onPhonesChange={handlePhonesChange}
            onWhatsappsChange={handleWhatsappsChange}
            onInstagramChange={(val) => handleChange('instagram_url', val)}
            onTwogisChange={(val) => handleChange('twogis_url', val)}
            disabled={isSaving}
          />
        </div>

        {/* ── 3. ФАКТИЧЕСКИЙ АДРЕС И 2GIS ── */}
        <div>
          <div style={SECTION_LABEL_STYLE}>
            {isKz ? 'ФАКТІЛІК МЕКЕНЖАЙ ЖӘНЕ 2GIS' : 'ФАКТИЧЕСКИЙ АДРЕС И 2GIS'}
          </div>
          <div style={{ ...CARD_STYLE, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 3.1 Фактический адрес */}
            <div>
              <div style={FIELD_LABEL}>
                {t('retail.settings.addressLabel') || 'Фактический адрес'}
              </div>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder={
                  isKz
                    ? 'Мысалы: Сығанақ көшесі, 14, «Лазурный квартал» ТК'
                    : 'Например: ул. Сыганак, 14, ЖК Лазурный квартал'
                }
                style={INPUT_STYLE}
              />
            </div>

            {/* 3.2 Привязка карточки в 2GIS */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: 'rgba(56, 189, 248, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--retail-accent, #38BDF8)',
                    }}
                  >
                    <TwoGisIcon size={14} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {isKz ? '2GIS сілтемесі (координаттар мен бағыт)' : 'Ссылка на карточку в 2GIS'}
                  </span>
                </div>

                {settings.twogis_url && (
                  <a
                    href={
                      settings.twogis_url.startsWith('http')
                        ? settings.twogis_url
                        : `https://${settings.twogis_url}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12,
                      color: 'var(--retail-accent, #38BDF8)',
                      textDecoration: 'none',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>{isKz ? '2GIS-те ашу ↗' : 'Открыть в 2GIS ↗'}</span>
                  </a>
                )}
              </div>

              <input
                type="text"
                value={settings.twogis_url || ''}
                onChange={(e) => handle2GisUrlChange(e.target.value)}
                placeholder="https://2gis.kz/astana/firm/... немесе go.2gis.com/..."
                style={INPUT_STYLE}
              />
              <div
                style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.35 }}
              >
                {isKz
                  ? '2GIS-те дүкен парақшасын ашып, «Бөлісу» түймесінен сілтемені көшіріп қойыңыз. Координаттар автоматты түрде анықталады.'
                  : 'Откройте филиал в 2GIS и нажмите «Поделиться». Координаты для покупателей определятся автоматически.'}
              </div>
            </div>

            {/* Координаты статус и ручная правка */}
            {settings.latitude && settings.longitude ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: 12,
                  color: 'var(--text)',
                  padding: '9px 12px',
                  borderRadius: 10,
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  <CheckCircleIcon size={15} color="#10B981" />
                  <span>
                    {isKz ? 'Координаттар бекітілді:' : 'Координаты зафиксированы:'}{' '}
                    <b style={{ fontFamily: 'monospace' }}>
                      {Number(settings.latitude).toFixed(4)},{' '}
                      {Number(settings.longitude).toFixed(4)}
                    </b>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualCoords(!showManualCoords)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    fontSize: 11,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showManualCoords ? (isKz ? 'Жасыру' : 'Скрыть') : isKz ? 'Өзгерту' : 'Изменить'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowManualCoords(!showManualCoords)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--retail-accent, #38BDF8)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {isKz ? '+ Координаттарды қолмен енгізу' : '+ Ввести координаты вручную'}
                </button>
              </div>
            )}

            {/* Manual Lat/Lon fields */}
            {showManualCoords && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  padding: '10px 12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
                    {isKz ? 'Ендік (Latitude)' : 'Широта (Latitude)'}
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={settings.latitude || ''}
                    onChange={(e) => handleChange('latitude', e.target.value)}
                    placeholder="51.1693"
                    style={{ ...INPUT_STYLE, padding: '7px 10px', fontSize: 13 }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
                    {isKz ? 'Бойлық (Longitude)' : 'Долгота (Longitude)'}
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={settings.longitude || ''}
                    onChange={(e) => handleChange('longitude', e.target.value)}
                    placeholder="71.4490"
                    style={{ ...INPUT_STYLE, padding: '7px 10px', fontSize: 13 }}
                  />
                </div>
              </div>
            )}

            {/* Minimalist Collapsible Local SEO Hint */}
            <div
              style={{
                marginTop: 2,
                borderRadius: 12,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() => setShowSeoExplanation(!showSeoExplanation)}
                style={{
                  width: '100%',
                  padding: '11px 13px',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  gap: 10,
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <SearchIcon size={15} color="var(--text-dim)" />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text)',
                    }}
                  >
                    {t('retail.settings.seoTitle') || 'Влияние адреса на локальный поиск (SEO)'}
                  </span>
                </div>
                <ChevronDownIcon
                  size={14}
                  color="var(--text-dim)"
                  style={{
                    transform: showSeoExplanation ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0,
                  }}
                />
              </button>

              {showSeoExplanation && (
                <div
                  style={{
                    padding: '0 13px 12px',
                    fontSize: 12,
                    color: 'var(--text-sub)',
                    lineHeight: 1.5,
                    borderTop: '1px solid var(--line-soft)',
                    paddingTop: 10,
                  }}
                >
                  <div style={{ marginBottom: 8, color: 'var(--text)', fontWeight: 500 }}>
                    {t('retail.settings.seoBrief') ||
                      'Точные координаты выводят витрину магазина в топ выдачи Google и на картах рядом с покупателем.'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5 }}>
                    <div>
                      <strong style={{ color: 'var(--text)' }}>2GIS, Google & Яндекс: </strong>
                      <span>
                        {t('retail.settings.seoP1Desc') ||
                          'Поисковые алгоритмы показывают магазин в карточках выдачи для пользователей поблизости.'}
                      </span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text)' }}>Навигация 2GIS: </strong>
                      <span>
                        {t('retail.settings.seoP2Desc') ||
                          'Покупатели видят расстояние в метрах и переходят в 2GIS прямо до входа.'}
                      </span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text)' }}>Штрихкод-сканер: </strong>
                      <span>
                        {t('retail.settings.seoP3Desc') ||
                          'При сканировании товаров покупатели мгновенно привязываются к вашему магазину.'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 4. ФОТОГРАФИИ МАГАЗИНА (ПО ЗОНАМ) ── */}
        <div>
          <div style={SECTION_LABEL_STYLE}>
            {t('retail.settings.imagesTitle') || 'ФОТОГРАФИИ МАГАЗИНА'}
          </div>
          <StorePhotosManager
            storeId={currentStore?.id}
            images={settings.images}
            onChange={(imgs) => handleChange('images', imgs)}
            onAutoSave={(imgs) => updateStoreSettings({ images: imgs })}
          />
        </div>

        {/* ── 5. ОСОБЕННОСТИ И СЕРВИС МАГАЗИНА ── */}
        <div>
          <div style={SECTION_LABEL_STYLE}>
            {t('retail.settings.amenitiesSectionTitle') || 'ОСОБЕННОСТИ И СЕРВИС МАГАЗИНА'}
          </div>
          <div style={CARD_STYLE}>
            <StoreAmenitiesEditor
              selectedFeatures={settings.features}
              onChange={(feats) => handleChange('features', feats)}
            />
          </div>
        </div>

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
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--retail-accent, #38BDF8)',
                }}
              >
                <QrCodeIcon size={22} color="var(--retail-accent, #38BDF8)" />
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
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.15s ease',
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
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  marginTop: 12,
                }}
              >
                <div
                  ref={qrRef}
                  style={{
                    background: '#fff',
                    borderRadius: 14,
                    padding: 14,
                    position: 'relative',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
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
                      bottom: 18,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--primary)',
                      color: '#fff',
                      padding: '2px 10px',
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                    }}
                  >
                    KÖRSET
                  </div>
                </div>

                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
                    {t('retail.settings.linkLabel') || 'Прямая ссылка на витрину магазина:'}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--retail-accent, #38BDF8)',
                      fontFamily: 'monospace',
                      background: 'rgba(56,189,248,0.08)',
                      padding: '7px 10px',
                      borderRadius: 8,
                      wordBreak: 'break-all',
                    }}
                  >
                    {storeInviteUrl}
                  </div>
                </div>

                {/* Actions row: Copy Link, SVG Download, PNG Download */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 8,
                    width: '100%',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(storeInviteUrl)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
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
                    <span>{t('retail.settings.copy') || 'Копировать'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={downloadQRSvg}
                    title={t('retail.settings.qrSvgHint') || 'Для типографий, наклеек и витрин'}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.28)',
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
                    <InstallIcon size={14} />
                    <span>{t('retail.settings.downloadSvg') || 'Векторный SVG'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={downloadQRPng}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
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
                    <span>{t('retail.settings.downloadPngHighRes') || 'Печать PNG (HD)'}</span>
                  </button>
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-dim)',
                    textAlign: 'center',
                    lineHeight: 1.35,
                  }}
                >
                  {t('retail.settings.qrSvgHint') ||
                    'SVG подходит для типографий, наклеек и витринных баннеров — масштабируется без потери качества.'}
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
              background: 'var(--bg-card)',
              border: '1px solid rgba(239, 68, 68, 0.28)',
              borderRadius: 18,
              padding: 18,
              boxShadow: 'var(--shadow-card)',
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
        {/* ── СОХРАНИТЬ НАСТРОЙКИ (В ПОТОКЕ ФОРМЫ) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 14,
              background: isSaving ? 'rgba(2, 132, 199, 0.6)' : '#0284c7',
              border: 'none',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 700,
              cursor: isSaving ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 16px rgba(2, 132, 199, 0.28)',
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
                <CheckCircleIcon size={16} color="#ffffff" />
                <span>{t('retail.settings.save') || 'Сохранить настройки'}</span>
                {isDirty && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#ffffff',
                      opacity: 0.8,
                      marginLeft: 2,
                    }}
                    title={t('retail.settings.unsavedChanges') || 'Есть несохраненные изменения'}
                  />
                )}
              </>
            )}
          </button>

          {saveStatus === 'ok' && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10B981',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <CheckCircleIcon size={16} color="#10B981" />
              <span>{t('retail.settings.saved') || 'Настройки успешно сохранены'}</span>
            </div>
          )}

          {saveStatus === 'error' && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertTriangleIcon size={16} color="#EF4444" />
              <span>{saveErrorMessage || t('retail.settings.saveError')}</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
