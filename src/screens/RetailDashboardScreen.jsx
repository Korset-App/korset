import { lazy, Suspense, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { useRetailOverview } from '../hooks/useRetailOverview.js'
import { getRetailPath } from '../domain/retail/navigation.js'
import { getImageUrl } from '../utils/imageUrl.js'
import { formatPrice } from '../utils/formatPrice.js'
import { AlertTriangleIcon, EyeIcon } from '../components/icons/index.js'
import {
  Card,
  Kpi,
  ProductRow,
  MissedRow,
  EmptyState,
  QueryError,
} from '../components/retail/overview/OverviewParts.jsx'
import OverviewSignals from '../components/retail/overview/OverviewSignals.jsx'
import OverviewPriorities from '../components/retail/overview/OverviewPriorities.jsx'
import OverviewLaunch from '../components/retail/overview/OverviewLaunch.jsx'
import '../components/retail/overview/overview.css'

const QrDialog = lazy(() => import('../components/retail/RetailQrDialog.jsx'))

export default function RetailDashboardScreen() {
  const { t, format } = useI18n()
  const navigate = useNavigate()
  const { storeId, currentStore } = useStore()
  const {
    period,
    setPeriod,
    missedFilter,
    setMissedFilter,
    scansQ,
    uniqueQ,
    lostQ,
    coverageQ,
    totalQ,
    topQ,
    missedQ,
    alternativesQ,
    compareQ,
    insights: aiInsights,
    insightsLoading: aiInsightsLoading,
    insightsError,
    retryInsights,
  } = useRetailOverview(storeId)
  const [qrOpen, setQrOpen] = useState(false)
  const qrTrigger = useRef(null)
  const d = (key) => t(`retail.dashboard.${key}`)
  const o = (key, values) => t(`retail.overview.${key}`, values)

  const periodLabel = o(`period${period}`)

  const missedAll = missedQ.data?.items ?? []
  const missedFiltered = missedAll.filter(
    (item) => missedFilter === 'all' || item.reason === missedFilter
  )
  const notInCatalogCount = missedAll.filter((i) => i.reason === 'not_in_catalog').length
  const outOfStockCount = missedAll.filter((i) => i.reason === 'out_of_stock').length

  const missedTabs = [
    { key: 'all', label: d('missedFilterAll') },
    { key: 'not_in_catalog', label: d('missedFilterNotInCatalog') },
    { key: 'out_of_stock', label: d('missedFilterOutOfStock') },
  ]

  const coverageVal = coverageQ.data ?? 0
  const coverageTone = coverageVal >= 70 ? 'pos' : coverageVal >= 40 ? 'warn' : 'neg'
  const topMax = Math.max(1, ...(topQ.data ?? []).map((p) => Number(p.scan_count) || 0))
  const lostValue = lostQ.data ?? 0
  const noScans = scansQ.isSuccess && scansQ.data === 0

  const attention = []
  if (notInCatalogCount > 0) {
    attention.push({
      id: 'nic',
      tone: 'neg',
      text: o(missedQ.data?.hasMore ? 'attentionNotInCatalogLimited' : 'attentionNotInCatalog', {
        count: notInCatalogCount,
      }),
    })
  }
  if (outOfStockCount > 0) {
    attention.push({
      id: 'oos',
      tone: 'warn',
      text: o(missedQ.data?.hasMore ? 'attentionOutOfStockLimited' : 'attentionOutOfStock', {
        count: outOfStockCount,
      }),
    })
  }

  const goProducts = () => navigate(getRetailPath(currentStore?.slug, 'products'))
  const goRecovery = () => navigate(getRetailPath(currentStore?.slug, 'ean-recovery'))

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
            onClick={() => navigate(getRetailPath(currentStore?.slug, 'settings'))}
          >
            {d('draftWarningBtn')}
          </button>
        </div>
      )}

      <header className="ov-head">
        <div>
          <span className="ov-eyebrow">{o('eyebrow')}</span>
          <h1 className="ov-title">{o('title')}</h1>
          <p className="ov-sub">{o('subtitle')}</p>
        </div>
        <div className="rc-seg ov-period" role="group" aria-label={o('period')}>
          {[1, 7, 14, 30, 90].map((p) => (
            <button
              key={p}
              type="button"
              className="rc-seg__btn"
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
            >
              {o(`period${p}`)}
            </button>
          ))}
        </div>
      </header>

      <section className="ov-kpis" aria-label={d('title')}>
        <Kpi
          label={d('scansTitle')}
          value={scansQ.isError ? '—' : format.number(scansQ.data ?? 0)}
          sub={periodLabel}
          loading={scansQ.isLoading}
          icon="barcode_scanner"
        />
        <Kpi
          label={d('uniqueCustomers')}
          value={uniqueQ.isError ? '—' : format.number(uniqueQ.data ?? 0)}
          sub={o('identifiedCustomers')}
          loading={uniqueQ.isLoading}
          icon="group"
        />
        <Kpi
          label={d('catalogCoverage')}
          value={coverageQ.isError || noScans ? '—' : `${coverageVal}%`}
          sub={noScans ? o('coverageNoScans') : d('catalogCoverageHint')}
          loading={coverageQ.isLoading}
          icon="verified"
        >
          {!coverageQ.isLoading && !coverageQ.isError && !noScans && (
            <div className={`ov-meter ov-meter--${coverageTone}`}>
              <span style={{ width: `${Math.min(coverageVal, 100)}%` }} />
            </div>
          )}
        </Kpi>
        <Kpi
          label={d('lostRevenue')}
          value={lostQ.isError ? '—' : `${lostValue > 0 ? '≈ ' : ''}${formatPrice(lostValue)}`}
          sub={o('revenueEstimate')}
          tone={lostValue > 0 ? 'neg' : undefined}
          loading={lostQ.isLoading}
          icon="payments"
        />
      </section>

      {noScans && totalQ.isSuccess && (
        <OverviewLaunch
          products={totalQ.data}
          published={currentStore?.isPublished !== false}
          onCatalog={goProducts}
          onStorefront={() => navigate(getRetailPath(currentStore?.slug, 'storefront'))}
          onQr={(event) => {
            qrTrigger.current = event.currentTarget
            setQrOpen(true)
          }}
        />
      )}

      {attention.length > 0 && (
        <Card title={o('attentionTitle')} className="ov-attn">
          {attention.map((item) => (
            <div key={item.id} className={`ov-attn__row ov-tone--${item.tone}`}>
              <span className="ov-attn__icon">
                <AlertTriangleIcon size={16} color="currentColor" />
              </span>
              <span className="ov-attn__text">{item.text}</span>
              <button
                type="button"
                className="rc-btn"
                onClick={item.id === 'nic' ? goRecovery : goProducts}
              >
                {o(item.id === 'nic' ? 'checkUnknown' : 'checkStock')}
              </button>
            </div>
          ))}
        </Card>
      )}

      <div className="ov-catalog-note">
        {totalQ.isError ? (
          <QueryError
            label={d('loadError')}
            retryLabel={d('retry')}
            onRetry={() => totalQ.refetch()}
          />
        ) : (
          <span>
            {o('catalogCount', { total: totalQ.isLoading ? '—' : format.number(totalQ.data ?? 0) })}
          </span>
        )}
        <button type="button" className="ov-text-action" onClick={goProducts}>
          {o('attentionAction')} <span aria-hidden="true">↗</span>
        </button>
      </div>
      <div className="ov-grid">
        <div className="ov-col">
          <Card title={d('topProducts')}>
            <p className="ov-section-note">{o('topNote', { period: periodLabel })}</p>
            {topQ.isError ? (
              <QueryError
                label={d('loadError')}
                retryLabel={d('retry')}
                onRetry={() => topQ.refetch()}
              />
            ) : topQ.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <ProductRow key={i} loading />)
            ) : !topQ.data?.length ? (
              <EmptyState icon="bar_chart" label={d('topEmpty')} sub={o('topEmptyHint')} />
            ) : (
              topQ.data.map((p, i) => {
                const count = Number(p.scan_count) || 0
                return (
                  <ProductRow
                    key={p.ean || i}
                    rank={i + 1}
                    name={p.name}
                    scanCount={count}
                    countText={format.number(count)}
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
                    onClick={() => setMissedFilter(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            }
          >
            <p className="ov-section-note">
              {o(missedQ.data?.hasMore ? 'missedLimited' : 'missedNote', {
                limit: missedQ.data?.limit ?? 50,
              })}
            </p>
            {missedQ.isError ? (
              <QueryError
                label={d('loadError')}
                retryLabel={d('retry')}
                onRetry={() => missedQ.refetch()}
              />
            ) : missedQ.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <MissedRow key={i} loading />)
            ) : missedFiltered.length === 0 ? (
              <EmptyState
                icon={noScans ? 'barcode_scanner' : 'check_circle'}
                label={
                  noScans
                    ? o('missedNoScans')
                    : missedQ.data?.hasMore
                      ? o('missedSampleEmpty')
                      : d('missedEmpty')
                }
                sub={
                  noScans
                    ? o('missedNoScansHint')
                    : missedQ.data?.hasMore
                      ? o('missedSampleEmptyHint')
                      : d('missedEmptySub')
                }
              />
            ) : (
              missedFiltered.map((item, i) => (
                <MissedRow
                  key={item.ean || i}
                  ean={item.ean}
                  name={item.name}
                  scanCount={Number(item.scan_count) || 0}
                  countText={format.number(Number(item.scan_count) || 0)}
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

        <aside className="ov-col ov-rail">
          <OverviewPriorities
            insights={aiInsights}
            loading={aiInsightsLoading}
            error={insightsError}
            retry={retryInsights}
            partialDemand={missedQ.data?.hasMore}
            onAction={(id, trigger) => {
              if (id === 'activate_scans') {
                qrTrigger.current = trigger
                setQrOpen(true)
              } else if (id === 'unknown_ean_demand') goRecovery()
              else goProducts()
            }}
          />
          {missedQ.data?.hasMore && (
            <p className="ov-section-note">
              {o('prioritiesLimited', { limit: missedQ.data.limit })}
            </p>
          )}

          <OverviewSignals alternativesQ={alternativesQ} compareQ={compareQ} />
        </aside>
      </div>
      <button
        type="button"
        className="ov-text-action ov-qr-action"
        onClick={(event) => {
          qrTrigger.current = event.currentTarget
          setQrOpen(true)
        }}
        disabled={!currentStore?.slug}
      >
        {o('showQr')}
      </button>
      {qrOpen && (
        <Suspense fallback={null}>
          <QrDialog
            type="cashier"
            store={currentStore}
            onClose={() => setQrOpen(false)}
            returnFocusRef={qrTrigger}
          />
        </Suspense>
      )}
    </div>
  )
}
