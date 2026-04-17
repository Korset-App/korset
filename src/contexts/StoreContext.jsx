import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { loadPrivacySettings, PRIVACY_EVENT } from '../utils/privacySettings.js'
import { getStoreBySlug } from '../data/stores.js'
import { saveCatalogToIndexedDB } from '../utils/offlineDB.js'
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

const StoreContext = createContext(null)
export const STORE_KEY = 'korset_store_slug'
const STORE_CACHE_PREFIX = 'korset_store_data_'

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

export function StoreProvider({ children }) {
  const location = useLocation()
  const pathStoreSlug = getStoreSlugFromPath(location.pathname)
  const [rememberStoreEnabled, setRememberStoreEnabled] = useState(
    () => loadPrivacySettings().rememberStoreEnabled
  )
  const [rememberedStoreSlug, setRememberedStoreSlug] = useState(() =>
    loadPrivacySettings().rememberStoreEnabled ? localStorage.getItem(STORE_KEY) || null : null
  )

  const storeSlug = pathStoreSlug || (rememberStoreEnabled ? rememberedStoreSlug : null) || null

  const [currentStore, setCurrentStore] = useState(() => loadStoreFromCache(storeSlug))
  const [isStoreLoading, setIsStoreLoading] = useState(() =>
    Boolean(storeSlug && !loadStoreFromCache(storeSlug))
  )
  const fetchAbortRef = useRef(null)

  useEffect(() => {
    const syncPrivacy = () => {
      const nextEnabled = loadPrivacySettings().rememberStoreEnabled
      setRememberStoreEnabled(nextEnabled)
      if (!nextEnabled) {
        setRememberedStoreSlug(null)
        localStorage.removeItem(STORE_KEY)
      } else {
        setRememberedStoreSlug(localStorage.getItem(STORE_KEY) || null)
      }
    }
    window.addEventListener('storage', syncPrivacy)
    window.addEventListener(PRIVACY_EVENT, syncPrivacy)
    return () => {
      window.removeEventListener('storage', syncPrivacy)
      window.removeEventListener(PRIVACY_EVENT, syncPrivacy)
    }
  }, [])

  useEffect(() => {
    if (pathStoreSlug) {
      setRememberedStoreSlug(pathStoreSlug)
      if (rememberStoreEnabled) localStorage.setItem(STORE_KEY, pathStoreSlug)
    }
  }, [pathStoreSlug, rememberStoreEnabled])

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

  useEffect(() => {
    if (!currentStore?.id || !navigator.onLine) return
    supabase
      .from('store_products')
      .select(
        'ean, price_kzt, shelf_zone, stock_status, local_name, is_active, global_products!inner(ean, name, name_kz, brand, category, subcategory, quantity, description, ingredients_raw, ingredients_kz, allergens_json, diet_tags_json, tags_json, additives_tags_json, traces_json, categories_tags_json, halal_status, nutriscore, nutriments_json, alcohol_100g, saturated_fat_100g, nova_group, image_ingredients_url, image_nutrition_url, image_url, images, manufacturer, country_of_origin, specs_json, data_quality_score, source_primary, source_confidence, is_verified, needs_review, group)'
      )
      .eq('store_id', currentStore.id)
      .eq('is_active', true)
      .eq('global_products.is_active', true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const products = data.map((row) => {
            const gp = row.global_products || {}
            return {
              ean: row.ean || gp.ean,
              name: row.local_name || gp.name,
              nameKz: gp.name_kz,
              brand: gp.brand,
              category: gp.category,
              subcategory: gp.subcategory,
              quantity: gp.quantity,
              group: gp.group,
              description: gp.description,
              ingredients: gp.ingredients_raw,
              ingredientsKz: gp.ingredients_kz,
              allergens: gp.allergens_json || [],
              dietTags: gp.diet_tags_json || [],
              tags: gp.tags_json || [],
              additivesTags: gp.additives_tags_json || [],
              traces: gp.traces_json || [],
              categoriesTags: gp.categories_tags_json || [],
              halalStatus: gp.halal_status || 'unknown',
              nutriscore: gp.nutriscore,
              nutritionPer100: gp.nutriments_json || {},
              alcohol100g: gp.alcohol_100g ?? null,
              saturatedFat100g: gp.saturated_fat_100g ?? null,
              novaGroup: gp.nova_group ?? null,
              imageIngredientsUrl: gp.image_ingredients_url || null,
              imageNutritionUrl: gp.image_nutrition_url || null,
              image: gp.image_url,
              images: gp.images || [],
              manufacturer: gp.manufacturer
                ? { name: gp.manufacturer, country: gp.country_of_origin }
                : null,
              specs: gp.specs_json || null,
              qualityScore: gp.data_quality_score ?? 0,
              sourceConfidence: gp.source_confidence ?? null,
              sourcePrimary: gp.source_primary || null,
              isVerified: gp.is_verified || false,
              needsReview: gp.needs_review || false,
              priceKzt: row.price_kzt,
              shelf: row.shelf_zone,
              stockStatus: row.stock_status,
              storeProductId: row.id,
              globalProductId: gp.id,
              source: 'cache',
            }
          })
          saveCatalogToIndexedDB(products, currentStore.id).catch(() => {})
        }
      })
      .catch(() => {})
  }, [currentStore?.id])

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

  const value = useMemo(
    () => ({
      storeSlug: currentStore?.slug || null,
      storeId: currentStore?.id || null,
      currentStore,
      isStoreLoading,
      isStoreApp,
      isStorePublic,
      isPublicMarketing,
      updateStoreSettings,
      rememberStore: (slug) => {
        setRememberedStoreSlug(slug)
        if (rememberStoreEnabled) localStorage.setItem(STORE_KEY, slug)
      },
      clearRememberedStore: () => {
        setRememberedStoreSlug(null)
        localStorage.removeItem(STORE_KEY)
      },
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
            product: (ean, external = false) => buildProductPath(currentStore.slug, ean, external),
            productAI: (ean, external = false) =>
              buildProductAIPath(currentStore.slug, ean, external),
            productAlternatives: (ean) => buildProductAlternativesPath(currentStore.slug, ean),
          }
        : null,
    }),
    [
      currentStore,
      isStoreLoading,
      isStoreApp,
      isStorePublic,
      isPublicMarketing,
      rememberStoreEnabled,
      updateStoreSettings,
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
