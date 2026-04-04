import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useI18n } from '../utils/i18n.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { buildProfilePath } from '../utils/routes.js'
import { normalizeNotificationSettings } from '../utils/notificationSettings.js'

function ArrowLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function BellIcon({ active = false }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : 'rgba(255,255,255,0.72)'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  )
}

function SmallInfo({ children }) {
  return <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: 12.5, lineHeight: 1.45 }}>{children}</div>
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', fontWeight: 700, marginBottom: 10 }}>{children}</div>
}

function Card({ children, style }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.045)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 22,
        backdropFilter: 'blur(26px)',
        WebkitBackdropFilter: 'blur(26px)',
        padding: 18,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function ToggleRow({ title, subtitle, checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: '100%',
        border: 'none',
        background: 'transparent',
        color: 'inherit',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.52 : 1,
      }}
    >
      <div style={{ textAlign: 'left' }}>
        <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{title}</div>
        {subtitle ? <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: 12.5, marginTop: 3, lineHeight: 1.45 }}>{subtitle}</div> : null}
      </div>
      <span
        aria-hidden
        style={{
          width: 48,
          height: 28,
          borderRadius: 999,
          position: 'relative',
          flexShrink: 0,
          background: checked ? 'linear-gradient(135deg,#7C3AED,#D946EF)' : 'rgba(255,255,255,0.10)',
          border: `1px solid ${checked ? 'rgba(217,70,239,0.4)' : 'rgba(255,255,255,0.12)'}`,
          transition: 'all .18s ease',
          boxShadow: checked ? '0 8px 24px rgba(124,58,237,0.25)' : 'none',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 23 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left .18s ease',
          }}
        />
      </span>
    </button>
  )
}

function TimeField({ label, value, onChange, disabled = false }) {
  return (
    <label style={{ display: 'grid', gap: 8, flex: 1 }}>
      <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.52)' }}>{label}</span>
      <input
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          minHeight: 48,
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.04)',
          color: '#fff',
          padding: '0 14px',
          outline: 'none',
          fontSize: 14,
        }}
      />
    </label>
  )
}

export default function NotificationSettingsScreen() {
  const navigate = useNavigate()
  const { lang } = useI18n()
  const { currentStore } = useStore()
  const { user } = useAuth()
  const { profile, updateProfile } = useProfile()
  const [permission, setPermission] = useState('unsupported')
  const [busy, setBusy] = useState(false)
  const settings = useMemo(() => normalizeNotificationSettings(profile.notifications), [profile.notifications])

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(window.Notification.permission)
    } else {
      setPermission('unsupported')
    }
  }, [])

  const copy = useMemo(() => ({
    ru: {
      title: 'Уведомления',
      subtitle: 'Управляйте push-уведомлениями и тем, что Körset может присылать вам на устройство.',
      browser: 'Доступ к уведомлениям',
      browserGranted: 'Уведомления разрешены. Körset может отправлять push и тестовые уведомления в браузер.',
      browserDefault: 'Разрешите уведомления, чтобы получать оповещения о сканах, избранном и обновлениях магазина.',
      browserDenied: 'Уведомления запрещены в браузере. Их можно включить в настройках сайта на устройстве.',
      browserUnsupported: 'Этот браузер сейчас не даёт использовать web-уведомления для Körset.',
      enableBrowser: 'Разрешить уведомления',
      testNotification: 'Отправить тестовое уведомление',
      master: 'Включить уведомления',
      masterSub: 'Главный переключатель для всех оповещений Körset.',
      push: 'Push-уведомления',
      pushSub: 'Показывать системные уведомления браузера.',
      scan: 'Результаты сканирования',
      scanSub: 'Напоминания и важные итоги по недавним сканам.',
      favorites: 'Избранное и важные товары',
      favoritesSub: 'Изменения по товарам, которые вы сохранили.',
      promos: 'Акции и предложения магазина',
      promosSub: 'Скидки, подборки и новости текущего магазина.',
      restock: 'Появление альтернатив и наличия',
      restockSub: 'Когда подходящий товар снова появился или нашлась альтернатива.',
      weekly: 'Еженедельная сводка',
      weeklySub: 'Короткий дайджест по активности и новым возможностям.',
      email: 'Короткий дайджест на email',
      emailSub: user?.email ? `Отправлять сводку на ${user.email}` : 'Доступно после входа в аккаунт.',
      system: 'Системные сообщения',
      systemSub: 'Важные обновления Körset и изменения в работе приложения.',
      quiet: 'Тихие часы',
      quietSub: 'Не беспокоить в выбранный интервал времени.',
      from: 'С',
      to: 'До',
      statusGranted: 'Разрешено',
      statusDefault: 'Не запрошено',
      statusDenied: 'Запрещено',
      statusUnsupported: 'Недоступно',
      saved: 'Настройки сохраняются автоматически.',
      toast: 'Тестовое уведомление отправлено.',
    },
    kz: {
      title: 'Хабарландырулар',
      subtitle: 'Push-хабарламаларды және Körset құрылғыңызға не жібере алатынын басқарыңыз.',
      browser: 'Хабарландыруға рұқсат',
      browserGranted: 'Хабарламаларға рұқсат берілген. Körset браузер арқылы хабарлама жібере алады.',
      browserDefault: 'Скан, таңдаулылар және дүкен жаңартулары туралы хабар алу үшін рұқсат беріңіз.',
      browserDenied: 'Браузер хабарламаларға тыйым салған. Оны сайт баптауларынан қосуға болады.',
      browserUnsupported: 'Бұл браузер қазір Körset web-хабарламаларын қолдамайды.',
      enableBrowser: 'Хабарламаларды қосу',
      testNotification: 'Сынақ хабарламасын жіберу',
      master: 'Хабарландыруларды қосу',
      masterSub: 'Körset хабарламаларының негізгі тетігі.',
      push: 'Push-хабарламалар',
      pushSub: 'Браузердің жүйелік хабарламаларын көрсету.',
      scan: 'Скан нәтижелері',
      scanSub: 'Жақында скандалған тауарлар бойынша маңызды ескертпелер.',
      favorites: 'Таңдаулылар мен маңызды тауарлар',
      favoritesSub: 'Сақталған тауарлар бойынша өзгерістер.',
      promos: 'Дүкен акциялары мен ұсыныстары',
      promosSub: 'Ағымдағы дүкеннің жеңілдіктері мен жаңалықтары.',
      restock: 'Балама және қолжетімділік',
      restockSub: 'Қайта пайда болған тауарлар және жаңа баламалар.',
      weekly: 'Апталық шолу',
      weeklySub: 'Белсенділік пен жаңа мүмкіндіктер туралы қысқа шолу.',
      email: 'Email-ге қысқа дайджест',
      emailSub: user?.email ? `${user.email} поштасына қысқа шолу жіберу` : 'Аккаунтқа кіргеннен кейін қолжетімді.',
      system: 'Жүйелік хабарламалар',
      systemSub: 'Körset жұмысына қатысты маңызды жаңартулар.',
      quiet: 'Тыныш уақыт',
      quietSub: 'Таңдалған уақытта мазаламау.',
      from: 'Басы',
      to: 'Соңы',
      statusGranted: 'Рұқсат бар',
      statusDefault: 'Сұралмаған',
      statusDenied: 'Тыйым салынған',
      statusUnsupported: 'Қолжетімсіз',
      saved: 'Баптаулар автоматты түрде сақталады.',
      toast: 'Сынақ хабарламасы жіберілді.',
    }
  })[lang] || null, [lang, user?.email])

  const saveNotifications = async (patch) => {
    const next = normalizeNotificationSettings({ ...settings, ...patch })
    await updateProfile({ notifications: next })
  }

  const requestPermission = async () => {
    if (!(typeof window !== 'undefined' && 'Notification' in window)) return
    setBusy(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        await saveNotifications({ pushEnabled: true, enabled: true })
      }
    } finally {
      setBusy(false)
    }
  }

  const sendTestNotification = async () => {
    if (!(typeof window !== 'undefined' && 'Notification' in window) || Notification.permission !== 'granted') return
    const body = lang === 'kz'
      ? 'Бұл Körset жүйесінен сынақ хабарламасы. Енді хабарландырулар жұмыс істеп тұр.'
      : 'Это тестовое уведомление от Körset. Теперь уведомления включены и работают.'
    const notification = new Notification(copy.title, { body, icon: '/favicon.png', badge: '/favicon.png', tag: 'korset-test' })
    setTimeout(() => notification.close(), 5000)
  }

  const permissionLabel = {
    granted: copy.statusGranted,
    default: copy.statusDefault,
    denied: copy.statusDenied,
    unsupported: copy.statusUnsupported,
  }[permission]

  const permissionText = {
    granted: copy.browserGranted,
    default: copy.browserDefault,
    denied: copy.browserDenied,
    unsupported: copy.browserUnsupported,
  }[permission]

  const permissionTone = {
    granted: { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.22)', text: '#34D399' },
    default: { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.22)', text: '#FBBF24' },
    denied: { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.22)', text: '#F87171' },
    unsupported: { bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)', text: '#CBD5E1' },
  }[permission]

  return (
    <div className="screen" style={{ minHeight: '100vh', overflowY: 'auto', paddingBottom: 120 }}>
      <div style={{ padding: '16px 20px 0' }}>
        <button
          type="button"
          onClick={() => navigate(buildProfilePath(currentStore?.slug || null))}
          style={{
            width: 46,
            height: 46,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeftIcon />
        </button>
      </div>

      <div style={{ padding: '22px 20px 18px' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, rgba(124,58,237,0.28), rgba(217,70,239,0.18))', border: '1px solid rgba(124,58,237,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 16px 40px rgba(124,58,237,0.18)' }}>
          <BellIcon active />
        </div>
        <h1 style={{ margin: 0, color: '#fff', fontSize: 30, lineHeight: 1.05, fontWeight: 800 }}>{copy.title}</h1>
        <div style={{ marginTop: 10, maxWidth: 520 }}>
          <SmallInfo>{copy.subtitle}</SmallInfo>
        </div>
      </div>

      <div style={{ padding: '0 20px 14px' }}>
        <Card>
          <SectionTitle>{copy.browser}</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{copy.push}</div>
            <div style={{ padding: '7px 10px', borderRadius: 999, border: `1px solid ${permissionTone.border}`, background: permissionTone.bg, color: permissionTone.text, fontSize: 12, fontWeight: 700 }}>{permissionLabel}</div>
          </div>
          <SmallInfo>{permissionText}</SmallInfo>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
            {permission !== 'granted' ? (
              <button
                type="button"
                onClick={requestPermission}
                disabled={busy || permission === 'unsupported' || permission === 'denied'}
                style={{
                  minHeight: 44,
                  padding: '0 16px',
                  borderRadius: 14,
                  border: '1px solid rgba(124,58,237,0.28)',
                  background: 'linear-gradient(135deg,#7C3AED,#D946EF)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: busy || permission === 'unsupported' || permission === 'denied' ? 'not-allowed' : 'pointer',
                  opacity: busy || permission === 'unsupported' || permission === 'denied' ? 0.5 : 1,
                }}
              >
                {copy.enableBrowser}
              </button>
            ) : null}
            <button
              type="button"
              onClick={sendTestNotification}
              disabled={permission !== 'granted'}
              style={{
                minHeight: 44,
                padding: '0 16px',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                color: '#fff',
                fontWeight: 700,
                cursor: permission !== 'granted' ? 'not-allowed' : 'pointer',
                opacity: permission !== 'granted' ? 0.52 : 1,
              }}
            >
              {copy.testNotification}
            </button>
          </div>
        </Card>
      </div>

      <div style={{ padding: '0 20px 14px' }}>
        <Card>
          <SectionTitle>{lang === 'kz' ? 'Негізгі параметрлер' : 'Основные настройки'}</SectionTitle>
          <ToggleRow title={copy.master} subtitle={copy.masterSub} checked={settings.enabled} onChange={(checked) => saveNotifications({ enabled: checked })} />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
          <ToggleRow title={copy.push} subtitle={copy.pushSub} checked={settings.pushEnabled && permission === 'granted'} disabled={!settings.enabled || permission !== 'granted'} onChange={(checked) => saveNotifications({ pushEnabled: checked })} />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
          <ToggleRow title={copy.system} subtitle={copy.systemSub} checked={settings.systemAlerts} disabled={!settings.enabled} onChange={(checked) => saveNotifications({ systemAlerts: checked })} />
        </Card>
      </div>

      <div style={{ padding: '0 20px 14px' }}>
        <Card>
          <SectionTitle>{lang === 'kz' ? 'Не жіберіледі' : 'Что присылать'}</SectionTitle>
          <ToggleRow title={copy.scan} subtitle={copy.scanSub} checked={settings.scanAlerts} disabled={!settings.enabled} onChange={(checked) => saveNotifications({ scanAlerts: checked })} />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
          <ToggleRow title={copy.favorites} subtitle={copy.favoritesSub} checked={settings.favoritesAlerts} disabled={!settings.enabled} onChange={(checked) => saveNotifications({ favoritesAlerts: checked })} />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
          <ToggleRow title={copy.promos} subtitle={copy.promosSub} checked={settings.promoAlerts} disabled={!settings.enabled} onChange={(checked) => saveNotifications({ promoAlerts: checked })} />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
          <ToggleRow title={copy.restock} subtitle={copy.restockSub} checked={settings.restockAlerts} disabled={!settings.enabled} onChange={(checked) => saveNotifications({ restockAlerts: checked })} />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
          <ToggleRow title={copy.weekly} subtitle={copy.weeklySub} checked={settings.weeklyDigest} disabled={!settings.enabled} onChange={(checked) => saveNotifications({ weeklyDigest: checked })} />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
          <ToggleRow title={copy.email} subtitle={copy.emailSub} checked={settings.emailDigest} disabled={!settings.enabled || !user} onChange={(checked) => saveNotifications({ emailDigest: checked })} />
        </Card>
      </div>

      <div style={{ padding: '0 20px 12px' }}>
        <Card>
          <SectionTitle>{copy.quiet}</SectionTitle>
          <ToggleRow title={copy.quiet} subtitle={copy.quietSub} checked={settings.quietHoursEnabled} disabled={!settings.enabled} onChange={(checked) => saveNotifications({ quietHoursEnabled: checked })} />
          <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
            <TimeField label={copy.from} value={settings.quietHoursStart} disabled={!settings.enabled || !settings.quietHoursEnabled} onChange={(value) => saveNotifications({ quietHoursStart: value })} />
            <TimeField label={copy.to} value={settings.quietHoursEnd} disabled={!settings.enabled || !settings.quietHoursEnabled} onChange={(value) => saveNotifications({ quietHoursEnd: value })} />
          </div>
        </Card>
      </div>

      <div style={{ padding: '0 20px' }}>
        <SmallInfo>{copy.saved}</SmallInfo>
      </div>
    </div>
  )
}
