import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { RETAIL_NAVIGATION, getRetailPath, getRetailSection } from '../domain/retail/navigation.js'
import { RETAIL_NAV_ICONS } from './retail/RetailGlyphs.jsx'

export default function RetailBottomNav() {
  const { currentStore } = useStore()
  const { pathname, search } = useLocation()
  const { t } = useI18n()
  const active = getRetailSection(pathname)
  if (!currentStore?.slug) return null
  return (
    <nav className="rc-mnav" aria-label={t('retail.shell.navigation')}>
      {RETAIL_NAVIGATION.map((item) => {
        const Icon = RETAIL_NAV_ICONS[item.id]
        return (
          <Link
            key={item.id}
            to={`${getRetailPath(currentStore.slug, item.id)}${search}`}
            className={`rc-mnav__tab ${active === item.id ? 'rc-mnav__tab--active' : ''}`}
            aria-current={active === item.id ? 'page' : undefined}
          >
            <Icon size={20} />
            <span>{t(item.labelKey)}</span>
          </Link>
        )
      })}
    </nav>
  )
}
