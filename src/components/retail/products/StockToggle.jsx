import { useI18n } from '../../../i18n/index.js'
import { nextStockStatus } from './productHelpers.js'

export default function StockToggle({ product, label, stockMutation, managed }) {
  const { t } = useI18n()
  const on = ['in_stock', 'low_stock'].includes(product.stock_status)
  const unknown = !['in_stock', 'low_stock', 'out_of_stock'].includes(product.stock_status)
  const stockLabel = unknown ? `${label} ${t('integration.consumer.stock.unknown')}` : label
  const disabled = managed || stockMutation.isPending
  const failed = stockMutation.isError && stockMutation.variables?.id === product.id
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{stockLabel}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={stockLabel}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          if (disabled) return
          stockMutation.mutate({ id: product.id, status: nextStockStatus(product) })
        }}
        style={{
          width: 52,
          height: 30,
          flexShrink: 0,
          border: 'none',
          padding: 0,
          borderRadius: 15,
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: on ? '#10B981' : 'var(--glass-border)',
          position: 'relative',
          transition: 'background 0.25s',
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 3,
            left: on ? 25 : 3,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'var(--text-inverse)',
            transition: 'left 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
          }}
        />
      </button>
      </div>
      {failed && (
        <p role="alert" style={{ margin: '8px 0 0', color: 'var(--text-sub)', fontSize: 13 }}>
          {t('retail.products.stockUpdateError')}
        </p>
      )}
    </div>
  )
}
