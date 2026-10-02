import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import { clearStoreCatalog } from '../utils/retailAnalytics.js'
import ConfirmDangerModal from '../components/ConfirmDangerModal.jsx'
import Toggle from '../components/Toggle.jsx'
import StoreScheduleEditor from '../components/retail/StoreScheduleEditor.jsx'
import StoreAmenitiesEditor from '../components/retail/StoreAmenitiesEditor.jsx'
import StoreContactsEditor from '../components/retail/StoreContactsEditor.jsx'
import RetailSettingsAnchorNav from '../components/retail/RetailSettingsAnchorNav.jsx'
import RetailSaveBar from '../components/retail/RetailSaveBar.jsx'
import {
  buildRetailStoreSettingsPayload,
  getAIStoreNotesLimit,
} from '../domain/retail/storeSettings.js'
import {
  StorefrontIcon,
  PhoneCallIcon,
  LocationPinIcon,
  ClockIcon,
  AdvantagesIcon,
  SparklesIcon,
  AlertTriangleIcon,
  LockIcon,
  TrashIcon,
  CheckCircleIcon,
  TwoGisIcon,
  SearchIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
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

const FIELD_LABEL_STYLE = {
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

export default function RetailSettingsScreen() {
  const { storeSlug } = useParams()
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'
  const { currentStore, updateStoreSettings } = useStore()
  const { user } = useAuth()

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
    latitude: currentStore?.latitude || '',
    longitude: currentStore?.longitude || '',
    is_published: currentStore?.is_published !== false,
    temporary_closure: currentStore?.temporary_closure || null,
    type: currentStore?.type || 'minimarket',
    features: currentStore?.features || {},
  })

  const [phones, setPhones] = useState(() => getInitialContacts(currentStore).phones)
  const [whatsapps, setWhatsapps] = useState(() => getInitialContacts(currentStore).whatsapps)

  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'ok' | 'error'
  const [saveErrorMessage, setSaveErrorMessage] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [savingToggle, setSavingToggle] = useState(null)

  const [showClearModal, setShowClearModal] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [showManualCoords, setShowManualCoords] = useState(false)
  const [showSeoExplanation, setShowSeoExplanation] = useState(false)

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
      latitude: currentStore.latitude || '',
      longitude: currentStore.longitude || '',
      is_published: currentStore.is_published !== false,
      temporary_closure: currentStore.temporary_closure || null,
      type: currentStore.type || 'minimarket',
      features: currentStore.features || {},
    })
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

  const handleDiscard = () => {
    if (!currentStore) return
    const syncedContacts = getInitialContacts(currentStore)
    setPhones(syncedContacts.phones)
    setWhatsapps(syncedContacts.whatsapps)
    setSettings({
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
      latitude: currentStore?.latitude || '',
      longitude: currentStore?.longitude || '',
      is_published: currentStore?.is_published !== false,
      temporary_closure: currentStore?.temporary_closure || null,
      type: currentStore?.type || 'minimarket',
      features: currentStore?.features || {},
    })
    setIsDirty(false)
    setSaveStatus(null)
    setSaveErrorMessage('')
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

  const targetSlug = storeSlug || currentStore?.slug || ''

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

      <div className="retail-settings-desktop-container">
        {/* Sticky Table of Contents on Desktop */}
        <RetailSettingsAnchorNav />

        {/* Bento Grid Settings Content */}
        <div className="retail-bento-grid">
          {/* ── 1. ОСНОВНАЯ ИНФОРМАЦИЯ ── */}
          <section id="section-basic" className="bento-col-12 retail-card">
            <div className="retail-card__header">
              <div className="retail-card__icon-box">
                <StorefrontIcon size={20} />
              </div>
              <div className="retail-card__title-wrap">
                <h3 className="retail-card__title">
                  {t('retail.settings.infoTitle') || 'Основная информация'}
                </h3>
                <p className="retail-card__subtitle">
                  {isKz
                    ? 'Филиалдың негізгі параметрлері және сауда пішімі'
                    : 'Базовые параметры торговой точки и формат магазина'}
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 18,
                marginBottom: 18,
              }}
            >
              {/* Название магазина */}
              <div>
                <div style={FIELD_LABEL_STYLE}>
                  {t('retail.settings.nameLabel') || 'Название магазина'}
                </div>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  style={INPUT_STYLE}
                  placeholder="Например: Bereke Market"
                  maxLength={80}
                />
              </div>

              {/* Формат магазина */}
              <div>
                <div style={FIELD_LABEL_STYLE}>
                  {t('retail.settings.storeTypeLabel') || 'Тип магазина'}
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
                    <option value="halal">
                      {t('retail.settings.typeHalal') || 'Халал маркет'}
                    </option>
                    <option value="specialty">
                      {t('retail.settings.typeSpecialty') || 'Специализированный'}
                    </option>
                    <option value="other">
                      {t('retail.settings.typeOther') || 'Магазин у дома'}
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
            </div>

            {/* Banner: Storefront link notice */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
                padding: '14px 18px',
                borderRadius: 14,
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.22)',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 240, flex: 1 }}
              >
                <StorefrontIcon size={20} color="var(--retail-accent, #38bdf8)" />
                <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
                  {t('retail.settings.storefrontLinkNotice') ||
                    'Оформление витрины, логотип, обложка и печать QR-кодов для кассы перенесены в раздел'}{' '}
                  <strong style={{ color: 'var(--retail-accent, #38bdf8)' }}>
                    {t('retail.nav.storefront') || 'Витрина'}
                  </strong>
                  .
                </span>
              </div>

              {targetSlug && (
                <Link
                  to={`/retail/${targetSlug}/storefront`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 10,
                    background: 'var(--retail-accent, #38bdf8)',
                    color: '#080c18',
                    fontWeight: 700,
                    fontSize: 12.5,
                    textDecoration: 'none',
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  <span>{t('retail.settings.goToStorefront') || 'Перейти в Витрину'}</span>
                  <ExternalLinkIcon size={14} />
                </Link>
              )}
            </div>
          </section>

          {/* ── 2. КОНТАКТЫ И СВЯЗЬ ── */}
          <section id="section-contacts" className="bento-col-6 retail-card">
            <div className="retail-card__header">
              <div className="retail-card__icon-box">
                <PhoneCallIcon size={20} />
              </div>
              <div className="retail-card__title-wrap">
                <h3 className="retail-card__title">
                  {t('retail.settings.contactsTitle') || 'Контакты и связь'}
                </h3>
                <p className="retail-card__subtitle">
                  {isKz
                    ? 'Телефондар, WhatsApp, Instagram және байланыс арналары'
                    : 'Телефоны, WhatsApp, Instagram и каналы связи'}
                </p>
              </div>
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
          </section>

          {/* ── 3. ФАКТИЧЕСКИЙ АДРЕС И 2GIS ── */}
          <section id="section-address" className="bento-col-6 retail-card">
            <div className="retail-card__header">
              <div className="retail-card__icon-box">
                <LocationPinIcon size={20} />
              </div>
              <div className="retail-card__title-wrap">
                <h3 className="retail-card__title">
                  {t('retail.settings.addressTitle') || 'Фактический адрес & 2GIS'}
                </h3>
                <p className="retail-card__subtitle">
                  {isKz
                    ? 'Геолокация, 2GIS сілтемесі және жергілікті SEO'
                    : 'Геолокация филиала, 2GIS и локальное SEO'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Фактический адрес */}
              <div>
                <div style={FIELD_LABEL_STYLE}>
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

              {/* Привязка карточки в 2GIS */}
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
                      {isKz ? '2GIS сілтемесі' : 'Ссылка на карточку в 2GIS'}
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
                  placeholder="https://2gis.kz/astana/firm/... или go.2gis.com/..."
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
                    {showManualCoords
                      ? isKz
                        ? 'Жасыру'
                        : 'Скрыть'
                      : isKz
                        ? 'Өзгерту'
                        : 'Изменить'}
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
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--retail-border)',
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

              {/* Collapsible Local SEO Hint */}
              <div
                style={{
                  borderRadius: 12,
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--retail-border)',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowSeoExplanation(!showSeoExplanation)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
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
                    <SearchIcon size={14} color="var(--text-dim)" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
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
                      padding: '0 12px 12px',
                      fontSize: 12,
                      color: 'var(--text-sub)',
                      lineHeight: 1.5,
                      borderTop: '1px solid var(--retail-border)',
                      paddingTop: 10,
                    }}
                  >
                    <div style={{ marginBottom: 6, color: 'var(--text)', fontWeight: 500 }}>
                      {t('retail.settings.seoBrief') ||
                        'Точные координаты выводят витрину магазина в топ выдачи Google и на картах рядом с покупателем.'}
                    </div>
                    <div
                      style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5 }}
                    >
                      <div>
                        <strong style={{ color: 'var(--text)' }}>2GIS, Google: </strong>
                        <span>
                          {t('retail.settings.seoP1Desc') ||
                            'Поисковые алгоритмы показывают магазин в карточках выдачи для пользователей поблизости.'}
                        </span>
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text)' }}>Навигация: </strong>
                        <span>
                          {t('retail.settings.seoP2Desc') ||
                            'Покупатели видят расстояние в метрах и переходят в 2GIS прямо до входа.'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── 4. ГРАФИК РАБОТЫ И ПЛАНОВЫЕ ЗАКРЫТИЯ ── */}
          <section id="section-schedule" className="bento-col-12 retail-card">
            <div className="retail-card__header">
              <div className="retail-card__icon-box">
                <ClockIcon size={20} />
              </div>
              <div className="retail-card__title-wrap">
                <h3 className="retail-card__title">
                  {t('retail.settings.scheduleTitle') || 'График и статус работы'}
                </h3>
                <p className="retail-card__subtitle">
                  {isKz
                    ? 'Жұмыс уақыты, демалыс күндері және ревизия туралы хабарландыру'
                    : 'Режим работы, круглосуточный режим и уведомление о ревизии'}
                </p>
              </div>
            </div>

            <StoreScheduleEditor
              openingHours={settings.opening_hours}
              temporaryClosure={settings.temporary_closure}
              onChange={({ opening_hours, temporary_closure }) => {
                handleChange('opening_hours', opening_hours)
                handleChange('temporary_closure', temporary_closure)
              }}
            />
          </section>

          {/* ── 5. ОСОБЕННОСТИ И СЕРВИС МАГАЗИНА ── */}
          <section id="section-amenities" className="bento-col-12 retail-card">
            <div className="retail-card__header">
              <div className="retail-card__icon-box">
                <AdvantagesIcon size={20} />
              </div>
              <div className="retail-card__title-wrap">
                <h3 className="retail-card__title">
                  {t('retail.settings.amenitiesTitle') || 'Сервис и удобства'}
                </h3>
                <p className="retail-card__subtitle">
                  {isKz
                    ? 'Төлем әдістері (Kaspi, карта, қолма-қол) және сатып алушыларға арналған қызметтер'
                    : 'Способы оплаты (Kaspi QR, карты, наличные) и доступный сервис для покупателей'}
                </p>
              </div>
            </div>

            <StoreAmenitiesEditor
              selectedFeatures={settings.features}
              onChange={(feats) => handleChange('features', feats)}
            />
          </section>

          {/* ── 6. ЗАМЕТКИ ДЛЯ KÖRSET AI ── */}
          <section id="section-ai" className="bento-col-12 retail-card">
            <div className="retail-card__header">
              <div className="retail-card__icon-box">
                <SparklesIcon size={20} />
              </div>
              <div className="retail-card__title-wrap">
                <h3 className="retail-card__title">
                  {t('retail.settings.aiNotesTitle') || 'Заметки для Körset AI'}
                </h3>
                <p className="retail-card__subtitle">
                  {isKz
                    ? 'Сөре жанындағы ақылды кеңесші білуі тиіс маңызды деректер (тек AI көреді)'
                    : 'Факты о магазине, которые умный ассистент использует при ответах покупателям'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={FIELD_LABEL_STYLE}>
                  {t('retail.settings.aiNotesLabel') || 'Факты для ассистента у полки'}
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-dim)',
                      marginLeft: 6,
                      fontWeight: 400,
                    }}
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
                  maxLength={aiNotesLimit}
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
          </section>

          {/* ── 7. УВЕДОМЛЕНИЯ ── */}
          <section id="section-notifications" className="bento-col-12 retail-card">
            <div className="retail-card__header">
              <div className="retail-card__icon-box">
                <AlertTriangleIcon size={20} />
              </div>
              <div className="retail-card__title-wrap">
                <h3 className="retail-card__title">
                  {t('retail.settings.notifyTitle') || 'Уведомления'}
                </h3>
                <p className="retail-card__subtitle">
                  {isKz
                    ? 'Тауарлардың бітуі және күнделікті қорытынды туралы ескертулер'
                    : 'Оповещения об отсутствующих товарах и вечерний отчет'}
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--glass-bg)',
                border: '1px solid var(--retail-border)',
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              {/* Toggle 1: Отсутствующие товары */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                }}
              >
                <div>
                  <div
                    style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, marginBottom: 2 }}
                  >
                    {t('retail.settings.notifyMissingTitle') || 'Отсутствующие товары'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>
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

              <div style={{ height: 1, background: 'var(--retail-border)', margin: '0 18px' }} />

              {/* Toggle 2: Ежедневный отчет */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                }}
              >
                <div>
                  <div
                    style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, marginBottom: 2 }}
                  >
                    {t('retail.settings.notifyDailyTitle') || 'Ежедневный отчет'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>
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
          </section>

          {/* ── 8. КОМАНДА И ДОСТУПЫ ── */}
          <section id="section-team" className="bento-col-12 retail-card">
            <div className="retail-card__header">
              <div className="retail-card__icon-box">
                <LockIcon size={20} />
              </div>
              <div className="retail-card__title-wrap">
                <h3 className="retail-card__title">
                  {t('retail.settings.teamTitle') || 'Команда и доступы'}
                </h3>
                <p className="retail-card__subtitle">
                  {t('retail.settings.teamSub') || 'Управление правами сотрудников магазина'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Current Owner Profile Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: 14,
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--retail-border)',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 200 }}>
                  <ProfileAvatar size={42} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                      {user?.email || 'owner@korset.kz'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                      {t('retail.settings.teamRoleOwner') || 'Управляющий (Полный доступ)'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.4px',
                      padding: '3px 9px',
                      borderRadius: 6,
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: 'var(--success-bright, #10b981)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    {t('retail.settings.teamStatusActive') || 'Активен'}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 9px',
                      borderRadius: 6,
                      background: 'rgba(56, 189, 248, 0.12)',
                      color: 'var(--retail-accent, #38bdf8)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                    }}
                  >
                    {t('retail.settings.teamCurrentOwner') || 'Владелец'}
                  </span>
                </div>
              </div>

              {/* Roles Roadmap Teaser */}
              <div
                style={{
                  padding: '16px 18px',
                  borderRadius: 14,
                  background: 'rgba(56, 189, 248, 0.05)',
                  border: '1px dashed rgba(56, 189, 248, 0.28)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 6,
                    color: 'var(--retail-accent, #38bdf8)',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  <LockIcon size={16} />
                  <span>
                    {t('retail.settings.teamRolesTeaserTitle') || 'Раздельные роли сотрудников'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                  {t('retail.settings.teamRolesTeaserBody') ||
                    'В следующем обновлении появится добавление сотрудников с ограниченными правами: «Кассир» (только сканирование и кассовый чек), «Товаровед» (приемка, остатки и цены), «Бухгалтер» (отчеты и накладные).'}
                </p>
              </div>
            </div>
          </section>

          {/* ── 9. ПУБЛИКАЦИЯ И СБРОС (ОПАСНАЯ ЗОНА) ── */}
          <section id="section-danger" className="bento-col-12 retail-card retail-card--danger">
            <div className="retail-card__header">
              <div
                className="retail-card__icon-box"
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  borderColor: 'rgba(239, 68, 68, 0.25)',
                  color: 'var(--error-bright, #ef4444)',
                }}
              >
                <TrashIcon size={20} />
              </div>
              <div className="retail-card__title-wrap">
                <h3
                  className="retail-card__title"
                  style={{ color: 'var(--error-bright, #ef4444)' }}
                >
                  {t('retail.settings.dangerTitle') || 'Публикация и сброс'}
                </h3>
                <p className="retail-card__subtitle">
                  {isKz
                    ? 'Дүкеннің жалпыға көріну күйі және каталогты тазарту'
                    : 'Видимость магазина для покупателей и очистка каталога'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Publication Status Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '14px 18px',
                  borderRadius: 14,
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--retail-border)',
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
                        color: settings.is_published
                          ? 'var(--success-bright, #10b981)'
                          : 'var(--error-bright, #ef4444)',
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
                  <div style={{ fontSize: 11.5, color: 'var(--text-sub)', lineHeight: 1.35 }}>
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

              {/* Clear Catalog */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '14px 18px',
                  borderRadius: 14,
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--retail-border)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      color: 'var(--error-bright, #ef4444)',
                      fontWeight: 600,
                      marginBottom: 2,
                    }}
                  >
                    {t('retail.settings.clearCatalog') || 'Очистить каталог'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.35 }}>
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
                    color: 'var(--error-bright, #ef4444)',
                    padding: '8px 16px',
                    borderRadius: 10,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: isClearing ? 'wait' : 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t('retail.settings.clearBtn') || 'Сброс'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Floating Save Bar */}
      <RetailSaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        saveStatus={saveStatus}
        saveErrorMessage={saveErrorMessage}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </>
  )
}
