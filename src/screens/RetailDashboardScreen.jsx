import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { buildRetailAIInsights } from '../domain/retail/aiInsights.js'
import { getImageUrl } from '../utils/imageUrl.js'
import { formatPrice } from '../utils/formatPrice.js'
import {
  getScansCount,
  getUniqueCustomers,
  getTotalProducts,
  getTopScannedProducts,
  getMissedOpportunities,
  getLostRevenue,
  getScanCoverage,
  getAlternativeEventsSummary,
  getCompareEventsSummary,
} from '../utils/retailAnalytics.js'
import { AlertTriangleIcon, EyeIcon } from '../components/icons/index.js'
import {
  Card,
  Kpi,
  ProductRow,
  MissedRow,
  InsightRow,
  StatList,
  FactLine,
  EmptyState,
  QueryError,
} from '../components/retail/overview/OverviewParts.jsx'
import '../components/retail/overview/overview.css'

const STALE = 2 * 60_000
const GC = 10 * 60_000

function useRetailQuery(key, fn, enabled, staleTime = STALE) {
  return useQuery({ queryKey: key, queryFn: fn, enabled, staleTime, gcTime: GC })
}

export default function RetailDashboardScreen() {
  const { t, exists } = useI18n()
  const navigate = useNavigate()
  const { storeId, currentStore } = useStore()
  const [period, setPeriod] = useState(7)
  const [missedFilter, setMissedFilter] = useState('all')

  const periodRef = useRef(period)
  const missedFilterRef = useRef(missedFilter)
  useEffect(() => {
    periodRef.current = period
    missedFilterRef.current = missedFilter
  })

  useEffect(() => {
    const handlePopState = () => {
      if (missedFilterRef.current !== 'all') {
        setMissedFilter('all')
      } else if (periodRef.current !== 7) {
        setPeriod(7)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const d = (key) => t(`retail.dashboard.${key}`)
  const o = (key, values) => t(`retail.overview.${key}`, values)

  const enabled = Boolean(storeId)
  const periodLabel = period === 7 ? d('period7d') : d('period30d')

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
    ['retail-missed', storeId, period],
    () => getMissedOpportunities(storeId, period),
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

  const missedAll = missedQ.data ?? []
  const missedFiltered = missedAll.filter(
    (item) => missedFilter === 'all' || item.reason === missedFilter
  )
  const notInCatalogCount = missedAll.filter((i) => i.reason === 'not_in_catalog').length
  const outOfStockCount = missedAll.filter((i) => i.reason === 'out_of_stock').length

  const aiInsights = useMemo(
    () =>
      buildRetailAIInsights({
        scansCount: scansQ.data ?? 0,
        totalProducts: totalQ.data ?? 0,
        scanCoverage: coverageQ.data,
        lostRevenue: lostQ.data ?? 0,
        missedOpportunities: missedQ.data ?? [],
        topProducts: topQ.data ?? [],
        alternativeSummary: alternativesQ.data,
      }),
    [
      alternativesQ.data,
      coverageQ.data,
      lostQ.data,
      missedQ.data,
      scansQ.data,
      topQ.data,
      totalQ.data,
    ]
  )

  const aiInsightsLoading =
    scansQ.isLoading ||
    totalQ.isLoading ||
    coverageQ.isLoading ||
    lostQ.isLoading ||
    missedQ.isLoading ||
    topQ.isLoading ||
    alternativesQ.isLoading

  const missedTabs = [
    { key: 'all', label: d('missedFilterAll') },
    { key: 'not_in_catalog', label: d('missedFilterNotInCatalog') },
    { key: 'out_of_stock', label: d('missedFilterOutOfStock') },
  ]

  const coverageVal = coverageQ.data ?? 0
  const coverageTone = coverageVal >= 70 ? 'pos' : coverageVal >= 40 ? 'warn' : 'neg'
  const topMax = Math.max(1, ...(topQ.data ?? []).map((p) => Number(p.scan_count) || 0))
  const lostValue = lostQ.data ?? 0

  const attention = []
  if (notInCatalogCount > 0) {
    attention.push({
      id: 'nic',
      tone: 'neg',
      text: o('attentionNotInCatalog', { count: notInCatalogCount }),
    })
  }
  if (outOfStockCount > 0) {
    attention.push({
      id: 'oos',
      tone: 'warn',
      text: o('attentionOutOfStock', { count: outOfStockCount }),
    })
  }

  const goProducts = () => navigate(`/retail/${currentStore?.slug}/products`)

  const altSummary = alternativesQ.data
  const cmpSummary = compareQ.data
  const topScenario = altSummary?.topScenario?.scenario
    ? t(`retail.dashboard.alternatives.scenario.${altSummary.topScenario.scenario}`)
    : null
  const topSource = altSummary?.topSource?.ean ? `EAN ${altSummary.topSource.ean}` : null
  const topPair = cmpSummary?.topPair
    ? `${cmpSummary.topPair.eanA} ↔ ${cmpSummary.topPair.eanB}`
    : null
  const noSignal = d('alternativesNoSignal')

  return (
    <div className="retail-screen-canvas ov">
      {currentStore?.isPublished === false && (
        <div className="ov-banner">
          <div className="ov-banner__text">
            <EyeIcon size={20} color="currentColor" />
            <span>{d('draftWarning')}</span>
          </div>
          <button
            type="button"
            className="rc-btn"
            onClick={() => navigate(`/retail/${currentStore.slug}/settings`)}
          >
            {d('draftWarningBtn')}
          </button>
        </div>
      )}

      <header className="ov-head">
        <div>
          <h1 className="ov-title">{currentStore?.name || d('title')}</h1>
          <p className="ov-sub">{d('subtitle')}</p>
        </div>
        <div className="rc-seg ov-period" role="group" aria-label={d('title')}>
          {[7, 30].map((p) => (
            <button
              key={p}
              type="button"
              className="rc-seg__btn"
              aria-pressed={period === p}
              onClick={() => {
                if (p !== 7) window.history.pushState({}, '')
                setPeriod(p)
              }}
            >
              {p === 7 ? d('period7d') : d('period30d')}
            </button>
          ))}
        </div>
      </header>

      <section className="ov-kpis" aria-label={d('title')}>
        <Kpi
          label={d('scansTitle')}
          value={scansQ.isError ? '—' : (scansQ.data ?? 0).toLocaleString()}
          sub={periodLabel}
          loading={scansQ.isLoading}
        />
        <Kpi
          label={d('uniqueCustomers')}
          value={uniqueQ.isError ? '—' : (uniqueQ.data ?? 0).toLocaleString()}
          sub={periodLabel}
          loading={uniqueQ.isLoading}
        />
        <Kpi
          label={d('catalogCoverage')}
          value={coverageQ.isError ? '—' : `${coverageVal}%`}
          sub={
            totalQ.data != null
              ? o('coverageOf', { total: Number(totalQ.data).toLocaleString() })
              : d('catalogCoverageHint')
          }
          loading={coverageQ.isLoading}
        >
          {!coverageQ.isLoading && !coverageQ.isError && (
            <div className={`ov-meter ov-meter--${coverageTone}`}>
              <span style={{ width: `${Math.min(coverageVal, 100)}%` }} />
            </div>
          )}
        </Kpi>
        <Kpi
          label={d('lostRevenue')}
          value={lostQ.isError ? '—' : `~${formatPrice(lostValue)}`}
          sub={`${periodLabel} · ${d('lostRevenueHint')}`}
          tone={lostValue > 0 ? 'neg' : undefined}
          loading={lostQ.isLoading}
        />
      </section>

      {attention.length > 0 && (
        <Card title={o('attentionTitle')} className="ov-attn">
          {attention.map((item) => (
            <div key={item.id} className={`ov-attn__row ov-tone--${item.tone}`}>
              <span className="ov-attn__icon">
                <AlertTriangleIcon size={16} color="currentColor" />
              </span>
              <span className="ov-attn__text">{item.text}</span>
              <button type="button" className="rc-btn" onClick={goProducts}>
                {o('attentionAction')}
              </button>
            </div>
          ))}
        </Card>
      )}

      <div className="ov-grid">
        <div className="ov-col">
          <Card title={d('topProducts')}>
            {topQ.isError ? (
              <QueryError
                label={d('loadError')}
                retryLabel={d('retry')}
                onRetry={() => topQ.refetch()}
              />
            ) : topQ.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <ProductRow key={i} loading />)
            ) : !topQ.data?.length ? (
              <EmptyState icon="bar_chart" label={d('topEmpty')} sub={d('noDataSub')} />
            ) : (
              topQ.data.map((p, i) => {
                const count = Number(p.scan_count) || 0
                return (
                  <ProductRow
                    key={p.ean}
                    rank={i + 1}
                    name={p.name}
                    scanCount={count}
                    share={(count / topMax) * 100}
                    imageUrl={getImageUrl(p.image_url)}
                    scanLabel={d('scans')}
                  />
                )
              })
            )}
          </Card>

          <Card
            title={d('missedTitle')}
            aside={
              <div className="ov-filter">
                {missedTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    aria-pressed={missedFilter === tab.key}
                    onClick={() => {
                      if (tab.key !== 'all') window.history.pushState({}, '')
                      setMissedFilter(tab.key)
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            }
          >
            {missedQ.isError ? (
              <QueryError
                label={d('loadError')}
                retryLabel={d('retry')}
                onRetry={() => missedQ.refetch()}
              />
            ) : missedQ.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <MissedRow key={i} loading />)
            ) : missedFiltered.length === 0 ? (
              <EmptyState icon="check_circle" label={d('missedEmpty')} sub={d('missedEmptySub')} />
            ) : (
              missedFiltered.map((item) => (
                <MissedRow
                  key={item.ean}
                  ean={item.ean}
                  name={item.name}
                  scanCount={Number(item.scan_count) || 0}
                  imageUrl={getImageUrl(item.image_url)}
                  reason={item.reason}
                  scanLabel={d('scans')}
                  labelNotInCatalog={d('notInCatalog')}
                  labelOutOfStock={d('outOfStock')}
                />
              ))
            )}
          </Card>
        </div>

        <aside className="ov-col">
          <Card title={d('aiInsightsTitle')}>
            {aiInsightsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <InsightRow key={i} loading />)
            ) : aiInsights.length === 0 ? (
              <EmptyState
                icon="insights"
                label={d('aiInsightsEmpty')}
                sub={d('aiInsightsEmptySub')}
              />
            ) : (
              aiInsights.map((insight) => {
                const values = {
                  ...insight.values,
                  amountText:
                    insight.values?.amount != null
                      ? formatPrice(Number(insight.values.amount) || 0)
                      : undefined,
                }
                return (
                  <InsightRow
                    key={insight.id}
                    insight={insight}
                    title={t(insight.titleKey, values)}
                    body={t(insight.bodyKey, values)}
                    action={exists?.(insight.actionKey) ? t(insight.actionKey, values) : null}
                  />
                )
              })
            )}
          </Card>

          <Card title={o('signalsTitle')}>
            <div className="ov-signal">
              <div className="ov-signal__head">
                <span className="ov-signal__name">{d('alternativesTitle')}</span>
                <span className="ov-signal__total rc-num">
                  {alternativesQ.isError ? '—' : (altSummary?.total ?? 0)}
                </span>
              </div>
              {alternativesQ.isError ? (
                <QueryError
                  label={d('loadError')}
                  retryLabel={d('retry')}
                  onRetry={() => alternativesQ.refetch()}
                />
              ) : (
                <>
                  <p className="ov-signal__hint">{d('alternativesSub')}</p>
                  <StatList
                    loading={alternativesQ.isLoading}
                    items={[
                      { label: d('alternativesCompare'), value: altSummary?.compareCount ?? 0 },
                      { label: d('alternativesAI'), value: altSummary?.aiHelpCount ?? 0 },
                    ]}
                  />
                  <FactLine label={d('alternativesTopScenario')} value={topScenario || noSignal} />
                  <FactLine label={d('alternativesTopSource')} value={topSource || noSignal} />
                </>
              )}
            </div>

            <div className="ov-signal">
              <div className="ov-signal__head">
                <span className="ov-signal__name">{d('compareTitle')}</span>
                <span className="ov-signal__total rc-num">
                  {compareQ.isError ? '—' : (cmpSummary?.total ?? 0)}
                </span>
              </div>
              {compareQ.isError ? (
                <QueryError
                  label={d('loadError')}
                  retryLabel={d('retry')}
                  onRetry={() => compareQ.refetch()}
                />
              ) : (
                <>
                  <p className="ov-signal__hint">{d('compareSub')}</p>
                  <StatList
                    loading={compareQ.isLoading}
                    items={[
                      { label: d('compareWinner'), value: cmpSummary?.winnerCount ?? 0 },
                      { label: d('compareDraw'), value: cmpSummary?.drawCount ?? 0 },
                      { label: d('compareBlocked'), value: cmpSummary?.blockedCount ?? 0 },
                    ]}
                  />
                  <FactLine label={d('compareTopPair')} value={topPair || d('compareNoPair')} />
                </>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
