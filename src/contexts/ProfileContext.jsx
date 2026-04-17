import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { supabase } from '../utils/supabase.js'
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  loadNotificationSettings,
  saveNotificationSettings,
} from '../utils/notificationSettings.js'
import {
  DEFAULT_PRIVACY_SETTINGS,
  notifyPrivacyChanged,
  writePrivacySettings,
} from '../utils/privacySettings.js'
import {
  detectProfileConflict,
  isAlreadySynced,
  isDefaultPreferences,
  markSyncComplete,
  mergeProfiles,
} from '../utils/profileSync.js'
import SyncResolveModal from '../components/SyncResolveModal.jsx'

const ProfileContext = createContext(null)

const DEFAULT_PROFILE = {
  halal: false,
  dietGoals: [],
  allergens: [],
  customAllergens: [],
  priority: 'balanced',
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  privacy: DEFAULT_PRIVACY_SETTINGS,
}

function normalizeProfile(raw) {
  const profile = { ...DEFAULT_PROFILE, ...(raw || {}) }
  profile.notifications = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(raw?.notifications || {}),
    ...loadNotificationSettings(),
  }
  profile.privacy = { ...DEFAULT_PRIVACY_SETTINGS, ...(raw?.privacy || {}) }
  return profile
}

function loadProfileLocal() {
  try {
    const raw = localStorage.getItem('korset_profile')
    return raw ? normalizeProfile(JSON.parse(raw)) : normalizeProfile(DEFAULT_PROFILE)
  } catch {
    return normalizeProfile(DEFAULT_PROFILE)
  }
}

/** Persists profile to localStorage and syncs settings sidecars. */
function persistProfileToLocal(profile) {
  localStorage.setItem('korset_profile', JSON.stringify(profile))
  saveNotificationSettings(profile.notifications)
  writePrivacySettings(profile.privacy)
}

export function ProfileProvider({ children }) {
  const { user } = useAuth()
  const [profile, setProfileState] = useState(loadProfileLocal)

  // Sync conflict state: null = no conflict, object = awaiting user resolution
  const [syncConflict, setSyncConflict] = useState(null) // { local, cloud }
  const [syncLoading, setSyncLoading] = useState(false)

  // ─── Cloud sync on login ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setSyncConflict(null)
      return
    }

    let cancelled = false

    supabase
      .from('users')
      .select('preferences')
      .eq('auth_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return

        if (error) {
          console.warn(
            '[ProfileContext] Failed to fetch from Supabase. Keeping local cache.',
            error.message
          )
          return
        }

        const cloudRaw = data?.preferences ?? null
        const localPrefs = loadProfileLocal()

        // ── Case 1: Cloud empty (new/reset user) → upload local silently ──
        if (!cloudRaw || isDefaultPreferences(cloudRaw)) {
          supabase
            .from('users')
            .update({ preferences: localPrefs })
            .eq('auth_id', user.id)
            .then(() => {})
            .catch((err) => console.warn('[ProfileContext] Failed to upload local to cloud:', err))
          markSyncComplete(user.id)
          return
        }

        const cloudPrefs = normalizeProfile(cloudRaw)

        // ── Case 2: Local is default (fresh install) → apply cloud silently ──
        if (isDefaultPreferences(localPrefs)) {
          setProfileState(cloudPrefs)
          persistProfileToLocal(cloudPrefs)
          markSyncComplete(user.id)
          return
        }

        // ── Case 3: Already resolved for this user → cloud wins (trusted source) ──
        if (isAlreadySynced(user.id)) {
          setProfileState(cloudPrefs)
          persistProfileToLocal(cloudPrefs)
          return
        }

        // ── Case 4: Both have data, never synced → check for real conflict ──
        const { hasConflict } = detectProfileConflict(localPrefs, cloudPrefs)

        if (!hasConflict) {
          // Data is effectively equal — cloud wins, mark complete
          setProfileState(cloudPrefs)
          persistProfileToLocal(cloudPrefs)
          markSyncComplete(user.id)
          return
        }

        // ⚠️ Real conflict — show resolution modal
        setSyncConflict({ local: localPrefs, cloud: cloudPrefs })
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn(
            '[ProfileContext] Unhandled fetch error (offline?). Keeping local cache.',
            err
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [user])

  // ─── Conflict resolution ─────────────────────────────────────────────────

  const resolveSyncConflict = useCallback(
    async (resolution) => {
      if (!syncConflict || !user) return
      setSyncLoading(true)

      let finalProfile
      if (resolution === 'merge') {
        finalProfile = normalizeProfile(mergeProfiles(syncConflict.local, syncConflict.cloud))
      } else if (resolution === 'cloud') {
        finalProfile = normalizeProfile(syncConflict.cloud)
      } else {
        // 'local'
        finalProfile = normalizeProfile(syncConflict.local)
      }

      // Apply locally first (instant feedback)
      setProfileState(finalProfile)
      persistProfileToLocal(finalProfile)
      notifyPrivacyChanged()
      markSyncComplete(user.id)
      setSyncConflict(null)

      // Persist to cloud in background
      try {
        await supabase.from('users').update({ preferences: finalProfile }).eq('auth_id', user.id)
      } catch (err) {
        console.warn('[ProfileContext] Failed to persist resolved profile to cloud:', err)
        // Non-critical: local is already updated correctly
      } finally {
        setSyncLoading(false)
      }
    },
    [syncConflict, user]
  )

  /**
   * Dismiss without resolving: keeps local state for this session.
   * Sentinel is NOT written — modal reappears on next login.
   */
  const dismissSyncConflict = useCallback(() => {
    setSyncConflict(null)
  }, [])

  // ─── Standard profile update ─────────────────────────────────────────────

  const updateProfile = useCallback(
    async (nextValue) => {
      let merged
      setProfileState((prev) => {
        const resolved = typeof nextValue === 'function' ? nextValue(prev) : nextValue
        merged = normalizeProfile({
          ...prev,
          ...resolved,
          notifications: { ...prev.notifications, ...(resolved?.notifications || {}) },
          privacy: { ...prev.privacy, ...(resolved?.privacy || {}) },
        })
        localStorage.setItem('korset_profile', JSON.stringify(merged))
        saveNotificationSettings(merged.notifications)
        writePrivacySettings(merged.privacy)
        notifyPrivacyChanged()
        return merged
      })

      if (user && merged) {
        try {
          await supabase.from('users').update({ preferences: merged }).eq('auth_id', user.id)
        } catch (err) {
          console.warn('[ProfileContext] Cloud write failed (local still saved):', err?.message)
        }
      }
    },
    [user]
  )

  // ─── Cross-tab storage sync ──────────────────────────────────────────────

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'korset_profile') setProfileState(loadProfileLocal())
      if (e.key === 'korset_notification_settings') {
        setProfileState((prev) =>
          normalizeProfile({ ...prev, notifications: loadNotificationSettings() })
        )
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
      {syncConflict && (
        <SyncResolveModal
          conflict={syncConflict}
          loading={syncLoading}
          onResolve={resolveSyncConflict}
          onDismiss={dismissSyncConflict}
        />
      )}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
