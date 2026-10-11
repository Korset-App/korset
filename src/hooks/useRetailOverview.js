import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { buildRetailAIInsights } from '../domain/retail/aiInsights.js'
import {
  getScansCount,
  getUniqueCustomers,
  getTotalProducts,
  getTopScannedProducts,
  getMissedOpportunitiesPage,
  getLostRevenue,
  getScanCoverage,
  getAlternativeEventsSummary,
  getCompareEventsSummary,
} from '../utils/retailAnalytics.js'

function useRetailQuery(key, fn, enabled, staleTime = 2 * 60_000) {
  return useQuery({ queryKey: key, queryFn: fn, enabled, staleTime, gcTime: 10 * 60_000 })
}

export function useRetailOverview(storeId) {
  const [params, setParams] = useSearchParams()
  const requestedPeriod = Number(params.get('period'))
  const period = [1, 7, 14, 30, 90].includes(requestedPeriod) ? requestedPeriod : 7
  const filter = params.get('demand')
  const missedFilter = ['not_in_catalog', 'out_of_stock'].includes(filter) ? filter : 'all'
  const updateFilter = (key, value, defaultValue) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value === defaultValue) next.delete(key)
        else next.set(key, String(value))
        return next
      },
      { preventScrollReset: true }
    )
  const enabled = Boolean(storeId)
  const scansQ = useRetailQuery(
    ['retail-scans', storeId, period],
    () => getScansCount(storeId, period),
    enabled
  )
  const uniqueQ = useRetailQuery(
    ['retail-unique-customers', storeId, period],
    () => getUniqueCustomers(storeId, period),
    enabled
  )
  const lostQ = useRetailQuery(
    ['retail-lost-revenue', storeId, period],
    () => getLostRevenue(storeId, period),
    enabled
  )
  const coverageQ = useRetailQuery(
    ['retail-coverage', storeId, period],
    () => getScanCoverage(storeId, period),
    enabled
  )
  const totalQ = useRetailQuery(
    ['retail-total', storeId],
    () => getTotalProducts(storeId),
    enabled,
    5 * 60_000
  )
  const topQ = useRetailQuery(
    ['retail-top', storeId, period],
    () => getTopScannedProducts(storeId, period, 5),
    enabled
  )
  const missedQ = useRetailQuery(
    ['retail-missed-page', storeId, period],
    () => getMissedOpportunitiesPage(storeId, period),
    enabled
  )
  const alternativesQ = useRetailQuery(
    ['retail-alternatives-summary', storeId, period],
    () => getAlternativeEventsSummary(storeId, period),
    enabled
  )
  const compareQ = useRetailQuery(
    ['retail-compare-summary', storeId, period],
    () => getCompareEventsSummary(storeId, period),
    enabled
  )
  const insightQueries = [scansQ, totalQ, coverageQ, lostQ, missedQ, topQ, alternativesQ]
  const insightsLoading = insightQueries.some((query) => query.isPending)
  const insightsError = insightQueries.some((query) => query.isError)
  const insightsReady = insightQueries.every((query) => query.isSuccess)
  const insights = useMemo(
    () =>
      insightsReady
        ? buildRetailAIInsights({
            scansCount: scansQ.data,
            totalProducts: totalQ.data,
            scanCoverage: coverageQ.data,
            lostRevenue: lostQ.data,
            missedOpportunities: missedQ.data?.items,
            topProducts: topQ.data,
            topProductDetailsAvailable: false,
            alternativeSummary: alternativesQ.data,
            maxInsights: 3,
          })
        : [],
    [
      insightsReady,
      scansQ.data,
      totalQ.data,
      coverageQ.data,
      lostQ.data,
      missedQ.data,
      topQ.data,
      alternativesQ.data,
    ]
  )
  return {
    period,
    missedFilter,
    setPeriod: (value) => updateFilter('period', value, 7),
    setMissedFilter: (value) => updateFilter('demand', value, 'all'),
    scansQ,
    uniqueQ,
    lostQ,
    coverageQ,
    totalQ,
    topQ,
    missedQ,
    alternativesQ,
    compareQ,
    insights,
    insightsLoading,
    insightsError,
    retryInsights: () =>
      Promise.all(insightQueries.filter((query) => query.isError).map((query) => query.refetch())),
  }
}
