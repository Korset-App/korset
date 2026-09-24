export function SortProteinIcon({ size = 16, color = 'currentColor', className, style }) {
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
      <path d="M6.5 6.5v11" />
      <path d="M17.5 6.5v11" />
      <path d="M3 9.25v5.5" />
      <path d="M21 9.25v5.5" />
      <path d="M6.5 12h11" />
    </svg>
  )
}
