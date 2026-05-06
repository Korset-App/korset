import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useI18n } from '../i18n/index.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { getReturnTo } from '../utils/authFlow.js'
import EyeBtn from '../components/EyeBtn.jsx'
import AuthBackground from '../components/AuthBackground.jsx'
import PasswordRules from '../components/PasswordRules.jsx'
import AuthAlert from '../components/AuthAlert.jsx'

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
  const [sameAsOld, setSameAsOld] = useState(false)

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
  }, [])

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
    confirmPassword === password &&
    !sameAsOld

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    setSameAsOld(false)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        if (/same password/i.test(updateError.message)) {
          setSameAsOld(true)
          setError(t('auth.errPwSameAsOld'))
        } else if (
          updateError.message?.includes('expired') ||
          updateError.message?.includes('invalid')
        ) {
          setError(t('auth.updatePwExpired'))
        } else {
          setError(t('auth.updatePwError'))
        }
        return
      }
      setSuccess(t('auth.updatePwSuccess'))
    } catch {
      setError(t('auth.updatePwError'))
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
        <AuthBackground />

        <div style={{ position: 'relative', zIndex: 10, padding: '0 20px' }}>
          <button
            onClick={() => navigate('/', { replace: true })}
            aria-label={t('auth.backAria')}
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
            {error && <AuthAlert type="error">{error}</AuthAlert>}

            {success && <AuthAlert type="success">{success}</AuthAlert>}

            {tokenValid === false && !loading && (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <button
                  type="button"
                  onClick={() => navigate('/', { replace: true })}
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
                    autoComplete="new-password"
                    aria-label={t('auth.pwPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    onFocus={() => setFocusedField('pw')}
                    onBlur={() => setFocusedField(null)}
                    style={inputStyle('pw')}
                  />
                  <EyeBtn
                    show={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                    t={t}
                  />
                </div>

                {password.length > 0 && <PasswordRules password={password} t={t} />}

                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="auth-input"
                    autoComplete="new-password"
                    aria-label={t('auth.pwConfirmPlaceholder')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    onFocus={() => setFocusedField('cpw')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      ...inputStyle('cpw'),
                      borderColor: pwMismatch
                        ? 'var(--error-border)'
                        : focusedField === 'cpw'
                          ? 'var(--badge-border)'
                          : 'var(--input-border)',
                    }}
                  />
                  <EyeBtn
                    show={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                    t={t}
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
                  {loading ? t('common.loading') : t('auth.updatePwBtn')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
