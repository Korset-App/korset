import { useI18n } from '../i18n/index.js'

// ─── Display name maps (inline to keep component self-contained) ─────────────

const ALLERGEN_NAMES = {
  ru: {
    milk: 'Молоко',
    eggs: 'Яйца',
    gluten: 'Глютен',
    nuts: 'Орехи',
    peanuts: 'Арахис',
    soy: 'Соя',
    fish: 'Рыба',
    shellfish: 'Морепродукты',
    sesame: 'Кунжут',
    honey: 'Мёд',
  },
  kz: {
    milk: 'Сүт',
    eggs: 'Жұмыртқа',
    gluten: 'Глютен',
    nuts: 'Жаңғақ',
    peanuts: 'Жержаңғақ',
    soy: 'Соя',
    fish: 'Балық',
    shellfish: 'Теңіз өнімдері',
    sesame: 'Күнжіт',
    honey: 'Бал',
  },
}

const DIET_NAMES = {
  ru: {
    sugar_free: 'Без сахара',
    dairy_free: 'Без лактозы',
    gluten_free: 'Без глютена',
    vegan: 'Веган',
    vegetarian: 'Вегетариан',
    keto: 'Кето',
    kid_friendly: 'Для детей',
    halal: 'Халал',
  },
  kz: {
    sugar_free: 'Қантсыз',
    dairy_free: 'Лактозасыз',
    gluten_free: 'Глютенсіз',
    vegan: 'Веган',
    vegetarian: 'Вегетариан',
    keto: 'Кето',
    kid_friendly: 'Балаларға',
    halal: 'Халал',
  },
}

function formatList(ids, nameMap, lang) {
  if (!ids || ids.length === 0) return null
  return ids.map((id) => nameMap[lang]?.[id] || nameMap.ru?.[id] || id).join(', ')
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DiffRow({ label, localValue, cloudValue }) {
  const { t } = useI18n()
  const emptyText = t('settings.syncResolve.emptyText')
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--text-disabled)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 7,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        <div
          style={{
            background: 'var(--glass-subtle)',
            border: '1px solid var(--glass-soft-border)',
            borderRadius: 10,
            padding: '10px 11px',
          }}
        >
          <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginBottom: 5 }}>
            📱 {t('settings.syncResolve.onDevice')}
          </div>
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.4,
              color: localValue ? 'var(--text)' : 'var(--text-disabled)',
              fontStyle: localValue ? 'normal' : 'italic',
            }}
          >
            {localValue || emptyText}
          </div>
        </div>
        <div
          style={{
            background: 'rgba(124,58,237,0.07)',
            border: '1px solid rgba(124,58,237,0.18)',
            borderRadius: 10,
            padding: '10px 11px',
          }}
        >
          <div style={{ fontSize: 10, color: 'var(--primary)', opacity: 0.6, marginBottom: 5 }}>
            ☁️ {t('settings.syncResolve.inAccount')}
          </div>
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.4,
              color: cloudValue ? 'var(--primary)' : 'var(--text-disabled)',
              fontStyle: cloudValue ? 'normal' : 'italic',
            }}
          >
            {cloudValue || emptyText}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SyncResolveModal({ conflict, loading, onResolve, onDismiss }) {
  const { t, lang } = useI18n()
  const { local, cloud } = conflict

  // Compute which fields actually differ
  const allergensLocal = formatList(local.allergens, ALLERGEN_NAMES, lang)
  const allergensCloud = formatList(cloud.allergens, ALLERGEN_NAMES, lang)
  const allergensDiffer = allergensLocal !== allergensCloud

  const dietLocal = formatList(local.dietGoals, DIET_NAMES, lang)
  const dietCloud = formatList(cloud.dietGoals, DIET_NAMES, lang)
  const dietDiffer = dietLocal !== dietCloud

  const customLocal = local.customAllergens?.length > 0 ? local.customAllergens.join(', ') : null
  const customCloud = cloud.customAllergens?.length > 0 ? cloud.customAllergens.join(', ') : null
  const customDiffer = customLocal !== customCloud

  const halalDiffer = Boolean(local.halal) !== Boolean(cloud.halal)

  const btnBase = {
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.55 : 1,
    transition: 'opacity 0.15s, transform 0.12s',
    fontFamily: 'inherit',
  }

  return (
    <>
      <style>{`
        @keyframes srBackdrop { from { opacity: 0 } to { opacity: 1 } }
        @keyframes srCard { from { opacity: 0; transform: translateY(40px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
        .sr-btn-secondary:active { transform: scale(0.97) }
        .sr-btn-primary:active { transform: scale(0.98) }
      `}</style>

      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9000,
          background: 'var(--overlay-bg)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          animation: 'srBackdrop 0.22s ease both',
        }}
        onClick={onDismiss}
      >
        {/* Modal Card — stop click propagation so clicking inside doesn't close */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 520,
            background: 'linear-gradient(170deg, var(--bg-card) 0%, var(--bg-surface) 100%)',
            border: '1px solid var(--glass-border)',
            borderBottom: 'none',
            borderRadius: '24px 24px 0 0',
            padding: '10px 22px 32px',
            paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom) + 16px))',
            maxHeight: '92vh',
            overflowY: 'auto',
            animation: 'srCard 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
            boxShadow: 'var(--shadow-soft), 0 -1px 0 var(--glass-border)',
          }}
        >
          {/* Drag handle */}
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: 'var(--glass-handle)',
              margin: '10px auto 22px',
            }}
          />

          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(234,179,8,0.16), rgba(234,179,8,0.06))',
                  border: '1px solid rgba(234,179,8,0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}
              >
                ⚖️
              </div>
              <div>
                <div
                  style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}
                >
                  {t('settings.syncResolve.title')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  {t('settings.syncResolve.subtitle')}
                </div>
              </div>
            </div>
            {/* Dismiss X */}
            <button
              onClick={onDismiss}
              style={{
                ...btnBase,
                width: 32,
                height: 32,
                borderRadius: 8,
                flexShrink: 0,
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label={t('common.close')}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--text-sub)',
              margin: '0 0 18px',
              padding: '12px 14px',
              background: 'var(--glass-bg)',
              borderRadius: 12,
              border: '1px solid var(--glass-border)',
            }}
          >
            {t('settings.syncResolve.description')}
          </p>

          {/* Diff rows — only show fields that actually differ */}
          <div style={{ marginBottom: 20 }}>
            {allergensDiffer && (
              <DiffRow
                label={t('settings.syncResolve.allergens')}
                localValue={allergensLocal}
                cloudValue={allergensCloud}
              />
            )}
            {dietDiffer && (
              <DiffRow
                label={t('settings.syncResolve.preferences')}
                localValue={dietLocal}
                cloudValue={dietCloud}
              />
            )}
            {customDiffer && (
              <DiffRow
                label={t('settings.syncResolve.customExclusions')}
                localValue={customLocal}
                cloudValue={customCloud}
              />
            )}
            {halalDiffer && (
              <DiffRow
                label={t('settings.syncResolve.halalOnly')}
                localValue={local.halal ? t('settings.syncResolve.halalYes') : null}
                cloudValue={cloud.halal ? t('settings.syncResolve.halalYes') : null}
              />
            )}
          </div>

          {/* ─── Action buttons ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {/* Primary: Merge (recommended) */}
            <button
              className="sr-btn-primary"
              onClick={() => onResolve('merge')}
              disabled={loading}
              style={{
                ...btnBase,
                width: '100%',
                height: 54,
                borderRadius: 16,
                background: loading
                  ? 'rgba(124,58,237,0.4)'
                  : 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                color: 'var(--text-inverse)',
                fontSize: 15,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: loading ? 'none' : '0 8px 28px rgba(124,58,237,0.35)',
              }}
            >
              {loading ? (
                <>
                  <span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>
                    ⏳
                  </span>{' '}
                  {t('settings.syncResolve.saving')}
                </>
              ) : (
                <>
                  <span>🔀</span> {t('settings.syncResolve.merge')}
                </>
              )}
            </button>

            {/* Secondary row: Cloud / Local */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                className="sr-btn-secondary"
                onClick={() => onResolve('cloud')}
                disabled={loading}
                style={{
                  ...btnBase,
                  height: 48,
                  borderRadius: 14,
                  background: 'var(--glass-subtle)',
                  border: '1px solid var(--glass-soft-border)',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                ☁️ {t('settings.syncResolve.fromAccount')}
              </button>
              <button
                className="sr-btn-secondary"
                onClick={() => onResolve('local')}
                disabled={loading}
                style={{
                  ...btnBase,
                  height: 48,
                  borderRadius: 14,
                  background: 'var(--glass-subtle)',
                  border: '1px solid var(--glass-soft-border)',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                📱 {t('settings.syncResolve.fromDevice')}
              </button>
            </div>

            {/* Dismiss / Later */}
            <button
              onClick={onDismiss}
              disabled={loading}
              style={{
                ...btnBase,
                background: 'none',
                border: 'none',
                color: 'var(--text-disabled)',
                fontSize: 13,
                padding: '6px 0',
                textAlign: 'center',
                width: '100%',
              }}
            >
              {t('settings.syncResolve.later')}
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    </>
  )
}
