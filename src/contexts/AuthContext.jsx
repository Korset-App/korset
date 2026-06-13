import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../utils/supabase.js'
import {
  getOrCreateDeviceId,
  readCachedProfileAvatar,
  readCachedProfileBanner,
  readCachedProfileName,
  writeCachedProfileAvatar,
  writeCachedProfileBanner,
  writeCachedProfileName,
} from '../utils/userIdentity.js'

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  isSuperadmin: false,
})

// Читает admin-флаг из app_metadata (JWT claim, модифицируется ТОЛЬКО service_role).
// НЕ используем user_metadata — оно модифицируемо самим юзером и не является источником истины.
// Синхронизация users.is_admin → app_metadata делается в supabase/migrations/021.
function extractIsAdmin(authUser) {
  return Boolean(authUser?.app_metadata?.is_admin)
}

function extractIsSuperadmin(authUser) {
  return Boolean(authUser?.app_metadata?.is_superadmin)
}

function buildFallbackName(authUser) {
  return (
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    authUser?.email?.split('@')?.[0] ||
    'Körset User'
  )
}

function extractMetadataAvatar(authUser) {
  return (
    authUser?.user_metadata?.avatar_id ||
    authUser?.user_metadata?.avatar_url ||
    authUser?.user_metadata?.picture ||
    null
  )
}

// Select extended profile columns; gracefully falls back if migration 016 not yet applied.
async function selectUserRow(authId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, avatar_id, banner_url')
    .eq('auth_id', authId)
    .maybeSingle()
  if (error) {
    // Column does not exist (migration 016 not applied) — retry minimal select.
    if (/column .* does not exist/i.test(error.message || '')) {
      const fallback = await supabase
        .from('users')
        .select('id, name')
        .eq('auth_id', authId)
        .maybeSingle()
      if (fallback.error) throw fallback.error
      return fallback.data || null
    }
    throw error
  }
  return data
}

async function loadOrCreateUserRow(authUser, preferredName) {
  const existing = await selectUserRow(authUser.id)
  if (existing?.id) return existing

  const deviceId = getOrCreateDeviceId()
  const { data: inserted, error: upsertError } = await supabase
    .from('users')
    .upsert(
      {
        auth_id: authUser.id,
        device_id: deviceId,
        name: preferredName,
      },
      { onConflict: 'auth_id' }
    )
    .select('id, name')
    .maybeSingle()

  if (upsertError) throw upsertError
  if (inserted?.id) return inserted

  return (await selectUserRow(authUser.id)) || null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [internalUserId, setInternalUserId] = useState(null)
  const [displayName, setDisplayName] = useState(null)
  const [avatarId, setAvatarId] = useState(null)
  const [bannerUrl, setBannerUrl] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperadmin, setIsSuperadmin] = useState(false)

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
    setBannerUrl(null)
    setIsAdmin(false)
    setIsSuperadmin(false)
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
    if (Object.prototype.hasOwnProperty.call(snapshot, 'bannerUrl')) {
      writeCachedProfileBanner(authId, snapshot.bannerUrl)
      setBannerUrl(snapshot.bannerUrl || null)
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
      setBannerUrl(null)
      return null
    }

    const cachedName = readCachedProfileName(authUser.id)
    const cachedAvatar = readCachedProfileAvatar(authUser.id)
    const cachedBanner = readCachedProfileBanner(authUser.id)
    const metadataName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || null
    const metadataAvatar = extractMetadataAvatar(authUser)
    const metadataBanner = authUser.user_metadata?.banner_url || null
    const optimisticName = cachedName || metadataName || buildFallbackName(authUser)
    const optimisticAvatar = cachedAvatar || metadataAvatar || null
    const optimisticBanner = cachedBanner || metadataBanner || null

    if (mountedRef.current) {
      setDisplayName((prev) => prev || optimisticName)
      setAvatarId((prev) => prev || optimisticAvatar)
      setBannerUrl((prev) => prev || optimisticBanner)
    }

    try {
      const row = await loadOrCreateUserRow(authUser, optimisticName)
      if (!mountedRef.current || seq !== refreshSeqRef.current) return row

      const resolvedName = row?.name || optimisticName
      const resolvedAvatar = row?.avatar_id || optimisticAvatar
      const resolvedBanner = row?.banner_url || optimisticBanner

      setInternalUserId(row?.id || null)
      setDisplayName(resolvedName)
      setAvatarId(resolvedAvatar)
      setBannerUrl(resolvedBanner)
      writeCachedProfileName(authUser.id, resolvedName)
      if (resolvedAvatar) writeCachedProfileAvatar(authUser.id, resolvedAvatar)
      if (resolvedBanner) writeCachedProfileBanner(authUser.id, resolvedBanner)

      return row
    } catch (err) {
      console.error('Failed to resolve internal user/profile', err)
      if (!mountedRef.current || seq !== refreshSeqRef.current) return null
      setInternalUserId(null)
      setDisplayName(optimisticName)
      setAvatarId(optimisticAvatar)
      setBannerUrl(optimisticBanner)
      return null
    }
  }, [])

  const syncSessionState = useCallback((nextSession) => {
    userRef.current = nextSession?.user ?? null
    setSession(nextSession)
    setUser(nextSession?.user ?? null)
    setIsAdmin(extractIsAdmin(nextSession?.user))
    setIsSuperadmin(extractIsSuperadmin(nextSession?.user))
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

    let cancelled = false

    Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('getSession_timeout')), 8000)),
    ])
      .then(({ data: { session } }) => {
        if (!mountedRef.current || cancelled) return
        syncSessionState(session)
        Promise.resolve().then(() => refreshAccountProfile(session?.user ?? null))
      })
      .catch((err) => {
        if (!mountedRef.current || cancelled) return
        console.warn('[AuthContext] getSession failed or timed out:', err?.message)
        syncSessionState(null)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mountedRef.current || cancelled) return
      syncSessionState(nextSession)
      Promise.resolve().then(() => refreshAccountProfile(nextSession?.user ?? null))
    })

    return () => {
      mountedRef.current = false
      cancelled = true
      subscription.unsubscribe()
    }
  }, [refreshAccountProfile, syncSessionState])

  return (
    <AuthContext.Provider
      value={{
        user,
        internalUserId,
        session,
        loading,
        displayName,
        avatarId,
        bannerUrl,
        isAdmin,
        isSuperadmin,
        refreshAccountProfile,
        applyProfileSnapshot,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
