export function SyncIcon({
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
      <path d="M21.5 2v6h-6M2.5 22v-6h6" />
      <path d="M18.86 9A9 9 0 0 0 5.14 9M5.14 15a9 9 0 0 0 13.72 0" />
    </svg>
  )
}
