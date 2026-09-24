export function BakeryTandyrIcon({ size = 16, color = 'currentColor', className, style }) {
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
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
        fill={color}
      />
      <circle cx="12" cy="12" r="3.5" stroke={color} strokeWidth="1.6" strokeDasharray="2 2" />
      <circle cx="12" cy="12" r="1.1" fill={color} />
      <circle cx="12" cy="7" r="0.8" fill={color} />
      <circle cx="12" cy="17" r="0.8" fill={color} />
      <circle cx="7" cy="12" r="0.8" fill={color} />
      <circle cx="17" cy="12" r="0.8" fill={color} />
    </svg>
  )
}

export function AccessibleRampIcon({ size = 16, color = 'currentColor', className, style }) {
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
      <circle cx="12" cy="4.2" r="2.2" fill={color} />
      <path
        d="M14.8 9.2h-4.3c-.8 0-1.5.7-1.5 1.5v4.3c0 .6.4 1 1 1s1-.4 1-1v-2.8h1.8v6.2c0 .8.7 1.4 1.5 1.4s1.5-.6 1.5-1.4v-7.7c0-.8-.7-1.5-1.5-1.5z"
        fill={color}
      />
      <path
        d="M7.8 15.2a4.8 4.8 0 1 0 4.8 4.8"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function CookeryIcon({ size = 16, color = 'currentColor', className, style }) {
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
        d="M19 18.5H5a1 1 0 0 1-1-1v-1a8 8 0 0 1 16 0v1a1 1 0 0 1-1 1z"
        stroke={color}
        strokeWidth="1.8"
      />
      <circle cx="12" cy="4" r="1.5" fill={color} />
      <path d="M2.5 20.5h19" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function CoffeeToGoIcon({ size = 16, color = 'currentColor', className, style }) {
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
        d="M6 7.5l1.6 13.2a1.8 1.8 0 0 0 1.8 1.6h5.2a1.8 1.8 0 0 0 1.8-1.6L18 7.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4.5 4.5h15a1 1 0 0 1 1 1v2H3.5v-2a1 1 0 0 1 1-1z"
        fill={color}
        fillOpacity="0.2"
        stroke={color}
        strokeWidth="1.6"
      />
      <path d="M8.5 13h7" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function SelfCheckoutIcon({ size = 16, color = 'currentColor', className, style }) {
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
      <rect x="4" y="3" width="16" height="18" rx="2.5" stroke={color} strokeWidth="1.8" />
      <rect
        x="7"
        y="6"
        width="10"
        height="6.5"
        rx="1"
        fill={color}
        fillOpacity="0.18"
        stroke={color}
        strokeWidth="1.2"
      />
      <path d="M8 16.5h8M10 18.5h4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function AtmTerminalIcon({ size = 16, color = 'currentColor', className, style }) {
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
      <rect x="3" y="3.5" width="18" height="17" rx="2.5" stroke={color} strokeWidth="1.8" />
      <rect x="6" y="6.5" width="12" height="5.5" rx="1" stroke={color} strokeWidth="1.3" />
      <line x1="6" y1="16" x2="11" y2="16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="15.5" cy="16" r="1.5" fill={color} />
    </svg>
  )
}

export function PharmacyPointIcon({ size = 16, color = 'currentColor', className, style }) {
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
      <rect x="3" y="3" width="18" height="18" rx="5" stroke={color} strokeWidth="1.8" />
      <path d="M12 7v10M7 12h10" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function MeatCuttingIcon({ size = 16, color = 'currentColor', className, style }) {
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
        d="M4 14.5c0-4.5 3.5-8.5 8-8.5 4.8 0 8.5 3.7 8.5 8.5 0 2.2-1.8 4-4 4H7.5c-2 0-3.5-1.8-3.5-4z"
        stroke={color}
        strokeWidth="1.8"
      />
      <circle cx="10" cy="14" r="2.2" stroke={color} strokeWidth="1.5" />
      <path d="M14 6l3-3.5M16.5 2.5l2 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function FreshBarIcon({ size = 16, color = 'currentColor', className, style }) {
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
        d="M6 7h12l-1.8 13.2a2 2 0 0 1-2 1.8H9.8a2 2 0 0 1-2-1.8L6 7z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line x1="4" y1="7" x2="20" y2="7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 7l2-5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle
        cx="12"
        cy="13"
        r="2"
        fill={color}
        fillOpacity="0.25"
        stroke={color}
        strokeWidth="1.2"
      />
    </svg>
  )
}

export function ScalesIcon({ size = 16, color = 'currentColor', className, style }) {
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
      <path d="M12 3v17M8 20h8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 8h14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M2.5 13h5l-2.5-5zM16.5 13h5l-2.5-5z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MicrowaveIcon({ size = 16, color = 'currentColor', className, style }) {
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
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke={color} strokeWidth="1.8" />
      <rect x="5.5" y="8" width="9.5" height="8" rx="1.5" stroke={color} strokeWidth="1.5" />
      <circle cx="18.5" cy="9.5" r="1.2" fill={color} />
      <circle cx="18.5" cy="14.5" r="1.2" fill={color} />
    </svg>
  )
}

export function KidsCartIcon({ size = 16, color = 'currentColor', className, style }) {
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
        d="M3 5h3l2.5 9h10l2-6H6.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="18.5" r="1.8" fill={color} />
      <circle cx="17" cy="18.5" r="1.8" fill={color} />
      <path d="M13 8h4v3h-4z" stroke={color} strokeWidth="1.3" />
    </svg>
  )
}

export function LockerIcon({ size = 16, color = 'currentColor', className, style }) {
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
      <rect x="4" y="3" width="16" height="18" rx="2.5" stroke={color} strokeWidth="1.8" />
      <line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth="1.5" />
      <circle cx="16" cy="7.5" r="1" fill={color} />
      <circle cx="16" cy="16.5" r="1" fill={color} />
    </svg>
  )
}

export function WifiIcon({ size = 16, color = 'currentColor', className, style }) {
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
      <path d="M5 9c4-3.5 10-3.5 14 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 12.5c2-2 5-2 7 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1.4" fill={color} />
    </svg>
  )
}

export function OrderPickupIcon({ size = 16, color = 'currentColor', className, style }) {
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
        d="M4 8l8-4 8 4v9l-8 4-8-4V8z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 4v17M4 8l8 4.5 8-4.5" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
