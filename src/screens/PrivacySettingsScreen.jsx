import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useI18n } from '../i18n/index.js'
import Toggle from '../components/Toggle.jsx'
import {
  clearLocalScanHistory,
  buildHistoryOwnerKey,
  readLocalScanHistory,
} from '../utils/localHistory.js'
import {
  DEFAULT_PRIVACY_SETTINGS,
  loadPrivacySettings,
  notifyPrivacyChanged,
} from '../utils/privacySettings.js'

function Section({ title, children }) {
  return (
    <div style={{ padding: '0 22px 18px' }}>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-disabled)',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
        }}
      >
        {title}
      </div>
      <div className="glass-card" style={{ padding: 0 }}>
        {children}
      </div>
    </div>
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
        color: danger ? '#FCA5A5' : 'var(--primary-bright)',
        fontFamily: 'var(--font-body)',
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
  const { profile, updateProfile } = useProfile()
  const { user, internalUserId } = useAuth()
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [statusText, setStatusText] = useState('')

  const privacy = useMemo(
    () => ({
      ...DEFAULT_PRIVACY_SETTINGS,
      ...loadPrivacySettings(),
      ...(profile?.privacy || {}),
    }),
    [profile]
  )

  const localHistoryCount = useMemo(() => {
    return readLocalScanHistory(buildHistoryOwnerKey(user)).length
  }, [user, profile])

  async function updatePrivacy(patch) {
    const next = { ...privacy, ...patch }
    await updateProfile({ privacy: next })
    notifyPrivacyChanged()
    setStatusText(t('privacy.saved'))
    setTimeout(() => setStatusText(''), 3000)
  }

  async function clearDeviceHistory() {
    const ok = window.confirm(t('privacy.confirmClearDevice'))
    if (!ok) return
    clearLocalScanHistory(buildHistoryOwnerKey(user))
    window.dispatchEvent(new CustomEvent('korset:scan_added'))
    setStatusText(t('privacy.deviceHistoryCleared'))
    setTimeout(() => setStatusText(''), 3000)
  }

  async function clearCloudHistory() {
    if (!user || !internalUserId) {
      setStatusText(t('privacy.loginForCloud'))
      setTimeout(() => setStatusText(''), 3000)
      return
    }
    const ok = window.confirm(t('privacy.confirmClearCloud'))
    if (!ok) return
    try {
      setBusy(true)
      const { error } = await supabase.from('scan_events').delete().eq('user_id', internalUserId)
      if (error) throw error
      window.dispatchEvent(new CustomEvent('korset:scan_added'))
      setStatusText(t('privacy.cloudHistoryDeleted'))
      setTimeout(() => setStatusText(''), 3000)
    } catch (error) {
      console.error(error)
      setStatusText(t('privacy.cloudDeleteFailed'))
      setTimeout(() => setStatusText(''), 3000)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="screen"
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'calc(110px + env(safe-area-inset-bottom))',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px 16px' }}>
        <button
          onClick={() => navigate(-1)}
          aria-label={t('common.back')}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            border: '1px solid var(--glass-soft-border)',
            background: 'var(--glass-muted)',
            color: 'var(--text)',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            letterSpacing: 1,
            color: 'var(--text)',
          }}
        >
          {t('privacy.title')}
        </div>
      </div>

      <div style={{ padding: '0 22px 18px' }}>
        <div className="glass-card" style={{ padding: 18 }}>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              lineHeight: 1.55,
              color: 'var(--text-soft)',
            }}
          >
            {t('privacy.intro')}
          </div>
        </div>
      </div>

      <Section title={t('privacy.sectionScanData')}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '15px 18px',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              {t('privacy.scanDataToggle')}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                lineHeight: 1.45,
                color: 'var(--text-faint)',
                marginTop: 4,
              }}
            >
              {t('privacy.scanDataToggleDesc')}
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <Toggle
              checked={privacy.analyticsEnabled}
              onChange={(value) => updatePrivacy({ analyticsEnabled: value })}
            />
          </div>
        </div>
      </Section>

      <Section title={t('privacy.sectionDataManagement')}>
        <div style={{ padding: 18, display: 'grid', gap: 10 }}>
          <div>
            <ActionButton label={t('privacy.clearDeviceHistory')} onClick={clearDeviceHistory} />
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                lineHeight: 1.45,
                color: 'var(--text-faint)',
                marginTop: 6,
                padding: '0 2px',
              }}
            >
              {t('privacy.clearDeviceHistoryDesc', { count: localHistoryCount })}
            </div>
          </div>
          <div>
            <ActionButton
              label={t('privacy.clearCloudHistory')}
              danger
              onClick={clearCloudHistory}
              disabled={!user || busy}
            />
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                lineHeight: 1.45,
                color: 'var(--text-faint)',
                marginTop: 6,
                padding: '0 2px',
              }}
            >
              {t('privacy.clearCloudHistoryDesc')}
            </div>
          </div>
        </div>
      </Section>

      <Section title={t('privacy.sectionWhatWeCollect')}>
        <div style={{ padding: '15px 18px' }}>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              lineHeight: 1.6,
              color: 'var(--text-soft)',
            }}
          >
            <div style={{ marginBottom: 8 }}>{t('privacy.whatWeCollectIntro')}</div>
            <div style={{ display: 'grid', gap: 4 }}>
              <span style={{ color: 'var(--text-faint)' }}>
                <span style={{ color: 'var(--primary-bright)', marginRight: 6 }}>&#8226;</span>
                {t('privacy.dataPointBarcode')}
              </span>
              <span style={{ color: 'var(--text-faint)' }}>
                <span style={{ color: 'var(--primary-bright)', marginRight: 6 }}>&#8226;</span>
                {t('privacy.dataPointResult')}
              </span>
              <span style={{ color: 'var(--text-faint)' }}>
                <span style={{ color: 'var(--primary-bright)', marginRight: 6 }}>&#8226;</span>
                {t('privacy.dataPointTime')}
              </span>
            </div>
            <div style={{ marginTop: 8, color: 'var(--text-disabled)', fontStyle: 'italic' }}>
              {t('privacy.whatWeDontCollect')}
            </div>
          </div>
        </div>
      </Section>

      <div style={{ padding: '0 22px 24px' }}>
        <button
          onClick={() => navigate('/privacy-policy')}
          style={{
            width: '100%',
            border: '1px solid var(--glass-soft-border)',
            borderRadius: 14,
            padding: '14px 18px',
            background: 'var(--glass-muted)',
            color: 'var(--text-soft)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{t('privacy.policyLink')}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {statusText ? (
        <div style={{ padding: '0 22px 24px' }}>
          <div
            className="glass-card"
            style={{
              padding: '14px 16px',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--text-soft)',
            }}
          >
            {statusText}
          </div>
        </div>
      ) : null}
    </div>
  )
}
