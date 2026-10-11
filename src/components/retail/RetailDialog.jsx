import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useOverlayLock } from '../../hooks/useOverlayLock.js'
import { useI18n } from '../../i18n/index.js'
import { CloseIcon } from '../icons/CloseIcon.jsx'

export default function RetailDialog({
  title,
  subtitle,
  onClose,
  returnFocusRef,
  children,
  className = '',
  hideHeader = false,
  anchorStyle,
}) {
  const { t } = useI18n()
  const titleId = useId()
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)
  useOverlayLock(true)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])
  useEffect(() => {
    const previousFocus = document.activeElement
    const returnFocus = returnFocusRef?.current || previousFocus
    const root = document.getElementById('root')
    const rootInert = root?.inert
    if (root) root.inert = true
    const canvas = document.querySelector('.retail-desktop-content')
    const overflow = canvas?.style.overflow
    if (canvas) canvas.style.overflow = 'hidden'
    const frame = window.requestAnimationFrame(() =>
      dialogRef.current?.querySelector('input, button')?.focus()
    )
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
      }
      if (event.key !== 'Tab') return
      const controls = [
        ...dialogRef.current.querySelectorAll(
          'button, a[href], input, select, textarea, [tabindex="0"]'
        ),
      ].filter((el) => !el.disabled && el.getClientRects().length)
      const first = controls[0]
      const last = controls.at(-1)
      if (!first) return
      if (
        event.shiftKey &&
        (document.activeElement === first || !dialogRef.current.contains(document.activeElement))
      ) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !dialogRef.current.contains(document.activeElement))
      ) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey, true)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKey, true)
      if (canvas) canvas.style.overflow = overflow
      if (root) root.inert = rootInert
      if (returnFocus?.isConnected) returnFocus.focus()
    }
  }, [returnFocusRef])

  return createPortal(
    <div
      className={`rc-dialog-backdrop ${anchorStyle ? 'rc-dialog-backdrop--popover' : ''}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className={`rc-dialog ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        style={anchorStyle}
      >
        {hideHeader ? (
          <h2 id={titleId} className="rc-sr-only">
            {title}
          </h2>
        ) : (
          <header className="rc-dialog__head">
            <div>
              <h2 id={titleId}>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <button
              type="button"
              className="rc-iconbtn"
              aria-label={t('retail.shell.close')}
              onClick={onClose}
            >
              <CloseIcon size={19} />
            </button>
          </header>
        )}
        {children}
      </section>
    </div>,
    document.body
  )
}
