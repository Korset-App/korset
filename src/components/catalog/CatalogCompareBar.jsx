import { memo } from 'react'
import { CompareIcon } from '../icons/CompareIcon.jsx'
import { CloseIcon } from '../icons/index.js'
import { getLocalName } from '../../utils/localName.js'

function CatalogCompareBarComponent({ comparePin, onClearPin, t }) {
  if (!comparePin) return null

  return (
    <div
      style={{
        margin: '0 20px 10px',
        padding: '12px 14px',
        borderRadius: 16,
        background: 'var(--badge-bg)',
        border: '1.5px solid var(--badge-border)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        animation: 'compareBarIn 0.25s ease',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 20, color: 'var(--primary-bright)', flexShrink: 0 }}>
        <CompareIcon size={20} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: 'var(--primary-bright)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: 2,
          }}
        >
          {t('compare.modeBanner')}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text)',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {getLocalName(comparePin)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 1 }}>
          {t('compare.selectSecond')}
        </div>
      </div>
      <button
        type="button"
        onClick={onClearPin}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        aria-label={t('common.close') || 'Закрыть'}
      >
        <CloseIcon size={20} color="var(--primary-bright)" />
      </button>
    </div>
  )
}

export const CatalogCompareBar = memo(CatalogCompareBarComponent)
