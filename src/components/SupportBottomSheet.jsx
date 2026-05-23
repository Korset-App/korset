// SupportBottomSheet — минималистичная стильная шторка с кнопкой Telegram.
// Telegram-ссылка: заглушка, замените на реальный бот-адрес.
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../i18n/index.js'

const TELEGRAM_URL = 'https://t.me/korset_support'

export default function SupportBottomSheet({ open, onClose }) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)

  // Prevent background scrolling when sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      setMounted(true)
    } else {
      document.body.style.overflow = ''
      setMounted(false)
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleTelegram = () => {
    window.open(TELEGRAM_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="button"
            tabIndex={-1}
            aria-label={t('common.close')}
            onClick={onClose}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 300,
              background: 'rgba(4,6,14,0.7)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = offset.y > 100 || velocity.y > 500
              if (swipe) onClose()
            }}
            role="dialog"
            aria-modal="true"
            aria-label={t('common.feedback')}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 301,
              background: 'var(--bg-card)',
              borderTop: '1px solid var(--glass-border)',
              borderRadius: '22px 22px 0 0',
              padding: '8px 24px calc(32px + env(safe-area-inset-bottom))',
            }}
          >
            {/* Drag handle */}
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 999,
                background: 'var(--glass-soft-border)',
                margin: '12px auto 28px',
              }}
            />

            {/* Telegram brand icon */}
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 20,
                background: 'linear-gradient(135deg, #2AABEE, #229ED9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 28px rgba(42,171,238,0.28)',
              }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </div>

            {/* Title */}
            <div
              style={{
                textAlign: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                color: 'var(--text)',
                marginBottom: 8,
              }}
            >
              Поддержка Körset
            </div>

            {/* Subtitle */}
            <div
              style={{
                textAlign: 'center',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                lineHeight: 1.65,
                color: 'var(--text-sub)',
                marginBottom: 28,
                padding: '0 12px',
              }}
            >
              Наша команда готова помочь с любым вопросом. Напишите нам — мы отвечаем в течение
              нескольких часов.
            </div>

            {/* Telegram CTA */}
            <button
              type="button"
              id="support-telegram-btn"
              onClick={handleTelegram}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: 16,
                border: 'none',
                background: '#2AABEE',
                color: 'var(--text-inverse)',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 4px 20px rgba(42,171,238,0.22)',
                marginBottom: 12,
                transition: 'opacity 0.15s ease',
              }}
              onMouseDown={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseUp={(e) => (e.currentTarget.style.opacity = '1')}
              onTouchStart={(e) => (e.currentTarget.style.opacity = '0.85')}
              onTouchEnd={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Написать в Telegram
            </button>

            {/* Cancel */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 16,
                border: '1px solid var(--glass-soft-border)',
                background: 'transparent',
                color: 'var(--text-sub)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              Отмена
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
