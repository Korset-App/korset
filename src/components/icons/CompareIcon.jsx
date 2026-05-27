export function CompareIcon({ active = false, size = 22, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
      style={{
        display: 'block',
        flexShrink: 0,
        transform: active ? 'scaleX(-1)' : 'none',
        transition: 'transform 0.22s ease',
      }}
    >
      <path d="M2 4h9v1H3v15h8v1H2zm10 19h1V2h-1zM8.28 10.28l-.56-.56L4.93 12.5l2.79 2.78.56-.56L6.57 13H11v-1H6.57zM14 12h4.08l-1.54-1.54.92-.92 2.96 2.96-2.96 2.96-.92-.92L18.08 13H14v8h9V4h-9z" />
    </svg>
  )
}
