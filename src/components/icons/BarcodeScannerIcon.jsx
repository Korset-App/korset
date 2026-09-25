export function BarcodeScannerIcon({ size = 22, color = 'currentColor', className, style }) {
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
      <g stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M2 7V5a1 1 0 0 1 1-1h2" />
        <path d="M22 7V5a1 1 0 0 0-1-1h-2" />
        <path d="M2 17v2a1 1 0 0 0 1 1h2" />
        <path d="M22 17v2a1 1 0 0 1-1 1h-2" />
      </g>
      <path
        d="M4 6h2v12H4zM7 6h1v12H7zM10 6h2v12h-2zM13 6h3v12h-3zM17 6h1v12h-1zM19 6h1v12h-1z"
        fill={color}
      />
    </svg>
  )
}
