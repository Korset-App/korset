import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../../i18n/index.js'
import {
  CloseIcon,
  InstallIcon,
  ShareIcon,
  AddToHomeScreenIcon,
  MenuDotsIcon,
  MenuBarsIcon,
  ExternalLinkIcon,
  SupportIcon,
  CheckCircleIcon,
  ChevronDownIcon,
} from '../icons/index.js'
import { detectBrowserContext } from '../../utils/browserDetection.js'
import './InstallAppSheet.css'

const TELEGRAM_URL = 'https://t.me/korset_support_bot'

export default function InstallAppSheet({ open, onClose, installPrompt, onPromptUsed }) {
  const { t } = useI18n()
  const [promptBusy, setPromptBusy] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)

  const context = useMemo(() => detectBrowserContext(), [])
  const hasNativePrompt = Boolean(
    installPrompt || (typeof window !== 'undefined' && window.__korset_install_prompt)
  )

  async function handleNativeInstall() {
    const prompt = installPrompt || window.__korset_install_prompt
    if (!prompt || promptBusy) return
    setPromptBusy(true)
    try {
      prompt.prompt()
      const choice = await prompt.userChoice.catch(() => null)
      if (choice?.outcome === 'accepted') {
        try {
          localStorage.setItem('korset:pwa-installed', 'true')
        } catch {
          /* ignore storage error */
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('korset:pwa-installed'))
        }
      }
      onPromptUsed?.()
      onClose()
    } finally {
      setPromptBusy(false)
    }
  }

  const handleSupport = () => {
    window.open(TELEGRAM_URL, '_blank', 'noopener,noreferrer')
  }

  const steps = useMemo(() => {
    if (context.isInApp) {
      return [
        {
          text: t('home.installStepOpenBrowser'),
          icon: <ExternalLinkIcon size={18} color="var(--primary-bright)" />,
        },
      ]
    }

    if (context.isIos) {
      if (context.browser === 'chrome') {
        return [
          {
            text: t('home.installStepChromeIosShare'),
            icon: <ShareIcon size={18} color="var(--primary-bright)" />,
          },
          {
            text: t('home.installStepSafariHome'),
            icon: <AddToHomeScreenIcon size={18} color="var(--primary-bright)" />,
          },
          {
            text: t('home.installStepConfirmAdd'),
            icon: <CheckCircleIcon size={17} color="#10B981" />,
          },
        ]
      }
      if (context.browser === 'yandex') {
        return [
          {
            text: t('home.installStepYandexMenu'),
            icon: <MenuDotsIcon size={18} color="var(--primary-bright)" />,
          },
          {
            text: t('home.installStepYandexHome'),
            icon: <AddToHomeScreenIcon size={18} color="var(--primary-bright)" />,
          },
          {
            text: t('home.installStepConfirmAdd'),
            icon: <CheckCircleIcon size={17} color="#10B981" />,
          },
        ]
      }
      // Safari default
      return [
        {
          text: t('home.installStepSafariShare'),
          icon: <ShareIcon size={18} color="var(--primary-bright)" />,
        },
        {
          text: t('home.installStepSafariHome'),
          icon: <AddToHomeScreenIcon size={18} color="var(--primary-bright)" />,
        },
        {
          text: t('home.installStepConfirmAdd'),
          icon: <CheckCircleIcon size={17} color="#10B981" />,
        },
      ]
    }

    // Android / other browsers
    if (context.browser === 'samsung') {
      return [
        {
          text: t('home.installStepSamsungMenu'),
          icon: <MenuBarsIcon size={18} color="var(--primary-bright)" />,
        },
        {
          text: t('home.installStepSamsungHome'),
          icon: <AddToHomeScreenIcon size={18} color="var(--primary-bright)" />,
        },
        {
          text: t('home.installStepConfirmAdd'),
          icon: <CheckCircleIcon size={17} color="#10B981" />,
        },
      ]
    }

    if (context.browser === 'yandex') {
      return [
        {
          text: t('home.installStepYandexMenu'),
          icon: <MenuDotsIcon size={18} color="var(--primary-bright)" />,
        },
        {
          text: t('home.installStepYandexHome'),
          icon: <AddToHomeScreenIcon size={18} color="var(--primary-bright)" />,
        },
        {
          text: t('home.installStepConfirmAdd'),
          icon: <CheckCircleIcon size={17} color="#10B981" />,
        },
      ]
    }

    if (context.browser === 'firefox') {
      return [
        {
          text: t('home.installStepFirefoxMenu'),
          icon: <MenuDotsIcon size={18} color="var(--primary-bright)" />,
        },
        {
          text: t('home.installStepFirefoxInstall'),
          icon: <InstallIcon size={18} color="var(--primary-bright)" />,
        },
        {
          text: t('home.installStepConfirmInstall'),
          icon: <CheckCircleIcon size={17} color="#10B981" />,
        },
      ]
    }

    if (!context.isAndroid && !context.isIos) {
      // Desktop
      return [
        {
          text: t('home.installStepDesktopAddress'),
          icon: <InstallIcon size={18} color="var(--primary-bright)" />,
        },
        {
          text: t('home.installStepConfirmInstall'),
          icon: <CheckCircleIcon size={17} color="#10B981" />,
        },
      ]
    }

    // Android Chrome default
    return [
      {
        text: t('home.installStepChromeMenu'),
        icon: <MenuDotsIcon size={18} color="var(--primary-bright)" />,
      },
      {
        text: t('home.installStepChromeInstall'),
        icon: <InstallIcon size={18} color="var(--primary-bright)" />,
      },
      {
        text: t('home.installStepConfirmInstall'),
        icon: <CheckCircleIcon size={17} color="#10B981" />,
      },
    ]
  }, [context, t])

  if (typeof document === 'undefined') return null

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
            transition={{ type: 'spring', damping: 30, stiffness: 340, mass: 0.8 }}
            style={{ willChange: 'transform' }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(_e, { offset, velocity }) => {
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

            {/* Minimalist Apple-style Header */}
            <div className="install-sheet__header">
              <div className="install-sheet__title-row">
                <h3 className="install-sheet__title">{t('home.installGuideTitle')}</h3>
                <span className="install-sheet__badge">{context.badgeLabel}</span>
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
              {/* Native 1-Click Install CTA when available on Android / Desktop */}
              {hasNativePrompt && !context.isIos && !context.isInApp && (
                <button
                  type="button"
                  className="install-sheet__cta"
                  onClick={handleNativeInstall}
                  disabled={promptBusy}
                >
                  <InstallIcon size={19} color="currentColor" />
                  <span>{t('home.installNativeCta')}</span>
                </button>
              )}

              {/* In-App Browser Notice */}
              {context.isInApp && (
                <div className="install-sheet__inapp-notice">
                  <span className="install-sheet__inapp-tag">{context.inAppName || 'In-App'}</span>
                  <p className="install-sheet__inapp-text">{t('home.installInAppNotice')}</p>
                </div>
              )}

              {/* Step by Step Guide with SVG icons */}
              <div className="install-sheet__steps-container">
                <ol className="install-sheet__steps">
                  {steps.map((step, i) => (
                    <li key={i} className="install-sheet__step">
                      <span className="install-sheet__step-num" aria-hidden="true">
                        {i + 1}
                      </span>
                      <span className="install-sheet__step-text">{step.text}</span>
                      <div className="install-sheet__step-icon" aria-hidden="true">
                        {step.icon}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Footer Section: Support & FAQ */}
              <div className="install-sheet__footer">
                <button
                  type="button"
                  className="install-sheet__support-btn"
                  onClick={handleSupport}
                >
                  <SupportIcon size={17} color="var(--primary-bright)" />
                  <span>{t('home.installSupportCta')}</span>
                </button>

                <div className="install-sheet__faq">
                  <button
                    type="button"
                    className="install-sheet__faq-toggle"
                    onClick={() => setFaqOpen(!faqOpen)}
                    aria-expanded={faqOpen}
                  >
                    <span>{t('home.installFaqTitle')}</span>
                    <span
                      style={{
                        transform: faqOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                        display: 'inline-flex',
                      }}
                    >
                      <ChevronDownIcon size={15} />
                    </span>
                  </button>

                  <AnimatePresence>
                    {faqOpen && (
                      <motion.div
                        className="install-sheet__faq-body"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <p>{t('home.installFaqAnswer')}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
