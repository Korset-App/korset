export function ChevronDownIcon({
  size = 20,
  color = 'currentColor',
  strokeWidth = 1.8,
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
