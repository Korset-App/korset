import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../../i18n/index.js'
import { CloseIcon, InstallIcon } from '../icons/index.js'
import './InstallAppSheet.css'

function isIosSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iosDevice = /iphone|ipad|ipod/i.test(ua)
  const ipadDesktopMode =
    /macintosh/i.test(ua) &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1
  return iosDevice || ipadDesktopMode
}

export default function InstallAppSheet({ open, onClose, installPrompt, onPromptUsed }) {
  const { t } = useI18n()
  const [promptBusy, setPromptBusy] = useState(false)
  const ios = useMemo(() => isIosSafari(), [])
  const hasNativePrompt = Boolean(installPrompt)

  async function handleNativeInstall() {
    if (!installPrompt || promptBusy) return
    setPromptBusy(true)
    try {
      installPrompt.prompt()
      await installPrompt.userChoice.catch(() => null)
      onPromptUsed?.()
      onClose()
    } finally {
      setPromptBusy(false)
    }
  }

  if (typeof document === 'undefined') return null

  const steps = ios
    ? [t('home.installStepShare'), t('home.installStepHome')]
    : [t('home.installStepMenu'), t('home.installStepInstall')]

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="install-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            role="button"
            tabIndex={-1}
            aria-label={t('common.close')}
          />
          <motion.div
            className="install-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 350, mass: 0.8 }}
            style={{ willChange: 'transform' }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 90 || velocity.y > 400) {
                onClose()
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-label={t('home.installGuideTitle')}
          >
            <div className="install-sheet__handle-wrap">
              <div className="install-sheet__handle" />
            </div>

            <div className="install-sheet__header">
              <div className="install-sheet__title-wrap">
                <div className="install-sheet__emblem" aria-hidden="true">
                  <InstallIcon size={20} color="var(--primary-bright)" />
                </div>
                <div className="install-sheet__titles">
                  <h3 className="install-sheet__title">{t('home.installGuideTitle')}</h3>
                  <p className="install-sheet__subtitle">
                    {ios ? t('home.installIosTitle') : t('home.installTitle')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="install-sheet__close"
                onClick={onClose}
                aria-label={t('common.close')}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="install-sheet__body">
              <p className="install-sheet__lead">
                {ios ? t('home.installIosText') : t('home.installText')}
              </p>

              {hasNativePrompt && !ios && (
                <button
                  type="button"
                  className="install-sheet__cta"
                  onClick={handleNativeInstall}
                  disabled={promptBusy}
                >
                  <InstallIcon size={18} color="currentColor" />
                  <span>{t('home.installCta')}</span>
                </button>
              )}

              <div className="install-sheet__section-title">{t('home.installGuideTitle')}</div>
              <ol className="install-sheet__steps">
                {steps.map((step, i) => (
                  <li key={step} className="install-sheet__step">
                    <span className="install-sheet__step-num" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              <div className="install-sheet__section-title">{t('home.installBenefitsLabel')}</div>
              <div className="install-sheet__benefits">
                {['home.installBenefit1', 'home.installBenefit2', 'home.installBenefit3'].map(
                  (key) => (
                    <span key={key} className="install-sheet__benefit">
                      {t(key)}
                    </span>
                  )
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
