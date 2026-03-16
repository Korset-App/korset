import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useI18n } from '../utils/i18n.js'

export default function AuthScreen() {
  const navigate = useNavigate()
  const { lang, t } = useI18n()
  
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'verify'
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const otpRefs = useRef([])

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMode('verify') // Переходим к вводу кода
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate(-1)
      }
    } catch (err) {
      setError(err.message)
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
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
      if (error) throw error
      // При успешном вводе navigate сработает сам из App.jsx (на setup-profile)
    } catch (err) {
      setError(lang === 'kz' ? 'Қате код. Қайта көріңіз.' : 'Неверный код. Попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      })
      if (error) throw error
    } catch (err) {
      setError(err.message)
    }
  }

  const handleOtpChange = (index, val) => {
    if (/[^0-9]/.test(val)) return // только цифры
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

  return (
    <div className="screen" style={{ 
      background: 'radial-gradient(120% 120% at 50% -20%, rgba(124,58,237,0.3) 0%, #0F0F13 100%)', 
      paddingTop: 0, paddingBottom: 40, minHeight: '100vh',
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Background Orbs */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: 200, height: 200, background: '#7C3AED', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.5, zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '20%', right: '-10%', width: 250, height: 250, background: '#EC4899', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.3, zIndex: 0 }} />

      {/* Header Container */}
      <div style={{ position: 'relative', height: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ position: 'absolute', top: 16, left: 16, width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        {/* Dynamic Logo Placeholder */}
        <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(124,58,237,0.4)', marginBottom: 20 }}>
          <span style={{ fontSize: 40, color: '#fff', fontWeight: 900, fontFamily: 'var(--font-display)', letterSpacing: -2 }}>K</span>
        </div>
        
        <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          {mode === 'verify' 
            ? (lang === 'kz' ? 'Кодты растау' : 'Подтверждение')
            : mode === 'login' 
              ? (lang === 'kz' ? 'Қош келдіңіз' : 'С возвращением') 
              : (lang === 'kz' ? 'Тіркелу' : 'Создать аккаунт')}
        </h1>
        <p style={{ marginTop: 8, fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '0 20px' }}>
          {mode === 'verify'
            ? (lang === 'kz' ? 'Поштаңызға жіберілген 6-таңбалы кодты енгізіңіз' : 'Введите 6-значный код из отправленного письма')
            : (lang === 'kz' ? 'Körset-тің барлық мүмкіндіктерін ашыңыз' : 'Откройте все возможности умного выбора')}
        </p>
      </div>

      <div style={{ padding: '0 24px', position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        
        <div style={{ 
          background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', 
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '32px 24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
        }}>

          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', padding: '12px 16px', borderRadius: 12, fontSize: 13, marginBottom: 20, textAlign: 'center' }}>{error}</div>}

          {mode === 'verify' ? (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    style={{ 
                      width: 44, height: 50, textAlign: 'center', fontSize: 24, fontWeight: 700,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(124,58,237,0.3)',
                      borderRadius: 12, color: '#fff', outline: 'none', transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#EC4899'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(124,58,237,0.3)'}
                  />
                ))}
              </div>
              
              <button type="submit" disabled={loading || otp.join('').length < 6} style={{ 
                background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)', color: '#fff', border: 'none', 
                padding: '16px', borderRadius: 16, fontSize: 16, fontWeight: 700, 
                cursor: (loading || otp.join('').length < 6) ? 'default' : 'pointer', 
                opacity: (loading || otp.join('').length < 6) ? 0.5 : 1, boxShadow: '0 8px 20px rgba(124,58,237,0.3)' 
              }}>
                {loading ? '...' : (lang === 'kz' ? 'Растау' : 'Подтвердить')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ position: 'relative' }}>
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px 20px', borderRadius: 16, color: '#fff', fontSize: 15, width: '100%', outline: 'none', transition: 'border 0.2s' }} />
              </div>
              <div style={{ position: 'relative' }}>
                <input type="password" placeholder={lang === 'kz' ? 'Құпиясөз' : 'Пароль'} value={password} onChange={e => setPassword(e.target.value)} required style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px 20px', borderRadius: 16, color: '#fff', fontSize: 15, width: '100%', outline: 'none', transition: 'border 0.2s' }} />
              </div>
              
              <button type="submit" disabled={loading} style={{ 
                background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)', color: '#fff', border: 'none', padding: '16px', borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: loading ? 'default' : 'pointer', marginTop: 10, opacity: loading ? 0.7 : 1, boxShadow: '0 8px 20px rgba(124,58,237,0.3)' 
              }}>
                {loading ? '...' : (mode === 'login' ? (lang === 'kz' ? 'Кіру' : 'Войти') : (lang === 'kz' ? 'Тіркелу' : 'Зарегистрироваться'))}
              </button>
            </form>
          )}

          {mode !== 'verify' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{lang === 'kz' ? 'НЕМЕСЕ' : 'ИЛИ'}</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              </div>

              <button onClick={handleGoogleAuth} style={{ 
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, 
                background: 'rgba(255,255,255,0.95)', color: '#000', border: 'none', padding: '15px', 
                borderRadius: 16, fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'transform 0.1s' 
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {lang === 'kz' ? 'Google арқылы кіру' : 'Войти через Google'}
              </button>
            </>
          )}
        </div>

        {/* Footer Toggle */}
        {mode !== 'verify' && (
          <div style={{ textAlign: 'center', marginTop: 30 }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              {mode === 'login' 
                ? (lang === 'kz' ? 'Аккаунтыңыз жоқ па?' : 'Ещё нет аккаунта?') 
                : (lang === 'kz' ? 'Аккаунтыңыз бар ма?' : 'Уже есть аккаунт?')}
            </p>
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ 
              background: 'none', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, 
              cursor: 'pointer', marginTop: 4, textDecoration: 'underline', textDecorationColor: '#7C3AED' 
            }}>
              {mode === 'login' 
                ? (lang === 'kz' ? 'Қазір тіркеліңіз' : 'Зарегистрируйтесь сейчас') 
                : (lang === 'kz' ? 'Кіру' : 'Войти в аккаунт')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
