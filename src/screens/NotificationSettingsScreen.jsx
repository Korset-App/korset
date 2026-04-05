import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import {
  browserNotificationStatus,
  DEFAULT_NOTIFICATION_SETTINGS,
  loadNotificationSettings,
  registerPushServiceWorker,
  saveNotificationSettings,
  urlBase64ToUint8Array,
} from '../utils/notificationSettings.js'

const fontDisplay = '"Bebas Neue", "Arial Narrow", sans-serif'
const fontBody = 'Space Grotesk, system-ui, sans-serif'

function Section({ title, children }) {
  return (
    <div style={{ padding: '0 22px 18px' }}>
      <div style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.5 }}>{title}</div>
      <div className="glass-card" style={{ padding: 0 }}>{children}</div>
    </div>
  )
}

function Row({ label, description, right, danger = false, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '15px 18px', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: fontBody, fontSize: 14, fontWeight: 600, color: danger ? '#FCA5A5' : '#fff' }}>{label}</div>
        {description ? <div style={{ fontFamily: fontBody, fontSize: 12, lineHeight: 1.45, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{description}</div> : null}
      </div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  )
}

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(!checked) }}
      style={{
        width: 50,
        height: 30,
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.08)',
        background: checked ? 'linear-gradient(135deg,#7C3AED,#EC4899)' : 'rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        padding: 3,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: checked ? '0 0 20px rgba(168,85,247,0.35)' : 'none' }} />
    </button>
  )
}

export default function NotificationSettingsScreen() {
  const navigate = useNavigate()
  const { storeSlug } = useParams()
  const { profile, updateProfile } = useProfile()
  const { user } = useAuth()
  const deviceId = typeof window !== 'undefined' ? localStorage.getItem('korset_device_id') : null
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(profile?.notifications || {}),
    ...loadNotificationSettings(),
    ...browserNotificationStatus(),
  }))
  const [busy, setBusy] = useState(false)
  const [statusText, setStatusText] = useState('')

  useEffect(() => {
    const fromProfile = profile?.notifications || {}
    const fromLocal = loadNotificationSettings()
    setSettings(prev => ({ ...prev, ...DEFAULT_NOTIFICATION_SETTINGS, ...fromProfile, ...fromLocal, ...browserNotificationStatus() }))
  }, [profile])

  const permissionLabel = useMemo(() => {
    if (settings.status === 'granted') return 'Разрешены'
    if (settings.status === 'denied') return 'Запрещены'
    if (settings.status === 'unsupported') return 'Не поддерживаются'
    return 'Не запрошены'
  }, [settings.status])

  async function persist(next) {
    setSettings(next)
    saveNotificationSettings(next)
    await updateProfile({ notifications: next })
  }

  async function updatePartial(patch) {
    const next = { ...settings, ...patch }
    await persist(next)
  }

  async function requestPermission() {
    if (!settings.pushSupported) {
      setStatusText('На этом устройстве web push не поддерживается.')
      return
    }
    try {
      setBusy(true)
      const result = await Notification.requestPermission()
      const next = { ...settings, status: result, enabled: result === 'granted', lastPermissionCheckAt: new Date().toISOString() }
      await persist(next)
      setStatusText(result === 'granted' ? 'Доступ к уведомлениям разрешён.' : 'Пользовательский доступ к уведомлениям не выдан.')
      if (result === 'granted') {
        await subscribeDevice(next)
      }
    } catch (err) {
      setStatusText('Не удалось запросить разрешение.')
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  async function subscribeDevice(baseSettings = settings) {
    try {
      setBusy(true)
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        setStatusText('Не задан VITE_VAPID_PUBLIC_KEY.')
        return
      }

      const registration = await registerPushServiceWorker()
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })
      }

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          authUserId: user?.id || null,
          deviceId,
          storeSlug: storeSlug || null,
          preferences: {
            weekly: baseSettings.weekly,
            favorites: baseSettings.favorites,
            restock: baseSettings.restock,
            promo: baseSettings.promo,
            system: baseSettings.system,
            quietHoursEnabled: baseSettings.quietHoursEnabled,
            quietFrom: baseSettings.quietFrom,
            quietTo: baseSettings.quietTo,
          },
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'subscribe_failed')
      }

      const next = { ...baseSettings, enabled: true, status: 'granted', subscriptionActive: true }
      await persist(next)
      setStatusText('Устройство подписано на push-уведомления.')
    } catch (err) {
      console.error(err)
      setStatusText('Не удалось подписать устройство на push-уведомления.')
    } finally {
      setBusy(false)
    }
  }

  async function unsubscribeDevice() {
    try {
      setBusy(true)
      const registration = await navigator.serviceWorker.getRegistration('/sw.js')
      const subscription = await registration?.pushManager?.getSubscription?.()
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint, authUserId: user?.id || null, deviceId }),
        })
        await subscription.unsubscribe()
      }
      const next = { ...settings, enabled: false, subscriptionActive: false }
      await persist(next)
      setStatusText('Подписка на push-уведомления отключена.')
    } catch (err) {
      console.error(err)
      setStatusText('Не удалось отключить push-подписку.')
    } finally {
      setBusy(false)
    }
  }

  async function sendTestPush() {
    try {
      setBusy(true)
      const res = await fetch('/api/push/send-test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ authUserId: user?.id || null, deviceId }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'send_test_failed')
      setStatusText('Тестовое push-уведомление отправлено.')
    } catch (err) {
      console.error(err)
      setStatusText('Не удалось отправить тестовое уведомление.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', paddingBottom: 'calc(110px + env(safe-area-inset-bottom))', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px 16px' }}>
        <button onClick={() => navigate(-1)} aria-label="Назад" style={{ width: 44, height: 44, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
        <div style={{ fontFamily: fontDisplay, fontSize: 28, letterSpacing: 1, color: '#fff' }}>Уведомления</div>
        <div style={{ width: 44 }} />
      </div>

      <div style={{ padding: '0 22px 18px' }}>
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ fontFamily: fontBody, fontSize: 14, lineHeight: 1.55, color: 'rgba(255,255,255,0.72)' }}>
            В v1 оставляем только полезные push-уведомления: системные, по избранному, по наличию, по акциям и еженедельную сводку. Без навязчивого мусора, потому что люди и так живут под артобстрелом уведомлений.
          </div>
        </div>
      </div>

      <Section title="Статус">
        <Row label="Push-уведомления" description={`Доступ: ${permissionLabel}`} right={<Toggle checked={settings.enabled} disabled={busy || !settings.pushSupported} onChange={(checked) => checked ? requestPermission() : unsubscribeDevice()} />} />
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 18px' }} />
        <Row label="Подписка устройства" description={settings.subscriptionActive ? 'Устройство подписано и готово получать push.' : 'Подписка ещё не создана.'} right={<span style={{ fontFamily: fontBody, fontSize: 12, color: settings.subscriptionActive ? '#86EFAC' : 'rgba(255,255,255,0.45)' }}>{settings.subscriptionActive ? 'Активна' : 'Нет'}</span>} />
        {statusText ? (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 18px' }} />
            <div style={{ padding: '12px 18px', fontFamily: fontBody, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{statusText}</div>
          </>
        ) : null}
      </Section>

      <Section title="Типы уведомлений">
        <Row label="Системные" description="Критичные сервисные и продуктовые сообщения." right={<Toggle checked={settings.system} onChange={(value) => updatePartial({ system: value })} />} />
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 18px' }} />
        <Row label="По избранному" description="Изменения по вашим сохранённым товарам." right={<Toggle checked={settings.favorites} onChange={(value) => updatePartial({ favorites: value })} />} />
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 18px' }} />
        <Row label="Появилось в наличии" description="Когда нужный товар снова доступен." right={<Toggle checked={settings.restock} onChange={(value) => updatePartial({ restock: value })} />} />
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 18px' }} />
        <Row label="Акции и скидки" description="Только по магазинам и товарам, где это действительно полезно." right={<Toggle checked={settings.promo} onChange={(value) => updatePartial({ promo: value })} />} />
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 18px' }} />
        <Row label="Еженедельная сводка" description="Короткий weekly digest без мусора." right={<Toggle checked={settings.weekly} onChange={(value) => updatePartial({ weekly: value })} />} />
      </Section>

      <Section title="Тихие часы">
        <Row label="Включить тихие часы" description="В это время push не отправляются, кроме системных." right={<Toggle checked={settings.quietHoursEnabled} onChange={(value) => updatePartial({ quietHoursEnabled: value })} />} />
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 18px' }} />
        <div style={{ display: 'flex', gap: 12, padding: '15px 18px' }}>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontFamily: fontBody, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
            С
            <input type="time" value={settings.quietFrom} onChange={(e) => updatePartial({ quietFrom: e.target.value })} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px', color: '#fff', fontFamily: fontBody }} />
          </label>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontFamily: fontBody, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
            До
            <input type="time" value={settings.quietTo} onChange={(e) => updatePartial({ quietTo: e.target.value })} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px', color: '#fff', fontFamily: fontBody }} />
          </label>
        </div>
      </Section>

      <Section title="Отладка">
        <Row label="Отправить тестовое уведомление" description="Серверный тест для этого устройства." right={<button onClick={sendTestPush} disabled={busy || !settings.subscriptionActive} style={{ border: 'none', background: 'linear-gradient(135deg,#7C3AED,#EC4899)', color: '#fff', padding: '10px 14px', borderRadius: 12, fontFamily: fontBody, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy || !settings.subscriptionActive ? 0.55 : 1 }}>Тест</button>} />
      </Section>
    </div>
  )
}
