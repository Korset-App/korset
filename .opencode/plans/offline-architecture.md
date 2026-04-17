# KÖRSET — Офлайн-модуль: Полный план реализации

> Дата: 2026-04-17
> Статус: Утверждён, ожидает выхода из plan-mode

---

## Утверждённые решения

- Сценарий: онлайн → потом офлайн (кэшируем при входе в магазин)
- Объём кэша: ВСЕ товары текущего магазина (~3000), БЕЗ картинок, ~9MB IndexedDB
- Картинки: НЕ кэшируются в V1 (серые placeholder'ы)
- Не найден офлайн: жёлтый "Офлайн, данных нет"
- Fit-Check офлайн: работает + метка "из кэша (Xч назад)"
- Свежесть кэша: 7 дней, потом пометка "устарел"
- Очередь сканов: 100 FIFO, Background Sync API + fallback
- App Shell: Workbox precache (vite-plugin-pwa, injectManifest)
- Сжатие фото: Агрессивное WebP 80% — будущее, не V1
- V1 scope: только продуктовые магазины
- products.json: НЕ участвует

---

## Шаг 1: src/utils/offlineDB.js — НОВЫЙ файл

IndexedDB wrapper с тремя Object Stores: store_catalog, store_meta, pending_scans.

Зависимости: `idb` (установлен)

Ключевые функции:

- `saveCatalogToIndexedDB(products, storeId)` — записать каталог, инвалидирует при смене магазина
- `getProductFromIndexedDB(ean)` — лукуп одного товара
- `getCatalogFromIndexedDB()` — весь каталог
- `getCatalogCacheAge()` — timestamp кэша для UI метки
- `addPendingScan(scanData)` — добавить в очередь, FIFO лимит 100
- `getPendingScans()` — получить все pending/failed записи
- `flushPendingScans(supabaseClient)` — batch INSERT в Supabase, удалить из очереди
- `clearCatalog()` — стереть кэш

```js
import { openDB } from 'idb'

const DB_NAME = 'korset-offline-db'
const DB_VERSION = 1
const STORE_CATALOG = 'store_catalog'
const STORE_META = 'store_meta'
const STORE_PENDING_SCANS = 'pending_scans'
let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_CATALOG)) {
          const catalogStore = db.createObjectStore(STORE_CATALOG, { keyPath: 'ean' })
          catalogStore.createIndex('store_id', 'store_id')
          catalogStore.createIndex('category', 'category')
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains(STORE_PENDING_SCANS)) {
          const scanStore = db.createObjectStore(STORE_PENDING_SCANS, {
            keyPath: 'id',
            autoIncrement: true,
          })
          scanStore.createIndex('created_at', 'created_at')
          scanStore.createIndex('status', 'status')
        }
      },
    })
  }
  return dbPromise
}

export async function saveCatalogToIndexedDB(products, storeId) {
  if (!Array.isArray(products) || products.length === 0) return
  const db = await getDB()
  const tx = db.transaction(STORE_CATALOG, 'readwrite')
  const store = tx.objectStore(STORE_CATALOG)
  const existing = await store.getAll()
  const existingStoreId = existing.length > 0 ? existing[0].store_id : null
  if (existingStoreId && existingStoreId !== storeId) {
    await store.clear()
  }
  for (const product of products) {
    if (!product.ean) continue
    await store.put({
      ean: String(product.ean),
      store_id: storeId,
      name: product.name || null,
      name_kz: product.name_kz || null,
      brand: product.brand || null,
      category: product.category || null,
      subcategory: product.subcategory || null,
      ingredients: product.ingredients || product.ingredients_raw || null,
      ingredients_kz: product.ingredients_kz || null,
      allergens: product.allergens || [],
      dietTags: product.dietTags || product.diet_tags || [],
      halalStatus: product.halalStatus || product.halal_status || 'unknown',
      nutriscore: product.nutriscore || null,
      nutritionPer100:
        product.nutritionPer100 || product.nutriments_json || product.nutriments || {},
      image: product.image || product.image_url || null,
      manufacturer: product.manufacturer || null,
      countryOfOrigin: product.countryOfOrigin || product.country_of_origin || null,
      priceKzt: product.priceKzt || product.price_kzt || null,
      shelf: product.shelf || product.shelf_zone || null,
      stockStatus: product.stockStatus || product.stock_status || null,
      canonicalId: product.canonicalId || null,
      globalProductId: product.globalProductId || product.global_product_id || null,
      storeProductId: product.storeProductId || product.store_product_id || null,
      source: product.source || 'cache',
    })
  }
  await tx.done
  const metaTx = db.transaction(STORE_META, 'readwrite')
  const metaStore = metaTx.objectStore(STORE_META)
  await metaStore.put({ key: 'current_store_id', value: storeId })
  await metaStore.put({ key: 'catalog_cached_at', value: Date.now() })
  await metaStore.put({
    key: 'store_slug',
    value: products[0]?.storeSlug || products[0]?.slug || null,
  })
  await metaStore.put({ key: 'store_name', value: products[0]?.storeName || null })
  await metaTx.done
}

export async function getCatalogFromIndexedDB() {
  const db = await getDB()
  return db.getAll(STORE_CATALOG)
}

export async function getProductFromIndexedDB(ean) {
  if (!ean) return null
  const db = await getDB()
  return db.get(STORE_CATALOG, String(ean))
}

export async function getCatalogCacheAge() {
  const db = await getDB()
  const row = await db.get(STORE_META, 'catalog_cached_at')
  return row?.value || null
}

export async function getCurrentCachedStoreId() {
  const db = await getDB()
  const row = await db.get(STORE_META, 'current_store_id')
  return row?.value || null
}

export async function clearCatalog() {
  const db = await getDB()
  const tx = db.transaction([STORE_CATALOG, STORE_META], 'readwrite')
  await tx.objectStore(STORE_CATALOG).clear()
  await tx.objectStore(STORE_META).clear()
  await tx.done
}

export async function addPendingScan(scanData) {
  const db = await getDB()
  const tx = db.transaction(STORE_PENDING_SCANS, 'readwrite')
  const store = tx.objectStore(STORE_PENDING_SCANS)
  const count = await store.count()
  if (count >= 100) {
    const index = store.index('created_at')
    const oldest = await index.openCursor(null, 'next')
    if (oldest) await store.delete(oldest.primaryKey)
  }
  await store.add({
    ...scanData,
    created_at: Date.now(),
    status: 'pending',
    retries: 0,
  })
  await tx.done
}

export async function getPendingScans() {
  const db = await getDB()
  const all = await db.getAll(STORE_PENDING_SCANS)
  return all.filter((s) => s.status === 'pending' || s.status === 'failed')
}

export async function getPendingScansCount() {
  const db = await getDB()
  const all = await db.getAll(STORE_PENDING_SCANS)
  return all.filter((s) => s.status === 'pending' || s.status === 'failed').length
}

export async function removePendingScan(id) {
  const db = await getDB()
  await db.delete(STORE_PENDING_SCANS, id)
}

export async function markPendingScanFailed(id) {
  const db = await getDB()
  const row = await db.get(STORE_PENDING_SCANS, id)
  if (row) {
    row.status = 'failed'
    row.retries = (row.retries || 0) + 1
    if (row.retries >= 3) {
      await db.delete(STORE_PENDING_SCANS, id)
    } else {
      await db.put(STORE_PENDING_SCANS, row)
    }
  }
}

export async function clearPendingScans() {
  const db = await getDB()
  await db.clear(STORE_PENDING_SCANS)
}

const FLUSH_BATCH_SIZE = 50

export async function flushPendingScans(supabaseClient) {
  if (!supabaseClient) return 0
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0
  const pending = await getPendingScans()
  if (pending.length === 0) return 0
  let flushed = 0
  const batch = pending.slice(0, FLUSH_BATCH_SIZE)
  const rows = batch.map((s) => ({
    ean: s.ean,
    found_status: s.found_status || 'not_found',
    global_product_id: s.global_product_id || null,
    store_product_id: s.store_product_id || null,
    store_id: s.store_id || null,
    user_id: s.user_id || null,
    device_id: s.device_id || null,
    session_id: s.session_id || null,
    fit_result: s.fit_result ?? null,
    fit_reasons_json: s.fit_reasons_json || [],
    app_version: s.app_version || '1.0',
    scanned_at: s.scanned_at || new Date(s.created_at).toISOString(),
  }))
  try {
    const { error } = await supabaseClient.from('scan_events').insert(rows)
    if (error) {
      console.warn('[offlineDB] flush batch error:', error.message)
      for (const s of batch) await markPendingScanFailed(s.id)
      return 0
    }
    for (const s of batch) {
      await removePendingScan(s.id)
      flushed++
    }
  } catch (err) {
    console.warn('[offlineDB] flush error:', err.message)
    for (const s of batch) await markPendingScanFailed(s.id)
  }
  if (pending.length > FLUSH_BATCH_SIZE && navigator.onLine) {
    flushed += await flushPendingScans(supabaseClient)
  }
  return flushed
}
```

---

## Шаг 2: src/contexts/OfflineContext.jsx — НОВЫЙ файл

React Context, предоставляющий: `isOnline`, `cacheAge`, `pendingCount`, `cacheStale`.

```jsx
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { getCatalogCacheAge, getPendingScansCount, flushPendingScans } from '../utils/offlineDB.js'
import { supabase } from '../utils/supabase.js'

const CACHE_STALE_MS = 7 * 24 * 60 * 60 * 1000 // 7 дней

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

    if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
      // Background Sync available — register sync tag
    }

    // Periodic flush every 30s if pending scans exist and online
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

  const cacheStale = cacheAge ? Date.now() - cacheAge > CACHE_STALE_MS : false

  const formatCacheAge = useCallback(() => {
    if (!cacheAge) return null
    const diffMs = Date.now() - cacheAge
    const minutes = Math.floor(diffMs / 60000)
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
```

---

## Шаг 3: Модификация resolver.js

Добавить IndexedDB-лукуп в начало каскада + ранний выход при offline.

В начало файла добавить импорт:

```js
import { getProductFromIndexedDB } from '../utils/offlineDB.js'
```

В `resolveProductByEan` добавить IndexedDB шаг ПЕРЕД текущим каскадом:

После строки `if (!normalizedEan) return null` (273) и перед `if (storeId)` (275) добавить:

```js
// IndexedDB offline cache — priority lookup when offline
const offlineProduct = await getProductFromIndexedDB(normalizedEan)
if (offlineProduct) {
  const coerced = coerceProductEntity({
    ...offlineProduct,
    source: offlineProduct.source || 'offline_cache',
    sourceMeta: {
      ...offlineProduct.sourceMeta,
      fromCache: true,
      cacheAge: Date.now(),
    },
  })
  if (!navigator.onLine) {
    return finalizeResolvedProduct(coerced, {
      ean: normalizedEan,
      foundStatus: offlineProduct.storeProductId ? 'found_store' : 'found_global',
      storeId: offlineProduct.store_id || storeId,
      fitResult: options.fitResult,
      logScan: options.logScan,
    })
  }
}
```

В `logScan` (строка 230) — если offline, писать в IndexedDB вместо Supabase:

```js
// В начале logScan, после privacy check:
if (!navigator.onLine) {
  const { addPendingScan } = await import('../utils/offlineDB.js')
  const { getOrCreateDeviceId, getOrCreateSessionId } = await import('./userIdentity.js')
  await addPendingScan({
    ean,
    found_status: foundStatus,
    global_product_id:
      product?.sourceMeta?.globalProductId || (isUuid(product?.id) ? product.id : null),
    store_product_id: product?.sourceMeta?.storeProductId || null,
    store_id: storeId || null,
    user_id: await resolveCurrentInternalUserId({ ensureRow: false }),
    device_id: getOrCreateDeviceId(),
    session_id: getOrCreateSessionId(),
    fit_result: fitResult ?? null,
    fit_reasons_json: [],
    app_version: '1.0',
    scanned_at: new Date().toISOString(),
  })
  return
}
```

---

## Шаг 4: Модификация StoreContext.jsx

При загрузке магазина — параллельно кэшировать каталог в IndexedDB.

Добавить импорт:

```js
import { saveCatalogToIndexedDB } from '../utils/offlineDB.js'
```

В `fetchStoreBySlug` (после строки 69 где `if (!error && data) return normalizeStore(data)`) — недостаточно, нужно место где мы уже загрузили store и catalog.

Лучше — добавить useEffect в StoreProvider, который после загрузки currentStore запускает кэширование:

После эффекта загрузки магазина (строка 149), добавить:

```js
useEffect(() => {
  if (!currentStore?.id) return
  import('../utils/offlineDB.js').then(({ saveCatalogToIndexedDB }) => {
    supabase
      .from('store_products')
      .select('*, global_products(*)')
      .eq('store_id', currentStore.id)
      .eq('is_active', true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          saveCatalogToIndexedDB(data, currentStore.id)
        }
      })
      .catch(() => {})
  })
}, [currentStore?.id])
```

---

## Шаг 5: Модификация localHistory.js

При записи скана — если offline, также добавить в pending_scans.

Добавить импорт:

```js
import { addPendingScan } from './offlineDB.js'
```

В функции `appendLocalScanHistory` (строка 104), после `writeRawHistory` добавить:

```js
if (!navigator.onLine && entry?.ean) {
  addPendingScan({
    ean: entry.ean,
    found_status: entry.source || 'scan',
    store_id: entry.storeId || null,
    scanned_at: entry.scanDate || new Date().toISOString(),
  }).catch(() => {})
}
```

---

## Шаг 6: src/sw.js — НОВЫЙ (заменяет public/sw.js)

Service Worker с Workbox injectManifest + push + Background Sync.

```js
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'

precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
  })
)

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'Körset', body: event.data?.text?.() || 'Новое уведомление' }
  }
  const title = payload.title || 'Körset'
  const options = {
    body: payload.body || 'У вас новое уведомление.',
    icon: '/logo.png',
    badge: '/favicon.png',
    data: {
      url: payload.url || '/profile',
      type: payload.type || 'system',
      storeSlug: payload.storeSlug || null,
    },
    tag: payload.tag || payload.type || 'korset-notification',
    renotify: false,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification?.data?.url || '/profile'
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      const matching = allClients.find((client) => client.url.includes(self.location.origin))
      if (matching) {
        matching.focus()
        matching.navigate(url)
        return
      }
      await clients.openWindow(url)
    })()
  )
})

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-scans') {
    event.waitUntil(flushPendingScansFromSW())
  }
})

async function flushPendingScansFromSW() {
  // В SW нет доступа к Supabase client напрямую
  // Отправляем message в app для flush
  const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const client of allClients) {
    client.postMessage({ type: 'FLUSH_PENDING_SCANS' })
  }
}
```

---

## Шаг 7: Модификация vite.config.js

Добавить vite-plugin-pwa с injectManifest.

```js
// Добавить импорт:
import { VitePWA } from 'vite-plugin-pwa'

// В plugins массив добавить:
VitePWA({
  registerType: 'autoUpdate',
  srcDir: 'src',
  filename: 'sw.js',
  strategies: 'injectManifest',
  injectManifest: {
    swSrc: 'src/sw.js',
    swDest: 'dist/sw.js',
  },
  manifest: {
    name: 'Körset',
    short_name: 'Körset',
    start_url: '/',
    display: 'standalone',
    background_color: '#070712',
    theme_color: '#7C3AED',
    icons: [
      { src: '/favicon.png', sizes: '192x192', type: 'image/png' },
      { src: '/logo.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
  },
})
```

---

## Шаг 8: Модификация App.jsx

Обернуть в OfflineProvider. Добавить message listener для Background Sync.

```jsx
// Добавить импорт:
import { OfflineProvider, useOffline } from './contexts/OfflineContext.jsx'

// Обернуть App в OfflineProvider внутри UserDataProvider:
;<AuthProvider>
  <UserDataProvider>
    <OfflineProvider>
      <StoreProvider>
        <ProfileProvider>
          <AppInner />
        </ProfileProvider>
      </StoreProvider>
    </OfflineProvider>
  </UserDataProvider>
</AuthProvider>
```

В AppInner добавить useEffect для SW message listener:

```jsx
const { refreshPendingCount } = useOffline()

useEffect(() => {
  if ('serviceWorker' in navigator) {
    const handleMessage = (event) => {
      if (event.data?.type === 'FLUSH_PENDING_SCANS') {
        import('./utils/offlineDB.js').then(({ flushPendingScans }) => {
          flushPendingScans(supabase).then(() => refreshPendingCount())
        })
      }
    }
    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
  }
}, [refreshPendingCount])
```

---

## Шаг 9: OfflineBanner компонент — НОВЫЙ

src/components/OfflineBanner.jsx:

```jsx
import { useOffline } from '../contexts/OfflineContext.jsx'

export default function OfflineBanner() {
  const { isOnline, cacheStale, formatCacheAge } = useOffline()
  if (isOnline && !cacheStale) return null

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        background: isOnline ? 'rgba(251, 191, 36, 0.9)' : 'rgba(251, 191, 36, 0.95)',
        color: '#000',
        textAlign: 'center',
        padding: '4px 12px',
        fontSize: '12px',
        fontWeight: 500,
        fontFamily: 'Manrope, sans-serif',
        backdropFilter: 'blur(8px)',
      }}
    >
      {isOnline
        ? `Кэш устарел. Данные от ${formatCacheAge()}.`
        : `Офлайн-режим. Данные из кэша${formatCacheAge() ? ` (${formatCacheAge()})` : ''}.`}
    </div>
  )
}
```

---

## Шаг 10: Интеграция OfflineBanner в App.jsx

В AppInner, после `<div className="app-frame">`:

```jsx
<OfflineBanner />
```

---

## Шаг 11: Интеграция кэш-метки в ProductScreen

В ProductScreen.jsx, рядом с Fit-Check результатом, добавить метку:

```jsx
const { isOnline, formatCacheAge } = useOffline()
// В JSX, под fit-результатом:
{
  !isOnline && formatCacheAge() && (
    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
      Данные из кэша ({formatCacheAge()})
    </span>
  )
}
```

---

## Шаг 12: Обновление документации

### ARCHITECTURE.md — добавить раздел 19 "ОФЛАЙН-АРХИТЕКТУРА"

### ROADMAP_PILOT_V1.md — добавить Фазу 5-NOW "Офлайн-режим"

### CONTEXT.md — обновить "Текущий фокус" и "Что уже работает"

---

## Файлы для удаления

- `public/sw.js` — переносится в `src/sw.js` (Workbox injectManifest)
- `public/manifest.webmanifest` — генерируется vite-plugin-pwa

---

## Порядок выполнения

1. Создать src/utils/offlineDB.js
2. Создать src/contexts/OfflineContext.jsx
3. Модифицировать src/domain/product/resolver.js
4. Модифицировать src/contexts/StoreContext.jsx
5. Модифицировать src/utils/localHistory.js
6. Создать src/sw.js
7. Модифицировать vite.config.js
8. Удалить public/sw.js и public/manifest.webmanifest
9. Модифицировать src/App.jsx
10. Создать src/components/OfflineBanner.jsx
11. Обновить ProductScreen.jsx (кэш-метка)
12. Обновить документацию
