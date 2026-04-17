export default function ExpandToggle({ checked, onChange, label }) {
  return (
    <button
      onClick={onChange}
      type="button"
      aria-pressed={checked}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        color: '#E9D5FF',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 700, color: '#EDE9FE' }}>{label}</span>
      <span
        style={{
          position: 'relative',
          width: 40,
          height: 40,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: checked ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform .45s ease',
        }}
      >
        {[1, 2, 3].map((n) => {
          const common = {
            position: 'absolute',
            width: n === 2 ? 24 : 18,
            height: 4,
            borderRadius: 999,
            background: 'rgb(176, 92, 255)',
            boxShadow: '0 0 12px rgba(176, 92, 255, 0.3)',
            transition: 'all .45s ease',
          }
          const style = !checked
            ? n === 1
              ? { transform: 'translateY(-8px)' }
              : n === 2
                ? {}
                : { transform: 'translateY(8px)' }
            : n === 2
              ? { transform: 'scaleX(0)', opacity: 0 }
              : n === 1
                ? { width: 24, transform: 'rotate(45deg)' }
                : { width: 24, transform: 'rotate(-45deg)' }
          return <span key={n} style={{ ...common, ...style }} />
        })}
      </span>
    </button>
  )
}
