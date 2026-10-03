import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { useI18n } from '../../i18n/index.js'
import {
  MenuDotsIcon,
  EyeIcon,
  ExternalLinkIcon,
  QrCodeIcon,
  ShareIcon,
  CheckCircleIcon,
  CloseIcon,
} from '../icons/index.js'

export default function RetailDesktopTopbar({ currentStore }) {
  const { pathname } = useLocation()
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'

  const [menuOpen, setMenuOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const [qrModalType, setQrModalType] = useState(null) // 'mobile_login' | 'cashier_qr' | null
  const menuRef = useRef(null)

  const storeSlug = currentStore?.slug || ''
  const isPublished = currentStore?.is_published !== false

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

  useEffect(() => {
    if (!menuOpen) return undefined
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!toastMessage) return undefined
    const timer = setTimeout(() => setToastMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [toastMessage])

  const handleCopyLink = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://korset.kz'
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${origin}/s/${storeSlug}`)
      }
      setToastMessage(t('retail.desktop.linkCopied') || 'Ссылка скопирована в буфер!')
    } catch {
      setToastMessage(isKz ? 'Көшіру мүмкін болмады' : 'Не удалось скопировать')
    }
    setMenuOpen(false)
  }

  const openQr = (type) => {
    setQrModalType(type)
    setMenuOpen(false)
  }

  return (
    <>
      <header className="retail-topbar">
        <div className="retail-topbar__left">
          <div className="retail-topbar__crumbs">
            <span className="retail-topbar__root">{currentStore?.name || 'Körset'}</span>
            <span className="retail-topbar__sep">/</span>
            <span className="retail-topbar__current">{section}</span>
          </div>
          {!isPublished && (
            <span className="rc-status rc-status--draft">
              {t('retail.desktop.storeOffline') || 'Черновик'}
            </span>
          )}
        </div>

        <div className="retail-topbar__right">
          {storeSlug && (
            <a
              href={`/s/${storeSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rc-btn"
              title={t('retail.desktop.openStorefront') || 'Открыть витрину покупателя'}
            >
              <EyeIcon size={15} color="currentColor" />
              <span>{t('retail.viewStoreFrontShort') || 'Витрина'}</span>
              <ExternalLinkIcon size={12} color="currentColor" />
            </a>
          )}

          <div className="retail-topbar__menu-wrap" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="rc-iconbtn"
              title={t('retail.desktop.quickActions') || 'Быстрые действия'}
              aria-label={t('retail.desktop.quickActions') || 'Быстрые действия'}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <MenuDotsIcon size={18} />
            </button>

            {menuOpen && (
              <div className="rc-menu rc-menu--down" role="menu">
                {storeSlug && (
                  <button
                    type="button"
                    className="rc-menu__item"
                    role="menuitem"
                    onClick={handleCopyLink}
                  >
                    <ShareIcon size={16} color="currentColor" />
                    <span>
                      {t('retail.desktop.copyStoreLink') || 'Скопировать ссылку на магазин'}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  className="rc-menu__item"
                  role="menuitem"
                  onClick={() => openQr('cashier_qr')}
                >
                  <QrCodeIcon size={16} color="currentColor" />
                  <span>{t('retail.desktop.printQr') || 'Печать QR на кассу'}</span>
                </button>
                <button
                  type="button"
                  className="rc-menu__item"
                  role="menuitem"
                  onClick={() => openQr('mobile_login')}
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
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                  <span>{t('retail.desktop.mobileQr') || 'Вход со смартфона'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {toastMessage && (
        <div className="retail-toast">
          <CheckCircleIcon size={18} color="var(--rc-pos)" />
          <span>{toastMessage}</span>
        </div>
      )}

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
                aria-label={isKz ? 'Жабу' : 'Закрыть'}
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="retail-modal-body" style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--rc-ink-2)',
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

              {/* QR must stay white for scanner contrast in both themes */}
              <div
                style={{
                  display: 'inline-block',
                  padding: 16,
                  borderRadius: 16,
                  background: '#ffffff',
                  border: '1px solid var(--rc-line)',
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
