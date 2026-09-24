export function SortSugarIcon({ size = 16, color = 'currentColor', className, style }) {
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
      <path d="M12 4l7 3.5v7l-7 3.5-7-3.5v-7l7-3.5z" />
      <path d="M12 10.5l7-3.5M12 10.5l-7-3.5M12 10.5v7" />
      <line x1="2" y1="22" x2="22" y2="2" stroke={color} />
    </svg>
  )
}
