import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/index.js'
import { EyeIcon } from '../icons/EyeIcon.jsx'
import { ExternalLinkIcon } from '../icons/ExternalLinkIcon.jsx'
import { MenuDotsIcon } from '../icons/MenuDotsIcon.jsx'
import { ShareIcon } from '../icons/ShareIcon.jsx'
import { QrCodeIcon } from '../icons/QrCodeIcon.jsx'

const QrDialog = lazy(() => import('./RetailQrDialog.jsx'))

export default function RetailStoreActions({ currentStore, compact = false }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [qrType, setQrType] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const wrapperRef = useRef(null)
  const triggerRef = useRef(null)
  const slug = currentStore?.slug
  useEffect(() => {
    if (!open) return undefined
    const outside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    const key = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        const items = [...wrapperRef.current.querySelectorAll('[role="menuitem"]')]
        const index = items.indexOf(document.activeElement)
        if (index < 0) return
        event.preventDefault()
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? items.length - 1
              : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
        items[next].focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', key)
    wrapperRef.current.querySelector('[role="menuitem"]')?.focus()
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', key)
    }
  }, [open])
  useEffect(() => {
    if (!feedback) return undefined
    const timer = setTimeout(() => setFeedback(null), 3500)
    return () => clearTimeout(timer)
  }, [feedback])
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(`${window.location.origin}/s/${slug}`)
      setFeedback(t('retail.desktop.linkCopied'))
    } catch {
      setFeedback(t('retail.shell.copyFailed'))
    }
    setOpen(false)
    triggerRef.current?.focus()
  }
  return (
    <>
      <div className="rc-store-actions">
        {!compact && slug && (
          <a className="rc-btn" href={`/s/${slug}`} target="_blank" rel="noopener noreferrer">
            <EyeIcon size={16} />
            <span>{t('retail.viewStoreFrontShort')}</span>
            <ExternalLinkIcon size={12} />
          </a>
        )}
        <div className="retail-topbar__menu-wrap" ref={wrapperRef}>
          <button
            type="button"
            ref={triggerRef}
            className="rc-iconbtn"
            aria-label={t('retail.desktop.quickActions')}
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen((value) => !value)}
            disabled={!slug}
          >
            <MenuDotsIcon size={20} />
          </button>
          {open && (
            <div className="rc-menu rc-menu--down" role="menu">
              {compact && (
                <a
                  role="menuitem"
                  className="rc-menu__item"
                  href={`/s/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <EyeIcon size={17} />
                  {t('retail.desktop.openStorefront')}
                </a>
              )}
              <button type="button" role="menuitem" className="rc-menu__item" onClick={copy}>
                <ShareIcon size={17} />
                {t('retail.desktop.copyStoreLink')}
              </button>
              <button
                type="button"
                role="menuitem"
                className="rc-menu__item"
                onClick={() => {
                  setOpen(false)
                  setQrType('cashier')
                }}
              >
                <QrCodeIcon size={17} />
                {t('retail.shell.customerQr')}
              </button>
              <button
                type="button"
                role="menuitem"
                className="rc-menu__item"
                onClick={() => {
                  setOpen(false)
                  setQrType('retail')
                }}
              >
                <ExternalLinkIcon size={17} />
                {t('retail.desktop.mobileQr')}
              </button>
            </div>
          )}
        </div>
      </div>
      {feedback && (
        <div className="retail-toast" role="status">
          {feedback}
        </div>
      )}
      {qrType && (
        <Suspense
          fallback={
            <div className="rc-dialog-backdrop" role="status">
              {t('retail.shell.loading')}
            </div>
          }
        >
          <QrDialog
            type={qrType}
            store={currentStore}
            onClose={() => setQrType(null)}
            returnFocusRef={triggerRef}
          />
        </Suspense>
      )}
    </>
  )
}
