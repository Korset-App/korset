import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { getCatalogCacheAge, getPendingScansCount, flushPendingScans } from '../utils/offlineDB.js'
import { supabase } from '../utils/supabase.js'

const CACHE_STALE_MS = 7 * 24 * 60 * 60 * 1000

const OfflineContext = createContext(null)

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [cacheAge, setCacheAge] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const flushIntervalRef = useRef(null)

  const refreshCacheAge = useCallback(async () => {
    const ts = await getCatalogCacheAge()
    setCacheAge(ts)
  }, [])

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingScansCount()
    setPendingCount(count)
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      flushPendingScans(supabase).then(() => refreshPendingCount())
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [refreshPendingCount])

  useEffect(() => {
    refreshCacheAge()
    refreshPendingCount()

    flushIntervalRef.current = setInterval(() => {
      if (navigator.onLine) {
        getPendingScansCount().then((count) => {
          if (count > 0) {
            flushPendingScans(supabase).then(() => refreshPendingCount())
          }
        })
      }
    }, 30000)

    return () => {
      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current)
    }
  }, [refreshCacheAge, refreshPendingCount])

  const [cacheStale, setCacheStale] = useState(false)

  useEffect(() => {
    if (!cacheAge) {
      setCacheStale(false)
      return
    }
    const stale = Date.now() - cacheAge > CACHE_STALE_MS
    setCacheStale(stale)
  }, [cacheAge])

  const formatCacheAge = useCallback(() => {
    if (!cacheAge) return null
    const diffMs = Date.now() - cacheAge
    const minutes = Math.floor(diffMs / 60000)
    if (minutes < 1) return 'только что'
    if (minutes < 60) return `${minutes} мин назад`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}ч назад`
    const days = Math.floor(hours / 24)
    return `${days}д назад`
  }, [cacheAge])

  const value = {
    isOnline,
    cacheAge,
    cacheStale,
    pendingCount,
    formatCacheAge,
    refreshCacheAge,
    refreshPendingCount,
  }

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
}

export function useOffline() {
  return useContext(OfflineContext)
}
