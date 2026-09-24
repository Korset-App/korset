export function FilterIcon({ size = 16, color = 'currentColor', className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <path d="M14.32 19.07c0 .61-.4 1.41-.91 1.72l-1.41.91c-1.31.81-3.13-.1-3.13-1.72v-5.35c0-.71-.4-1.62-.81-2.12L4.22 8.47A2.09 2.09 0 0 1 3.31 6.45V4.13c0-1.21.91-2.12 2.02-2.12h13.34c1.11 0 2.02.91 2.02 2.02V6.25c0 .81-.51 1.82-1.01 2.32" />
      <circle cx="16.07" cy="13.32" r="3.2" />
      <path d="M19.87 17.12l-1-1" />
    </svg>
  )
}

export function FilterIconActive({ size = 16, color = 'currentColor', className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <path d="M20.72 18.24l-.94-.94c.49-.74.78-1.63.78-2.59A4.71 4.71 0 0 0 15.85 10a4.71 4.71 0 0 0-4.71 4.71c0 2.6 2.11 4.71 4.71 4.71.96 0 1.84-.29 2.59-.78l.94.94c.19.19.43.28.68.28s.49-.09.68-.28a.95.95 0 0 0 0-1.34z" />
      <path d="M19.58 4.02v2.22c0 .81-.5 1.82-1 2.33l-.18.16c-.14.13-.35.16-.53.1l-.6-.17c-.44-.11-.91-.16-1.39-.16-3.45 0-6.25 2.8-6.25 6.25 0 1.14.31 2.26.9 3.22.5.84 1.2 1.54 1.96 2.01.23.15.32.47.12.65l-.21.16-1.4.91c-1.3.81-3.09-.1-3.09-1.72v-5.35c0-.71-.4-1.62-.8-2.12l-3.79-4.04c-.5-.51-.9-1.42-.9-2.02V4.12c0-1.21.9-2.12 1.99-2.12h13.18c1.09 0 1.99.91 1.99 2.02z" />
    </svg>
  )
}
