export function SortPriceyIcon({ size = 16, color = 'currentColor', className, style }) {
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
      <path d="M13 12h8M13 8h8M13 16h8M6 7v10M6 7l-3 3M6 7l3 3" />
    </svg>
  )
}
