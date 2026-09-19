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
      <path
        d="M2 9V6.5C2 4.01 4.01 2 6.5 2H9"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 2h2.5C19.99 2 22 4.01 22 6.5V9"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 15v2.5c0 2.49-2.01 4.5-4.5 4.5H15"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 22H6.5C4.01 22 2 19.99 2 17.5V15"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 8.5v7M10 8.5v7M14 8.5v7M17 8.5v7"
        stroke={color}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path d="M4 12h16" stroke="var(--primary, #10b981)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
