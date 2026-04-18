import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '../utils/i18n.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { getImageUrl } from '../utils/imageUrl.js'
import {
  getScansCount,
  getUniqueProductsScanned,
  getTotalProducts,
  getTopScannedProducts,
  getMissedOpportunities,
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
  neutral: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', color: '#fff' },
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

// ── Product row (top-5) ────────────────────────────────────────────
function ProductRow({ rank, name, scanCount, imageUrl, scanLabel, loading }) {
  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
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
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
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
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
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
            color: '#fff',
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
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
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
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
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
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
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
            color: '#fff',
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
          color: '#fff',
          margin: 0,
        }}
      >
        {title}
      </h3>
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
  const { t } = useI18n()
  const { storeId, currentStore } = useStore()
  const [period, setPeriod] = useState(7)
  const [missedFilter, setMissedFilter] = useState('all')

  const d = t.retail.dashboard
  const enabled = Boolean(storeId)
  const periodLabel = period === 7 ? d.period7d : d.period30d

  const scansQ = useQuery({
    queryKey: ['retail-scans', storeId, period],
    queryFn: () => getScansCount(storeId, period),
    enabled,
  })

  const uniqueQ = useQuery({
    queryKey: ['retail-unique', storeId, period],
    queryFn: () => getUniqueProductsScanned(storeId, period),
    enabled,
  })

  const totalQ = useQuery({
    queryKey: ['retail-total', storeId],
    queryFn: () => getTotalProducts(storeId),
    enabled,
    staleTime: 5 * 60_000,
  })

  const topQ = useQuery({
    queryKey: ['retail-top', storeId, period],
    queryFn: () => getTopScannedProducts(storeId, period, 5),
    enabled,
  })

  const missedQ = useQuery({
    queryKey: ['retail-missed', storeId, period],
    queryFn: () => getMissedOpportunities(storeId, period),
    enabled,
  })

  const missedFiltered = (missedQ.data ?? []).filter(
    (item) => missedFilter === 'all' || item.reason === missedFilter
  )

  const MISSED_TABS = [
    { key: 'all', label: d.missedFilterAll },
    { key: 'not_in_catalog', label: d.missedFilterNotInCatalog },
    { key: 'out_of_stock', label: d.missedFilterOutOfStock },
  ]

  return (
    <div style={{ padding: '20px 16px 8px', display: 'flex', flexDirection: 'column', gap: 20 }}>
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
              color: '#fff',
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
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: 3,
            gap: 3,
          }}
        >
          {[7, 30].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
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
          label={d.uniqueProducts}
          sub={periodLabel}
          value={uniqueQ.isError ? '—' : (uniqueQ.data ?? 0).toLocaleString()}
          icon="package_2"
          accent="neutral"
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
          accent="green"
          loading={totalQ.isLoading}
        />
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
                onClick={() => setMissedFilter(tab.key)}
                style={{
                  padding: '5px 11px',
                  borderRadius: 8,
                  border: `1px solid ${active ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`,
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
