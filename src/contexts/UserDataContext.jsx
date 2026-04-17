import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../utils/supabase.js'
import { useAuth } from './AuthContext.jsx'
import {
  buildHistoryOwnerKey,
  getLocalScanHistoryCount,
  SCAN_HISTORY_STORAGE_KEY,
  syncScanHistoryWithCloud,
} from '../utils/localHistory.js'
import { PRIVACY_EVENT } from '../utils/privacySettings.js'

const UserDataContext = createContext()

function withTimeout(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

function getScopedLocalScanCount(user) {
  return getLocalScanHistoryCount(buildHistoryOwnerKey(user))
}

export function UserDataProvider({ children }) {
  const { user, internalUserId } = useAuth()
  const [favoriteEans, setFavoriteEans] = useState(new Set())
  const [scanCount, setScanCount] = useState(0)
  const [userDataLoaded, setUserDataLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadIdentifiers() {
      const localCount = getScopedLocalScanCount(user)

      if (!user || !internalUserId) {
        if (!cancelled) {
          setFavoriteEans(new Set())
          setScanCount(localCount)
          setUserDataLoaded(true)
        }
        return
      }

      setUserDataLoaded(false)

      const [favRes, scanRes] = await Promise.allSettled([
        withTimeout(
          supabase.from('user_favorites').select('ean').eq('user_id', internalUserId),
          5000
        ),
        withTimeout(
          supabase
            .from('scan_events')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', internalUserId),
          5000
        ),
      ])

      if (cancelled) return

      const favoriteList =
        favRes.status === 'fulfilled' && !favRes.value?.error
          ? new Set((favRes.value?.data || []).map((item) => item.ean).filter(Boolean))
          : new Set()

      const remoteCount =
        scanRes.status === 'fulfilled' && !scanRes.value?.error ? scanRes.value?.count || 0 : 0

      setFavoriteEans(favoriteList)
      setScanCount(Math.max(remoteCount, localCount))
      setUserDataLoaded(true)

      // Fire-and-forget: sync scan history in background.
      // Migrates guest scans, uploads to cloud, downloads cloud-only entries.
      syncScanHistoryWithCloud(internalUserId, user).catch((err) => {
        console.warn('[UserDataContext] History sync failed silently:', err)
      })
    }

    loadIdentifiers().catch((err) => {
      console.error('Failed to load user data cache', err)
      if (!cancelled) {
        setScanCount(getScopedLocalScanCount(user))
        setUserDataLoaded(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user, internalUserId])

  const checkIsFavorite = (ean) => {
    if (!ean) return false
    return favoriteEans.has(ean)
  }

  const togglingRef = useRef(new Set())

  const toggleFavorite = useCallback(
    async (product) => {
      if (!internalUserId) return
      if (!product || !product.ean) return

      const ean = product.ean
      if (togglingRef.current.has(ean)) return
      togglingRef.current.add(ean)

      const isFav = favoriteEans.has(ean)

      setFavoriteEans((prev) => {
        const next = new Set(prev)
        if (isFav) next.delete(ean)
        else next.add(ean)
        return next
      })

      try {
        if (!isFav) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          const candidateGlobalId = product?.sourceMeta?.globalProductId || product?.id || null
          const validGlobalId =
            candidateGlobalId && uuidRegex.test(candidateGlobalId) ? candidateGlobalId : null

          const { error } = await supabase.from('user_favorites').upsert(
            {
              user_id: internalUserId,
              global_product_id: validGlobalId,
              ean,
            },
            { onConflict: 'user_id, ean' }
          )

          if (error) throw error
        } else {
          const { error } = await supabase
            .from('user_favorites')
            .delete()
            .eq('user_id', internalUserId)
            .eq('ean', ean)
          if (error) throw error
        }
      } catch (err) {
        console.error('Toggle favorite failed', err)
        setFavoriteEans((prev) => {
          const next = new Set(prev)
          if (isFav) next.add(ean)
          else next.delete(ean)
          return next
        })
      } finally {
        togglingRef.current.delete(ean)
      }
    },
    [internalUserId, favoriteEans]
  )

  const syncScanCount = () => {
    setScanCount((prev) => Math.max(prev, getScopedLocalScanCount(user)))
  }

  useEffect(() => {
    const handleScanAdded = (event) => {
      const ownerKey = buildHistoryOwnerKey(user)
      if (event?.detail?.ownerKey && event.detail.ownerKey !== ownerKey) return
      if (typeof event?.detail?.count === 'number') {
        setScanCount((prev) => Math.max(prev, event.detail.count))
        return
      }
      syncScanCount()
    }

    const handleStorage = (event) => {
      if (!event || event.key === SCAN_HISTORY_STORAGE_KEY) syncScanCount()
    }

    const handleFocus = () => syncScanCount()

    window.addEventListener('korset:scan_added', handleScanAdded)
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', handleFocus)
    window.addEventListener(PRIVACY_EVENT, handleFocus)

    return () => {
      window.removeEventListener('korset:scan_added', handleScanAdded)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener(PRIVACY_EVENT, handleFocus)
    }
  }, [user])

  return (
    <UserDataContext.Provider
      value={{
        favoriteEans,
        checkIsFavorite,
        toggleFavorite,
        favoritesCount: favoriteEans.size,
        scanCount,
        incrementScanCount: syncScanCount,
        userDataLoaded,
      }}
    >
      {children}
    </UserDataContext.Provider>
  )
}

export const useUserData = () => useContext(UserDataContext)
