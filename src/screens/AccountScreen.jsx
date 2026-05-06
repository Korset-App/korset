import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { useI18n } from '../i18n/index.js'
import GoogleLogo from '../components/GoogleLogo.jsx'
import { supabase } from '../utils/supabase.js'
import { buildProfilePath } from '../utils/routes.js'

function formatDate(iso, lang) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const opts = { day: 'numeric', month: 'long', year: 'numeric' }
  return d.toLocaleDateString(lang === 'kz' ? 'kk' : 'ru', opts)
}

function FieldRow({ label, value, monospace = false }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '14px 0',
        borderBottom: '1px solid var(--glass-soft-border)',
        gap: 16,
      }}
    >
      <span
        style={{
          fontSize: 14,
          color: 'var(--text-sub)',
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          color: 'var(--text)',
          fontWeight: 600,
          fontFamily: monospace ? 'monospace' : undefined,
          wordBreak: 'break-all',
          textAlign: 'right',
          maxWidth: '60%',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function ActionRow({ icon, label, danger = false, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--glass-soft-border)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: danger ? 'var(--error-bright)' : 'var(--text)',
        opacity: disabled ? 0.5 : 1,
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {icon}
        {label}
      </span>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  )
}

function InfoBox({ children, tone = 'default' }) {
  const tones = {
    default: {
      bg: 'var(--glass-bg)',
      border: 'var(--glass-border)',
      text: 'var(--text-sub)',
    },
    success: {
      bg: 'var(--success-dim)',
      border: 'var(--success-border)',
      text: 'var(--success-bright)',
    },
    warning: {
      bg: 'var(--error-dim)',
      border: 'var(--error-border)',
      text: 'var(--error-bright)',
    },
  }
  const t = tones[tone] || tones.default
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 12,
        background: t.bg,
        border: `1px solid ${t.border}`,
        fontSize: 13,
        color: t.text,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  )
}

export default function AccountScreen() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { currentStore } = useStore()
  const { lang, t } = useI18n()
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState('')

  useEffect(() => {
    if (!user) navigate('/auth', { replace: true })
  }, [user, navigate])

  if (!user) return null

  const email = user.email
  const createdAt = user.created_at || user.createdAt
  const identities = user.identities || []
  const providerNames = identities.map((id) => id.provider)
  const hasGoogle = providerNames.includes('google')
  const hasEmail = Boolean(email)
  const hasPhone = Boolean(user.phone)

  const isStoreOwner = currentStore?.owner_id === user.id

  const handleResetPassword = async () => {
    if (!email) return
    setResetLoading(true)
    setResetError('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      if (error) throw error
      setResetSent(true)
    } catch (err) {
      setResetError(err?.message || t('account.resetError') || t('common.error'))
    } finally {
      setResetLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate(buildProfilePath(currentStore?.slug || null), { replace: true })
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    setDeleteError('')
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('not_authenticated')

      const res = await fetch('/api/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.details || result.error)

      // Clear local state and redirect
      await logout()
      navigate('/', { replace: true })
      window.location.reload()
    } catch (err) {
      setDeleteError(err?.message || t('account.deleteError') || t('common.error'))
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleLinkGoogle = async () => {
    setLinkLoading(true)
    setLinkError('')
    try {
      const redirectTo = `${window.location.origin}/s/${currentStore?.slug || ''}/account`
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) throw error
    } catch (err) {
      setLinkError(err?.message || t('common.error'))
      setLinkLoading(false)
    }
  }

  const backTarget = buildProfilePath(currentStore?.slug || null)

  return (
    <div
      className="screen"
      style={{
        background: 'var(--bg-app)',
        minHeight: '100vh',
        paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
      }}
    >
      {/* Sticky Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--glass-strong)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--glass-border)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          onClick={() => navigate(backTarget)}
          aria-label={t('common.back')}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'var(--glass-muted)',
            border: '1px solid var(--glass-soft-border)',
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: 'center',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {t('account.title')}
        </div>
        <div style={{ width: 38 }} />
      </div>

      {/* Content */}
      <div style={{ padding: '20px 20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Account Info Card */}
        <div
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 24,
            padding: '20px 22px',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 8,
              paddingLeft: 4,
            }}
          >
            {t('account.sectionAccount')}
          </div>

          <FieldRow label={t('account.emailLabel')} value={email} />
          <FieldRow label={t('account.joinedLabel')} value={formatDate(createdAt, lang)} />
        </div>

        {/* Linked Auth Methods */}
        <div
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 24,
            padding: '20px 22px',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 12,
              paddingLeft: 4,
            }}
          >
            {t('auth.linkedMethods')}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {hasEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'var(--glass-muted)',
                    border: '1px solid var(--glass-soft-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text-sub)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 7l-10 6L2 7" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Email</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{email}</div>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--success-bright)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}

            {hasPhone && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--glass-soft-border)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'var(--glass-muted)',
                    border: '1px solid var(--glass-soft-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text-sub)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    WhatsApp
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{user.phone}</div>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--success-bright)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}

            {hasGoogle && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--glass-soft-border)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'var(--glass-muted)',
                    border: '1px solid var(--glass-soft-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GoogleLogo />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Google</div>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--success-bright)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </div>

          {!hasGoogle && (
            <button
              type="button"
              onClick={handleLinkGoogle}
              disabled={linkLoading}
              style={{
                width: '100%',
                marginTop: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: 'var(--glass-subtle)',
                border: '1px solid var(--glass-soft-border)',
                color: 'var(--text-sub)',
                padding: 12,
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'var(--font-display)',
                cursor: linkLoading ? 'default' : 'pointer',
                opacity: linkLoading ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <GoogleLogo size={16} />
              {linkLoading ? '...' : t('auth.linkGoogle')}
            </button>
          )}

          {linkError && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--error-bright)',
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              {linkError}
            </div>
          )}
        </div>

        {/* Store Status */}
        {isStoreOwner && currentStore && (
          <div
            style={{
              background: 'var(--success-dim)',
              border: '1px solid var(--success-border)',
              borderRadius: 24,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--success-bright)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M20 7l-8 10-5-5" />
            </svg>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success-bright)' }}>
                {t('account.storeOwnerTitle')}
              </div>
              <div
                style={{ fontSize: 12, color: 'var(--success-bright)', opacity: 0.8, marginTop: 2 }}
              >
                {currentStore.name || currentStore.slug}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 24,
            padding: '6px 22px 20px',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 4,
              marginTop: 14,
              paddingLeft: 4,
            }}
          >
            {t('account.sectionSecurity')}
          </div>

          <ActionRow
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--primary-bright)"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            }
            label={t('account.changePassword')}
            onClick={handleResetPassword}
            disabled={resetLoading || resetSent || !email}
          />

          {resetSent && <InfoBox tone="success">{t('account.resetSent')}</InfoBox>}
          {resetError && <InfoBox tone="warning">{resetError}</InfoBox>}

          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 4,
              marginTop: 14,
              paddingLeft: 4,
            }}
          >
            {t('account.sectionDanger')}
          </div>

          <ActionRow
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--error-bright)"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            }
            label={t('account.logout')}
            danger
            onClick={() => setShowLogoutConfirm(true)}
          />

          <ActionRow
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--error-bright)"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            }
            label={t('account.deleteAccount')}
            danger
            onClick={() => {
              setDeleteError('')
              setShowDeleteConfirm(true)
            }}
          />
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'var(--overlay-bg)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLogoutConfirm(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              width: '100%',
              maxWidth: 360,
              background: 'var(--bg-surface)',
              borderRadius: 20,
              border: '1px solid var(--glass-border)',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--text)',
                fontFamily: 'var(--font-display)',
                marginBottom: 8,
              }}
            >
              {t('account.logoutConfirmTitle')}
            </div>
            <div
              style={{
                fontSize: 14,
                color: 'var(--text-sub)',
                lineHeight: 1.5,
                marginBottom: 20,
              }}
            >
              {t('account.logoutConfirmBody')}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--glass-border)',
                  background: 'var(--glass-bg)',
                  color: 'var(--text)',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                  cursor: 'pointer',
                }}
              >
                {t('account.logoutCancel')}
              </button>
              <button
                onClick={handleLogout}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'var(--primary)',
                  color: 'var(--text-inverse)',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                  cursor: 'pointer',
                }}
              >
                {t('account.logoutConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 20px calc(80px + env(safe-area-inset-bottom))',
            background: 'var(--overlay-bg)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteConfirm(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              width: '100%',
              maxWidth: 420,
              background: 'var(--bg-surface)',
              borderRadius: 20,
              border: '1px solid var(--glass-border)',
              padding: '24px',
              maxHeight: 'calc(100vh - 120px)',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'var(--error-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--error-bright)"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text)',
                fontFamily: 'var(--font-display)',
                marginBottom: 8,
              }}
            >
              {t('account.deleteConfirmTitle')}
            </div>

            <div
              style={{
                fontSize: 14,
                color: 'var(--text-sub)',
                lineHeight: 1.5,
                marginBottom: 20,
              }}
            >
              {t('account.deleteConfirmBody')}
            </div>

            <div
              style={{
                fontSize: 13,
                color: 'var(--text-dim)',
                lineHeight: 1.5,
                marginBottom: 24,
                padding: '12px 14px',
                borderRadius: 12,
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
              }}
            >
              {t('account.deleteConfirmDetail')}
            </div>

            {deleteError && (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--error-bright)',
                  marginBottom: 16,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'var(--error-dim)',
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: '1px solid var(--glass-border)',
                  background: 'var(--glass-bg)',
                  color: 'var(--text)',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                  cursor: 'pointer',
                }}
              >
                {t('account.deleteCancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'var(--error)',
                  color: 'var(--text-inverse)',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                  cursor: 'pointer',
                  opacity: deleteLoading ? 0.6 : 1,
                }}
              >
                {deleteLoading ? t('account.deleteDeleting') : t('account.deleteConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
