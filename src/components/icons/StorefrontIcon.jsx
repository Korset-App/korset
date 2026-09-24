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
        d="M20,14.81V20a2,2,0,0,1-2,2H6a2,2,0,0,1-2-2V14.81A4.25,4.25,0,0,0,5.25,15a4.3,4.3,0,0,0,2.25-.64,4.28,4.28,0,0,0,4.5,0,4.28,4.28,0,0,0,4.5,0,4.3,4.3,0,0,0,2.25.64A4.25,4.25,0,0,0,20,14.81ZM21.76,9,20.17,3.45A2,2,0,0,0,18.25,2H5.75A2,2,0,0,0,3.83,3.45L2.24,9A6.48,6.48,0,0,0,2,10.75a3.25,3.25,0,0,0,5.5,2.34,3.24,3.24,0,0,0,4.5,0,3.24,3.24,0,0,0,4.5,0A3.25,3.25,0,0,0,22,10.75,6.48,6.48,0,0,0,21.76,9Z"
        fill={color}
      />
    </svg>
  )
}
