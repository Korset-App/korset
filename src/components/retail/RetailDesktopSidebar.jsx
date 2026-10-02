import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useI18n, setLang } from '../../i18n/index.js'
import { useTheme } from '../../utils/theme.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import ProfileAvatar from '../ProfileAvatar.jsx'
import KorsetBrandMark from '../brand/KorsetBrandMark.jsx'
import SegmentedToggle from '../SegmentedToggle.jsx'
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
  const { theme, toggleTheme, isLight } = useTheme()
  const { user, signOut } = useAuth()

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isAppInstalled, setIsAppInstalled] = useState(false)
  const userMenuRef = useRef(null)

  // Listen for PWA installation capability
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

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false)
      }
    }
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen])

  // Close popover when collapsing/expanding sidebar
  useEffect(() => {
    setIsUserMenuOpen(false)
  }, [collapsed])

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
  const isPublished = currentStore?.is_published !== false

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

  return (
    <>
      <aside
        className={`retail-sidebar ${collapsed ? 'retail-sidebar--collapsed' : ''}`}
        aria-label="Боковая навигация кабинета"
      >
        {/* ── Brand Header: Official Logo + Name + Collapse Toggle ── */}
        <div className="retail-sidebar__brand">
          <div className="retail-sidebar__brand-identity">
            <KorsetBrandMark size={30} />
            {!collapsed && (
              <div className="retail-sidebar__brand-copy">
                <span className="retail-sidebar__brand-title">Körset</span>
                <span className="retail-sidebar__brand-tag">RETAIL</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="retail-sidebar__collapse-toggle"
            title={
              collapsed
                ? isKz
                  ? 'Мәзірді ашу'
                  : 'Развернуть меню'
                : isKz
                  ? 'Мәзірді жию'
                  : 'Свернуть меню'
            }
            aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
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

        {/* ── Store Context Pill ── */}
        <div
          className="retail-sidebar__store-context"
          title={collapsed ? currentStore?.name || 'Körset Store' : undefined}
        >
          <div className="retail-sidebar__store-avatar-wrap">
            <ProfileAvatar
              avatarId={currentStore?.logo_url}
              name={currentStore?.name || 'K'}
              rounded="circle"
            />
            <span
              className={`retail-sidebar__store-status-dot ${isPublished ? 'online' : 'offline'}`}
              title={isPublished ? (isKz ? 'Желіде' : 'В сети') : isKz ? 'Черновик' : 'Черновик'}
            />
          </div>

          {!collapsed && (
            <div className="retail-sidebar__store-info">
              <span
                className="retail-sidebar__store-name"
                title={currentStore?.name || 'Körset Store'}
              >
                {currentStore?.name || 'Körset Store'}
              </span>
              <span className="retail-sidebar__store-meta">
                <span className={isPublished ? 'retail-meta-online' : 'retail-meta-draft'}>
                  {isPublished ? (isKz ? 'Желіде' : 'В сети') : isKz ? 'Черновик' : 'Черновик'}
                </span>
                {storeSlug && <span className="retail-meta-slug"> · /s/{storeSlug}</span>}
              </span>
            </div>
          )}
        </div>

        {/* ── Main Nav Section (5 Primary Tabs) ── */}
        <nav className="retail-sidebar__nav">
          <div className="retail-sidebar__nav-list">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`${item.path}${search}`)}
                  className={`retail-sidebar__nav-item ${
                    isActive ? 'retail-sidebar__nav-item--active' : ''
                  }`}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="retail-sidebar__nav-icon-wrap">
                    <Icon
                      size={20}
                      color={
                        isActive
                          ? 'var(--retail-accent, #38bdf8)'
                          : 'var(--text-sub, rgba(255,255,255,0.65))'
                      }
                    />
                  </span>
                  {!collapsed && <span className="retail-sidebar__nav-label">{item.label}</span>}
                  {isActive && <span className="retail-sidebar__nav-active-pill" />}
                </button>
              )
            })}
          </div>
        </nav>

        {/* ── Dignified Footer: Clean User Profile Trigger & Floating Popover ── */}
        <div className="retail-sidebar__footer" ref={userMenuRef}>
          <button
            type="button"
            className={`retail-sidebar__user-card ${
              isUserMenuOpen ? 'retail-sidebar__user-card--active' : ''
            }`}
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            title={collapsed ? userName : undefined}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
          >
            <div className="retail-sidebar__user-avatar-wrap">
              <ProfileAvatar avatarId={userAvatarId} name={userName} rounded="circle" />
            </div>

            {!collapsed && (
              <div className="retail-sidebar__user-details">
                <span className="retail-sidebar__user-name" title={userName}>
                  {userName}
                </span>
                <span className="retail-sidebar__user-role">
                  {isKz ? 'Дүкен басқарушысы' : 'Администратор'}
                </span>
              </div>
            )}

            {!collapsed && (
              <span className="retail-sidebar__user-chevron">
                <MenuDotsIcon size={16} />
              </span>
            )}
          </button>

          {/* ── User Floating Dropdown / Popover ── */}
          {isUserMenuOpen && (
            <div
              className={`retail-user-popover ${collapsed ? 'retail-user-popover--collapsed' : ''}`}
              role="menu"
            >
              {/* User Header */}
              <div className="retail-user-popover__header">
                <div className="retail-user-popover__name">{userName}</div>
                <div className="retail-user-popover__email" title={userEmail}>
                  {userEmail}
                </div>
              </div>

              {/* Edit Account Settings trigger */}
              <button
                type="button"
                className="retail-user-popover__item"
                role="menuitem"
                onClick={() => {
                  setIsUserMenuOpen(false)
                  setIsAccountModalOpen(true)
                }}
              >
                <div className="retail-user-popover__icon">
                  <SlidersIcon size={15} color="var(--retail-accent, #38bdf8)" />
                </div>
                <span className="retail-user-popover__label">
                  {isKz ? 'Профиль және қауіпсіздік' : 'Управление аккаунтом'}
                </span>
              </button>

              <div className="retail-user-popover__divider" />

              {/* Theme Segmented Toggle */}
              <div className="retail-user-popover__row">
                <span className="retail-user-popover__row-label">{isKz ? 'Тақырып' : 'Тема'}</span>
                <SegmentedToggle
                  ariaLabel="Переключение темы оформления"
                  activeKey={theme}
                  onChange={() => toggleTheme()}
                  options={[
                    {
                      key: 'dark',
                      render: (active) => (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 20,
                            color: active ? '#ffffff' : 'var(--text-dim)',
                          }}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill={active ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                          </svg>
                        </span>
                      ),
                    },
                    {
                      key: 'light',
                      render: (active) => (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 20,
                            color: active ? '#080c18' : 'var(--text-dim)',
                          }}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="5" fill={active ? 'currentColor' : 'none'} />
                            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                          </svg>
                        </span>
                      ),
                    },
                  ]}
                />
              </div>

              {/* Language Segmented Toggle */}
              <div className="retail-user-popover__row">
                <span className="retail-user-popover__row-label">{isKz ? 'Тіл' : 'Язык'}</span>
                <SegmentedToggle
                  ariaLabel="Переключение языка интерфейса"
                  activeKey={lang}
                  onChange={(key) => setLang(key)}
                  options={[
                    {
                      key: 'ru',
                      render: (active) => (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px 7px',
                            fontWeight: 700,
                            fontSize: 11,
                            color: active ? (isLight ? '#ffffff' : '#080c18') : 'var(--text-dim)',
                          }}
                        >
                          RU
                        </span>
                      ),
                    },
                    {
                      key: 'kz',
                      render: (active) => (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px 7px',
                            fontWeight: 700,
                            fontSize: 11,
                            color: active ? (isLight ? '#ffffff' : '#080c18') : 'var(--text-dim)',
                          }}
                        >
                          KZ
                        </span>
                      ),
                    },
                  ]}
                />
              </div>

              {/* Install on PC */}
              {!isAppInstalled && installPrompt && (
                <button
                  type="button"
                  className="retail-user-popover__item"
                  role="menuitem"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    handleInstallApp()
                  }}
                >
                  <div className="retail-user-popover__icon">
                    <InstallIcon size={15} color="var(--retail-accent, #38bdf8)" />
                  </div>
                  <span className="retail-user-popover__label">
                    {isKz ? 'ДК-ге орнату' : 'Установить на ПК'}
                  </span>
                </button>
              )}

              {/* Telegram Support link */}
              <a
                href="https://t.me/korset_support_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="retail-user-popover__item"
                role="menuitem"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <div className="retail-user-popover__icon">
                  <TelegramIcon size={15} color="#229ED9" />
                </div>
                <span className="retail-user-popover__label">
                  {isKz ? 'Telegram қолдау' : 'Поддержка в Telegram'}
                </span>
              </a>

              <div className="retail-user-popover__divider" />

              {/* Sign Out */}
              <button
                type="button"
                className="retail-user-popover__item retail-user-popover__item--danger"
                role="menuitem"
                onClick={() => {
                  setIsUserMenuOpen(false)
                  signOut()
                }}
              >
                <div className="retail-user-popover__icon">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </div>
                <span className="retail-user-popover__label">
                  {isKz ? 'Шығу' : 'Выйти из аккаунта'}
                </span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Account Settings Modal */}
      <RetailAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </>
  )
}
