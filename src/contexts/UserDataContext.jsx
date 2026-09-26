import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../utils/supabase.js'
import { useAuth } from './AuthContext.jsx'
import { useStoreId } from './StoreContext.jsx'
import {
  getStoreShoppingList,
  readGuestShoppingLists,
  toggleStoreShoppingItem,
  writeGuestShoppingLists,
} from '../utils/shoppingLists.js'
import {
  buildHistoryOwnerKey,
  filterLocalScanHistoryByStore,
  readLocalScanHistory,
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

function getScopedLocalScanCount(user, storeId) {
  if (!storeId) return 0
  return filterLocalScanHistoryByStore(readLocalScanHistory(buildHistoryOwnerKey(user)), storeId)
    .length
}

function getScopedLocalScanEans(user, storeId) {
  if (!storeId) return new Set()
  return new Set(
    filterLocalScanHistoryByStore(readLocalScanHistory(buildHistoryOwnerKey(user)), storeId).map(
      (item) => item.ean
    )
  )
}

async function getRemoteScanEans(userId, storeId) {
  const eans = new Set()
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from('scan_events')
      .select('ean')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .order('id')
      .range(from, from + 499)
    if (error) throw error
    for (const row of data || []) if (row.ean) eans.add(row.ean)
    if (!data || data.length < 500) return eans
  }
}

export function UserDataProvider({ children }) {
  const { user, internalUserId } = useAuth()
  const storeId = useStoreId()
  const [favoriteEans, setFavoriteEans] = useState(new Set())
  const [favoriteScopeId, setFavoriteScopeId] = useState(null)
  const favoriteEansRef = useRef(new Set())
  const favoriteScopeRef = useRef(null)
  const [scanCount, setScanCount] = useState(0)
  const remoteScanEansRef = useRef({ storeId: null, eans: new Set() })
  const [userDataLoaded, setUserDataLoaded] = useState(false)
  const [shoppingListLoadError, setShoppingListLoadError] = useState(false)
  const [shoppingListReloadVersion, setShoppingListReloadVersion] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadIdentifiers() {
      const localEans = getScopedLocalScanEans(user, storeId)
      const localCount = localEans.size
      setShoppingListLoadError(false)

      if (!user || !internalUserId) {
        if (!cancelled) {
          const guestEans = new Set(getStoreShoppingList(readGuestShoppingLists(), storeId))
          favoriteEansRef.current = guestEans
          favoriteScopeRef.current = storeId
          setFavoriteEans(guestEans)
          setFavoriteScopeId(storeId)
          setScanCount(localCount)
          remoteScanEansRef.current = { storeId, eans: new Set() }
          setUserDataLoaded(true)
        }
        return
      }

      setUserDataLoaded(false)

      const guestLists = readGuestShoppingLists()
      const guestRows = Object.keys(guestLists).flatMap((guestStoreId) =>
        getStoreShoppingList(guestLists, guestStoreId).map((ean) => ({
          user_id: internalUserId,
          store_id: guestStoreId,
          ean,
        }))
      )
      if (guestRows.length > 0) {
        try {
          const { error } = await supabase
            .from('store_shopping_items')
            .upsert(guestRows, { onConflict: 'user_id,store_id,ean' })
          if (error) throw error
          writeGuestShoppingLists({})
        } catch (err) {
          console.error('Failed to sync guest shopping lists to cloud', err)
        }
      }

      const [favRes, scanRes] = await Promise.allSettled([
        withTimeout(
          storeId
            ? supabase
                .from('store_shopping_items')
                .select('ean')
                .eq('user_id', internalUserId)
                .eq('store_id', storeId)
            : Promise.resolve({ data: [] }),
          5000
        ),
        withTimeout(
          storeId ? getRemoteScanEans(internalUserId, storeId) : Promise.resolve(new Set()),
          5000
        ),
      ])

      if (cancelled) return

      const favoriteList =
        favRes.status === 'fulfilled' && !favRes.value?.error
          ? new Set((favRes.value?.data || []).map((item) => item.ean).filter(Boolean))
          : new Set()
      setShoppingListLoadError(favRes.status !== 'fulfilled' || Boolean(favRes.value?.error))

      const remoteEans = scanRes.status === 'fulfilled' ? scanRes.value : new Set()
      remoteScanEansRef.current = { storeId, eans: remoteEans }

      favoriteEansRef.current = favoriteList
      favoriteScopeRef.current = storeId
      setFavoriteEans(favoriteList)
      setFavoriteScopeId(storeId)
      setScanCount(new Set([...remoteEans, ...localEans]).size)
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
        setShoppingListLoadError(true)
        setScanCount(getScopedLocalScanCount(user, storeId))
        setUserDataLoaded(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user, internalUserId, storeId, shoppingListReloadVersion])

  const reloadShoppingList = useCallback(
    () => setShoppingListReloadVersion((value) => value + 1),
    []
  )

  const activeFavoriteEans = favoriteScopeId === storeId ? favoriteEans : new Set()

  const checkIsFavorite = (ean) => {
    if (!ean) return false
    return activeFavoriteEans.has(ean)
  }

  const togglingRef = useRef(new Set())

  const toggleFavorite = useCallback(
    async (product) => {
      if (
        !product ||
        !product.ean ||
        !storeId ||
        favoriteScopeId !== storeId ||
        shoppingListLoadError
      )
        return false
      const ean = product.ean
      const operationKey = `${storeId}:${ean}`
      if (togglingRef.current.has(operationKey)) return false
      togglingRef.current.add(operationKey)
      const wasFavorite = favoriteEansRef.current.has(ean)
      const next = new Set(favoriteEansRef.current)
      if (wasFavorite) next.delete(ean)
      else next.add(ean)
      favoriteEansRef.current = next
      setFavoriteEans(next)

      if (!internalUserId) {
        try {
          writeGuestShoppingLists(toggleStoreShoppingItem(readGuestShoppingLists(), storeId, ean))
          return true
        } catch (err) {
          console.error('Guest shopping list save failed', err)
          favoriteEansRef.current = new Set(favoriteEansRef.current)
          if (wasFavorite) favoriteEansRef.current.add(ean)
          else favoriteEansRef.current.delete(ean)
          setFavoriteEans(favoriteEansRef.current)
          return false
        } finally {
          togglingRef.current.delete(operationKey)
        }
      }

      try {
        if (!wasFavorite) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          const candidateGlobalId =
            product?.globalProductId || product?.sourceMeta?.globalProductId || null
          const validGlobalId =
            candidateGlobalId && uuidRegex.test(candidateGlobalId) ? candidateGlobalId : null

          const { error } = await supabase.from('store_shopping_items').upsert(
            {
              user_id: internalUserId,
              store_id: storeId,
              global_product_id: validGlobalId,
              ean,
            },
            { onConflict: 'user_id,store_id,ean' }
          )

          if (error) throw error
        } else {
          const { error } = await supabase
            .from('store_shopping_items')
            .delete()
            .eq('user_id', internalUserId)
            .eq('store_id', storeId)
            .eq('ean', ean)
          if (error) throw error
        }
      } catch (err) {
        console.error('Toggle favorite failed', err)
        if (favoriteScopeRef.current === storeId) {
          const reverted = new Set(favoriteEansRef.current)
          if (wasFavorite) reverted.add(ean)
          else reverted.delete(ean)
          favoriteEansRef.current = reverted
          setFavoriteEans(reverted)
        }
        return false
      } finally {
        togglingRef.current.delete(operationKey)
      }
      return true
    },
    [internalUserId, storeId, favoriteScopeId, shoppingListLoadError]
  )

  const syncScanCount = useCallback(() => {
    const remoteEans =
      remoteScanEansRef.current.storeId === storeId ? remoteScanEansRef.current.eans : new Set()
    setScanCount(new Set([...remoteEans, ...getScopedLocalScanEans(user, storeId)]).size)
  }, [user, storeId])

  useEffect(() => {
    const handleScanAdded = (event) => {
      const ownerKey = buildHistoryOwnerKey(user)
      if (event?.detail?.ownerKey && event.detail.ownerKey !== ownerKey) return
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
        favoriteEans: activeFavoriteEans,
        checkIsFavorite,
        toggleFavorite,
        favoritesCount: activeFavoriteEans.size,
        scanCount,
        incrementScanCount: syncScanCount,
        userDataLoaded,
        shoppingListLoadError,
        shoppingListReady: Boolean(
          storeId && favoriteScopeId === storeId && userDataLoaded && !shoppingListLoadError
        ),
        reloadShoppingList,
      }}
    >
      {children}
    </UserDataContext.Provider>
  )
}

export const useUserData = () => useContext(UserDataContext)
