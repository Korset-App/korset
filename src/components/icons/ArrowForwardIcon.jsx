export function ArrowForwardIcon({
  size = 20,
  color = 'currentColor',
  strokeWidth = 1.6,
  className,
  style,
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <path d="M4 12h16m0 0l-6-6m6 6l-6 6" />
    </svg>
  )
}
