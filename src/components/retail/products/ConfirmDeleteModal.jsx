import { createPortal } from 'react-dom'
import { TrashIcon } from '../../icons/index.js'
import { displayName } from './productHelpers.js'

export default function ConfirmDeleteModal({ product, tr, deleteMutation, onClose }) {
  if (!product) return null
  const name = displayName(product)

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9995,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'linear-gradient(180deg, #1a1c33 0%, #111320 100%)',
          borderRadius: 20,
          padding: '24px 20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(239,68,68,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <TrashIcon size={22} color="#F87171" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {tr.deleteProduct}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
              {tr.deleteHint}
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 13,
            color: 'var(--text-sub)',
            background: 'var(--glass-subtle)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 20,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 12,
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-bg)',
              color: 'var(--text-sub)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            {tr.deleteCancel}
          </button>
          <button
            onClick={() => {
              if (!product.sync_integration_id) deleteMutation.mutate({ id: product.id })
            }}
            disabled={deleteMutation.isPending || Boolean(product.sync_integration_id)}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 12,
              border: 'none',
              background: deleteMutation.isPending ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.85)',
              color: 'var(--text-inverse)',
              fontSize: 14,
              fontWeight: 700,
              cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            {deleteMutation.isPending ? '...' : tr.deleteConfirm}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
