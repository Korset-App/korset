import { useState, useEffect, useCallback, useRef } from 'react'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import StoreLivePreviewCard from '../components/retail/StoreLivePreviewCard.jsx'
import StorePhotosManager from '../components/retail/StorePhotosManager.jsx'
import StorefrontBrandingCard from '../components/retail/storefront/StorefrontBrandingCard.jsx'
import StorefrontQrCard from '../components/retail/storefront/StorefrontQrCard.jsx'
import RetailQrDialog from '../components/retail/RetailQrDialog.jsx'
import RetailSaveBar from '../components/retail/RetailSaveBar.jsx'
import {
  EyeIcon,
  ExternalLinkIcon,
  CheckCircleIcon,
  ShareIcon,
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
  marginBottom: 16,
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
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [saveErrorMessage, setSaveErrorMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false)

  const printButtonRef = useRef(null)

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

  const handleLogoChange = useCallback(
    async (nextLogoUrl) => {
      setLogoUrl(nextLogoUrl)
      setIsDirty(true)
      setSaveStatus(null)
      if (currentStore?.id) {
        await updateStoreSettings({ logo_url: nextLogoUrl })
      }
    },
    [currentStore?.id, updateStoreSettings]
  )

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
    temporary_closure: currentStore?.temporary_closure,
  }

  return (
    <div
      className="retail-screen-canvas"
      style={{
        padding: isDirty ? '0 0 160px' : '0 0 100px',
        transition: 'padding-bottom 0.2s ease',
      }}
    >
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
            <span>{t('retail.nav.storefront') || (isKz ? 'Дүкен сөресі' : 'Витрина покупателя')}</span>
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.45 }}>
            {isKz
              ? 'Сатып алушылар дүкеніңізді смартфоннан қалай көретінін реттеңіз'
              : 'Настройте брендинг, логотип, фотографии полок и печатные материалы для покупателей'}
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

      {/* ── 2-Column Responsive Layout (safe down to 320px) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Left Column: Editor Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 1. Брендинг и логотип */}
          <StorefrontBrandingCard
            storeId={currentStore?.id}
            settings={settings}
            logoUrl={logoUrl}
            onSettingChange={handleChange}
            onLogoChange={handleLogoChange}
            disabled={isSaving}
          />

          {/* 2. Фотографии магазина */}
          <div style={CARD_STYLE}>
            <div style={FIELD_LABEL}>
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
          <StorefrontQrCard
            storeName={currentStore?.name}
            publicStoreUrl={publicStoreUrl}
            onOpenPrintDialog={() => setIsQrDialogOpen(true)}
          />
        </div>

        {/* Right Column: Live Customer Preview Card (Sticky on desktop) */}
        <div style={{ position: 'sticky', top: 24 }}>
          <StoreLivePreviewCard
            settings={previewSettingsAdapter}
            logoUrl={logoUrl}
            phones={currentStore?.features?.contacts?.phones || []}
            storeSlug={storeSlug}
          />
        </div>
      </div>

      {/* Printable QR Dialog */}
      {isQrDialogOpen && currentStore && (
        <RetailQrDialog
          type="cashier"
          store={currentStore}
          onClose={() => setIsQrDialogOpen(false)}
          returnFocusRef={printButtonRef}
        />
      )}

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
