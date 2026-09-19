export function StorefrontIcon({ size = 22, color = 'currentColor', className, style }) {
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
        d="M3 9.5L4.44 4.47A2 2 0 0 1 6.37 3h11.26a2 2 0 0 1 1.93 1.47L21 9.5"
        stroke={color}
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 9.5v10.5a1.5 1.5 0 0 0 1.5 1.5h15a1.5 1.5 0 0 0 1.5-1.5V9.5"
        stroke={color}
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 9.5c0 1.38 1.12 2.5 2.5 2.5S8 10.88 8 9.5c0 1.38 1.12 2.5 2.5 2.5S13 10.88 13 9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5"
        stroke={color}
        strokeWidth="1.0"
        strokeLinecap="round"
      />
      <path
        d="M9.5 21.5v-6a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5v6"
        stroke={color}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  )
}
