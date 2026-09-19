export function VerifiedBadgeIcon({ size = 22, color = 'currentColor', className, style }) {
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
        d="M10.29 2.37a2.5 2.5 0 0 1 3.42 0l.7.63c.47.42 1.1.62 1.72.54l.94-.12a2.5 2.5 0 0 1 2.8 2.03l.2.93c.13.61.5 1.13 1.03 1.45l.8.49a2.5 2.5 0 0 1 1.07 3.28l-.43.84a2.49 2.49 0 0 0 0 2.1l.43.84a2.5 2.5 0 0 1-1.07 3.28l-.8.49c-.53.32-.9.84-1.03 1.45l-.2.93a2.5 2.5 0 0 1-2.8 2.03l-.94-.12a2.5 2.5 0 0 0-1.72.54l-.7.63a2.5 2.5 0 0 1-3.42 0l-.7-.63a2.5 2.5 0 0 0-1.72-.54l-.94.12a2.5 2.5 0 0 1-2.8-2.03l-.2-.93a2.5 2.5 0 0 0-1.03-1.45l-.8-.49a2.5 2.5 0 0 1-1.07-3.28l.43-.84a2.49 2.49 0 0 0 0-2.1l-.43-.84a2.5 2.5 0 0 1 1.07-3.28l.8-.49c.53-.32.9-.84 1.03-1.45l.2-.93a2.5 2.5 0 0 1 2.8-2.03l.94.12c.62.08 1.25-.12 1.72-.54l.7-.63z"
        stroke={color}
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12.5l2.5 2.5 4.5-5"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
