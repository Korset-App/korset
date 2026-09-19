export function CheckCircleIcon({
  size = 20,
  color = 'currentColor',
  strokeWidth = 1.7,
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
      <circle cx="12" cy="12" r="9.5" />
      <path d="M8 12.5l2.8 2.8 5.4-5.6" />
    </svg>
  )
}
