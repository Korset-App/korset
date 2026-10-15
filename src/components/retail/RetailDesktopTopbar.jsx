import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n/index.js'
import { RETAIL_NAVIGATION, getRetailSection } from '../../domain/retail/navigation.js'
import RetailStoreActions from './RetailStoreActions.jsx'
import { RETAIL_NAV_ICONS } from './RetailGlyphs.jsx'

export default function RetailDesktopTopbar({ currentStore }) {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const section = RETAIL_NAVIGATION.find((item) => item.id === getRetailSection(pathname))
  const Icon = RETAIL_NAV_ICONS[section.id]
  return (
    <header className="rc-topbar">
      <div className="rc-topbar__path">
        <span className="rc-topbar__section-icon">
          <Icon size={26} />
        </span>
        <div>
          <Link to="/retail">{t('retail.shell.cabinet')}</Link>
          <strong>{t(section.labelKey)}</strong>
        </div>
      </div>
      <RetailStoreActions currentStore={currentStore} />
    </header>
  )
}
