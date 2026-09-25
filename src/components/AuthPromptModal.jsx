import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { buildAuthNavigateState } from '../utils/authFlow.js'
import { useI18n } from '../i18n/index.js'
import { useOverlayLock } from '../hooks/useOverlayLock.js'

/**
 * AuthPromptModal — non-destructive bottom-sheet modal that nudges a guest
 * user to sign in or sign up. Used wherever an action requires an account
 * (banner / avatar / name on the Profile screen, etc.).
 *
 * Design choices:
 *   • Bottom sheet pattern matches ConfirmDangerModal so the visual language
 *     of the app stays consistent.
 *   • All colours come from theme vars so it looks correct in both light
 *     and dark themes (avoids the "elements blend into background" issue
 *     that hard-coded white/dark values cause).
 *   • Renders via React portal into document.body so it is never clipped
 *     by ancestor overflow / transform / filter contexts.
 *   • Closing on backdrop click, Esc key press, or the explicit Cancel
 *     button — standard expected behaviour for a serious-product modal.
 *   • Body scroll is locked while the modal is open so background content
 *     doesn't shift on iOS Safari.
 *
 * Props:
 *   open         {boolean}
 *   onClose      {() => void}
 *   title        {string}      — optional, defaults to a sensible i18n string
 *   description  {string}      — optional, defaults to a sensible i18n string
 */
export default function AuthPromptModal({ open, onClose, title, description }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()

  // Close on Escape key — standard accessibility behaviour for modals.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock background scroll while open. Ref-counted in the hook, so stacked
  // overlays never unlock each other early.
  useOverlayLock(open)

  if (!open) return null

  const goAuth = () => {
    onClose?.()
    navigate('/auth', {
      state: buildAuthNavigateState(location, {
        reason: 'profile_required',
        message: t('profile.authRequiredMsg'),
      }),
    })
  }

  return createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-prompt-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--overlay-bg, rgba(0,0,0,0.55))',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 0 env(safe-area-inset-bottom)',
        animation: 'auth-prompt-fade 0.18s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'linear-gradient(160deg, var(--bg-card) 0%, var(--bg-surface) 100%)',
          border: '1px solid var(--glass-border)',
          borderBottom: 'none',
          borderRadius: '20px 20px 0 0',
          padding: '8px 0 0',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
          animation: 'auth-prompt-slide 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: 'var(--glass-handle, var(--glass-border))',
            margin: '0 auto 20px',
          }}
        />

        <div style={{ padding: '0 20px 24px' }}>
          {/* Icon + Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(167,139,250,0.32)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#A78BFA',
              }}
              aria-hidden="true"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <div
              id="auth-prompt-title"
              style={{
                fontSize: 17,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: 'var(--text)',
                lineHeight: 1.3,
              }}
            >
              {title || t('profile.authPromptTitle')}
            </div>
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-sub)',
              lineHeight: 1.55,
              margin: '0 0 22px',
            }}
          >
            {description || t('profile.authPromptDesc')}
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '13px 16px',
                borderRadius: 12,
                border: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                color: 'var(--text-sub)',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body, var(--font-display))',
              }}
            >
              {t('profile.authPromptCancel')}
            </button>
            <button
              type="button"
              onClick={goAuth}
              style={{
                flex: 1.4,
                padding: '13px 16px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font-body, var(--font-display))',
                boxShadow: '0 6px 18px rgba(124,58,237,0.32)',
              }}
            >
              {t('profile.authPromptConfirm')}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes auth-prompt-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes auth-prompt-slide {
          from { transform: translateY(40px); opacity: 0.6; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  )
}
