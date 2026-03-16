import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useI18n } from '../utils/i18n.js'
import KorsetAvatar from '../components/KorsetAvatar.jsx'

export default function SetupProfileScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { lang } = useI18n()
  
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    // Предзаполняем поле, если какое-то имя уже пришло (сотрем его, если пользователь захочет)
    if (user && user.user_metadata?.full_name) {
      setName(user.user_metadata.full_name)
    }
  }, [user])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      // Сохраняем имя (даже если это псевдоним) и ставим флаг, что настройка завершена
      const { error } = await supabase.auth.updateUser({
        data: { 
          full_name: name.trim(),
          profile_setup_done: true
        }
      })
      if (error) throw error
      
      // Перекидываем на профиль, как просил пользователь
      navigate('/profile', { replace: true })
    } catch (err) {
      console.error('Ошибка сохранения профиля:', err)
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen" style={{ background: 'var(--bg)', paddingTop: 0, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ position: 'relative', height: 260, background: 'linear-gradient(180deg, rgba(124,58,237,0.15) 0%, transparent 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <KorsetAvatar size={80} />
        <h1 style={{ marginTop: 20, fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#fff', textAlign: 'center', padding: '0 20px' }}>
          {lang === 'kz' ? 'Профильді баптау' : 'Настройка профиля'}
        </h1>
        <p style={{ marginTop: 8, fontSize: 14, color: 'var(--text-dim)', textAlign: 'center', padding: '0 30px', lineHeight: 1.5 }}>
          {lang === 'kz' 
            ? 'Өзіңізге ұнайтын есім немесе лақап ат жазыңыз. Ол басқаларға көрінбейді.' 
            : 'Введите ваше имя или псевдоним. Ваши данные в безопасности.'}
        </p>
      </div>

      <div style={{ padding: '0 24px' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 8, marginLeft: 4 }}>
              {lang === 'kz' ? 'Сіздің атыңыз / Лақап ат' : 'Ваше Имя / Псевдоним'}
            </label>
            <input 
              type="text" 
              placeholder={lang === 'kz' ? 'Атыңыз' : 'Придумайте имя'} 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
              style={{ 
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(124,58,237,0.3)', 
                padding: '16px 20px', borderRadius: 16, color: '#fff', fontSize: 16, 
                width: '100%', outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
              }} 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !name.trim()} 
            style={{ 
              background: '#7C3AED', color: '#fff', border: 'none', padding: '18px', 
              borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: (loading || !name.trim()) ? 'default' : 'pointer', 
              marginTop: 10, opacity: (loading || !name.trim()) ? 0.5 : 1,
              boxShadow: '0 8px 24px rgba(124,58,237,0.25)'
            }}
          >
            {loading ? '...' : (lang === 'kz' ? 'Сақтау және жалғастыру' : 'Сохранить и продолжить')}
          </button>
        </form>
      </div>
    </div>
  )
}
