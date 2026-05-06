const AlertIcon = {
  error: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  success: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
}

export default function AuthAlert({ type, children }) {
  const isError = type === 'error'
  return (
    <div
      role={isError ? 'alert' : 'status'}
      style={{
        background: isError ? 'var(--error-dim)' : 'var(--success-dim)',
        border: `1px solid ${isError ? 'var(--error-border)' : 'var(--success-border)'}`,
        color: isError ? 'var(--error-bright)' : 'var(--success-bright)',
        padding: '12px 16px',
        borderRadius: 12,
        fontSize: 13,
        fontFamily: 'var(--font-display)',
        marginBottom: 18,
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      {AlertIcon[type]}
      {children}
    </div>
  )
}
