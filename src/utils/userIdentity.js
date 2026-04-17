import { supabase } from './supabase.js'

function getOrCreateLocalId(storage, key, prefix) {
  try {
    let value = storage.getItem(key)
    if (!value) {
      value = `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
      storage.setItem(key, value)
    }
    return value
  } catch {
    return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  }
}

export function getOrCreateDeviceId() {
  return getOrCreateLocalId(localStorage, 'korset_device_id', 'dev')
}

export function getOrCreateSessionId() {
  return getOrCreateLocalId(sessionStorage, 'korset_session_id', 'ses')
}

export async function resolveCurrentAuthUser() {
  try {
    const { data } = await supabase.auth.getUser()
    return data?.user || null
  } catch {
    return null
  }
}

export async function resolveInternalUserIdForAuthUser(authUser, { ensureRow = false } = {}) {
  if (!authUser?.id) return null

  try {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .maybeSingle()

    if (data?.id) return data.id
    if (!ensureRow) return null

    const deviceId = getOrCreateDeviceId()
    const fallbackName =
      authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email || 'User'

    const { data: inserted, error } = await supabase
      .from('users')
      .upsert(
        {
          auth_id: authUser.id,
          device_id: deviceId,
          name: fallbackName,
        },
        { onConflict: 'auth_id' }
      )
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('Failed to create users row:', error.message, error.details || error.hint)
      return null
    }

    return inserted?.id || null
  } catch (error) {
    console.error('Failed to resolve internal user id', error)
    return null
  }
}

export async function resolveCurrentInternalUserId(options = {}) {
  const authUser = await resolveCurrentAuthUser()
  return resolveInternalUserIdForAuthUser(authUser, options)
}

export function getProfileNameCacheKey(authId) {
  return authId ? `korset_profile_name_${authId}` : null
}

export function getProfileAvatarCacheKey(authId) {
  return authId ? `korset_profile_avatar_${authId}` : null
}

export function readCachedProfileName(authId) {
  try {
    const key = getProfileNameCacheKey(authId)
    return key ? localStorage.getItem(key) : null
  } catch {
    return null
  }
}

export function writeCachedProfileName(authId, name) {
  try {
    const key = getProfileNameCacheKey(authId)
    if (!key) return
    if (name) {
      localStorage.setItem(key, name)
    } else {
      localStorage.removeItem(key)
    }
  } catch {
    /* quota exceeded */
  }
}

export function readCachedProfileAvatar(authId) {
  try {
    const key = getProfileAvatarCacheKey(authId)
    return key ? localStorage.getItem(key) : null
  } catch {
    return null
  }
}

export function writeCachedProfileAvatar(authId, avatarId) {
  try {
    const key = getProfileAvatarCacheKey(authId)
    if (!key) return
    if (avatarId) {
      localStorage.setItem(key, avatarId)
    } else {
      localStorage.removeItem(key)
    }
  } catch {
    /* quota exceeded */
  }
}
