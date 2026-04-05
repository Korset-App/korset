import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../utils/supabase.js'
import {
  getOrCreateDeviceId,
  readCachedProfileAvatar,
  readCachedProfileName,
  writeCachedProfileAvatar,
  writeCachedProfileName,
} from '../utils/userIdentity.js'

const AuthContext = createContext({ user: null, session: null, loading: true })

function buildFallbackName(authUser) {
  return authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || authUser?.email?.split('@')?.[0] || 'Körset User'
}

function extractMetadataAvatar(authUser) {
  return authUser?.user_metadata?.avatar_id || authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture || null
}

async function loadOrCreateUserRow(authUser, preferredName) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('auth_id', authUser.id)
    .maybeSingle()

  if (error) throw error
  if (data?.id) return data

  const deviceId = getOrCreateDeviceId()
  const { data: inserted, error: upsertError } = await supabase
    .from('users')
    .upsert({
      auth_id: authUser.id,
      device_id: deviceId,
      name: preferredName,
    }, { onConflict: 'auth_id' })
    .select('id, name')
    .maybeSingle()

  if (upsertError) throw upsertError
  if (inserted?.id) return inserted

  const { data: fallbackRow, error: fallbackError } = await supabase
    .from('users')
    .select('id, name')
    .eq('auth_id', authUser.id)
    .maybeSingle()

  if (fallbackError) throw fallbackError
  return fallbackRow || null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [internalUserId, setInternalUserId] = useState(null)
  const [displayName, setDisplayName] = useState(null)
  const [avatarId, setAvatarId] = useState(null)

  const mountedRef = useRef(true)
  const userRef = useRef(null)
  const refreshSeqRef = useRef(0)

  const clearAuthState = useCallback(() => {
    refreshSeqRef.current += 1
    userRef.current = null
    setSession(null)
    setUser(null)
    setInternalUserId(null)
    setDisplayName(null)
    setAvatarId(null)
  }, [])

  const applyProfileSnapshot = useCallback((authId, snapshot = {}) => {
    if (!authId) return
    if (snapshot.name) {
      writeCachedProfileName(authId, snapshot.name)
      setDisplayName(snapshot.name)
    }
    if (snapshot.avatarId) {
      writeCachedProfileAvatar(authId, snapshot.avatarId)
      setAvatarId(snapshot.avatarId)
    }
  }, [])

  const refreshAccountProfile = useCallback(async (authUserArg = null) => {
    const authUser = authUserArg || userRef.current || null
    const seq = ++refreshSeqRef.current

    if (!authUser) {
      if (!mountedRef.current) return null
      setInternalUserId(null)
      setDisplayName(null)
      setAvatarId(null)
      return null
    }

    const cachedName = readCachedProfileName(authUser.id)
    const cachedAvatar = readCachedProfileAvatar(authUser.id)
    const metadataName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || null
    const metadataAvatar = extractMetadataAvatar(authUser)
    const optimisticName = cachedName || metadataName || buildFallbackName(authUser)
    const optimisticAvatar = cachedAvatar || metadataAvatar || null

    if (mountedRef.current) {
      setDisplayName((prev) => prev || optimisticName)
      setAvatarId((prev) => prev || optimisticAvatar)
    }

    try {
      const row = await loadOrCreateUserRow(authUser, optimisticName)
      if (!mountedRef.current || seq !== refreshSeqRef.current) return row

      const resolvedName = row?.name || optimisticName
      const resolvedAvatar = optimisticAvatar

      setInternalUserId(row?.id || null)
      setDisplayName(resolvedName)
      setAvatarId(resolvedAvatar)
      writeCachedProfileName(authUser.id, resolvedName)
      if (resolvedAvatar) writeCachedProfileAvatar(authUser.id, resolvedAvatar)

      return row
    } catch (err) {
      console.error('Failed to resolve internal user/profile', err)
      if (!mountedRef.current || seq !== refreshSeqRef.current) return null
      setInternalUserId(null)
      setDisplayName(optimisticName)
      setAvatarId(optimisticAvatar)
      return null
    }
  }, [])

  const syncSessionState = useCallback((nextSession) => {
    userRef.current = nextSession?.user ?? null
    setSession(nextSession)
    setUser(nextSession?.user ?? null)
    setLoading(false)
  }, [])

  const logout = useCallback(async () => {
    clearAuthState()
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: 'local' }),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ])
    } catch (error) {
      console.warn('Logout warning', error)
    }
  }, [clearAuthState])

  useEffect(() => {
    mountedRef.current = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current) return
      syncSessionState(session)
      Promise.resolve().then(() => refreshAccountProfile(session?.user ?? null))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mountedRef.current) return
      syncSessionState(nextSession)
      Promise.resolve().then(() => refreshAccountProfile(nextSession?.user ?? null))
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [refreshAccountProfile, syncSessionState])

  return (
    <AuthContext.Provider value={{
      user,
      internalUserId,
      session,
      loading,
      displayName,
      avatarId,
      refreshAccountProfile,
      applyProfileSnapshot,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
