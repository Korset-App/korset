import { openDB } from 'idb'

const DB_NAME = 'korset-offline-db'

// ════════════════════════════════════════════════════════════════
// DB VERSION CHANGELOG
// ════════════════════════════════════════════════════════════════
// При изменении схемы IndexedDB:
//   1. Bump DB_VERSION на следующее число
//   2. Добавь новый блок `if (oldVersion < N) { ... }` в upgrade()
//   3. Опиши изменение в этом списке
//   4. НИКОГДА не правь существующие блоки `if (oldVersion < X)` —
//      пользователи с очень старой версией могут пропустить миграции
//
// v1 (initial, 2026-01-XX):
//   - store_catalog (keyPath: ean, indexes: store_id, category)
//   - store_meta (keyPath: key)
//   - pending_scans (keyPath: id autoIncrement, indexes: created_at, status)
//
// v2 (2026-04-28):
//   - pending_scans: + index 'client_token' (для дедуп flush'а на сервере)
// v3 (2026-05-01):
//   - store_catalog: category index remains (now uses normalized keys)
// v4 (2026-09-23):
//   - catalog v2 overhaul: purge stale legacy catalog cache and alternate_eans
// v5 (2026-09-26):
//   - purge pre-archive catalog snapshot; retain pending scans
// ══════════════════════════════════════════════════════════════════
const DB_VERSION = 5

const STORE_CATALOG = 'store_catalog'
const STORE_META = 'store_meta'
const STORE_PENDING_SCANS = 'pending_scans'

let dbPromise = null

/**
 * IndexedDB upgrade migrations.
 * Each `if (oldVersion < N)` block runs sequentially для пользователей
 * у которых текущая версия БД меньше N. Это позволяет миграциям накапливаться.
 *
 * @param {IDBDatabase} db
 * @param {number} oldVersion - версия БД до upgrade (0 если БД создаётся впервые)
 * @param {number} newVersion
 * @param {IDBTransaction} tx - транзакция, в которой выполняются миграции
 */
function runMigrations(db, oldVersion, newVersion, tx) {
  // ──────────────────────────────────────────────────────────────
  // Migration v0 → v1: initial schema
  // ──────────────────────────────────────────────────────────────
  if (oldVersion < 1) {
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
  }

  // ──────────────────────────────────────────────────────────────
  // Migration v1 → v2: client_token index (для дедуп flush'а)
  // ──────────────────────────────────────────────────────────────
  if (oldVersion < 2) {
    // tx — versionchange transaction, через неё получаем доступ к существующему store
    const scanStore = tx.objectStore(STORE_PENDING_SCANS)
    if (!scanStore.indexNames.contains('client_token')) {
      // unique=false: один client_token может попасть в несколько pending scans
      // (например, если scan повторился с тем же токеном при offline reconnect)
      scanStore.createIndex('client_token', 'client_token', { unique: false })
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Migration v2 → v3: category index rebuild (normalized keys)
  // No schema change needed — category index already exists from v1.
  // The index will automatically reflect updated category values
  // when the catalog is re-synced from the server.
  // ──────────────────────────────────────────────────────────────

  // ──────────────────────────────────────────────────────────────
  // Migration v3 → v4: purge stale catalog products and reset cache
  // ──────────────────────────────────────────────────────────────
  if (oldVersion < 4) {
    if (db.objectStoreNames.contains(STORE_CATALOG)) {
      const catalogStore = tx.objectStore(STORE_CATALOG)
      catalogStore.clear()
    }
    if (db.objectStoreNames.contains(STORE_META)) {
      const metaStore = tx.objectStore(STORE_META)
      metaStore.clear()
    }
  }

  if (oldVersion < 5) {
    tx.objectStore(STORE_CATALOG).clear()
    tx.objectStore(STORE_META).clear()
  }
}

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade: runMigrations,
      blocked() {
        // Старые вкладки с открытой БД блокируют upgrade — предупредим в console.
        // В production реально стоит показать toast пользователю с предложением закрыть другие вкладки.
        console.warn(
          '[offlineDB] upgrade blocked by another open tab — close other Körset tabs to apply DB migration'
        )
      },
      blocking() {
        // Эта вкладка блокирует upgrade в другой вкладке — закроем соединение чтобы пропустить.
        if (dbPromise) {
          dbPromise.then((db) => db.close()).catch(() => {})
          dbPromise = null
        }
      },
      terminated() {
        // БД закрыта аномально (например, low-disk space на устройстве). Пересоздадим dbPromise.
        console.warn('[offlineDB] connection terminated — will reopen on next call')
        dbPromise = null
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
  await store.clear()
  for (const product of products) {
    if (!product.ean) continue
    await store.put({
      ean: String(product.ean),
      store_id: storeId,
      name: product.name || null,
      name_kz: product.nameKz || product.name_kz || null,
      brand: product.brand || null,
      category: product.category || null,
      subcategory: product.subcategory || null,
      quantity: product.quantity || null,
      quantityParsed: product.quantityParsed || null,
      group: product.group || null,
      description: product.description || null,
      ingredients: product.ingredients || product.ingredients_raw || null,
      ingredients_kz: product.ingredientsKz || product.ingredients_kz || null,
      allergens: product.allergens || [],
      dietTags: product.dietTags || product.diet_tags || [],
      tags: product.tags || [],
      additivesTags: product.additivesTags || product.additives_tags || [],
      traces: product.traces || [],
      categoriesTags: product.categoriesTags || product.categories_tags || [],
      halalStatus: product.halalStatus || product.halal_status || 'unknown',
      packagingType: product.packagingType || product.packaging_type || null,
      fatPercent: product.fatPercent || product.fat_percent || null,
      nutriscore: product.nutriscore || null,
      nutritionPer100:
        product.nutritionPer100 || product.nutriments_json || product.nutriments || {},
      alcohol100g: product.alcohol100g || product.alcohol_100g || null,
      saturatedFat100g: product.saturatedFat100g || product.saturated_fat_100g || null,
      novaGroup: product.novaGroup || product.nova_group || null,
      imageIngredientsUrl: product.imageIngredientsUrl || product.image_ingredients_url || null,
      imageNutritionUrl: product.imageNutritionUrl || product.image_nutrition_url || null,
      image: product.image || product.image_url || null,
      manufacturer: product.manufacturer || null,
      countryOfOrigin: product.countryOfOrigin || product.country_of_origin || null,
      priceKzt: product.priceKzt || product.price_kzt || null,
      shelf: product.shelf || product.shelf_zone || null,
      stockStatus: product.stockStatus || product.stock_status || null,
      qualityScore: product.qualityScore || product.data_quality_score || null,
      sourceConfidence: product.sourceConfidence || product.source_confidence || null,
      canonicalId: product.canonicalId || null,
      globalProductId: product.globalProductId || product.global_product_id || null,
      storeProductId: product.storeProductId || product.store_product_id || null,
      source: product.source || 'cache',
      alternateEans: product.alternateEans || product.alternate_eans || [],
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

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready
      await reg.sync.register('sync-pending-scans')
    } catch {
      /* sync not supported */
    }
  }
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
    client_token: s.client_token || null,
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
