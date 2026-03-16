import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useI18n } from '../utils/i18n.js'
import KorsetAvatar from '../components/KorsetAvatar.jsx'

export default function AuthScreen() {
  const navigate = useNavigate()
  const { lang, t } = useI18n()
  
  const [mode, setMode] = useState('login') // 'login' | 'register'
  
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('') // только для регистрации
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name || 'Пользователь Körset' }
          }
        })
        if (error) throw error
        setMessage(lang === 'kz' ? 'Тіркелу сәтті өтті! Электрондық поштаңызды растаңыз.' : 'Регистрация успешна! Проверьте вашу почту для подтверждения.')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate(-1) // возвращаемся назад после успешного входа
      }
    } catch (err) {
      setError(err.message)
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

  return (
    <div className="screen" style={{ background: 'var(--bg)', paddingTop: 0, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ position: 'relative', height: 220, background: 'linear-gradient(180deg, rgba(124,58,237,0.15) 0%, transparent 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ position: 'absolute', top: 16, left: 16, width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <KorsetAvatar size={70} />
        <h1 style={{ marginTop: 16, fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#fff' }}>
          {mode === 'login' ? (lang === 'kz' ? 'Қош келдіңіз' : 'С возвращением') : (lang === 'kz' ? 'Тіркелу' : 'Создать аккаунт')}
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: 'var(--text-dim)' }}>
          {lang === 'kz' ? 'Körset мүмкіндіктерін толық пайдаланыңыз' : 'Откройте все возможности Körset'}
        </p>
      </div>

      <div style={{ padding: '0 24px' }}>


        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', padding: '12px 16px', borderRadius: 12, fontSize: 13, marginBottom: 20 }}>{error}</div>}
        {message && <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34D399', padding: '12px 16px', borderRadius: 12, fontSize: 13, marginBottom: 20 }}>{message}</div>}

        {/* Forms */}
        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <input type="text" placeholder={lang === 'kz' ? 'Атыңыз' : 'Ваше Имя (оставьте пустым или псевдоним)'} value={name} onChange={e => setName(e.target.value)} required style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', borderRadius: 14, color: '#fff', fontSize: 15, width: '100%', outline: 'none' }} />
          )}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', borderRadius: 14, color: '#fff', fontSize: 15, width: '100%', outline: 'none' }} />
          <input type="password" placeholder={lang === 'kz' ? 'Құпиясөз' : 'Пароль'} value={password} onChange={e => setPassword(e.target.value)} required style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', borderRadius: 14, color: '#fff', fontSize: 15, width: '100%', outline: 'none' }} />
          
          <button type="submit" disabled={loading} style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '16px', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: loading ? 'default' : 'pointer', marginTop: 10, opacity: loading ? 0.7 : 1 }}>
            {loading ? '...' : (mode === 'login' ? (lang === 'kz' ? 'Кіру' : 'Войти') : (lang === 'kz' ? 'Тіркелу' : 'Зарегистрироваться'))}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{lang === 'kz' ? 'немесе' : 'или'}</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Google Auth */}
        <button onClick={handleGoogleAuth} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(255,255,255,0.95)', color: '#000', border: 'none', padding: '15px', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 24 }}>
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {lang === 'kz' ? 'Google арқылы кіру' : 'Войти через Google'}
        </button>

        {/* Toggle Mode */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ background: 'none', border: 'none', color: 'var(--primary-bright)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            {mode === 'login' 
              ? (lang === 'kz' ? 'Аккаунтыңыз жоқ па? Тіркелу' : 'Нет аккаунта? Зарегистрироваться') 
              : (lang === 'kz' ? 'Аккаунтыңыз бар ма? Кіру' : 'Уже есть аккаунт? Войти')}
          </button>
        </div>
      </div>
    </div>
  )
}
