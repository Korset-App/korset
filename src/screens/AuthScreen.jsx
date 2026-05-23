import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useI18n } from '../i18n/index.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { getReturnTo, normalizeReturnTo } from '../utils/authFlow.js'
import { localizeError, validatePassword, isValidEmail } from '../utils/authHelpers.js'
import EyeBtn from '../components/EyeBtn.jsx'
import AuthBackground from '../components/AuthBackground.jsx'
import PasswordRules from '../components/PasswordRules.jsx'
import AuthAlert from '../components/AuthAlert.jsx'
import GoogleLogo from '../components/GoogleLogo.jsx'

const TABS = ['password', 'code']

export default function AuthScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { lang, t } = useI18n()
  const { user, loading: authLoading } = useAuth()

  const initialMode = searchParams.get('mode') === 'login' ? 'login' : 'register'
  const [tab, setTab] = useState('password')
  const [mode, setMode] = useState(initialMode)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpTarget, setOtpTarget] = useState(null)
  const [otpType, setOtpType] = useState(null)

  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [errorKey, setErrorKey] = useState(null)
  const [success, setSuccess] = useState(null)
  const [cooldown, setCooldown] = useState(0)
  const infoMessage = location.state?.message || null
  const returnTo = getReturnTo(location, '/')
  const [focusedField, setFocusedField] = useState(null)
  const emailInputRef = useRef(null)
  const otpRefs = useRef([])
  const cooldownRef = useRef(null)

  useEffect(() => {
    if (user) navigate(returnTo, { replace: true })
  }, [user, returnTo, navigate])

  useEffect(() => {
    if (!authLoading && !user) emailInputRef.current?.focus()
  }, [authLoading, user])

  useEffect(() => {
    if (cooldown <= 0) return
    cooldownRef.current = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(cooldownRef.current)
  }, [cooldown])

  const pwOk = validatePassword(password)
  const pwMismatch = mode === 'register' && confirmPassword && password !== confirmPassword

  const canSubmitPassword = () => {
    if (mode === 'forgot') return isValidEmail(email)
    if (mode === 'register') return isValidEmail(email) && pwOk && confirmPassword && !pwMismatch
    return isValidEmail(email) && password
  }

  const canSendEmailOtp = isValidEmail(email) && cooldown <= 0

  const handlePasswordAuth = async (e) => {
    e.preventDefault()
    if (!canSubmitPassword()) return
    setLoading(true)
    setError(null)
    setErrorKey(null)
    setSuccess(null)
    if (document.activeElement?.blur) document.activeElement.blur()

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
      const loc = localizeError(err.message, t)
      setError(loc.text)
      setErrorKey(loc.key)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailOtp = async () => {
    if (!canSendEmailOtp) return
    setLoading(true)
    setError(null)
    setErrorKey(null)
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
      const loc = localizeError(err.message, t)
      setError(loc.text)
      setErrorKey(loc.key)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e?.preventDefault()
    const token = otp.join('')
    if (token.length !== 6) return
    setLoading(true)
    setError(null)
    setErrorKey(null)

    try {
      const payload = { token }
      if (otpType === 'email') {
        payload.email = otpTarget
        payload.type = 'email'
      } else {
        payload.email = otpTarget
        payload.type = 'signup'
      }
      const { error } = await supabase.auth.verifyOtp(payload)
      if (error) throw error
      const isSignup = otpType === 'signup'
      navigate(isSignup ? '/setup-profile' : returnTo, { replace: true })
    } catch {
      setError(t('auth.otpError'))
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (loading || cooldown > 0) return
    setError(null)
    setErrorKey(null)
    if (otpType === 'email') {
      await handleEmailOtp()
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: otpTarget })
      if (error) throw error
      setCooldown(60)
      setSuccess(t('auth.emailOtpSent', { email: otpTarget }))
    } catch (err) {
      const loc = localizeError(err.message, t)
      setError(loc.text)
      setErrorKey(loc.key)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setGoogleLoading(true)
    setError(null)
    setErrorKey(null)
    const timeout = setTimeout(() => setGoogleLoading(false), 30000)
    try {
      const redirectTo = `${window.location.origin}/auth?returnTo=${encodeURIComponent(returnTo)}`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) throw error
    } catch (err) {
      const loc = localizeError(err.message, t)
      setError(loc.text)
      setErrorKey(loc.key)
      setGoogleLoading(false)
    } finally {
      clearTimeout(timeout)
    }
  }

  const handleOtpChange = (index, val) => {
    if (/[^0-9]/.test(val)) return
    const newOtp = [...otp]
    newOtp[index] = val
    setOtp(newOtp)
    if (success) setSuccess(null)
    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus()
    } else if (val && index === 5) {
      otpRefs.current[5]?.blur()
    }
  }

  const verifyOtpRef = useRef(null)

  useEffect(() => {
    verifyOtpRef.current = handleVerifyOtp
  })

  useEffect(() => {
    if (otp.join('').length === 6 && !loading) {
      verifyOtpRef.current?.()
    }
  }, [otp, loading])

  useEffect(() => {
    if (otpTarget && otpRefs.current[0]) {
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    }
  }, [otpTarget])

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '')
    if (!pasted || pasted.length < 6) return
    e.preventDefault()
    const digits = pasted.slice(0, 6).split('')
    setOtp(digits)
    otpRefs.current[5]?.focus()
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setError(null)
    setErrorKey(null)
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
    setErrorKey(null)
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

  const tabLabels = {
    password: t('auth.tabPassword'),
    code: t('auth.tabCode'),
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
    signup: titles.verify,
  }

  const currentTitle =
    mode === 'verify' && otpType ? otpTitles[otpType] || titles.verify : titles[mode]

  const isOtpVerifyMode = mode === 'verify' || Boolean(otpTarget)

  if (authLoading) {
    return (
      <div
        className="screen auth-screen"
        style={{
          background: 'var(--bg-app)',
          minHeight: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: '3px solid var(--glass-border)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'authSpin 0.8s linear infinite',
            }}
          />
        </div>
      </div>
    )
  }

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
            onClick={() => {
              if (location.key !== 'default') navigate(-1)
              else navigate(normalizeReturnTo(returnTo, '/'), { replace: true })
            }}
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
              <AuthAlert type="error">
                {error}
                {errorKey === 'auth.errEmailNotConfirmed' && email && (
                  <button
                    type="button"
                    onClick={async () => {
                      setLoading(true)
                      setError(null)
                      setErrorKey(null)
                      try {
                        const { error: resendError } = await supabase.auth.resend({
                          type: 'signup',
                          email: email.trim(),
                        })
                        if (resendError) throw resendError
                        setSuccess(t('auth.emailOtpSent', { email: email.trim() }))
                      } catch (err) {
                        const loc = localizeError(err.message, t)
                        setError(loc.text)
                        setErrorKey(loc.key)
                      } finally {
                        setLoading(false)
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--error-bright)',
                      fontSize: 12,
                      fontFamily: 'var(--font-display)',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      marginLeft: 4,
                    }}
                  >
                    {t('auth.resendOtp')}
                  </button>
                )}
              </AuthAlert>
            )}

            {success && <AuthAlert type="success">{success}</AuthAlert>}

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
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      aria-label={`OTP ${i + 1}`}
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={handleOtpPaste}
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
                  {loading ? t('common.loading') : t('auth.verifyBtn')}
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
                    onClick={handleResendOtp}
                    disabled={loading || cooldown > 0}
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
                {otpType !== 'signup' && (
                  <button
                    type="button"
                    onClick={() => {
                      setOtpTarget(null)
                      setOtpType(null)
                      setOtp(['', '', '', '', '', ''])
                      setError(null)
                      setErrorKey(null)
                      setSuccess(null)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-disabled)',
                      fontSize: 12,
                      fontFamily: 'var(--font-display)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      width: '100%',
                      marginTop: 4,
                    }}
                  >
                    {t('auth.changeEmail')}
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
                    ref={emailInputRef}
                    type="email"
                    className="auth-input"
                    autoComplete="email"
                    aria-label="Email"
                    placeholder={t('auth.emailPlaceholder')}
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
                  {loading ? t('common.loading') : t('auth.forgotSendBtn')}
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
                          boxShadow: tab === tabKey ? '0 4px 12px var(--primary-glow)' : 'none',
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
                        autoComplete="email"
                        placeholder={t('auth.emailPlaceholder')}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          if (error) setError(null)
                          setErrorKey(null)
                          if (success) setSuccess(null)
                        }}
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
                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                        aria-label={t('auth.pwPlaceholder')}
                        placeholder={t('auth.pwPlaceholder')}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          if (error) setError(null)
                          setErrorKey(null)
                          if (success) setSuccess(null)
                        }}
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

                    {mode === 'register' && password.length > 0 && (
                      <PasswordRules password={password} t={t} />
                    )}

                    {mode === 'register' && (
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          className="auth-input"
                          autoComplete="new-password"
                          aria-label={t('auth.pwConfirmPlaceholder')}
                          placeholder={t('auth.pwConfirmPlaceholder')}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value)
                            if (error) setError(null)
                            setErrorKey(null)
                          }}
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
                        ? t('common.loading')
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
                        autoComplete="email"
                        placeholder={t('auth.emailPlaceholder')}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          if (error) setError(null)
                          setErrorKey(null)
                        }}
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
                      {loading ? t('common.loading') : t('auth.emailOtpSendBtn')}
                    </button>
                    <div
                      style={{
                        textAlign: 'center',
                        fontSize: 11,
                        color: 'var(--text-dim)',
                        fontFamily: 'var(--font-display)',
                        lineHeight: 1.4,
                      }}
                    >
                      {t('auth.emailOtpAutoCreateHint')}
                    </div>
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
                    fontSize: 16,
                    fontWeight: 500,
                    fontFamily: 'var(--font-display)',
                    cursor: googleLoading ? 'default' : 'pointer',
                    transition: 'background 0.15s',
                    opacity: googleLoading ? 0.6 : 1,
                  }}
                >
                  <GoogleLogo />
                  {googleLoading
                    ? t('common.loading')
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
                      onClick={() => navigate('/privacy-policy', { state: { from: location } })}
                      style={{
                        color: 'var(--text-faint)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      Құпиялылық саясатымен
                    </span>{' '}
                    және{' '}
                    <span
                      onClick={() => navigate('/terms', { state: { from: location } })}
                      style={{
                        color: 'var(--text-faint)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      Қызмет көрсету шарттарымен
                    </span>{' '}
                    келісесіз
                  </>
                ) : (
                  <>
                    Регистрируясь, вы принимаете{' '}
                    <span
                      onClick={() => navigate('/privacy-policy', { state: { from: location } })}
                      style={{
                        color: 'var(--text-faint)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      Политику конфиденциальности
                    </span>{' '}
                    и{' '}
                    <span
                      onClick={() => navigate('/terms', { state: { from: location } })}
                      style={{
                        color: 'var(--text-faint)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      Условия использования
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
