export function InstallIcon({ size = 18, color = 'currentColor', className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <rect x="6.5" y="2" width="11" height="20" rx="2.6" />
      <path d="M12 8.5v6" />
      <path d="M9.4 12.1 12 14.7l2.6-2.6" />
    </svg>
  )
}
