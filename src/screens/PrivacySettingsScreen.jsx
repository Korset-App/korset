import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { clearLocalScanHistory, buildHistoryOwnerKey, getLocalScanHistoryCount } from '../utils/localHistory.js'
import { DEFAULT_PRIVACY_SETTINGS, loadPrivacySettings, notifyPrivacyChanged } from '../utils/privacySettings.js'

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
        background: checked ? 'linear-gradient(135deg,#7C3AED,#8B5CF6)' : 'rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        padding: 3,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: checked ? '0 0 20px rgba(139,92,246,0.35)' : 'none' }} />
    </button>
  )
}

function ActionButton({ label, danger = false, onClick, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: '100%',
        border: 'none',
        borderRadius: 14,
        padding: '14px 16px',
        background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(124,58,237,0.14)',
        color: danger ? '#FCA5A5' : '#DDD6FE',
        fontFamily: fontBody,
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  )
}

export default function PrivacySettingsScreen() {
  const navigate = useNavigate()
  useParams()
  const { profile, updateProfile } = useProfile()
  const { user, internalUserId } = useAuth()
  const { clearRememberedStore } = useStore()
  const [busy, setBusy] = useState(false)
  const [statusText, setStatusText] = useState('')

  const privacy = useMemo(() => ({
    ...DEFAULT_PRIVACY_SETTINGS,
    ...loadPrivacySettings(),
    ...(profile?.privacy || {}),
  }), [profile])

  const localHistoryCount = useMemo(() => getLocalScanHistoryCount(buildHistoryOwnerKey(user)), [user, profile])

  async function updatePrivacy(patch) {
    const next = { ...privacy, ...patch }
    await updateProfile({ privacy: next })
    notifyPrivacyChanged()
    setStatusText('Настройки приватности сохранены.')
  }

  async function handleLocalHistoryToggle(value) {
    if (!value) {
      const ok = window.confirm('Отключить локальную историю и удалить уже сохранённые сканы на этом устройстве?')
      if (!ok) return
      clearLocalScanHistory(buildHistoryOwnerKey(user))
    }
    await updatePrivacy({ localHistoryEnabled: value })
  }

  async function handleRememberStoreToggle(value) {
    if (!value) {
      clearRememberedStore()
    }
    await updatePrivacy({ rememberStoreEnabled: value })
  }

  async function clearDeviceHistory() {
    const ok = window.confirm('Удалить всю локальную историю сканов на этом устройстве?')
    if (!ok) return
    clearLocalScanHistory(buildHistoryOwnerKey(user))
    setStatusText('Локальная история на устройстве очищена.')
  }

  async function clearCloudHistory() {
    if (!user || !internalUserId) {
      setStatusText('Войдите в аккаунт, чтобы управлять облачной историей.')
      return
    }
    const ok = window.confirm('Удалить облачную историю сканов из аккаунта Körset? Это действие необратимо.')
    if (!ok) return
    try {
      setBusy(true)
      const { error } = await supabase.from('scan_events').delete().eq('user_id', internalUserId)
      if (error) throw error
      window.dispatchEvent(new CustomEvent('korset:scan_added'))
      setStatusText('Облачная история удалена.')
    } catch (error) {
      console.error(error)
      setStatusText('Не удалось удалить облачную историю. Проверь доступы и RLS.')
    } finally {
      setBusy(false)
    }
  }

  async function resetPrivacySettings() {
    const ok = window.confirm('Сбросить настройки приватности к рекомендуемым значениям?')
    if (!ok) return
    await updateProfile({ privacy: { ...DEFAULT_PRIVACY_SETTINGS } })
    notifyPrivacyChanged()
    setStatusText('Настройки приватности сброшены к значениям по умолчанию.')
  }

  return (
    <div className="screen" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', paddingBottom: 'calc(110px + env(safe-area-inset-bottom))', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px 16px' }}>
        <button onClick={() => navigate(-1)} style={{ width: 42, height: 42, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>←</button>
        <div style={{ fontFamily: fontDisplay, fontSize: 28, letterSpacing: 1, color: '#fff' }}>Приватность</div>
        <button onClick={() => navigate('/profile')} style={{ width: 42, height: 42, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>×</button>
      </div>

      <div style={{ padding: '0 22px 18px' }}>
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ fontFamily: fontBody, fontSize: 14, lineHeight: 1.55, color: 'rgba(255,255,255,0.72)' }}>
            Здесь ты контролируешь, что Körset хранит на устройстве, что синхронизирует с аккаунтом и можно ли использовать данные для персонализации. Без лишней драмы и тумана, который любят писать в политиках конфиденциальности.
          </div>
        </div>
      </div>

      <Section title="Персонализация и аналитика">
        <Row
          label="Персонализированные рекомендации"
          description="Использовать историю сканов, избранное и предпочтения для более точных подсказок и AI-ответов."
          right={<Toggle checked={privacy.personalizationEnabled} onChange={(value) => updatePrivacy({ personalizationEnabled: value })} />}
        />
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 18px' }} />
        <Row
          label="Анонимная аналитика"
          description="Разрешить отправку событий сканирования для улучшения качества сервиса и аналитики магазина."
          right={<Toggle checked={privacy.analyticsEnabled} onChange={(value) => updatePrivacy({ analyticsEnabled: value })} />}
        />
      </Section>

      <Section title="Это устройство">
        <Row
          label="Локальная история сканов"
          description={`Хранить историю на этом устройстве для быстрого доступа. Сейчас записей: ${localHistoryCount}.`}
          right={<Toggle checked={privacy.localHistoryEnabled} onChange={handleLocalHistoryToggle} />}
        />
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 18px' }} />
        <Row
          label="Запоминать выбранный магазин"
          description="Сохранять последний магазин на этом устройстве, чтобы не выбирать его заново при следующем заходе."
          right={<Toggle checked={privacy.rememberStoreEnabled} onChange={handleRememberStoreToggle} />}
        />
      </Section>

      <Section title="Управление данными">
        <div style={{ padding: 18, display: 'grid', gap: 10 }}>
          <ActionButton label="Очистить историю на этом устройстве" onClick={clearDeviceHistory} />
          <ActionButton label="Удалить облачную историю аккаунта" danger onClick={clearCloudHistory} disabled={!user || busy} />
          <ActionButton label="Сбросить настройки приватности" onClick={resetPrivacySettings} disabled={busy} />
        </div>
      </Section>

      <Section title="Что это значит на практике">
        <Row label="Если отключить анонимную аналитику" description="Körset перестанет отправлять серверные события сканирования для аналитики. Локальная история на устройстве при этом может остаться включённой." right={null} />
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 18px' }} />
        <Row label="Если отключить локальную историю" description="Новые сканы не будут сохраняться в памяти этого устройства, а уже сохранённые локальные записи будут удалены после подтверждения." right={null} />
      </Section>

      {statusText ? (
        <div style={{ padding: '0 22px 24px' }}>
          <div className="glass-card" style={{ padding: '14px 16px', fontFamily: fontBody, fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.68)' }}>
            {statusText}
          </div>
        </div>
      ) : null}
    </div>
  )
}
