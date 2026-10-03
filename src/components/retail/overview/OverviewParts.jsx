import {
  AlertTriangleIcon,
  ArrowForwardIcon,
  BarcodeScannerIcon,
  CheckCircleIcon,
  CompareIcon,
  EditIcon,
  ExploreIcon,
  EyeIcon,
  FactCheckIcon,
  InventoryIcon,
  SparklesIcon,
  VerifiedBadgeIcon,
  WalletIcon,
} from '../../icons/index.js'

const ICON_MAP = {
  barcode_scanner: BarcodeScannerIcon,
  inventory: InventoryIcon,
  inventory_2: InventoryIcon,
  category_search: ExploreIcon,
  verified: VerifiedBadgeIcon,
  verified_user: VerifiedBadgeIcon,
  query_stats: FactCheckIcon,
  group: ExploreIcon,
  warning: AlertTriangleIcon,
  trending_down: ArrowForwardIcon,
  money_off: WalletIcon,
  payments: WalletIcon,
  fact_check: FactCheckIcon,
  compare_arrows: CompareIcon,
  auto_awesome: SparklesIcon,
  insights: ExploreIcon,
  trending_up: ArrowForwardIcon,
  sentiment_dissatisfied: AlertTriangleIcon,
  bar_chart: FactCheckIcon,
  check_circle: CheckCircleIcon,
  visibility_off: EyeIcon,
  arrow_forward: ArrowForwardIcon,
  qr_code_2: BarcodeScannerIcon,
  edit_note: EditIcon,
  block: AlertTriangleIcon,
}

export function OvIcon({ name, size = 16 }) {
  const Comp = ICON_MAP[name] || ExploreIcon
  return <Comp size={size} color="currentColor" />
}

export function Skel({ w = '100%', h = 16, r = 6 }) {
  return <div className="retail-skel" style={{ width: w, height: h, borderRadius: r }} />
}

export function Card({ title, aside, children, className = '' }) {
  return (
    <section className={`ov-card ${className}`}>
      <header className="ov-card__head">
        <h2 className="ov-card__title">{title}</h2>
        {aside}
      </header>
      <div className="ov-card__body">{children}</div>
    </section>
  )
}

export function Kpi({ label, value, sub, tone, loading, children }) {
  return (
    <div className={`ov-kpi ${tone ? `ov-kpi--${tone}` : ''}`}>
      <div className="ov-kpi__label">{label}</div>
      {loading ? (
        <Skel h={34} w="60%" r={8} />
      ) : (
        <div className="ov-kpi__value rc-num">{value}</div>
      )}
      {children}
      {sub && <div className="ov-kpi__sub">{sub}</div>}
    </div>
  )
}

export function QueryError({ label, retryLabel, onRetry }) {
  return (
    <div className="ov-error" role="alert">
      <AlertTriangleIcon size={18} color="currentColor" />
      <span>{label}</span>
      <button type="button" onClick={onRetry}>
        {retryLabel}
      </button>
    </div>
  )
}

export function EmptyState({ icon, label, sub }) {
  return (
    <div className="ov-empty">
      <span className="ov-empty__icon">
        <OvIcon name={icon} size={18} />
      </span>
      <div className="ov-empty__label">{label}</div>
      {sub && <div className="ov-empty__sub">{sub}</div>}
    </div>
  )
}

function Thumb({ src, name }) {
  return (
    <div className="ov-thumb catalog-img-box">
      {src ? (
        <img src={src} alt={name ?? ''} className="product-img-blend" loading="lazy" />
      ) : (
        <InventoryIcon size={18} color="var(--rc-ink-3)" />
      )}
    </div>
  )
}

export function ProductRow({ rank, name, scanCount, share, imageUrl, scanLabel, loading }) {
  if (loading) {
    return (
      <div className="ov-row">
        <Skel w={20} h={14} />
        <Skel w={40} h={40} r={10} />
        <div className="ov-row__main">
          <Skel h={13} w="62%" />
          <Skel h={6} w="100%" r={3} />
        </div>
        <Skel h={14} w={44} />
      </div>
    )
  }
  return (
    <div className="ov-row">
      <span className="ov-row__rank rc-num">{rank}</span>
      <Thumb src={imageUrl} name={name} />
      <div className="ov-row__main">
        <div className="ov-row__name">{name}</div>
        <div className="ov-bar">
          <span style={{ width: `${Math.max(share, 4)}%` }} />
        </div>
      </div>
      <div className="ov-row__metric rc-num">
        {scanCount.toLocaleString()} <small>{scanLabel}</small>
      </div>
    </div>
  )
}

export function MissedRow({
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
  if (loading) {
    return (
      <div className="ov-row">
        <Skel w={40} h={40} r={10} />
        <div className="ov-row__main">
          <Skel h={13} w="62%" />
          <Skel h={16} w="34%" r={6} />
        </div>
        <Skel h={14} w={44} />
      </div>
    )
  }
  const isOOS = reason === 'out_of_stock'
  return (
    <div className="ov-row">
      <Thumb src={imageUrl} name={name} />
      <div className="ov-row__main">
        <div className="ov-row__name">{name ?? ean}</div>
        <span className={`ov-chip ${isOOS ? 'ov-chip--warn' : 'ov-chip--neg'}`}>
          {isOOS ? labelOutOfStock : labelNotInCatalog}
        </span>
      </div>
      <div className="ov-row__metric rc-num">
        {scanCount.toLocaleString()} <small>{scanLabel}</small>
      </div>
    </div>
  )
}

export function InsightRow({ insight, title, body, action, loading }) {
  if (loading) {
    return (
      <div className="ov-insight">
        <Skel w={28} h={28} r={9} />
        <div className="ov-row__main">
          <Skel h={13} w="55%" />
          <Skel h={11} w="90%" />
        </div>
      </div>
    )
  }
  return (
    <div className={`ov-insight ov-tone--${insight.tone || 'info'}`}>
      <span className="ov-insight__icon">
        <OvIcon name={insight.icon} size={16} />
      </span>
      <div className="ov-insight__copy">
        <div className="ov-insight__title">{title}</div>
        <div className="ov-insight__body">{body}</div>
        {action && (
          <div className="ov-insight__action">
            <ArrowForwardIcon size={13} color="currentColor" />
            {action}
          </div>
        )}
      </div>
    </div>
  )
}

export function StatList({ items, loading }) {
  return (
    <dl className="ov-stats">
      {items.map(({ label, value }) => (
        <div key={label} className="ov-stats__item">
          <dt>{label}</dt>
          <dd className="rc-num">{loading ? <Skel w={28} h={18} r={5} /> : value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function FactLine({ label, value }) {
  return (
    <div className="ov-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
