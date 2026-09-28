export function HalalBadgeIcon({ size = 18, color = 'currentColor', className = '', style }) {
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
      {/* 8-pointed star (Rub el Hizb) outline */}
      <path
        d="M9.5 2.5h5l2.8 2.8 4 1.2.7 4.1 2.8 2.8-2.8 2.8-.7 4.1-4 1.2-2.8 2.8h-5l-2.8-2.8-4-1.2-.7-4.1-2.8-2.8 2.8-2.8.7-4.1 4-1.2L9.5 2.5z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Crescent inside */}
      <path d="M13.8 8.2a4.2 4.2 0 1 0 0 7.6 3.6 3.6 0 0 1 0-7.6z" fill={color} />
      {/* Small star dot */}
      <circle cx="15.2" cy="12" r="1" fill={color} />
    </svg>
  )
}
