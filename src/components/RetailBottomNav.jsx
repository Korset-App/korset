import { useNavigate, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { StorefrontIcon, InventoryIcon, BarcodeScannerIcon, SlidersIcon } from './icons/index.js'

export default function RetailBottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { currentStore } = useStore()
  const { t } = useI18n()

  const getActive = () => {
    if (pathname.includes('/products')) return 'products'
    if (pathname.includes('/ean-recovery')) return 'eanRecovery'
    if (pathname.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  const active = getActive()
  const storeSlug = currentStore?.slug

  if (!storeSlug) return null

  const TABS = [
    {
      id: 'dashboard',
      label: t('retail.nav.dashboard'),
      path: `/retail/${storeSlug}/dashboard`,
      Icon: StorefrontIcon,
    },
    {
      id: 'products',
      label: t('retail.nav.products'),
      path: `/retail/${storeSlug}/products`,
      Icon: InventoryIcon,
    },
    {
      id: 'eanRecovery',
      label: t('retail.nav.eanRecovery'),
      path: `/retail/${storeSlug}/ean-recovery`,
      Icon: BarcodeScannerIcon,
      accent: true,
    },
    {
      id: 'settings',
      label: t('retail.nav.settings'),
      path: `/retail/${storeSlug}/settings`,
      Icon: SlidersIcon,
    },
  ]

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        boxSizing: 'border-box',
        zIndex: 100,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        alignItems: 'end',
        columnGap: 4,
        padding: '8px 8px calc(12px + env(safe-area-inset-bottom, 0px))',
        background: 'var(--retail-nav-bg, var(--bg-card))',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid var(--retail-border, var(--border))',
        boxShadow: '0 -18px 48px rgba(15,23,42,0.12)',
      }}
    >
      {TABS.map((tab) => {
        const on = active === tab.id
        const tabCol = on
          ? tab.accent
            ? '#FB923C'
            : 'var(--retail-accent, #38BDF8)'
          : 'var(--nav-muted)'
        const IconComponent = tab.Icon

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigate(tab.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 4,
              width: '100%',
              minWidth: 0,
              height: 52,
              padding: '6px 4px',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              outline: 'none',
            }}
          >
            <div
              style={{
                transition: 'transform 0.2s',
                transform: on ? 'translateY(-2px)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconComponent size={22} color={tabCol} />
            </div>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: on ? 700 : 500,
                color: tabCol,
                fontFamily: 'var(--font-body)',
                transition: 'color 0.2s',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                textAlign: 'center',
              }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
