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
  TelegramIcon,
  CheckCircleIcon,
  ChevronDownIcon,
} from '../icons/index.js'
import { detectBrowserContext } from '../../utils/browserDetection.js'
import './InstallAppSheet.css'

const TELEGRAM_URL = 'https://t.me/korset_support_bot'

// All step icons share the same style: stroke-based, var(--primary-bright) color
// The final "confirm" step always uses CheckCircleIcon with var(--success) color
const ICON_SIZE = 18
const ICON_COLOR = 'var(--primary-bright)'
const ICON_COLOR_OK = 'var(--success, #16a34a)'

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

  // Step definitions per browser context.
  // Rules:
  //  - If hasNativePrompt: show the native CTA button instead of manual steps
  //    (Chrome, Samsung, Opera, Edge on Android all fire beforeinstallprompt)
  //  - iOS: always manual (OS-level restriction)
  //  - Firefox Android: manual steps — accurate as of Firefox 120+
  //  - Yandex, Xiaomi: manual steps with their menu patterns
  //  - In-App WebView: guide to open in real browser first
  const steps = useMemo(() => {
    if (context.isInApp) {
      return [
        {
          text: t('home.installStepOpenBrowser'),
          icon: <ExternalLinkIcon size={ICON_SIZE} color={ICON_COLOR} />,
        },
        {
          text: t('home.installStepOpenBrowserThen'),
          icon: <InstallIcon size={ICON_SIZE} color={ICON_COLOR} />,
        },
      ]
    }

    if (context.isIos) {
      if (context.browser === 'chrome') {
        return [
          {
            text: t('home.installStepChromeIosShare'),
            icon: <ShareIcon size={ICON_SIZE} color={ICON_COLOR} />,
          },
          {
            text: t('home.installStepSafariHome'),
            icon: <AddToHomeScreenIcon size={ICON_SIZE} color={ICON_COLOR} />,
          },
          {
            text: t('home.installStepConfirmAdd'),
            icon: <CheckCircleIcon size={ICON_SIZE} color={ICON_COLOR_OK} />,
          },
        ]
      }
      if (context.browser === 'yandex') {
        return [
          {
            text: t('home.installStepYandexIosMenu'),
            icon: <MenuDotsIcon size={ICON_SIZE} color={ICON_COLOR} />,
          },
          {
            text: t('home.installStepYandexHome'),
            icon: <AddToHomeScreenIcon size={ICON_SIZE} color={ICON_COLOR} />,
          },
          {
            text: t('home.installStepConfirmAdd'),
            icon: <CheckCircleIcon size={ICON_SIZE} color={ICON_COLOR_OK} />,
          },
        ]
      }
      // iOS Safari (default)
      return [
        {
          text: t('home.installStepSafariShare'),
          icon: <ShareIcon size={ICON_SIZE} color={ICON_COLOR} />,
        },
        {
          text: t('home.installStepSafariHome'),
          icon: <AddToHomeScreenIcon size={ICON_SIZE} color={ICON_COLOR} />,
        },
        {
          text: t('home.installStepConfirmAdd'),
          icon: <CheckCircleIcon size={ICON_SIZE} color={ICON_COLOR_OK} />,
        },
      ]
    }

    // Android / Desktop — if we have the native prompt we'll show the CTA button above,
    // but still build fallback steps for browsers that don't fire beforeinstallprompt.
    if (context.browser === 'firefox') {
      // Firefox for Android: does NOT fire beforeinstallprompt.
      // Menu path: ⋮ → Ещё → «Добавить на главный экран» / «Добавить приложение»
      // Last step: browser shows a permission dialog — tap «Разрешить»
      return [
        {
          text: t('home.installStepFirefoxMenu'),
          icon: <MenuDotsIcon size={ICON_SIZE} color={ICON_COLOR} />,
        },
        {
          text: t('home.installStepFirefoxMore'),
          icon: <MenuDotsIcon size={ICON_SIZE} color={ICON_COLOR} />,
        },
        {
          text: t('home.installStepFirefoxAdd'),
          icon: <AddToHomeScreenIcon size={ICON_SIZE} color={ICON_COLOR} />,
        },
        {
          text: t('home.installStepFirefoxAllow'),
          icon: <CheckCircleIcon size={ICON_SIZE} color={ICON_COLOR_OK} />,
        },
      ]
    }

    if (context.browser === 'yandex') {
      return [
        {
          text: t('home.installStepYandexMenu'),
          icon: <MenuDotsIcon size={ICON_SIZE} color={ICON_COLOR} />,
        },
        {
          text: t('home.installStepYandexHome'),
          icon: <AddToHomeScreenIcon size={ICON_SIZE} color={ICON_COLOR} />,
        },
        {
          text: t('home.installStepConfirmAdd'),
          icon: <CheckCircleIcon size={ICON_SIZE} color={ICON_COLOR_OK} />,
        },
      ]
    }

    if (context.browser === 'xiaomi') {
      return [
        {
          text: t('home.installStepXiaomiMenu'),
          icon: <MenuDotsIcon size={ICON_SIZE} color={ICON_COLOR} />,
        },
        {
          text: t('home.installStepXiaomiHome'),
          icon: <AddToHomeScreenIcon size={ICON_SIZE} color={ICON_COLOR} />,
        },
        {
          text: t('home.installStepConfirmAdd'),
          icon: <CheckCircleIcon size={ICON_SIZE} color={ICON_COLOR_OK} />,
        },
      ]
    }

    if (!context.isAndroid && !context.isIos) {
      // Desktop Chrome / Edge
      return [
        {
          text: t('home.installStepDesktopAddress'),
          icon: <InstallIcon size={ICON_SIZE} color={ICON_COLOR} />,
        },
        {
          text: t('home.installStepConfirmInstall'),
          icon: <CheckCircleIcon size={ICON_SIZE} color={ICON_COLOR_OK} />,
        },
      ]
    }

    // Android Chrome, Samsung, Opera, Edge — these fire beforeinstallprompt,
    // but we show manual steps as fallback if the prompt wasn't captured.
    return [
      {
        text: t('home.installStepChromeMenu'),
        icon: <MenuDotsIcon size={ICON_SIZE} color={ICON_COLOR} />,
      },
      {
        text: t('home.installStepChromeInstall'),
        icon: <AddToHomeScreenIcon size={ICON_SIZE} color={ICON_COLOR} />,
      },
      {
        text: t('home.installStepConfirmInstall'),
        icon: <CheckCircleIcon size={ICON_SIZE} color={ICON_COLOR_OK} />,
      },
    ]
  }, [context, t])

  // On Android browsers that support beforeinstallprompt: show only the CTA button, no steps.
  // On browsers that don't (iOS, Firefox, Yandex, Xiaomi, In-App): always show steps.
  const showSteps = !hasNativePrompt || !context.canNativeInstall || context.isInApp

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

            {/* Header: title + browser badge + close */}
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
              {/* Native 1-Click Install CTA */}
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

              {/* In-App Browser Warning */}
              {context.isInApp && (
                <div className="install-sheet__inapp-notice">
                  <span className="install-sheet__inapp-tag">{context.inAppName || 'In-App'}</span>
                  <p className="install-sheet__inapp-text">{t('home.installInAppNotice')}</p>
                </div>
              )}

              {/* Step-by-Step Guide */}
              {showSteps && (
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
              )}

              {/* Footer: Telegram Support + FAQ */}
              <div className="install-sheet__footer">
                <button
                  type="button"
                  className="install-sheet__support-btn"
                  onClick={handleSupport}
                >
                  <TelegramIcon size={17} color="var(--primary-bright)" />
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
