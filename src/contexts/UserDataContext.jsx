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
          const localFavsRaw = localStorage.getItem('korset_local_favorites')
          let localFavs = []
          try {
            if (localFavsRaw) localFavs = JSON.parse(localFavsRaw)
          } catch (e) {
            console.error('Failed to parse local favorites', e)
          }
          setFavoriteEans(new Set(localFavs))
          setScanCount(localCount)
          setUserDataLoaded(true)
        }
        return
      }

      setUserDataLoaded(false)

      // Sync guest favorites to cloud if any exist
      const localFavsRaw = localStorage.getItem('korset_local_favorites')
      let localFavs = []
      try {
        if (localFavsRaw) localFavs = JSON.parse(localFavsRaw)
      } catch (e) {
        console.error('Failed to parse local favorites for sync', e)
      }

      if (localFavs.length > 0) {
        try {
          const upsertRows = localFavs.map((ean) => ({
            user_id: internalUserId,
            ean,
          }))
          const { error } = await supabase
            .from('user_favorites')
            .upsert(upsertRows, { onConflict: 'user_id, ean' })
          if (error) throw error
          localStorage.removeItem('korset_local_favorites')
        } catch (err) {
          console.error('Failed to sync guest favorites to cloud', err)
        }
      }

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
      if (!product || !product.ean) return false
      const ean = product.ean

      if (!internalUserId) {
        let wasFavorite = false
        setFavoriteEans((prev) => {
          wasFavorite = prev.has(ean)
          const next = new Set(prev)
          if (wasFavorite) next.delete(ean)
          else next.add(ean)
          localStorage.setItem('korset_local_favorites', JSON.stringify(Array.from(next)))
          return next
        })
        return true
      }

      if (togglingRef.current.has(ean)) return false
      togglingRef.current.add(ean)

      let wasFavorite = false
      setFavoriteEans((prev) => {
        wasFavorite = prev.has(ean)
        const next = new Set(prev)
        if (wasFavorite) next.delete(ean)
        else next.add(ean)
        return next
      })

      try {
        if (!wasFavorite) {
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
          if (wasFavorite) next.add(ean)
          else next.delete(ean)
          return next
        })
        return false
      } finally {
        togglingRef.current.delete(ean)
      }
      return true
    },
    [internalUserId]
  )

  const syncScanCount = useCallback(() => {
    setScanCount((prev) => Math.max(prev, getScopedLocalScanCount(user)))
  }, [user])

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
  }, [user, syncScanCount])

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
