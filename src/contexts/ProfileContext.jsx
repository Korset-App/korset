import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { supabase } from '../utils/supabase.js'
import { DEFAULT_NOTIFICATION_SETTINGS, normalizeNotificationSettings } from '../utils/notificationSettings.js'

const ProfileContext = createContext(null)

const DEFAULT_PROFILE = {
  halal: false,
  dietGoals: [],
  allergens: [],
  customAllergens: [],
  priority: 'balanced', // 'balanced', 'price', 'quality'
  notifications: { ...DEFAULT_NOTIFICATION_SETTINGS }
}

function loadProfileLocal() {
  try {
    const raw = localStorage.getItem('korset_profile')
    if (!raw) return DEFAULT_PROFILE
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      notifications: normalizeNotificationSettings(parsed?.notifications),
    }
  } catch {
    return DEFAULT_PROFILE
  }
}

export function ProfileProvider({ children }) {
  const { user } = useAuth()
  const [profile, setProfileState] = useState(loadProfileLocal)

  // Загрузка настроек с сервера при входе в аккаунт
  useEffect(() => {
    if (!user) return
    supabase.from('users').select('preferences').eq('auth_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!error && data?.preferences) {
          const mergedPrefs = { ...DEFAULT_PROFILE, ...data.preferences, notifications: normalizeNotificationSettings(data.preferences?.notifications) }
          setProfileState(mergedPrefs)
          localStorage.setItem('korset_profile', JSON.stringify(mergedPrefs))
        }
      })
  }, [user])

  // Обновление: пишем в стейт, localStorage, и если есть юзер — в Supabase
  const updateProfile = async (newProfile) => {
    let merged
    setProfileState(prev => {
      merged = { ...prev, ...newProfile, notifications: normalizeNotificationSettings(newProfile?.notifications ?? prev?.notifications) }
      localStorage.setItem('korset_profile', JSON.stringify(merged))
      return merged
    })
    
    if (user && merged) {
      await supabase.from('users').update({ preferences: merged }).eq('auth_id', user.id)
    }
  }

  // Слушаем изменения localStorage из других вкладок
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'korset_profile') {
        setProfileState(loadProfileLocal())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
