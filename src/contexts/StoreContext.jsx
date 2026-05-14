import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { parseJson } from '../domain/product/model.js'
import { PRIVACY_EVENT } from '../utils/privacySettings.js'
import { getStoreBySlug } from '../data/stores.js'
import { saveCatalogToIndexedDB } from '../utils/offlineDB.js'
import { notifyCatalogWarmed } from '../domain/product/resolver.js'
import { getImageUrl } from '../utils/imageUrl.js'
import { enrichQuantity } from '../utils/parseQuantity.js'
import {
  buildAIHomePath,
  buildCatalogPath,
  buildHistoryPath,
  buildStoreHomePath,
  buildProductAIPath,
  buildProductAlternativesPath,
  buildProductPath,
  buildProfilePath,
  buildScanPath,
  buildStorePublicPath,
} from '../utils/routes.js'
import { useOffline } from './OfflineContext.jsx'

const StoreContext = createContext(null)
export const STORE_KEY = 'korset_store_slug'
const STORE_CACHE_PREFIX = 'korset_store_data_'

const FULL_FIELDS =
  'ean, name, name_kz, brand, category, subcategory, quantity, description, ingredients_raw, ingredients_kz, allergens_json, diet_tags_json, tags_json, additives_tags_json, traces_json, categories_tags_json, halal_status, packaging_type, fat_percent, nutriscore, nutriments_json, alcohol_100g, saturated_fat_100g, nova_group, image_ingredients_url, image_nutrition_url, image_url, images, manufacturer, country_of_origin, specs_json, data_quality_score, source_primary, source_confidence, is_verified, needs_review, group, alternate_eans'

// Maps a flat RPC row from fn_get_store_catalog to the canonical product shape.
// JSONB columns (allergens_json, diet_tags_json, alternate_eans) are auto-parsed
// by supabase-js, so parseJson handles both object and string inputs safely.
function mapRpcRowToProduct(row) {
  return enrichQuantity({
    ean: row.gp_ean || row.ean,
    name: row.local_name || row.name,
    nameKz: row.name_kz,
    brand: row.brand,
    category: row.category,
    subcategory: row.subcategory,
    quantity: row.quantity,
    group: row.product_group,
    allergens: parseJson(row.allergens_json, []),
    dietTags: parseJson(row.diet_tags_json, []),
    halalStatus: row.halal_status || 'unknown',
    packagingType: row.packaging_type || null,
    fatPercent: row.fat_percent ?? null,
    nutriscore: row.nutriscore,
    image: getImageUrl(row.image_url),
    priceKzt: row.price_kzt,
    shelf: row.shelf_zone,
    stockStatus: row.stock_status,
    storeProductId: row.store_product_id,
    globalProductId: row.global_product_id,
    source: 'cache',
    alternateEans: parseJson(row.alternate_eans, []),
  })
}

// mapRowToProduct remains for fetchFullProduct (full-fields PostgREST shape).
function mapRowToProduct(row) {
  const gp = row.global_products || {}
  const result = {
    ean: gp.ean || row.ean,
    name: row.local_name || gp.name,
    nameKz: gp.name_kz,
    brand: gp.brand,
    category: gp.category,
    subcategory: gp.subcategory,
    quantity: gp.quantity,
    group: gp.group,
    description: gp.description || undefined,
    ingredients: gp.ingredients_raw || undefined,
    ingredientsKz: gp.ingredients_kz || undefined,
    allergens: parseJson(gp.allergens_json, []),
    dietTags: parseJson(gp.diet_tags_json, []),
    tags: parseJson(gp.tags_json, []),
    additivesTags: parseJson(gp.additives_tags_json, []),
    traces: parseJson(gp.traces_json, []),
    categoriesTags: parseJson(gp.categories_tags_json, []),
    halalStatus: gp.halal_status || 'unknown',
    packagingType: gp.packaging_type || null,
    fatPercent: gp.fat_percent ?? null,
    nutriscore: gp.nutriscore,
    nutritionPer100: parseJson(gp.nutriments_json, {}),
    alcohol100g: gp.alcohol_100g ?? null,
    saturatedFat100g: gp.saturated_fat_100g ?? null,
    novaGroup: gp.nova_group ?? null,
    imageIngredientsUrl: gp.image_ingredients_url || null,
    imageNutritionUrl: gp.image_nutrition_url || null,
    image: getImageUrl(gp.image_url),
    images: parseJson(gp.images, []),
    manufacturer: gp.manufacturer ? { name: gp.manufacturer, country: gp.country_of_origin } : null,
    specs: gp.specs_json || null,
    priceKzt: row.price_kzt,
    shelf: row.shelf_zone,
    stockStatus: row.stock_status,
    storeProductId: row.id,
    globalProductId: gp.id,
    source: 'cache',
    alternateEans: parseJson(gp.alternate_eans, []),
  }
  return enrichQuantity(result)
}

function getStoreSlugFromPath(pathname) {
  const appMatch = pathname.match(/^\/s\/([^/]+)/)
  if (appMatch) return appMatch[1]
  const retailMatch = pathname.match(/^\/retail\/([^/]+)/)
  if (retailMatch) return retailMatch[1]
  const publicMatch = pathname.match(/^\/stores\/([^/]+)/)
  if (publicMatch) return publicMatch[1]
  return null
}

function loadStoreFromCache(slug) {
  if (!slug) return null
  try {
    const raw = localStorage.getItem(`${STORE_CACHE_PREFIX}${slug}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveStoreToCache(slug, store) {
  if (!slug || !store) return
  try {
    localStorage.setItem(`${STORE_CACHE_PREFIX}${slug}`, JSON.stringify(store))
  } catch {
    /* noop */
  }
}

function normalizeStore(data) {
  if (!data) return null
  return {
    ...data,
    slug: data.code,
    isActive: data.is_active,
  }
}

async function fetchStoreBySlug(slug) {
  if (!slug) return null
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('code', slug)
    .eq('is_active', true)
    .maybeSingle()
  if (!error && data) return normalizeStore(data)
  const local = getStoreBySlug(slug)
  return local ? normalizeStore({ ...local, code: local.slug, is_active: local.isActive }) : null
}

export async function fetchFullProduct(storeId, ean) {
  if (!storeId || !ean) return null
  const { data, error } = await supabase
    .from('store_products')
    .select(
      `ean, price_kzt, shelf_zone, stock_status, local_name, is_active, global_products!inner(${FULL_FIELDS})`
    )
    .eq('store_id', storeId)
    .eq('is_active', true)
    .eq('global_products.is_active', true)
    .eq('global_products.ean', String(ean))
    .maybeSingle()
  if (error || !data) return null
  return mapRowToProduct(data)
}

export function StoreProvider({ children }) {
  const location = useLocation()
  const { isOnline } = useOffline()
  const pathStoreSlug = getStoreSlugFromPath(location.pathname)
  const [rememberedStoreSlug, setRememberedStoreSlug] = useState(
    () => localStorage.getItem(STORE_KEY) || null
  )

  const storeSlug = pathStoreSlug || rememberedStoreSlug || null

  const [currentStore, setCurrentStore] = useState(() => loadStoreFromCache(storeSlug))
  const [isStoreLoading, setIsStoreLoading] = useState(() =>
    Boolean(storeSlug && !loadStoreFromCache(storeSlug))
  )
  const [fullCatalog, setFullCatalog] = useState(null)
  const [isCatalogLoading, setIsCatalogLoading] = useState(false)
  const fetchAbortRef = useRef(null)

  useEffect(() => {
    const syncStorage = () => {
      setRememberedStoreSlug(localStorage.getItem(STORE_KEY) || null)
    }
    window.addEventListener('storage', syncStorage)
    window.addEventListener(PRIVACY_EVENT, syncStorage)
    return () => {
      window.removeEventListener('storage', syncStorage)
      window.removeEventListener(PRIVACY_EVENT, syncStorage)
    }
  }, [])

  useEffect(() => {
    if (pathStoreSlug) {
      setRememberedStoreSlug(pathStoreSlug)
      localStorage.setItem(STORE_KEY, pathStoreSlug)
    }
  }, [pathStoreSlug])

  useEffect(() => {
    if (!storeSlug) {
      setCurrentStore(null)
      setIsStoreLoading(false)
      return
    }

    const cached = loadStoreFromCache(storeSlug)
    if (cached) {
      setCurrentStore(cached)
      setIsStoreLoading(false)
    } else {
      setIsStoreLoading(true)
    }

    if (fetchAbortRef.current) fetchAbortRef.current = true
    const aborted = { value: false }
    fetchAbortRef.current = aborted

    fetchStoreBySlug(storeSlug).then((store) => {
      if (aborted.value) return
      if (store) {
        setCurrentStore(store)
        saveStoreToCache(storeSlug, store)
      }
      setIsStoreLoading(false)
    })

    return () => {
      aborted.value = true
    }
  }, [storeSlug])

  const loadedStoreIdRef = useRef(null)

  useEffect(() => {
    const storeId = currentStore?.id
    if (!storeId) {
      if (loadedStoreIdRef.current !== null) {
        setFullCatalog(null)
        loadedStoreIdRef.current = null
      }
      return
    }

    if (loadedStoreIdRef.current !== storeId) {
      setFullCatalog(null)
      loadedStoreIdRef.current = storeId
    }

    if (!isOnline) return

    const aborted = { value: false }
    setIsCatalogLoading(true)

    supabase
      .rpc('fn_get_store_catalog', { p_store_id: storeId })
      .then(({ data, error }) => {
        if (aborted.value) return
        if (error || !data) {
          setIsCatalogLoading(false)
          return
        }
        const products = data.map(mapRpcRowToProduct)
        setFullCatalog(products)
        setIsCatalogLoading(false)
        if (products.length > 0) {
          saveCatalogToIndexedDB(products, storeId)
            .then(() => notifyCatalogWarmed(storeId))
            .catch(() => {})
        }
      })
      .catch(() => {
        if (aborted.value) return
        setIsCatalogLoading(false)
      })

    return () => {
      aborted.value = true
    }
  }, [currentStore?.id, isOnline])

  const catalogProducts = useMemo(() => fullCatalog || [], [fullCatalog])

  const isCatalogReady = fullCatalog !== null

  const isStoreApp = /^\/s\/[^/]+/.test(location.pathname)
  const isStorePublic = /^\/stores\/[^/]+/.test(location.pathname)
  const isPublicMarketing =
    location.pathname === '/' || location.pathname === '/stores' || isStorePublic

  const updateStoreSettings = useCallback(
    async (payload) => {
      if (!currentStore?.id) return { error: 'No store loaded' }
      const { error } = await supabase.from('stores').update(payload).eq('id', currentStore.id)
      if (error) return { error: error.message }
      const updated = { ...currentStore, ...payload }
      setCurrentStore(updated)
      saveStoreToCache(updated.slug || updated.code, updated)
      return { error: null }
    },
    [currentStore]
  )

  const rememberStore = useCallback((slug) => {
    setRememberedStoreSlug(slug)
    localStorage.setItem(STORE_KEY, slug)
  }, [])
  const clearRememberedStore = useCallback(() => {
    setRememberedStoreSlug(null)
    localStorage.removeItem(STORE_KEY)
  }, [])

  const value = useMemo(
    () => ({
      storeSlug: currentStore?.slug || null,
      storeId: currentStore?.id || null,
      currentStore,
      isStoreLoading,
      catalogProducts,
      isCatalogReady,
      isCatalogLoading,
      isStoreApp,
      isStorePublic,
      isPublicMarketing,
      updateStoreSettings,
      rememberStore,
      clearRememberedStore,
      appPath: (subPath = '') => {
        if (!currentStore) return subPath || '/'
        if (!subPath || subPath === '/') return `/s/${currentStore.slug}`
        return `/s/${currentStore.slug}${subPath.startsWith('/') ? subPath : `/${subPath}`}`
      },
      routes: currentStore
        ? {
            home: buildStoreHomePath(currentStore.slug),
            catalog: buildCatalogPath(currentStore.slug),
            scan: buildScanPath(currentStore.slug),
            ai: buildAIHomePath(currentStore.slug),
            history: buildHistoryPath(currentStore.slug),
            profile: buildProfilePath(currentStore.slug),
            publicPage: buildStorePublicPath(currentStore.slug),
            product: (ean) => buildProductPath(currentStore.slug, ean),
            productAI: (ean) => buildProductAIPath(currentStore.slug, ean),
            productAlternatives: (ean) => buildProductAlternativesPath(currentStore.slug, ean),
          }
        : null,
    }),
    [
      currentStore,
      isStoreLoading,
      catalogProducts,
      isCatalogReady,
      isCatalogLoading,
      isStoreApp,
      isStorePublic,
      isPublicMarketing,
      updateStoreSettings,
      rememberStore,
      clearRememberedStore,
    ]
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  return useContext(StoreContext)
}

export function useStoreId() {
  return useStore()?.storeId || null
}
