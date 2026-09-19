import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { TrashIcon } from './icons/index.js'

/**
 * ConfirmDangerModal — destructive action confirmation modal
 * User must type the exact confirmWord to enable the action button.
 *
 * Props:
 *   open          {boolean}
 *   title         {string}
 *   description   {string}
 *   confirmWord   {string} — word user must type (e.g. "СБРОС")
 *   confirmLabel  {string} — button label
 *   cancelLabel   {string}
 *   onConfirm     {() => void}
 *   onCancel      {() => void}
 *   loading       {boolean}
 */
export default function ConfirmDangerModal({
  open,
  title,
  description,
  confirmWord = 'СБРОС',
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  onConfirm,
  onCancel,
  loading = false,
}) {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (open) setTyped('')
  }, [open])

  if (!open) return null

  const matched = typed.trim().toUpperCase() === confirmWord.toUpperCase()

  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--overlay-bg)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 0 env(safe-area-inset-bottom)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'linear-gradient(160deg, var(--bg-card) 0%, var(--bg-surface) 100%)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '20px 20px 0 0',
          padding: '8px 0 0',
          boxShadow: '0 -8px 40px rgba(239,68,68,0.12)',
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: 'var(--glass-handle)',
            margin: '0 auto 20px',
          }}
        />

        <div style={{ padding: '0 20px 24px' }}>
          {/* Icon + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <TrashIcon size={22} color="#EF4444" />
            </div>
            <div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--text)',
                  lineHeight: 1.3,
                }}
              >
                {title}
              </div>
            </div>
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-sub)',
              lineHeight: 1.55,
              margin: '0 0 20px',
            }}
          >
            {description}
          </p>

          {/* Confirm word hint */}
          <div
            style={{
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.18)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
              Для подтверждения введите:{' '}
              <span
                style={{
                  color: '#EF4444',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  letterSpacing: 1,
                }}
              >
                {confirmWord}
              </span>
            </div>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmWord}
              autoComplete="off"
              spellCheck={false}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: `1px solid ${matched ? 'rgba(239,68,68,0.6)' : 'var(--input-border)'}`,
                color: matched ? '#EF4444' : 'var(--text)',
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: 'monospace',
                letterSpacing: 1,
                outline: 'none',
                transition: 'border-color 0.2s, color 0.2s',
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              onClick={onCancel}
              disabled={loading}
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
                fontFamily: 'var(--font-body)',
              }}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={!matched || loading}
              style={{
                flex: 1,
                padding: '13px 16px',
                borderRadius: 12,
                border: 'none',
                background: matched && !loading ? 'rgba(239,68,68,0.85)' : 'rgba(239,68,68,0.2)',
                color: matched && !loading ? '#fff' : 'var(--text-dim)',
                fontSize: 15,
                fontWeight: 700,
                cursor: matched && !loading ? 'pointer' : 'default',
                fontFamily: 'var(--font-body)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {loading ? (
                <>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}
                  >
                    progress_activity
                  </span>
                  Удаляем...
                </>
              ) : (
                <>
                  <TrashIcon size={16} />
                  {confirmLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
