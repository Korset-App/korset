import { FitCheckIcon } from './FitCheckIcon.jsx'

export function SlidersIcon({
  size = 20,
  color = 'currentColor',
  className,
  style,
  active = false,
}) {
  return (
    <FitCheckIcon size={size} color={color} active={active} className={className} style={style} />
  )
}
