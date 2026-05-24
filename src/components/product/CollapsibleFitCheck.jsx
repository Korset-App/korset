import { useState } from 'react'
import { useI18n } from '../../i18n/index.js'

const SEVERITY_STYLES = {
  danger: { color: '#EF4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.30)' },
  warning: { color: '#F97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.30)' },
  caution: { color: '#FBBF24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.30)' },
  safe: { color: '#10B981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.30)' },
}

function severityTitle(key, t) {
  const map = {
    danger: t('product.severityDanger'),
    warning: t('product.severityWarning'),
    caution: t('product.severityCaution'),
    safe: t('product.severitySafe'),
  }
  return map[key] || key
}

export default function CollapsibleFitCheck({ severityKey, reasons }) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const s = SEVERITY_STYLES[severityKey]
  const canExpand = reasons.length > 0 && severityKey !== 'safe'

  return (
    <button
      onClick={() => canExpand && setExpanded((x) => !x)}
      disabled={!canExpand}
      style={{
        width: '100%',
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 16,
        padding: '14px 16px',
        cursor: canExpand ? 'pointer' : 'default',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: expanded ? 12 : 0,
        transition: 'gap 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: s.color,
            color: 'var(--text-inverse)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 4px 12px ${s.color}50`,
          }}
        >
          {severityKey === 'safe' && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          )}
          {severityKey === 'caution' && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {severityKey === 'warning' && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
          {severityKey === 'danger' && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="9.5" y1="9.5" x2="14.5" y2="14.5" />
              <line x1="14.5" y1="9.5" x2="9.5" y2="14.5" />
            </svg>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: s.color,
              fontFamily: 'var(--font-display)',
              lineHeight: 1.15,
            }}
          >
            {severityTitle(severityKey, t)}
          </div>
          {canExpand && !expanded && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-faint)',
                marginTop: 2,
                letterSpacing: '0.02em',
              }}
            >
              {reasons.length}{' '}
              {reasons.length === 1 ? t('product.reason') : t('product.reasonsFew')} —{' '}
              {t('product.reasonsClick')}
            </div>
          )}
        </div>
        {canExpand && (
          <div
            style={{
              color: s.color,
              flexShrink: 0,
              transition: 'transform 0.2s',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        )}
      </div>
      {expanded && canExpand && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            paddingLeft: 48,
            borderTop: `1px solid ${s.border}`,
            marginTop: 4,
            paddingTop: 12,
          }}
        >
          {reasons.map((r, i) => {
            const reasonKey = r.severity || r.type
            const rColor = SEVERITY_STYLES[reasonKey]?.color || 'var(--text-soft)'
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  fontSize: 13,
                  color: 'var(--text-soft)',
                  lineHeight: 1.4,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: rColor,
                    marginTop: 6,
                    flexShrink: 0,
                    boxShadow: `0 0 6px ${rColor}`,
                  }}
                />
                <span>{r.text}</span>
              </div>
            )
          })}
        </div>
      )}
    </button>
  )
}
