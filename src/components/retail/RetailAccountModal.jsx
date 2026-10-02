import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useI18n } from '../../i18n/index.js'
import { AVATAR_PRESETS, SILHOUETTE_PRESETS } from '../../constants/avatarPresets.js'
import ProfileAvatar from '../ProfileAvatar.jsx'
import {
  CloseIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  LockIcon,
  EyeIcon,
  SlidersIcon,
} from '../icons/index.js'

export default function RetailAccountModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'

  const currentAvatarId = user?.user_metadata?.avatar_id || 'av20'
  const currentName = user?.user_metadata?.name || user?.email?.split('@')[0] || ''

  const [name, setName] = useState(currentName)
  const [selectedAvatarId, setSelectedAvatarId] = useState(currentAvatarId)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'security'
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setName(user?.user_metadata?.name || user?.email?.split('@')[0] || '')
      setSelectedAvatarId(user?.user_metadata?.avatar_id || 'av20')
      setNewPassword('')
      setConfirmPassword('')
      setErrorMsg(null)
      setSuccessMsg(null)
    }
  }, [isOpen, user])

  if (!isOpen) return null

  const handleSave = async (e) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    // Validate password if user entered one
    if (newPassword) {
      if (newPassword.length < 6) {
        setErrorMsg(
          isKz
            ? 'Құпия сөз кемінде 6 таңбадан тұруы керек'
            : 'Пароль должен быть не менее 6 символов'
        )
        return
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg(isKz ? 'Құпия сөздер сәйкес келмейді' : 'Пароли не совпадают')
        return
      }
    }

    setLoading(true)
    try {
      const updatePayload = {
        data: {
          name: name.trim(),
          avatar_id: selectedAvatarId,
        },
      }

      if (newPassword.trim()) {
        updatePayload.password = newPassword.trim()
      }

      const { error } = await supabase.auth.updateUser(updatePayload)
      if (error) {
        setErrorMsg(error.message || (isKz ? 'Сақтау қатесі' : 'Ошибка сохранения профиля'))
        return
      }

      setSuccessMsg(isKz ? 'Профиль сәтті жаңартылды!' : 'Профиль успешно обновлен!')
      setNewPassword('')
      setConfirmPassword('')

      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err) {
      setErrorMsg(err.message || (isKz ? 'Желі қатесі' : 'Ошибка сети'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="retail-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="retail-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 540,
          background: 'var(--bg-card, #111120)',
          border: '1px solid var(--border-bright, rgba(255,255,255,0.12))',
          borderRadius: 24,
          boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--retail-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--glass-subtle)',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                fontFamily: 'var(--font-display)',
                color: 'var(--text)',
                letterSpacing: '-0.3px',
              }}
            >
              {isKz ? 'Басқарушы профилі' : 'Профиль управляющего'}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-dim)' }}>
              {user?.email || 'admin@korset.app'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="retail-modal-close-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Закрыть"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            padding: '12px 24px 0',
            gap: 8,
            borderBottom: '1px solid var(--retail-border)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom:
                activeTab === 'profile'
                  ? '2px solid var(--retail-accent, #38bdf8)'
                  : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'profile' ? 'var(--text)' : 'var(--text-dim)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {isKz ? 'Деректер және аватар' : 'Данные и аватар'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom:
                activeTab === 'security'
                  ? '2px solid var(--retail-accent, #38bdf8)'
                  : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'security' ? 'var(--text)' : 'var(--text-dim)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {isKz ? 'Қауіпсіздік және құпия сөз' : 'Безопасность и пароль'}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>
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
                color: 'var(--error-bright, #f87171)',
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              <AlertTriangleIcon size={18} color="currentColor" />
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
                color: 'var(--success-bright, #10b981)',
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              <CheckCircleIcon size={18} color="currentColor" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {/* Avatar Live Preview */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  padding: 16,
                  borderRadius: 16,
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--retail-border)',
                }}
              >
                <div style={{ width: 64, height: 64, flexShrink: 0 }}>
                  <ProfileAvatar
                    avatarId={selectedAvatarId}
                    name={name || 'Управляющий'}
                    rounded="circle"
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>
                    {name || (isKz ? 'Басқарушы' : 'Управляющий магазином')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                    {isKz
                      ? 'Төмендегі тізімнен жаңа аватарды таңдаңыз'
                      : 'Выберите новый аватар из коллекции ниже'}
                  </div>
                </div>
              </div>

              {/* Name field */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-sub)',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                  }}
                >
                  {isKz ? 'Басқарушының аты' : 'Имя управляющего'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isKz ? 'Аты-жөніңіз' : 'Например: Руслан Ибрагимов'}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--retail-border)',
                    background: 'var(--glass-bg)',
                    color: 'var(--text)',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Avatar presets grid */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-sub)',
                    marginBottom: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                  }}
                >
                  {isKz ? 'Аватарлар топтамасы' : 'Коллекция аватаров'}
                </label>

                {/* Gradient Silhouettes */}
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
                  {isKz ? 'Минималистік градиенттер:' : 'Минималистичные градиенты:'}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                  {SILHOUETTE_PRESETS.map((item) => {
                    const isSelected = selectedAvatarId === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedAvatarId(item.id)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          border: isSelected
                            ? '2.5px solid var(--retail-accent, #38bdf8)'
                            : '2px solid transparent',
                          padding: 2,
                          background: 'transparent',
                          cursor: 'pointer',
                          transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 0 12px rgba(56, 189, 248, 0.5)' : 'none',
                        }}
                      >
                        <ProfileAvatar avatarId={item.id} name="K" rounded="circle" />
                      </button>
                    )
                  })}
                </div>

                {/* Character Avatars */}
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
                  {isKz ? 'Бейнелік кейіпкерлер:' : 'Иллюстрированные персонажи:'}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {AVATAR_PRESETS.map((item) => {
                    const isSelected = selectedAvatarId === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedAvatarId(item.id)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          border: isSelected
                            ? '2.5px solid var(--retail-accent, #38bdf8)'
                            : '2px solid transparent',
                          padding: 2,
                          background: 'transparent',
                          cursor: 'pointer',
                          transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 0 12px rgba(56, 189, 248, 0.5)' : 'none',
                        }}
                      >
                        <ProfileAvatar avatarId={item.id} name="K" rounded="circle" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--retail-border)',
                  fontSize: 12.5,
                  color: 'var(--text-sub)',
                  lineHeight: 1.5,
                }}
              >
                {isKz
                  ? 'Егер құпия сөзді өзгерткіңіз келсе, төменде жаңа құпия сөзді енгізіп растаңыз. Бос қалдырсаңыз, ағымдағы құпия сөз өзгеріссіз қалады.'
                  : 'Если вы хотите сменить пароль от кабинета, введите новый пароль ниже. Если оставить поля пустыми, текущий пароль останется без изменений.'}
              </div>

              {/* New Password */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-sub)',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                  }}
                >
                  {isKz ? 'Жаңа құпия сөз' : 'Новый пароль'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={isKz ? 'Кемінде 6 таңба' : 'Минимум 6 символов'}
                    style={{
                      width: '100%',
                      padding: '11px 44px 11px 14px',
                      borderRadius: 12,
                      border: '1px solid var(--retail-border)',
                      background: 'var(--glass-bg)',
                      color: 'var(--text)',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
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
                    title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    <EyeIcon size={16} />
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-sub)',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                  }}
                >
                  {isKz ? 'Жаңа құпия сөзді қайталаңыз' : 'Подтвердите новый пароль'}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={isKz ? 'Құпия сөзді қайталаңыз' : 'Повторите пароль'}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--retail-border)',
                    background: 'var(--glass-bg)',
                    color: 'var(--text)',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 18,
              borderTop: '1px solid var(--retail-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
            }}
          >
            <button
              type="button"
              className="retail-btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              {isKz ? 'Бас тарту' : 'Отмена'}
            </button>
            <button
              type="submit"
              className="retail-btn-primary"
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                minWidth: 120,
                justifyContent: 'center',
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      border: '2px solid rgba(0,0,0,0.2)',
                      borderTopColor: '#080c18',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      display: 'inline-block',
                    }}
                  />
                  <span>{isKz ? 'Сақталуда...' : 'Сохранение...'}</span>
                </>
              ) : (
                <span>{isKz ? 'Сақтау' : 'Сохранить'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
