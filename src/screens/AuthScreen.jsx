import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useI18n } from '../i18n/index.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { getReturnTo, normalizeReturnTo } from '../utils/authFlow.js'

const errKeys = {
  'Invalid login credentials': 'auth.errInvalidCredentials',
  'Email not confirmed': 'auth.errEmailNotConfirmed',
  'User already registered': 'auth.errAlreadyRegistered',
  'Password should be at least 6 characters': 'auth.errPwTooShort',
  signup_disabled: 'auth.errSignupDisabled',
  rate_limit: 'auth.errOtpRateLimit',
  'Email rate limit exceeded': 'auth.errOtpRateLimit',
  'SMS rate limit exceeded': 'auth.errOtpRateLimit',
}

function localizeError(msg, t) {
  if (!msg) return ''
  if (/already.*registered.*provider/i.test(msg)) return t('auth.errEmailDuplicate')
  for (const [key, i18nKey] of Object.entries(errKeys)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return t(i18nKey)
  }
  return t('auth.errorGeneral')
}

function validatePassword(pw) {
  return pw.length >= 8 && /[0-9]/.test(pw) && /[A-Za-z]/.test(pw)
}

function formatKzPhone(raw) {
  const d = raw.replace(/\D/g, '')
  if (d.length <= 1) return '+' + d
  if (d.length <= 4) return `+${d.slice(0, 1)} ${d.slice(1)}`
  if (d.length <= 7) return `+${d.slice(0, 1)} ${d.slice(1, 4)} ${d.slice(4)}`
  return `+${d.slice(0, 1)} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 11)}`
}

function normalizeKzPhone(raw) {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('8') && d.length === 11) return `+7${d.slice(1)}`
  if (d.startsWith('7') && d.length === 11) return `+${d}`
  if (d.startsWith('77') && d.length === 12) return `+${d}`
  if (d.startsWith('7') && d.length === 10) return `+7${d}`
  return null
}

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

const TABS = ['password', 'code', 'phone']

export default function AuthScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { lang, t } = useI18n()
  const { user } = useAuth()

  const [tab, setTab] = useState('password')
  const [mode, setMode] = useState('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [phoneRaw, setPhoneRaw] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpTarget, setOtpTarget] = useState(null)
  const [otpType, setOtpType] = useState(null)

  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [cooldown, setCooldown] = useState(0)
  const infoMessage = location.state?.message || null
  const returnTo = getReturnTo(location, '/')
  const [focusedField, setFocusedField] = useState(null)
  const otpRefs = useRef([])
  const cooldownRef = useRef(null)

  useEffect(() => {
    if (user) navigate(returnTo, { replace: true })
  }, [user, returnTo, navigate])

  useEffect(() => {
    if (cooldown <= 0) return
    cooldownRef.current = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(cooldownRef.current)
  }, [cooldown])

  const pwErrors =
    mode === 'register'
      ? [
          { ok: password.length >= 8, text: t('auth.pwMinLength') },
          { ok: /[0-9]/.test(password), text: t('auth.pwMinDigit') },
          { ok: /[A-Za-z]/.test(password), text: t('auth.pwMinLetter') },
        ]
      : []
  const pwOk = validatePassword(password)
  const pwMismatch = mode === 'register' && confirmPassword && password !== confirmPassword

  const canSubmitPassword = () => {
    if (mode === 'forgot') return email.trim().length > 3
    if (mode === 'register') return email && pwOk && confirmPassword && !pwMismatch
    return email && password
  }

  const canSendEmailOtp = email.trim().length > 3 && cooldown <= 0
  const phone = normalizeKzPhone(phoneRaw)
  const canSendPhoneOtp = phone && phone.length >= 12 && cooldown <= 0

  const handlePasswordAuth = async (e) => {
    e.preventDefault()
    if (!canSubmitPassword()) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setOtpTarget(email)
        setOtpType('signup')
        setOtp(['', '', '', '', '', ''])
        setMode('verify')
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`,
        })
        if (error) throw error
        setSuccess(t('auth.forgotSuccess'))
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate(returnTo, { replace: true })
      }
    } catch (err) {
      setError(localizeError(err.message, t))
    } finally {
      setLoading(false)
    }
  }

  const handleEmailOtp = async () => {
    if (!canSendEmailOtp) return
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
      })
      if (error) throw error
      setOtpTarget(email.trim())
      setOtpType('email')
      setOtp(['', '', '', '', '', ''])
      setCooldown(60)
      setSuccess(t('auth.emailOtpSent', { email: email.trim() }))
    } catch (err) {
      setError(localizeError(err.message, t))
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneOtp = async () => {
    if (!canSendPhoneOtp) return
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { channel: 'whatsapp', shouldCreateUser: true },
      })
      if (error) throw error
      setOtpTarget(phone)
      setOtpType('sms')
      setOtp(['', '', '', '', '', ''])
      setCooldown(60)
      setSuccess(t('auth.phoneOtpSent'))
    } catch (err) {
      setError(localizeError(err.message, t))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const token = otp.join('')
    if (token.length !== 6) return
    setLoading(true)
    setError(null)

    try {
      const payload = { token }
      if (otpType === 'email') {
        payload.email = otpTarget
        payload.type = 'email'
      } else if (otpType === 'sms') {
        payload.phone = otpTarget
        payload.type = 'sms'
      } else {
        payload.email = otpTarget
        payload.type = 'signup'
      }
      const { error } = await supabase.auth.verifyOtp(payload)
      if (error) throw error
      navigate(returnTo, { replace: true })
    } catch {
      setError(t('auth.otpError'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setGoogleLoading(true)
    setError(null)
    try {
      const redirectTo = `${window.location.origin}/auth?returnTo=${encodeURIComponent(returnTo)}`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) throw error
    } catch (err) {
      setError(localizeError(err.message, t))
      setGoogleLoading(false)
    }
  }

  const handleOtpChange = (index, val) => {
    if (/[^0-9]/.test(val)) return
    const newOtp = [...otp]
    newOtp[index] = val
    setOtp(newOtp)
    if (val && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setError(null)
    setSuccess(null)
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const switchTab = (newTab) => {
    setTab(newTab)
    setMode('login')
    setError(null)
    setSuccess(null)
    setOtp(['', '', '', '', '', ''])
    setOtpTarget(null)
    setOtpType(null)
    setCooldown(0)
  }

  const inputStyle = useCallback(
    (field) => ({
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
    }),
    [focusedField]
  )

  const phoneInputStyle = {
    background: 'var(--input-bg)',
    border: `1.5px solid ${focusedField === 'phone' ? 'var(--badge-border)' : 'var(--input-border)'}`,
    padding: '15px 16px',
    borderRadius: 14,
    color: 'var(--text)',
    fontSize: 16,
    fontFamily: 'var(--font-display)',
    width: '100%',
    outline: 'none',
    transition: 'border 0.2s',
    letterSpacing: 1,
  }

  const tabLabels = {
    password: t('auth.tabPassword'),
    code: t('auth.tabCode'),
    phone: t('auth.tabPhone'),
  }

  const titles = {
    login: { title: t('auth.loginTitle'), sub: t('auth.loginSub') },
    register: { title: t('auth.registerTitle'), sub: t('auth.registerSub') },
    verify: {
      title: t('auth.verifyTitle'),
      sub: t('auth.verifySub', { email: otpTarget || email }),
    },
    forgot: { title: t('auth.forgotTitle'), sub: t('auth.forgotSub') },
  }

  const otpTitles = {
    email: {
      title: t('auth.emailOtpVerifyTitle'),
      sub: t('auth.emailOtpVerifySub', { email: otpTarget }),
    },
    sms: {
      title: t('auth.phoneOtpVerifyTitle'),
      sub: t('auth.phoneOtpVerifySub', { phone: otpTarget }),
    },
    signup: titles.verify,
  }

  const currentTitle =
    mode === 'verify' && otpType ? otpTitles[otpType] || titles.verify : titles[mode]

  const isOtpVerifyMode = mode === 'verify' || (otpTarget && otp.join('').length < 6)

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
            onClick={() => {
              if (location.key !== 'default') navigate(-1)
              else navigate(normalizeReturnTo(returnTo, '/'), { replace: true })
            }}
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
              {currentTitle.title}
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
              {currentTitle.sub}
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
            {infoMessage && !error && !success && (
              <div
                style={{
                  background: 'var(--primary-dim)',
                  border: '1px solid var(--badge-border)',
                  color: 'var(--primary-bright)',
                  padding: '12px 16px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontFamily: 'var(--font-display)',
                  marginBottom: 18,
                  textAlign: 'center',
                  lineHeight: 1.45,
                }}
              >
                {infoMessage}
              </div>
            )}

            {error && (
              <div
                style={{
                  background: 'var(--error-dim)',
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
                  background: 'var(--success-dim)',
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

            {isOtpVerifyMode ? (
              <form
                onSubmit={handleVerifyOtp}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="auth-input"
                      style={{
                        width: 44,
                        height: 52,
                        textAlign: 'center',
                        fontSize: 22,
                        fontWeight: 700,
                        fontFamily: 'var(--font-display)',
                        background: 'var(--input-bg)',
                        border: '1.5px solid var(--badge-border)',
                        borderRadius: 12,
                        color: 'var(--text)',
                        outline: 'none',
                        transition: 'border 0.2s',
                      }}
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.join('').length < 6}
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
                    opacity: loading || otp.join('').length < 6 ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {loading ? '...' : t('auth.verifyBtn')}
                </button>
                {cooldown > 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: 13,
                      color: 'var(--text-disabled)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {t('auth.resendIn', { sec: cooldown })}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={otpType === 'sms' ? handlePhoneOtp : handleEmailOtp}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-bright)',
                      fontSize: 13,
                      fontFamily: 'var(--font-display)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      width: '100%',
                    }}
                  >
                    {t('auth.resendOtp')}
                  </button>
                )}
              </form>
            ) : mode === 'forgot' ? (
              <form
                onSubmit={handlePasswordAuth}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="auth-input"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    style={{ ...inputStyle('email'), padding: '15px 16px' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !canSubmitPassword()}
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
                    opacity: loading || !canSubmitPassword() ? 0.5 : 1,
                    marginTop: 4,
                  }}
                >
                  {loading ? '...' : t('auth.forgotSendBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-bright)',
                    fontSize: 13,
                    fontFamily: 'var(--font-display)',
                    cursor: 'pointer',
                    marginTop: 4,
                  }}
                >
                  {t('auth.forgotBackToLogin')}
                </button>
              </form>
            ) : (
              <>
                {mode !== 'verify' && mode !== 'forgot' && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 4,
                      background: 'var(--input-bg)',
                      borderRadius: 12,
                      padding: 4,
                      marginBottom: 18,
                    }}
                  >
                    {TABS.map((tabKey) => (
                      <button
                        key={tabKey}
                        type="button"
                        onClick={() => switchTab(tabKey)}
                        style={{
                          flex: 1,
                          padding: '10px 8px',
                          borderRadius: 10,
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 600,
                          fontFamily: 'var(--font-display)',
                          transition: 'all 0.2s',
                          background: tab === tabKey ? 'var(--primary)' : 'transparent',
                          color: tab === tabKey ? 'var(--text-inverse)' : 'var(--text-dim)',
                          boxShadow: tab === tabKey ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
                        }}
                      >
                        {tabLabels[tabKey]}
                      </button>
                    ))}
                  </div>
                )}

                {tab === 'password' && (
                  <form
                    onSubmit={handlePasswordAuth}
                    style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                  >
                    <div style={{ position: 'relative' }}>
                      <input
                        type="email"
                        className="auth-input"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        style={inputStyle('email')}
                      />
                    </div>

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

                    {mode === 'register' && password.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          padding: '0 2px',
                        }}
                      >
                        {pwErrors.map((rule, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: rule.ok ? 'var(--success-dim)' : 'var(--glass-bg)',
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

                    {mode === 'register' && (
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
                    )}

                    {mode === 'login' && (
                      <div style={{ textAlign: 'right', marginTop: -4 }}>
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-disabled)',
                            fontSize: 12,
                            fontFamily: 'var(--font-display)',
                            cursor: 'pointer',
                          }}
                        >
                          {t('auth.forgotPwLink')}
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !canSubmitPassword()}
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
                        opacity: loading || !canSubmitPassword() ? 0.5 : 1,
                        marginTop: 6,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      {loading
                        ? '...'
                        : mode === 'login'
                          ? t('auth.loginBtn')
                          : t('auth.registerBtn')}
                    </button>
                  </form>
                )}

                {tab === 'code' && !otpTarget && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="email"
                        className="auth-input"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        style={{ ...inputStyle('email'), padding: '15px 16px' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleEmailOtp}
                      disabled={loading || !canSendEmailOtp}
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
                        opacity: loading || !canSendEmailOtp ? 0.5 : 1,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      {loading ? '...' : t('auth.emailOtpSendBtn')}
                    </button>
                    {cooldown > 0 && (
                      <div
                        style={{
                          textAlign: 'center',
                          fontSize: 13,
                          color: 'var(--text-disabled)',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {t('auth.resendIn', { sec: cooldown })}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'phone' && !otpTarget && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <input
                        type="tel"
                        className="auth-input"
                        placeholder={t('auth.phonePlaceholder')}
                        value={formatKzPhone(phoneRaw)}
                        onChange={(e) => {
                          const d = e.target.value.replace(/\D/g, '')
                          if (d.length <= 11) setPhoneRaw(d)
                        }}
                        onFocus={() => setFocusedField('phone')}
                        onBlur={() => setFocusedField(null)}
                        style={phoneInputStyle}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handlePhoneOtp}
                      disabled={loading || !canSendPhoneOtp}
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
                        opacity: loading || !canSendPhoneOtp ? 0.5 : 1,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      {loading ? '...' : t('auth.phoneOtpSendBtn')}
                    </button>
                    {cooldown > 0 && (
                      <div
                        style={{
                          textAlign: 'center',
                          fontSize: 13,
                          color: 'var(--text-disabled)',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {t('auth.resendIn', { sec: cooldown })}
                      </div>
                    )}
                    <div
                      style={{
                        textAlign: 'center',
                        fontSize: 12,
                        color: 'var(--text-dim)',
                        fontFamily: 'var(--font-display)',
                        lineHeight: 1.4,
                      }}
                    >
                      {t('auth.phoneNoWhatsApp')}
                    </div>
                  </div>
                )}
              </>
            )}

            {!isOtpVerifyMode && mode !== 'forgot' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--line-soft)' }} />
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-disabled)',
                      fontFamily: 'var(--font-display)',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    {t('auth.or')}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--line-soft)' }} />
                </div>

                <button
                  onClick={handleGoogleAuth}
                  disabled={googleLoading}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text)',
                    padding: 14,
                    borderRadius: 14,
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: 'var(--font-display)',
                    cursor: googleLoading ? 'default' : 'pointer',
                    transition: 'background 0.15s',
                    opacity: googleLoading ? 0.6 : 1,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {googleLoading
                    ? '...'
                    : mode === 'login'
                      ? t('auth.googleLogin')
                      : t('auth.googleRegister')}
                </button>
              </>
            )}
          </div>

          {!isOtpVerifyMode && mode !== 'forgot' && tab === 'password' && (
            <div style={{ textAlign: 'center', marginTop: 28 }}>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-disabled)',
                  fontFamily: 'var(--font-display)',
                  margin: 0,
                }}
              >
                {mode === 'login' ? t('auth.noAccountYet') : t('auth.haveAccount')}
              </p>
              <button
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-bright)',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                  cursor: 'pointer',
                  marginTop: 6,
                }}
              >
                {mode === 'login' ? t('auth.switchToRegister') : t('auth.switchToLogin')}
              </button>
            </div>
          )}

          {mode === 'register' && (
            <div style={{ textAlign: 'center', marginTop: 20, padding: '0 10px' }}>
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--text-disabled)',
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1.5,
                }}
              >
                {lang === 'kz' ? (
                  <>
                    Тіркелу арқылы сіз{' '}
                    <span
                      onClick={() => navigate('/privacy-policy')}
                      style={{
                        color: 'var(--text-faint)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      Құпиялылық саясатымен
                    </span>{' '}
                    келісесіз
                  </>
                ) : (
                  <>
                    Регистрируясь, вы принимаете{' '}
                    <span
                      onClick={() => navigate('/privacy-policy')}
                      style={{
                        color: 'var(--text-faint)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      Политику конфиденциальности
                    </span>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
