export function InventoryIcon({
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
      <path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8m18-3H3a1 1 0 0 0-1 1v2h20V6a1 1 0 0 0-1-1z" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  )
}
