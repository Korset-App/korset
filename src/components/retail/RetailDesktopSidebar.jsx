import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useI18n, setLang } from '../../i18n/index.js'
import { useTheme } from '../../utils/theme.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import ProfileAvatar from '../ProfileAvatar.jsx'
import KorsetBrandMark from '../brand/KorsetBrandMark.jsx'
import RetailAccountModal from './RetailAccountModal.jsx'
import {
  StorefrontIcon,
  InventoryIcon,
  SlidersIcon,
  EyeIcon,
  SyncIcon,
  InstallIcon,
  TelegramIcon,
  MenuDotsIcon,
} from '../icons/index.js'

export default function RetailDesktopSidebar({ currentStore, collapsed, onToggleCollapse }) {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'
  const { theme, toggleTheme } = useTheme()
  const { user, signOut } = useAuth()

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isAppInstalled, setIsAppInstalled] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    const handleAppInstalled = () => {
      setIsAppInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  useEffect(() => {
    if (!isUserMenuOpen) return undefined
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false)
      }
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isUserMenuOpen])

  const handleToggleCollapse = () => {
    setIsUserMenuOpen(false)
    onToggleCollapse()
  }

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setInstallPrompt(null)
      }
    } else {
      alert(
        isKz
          ? 'Қолданбаны браузердің мекенжай жолағындағы «Орнату» белгішесі арқылы ДК-ге орната аласыз.'
          : 'Вы можете установить приложение через значок установки в адресной строке вашего браузера.'
      )
    }
  }

  const storeSlug = currentStore?.slug || ''
  const storeName = currentStore?.name || 'Körset Store'
  const isPublished = currentStore?.is_published !== false
  const statusLabel = isPublished
    ? t('retail.desktop.storeOnline') || 'В сети'
    : t('retail.desktop.storeOffline') || 'Черновик'

  const getActiveTab = () => {
    if (pathname.includes('/products')) return 'products'
    if (pathname.includes('/import')) return 'products'
    if (pathname.includes('/ean-recovery')) return 'products'
    if (pathname.includes('/storefront')) return 'storefront'
    if (pathname.includes('/integration')) return 'integration'
    if (pathname.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  const activeTab = getActiveTab()

  const NAV_ITEMS = [
    {
      id: 'dashboard',
      label: t('retail.nav.dashboard') || 'Обзор',
      path: `/retail/${storeSlug}/dashboard`,
      icon: StorefrontIcon,
    },
    {
      id: 'products',
      label: t('retail.nav.products') || 'Каталог',
      path: `/retail/${storeSlug}/products`,
      icon: InventoryIcon,
    },
    {
      id: 'storefront',
      label: t('retail.nav.storefront') || 'Витрина',
      path: `/retail/${storeSlug}/storefront`,
      icon: EyeIcon,
    },
    {
      id: 'integration',
      label: t('retail.nav.integration') || 'Синхронизация',
      path: `/retail/${storeSlug}/integration`,
      icon: SyncIcon,
    },
    {
      id: 'settings',
      label: t('retail.nav.settings') || 'Настройки',
      path: `/retail/${storeSlug}/settings`,
      icon: SlidersIcon,
    },
  ]

  const userName =
    user?.user_metadata?.name || user?.email?.split('@')[0] || (isKz ? 'Басқарушы' : 'Управляющий')
  const userEmail = user?.email || 'admin@korset.app'
  const userAvatarId = user?.user_metadata?.avatar_id
  const collapseLabel = collapsed
    ? isKz
      ? 'Мәзірді ашу'
      : 'Развернуть меню'
    : isKz
      ? 'Мәзірді жию'
      : 'Свернуть меню'

  return (
    <>
      <aside
        className={`rc-side ${collapsed ? 'rc-side--collapsed' : ''}`}
        aria-label={isKz ? 'Кабинет навигациясы' : 'Навигация кабинета'}
      >
        <div className="rc-side__brand">
          <div className="rc-side__identity">
            <KorsetBrandMark size={30} />
            {!collapsed && (
              <div>
                <span className="rc-side__title">Körset</span>
                <span className="rc-side__tag">RETAIL</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="rc-side__collapse"
            title={collapseLabel}
            aria-label={collapseLabel}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: collapsed ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        <div className="rc-side__store" title={collapsed ? storeName : undefined}>
          <div className="rc-avatar">
            <ProfileAvatar avatarId={currentStore?.logo_url} name={storeName} rounded="circle" />
          </div>
          {!collapsed && (
            <div className="rc-side__store-copy">
              <span className="rc-side__store-name" title={storeName}>
                {storeName}
              </span>
              <span className={`rc-status ${isPublished ? '' : 'rc-status--draft'}`}>
                {statusLabel}
              </span>
            </div>
          )}
        </div>

        <nav className="rc-side__nav">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`${item.path}${search}`)}
                className={`rc-side__item ${isActive ? 'rc-side__item--active' : ''}`}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={19} color="currentColor" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        <div className="rc-side__foot" ref={userMenuRef}>
          <button
            type="button"
            className="rc-side__user"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            title={collapsed ? userName : undefined}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
          >
            <div className="rc-side__user-avatar">
              <ProfileAvatar avatarId={userAvatarId} name={userName} rounded="circle" />
            </div>
            {!collapsed && (
              <div className="rc-side__user-copy">
                <span className="rc-side__user-name" title={userName}>
                  {userName}
                </span>
                <span className="rc-side__user-role">
                  {isKz ? 'Дүкен басқарушысы' : 'Администратор'}
                </span>
              </div>
            )}
            {!collapsed && (
              <span className="rc-side__user-more">
                <MenuDotsIcon size={16} />
              </span>
            )}
          </button>

          {isUserMenuOpen && (
            <div className={`rc-menu ${collapsed ? 'rc-menu--side' : 'rc-menu--up'}`} role="menu">
              <div className="rc-menu__head">
                <div className="rc-menu__name">{userName}</div>
                <div className="rc-menu__sub" title={userEmail}>
                  {userEmail}
                </div>
              </div>

              <button
                type="button"
                className="rc-menu__item"
                role="menuitem"
                onClick={() => {
                  setIsUserMenuOpen(false)
                  setIsAccountModalOpen(true)
                }}
              >
                <SlidersIcon size={16} color="currentColor" />
                <span>{isKz ? 'Профиль және қауіпсіздік' : 'Управление аккаунтом'}</span>
              </button>

              <div className="rc-menu__sep" />

              <div className="rc-menu__row">
                <span>{isKz ? 'Тақырып' : 'Тема'}</span>
                <div className="rc-seg" role="group" aria-label={isKz ? 'Тақырып' : 'Тема'}>
                  {[
                    ['light', isKz ? 'Ашық' : 'Светлая'],
                    ['dark', isKz ? 'Қараңғы' : 'Тёмная'],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className="rc-seg__btn"
                      aria-pressed={theme === key}
                      onClick={() => theme !== key && toggleTheme()}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rc-menu__row">
                <span>{isKz ? 'Тіл' : 'Язык'}</span>
                <div className="rc-seg" role="group" aria-label={isKz ? 'Тіл' : 'Язык'}>
                  {['ru', 'kz'].map((key) => (
                    <button
                      key={key}
                      type="button"
                      className="rc-seg__btn"
                      aria-pressed={lang === key}
                      onClick={() => setLang(key)}
                    >
                      {key.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rc-menu__sep" />

              {!isAppInstalled && installPrompt && (
                <button
                  type="button"
                  className="rc-menu__item"
                  role="menuitem"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    handleInstallApp()
                  }}
                >
                  <InstallIcon size={16} color="currentColor" />
                  <span>{isKz ? 'ДК-ге орнату' : 'Установить на ПК'}</span>
                </button>
              )}

              <a
                href="https://t.me/korset_support_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="rc-menu__item"
                role="menuitem"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <TelegramIcon size={16} color="currentColor" />
                <span>{isKz ? 'Telegram қолдау' : 'Поддержка в Telegram'}</span>
              </a>

              <div className="rc-menu__sep" />

              <button
                type="button"
                className="rc-menu__item rc-menu__item--danger"
                role="menuitem"
                onClick={() => {
                  setIsUserMenuOpen(false)
                  signOut()
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>{isKz ? 'Шығу' : 'Выйти из аккаунта'}</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      <RetailAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </>
  )
}
