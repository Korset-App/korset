export function TelegramIcon({ size = 20, color = 'currentColor', className, style }) {
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
        d="M21.94 3.27a1.5 1.5 0 0 0-1.52-.22L2.67 10.16a1.5 1.5 0 0 0 .1 2.82l3.85 1.28 1.67 5.16a1 1 0 0 0 1.73.37l2.3-2.6 4.43 3.26a1.5 1.5 0 0 0 2.33-1l2.79-15a1.5 1.5 0 0 0-.93-1.28zM10 15.83l-.79 2.43-.97-3.04 7.92-7.09L10 15.83zm8.38 2.21-4.73-3.48 5.04-9.01-2.34 13.03z"
        fill={color}
      />
    </svg>
  )
}
