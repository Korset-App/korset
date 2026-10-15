import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { buildRetailPriceUpdate } from '../domain/retail/catalogManagement.js'
import {
  getStoreCatalogProducts,
  applyRetailSyncedConditions,
  updateProductPrice,
  updateProductPromotion,
  updateProductShoppingRecommendation,
  updateProductStock,
  deleteStoreProduct,
} from '../utils/retailAnalytics.js'

export function useRetailProducts(storeId, p = {}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [scanToast, setScanToast] = useState(null)
  const toastTimerRef = useRef(null)
  const searchTimerRef = useRef(null)

  useEffect(() => () => clearTimeout(toastTimerRef.current), [])

  const triggerScanToast = useCallback((toast, duration = 3000) => {
    clearTimeout(toastTimerRef.current)
    setScanToast(toast)
    if (toast) {
      toastTimerRef.current = setTimeout(() => setScanToast(null), duration)
    }
  }, [])

  // Debounce search 350ms
  useEffect(() => {
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(searchTimerRef.current)
  }, [search])

  // ── Infinite Query ───────────────────────────────────────
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['retail-products', storeId, debouncedSearch],
      queryFn: ({ pageParam = 0 }) =>
        getStoreCatalogProducts(storeId, { page: pageParam, search: debouncedSearch }),
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => {
        const loaded = allPages.reduce((acc, pg) => acc + pg.products.length, 0)
        return loaded < lastPage.total ? allPages.length : undefined
      },
      enabled: Boolean(storeId),
      staleTime: 30_000,
      gcTime: 10 * 60_000,
    })

  const [conditionsTime, setConditionsTime] = useState(Date.now)
  useEffect(() => {
    const boundaries = (data?.pages.flatMap((page) => page.products) ?? [])
      .flatMap((product) =>
        [product.syncConditions?.valid_from, product.syncConditions?.valid_until].map((value) =>
          Date.parse(value)
        )
      )
      .filter((time) => time > conditionsTime)
    if (!boundaries.length) return undefined
    const timer = setTimeout(
      () => setConditionsTime(Date.now()),
      Math.max(1, Math.min(Math.min(...boundaries) - Date.now() + 1, 60000))
    )
    return () => clearTimeout(timer)
  }, [data, conditionsTime])

  const products = useMemo(
    () =>
      (data?.pages.flatMap((pg) => pg.products) ?? []).map((product) =>
        applyRetailSyncedConditions(product, conditionsTime)
      ),
    [data, conditionsTime]
  )
  const totalCount = data?.pages[0]?.total ?? 0

  // Optimistic updater for infinite query pages
  const patchPages = useCallback(
    (patcher) => {
      queryClient.setQueriesData({ queryKey: ['retail-products', storeId] }, (old) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((pg) => ({ ...pg, products: pg.products.map(patcher) })),
        }
      })
    },
    [queryClient, storeId]
  )

  // ── Stock mutation (optimistic) ──────────────────────────────
  const stockMutation = useMutation({
    mutationFn: ({ id, status }) => updateProductStock(id, storeId, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['retail-products', storeId] })
      const prev = queryClient.getQueriesData({ queryKey: ['retail-products', storeId] })
      patchPages((item) => (item.id === id ? { ...item, stock_status: status } : item))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => queryClient.setQueryData(key, val))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-products', storeId] })
    },
  })

  // ── Shopping recommendation mutation (optimistic) ─────────
  const recommendationMutation = useMutation({
    mutationFn: ({ id, isRecommended }) =>
      updateProductShoppingRecommendation(id, storeId, isRecommended),
    onMutate: async ({ id, isRecommended }) => {
      await queryClient.cancelQueries({ queryKey: ['retail-products', storeId] })
      const prev = queryClient.getQueriesData({ queryKey: ['retail-products', storeId] })
      patchPages((item) =>
        item.id === id ? { ...item, is_shopping_recommended: isRecommended } : item
      )
      return { prev }
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => queryClient.setQueryData(key, val))
      if (error?.message?.includes('Maximum 10 shopping recommendation candidates per store')) {
        triggerScanToast(
          {
            type: 'recommendation_limit',
            label: p.recommendationLimitMessage,
          },
          4000
        )
      } else {
        triggerScanToast(
          {
            type: 'recommendation_error',
            label: p.recommendationSaveFailed,
          },
          4000
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-products', storeId] })
    },
  })

  // ── Price mutation (optimistic + rollback + invalidate) ───
  const priceMutation = useMutation({
    mutationFn: ({ id, price, product }) => updateProductPrice(id, storeId, price, product),
    onMutate: async ({ id, price }) => {
      await queryClient.cancelQueries({ queryKey: ['retail-products', storeId] })
      const prev = queryClient.getQueriesData({ queryKey: ['retail-products', storeId] })
      patchPages((item) => (item.id === id ? { ...item, ...buildRetailPriceUpdate(item, price) } : item))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => queryClient.setQueryData(key, val))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-products', storeId] })
    },
  })

  // ── Promotion mutation (optimistic + rollback + invalidate)
  const promotionMutation = useMutation({
    mutationFn: ({ id, isFeatured, oldPriceKzt, discountPercent, managed, placementOnly }) =>
      updateProductPromotion(id, storeId, {
        is_featured: isFeatured,
        old_price_kzt: oldPriceKzt,
        discount_percent: discountPercent,
        managed,
        placementOnly,
      }),
    onMutate: async ({ id, isFeatured, oldPriceKzt, discountPercent, managed, placementOnly }) => {
      await queryClient.cancelQueries({ queryKey: ['retail-products', storeId] })
      const prev = queryClient.getQueriesData({ queryKey: ['retail-products', storeId] })
      patchPages((item) =>
        item.id === id
          ? {
              ...item,
              is_featured: isFeatured,
              ...(!managed && !placementOnly ? {
                old_price_kzt: oldPriceKzt,
                discount_percent: discountPercent,
              } : {}),
            }
          : item
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => queryClient.setQueryData(key, val))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-products', storeId] })
    },
  })

  // ── Delete mutation (optimistic removal) ───────────────────
  const deleteMutation = useMutation({
    mutationFn: ({ id }) => deleteStoreProduct(id, storeId),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['retail-products', storeId] })
      const prev = queryClient.getQueriesData({ queryKey: ['retail-products', storeId] })
      queryClient.setQueriesData({ queryKey: ['retail-products', storeId] }, (old) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((pg) => ({
            ...pg,
            products: pg.products.filter((item) => item.id !== id),
            total: Math.max(0, (pg.total ?? 0) - 1),
          })),
        }
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => queryClient.setQueryData(key, val))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-products', storeId] })
    },
  })

  return {
    products,
    totalCount,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    search,
    setSearch,
    debouncedSearch,
    scanToast,
    triggerScanToast,
    stockMutation,
    priceMutation,
    recommendationMutation,
    promotionMutation,
    deleteMutation,
  }
}
