import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useI18n } from '../i18n/index.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { getReturnTo } from '../utils/authFlow.js'

function EyeBtn({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        position: 'absolute',
        right: 14,
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        color: 'var(--text-disabled)',
        cursor: 'pointer',
        padding: 4,
        display: 'flex',
      }}
    >
      {show ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      )}
    </button>
  )
}

export default function UpdatePasswordScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const { user } = useAuth()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [tokenValid, setTokenValid] = useState(null)
  const [focusedField, setFocusedField] = useState(null)

  const returnTo = getReturnTo(location, '/')

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setTokenValid(true)
      } else {
        setTokenValid(false)
        setError(t('auth.updatePwExpired'))
      }
    }
    checkSession()
  }, [t])

  useEffect(() => {
    if (success && user) {
      const timer = setTimeout(() => {
        navigate(returnTo, { replace: true })
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [success, user, returnTo, navigate])

  const pwMismatch = confirmPassword.length > 0 && password !== confirmPassword

  const canSubmit =
    tokenValid &&
    password.length >= 8 &&
    /[0-9]/.test(password) &&
    /[A-Za-z]/.test(password) &&
    confirmPassword === password

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess(t('auth.updatePwSuccess'))
    } catch (err) {
      setError(
        err.message?.includes('expired') || err.message?.includes('invalid')
          ? t('auth.updatePwExpired')
          : t('auth.updatePwError')
      )
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (field) => ({
    background: 'var(--input-bg)',
    border: `1.5px solid ${focusedField === field ? 'var(--badge-border)' : 'var(--input-border)'}`,
    padding: '15px 48px 15px 16px',
    borderRadius: 14,
    color: 'var(--text)',
    fontSize: 14,
    fontFamily: 'var(--font-display)',
    width: '100%',
    outline: 'none',
    transition: 'border 0.2s',
    letterSpacing: 0.3,
  })

  return (
    <>
      <style>{`
        @keyframes floatA1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,-15px) scale(1.08)} }
        @keyframes floatA2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-18px,12px) scale(0.92)} }
        .auth-input::placeholder { color: var(--text-disabled) !important; }
        .auth-input:focus { border-color: var(--badge-border) !important; }
      `}</style>

      <div
        className="screen auth-screen"
        style={{
          background: 'var(--bg-app)',
          paddingTop: 0,
          paddingBottom: 'max(32px, env(safe-area-inset-bottom, 0px))',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflowX: 'hidden',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -60,
              left: -60,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(124,58,237,0.12)',
              filter: 'blur(70px)',
              animation: 'floatA1 8s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '40%',
              right: -40,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: 'rgba(236,72,153,0.08)',
              filter: 'blur(60px)',
              animation: 'floatA2 10s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 60,
              left: 40,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(52,211,153,0.06)',
              filter: 'blur(50px)',
              animation: 'floatA1 12s ease-in-out infinite',
            }}
          />
        </div>

        <div style={{ position: 'relative', zIndex: 10, padding: '0 20px' }}>
          <button
            onClick={() => navigate('/auth', { replace: true })}
            style={{
              position: 'absolute',
              top: 16,
              left: 20,
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-soft-border)',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: 64,
              paddingBottom: 24,
            }}
          >
            <img
              src="/icon_logo.svg"
              alt="Körset"
              style={{ width: 56, height: 56, marginBottom: 18, borderRadius: 16, flexShrink: 0 }}
            />
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(24px, 6vw, 28px)',
                fontWeight: 700,
                color: 'var(--text)',
                margin: 0,
                letterSpacing: 0.5,
                textAlign: 'center',
              }}
            >
              {t('auth.updatePwTitle')}
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                color: 'var(--text-faint)',
                marginTop: 8,
                textAlign: 'center',
                lineHeight: 1.4,
                maxWidth: 280,
              }}
            >
              {t('auth.updatePwSub')}
            </p>
          </div>
        </div>

        <div
          style={{
            padding: '0 22px 28px',
            position: 'relative',
            zIndex: 10,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
          }}
        >
          <div
            style={{
              background: 'var(--glass-subtle)',
              backdropFilter: 'blur(24px)',
              border: '1px solid var(--glass-soft-border)',
              borderRadius: 20,
              padding: '24px 20px',
              marginBottom: 20,
            }}
          >
            {error && (
              <div
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: 'var(--error-bright)',
                  padding: '12px 16px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontFamily: 'var(--font-display)',
                  marginBottom: 18,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  color: 'var(--success-bright)',
                  padding: '12px 16px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontFamily: 'var(--font-display)',
                  marginBottom: 18,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                {success}
              </div>
            )}

            {tokenValid === false && !loading && (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <button
                  type="button"
                  onClick={() => navigate('/auth', { replace: true })}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-bright)',
                    fontSize: 14,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('auth.forgotBackToLogin')}
                </button>
              </div>
            )}

            {tokenValid && (
              <form
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder={t('auth.pwPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    onFocus={() => setFocusedField('pw')}
                    onBlur={() => setFocusedField(null)}
                    style={inputStyle('pw')}
                  />
                  <EyeBtn show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                </div>

                {password.length > 0 && (
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 2px' }}
                  >
                    {[
                      {
                        ok: password.length >= 8,
                        text: t('auth.pwMinLength'),
                      },
                      {
                        ok: /[0-9]/.test(password),
                        text: t('auth.pwMinDigit'),
                      },
                      {
                        ok: /[A-Za-z]/.test(password),
                        text: t('auth.pwMinLetter'),
                      },
                    ].map((rule, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: rule.ok ? 'rgba(16,185,129,0.15)' : 'var(--glass-bg)',
                          }}
                        >
                          {rule.ok ? (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="var(--success-bright)"
                              strokeWidth="3"
                              strokeLinecap="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <div
                              style={{
                                width: 4,
                                height: 4,
                                borderRadius: '50%',
                                background: 'var(--text-disabled)',
                              }}
                            />
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontFamily: 'var(--font-display)',
                            color: rule.ok ? 'var(--success-bright)' : 'var(--text-disabled)',
                          }}
                        >
                          {rule.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder={t('auth.pwConfirmPlaceholder')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    onFocus={() => setFocusedField('cpw')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      ...inputStyle('cpw'),
                      borderColor: pwMismatch
                        ? 'rgba(239,68,68,0.5)'
                        : focusedField === 'cpw'
                          ? 'var(--badge-border)'
                          : 'var(--input-border)',
                    }}
                  />
                  <EyeBtn
                    show={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                  {pwMismatch && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--error-bright)',
                        marginTop: 4,
                        fontFamily: 'var(--font-display)',
                        paddingLeft: 2,
                      }}
                    >
                      {t('auth.pwMismatch')}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  style={{
                    background: 'var(--primary)',
                    color: 'var(--text-inverse)',
                    border: 'none',
                    padding: 16,
                    borderRadius: 14,
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: 'var(--font-display)',
                    cursor: 'pointer',
                    opacity: loading || !canSubmit ? 0.5 : 1,
                    marginTop: 6,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {loading ? '...' : t('auth.updatePwBtn')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
