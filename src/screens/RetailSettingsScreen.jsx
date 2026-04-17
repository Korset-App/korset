import { useState, useRef, useEffect } from 'react'
import { useI18n } from '../utils/i18n.js'
import { useStore } from '../contexts/StoreContext.jsx'
import QRCode from 'react-qr-code'
import { clearStoreCatalog } from '../utils/retailAnalytics.js'

export default function RetailSettingsScreen() {
  const { lang } = useI18n()
  const { currentStore, updateStoreSettings } = useStore()
  const isKz = lang === 'kz'

  const [settings, setSettings] = useState({
    name: currentStore?.name || '',
    address: currentStore?.address || '',
    notifyMissing: currentStore?.notify_oos_enabled ?? true,
    notifyDaily: currentStore?.notify_daily_enabled ?? false,
  })
  const [showQR, setShowQR] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'ok' | 'error'
  // Track which toggle is currently saving ('missing' | 'daily' | null)
  const [savingToggle, setSavingToggle] = useState(null)
  const qrRef = useRef(null)
  const [isClearing, setIsClearing] = useState(false)

  // Sync ALL fields (including toggles) when store data arrives from Supabase
  useEffect(() => {
    if (currentStore) {
      setSettings((prev) => ({
        ...prev,
        name: currentStore.name || prev.name,
        address: currentStore.address || prev.address,
        notifyMissing: currentStore.notify_oos_enabled ?? prev.notifyMissing,
        notifyDaily: currentStore.notify_daily_enabled ?? prev.notifyDaily,
      }))
    }
  }, [currentStore?.id])

  const handleChange = (key, val) => {
    setSettings((p) => ({ ...p, [key]: val }))
    setSaveStatus(null)
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
    const { error } = await updateStoreSettings({
      name: settings.name,
      address: settings.address,
    })
    setIsSaving(false)
    setSaveStatus(error ? 'error' : 'ok')
    setTimeout(() => setSaveStatus(null), 3000)
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

  const handleClearCatalog = async () => {
    if (!currentStore?.id) return
    const msg = isKz ? 'Барлық тауарларды жоюды растаңыз?' : 'Подтвердите удаление всех товаров?'
    if (!window.confirm(msg)) return
    try {
      setIsClearing(true)
      await clearStoreCatalog(currentStore.id)
      setIsClearing(false)
      alert(isKz ? 'Каталог сәтті тазартылды' : 'Каталог очищен')
    } catch (e) {
      setIsClearing(false)
      alert(isKz ? 'Қателік орын алды: ' + e.message : 'Ошибка при удалении: ' + e.message)
    }
  }
  return (
    <div style={{ padding: '20px 16px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: '#fff',
            margin: '0 0 4px',
          }}
        >
          {isKz ? 'Магазин баптаулары' : 'Настройки профиля'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-sub)', margin: 0 }}>
          {isKz ? 'Сауда нүктесін басқару' : 'Управление торговой точкой'}
        </p>
      </div>

      {/* Main Info Box */}
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
          {isKz ? 'НЕГІЗГІ АҚПАРАТ' : 'ОСНОВНАЯ ИНФОРМАЦИЯ'}
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 16px' }}>
            <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 6 }}>
              {isKz ? 'Дүкен атауы' : 'Название объекта'}
            </div>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => handleChange('name', e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                padding: '12px 14px',
                borderRadius: 10,
                fontSize: 15,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

          <div style={{ padding: '16px 16px' }}>
            <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 6 }}>
              {isKz ? 'Мекенжай' : 'Фактический адрес'}
            </div>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => handleChange('address', e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                padding: '12px 14px',
                borderRadius: 10,
                fontSize: 15,
                outline: 'none',
              }}
            />
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
            color: '#fff',
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
              {isKz ? 'Сақталуда...' : 'Сохраняем...'}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                save
              </span>
              {isKz ? 'Сақтау' : 'Сохранить настройки'}
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
            {isKz ? 'Сәтті сақталды' : 'Сохранено успешно'}
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
            {isKz ? 'Қате орын алды' : 'Ошибка сохранения. Попробуйте ещё раз.'}
          </div>
        )}
      </div>

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
          {isKz ? 'МАГАЗИНГА ШАҚЫРУ' : 'ПРИГЛАШЕНИЕ В МАГАЗИН'}
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
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
              <div style={{ fontSize: 15, color: '#fff', fontWeight: 600 }}>
                {isKz ? 'QR-код арқылы қосылу' : 'Подключение по QR-коду'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
                {isKz
                  ? 'Клиенттер бұл кодты сканерлеп магазинге қосыла алады'
                  : 'Клиенты сканируют код для входа в магазин'}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowQR(!showQR)}
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
            {showQR
              ? isKz
                ? 'Жасыру'
                : 'Скрыть QR-код'
              : isKz
                ? 'QR-кодты көрсету'
                : 'Показать QR-код'}
          </button>

          {showQR && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                padding: '20px 16px',
                background: 'rgba(0,0,0,0.2)',
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
                    background: '#7C3AED',
                    color: '#fff',
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
                  {isKz ? 'Сілтеме:' : 'Ссылка:'}
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

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
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
                  {isKz ? 'Көшіру' : 'Копировать'}
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
                  {isKz ? 'Жүктеу PNG' : 'Скачать PNG'}
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
          {isKz ? 'ХАБАРЛАНДЫРУЛАР' : 'УВЕДОМЛЕНИЯ'}
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
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
              <div style={{ fontSize: 15, color: '#fff', fontWeight: 500, marginBottom: 4 }}>
                {isKz ? 'Жоқ тауарлар' : 'Отсутствующие товары'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                {isKz
                  ? 'Сатып алушылар таба алмаған тауарлар туралы хабарлау'
                  : 'Пуш-уведомление, если клиент не нашел товар'}
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
                background: settings.notifyMissing ? '#38BDF8' : 'rgba(255,255,255,0.1)',
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
                  background: '#fff',
                  transition: 'left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
              />
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />

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
              <div style={{ fontSize: 15, color: '#fff', fontWeight: 500, marginBottom: 4 }}>
                {isKz ? 'Күнделікті есеп' : 'Ежедневный отчет'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                {isKz ? 'Кешкі сканерлеу статистикасы' : 'Сводка сканирований каждый вечер'}
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
                background: settings.notifyDaily ? '#38BDF8' : 'rgba(255,255,255,0.1)',
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
                  background: '#fff',
                  transition: 'left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
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
          {isKz ? 'ҚАУІПТІ АЙМАҚ' : 'ОПАСНАЯ ЗОНА'}
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
            }}
          >
            <div>
              <div style={{ fontSize: 15, color: '#EF4444', fontWeight: 500, marginBottom: 4 }}>
                {isKz ? 'Каталогты тазарту' : 'Очистить каталог'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {isKz
                  ? 'Барлық жүктелген тауарларды өшіру'
                  : 'Удалить все добавленные товары из системы'}
              </div>
            </div>
            <button
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: 'none',
                color: '#EF4444',
                padding: '8px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: isClearing ? 'wait' : 'pointer',
                onClick: handleClearCatalog,
                disabled: isClearing,
              }}
            >
              {isClearing ? (isKz ? 'Тазартулуда...' : 'Очищается...') : isKz ? 'Тазарту' : 'Сброс'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
