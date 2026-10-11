function Glyph({ size = 24, children, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function OverviewGlyph(props) {
  return (
    <Glyph {...props}>
      <rect x="3.25" y="3.25" width="6.5" height="6.5" rx="1.8" />
      <path d="M14.25 3.25h6.5v6.5h-6.5z" fill="currentColor" fillOpacity=".12" />
      <path d="M14.25 3.25h6.5v6.5h-6.5zM3.25 14.25h6.5v6.5h-6.5z" />
      <rect x="14.25" y="14.25" width="6.5" height="6.5" rx="1.8" />
    </Glyph>
  )
}
export function CatalogGlyph(props) {
  return (
    <Glyph {...props}>
      <path d="m12 3 8.5 4.6v8.8L12 21l-8.5-4.6V7.6L12 3Z" />
      <path d="m3.5 7.6 8.5 4.6 8.5-4.6M12 12.2V21M7.75 5.3l8.5 4.6v4.2" />
    </Glyph>
  )
}
export function StoreGlyph(props) {
  return (
    <Glyph {...props}>
      <path d="M4 10v10h16V10M8.5 20v-6h7v6M3 10l1.5-6h15L21 10" />
      <path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 10l.6-6M15 10l-.6-6" />
    </Glyph>
  )
}
export function ConnectionGlyph(props) {
  return (
    <Glyph {...props}>
      <path d="M8 7V3m8 4V3M6 7h12v4a6 6 0 0 1-6 6v4M6 11h12" />
      <path d="M4 20h3m10 0h3" strokeOpacity=".5" />
    </Glyph>
  )
}
export function SettingsGlyph(props) {
  return (
    <Glyph {...props}>
      <path d="M5 3v8m0 4v6M12 3v2m0 4v12M19 3v12m0 4v2" />
      <rect x="2.5" y="11" width="5" height="4" rx="1.5" />
      <rect x="9.5" y="5" width="5" height="4" rx="1.5" />
      <rect x="16.5" y="15" width="5" height="4" rx="1.5" />
    </Glyph>
  )
}
export function AccountGlyph(props) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M4 21v-2.5a8 8 0 0 1 16 0V21" />
    </Glyph>
  )
}
export function PeopleGlyph(props) {
  return (
    <Glyph {...props}>
      <circle cx="9" cy="7" r="3" />
      <path d="M2 21v-2a7 7 0 0 1 14 0v2M16 4a3 3 0 0 1 0 6m3 11v-2a7 7 0 0 0-2.5-5.4" />
    </Glyph>
  )
}
export function PanelGlyph(props) {
  return (
    <Glyph {...props}>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M9 4v16m6-11-3 3 3 3" />
    </Glyph>
  )
}
export function TelegramGlyph({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="m20.8 4.3-3.1 15.1c-.23 1.07-.86 1.33-1.73.82l-4.72-3.48-2.28 2.2c-.25.26-.48.48-.97.48l.34-4.78L17 6.52c.38-.34-.08-.53-.59-.19L5.71 13.1l-4.61-1.44c-1-.31-1.02-1 .2-1.47L19.33 3.3c.83-.3 1.55.2 1.47 1Z"
      />
    </svg>
  )
}
export function LogoutGlyph(props) {
  return (
    <Glyph {...props}>
      <path d="M9 4H4v16h5m6-4 4-4-4-4m4 4H9" />
    </Glyph>
  )
}
export function LockGlyph(props) {
  return (
    <Glyph {...props}>
      <rect x="5" y="10" width="14" height="11" rx="3" />
      <path d="M8 10V6a4 4 0 0 1 8 0v4M12 15v2" />
    </Glyph>
  )
}

export const RETAIL_NAV_ICONS = {
  dashboard: OverviewGlyph,
  products: CatalogGlyph,
  storefront: StoreGlyph,
  integration: ConnectionGlyph,
  settings: SettingsGlyph,
}
