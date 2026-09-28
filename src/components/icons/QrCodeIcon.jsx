export function QrCodeIcon({ size = 22, color = 'currentColor', className, style }) {
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
      {/* Corner positioning squares */}
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" />
      <rect x="5.5" y="5.5" width="2" height="2" rx="0.4" fill={color} />

      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" />
      <rect x="16.5" y="5.5" width="2" height="2" rx="0.4" fill={color} />

      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" />
      <rect x="5.5" y="16.5" width="2" height="2" rx="0.4" fill={color} />

      {/* QR matrix timing & data dots */}
      <rect x="14" y="14" width="2.2" height="2.2" rx="0.5" fill={color} />
      <rect x="18.8" y="14" width="2.2" height="2.2" rx="0.5" fill={color} />
      <rect x="14" y="18.8" width="2.2" height="2.2" rx="0.5" fill={color} />
      <rect x="18.8" y="18.8" width="2.2" height="2.2" rx="0.5" fill={color} />
      <rect x="16.4" y="16.4" width="2.2" height="2.2" rx="0.5" fill={color} />

      <rect x="10.9" y="4" width="2.2" height="2.2" rx="0.5" fill={color} />
      <rect x="10.9" y="8" width="2.2" height="2.2" rx="0.5" fill={color} />
      <rect x="4" y="10.9" width="2.2" height="2.2" rx="0.5" fill={color} />
      <rect x="8" y="10.9" width="2.2" height="2.2" rx="0.5" fill={color} />
      <rect x="10.9" y="14" width="2.2" height="2.2" rx="0.5" fill={color} />
      <rect x="10.9" y="18" width="2.2" height="2.2" rx="0.5" fill={color} />
    </svg>
  )
}
