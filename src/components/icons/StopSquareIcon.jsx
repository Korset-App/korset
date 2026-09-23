export function StopSquareIcon({ size = 16, color = 'currentColor', className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <rect x="5" y="5" width="14" height="14" rx="3.5" fill={color} />
    </svg>
  )
}
