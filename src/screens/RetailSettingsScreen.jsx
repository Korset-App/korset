import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { clearStoreCatalog } from '../utils/retailAnalytics.js'
import ConfirmDangerModal from '../components/ConfirmDangerModal.jsx'
import StoreScheduleEditor from '../components/retail/StoreScheduleEditor.jsx'
import StoreAmenitiesEditor from '../components/retail/StoreAmenitiesEditor.jsx'
import StoreContactsEditor from '../components/retail/StoreContactsEditor.jsx'
import RetailSettingsAnchorNav from '../components/retail/RetailSettingsAnchorNav.jsx'
import RetailSaveBar from '../components/retail/RetailSaveBar.jsx'
import SettingsBasicSection from '../components/retail/settings/SettingsBasicSection.jsx'
import SettingsAddressSection from '../components/retail/settings/SettingsAddressSection.jsx'
import SettingsAiNotesSection from '../components/retail/settings/SettingsAiNotesSection.jsx'
import SettingsNotificationsSection from '../components/retail/settings/SettingsNotificationsSection.jsx'
import SettingsTeamSection from '../components/retail/settings/SettingsTeamSection.jsx'
import SettingsDangerSection from '../components/retail/settings/SettingsDangerSection.jsx'
import { buildRetailStoreSettingsPayload } from '../domain/retail/storeSettings.js'
import {
  PhoneCallIcon,
  ClockIcon,
  AdvantagesIcon,
} from '../components/icons/index.js'

// Phone formatting utilities
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
  const [saveStatus, setSaveStatus] = useState(null)
  const [saveErrorMessage, setSaveErrorMessage] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [savingToggle, setSavingToggle] = useState(null)

  const [showClearModal, setShowClearModal] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [actionNotice, setActionNotice] = useState(null)

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

  // Auto-save toggle to Supabase immediately with inline notice
  const handleToggle = async (key, dbField) => {
    const newVal = !settings[key]
    setSettings((p) => ({ ...p, [key]: newVal }))
    setSavingToggle(key)
    const { error } = await updateStoreSettings({ [dbField]: newVal })
    setSavingToggle(null)
    if (error) {
      setSettings((p) => ({ ...p, [key]: !newVal }))
      setActionNotice({
        type: 'error',
        text: t('retail.settings.saveError') || (isKz ? 'Сақтау қатесі' : 'Ошибка сохранения'),
      })
    } else {
      setActionNotice({
        type: 'ok',
        text: isKz ? 'Параметр сақталды' : 'Параметр обновлен',
      })
      setTimeout(() => setActionNotice(null), 3000)
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

  const handleConfirmClear = async () => {
    if (!currentStore?.id) return
    try {
      setIsClearing(true)
      await clearStoreCatalog(currentStore.id)
      setIsClearing(false)
      setShowClearModal(false)
      setActionNotice({
        type: 'ok',
        text: t('retail.products.allResolved') || (isKz ? 'Каталог сәтті тазартылды' : 'Каталог успешно очищен'),
      })
    } catch (e) {
      setIsClearing(false)
      setActionNotice({
        type: 'error',
        text: (t('retail.settings.clearError') || 'Ошибка очистки: ') + e.message,
      })
    }
  }

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

      <div
        className="retail-settings-desktop-container"
        style={{
          paddingBottom: isDirty ? 160 : 90,
          transition: 'padding-bottom 0.2s ease',
        }}
      >
        {/* Sticky Table of Contents on Desktop */}
        <RetailSettingsAnchorNav />

        {/* Bento Grid Settings Content */}
        <div className="retail-bento-grid">
          {/* Header Title for Settings Screen */}
          <div
            className="bento-col-12"
            style={{
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
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
                }}
              >
                {t('retail.nav.settings') || (isKz ? 'Баптаулар' : 'Настройки магазина')}
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-sub)' }}>
                {isKz
                  ? 'Филиал деректерін, байланыс арналарын, кестені және хабарландыруларды басқару'
                  : 'Управление параметрами филиала, каналами связи, графиком работы и уведомлениями'}
              </p>
            </div>

            {actionNotice && (
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  padding: '7px 14px',
                  borderRadius: 10,
                  background:
                    actionNotice.type === 'ok'
                      ? 'rgba(16, 185, 129, 0.12)'
                      : 'rgba(239, 68, 68, 0.12)',
                  color:
                    actionNotice.type === 'ok'
                      ? 'var(--success-bright, #10b981)'
                      : 'var(--error-bright, #ef4444)',
                  border: `1px solid ${
                    actionNotice.type === 'ok'
                      ? 'rgba(16, 185, 129, 0.25)'
                      : 'rgba(239, 68, 68, 0.25)'
                  }`,
                }}
              >
                {actionNotice.text}
              </div>
            )}
          </div>

          {/* ── 1. ОСНОВНАЯ ИНФОРМАЦИЯ ── */}
          <SettingsBasicSection
            name={settings.name}
            type={settings.type}
            targetSlug={targetSlug}
            onChange={handleChange}
            disabled={isSaving}
          />

          {/* ── 2. КОНТАКТЫ И СВЯЗЬ ── */}
          <section id="section-contacts" className="bento-col-6 retail-card">
            <div className="retail-card__header">
              <div className="retail-card__icon-box">
                <PhoneCallIcon size={20} />
              </div>
              <div className="retail-card__title-wrap">
                <h3 className="retail-card__title">
                  {t('retail.settings.contactsTitle') || (isKz ? 'Байланыс және әлеуметтік желілер' : 'Контакты и связь')}
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
          <SettingsAddressSection
            address={settings.address}
            twogisUrl={settings.twogis_url}
            latitude={settings.latitude}
            longitude={settings.longitude}
            onChange={handleChange}
            disabled={isSaving}
          />

          {/* ── 4. ГРАФИК РАБОТЫ И ПЛАНОВЫЕ ЗАКРЫТИЯ ── */}
          <section id="section-schedule" className="bento-col-12 retail-card">
            <div className="retail-card__header">
              <div className="retail-card__icon-box">
                <ClockIcon size={20} />
              </div>
              <div className="retail-card__title-wrap">
                <h3 className="retail-card__title">
                  {t('retail.settings.scheduleTitle') || (isKz ? 'Жұмыс кестесі және мәртебесі' : 'График и статус работы')}
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
                  {t('retail.settings.amenitiesTitle') || (isKz ? 'Дүкен қызметтері мен қолайлылықтар' : 'Сервис и удобства')}
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
          <SettingsAiNotesSection
            aiStoreNotes={settings.ai_store_notes}
            onChange={handleChange}
            disabled={isSaving}
          />

          {/* ── 7. УВЕДОМЛЕНИЯ ── */}
          <SettingsNotificationsSection
            notifyMissing={settings.notifyMissing}
            notifyDaily={settings.notifyDaily}
            savingToggle={savingToggle}
            onToggle={handleToggle}
          />

          {/* ── 8. КОМАНДА И ДОСТУПЫ ── */}
          <SettingsTeamSection user={user} />

          {/* ── 9. ПУБЛИКАЦИЯ И СБРОС (ОПАСНАЯ ЗОНА) ── */}
          <SettingsDangerSection
            isPublished={settings.is_published}
            savingToggle={savingToggle}
            isClearing={isClearing}
            onTogglePublished={() => handleToggle('is_published', 'is_published')}
            onOpenClearModal={() => setShowClearModal(true)}
          />
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
