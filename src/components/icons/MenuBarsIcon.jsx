export function MenuBarsIcon({
  size = 20,
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
      <path d="M4 6H20M4 12H20M4 18H20" />
    </svg>
  )
}
