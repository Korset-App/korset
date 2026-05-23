export default function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onChange(!checked)
      }}
      style={{
        position: 'relative',
        width: 44,
        height: 24,
        borderRadius: 999,
        border: 'none',
        background: checked ? 'var(--primary)' : 'var(--glass-muted)',
        boxShadow: checked
          ? '0 0 10px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.15)'
          : 'inset 0 1px 3px rgba(0,0,0,0.12)',
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition:
          'background 0.28s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'var(--text-inverse)',
          boxShadow: checked ? '0 2px 6px rgba(0,0,0,0.18)' : '0 1px 3px rgba(0,0,0,0.12)',
          transition: 'left 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.28s ease',
        }}
      />
    </button>
  )
}
