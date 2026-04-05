import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../utils/supabase.js'
import { useAuth } from './AuthContext.jsx'
import { buildHistoryOwnerKey, getLocalScanHistoryCount, SCAN_HISTORY_STORAGE_KEY } from '../utils/localHistory.js'
import { PRIVACY_EVENT } from '../utils/privacySettings.js'

const UserDataContext = createContext()

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

      try {
        const [{ data: favs }, scanRes] = await Promise.all([
          supabase.from('user_favorites').select('ean').eq('user_id', internalUserId),
          supabase.from('scan_events').select('ean', { count: 'exact', head: true }).eq('user_id', internalUserId),
        ])

        if (cancelled) return

        setFavoriteEans(new Set((favs || []).map((item) => item.ean).filter(Boolean)))
        setScanCount(Math.max(scanRes?.count || 0, localCount))
      } catch (err) {
        console.error('Failed to load user data cache', err)
        if (!cancelled) setScanCount(localCount)
      } finally {
        if (!cancelled) setUserDataLoaded(true)
      }
    }

    loadIdentifiers()
    return () => {
      cancelled = true
    }
  }, [user, internalUserId])

  const checkIsFavorite = (ean) => {
    if (!ean) return false
    return favoriteEans.has(ean)
  }

  const toggleFavorite = async (product) => {
    if (!internalUserId) {
      alert('Не удалось загрузить ваш профиль. Попробуйте перезайти в аккаунт.')
      return
    }
    if (!product || !product.ean) return

    const ean = product.ean
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
        const validGlobalId = candidateGlobalId && uuidRegex.test(candidateGlobalId) ? candidateGlobalId : null

        const { error } = await supabase.from('user_favorites').upsert({
          user_id: internalUserId,
          global_product_id: validGlobalId,
          ean,
        }, { onConflict: 'user_id, ean' })

        if (error) throw error
      } else {
        const { error } = await supabase.from('user_favorites').delete().eq('user_id', internalUserId).eq('ean', ean)
        if (error) throw error
      }
    } catch (err) {
      console.error('Toggle favorite failed', err)
      alert('Ошибка базы данных: ' + err.message)
      setFavoriteEans((prev) => {
        const next = new Set(prev)
        if (isFav) next.add(ean)
        else next.delete(ean)
        return next
      })
      throw err
    }
  }

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
    <UserDataContext.Provider value={{
      favoriteEans,
      checkIsFavorite,
      toggleFavorite,
      favoritesCount: favoriteEans.size,
      scanCount,
      incrementScanCount: syncScanCount,
      userDataLoaded,
    }}>
      {children}
    </UserDataContext.Provider>
  )
}

export const useUserData = () => useContext(UserDataContext)
