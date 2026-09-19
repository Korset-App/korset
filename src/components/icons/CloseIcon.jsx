export function CloseIcon({
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
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}
