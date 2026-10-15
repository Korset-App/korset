export default function ShoppingRecommendationToggle({ product, label, recommendationMutation }) {
  if (!Object.hasOwn(product, 'is_shopping_recommended')) return null
  const on = Boolean(product.is_shopping_recommended)
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
    >
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={recommendationMutation?.isPending}
        onClick={(e) => {
          e.stopPropagation()
          recommendationMutation?.mutate({ id: product.id, isRecommended: !on })
        }}
        style={{
          width: 52,
          height: 30,
          border: 0,
          padding: 0,
          borderRadius: 15,
          cursor: recommendationMutation?.isPending ? 'default' : 'pointer',
          background: on ? '#10B981' : 'var(--glass-border)',
          position: 'relative',
          transition: 'background 0.25s',
          opacity: recommendationMutation?.isPending ? 0.7 : 1,
          flexShrink: 0,
        }}
      >
        <span
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
  )
}
