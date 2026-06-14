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
} from '../utils/retailAnalytics.js'

// ── Skeleton placeholder ───────────────────────────────────────────
function Skel({ w = '100%', h = 20, r = 6 }) {
  return <div className="retail-skel" style={{ width: w, height: h, borderRadius: r }} />
}

// ── Metric card ────────────────────────────────────────────────────
const CARD_THEME = {
  blue: { bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.2)', color: '#38BDF8' },
  amber: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', color: '#F59E0B' },
  green: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', color: '#10B981' },
  red: { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', color: '#F87171' },
  neutral: { bg: 'var(--glass-subtle)', border: 'var(--glass-soft-border)', color: 'var(--text)' },
}

function MetricCard({ label, sub, value, icon, accent = 'neutral', loading }) {
  const th = CARD_THEME[accent] ?? CARD_THEME.neutral
  return (
    <div
      style={{
        background: th.bg,
        border: `1px solid ${th.border}`,
        borderRadius: 16,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 12,
          color: 'var(--text-dim)',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: th.color }}>
          {icon}
        </span>
        {label}
      </div>
      {loading ? (
        <Skel h={32} w="55%" r={8} />
      ) : (
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: th.color,
            lineHeight: 1.15,
          }}
        >
          {value}
        </div>
      )}
      {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function AlternativeSignalsCard({ summary, loading, error, onRetry, d, t }) {
  const topScenarioLabel = summary?.topScenario?.scenario
    ? t(`retail.dashboard.alternatives.scenario.${summary.topScenario.scenario}`)
    : null
  const topSourceText = summary?.topSource?.ean ? `EAN ${summary.topSource.ean}` : null

  return (
    <div
      style={{
        background: 'rgba(16,185,129,0.07)',
        border: '1px solid rgba(16,185,129,0.18)',
        borderRadius: 16,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionHeader icon="compare_arrows" iconColor="#10B981" title={d.alternativesTitle} />
        {loading ? (
          <Skel h={28} w={58} r={8} />
        ) : (
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              color: '#10B981',
              lineHeight: 1,
            }}
          >
            {error ? '—' : (summary?.total ?? 0)}
          </div>
        )}
      </div>

      {error ? (
        <QueryError label={d.loadError} retryLabel={d.retry} onRetry={onRetry} />
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4 }}>
            {d.alternativesSub}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <MiniSignal
              label={d.alternativesCompare}
              value={summary?.compareCount ?? 0}
              loading={loading}
            />
            <MiniSignal
              label={d.alternativesAI}
              value={summary?.aiHelpCount ?? 0}
              loading={loading}
            />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              fontSize: 12,
              color: 'var(--text-dim)',
            }}
          >
            <div>
              <strong style={{ color: 'var(--text)' }}>{d.alternativesTopScenario}:</strong>{' '}
              {loading ? '...' : topScenarioLabel || d.alternativesNoSignal}
            </div>
            <div>
              <strong style={{ color: 'var(--text)' }}>{d.alternativesTopSource}:</strong>{' '}
              {loading ? '...' : topSourceText || d.alternativesNoSignal}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MiniSignal({ label, value, loading }) {
  return (
    <div
      style={{
        background: 'var(--glass-subtle)',
        border: '1px solid var(--glass-soft-border)',
        borderRadius: 12,
        padding: '10px 12px',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>{label}</div>
      {loading ? (
        <Skel h={22} w={42} r={7} />
      ) : (
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            color: '#10B981',
            lineHeight: 1,
          }}
        >
          {value}
        </div>
      )}
    </div>
  )
}

// ── Product row (top-5) ────────────────────────────────────────────
function ProductRow({ rank, name, scanCount, imageUrl, scanLabel, loading }) {
  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--glass-subtle)',
    border: '1px solid var(--glass-soft-border)',
    padding: '10px 12px',
    borderRadius: 12,
    gap: 12,
  }
  if (loading) {
    return (
      <div style={rowStyle}>
        <Skel w={32} h={32} r={8} />
        <Skel w={40} h={40} r={8} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skel h={13} w="65%" />
          <Skel h={10} w="30%" />
        </div>
        <Skel h={18} w={44} r={6} />
      </div>
    )
  }
  return (
    <div style={rowStyle}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: 'rgba(56,189,248,0.12)',
          border: '1px solid rgba(56,189,248,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          color: '#38BDF8',
          flexShrink: 0,
        }}
      >
        {rank}
      </div>
      <div
        className="catalog-img-box"
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name ?? ''}
            className="product-img-blend"
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }}
          />
        ) : (
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 20, color: 'var(--text-dim)' }}
          >
            inventory_2
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name ?? `EAN: ${rank}`}
        </div>
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#38BDF8',
          fontFamily: 'var(--font-display)',
          flexShrink: 0,
        }}
      >
        {scanCount}{' '}
        <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-dim)' }}>{scanLabel}</span>
      </div>
    </div>
  )
}

// ── Missed opportunity row ─────────────────────────────────────────
function MissedRow({
  ean,
  name,
  scanCount,
  imageUrl,
  reason,
  scanLabel,
  labelNotInCatalog,
  labelOutOfStock,
  loading,
}) {
  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--glass-subtle)',
    border: '1px solid var(--glass-soft-border)',
    padding: '10px 12px',
    borderRadius: 12,
    gap: 12,
  }
  if (loading) {
    return (
      <div style={rowStyle}>
        <Skel w={40} h={40} r={8} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skel h={13} w="65%" />
          <Skel h={18} w="38%" r={6} />
        </div>
        <Skel h={18} w={44} r={6} />
      </div>
    )
  }

  const isOOS = reason === 'out_of_stock'
  const badgeBg = isOOS ? 'rgba(245,158,11,0.12)' : 'rgba(248,113,113,0.10)'
  const badgeBorder = isOOS ? 'rgba(245,158,11,0.3)' : 'rgba(248,113,113,0.3)'
  const badgeColor = isOOS ? '#F59E0B' : '#F87171'
  const badgeIcon = isOOS ? 'inventory' : 'block'
  const badgeLabel = isOOS ? labelOutOfStock : labelNotInCatalog

  return (
    <div style={rowStyle}>
      <div
        className="catalog-img-box"
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name ?? ''}
            className="product-img-blend"
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }}
          />
        ) : (
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 20, color: 'var(--text-dim)' }}
          >
            inventory_2
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name ?? ean}
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            marginTop: 3,
            background: badgeBg,
            border: `1px solid ${badgeBorder}`,
            borderRadius: 6,
            padding: '1px 6px',
            fontSize: 10,
            fontWeight: 600,
            color: badgeColor,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 10 }}>
            {badgeIcon}
          </span>
          {badgeLabel}
        </div>
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-sub)',
          fontFamily: 'var(--font-display)',
          flexShrink: 0,
        }}
      >
        {scanCount}{' '}
        <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-dim)' }}>{scanLabel}</span>
      </div>
    </div>
  )
}

// ── Error block ────────────────────────────────────────────────────
function QueryError({ label, retryLabel, onRetry }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '16px',
        background: 'rgba(248,113,113,0.06)',
        border: '1px solid rgba(248,113,113,0.15)',
        borderRadius: 12,
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#F87171' }}>
        warning
      </span>
      <div style={{ fontSize: 13, color: '#F87171' }}>{label}</div>
      <button
        onClick={onRetry}
        style={{
          fontSize: 12,
          color: '#38BDF8',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textDecoration: 'underline',
          padding: 0,
        }}
      >
        {retryLabel}
      </button>
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────
function SectionHeader({ icon, iconColor, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: iconColor }}>
        {icon}
      </span>
      <h3
        style={{
          fontSize: 15,
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          color: 'var(--text)',
          margin: 0,
        }}
      >
        {title}
      </h3>
    </div>
  )
}

// ── AI insights ────────────────────────────────────────────────────
const AI_INSIGHT_THEME = {
  danger: { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', color: '#F87171' },
  warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)', color: '#F59E0B' },
  positive: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', color: '#10B981' },
  info: { bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.2)', color: '#38BDF8' },
}

function AIInsightRow({ insight, t, exists, loading }) {
  if (loading) {
    return (
      <div
        style={{
          background: 'var(--glass-subtle)',
          border: '1px solid var(--glass-soft-border)',
          borderRadius: 12,
          padding: '11px 12px',
          display: 'flex',
          gap: 10,
        }}
      >
        <Skel w={30} h={30} r={8} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <Skel h={13} w="55%" />
          <Skel h={11} w="88%" />
        </div>
      </div>
    )
  }

  const theme = AI_INSIGHT_THEME[insight.tone] ?? AI_INSIGHT_THEME.info
  const values = {
    ...insight.values,
    amountText:
      insight.values?.amount != null ? formatPrice(Number(insight.values.amount) || 0) : undefined,
  }

  return (
    <div
      style={{
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: '11px 12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: 'var(--glass-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 17, color: theme.color }}>
          {insight.icon}
        </span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25 }}>
          {t(insight.titleKey, values)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.35, marginTop: 3 }}>
          {t(insight.bodyKey, values)}
        </div>
        {exists?.(insight.actionKey) && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              marginTop: 8,
              fontSize: 11,
              fontWeight: 700,
              color: theme.color,
              lineHeight: 1.3,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              arrow_forward
            </span>
            {t(insight.actionKey, values)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────
function EmptyState({ icon, label, sub }) {
  return (
    <div
      style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-dim)', fontSize: 13 }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 30, display: 'block', marginBottom: 8, opacity: 0.45 }}
      >
        {icon}
      </span>
      <div>{label}</div>
      {sub && <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>{sub}</div>}
    </div>
  )
}

// ── Main screen ────────────────────────────────────────────────────
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

  const d = useMemo(
    () => ({
      title: t('retail.dashboard.title'),
      subtitle: t('retail.dashboard.subtitle'),
      period7d: t('retail.dashboard.period7d'),
      period30d: t('retail.dashboard.period30d'),
      scansTitle: t('retail.dashboard.scansTitle'),
      uniqueCustomers: t('retail.dashboard.uniqueCustomers'),
      missedProducts: t('retail.dashboard.missedProducts'),
      totalProducts: t('retail.dashboard.totalProducts'),
      lostRevenue: t('retail.dashboard.lostRevenue'),
      lostRevenueHint: t('retail.dashboard.lostRevenueHint'),
      catalogCoverage: t('retail.dashboard.catalogCoverage'),
      catalogCoverageHint: t('retail.dashboard.catalogCoverageHint'),
      topProducts: t('retail.dashboard.topProducts'),
      loadError: t('retail.dashboard.loadError'),
      retry: t('retail.dashboard.retry'),
      topEmpty: t('retail.dashboard.topEmpty'),
      noDataSub: t('retail.dashboard.noDataSub'),
      scans: t('retail.dashboard.scans'),
      missedTitle: t('retail.dashboard.missedTitle'),
      missedEmpty: t('retail.dashboard.missedEmpty'),
      missedEmptySub: t('retail.dashboard.missedEmptySub'),
      notInCatalog: t('retail.dashboard.notInCatalog'),
      outOfStock: t('retail.dashboard.outOfStock'),
      missedFilterAll: t('retail.dashboard.missedFilterAll'),
      missedFilterNotInCatalog: t('retail.dashboard.missedFilterNotInCatalog'),
      missedFilterOutOfStock: t('retail.dashboard.missedFilterOutOfStock'),
      aiInsightsTitle: t('retail.dashboard.aiInsightsTitle'),
      aiInsightsEmpty: t('retail.dashboard.aiInsightsEmpty'),
      aiInsightsEmptySub: t('retail.dashboard.aiInsightsEmptySub'),
      alternativesTitle: t('retail.dashboard.alternativesTitle'),
      alternativesSub: t('retail.dashboard.alternativesSub'),
      alternativesCompare: t('retail.dashboard.alternativesCompare'),
      alternativesAI: t('retail.dashboard.alternativesAI'),
      alternativesTopScenario: t('retail.dashboard.alternativesTopScenario'),
      alternativesTopSource: t('retail.dashboard.alternativesTopSource'),
      alternativesNoSignal: t('retail.dashboard.alternativesNoSignal'),
    }),
    [t]
  )
  const enabled = Boolean(storeId)
  const periodLabel = period === 7 ? d.period7d : d.period30d

  const STALE = 2 * 60_000 // 2 мин — не перезагружать при переключении вкладок
  const GC = 10 * 60_000 // 10 мин — держать кэш в памяти после размонтирования

  const scansQ = useQuery({
    queryKey: ['retail-scans', storeId, period],
    queryFn: () => getScansCount(storeId, period),
    enabled,
    staleTime: STALE,
    gcTime: GC,
  })

  const uniqueQ = useQuery({
    queryKey: ['retail-unique-customers', storeId, period],
    queryFn: () => getUniqueCustomers(storeId, period),
    enabled,
    staleTime: STALE,
    gcTime: GC,
  })

  const lostQ = useQuery({
    queryKey: ['retail-lost-revenue', storeId, period],
    queryFn: () => getLostRevenue(storeId, period),
    enabled,
    staleTime: STALE,
    gcTime: GC,
  })

  const coverageQ = useQuery({
    queryKey: ['retail-coverage', storeId, period],
    queryFn: () => getScanCoverage(storeId, period),
    enabled,
    staleTime: STALE,
    gcTime: GC,
  })

  const totalQ = useQuery({
    queryKey: ['retail-total', storeId],
    queryFn: () => getTotalProducts(storeId),
    enabled,
    staleTime: 5 * 60_000,
    gcTime: GC,
  })

  const topQ = useQuery({
    queryKey: ['retail-top', storeId, period],
    queryFn: () => getTopScannedProducts(storeId, period, 5),
    enabled,
    staleTime: STALE,
    gcTime: GC,
  })

  const missedQ = useQuery({
    queryKey: ['retail-missed', storeId, period],
    queryFn: () => getMissedOpportunities(storeId, period),
    enabled,
    staleTime: STALE,
    gcTime: GC,
  })

  const alternativesQ = useQuery({
    queryKey: ['retail-alternatives-summary', storeId, period],
    queryFn: () => getAlternativeEventsSummary(storeId, period),
    enabled,
    staleTime: STALE,
    gcTime: GC,
  })

  const missedFiltered = (missedQ.data ?? []).filter(
    (item) => missedFilter === 'all' || item.reason === missedFilter
  )

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

  const MISSED_TABS = [
    { key: 'all', label: d.missedFilterAll },
    { key: 'not_in_catalog', label: d.missedFilterNotInCatalog },
    { key: 'out_of_stock', label: d.missedFilterOutOfStock },
  ]

  return (
    <div style={{ padding: '20px 16px 8px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {currentStore?.isPublished === false && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.22)',
            borderRadius: 16,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <span className="material-symbols-outlined" style={{ color: '#F59E0B', fontSize: 24, flexShrink: 0 }}>
              visibility_off
            </span>
            <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.4 }}>
              {t('retail.dashboard.draftWarning') || 'Ваш магазин находится в режиме черновика и не виден покупателям. Настройте каталог и опубликуйте его в Настройках.'}
            </div>
          </div>
          <button
            onClick={() => navigate(`/retail/${currentStore.slug}/settings`)}
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#F59E0B',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t('retail.dashboard.draftWarningBtn') || 'Настроить'}
          </button>
        </div>
      )}

      {/* ── Store + Period Toggle ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--text)',
              lineHeight: 1.3,
            }}
          >
            {currentStore?.name || d.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{d.subtitle}</div>
        </div>
        <div
          style={{
            display: 'flex',
            flexShrink: 0,
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 10,
            padding: 3,
            gap: 3,
          }}
        >
          {[7, 30].map((p) => (
            <button
              key={p}
              onClick={() => {
                if (p !== 7) {
                  window.history.pushState({}, '')
                }
                setPeriod(p)
              }}
              style={{
                padding: '5px 14px',
                borderRadius: 7,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'var(--font-body)',
                background: period === p ? '#38BDF8' : 'transparent',
                color: period === p ? '#07070F' : 'var(--text-dim)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {p === 7 ? d.period7d : d.period30d}
            </button>
          ))}
        </div>
      </div>

      {/* ── Metrics 2×2 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <MetricCard
          label={d.scansTitle}
          sub={periodLabel}
          value={scansQ.isError ? '—' : (scansQ.data ?? 0).toLocaleString()}
          icon="query_stats"
          accent="blue"
          loading={scansQ.isLoading}
        />
        <MetricCard
          label={d.uniqueCustomers}
          sub={periodLabel}
          value={uniqueQ.isError ? '—' : (uniqueQ.data ?? 0).toLocaleString()}
          icon="group"
          accent="green"
          loading={uniqueQ.isLoading}
        />
        <MetricCard
          label={d.missedProducts}
          sub={periodLabel}
          value={missedQ.isError ? '—' : (missedQ.data ?? []).length.toLocaleString()}
          icon="warning"
          accent="amber"
          loading={missedQ.isLoading}
        />
        <MetricCard
          label={d.totalProducts}
          value={totalQ.isError ? '—' : (totalQ.data ?? 0).toLocaleString()}
          icon="inventory_2"
          accent="neutral"
          loading={totalQ.isLoading}
        />
      </div>

      {/* ── Lost Revenue card (full width) ── */}
      <div
        style={{
          background: 'rgba(248,113,113,0.07)',
          border: '1px solid rgba(248,113,113,0.18)',
          borderRadius: 16,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              color: 'var(--text-dim)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#F87171' }}>
              trending_down
            </span>
            {d.lostRevenue}
          </div>
          {lostQ.isLoading ? (
            <div className="retail-skel" style={{ height: 28, width: 120, borderRadius: 6 }} />
          ) : (
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: '#F87171',
                lineHeight: 1.2,
              }}
            >
              {lostQ.isError ? '—' : `~${formatPrice(lostQ.data ?? 0)}`}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            {periodLabel} · {d.lostRevenueHint}
          </div>
        </div>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 36, color: 'rgba(248,113,113,0.25)', flexShrink: 0 }}
        >
          money_off
        </span>
      </div>

      {/* ── Scan coverage progress bar ── */}
      <div
        style={{
          background: 'var(--glass-subtle)',
          border: '1px solid var(--glass-soft-border)',
          borderRadius: 14,
          padding: '12px 14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              color: 'var(--text-dim)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#38BDF8' }}>
              fact_check
            </span>
            {d.catalogCoverage}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: (() => {
                const v = coverageQ.data ?? 0
                if (v >= 70) return '#10B981'
                if (v >= 40) return '#F59E0B'
                return '#F87171'
              })(),
            }}
          >
            {coverageQ.isLoading ? '...' : coverageQ.isError ? '—' : `${coverageQ.data ?? 0}%`}
          </div>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 3,
            background: 'var(--glass-soft-border)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: coverageQ.isLoading ? '0%' : `${Math.min(coverageQ.data ?? 0, 100)}%`,
              borderRadius: 3,
              background: (() => {
                const v = coverageQ.data ?? 0
                if (v >= 70) return 'linear-gradient(90deg, #10B981, #34D399)'
                if (v >= 40) return 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                return 'linear-gradient(90deg, #F87171, #FCA5A5)'
              })(),
              transition: 'width 0.6s ease',
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 5 }}>
          {d.catalogCoverageHint}
        </div>
      </div>

      <AlternativeSignalsCard
        summary={alternativesQ.data}
        loading={alternativesQ.isLoading}
        error={alternativesQ.isError}
        onRetry={() => alternativesQ.refetch()}
        d={d}
        t={t}
      />

      {/* AI insights */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionHeader icon="auto_awesome" iconColor="#38BDF8" title={d.aiInsightsTitle} />

        {aiInsightsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <AIInsightRow key={i} loading t={t} exists={exists} />
          ))
        ) : aiInsights.length === 0 ? (
          <EmptyState icon="insights" label={d.aiInsightsEmpty} sub={d.aiInsightsEmptySub} />
        ) : (
          aiInsights.map((insight) => (
            <AIInsightRow
              key={insight.id}
              insight={insight}
              t={t}
              exists={exists}
              loading={false}
            />
          ))
        )}
      </div>

      {/* ── Top-5 Products ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionHeader icon="trending_up" iconColor="#38BDF8" title={d.topProducts} />

        {topQ.isError ? (
          <QueryError label={d.loadError} retryLabel={d.retry} onRetry={() => topQ.refetch()} />
        ) : topQ.isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <ProductRow key={i} loading />)
        ) : !topQ.data?.length ? (
          <EmptyState icon="bar_chart" label={d.topEmpty} sub={d.noDataSub} />
        ) : (
          topQ.data.map((p, i) => (
            <ProductRow
              key={p.ean}
              rank={i + 1}
              name={p.name}
              scanCount={Number(p.scan_count)}
              imageUrl={getImageUrl(p.image_url)}
              scanLabel={d.scans}
              loading={false}
            />
          ))
        )}
      </div>

      {/* ── Missed Opportunities ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 20 }}>
        <SectionHeader icon="sentiment_dissatisfied" iconColor="#F59E0B" title={d.missedTitle} />

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MISSED_TABS.map((tab) => {
            const active = missedFilter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.key !== 'all') {
                    window.history.pushState({}, '')
                  }
                  setMissedFilter(tab.key)
                }}
                style={{
                  padding: '5px 11px',
                  borderRadius: 8,
                  border: `1px solid ${active ? 'rgba(245,158,11,0.4)' : 'var(--glass-soft-border)'}`,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  background: active ? 'rgba(245,158,11,0.13)' : 'transparent',
                  color: active ? '#F59E0B' : 'var(--text-dim)',
                  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* List */}
        {missedQ.isError ? (
          <QueryError label={d.loadError} retryLabel={d.retry} onRetry={() => missedQ.refetch()} />
        ) : missedQ.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <MissedRow key={i} loading />)
        ) : missedFiltered.length === 0 ? (
          <EmptyState icon="check_circle" label={d.missedEmpty} sub={d.missedEmptySub} />
        ) : (
          missedFiltered.map((item) => (
            <MissedRow
              key={item.ean}
              ean={item.ean}
              name={item.name}
              scanCount={Number(item.scan_count)}
              imageUrl={getImageUrl(item.image_url)}
              reason={item.reason}
              scanLabel={d.scans}
              labelNotInCatalog={d.notInCatalog}
              labelOutOfStock={d.outOfStock}
              loading={false}
            />
          ))
        )}
      </div>
    </div>
  )
}
