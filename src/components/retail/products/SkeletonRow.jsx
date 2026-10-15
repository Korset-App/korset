export default function SkeletonRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 18px',
        background: 'var(--rc-surface)',
        border: '1px solid var(--rc-line)',
        borderRadius: 12,
        marginBottom: 8,
        animation: 'rc-skeleton-pulse 1.6s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes rc-skeleton-pulse {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 0.45; }
        }
      `}</style>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          background: 'var(--rc-surface-2)',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ height: 13, width: '70%', borderRadius: 4, background: 'var(--rc-surface-2)' }} />
        <div style={{ height: 10, width: '35%', borderRadius: 4, background: 'var(--rc-surface-2)' }} />
      </div>
      <div style={{ width: 110, height: 22, borderRadius: 6, background: 'var(--rc-surface-2)' }} />
      <div style={{ width: 75, height: 22, borderRadius: 6, background: 'var(--rc-surface-2)' }} />
      <div style={{ width: 85, height: 16, borderRadius: 4, background: 'var(--rc-surface-2)' }} />
      <div style={{ width: 85, height: 22, borderRadius: 6, background: 'var(--rc-surface-2)' }} />
      <div style={{ width: 70, height: 28, borderRadius: 8, background: 'var(--rc-surface-2)', marginLeft: 'auto' }} />
    </div>
  )
}
