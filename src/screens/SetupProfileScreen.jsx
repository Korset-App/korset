import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useI18n } from '../utils/i18n.js'

// Временные аватарки (потом замените на реальные картинки от дизайнера)
const AVATARS = [
  { id: 'av1', bg: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)', emoji: '👩' },
  { id: 'av2', bg: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', emoji: '👱‍♂️' },
  { id: 'av3', bg: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', emoji: '🧑' },
  { id: 'av4', bg: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)', emoji: '👨' },
  { id: 'av5', bg: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', emoji: '👩‍🎤' },
  { id: 'av6', bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', emoji: '🐱‍👤' }
]

const ALLERGEN_OPTIONS = [
  { id: 'gluten', labelKz: 'Глютен', labelRu: 'Глютен' },
  { id: 'lactose', labelKz: 'Лактоза', labelRu: 'Лактоза' },
  { id: 'nuts', labelKz: 'Жаңғақтар', labelRu: 'Орехи' },
  { id: 'sugar', labelKz: 'Қант', labelRu: 'Сахар' }
]

export default function SetupProfileScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, updateProfile } = useProfile()
  const { lang } = useI18n()
  
  const [step, setStep] = useState(1) // 1: Name, 2: Avatar, 3: Diet
  const [loading, setLoading] = useState(false)

  // Step 1: Name
  const [name, setName] = useState('')
  
  // Step 2: Avatar
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id)

  // Step 3: Diet & Allergens
  const [halal, setHalal] = useState(profile?.halal || false)
  const [allergens, setAllergens] = useState(profile?.allergens || [])

  useEffect(() => {
    if (user && user.user_metadata?.full_name) {
      setName(user.user_metadata.full_name)
    }
    if (user && user.user_metadata?.avatar_id) {
      setSelectedAvatar(user.user_metadata.avatar_id)
    }
  }, [user])

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const toggleAllergen = (id) => {
    if (allergens.includes(id)) {
      setAllergens(allergens.filter(a => a !== id))
    } else {
      setAllergens([...allergens, id])
    }
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      // 1. Сохраняем имя и аватарку в metadata юзера
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          full_name: name.trim() || 'User',
          avatar_id: selectedAvatar,
          profile_setup_done: true
        }
      })
      if (authError) throw authError

      // 2. Сохраняем аллергии и диету в наш ProfileContext (он сам отправит их в таблицу users)
      await updateProfile({
        halal,
        allergens
      })
      
      // 3. Отправляем в профиль
      navigate('/profile', { replace: true })
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Progress Bar Width
  const progress = (step / 3) * 100

  return (
    <div className="screen" style={{ 
      background: '#0F0F13', paddingTop: 0, paddingBottom: 40, 
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      color: '#fff'
    }}>
      
      {/* Progress Bar Header */}
      <div style={{ padding: '20px 24px', paddingTop: 60, position: 'relative', zIndex: 10 }}>
        {step > 1 && (
          <button onClick={handleBack} style={{ position: 'absolute', top: 50, left: 16, width: 44, height: 44, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED', letterSpacing: 1 }}>
            {lang === 'kz' ? `${step} ҚАДАМ 3-ТЕН` : `ШАГ ${step} ИЗ 3`}
          </span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #7C3AED, #EC4899)', transition: 'width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '0 24px', display: 'flex', flexDirection: 'column' }}>
        
        {step === 1 && (
          <div style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 8 }}>
              {lang === 'kz' ? 'Сәлем!' : 'Давайте знакомиться'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginBottom: 40 }}>
              {lang === 'kz' ? 'Біз сізді қалай атайық? Бұл атау басқаларға көрінбейді.' : 'Как нам к вам обращаться? Вы можете использовать псевдоним.'}
            </p>

            <input 
              type="text" 
              placeholder={lang === 'kz' ? 'Атыңыз немесе лақап ат' : 'Ваше Имя / Псевдоним'} 
              value={name} 
              onChange={e => setName(e.target.value)} 
              autoFocus
              style={{ 
                background: 'transparent', border: 'none', borderBottom: '2px solid rgba(255,255,255,0.2)', 
                padding: '16px 0', color: '#fff', fontSize: 24, fontWeight: 600, 
                width: '100%', outline: 'none', transition: 'border 0.2s',
                fontFamily: 'var(--font-display)'
              }} 
              onFocus={(e) => e.target.style.borderBottomColor = '#EC4899'}
              onBlur={(e) => e.target.style.borderBottomColor = 'rgba(255,255,255,0.2)'}
            />
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: 'fadeUp 0.4s ease-out', flex: 1 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 8 }}>
              {lang === 'kz' ? 'Аватар таңдаңыз' : 'Выберите аватар'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginBottom: 40 }}>
              {lang === 'kz' ? 'Профиліңізді кім бейнелейді?' : 'Этот персонаж будет встречать вас в профиле.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {AVATARS.map(av => (
                <div 
                  key={av.id} 
                  onClick={() => setSelectedAvatar(av.id)}
                  style={{ 
                    aspectRatio: '1', borderRadius: 24, background: av.bg, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
                    cursor: 'pointer', position: 'relative',
                    border: selectedAvatar === av.id ? '4px solid #fff' : '4px solid transparent',
                    boxShadow: selectedAvatar === av.id ? '0 10px 20px rgba(0,0,0,0.5)' : 'none',
                    transform: selectedAvatar === av.id ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                >
                  {/* Заглушка, пока нет картинок */}
                  {av.emoji} 
                  
                  {/* Галочка выбора */}
                  {selectedAvatar === av.id && (
                    <div style={{ position: 'absolute', bottom: -8, right: -8, width: 28, height: 28, background: '#34D399', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #0F0F13' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                {lang === 'kz' ? '*Болашақта галереядан сурет қою мүмкіндігі қосылады' : '*Скоро мы добавим загрузку своих фото'}
              </span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ animation: 'fadeUp 0.4s ease-out', flex: 1 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 8 }}>
              {lang === 'kz' ? 'Сіздің мақсатыңыз' : 'Ваши предпочтения'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginBottom: 30 }}>
              {lang === 'kz' ? 'Körset сізге ескерту үшін диетаңызды белгілеңіз.' : 'Мы будем предупреждать вас о запрещенных ингредиентах.'}
            </p>

            {/* Халяль */}
            <div 
              onClick={() => setHalal(!halal)}
              style={{
                background: halal ? 'linear-gradient(135deg, rgba(52,211,153,0.2) 0%, rgba(16,185,129,0.2) 100%)' : 'rgba(255,255,255,0.05)',
                border: halal ? '1px solid #34D399' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', transition: 'all 0.2s', marginBottom: 24
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: halal ? '#34D399' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  🌙
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: halal ? '#34D399' : '#fff' }}>Halal</div>
                  <div style={{ fontSize: 13, color: halal ? 'rgba(52,211,153,0.8)' : 'rgba(255,255,255,0.5)' }}>
                    {lang === 'kz' ? 'Күмәнді қоспаларды жасыру' : 'Определять сомнительные добавки'}
                  </div>
                </div>
              </div>
              <div style={{ width: 24, height: 24, borderRadius: 8, border: halal ? '2px solid #34D399' : '2px solid rgba(255,255,255,0.3)', background: halal ? '#34D399' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {halal && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
              </div>
            </div>

            {/* Аллергии */}
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{lang === 'kz' ? 'Аллергия немесе диета' : 'У меня аллергия на:'}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {ALLERGEN_OPTIONS.map(a => {
                const isActive = allergens.includes(a.id)
                return (
                  <div 
                    key={a.id}
                    onClick={() => toggleAllergen(a.id)}
                    style={{
                      background: isActive ? '#7C3AED' : 'rgba(255,255,255,0.05)',
                      border: isActive ? '1px solid #7C3AED' : '1px solid rgba(255,255,255,0.1)',
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                      padding: '12px 20px', borderRadius: 100, fontSize: 14, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    {isActive && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    {lang === 'kz' ? a.labelKz : a.labelRu}
                  </div>
                )
              })}
            </div>

          </div>
        )}

      </div>

      {/* Bottom Button Action */}
      <div style={{ padding: '24px', position: 'relative', zIndex: 10 }}>
        <button 
          onClick={step === 3 ? handleFinish : handleNext}
          disabled={loading || (step === 1 && !name.trim())} 
          style={{ 
            width: '100%',
            background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)', 
            color: '#fff', border: 'none', padding: '18px', 
            borderRadius: 20, fontSize: 18, fontWeight: 800, 
            cursor: (loading || (step === 1 && !name.trim())) ? 'default' : 'pointer', 
            opacity: (loading || (step === 1 && !name.trim())) ? 0.5 : 1,
            boxShadow: '0 10px 25px rgba(236,72,153,0.3)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10,
            transition: 'all 0.2s'
          }}
        >
          {loading ? '...' : step === 3 ? (lang === 'kz' ? 'Бастау' : 'Начать использование') : (lang === 'kz' ? 'Жалғастыру' : 'Продолжить')}
          {step < 3 && !loading && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          )}
        </button>
      </div>

    </div>
  )
}
