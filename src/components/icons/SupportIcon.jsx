export function SupportIcon({
  size = 18,
  color = 'currentColor',
  strokeWidth = 2,
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
      <path d="M3 11a9 9 0 0 1 18 0v4a3 3 0 0 1-3 3h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3V11a7 7 0 0 0-14 0v2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3v-4z" />
      <path d="M19 19v2a2 2 0 0 1-2 2h-3" />
    </svg>
  )
}
