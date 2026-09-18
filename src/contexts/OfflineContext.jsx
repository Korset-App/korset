import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { getCatalogCacheAge, getPendingScansCount, flushPendingScans } from '../utils/offlineDB.js'
import { supabase } from '../utils/supabase.js'
import {
  isCacheStale as checkCacheStale,
  formatCacheAge as formatCacheAgeDomain,
} from '../domain/offline/offlineStatus.js'

const OfflineContext = createContext(null)

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [wasOffline, setWasOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )
  const [justRestored, setJustRestored] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [cacheAge, setCacheAge] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)

  const flushIntervalRef = useRef(null)
  const restoreTimerRef = useRef(null)

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
      if (wasOffline) {
        setJustRestored(true)
        if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current)
        restoreTimerRef.current = setTimeout(() => {
          setJustRestored(false)
          setWasOffline(false)
        }, 3000)
      }
      flushPendingScans(supabase).then(() => refreshPendingCount())
      refreshCacheAge()
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      setJustRestored(false)
      if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current)
    }
  }, [wasOffline, refreshPendingCount, refreshCacheAge])

  const checkConnection = useCallback(async () => {
    setIsChecking(true)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false)
      setWasOffline(true)
      setIsChecking(false)
      return false
    }
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3500)
      const res = await fetch('/favicon.ico?_t=' + Date.now(), {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const online = res.ok || res.status < 500
      setIsOnline(online)
      if (online) {
        if (wasOffline) {
          setJustRestored(true)
          if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current)
          restoreTimerRef.current = setTimeout(() => {
            setJustRestored(false)
            setWasOffline(false)
          }, 3000)
        }
        flushPendingScans(supabase).then(() => refreshPendingCount())
        refreshCacheAge()
      } else {
        setWasOffline(true)
      }
      setIsChecking(false)
      return online
    } catch {
      setIsOnline(false)
      setWasOffline(true)
      setIsChecking(false)
      return false
    }
  }, [wasOffline, refreshPendingCount, refreshCacheAge])

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
    setCacheStale(checkCacheStale(cacheAge))
  }, [cacheAge])

  const formatCacheAge = useCallback((t = null) => formatCacheAgeDomain(cacheAge, t), [cacheAge])

  const value = {
    isOnline,
    wasOffline,
    justRestored,
    isChecking,
    checkConnection,
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
