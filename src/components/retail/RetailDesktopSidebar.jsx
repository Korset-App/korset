import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n/index.js'
import {
  RETAIL_NAVIGATION,
  getRetailPath,
  getRetailSection,
} from '../../domain/retail/navigation.js'
import KorsetBrandMark from '../brand/KorsetBrandMark.jsx'
import ProfileAvatar from '../ProfileAvatar.jsx'
import RetailAccountMenu from './RetailAccountMenu.jsx'
import { RETAIL_NAV_ICONS, PanelGlyph, StoreGlyph } from './RetailGlyphs.jsx'

export default function RetailDesktopSidebar({ currentStore, collapsed, onToggleCollapse }) {
  const { t } = useI18n()
  const { pathname, search } = useLocation()
  const active = getRetailSection(pathname)
  return (
    <aside
      className={`rc-side ${collapsed ? 'rc-side--collapsed' : ''}`}
      aria-label={t('retail.shell.navigation')}
    >
      <div className="rc-side__brand">
        <div className="rc-side__identity" aria-label="Körset">
          <KorsetBrandMark size={36} className="rc-brand-mark" />
          <span className="rc-side__wordmark rc-side__reveal" aria-hidden={collapsed}>
            Körset<span>{t('retail.shell.business')}</span>
          </span>
        </div>
      </div>
      <div className="rc-side__store" title={currentStore?.name} aria-label={`${t('retail.shell.yourStore')}: ${currentStore?.name || 'Körset'}`}>
        <span className="rc-side__store-mini" aria-hidden="true">
          {currentStore?.logo_url ? (
            <ProfileAvatar
              avatarId={currentStore.logo_url}
              name={currentStore.name}
              rounded="square"
            />
          ) : (
            <StoreGlyph size={24} />
          )}
        </span>
        <div className="rc-side__store-copy rc-side__reveal" aria-hidden={collapsed}>
          <small>{t('retail.shell.yourStore')}</small>
          <strong>{currentStore?.name || 'Körset'}</strong>
          <span
            className={`rc-status ${currentStore?.isPublished === false ? 'rc-status--draft' : ''}`}
          >
            {t(
              currentStore?.isPublished === false
                ? 'retail.desktop.storeOffline'
                : 'retail.desktop.storeOnline'
            )}
          </span>
        </div>
      </div>
      <nav className="rc-side__nav">
        {['workspace', 'management'].map((group) => (
          <div className="rc-side__group" key={group}>
            <div className="rc-side__group-label rc-side__reveal" aria-hidden={collapsed}>
              {t(`retail.shell.${group}`)}
            </div>
            {RETAIL_NAVIGATION.filter((item) => item.group === group).map((item) => {
              const Icon = RETAIL_NAV_ICONS[item.id]
              const label = t(item.labelKey)
              return (
                <Link
                  key={item.id}
                  to={`${getRetailPath(currentStore?.slug, item.id)}${search}`}
                  className={`rc-side__item ${active === item.id ? 'rc-side__item--active' : ''}`}
                  aria-current={active === item.id ? 'page' : undefined}
                  aria-label={label}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={23} />
                  <span className="rc-side__reveal" aria-hidden={collapsed}>
                    {label}
                  </span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="rc-side__foot">
        <RetailAccountMenu compact={collapsed} />
        <button
          type="button"
          className="rc-side__collapse"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-label={t(collapsed ? 'retail.shell.expandMenu' : 'retail.shell.collapseMenu')}
          title={t(collapsed ? 'retail.shell.expandMenu' : 'retail.shell.collapseMenu')}
        >
          <PanelGlyph size={23} />
          <span className="rc-side__reveal" aria-hidden={collapsed}>
            {t('retail.shell.collapseMenu')}
          </span>
        </button>
      </div>
    </aside>
  )
}
