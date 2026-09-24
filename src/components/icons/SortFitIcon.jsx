export function SortFitIcon({ size = 16, color = 'currentColor', className, style }) {
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
      <path d="M22 7H9M2 7h3" />
      <path d="M19 12h-3M5 12h7" />
      <path d="M16 17H8" />
    </svg>
  )
}
