import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useI18n, setLang } from '../i18n/index.js'
import { useTheme } from '../utils/theme.js'
import { getReturnTo } from '../utils/authFlow.js'
import {
  StorefrontIcon,
  TelegramIcon,
  LockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SyncIcon,
  EyeIcon,
} from '../components/icons/index.js'
import KorsetBrandMark from '../components/brand/KorsetBrandMark.jsx'

export default function RetailAuthScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'
  const { toggleTheme, isLight } = useTheme()

  const [tab, setTab] = useState('password') // 'password' | 'code'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const emailInputRef = useRef(null)
  const returnTo = getReturnTo(location, '/retail')

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate(returnTo, { replace: true })
    }
  }, [user, returnTo, navigate])

  useEffect(() => {
    emailInputRef.current?.focus()
  }, [])

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !password) return

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      })

      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          setErrorMsg(t('retail.auth.invalidCredentials') || 'Неверный email или пароль')
        } else {
          setErrorMsg(error.message || 'Ошибка входа')
        }
        return
      }

      if (data?.user) {
        navigate(returnTo, { replace: true })
      }
    } catch (err) {
      setErrorMsg(err.message || 'Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  const handleSendCode = async (e) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { shouldCreateUser: false },
      })

      if (error) {
        setErrorMsg(error.message || 'Не удалось отправить код')
        return
      }

      setCodeSent(true)
      setSuccessMsg(
        isKz
          ? `6 таңбалы растау коды ${trimmed} поштасына жіберілді`
          : `Код подтверждения отправлен на ${trimmed}`
      )
    } catch (err) {
      setErrorMsg(err.message || 'Ошибка отправки кода')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const trimmed = email.trim()
    const code = otpCode.trim()
    if (!trimmed || !code) return

    setLoading(true)
    setErrorMsg(null)

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: trimmed,
        token: code,
        type: 'email',
      })

      if (error) {
        setErrorMsg(isKz ? 'Код қате немесе мерзімі өтіп кеткен' : 'Неверный или просроченный код')
        return
      }

      if (data?.user) {
        navigate(returnTo, { replace: true })
      }
    } catch (err) {
      setErrorMsg(err.message || 'Ошибка верификации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'var(--retail-bg, #080c18)',
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Top Bar Controls: Lang & Theme ── */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            background: 'var(--glass-bg)',
            border: '1px solid var(--retail-border)',
            borderRadius: 8,
            padding: 2,
          }}
        >
          <button
            type="button"
            onClick={() => setLang('ru')}
            style={{
              padding: '4px 10px',
              border: 'none',
              borderRadius: 6,
              background: lang === 'ru' ? 'var(--retail-accent, #38bdf8)' : 'transparent',
              color: lang === 'ru' ? '#080c18' : 'var(--text-dim)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            RU
          </button>
          <button
            type="button"
            onClick={() => setLang('kz')}
            style={{
              padding: '4px 10px',
              border: 'none',
              borderRadius: 6,
              background: lang === 'kz' ? 'var(--retail-accent, #38bdf8)' : 'transparent',
              color: lang === 'kz' ? '#080c18' : 'var(--text-dim)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            KZ
          </button>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1px solid var(--retail-border)',
            background: 'var(--glass-bg)',
            color: 'var(--text-sub)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title={isLight ? 'Включить тёмную тему' : 'Включить светлую тему'}
        >
          {isLight ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Main Auth Card ── */}
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--bg-card)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid var(--retail-border)',
          borderRadius: 24,
          padding: '36px 32px',
          boxShadow: 'var(--shadow-card)',
          boxSizing: 'border-box',
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <KorsetBrandMark size={52} style={{ margin: '0 auto 16px' }} />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 800,
                color: 'var(--text)',
                letterSpacing: '-0.4px',
              }}
            >
              Körset Retail
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.6px',
                padding: '2px 7px',
                borderRadius: 6,
                background: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--retail-accent, #38bdf8)',
                border: '1px solid rgba(56, 189, 248, 0.28)',
              }}
            >
              PARTNER
            </span>
          </div>

          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.45 }}>
            {t('retail.auth.subtitle') || 'Управление витриной, ценами и интеграцией'}
          </p>
        </div>

        {/* Tab switcher: Password vs Code */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'var(--glass-bg)',
            border: '1px solid var(--retail-border)',
            borderRadius: 12,
            padding: 3,
            gap: 4,
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTab('password')
              setErrorMsg(null)
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 9,
              border: 'none',
              background: tab === 'password' ? 'var(--retail-accent, #38bdf8)' : 'transparent',
              color: tab === 'password' ? '#080c18' : 'var(--text-sub)',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'all 0.15s ease',
            }}
          >
            {t('retail.auth.loginPasswordTab') || 'По паролю'}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('code')
              setErrorMsg(null)
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 9,
              border: 'none',
              background: tab === 'code' ? 'var(--retail-accent, #38bdf8)' : 'transparent',
              color: tab === 'code' ? '#080c18' : 'var(--text-sub)',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'all 0.15s ease',
            }}
          >
            {t('retail.auth.loginCodeTab') || 'По коду на Email'}
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: 12.5,
              lineHeight: 1.4,
              marginBottom: 18,
            }}
          >
            <AlertTriangleIcon size={16} color="#ef4444" style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: 12.5,
              lineHeight: 1.4,
              marginBottom: 18,
            }}
          >
            <CheckCircleIcon size={16} color="#10b981" style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form: Password Login */}
        {tab === 'password' && (
          <form
            onSubmit={handlePasswordLogin}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-dim)',
                  marginBottom: 6,
                }}
              >
                {t('retail.auth.emailLabel') || 'Рабочий Email'}
              </label>
              <input
                ref={emailInputRef}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="director@store.kz"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid var(--retail-border)',
                  background: 'var(--glass-bg)',
                  color: 'var(--text)',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'var(--font-body)',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-dim)',
                  marginBottom: 6,
                }}
              >
                {t('retail.auth.passwordLabel') || 'Пароль'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--retail-border)',
                    background: 'var(--glass-bg)',
                    color: 'var(--text)',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-body)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <EyeIcon size={16} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6,
                padding: '13px 20px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                fontFamily: 'var(--font-display)',
                transition: 'opacity 0.15s ease',
              }}
            >
              {loading ? (
                <>
                  <SyncIcon size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>{isKz ? 'Тексерілуде...' : 'Проверяем доступ...'}</span>
                </>
              ) : (
                <>
                  <LockIcon size={16} />
                  <span>{t('retail.auth.submitBtn') || 'Войти в кабинет'}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Form: Email OTP Code */}
        {tab === 'code' && (
          <form
            onSubmit={codeSent ? handleVerifyOtp : handleSendCode}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-dim)',
                  marginBottom: 6,
                }}
              >
                {t('retail.auth.emailLabel') || 'Рабочий Email'}
              </label>
              <input
                type="email"
                required
                disabled={codeSent}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="director@store.kz"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid var(--retail-border)',
                  background: 'var(--glass-bg)',
                  color: 'var(--text)',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'var(--font-body)',
                }}
              />
            </div>

            {codeSent && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-dim)',
                    marginBottom: 6,
                  }}
                >
                  {t('retail.auth.codeLabel') || 'Код подтверждения из письма'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--retail-border)',
                    background: 'var(--glass-bg)',
                    color: 'var(--text)',
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: '4px',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-display)',
                  }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6,
                padding: '13px 20px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                fontFamily: 'var(--font-display)',
                transition: 'opacity 0.15s ease',
              }}
            >
              {loading ? (
                <>
                  <SyncIcon size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>{isKz ? 'Күте тұрыңыз...' : 'Отправляем...'}</span>
                </>
              ) : codeSent ? (
                <>
                  <CheckCircleIcon size={16} />
                  <span>{t('retail.auth.submitBtn') || 'Подтвердить и войти'}</span>
                </>
              ) : (
                <span>{t('retail.auth.sendCode') || 'Получить код на почту'}</span>
              )}
            </button>
          </form>
        )}

        {/* ── Support & Telegram Footer ── */}
        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: '1px solid var(--retail-border)',
            textAlign: 'center',
          }}
        >
          <p
            style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4 }}
          >
            {t('retail.auth.supportText') || 'Нужен доступ или хотите подключить магазин?'}
          </p>

          <a
            href="https://t.me/korset_support_bot"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 10,
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.22)',
              color: 'var(--retail-accent, #38bdf8)',
              fontSize: 12.5,
              fontWeight: 600,
              textDecoration: 'none',
              fontFamily: 'var(--font-body)',
              transition: 'background 0.15s ease',
            }}
          >
            <TelegramIcon size={16} color="#229ED9" />
            <span>{t('retail.auth.supportBtn') || 'Служба заботы в Telegram'}</span>
          </a>

          <div style={{ marginTop: 14 }}>
            <a
              href="/stores"
              style={{
                fontSize: 12,
                color: 'var(--text-dim)',
                textDecoration: 'none',
              }}
            >
              {t('retail.auth.backToApp') || '← На витрину покупателя'}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
