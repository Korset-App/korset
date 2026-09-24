// Headphone support icon — matches the icon used in ProfileScreen support section
export function HeadphoneIcon({ size = 18, color = 'var(--primary)', className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <path
        d="M18 9h-2c-1.105 0-2 .895-2 2v2c0 1.105.895 2 2 2h0c1.105 0 2-.895 2-2V9c0-4.97-4.03-9-9-9s-9 4.03-9 9v4c0 1.105.895 2 2 2h0c1.105 0 2-.895 2-2v-2c0-1.105-.895-2-2-2H0"
        transform="translate(3 3)"
      />
      <path d="M21 14v4c0 2-.667 3-2 3s-3 0-5 0" />
    </svg>
  )
}
