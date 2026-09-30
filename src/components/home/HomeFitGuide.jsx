import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useOverlayLock } from '../../hooks/useOverlayLock.js'
import { BarcodeScannerIcon, CloseIcon, SlidersIcon } from '../icons/index.js'
import './HomeFitGuide.css'

export default function HomeFitGuide({ open, onClose, onScan, onFilters, image, t }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  useOverlayLock(open)

  useEffect(() => {
    if (!open) return undefined
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [open])

  return createPortal(
    <dialog
      ref={dialogRef}
      className="home-fit-guide"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose()
      }}
    >
      <div className="home-fit-guide__scroll">
        <img className="home-fit-guide__image" src={image} width={1200} height={675} alt="" />
        <button
          type="button"
          className="home-fit-guide__close"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <CloseIcon size={20} />
        </button>
        <div className="home-fit-guide__body">
          <h2 id={titleId}>{t('home.banners.scan.headline')}</h2>
          <p>{t('home.banners.scan.guide.intro')}</p>
          <ol>
            {['filters', 'scan', 'result'].map((step, index) => (
              <li key={step}>
                <span className="home-fit-guide__number" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <h3>{t(`home.banners.scan.guide.${step}Title`)}</h3>
                  <p>{t(`home.banners.scan.guide.${step}Text`)}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="home-fit-guide__note">{t('home.banners.scan.guide.note')}</p>
        </div>
      </div>
      <div className="home-fit-guide__actions">
        <button type="button" onClick={onFilters}>
          <SlidersIcon size={18} />
          {t('home.banners.scan.guide.filtersCta')}
        </button>
        <button type="button" className="home-fit-guide__scan" onClick={onScan}>
          <BarcodeScannerIcon size={18} />
          {t('home.banners.scan.cta')}
        </button>
      </div>
    </dialog>,
    document.body
  )
}
