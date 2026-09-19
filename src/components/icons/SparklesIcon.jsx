export function SparklesIcon({ size = 22, color = 'currentColor', className, style }) {
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
        d="M12 2c0 5.52-4.48 10-10 10 5.52 0 10 4.48 10 10 0-5.52 4.48-10 10-10-5.52 0-10-4.48-10-10z"
        stroke={color}
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 2c0 2.21-1.79 4-4 4 2.21 0 4 1.79 4 4 0-2.21 1.79-4 4-4-2.21 0-4-1.79-4-4z"
        stroke={color}
        strokeWidth="1.0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="4.5" cy="4.5" r="0.8" fill={color} />
    </svg>
  )
}
