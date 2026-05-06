export default function AuthBackground() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -60,
          left: -60,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'var(--primary-dim)',
          filter: 'blur(70px)',
          animation: 'authFloatA1 8s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '40%',
          right: -40,
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'rgba(236,72,153,0.08)',
          filter: 'blur(60px)',
          animation: 'authFloatA2 10s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 40,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(52,211,153,0.06)',
          filter: 'blur(50px)',
          animation: 'authFloatA1 12s ease-in-out infinite',
        }}
      />
    </div>
  )
}
