export default function StockBadge({ status, p, tr }) {
  const dict = p || tr || {}
  const cfg = {
    in_stock: {
      bg: 'color-mix(in srgb, var(--rc-pos) 14%, transparent)',
      border: 'color-mix(in srgb, var(--rc-pos) 30%, transparent)',
      color: 'var(--rc-pos)',
      label: dict.inStock || 'В наличии',
    },
    low_stock: {
      bg: 'color-mix(in srgb, var(--rc-warn) 14%, transparent)',
      border: 'color-mix(in srgb, var(--rc-warn) 30%, transparent)',
      color: 'var(--rc-warn)',
      label: dict.lowStock || 'Мало',
    },
    out_of_stock: {
      bg: 'color-mix(in srgb, var(--rc-neg) 14%, transparent)',
      border: 'color-mix(in srgb, var(--rc-neg) 30%, transparent)',
      color: 'var(--rc-neg)',
      label: dict.outOfStock || 'Нет',
    },
    unknown: {
      bg: 'var(--rc-surface-2)',
      border: 'var(--rc-line)',
      color: 'var(--rc-ink-3)',
      label: dict.stockUnknown || 'Неизвестно',
    },
  }
  const c = cfg[status] ?? cfg.unknown
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: 6,
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        whiteSpace: 'nowrap',
      }}
    >
      {c.label}
    </div>
  )
}
