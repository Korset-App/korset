import { useNavigate, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { StorefrontIcon, InventoryIcon, EyeIcon, SyncIcon, SlidersIcon } from './icons/index.js'

export default function RetailBottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { currentStore } = useStore()
  const { t } = useI18n()

  const getActive = () => {
    if (pathname.includes('/products')) return 'products'
    if (pathname.includes('/import')) return 'products'
    if (pathname.includes('/ean-recovery')) return 'products'
    if (pathname.includes('/storefront')) return 'storefront'
    if (pathname.includes('/integration')) return 'integration'
    if (pathname.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  const active = getActive()
  const storeSlug = currentStore?.slug

  if (!storeSlug) return null

  const TABS = [
    { id: 'dashboard', label: t('retail.nav.dashboard') || 'Обзор', Icon: StorefrontIcon },
    { id: 'products', label: t('retail.nav.products') || 'Каталог', Icon: InventoryIcon },
    { id: 'storefront', label: t('retail.nav.storefront') || 'Витрина', Icon: EyeIcon },
    { id: 'integration', label: t('retail.nav.integration') || 'Синхронизация', Icon: SyncIcon },
    { id: 'settings', label: t('retail.nav.settings') || 'Настройки', Icon: SlidersIcon },
  ]

  return (
    <nav className="rc-mnav">
      {TABS.map(({ id, label, Icon }) => {
        const on = active === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => navigate(`/retail/${storeSlug}/${id}`)}
            className={`rc-mnav__tab ${on ? 'rc-mnav__tab--active' : ''}`}
            aria-current={on ? 'page' : undefined}
          >
            <Icon size={21} color="currentColor" />
            <span className="rc-mnav__label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
