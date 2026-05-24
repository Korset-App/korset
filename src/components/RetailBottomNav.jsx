import { useNavigate, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'

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
      icon: 'dashboard',
    },
    {
      id: 'products',
      label: t('retail.nav.products'),
      path: `/retail/${storeSlug}/products`,
      icon: 'shopping_bag',
    },
    {
      id: 'eanRecovery',
      label: t('retail.nav.eanRecovery'),
      path: `/retail/${storeSlug}/ean-recovery`,
      icon: 'qr_code_scanner',
      accent: true,
    },
    {
      id: 'settings',
      label: t('retail.nav.settings'),
      path: `/retail/${storeSlug}/settings`,
      icon: 'settings',
    },
  ]

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        alignItems: 'end',
        columnGap: 4,
        padding: `8px 8px calc(12px + env(safe-area-inset-bottom, 0px))`,
        background: 'var(--retail-nav-bg)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid var(--retail-border)',
        boxShadow: '0 -18px 48px rgba(15,23,42,0.12)',
      }}
    >
      {TABS.map((tab) => {
        const on = active === tab.id
        const tabCol = on ? (tab.accent ? '#FB923C' : 'var(--retail-accent)') : 'var(--nav-muted)'

        return (
          <button
            key={tab.id}
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
            }}
          >
            <div
              style={{ transition: 'transform 0.2s', transform: on ? 'translateY(-2px)' : 'none' }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 22,
                  color: tabCol,
                  display: 'block',
                  fontVariationSettings: on ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {tab.icon}
              </span>
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
