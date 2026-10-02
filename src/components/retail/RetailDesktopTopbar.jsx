import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { useI18n, setLang } from '../../i18n/index.js'
import { useTheme } from '../../utils/theme.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import {
  MenuDotsIcon,
  EyeIcon,
  ExternalLinkIcon,
  QrCodeIcon,
  ShareIcon,
  CheckCircleIcon,
  CloseIcon,
  TelegramIcon,
  InstallIcon,
} from '../icons/index.js'

export default function RetailDesktopTopbar({ currentStore }) {
  const { pathname } = useLocation()
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'
  const { toggleTheme, isLight } = useTheme()
  const { signOut } = useAuth()

  const [menuOpen, setMenuOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const [qrModalType, setQrModalType] = useState(null) // 'mobile_login' | 'cashier_qr' | null
  const [installPrompt, setInstallPrompt] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setInstallPrompt(null)
      }
    }
  }

  const storeSlug = currentStore?.slug || ''
  const isPublished = currentStore?.is_published !== false

  // Determine section title and breadcrumbs
  const getSectionTitle = () => {
    if (pathname.includes('/integration')) return t('retail.nav.integration') || 'Синхронизация'
    if (pathname.includes('/storefront')) return t('retail.nav.storefront') || 'Витрина'
    if (pathname.includes('/import')) return t('retail.nav.import') || 'Импорт'
    if (pathname.includes('/ean-recovery')) return t('retail.nav.eanRecovery') || 'Штрихкоды'
    if (pathname.includes('/products')) return t('retail.nav.products') || 'Каталог'
    if (pathname.includes('/settings')) return t('retail.nav.settings') || 'Настройки'
    return t('retail.nav.dashboard') || 'Обзор'
  }

  const section = getSectionTitle()

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  // Toast auto-hide
  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [toastMessage])

  const handleCopyLink = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://korset.kz'
    const fullUrl = `${origin}/s/${storeSlug}`
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl)
      }
      setToastMessage(t('retail.desktop.linkCopied') || 'Ссылка скопирована в буфер!')
    } catch {
      setToastMessage(isKz ? 'Көшіру мүмкін болмады' : 'Не удалось скопировать')
    }
    setMenuOpen(false)
  }

  return (
    <>
      <header className="retail-topbar">
        {/* Left: Breadcrumbs & Status */}
        <div className="retail-topbar__left">
          <div className="retail-topbar__breadcrumbs">
            <span className="retail-topbar__crumb-root">{currentStore?.name || 'Körset'}</span>
            <span className="retail-topbar__crumb-sep">/</span>
            <span className="retail-topbar__crumb-current">{section}</span>
          </div>
          <span
            className={`retail-topbar__status-pill ${
              isPublished
                ? 'retail-topbar__status-pill--published'
                : 'retail-topbar__status-pill--draft'
            }`}
          >
            <span className="retail-topbar__status-dot" />
            <span>
              {isPublished
                ? t('retail.desktop.storeOnline') || 'В сети'
                : t('retail.desktop.storeOffline') || 'Черновик'}
            </span>
          </span>
        </div>

        {/* Right: Actions */}
        <div className="retail-topbar__right">
          {/* Quick Action: Copy link */}
          {storeSlug && (
            <button
              type="button"
              onClick={handleCopyLink}
              className="retail-topbar__storefront-btn"
              style={{
                background: 'var(--glass-bg)',
                borderColor: 'var(--retail-border)',
                color: 'var(--text-sub)',
              }}
              title={t('retail.desktop.copyStoreLink') || 'Скопировать ссылку на магазин'}
            >
              <ShareIcon size={14} color="var(--retail-accent)" />
              <span style={{ fontSize: 12 }}>{isKz ? 'Сілтеме' : 'Ссылка'}</span>
            </button>
          )}

          {/* Quick Action: Open Storefront */}
          {storeSlug && (
            <a
              href={`/s/${storeSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="retail-topbar__storefront-btn"
              title={t('retail.desktop.openStorefront') || 'Открыть витрину покупателя'}
            >
              <EyeIcon size={15} />
              <span>{t('retail.viewStoreFrontShort') || 'Витрина'}</span>
              <ExternalLinkIcon size={12} color="currentColor" />
            </a>
          )}

          {/* Quick Action: Install on PC if supported */}
          {installPrompt && (
            <button
              type="button"
              onClick={handleInstallApp}
              className="retail-topbar__storefront-btn"
              style={{
                background: 'rgba(56, 189, 248, 0.1)',
                borderColor: 'rgba(56, 189, 248, 0.3)',
                color: 'var(--retail-accent, #38bdf8)',
              }}
              title={t('retail.desktop.installApp') || 'Установить на ПК'}
            >
              <InstallIcon size={14} color="var(--retail-accent, #38bdf8)" />
              <span style={{ fontSize: 12 }}>{isKz ? 'Орнату' : 'Установить'}</span>
            </button>
          )}

          {/* Three dots dropdown menu button */}
          <div className="retail-topbar__menu-wrap" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className={`retail-topbar__menu-btn ${menuOpen ? 'active' : ''}`}
              title={t('retail.desktop.quickActions') || 'Быстрые действия'}
              aria-label="Быстрые действия"
              aria-expanded={menuOpen}
            >
              <MenuDotsIcon size={18} />
            </button>

            {menuOpen && (
              <div className="retail-topbar__dropdown" role="menu">
                <div className="retail-topbar__dropdown-header">
                  <span className="retail-topbar__dropdown-title">
                    {t('retail.desktop.quickActions') || 'Быстрые действия'}
                  </span>
                </div>

                <div className="retail-topbar__dropdown-group">
                  {/* Print QR for cashier desk */}
                  <button
                    type="button"
                    className="retail-topbar__dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setQrModalType('cashier_qr')
                      setMenuOpen(false)
                    }}
                  >
                    <QrCodeIcon size={16} color="var(--success-bright, #10b981)" />
                    <span>{t('retail.desktop.printQr') || 'Печать QR на кассу'}</span>
                  </button>

                  {/* Mobile login QR */}
                  <button
                    type="button"
                    className="retail-topbar__dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setQrModalType('mobile_login')
                      setMenuOpen(false)
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--additive, #f59e0b)"
                      strokeWidth="2"
                    >
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                    <span>{t('retail.desktop.mobileQr') || 'Вход со смартфона'}</span>
                  </button>
                </div>

                <div className="retail-topbar__dropdown-divider" />

                <div className="retail-topbar__dropdown-group">
                  {/* Theme Switch */}
                  <button
                    type="button"
                    className="retail-topbar__dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      toggleTheme()
                      setMenuOpen(false)
                    }}
                  >
                    {isLight ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="5" />
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                    )}
                    <span>
                      {isLight
                        ? t('retail.desktop.themeDark') || 'Тёмная тема'
                        : t('retail.desktop.themeLight') || 'Светлая тема'}
                    </span>
                  </button>

                  {/* Language switch */}
                  <button
                    type="button"
                    className="retail-topbar__dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setLang(lang === 'ru' ? 'kz' : 'ru')
                      setMenuOpen(false)
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        width: 16,
                        textAlign: 'center',
                        color: 'var(--retail-accent)',
                      }}
                    >
                      {lang === 'ru' ? 'KZ' : 'RU'}
                    </span>
                    <span>{lang === 'ru' ? 'Қазақ тіліне ауысу' : 'Переключить на русский'}</span>
                  </button>

                  {/* Support */}
                  <a
                    href="https://t.me/korset_support_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="retail-topbar__dropdown-item"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    <TelegramIcon size={16} color="#229ED9" />
                    <span>{t('retail.desktop.support') || 'Служба заботы Körset'}</span>
                  </a>
                </div>

                <div className="retail-topbar__dropdown-divider" />

                {/* Logout */}
                <button
                  type="button"
                  className="retail-topbar__dropdown-item retail-topbar__dropdown-item--danger"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
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
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>{t('retail.desktop.logout') || 'Выйти из кабинета'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="retail-toast">
          <CheckCircleIcon size={18} color="var(--success-bright, #10b981)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal for QR Codes (Mobile Login or Cashier QR) */}
      {qrModalType && (
        <div
          className="retail-modal-backdrop"
          onClick={() => setQrModalType(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="retail-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="retail-modal-header">
              <div className="retail-modal-title">
                {qrModalType === 'mobile_login'
                  ? t('retail.desktop.mobileQr') || 'Вход со смартфона'
                  : t('retail.desktop.printQr') || 'QR-код для витрины магазина'}
              </div>
              <button
                type="button"
                className="retail-modal-close-btn"
                onClick={() => setQrModalType(null)}
                aria-label="Закрыть"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="retail-modal-body" style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-sub)',
                  margin: '0 0 20px',
                  lineHeight: 1.5,
                }}
              >
                {qrModalType === 'mobile_login'
                  ? t('retail.desktop.mobileQrSub') ||
                    'Отсканируйте камерой смартфона для мгновенного входа в кабинет ритейла'
                  : isKz
                    ? 'Сатып алушылар дүкен сөресін ашу үшін бұл кодты кассада немесе кіреберісте сканерлейді'
                    : 'Покупатели сканируют этот код у кассы или на входной группе, чтобы открыть витрину магазина'}
              </p>

              <div
                style={{
                  display: 'inline-block',
                  padding: 16,
                  borderRadius: 16,
                  background: '#ffffff',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                }}
              >
                <QRCode
                  value={
                    qrModalType === 'mobile_login'
                      ? typeof window !== 'undefined'
                        ? window.location.href
                        : ''
                      : `${typeof window !== 'undefined' ? window.location.origin : 'https://korset.kz'}/s/${storeSlug}`
                  }
                  size={200}
                />
              </div>

              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button
                  type="button"
                  className="retail-btn-secondary"
                  onClick={() => setQrModalType(null)}
                >
                  {isKz ? 'Жабу' : 'Закрыть'}
                </button>
                <button type="button" className="retail-btn-primary" onClick={() => window.print()}>
                  {isKz ? 'Басып шығару' : 'Распечатать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
