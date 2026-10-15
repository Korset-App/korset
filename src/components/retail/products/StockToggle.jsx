import { isInStock, nextStockStatus } from './productHelpers.js'

export default function StockToggle({ product, label, stockMutation, managed }) {
  const on = isInStock(product)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
      <div
        role="switch"
        aria-checked={on}
        aria-disabled={managed}
        onClick={(e) => {
          e.stopPropagation()
          if (managed) return
          stockMutation.mutate({ id: product.id, status: nextStockStatus(product) })
        }}
        style={{
          width: 52,
          height: 30,
          borderRadius: 15,
          cursor: managed ? 'not-allowed' : 'pointer',
          background: on ? '#10B981' : 'var(--glass-border)',
          position: 'relative',
          transition: 'background 0.25s',
          opacity: managed || stockMutation.isPending ? 0.7 : 1,
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
      </div>
    </div>
  )
}
