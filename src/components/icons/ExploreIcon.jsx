export function ExploreIcon({ size = 22, color = 'currentColor', className, style }) {
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
      <circle cx="11.5" cy="11.5" r="8.5" stroke={color} strokeWidth="1.1" />
      <path d="M17.5 17.5L22 22" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <ellipse
        cx="11.5"
        cy="11.5"
        rx="8.5"
        ry="3.2"
        transform="rotate(-30 11.5 11.5)"
        stroke={color}
        strokeWidth="0.9"
        strokeDasharray="2 2"
      />
    </svg>
  )
}
