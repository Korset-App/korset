export function SyncIcon({ size = 20, color = 'currentColor', className, style }) {
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
        d="M12.079 2.25c-4.793 0-8.751 3.56-9.362 8.214a.75.75 0 0 1-1.488-.196c.743-5.656 5.562-9.982 11.392-9.982 6.344 0 11.488 5.144 11.488 11.488S19.08 23.262 12.736 23.262c-3.79 0-7.14-1.84-9.213-4.664a.75.75 0 1 1 1.2-0.9 9.99 9.99 0 0 0 7.971 4.028c5.516 0 9.988-4.472 9.988-9.988 0-5.516-4.472-9.988-9.988-9.988z"
        fill={color}
      />
      <path
        d="M3.25 7a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-.75.75h-3.5a.75.75 0 1 1 0-1.5h2.75v-2.75A.75.75 0 0 1 3.25 7z"
        fill={color}
      />
    </svg>
  )
}
