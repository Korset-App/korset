import { useState, useMemo } from 'react'
import { useI18n } from '../../i18n/index.js'
import {
  resolveNutritionPortion,
  computePortionNutrition,
} from '../../domain/product/nutritionPortion.js'

function fmt(v) {
  if (v == null) return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function MacroRow({ label, value, color, unitLabel }) {
  return (
    <div
      style={{
        background: `${color}18`,
        border: `1px solid ${color}40`,
        borderRadius: 11,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: color,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 15,
          fontWeight: 900,
          color: 'var(--text)',
          fontFamily: 'var(--font-display)',
          lineHeight: 1,
          letterSpacing: '-0.01em',
        }}
      >
        {fmt(value)}
        <span style={{ fontSize: 10, color: 'var(--text-faint)', marginLeft: 2, fontWeight: 600 }}>
          {unitLabel || 'г'}
        </span>
      </span>
    </div>
  )
}

function ThreeStepRow({ label, value, unit, thresholds, thresholdValue, t }) {
  const [low, high] = thresholds
  const testVal = thresholdValue != null ? thresholdValue : value
  let activeIdx = 0
  if (testVal > high) activeIdx = 2
  else if (testVal > low) activeIdx = 1
  const statusLabel = [t('product.low'), t('product.medium'), t('product.high')][activeIdx]
  const colors = ['#10B981', '#F59E0B', '#EF4444']

  return (
    <>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-soft)' }}>{label}</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: i === activeIdx ? colors[i] : `${colors[i]}25`,
              boxShadow: i === activeIdx ? `0 0 8px ${colors[i]}70` : 'none',
              transition: 'all 0.2s',
            }}
          />
        ))}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: colors[activeIdx],
          textAlign: 'right',
          fontFamily: 'var(--font-display)',
          whiteSpace: 'nowrap',
        }}
      >
        {fmt(value)} {unit}
        <span
          style={{
            fontSize: 9,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            display: 'block',
            opacity: 0.85,
            lineHeight: 1,
          }}
        >
          {statusLabel}
        </span>
      </div>
    </>
  )
}

export default function NutritionUnified({ nutrition, product = null }) {
  const { t } = useI18n()
  const [mode, setMode] = useState('100')

  const portionInfo = useMemo(() => resolveNutritionPortion(product), [product])
  const canToggle = Boolean(portionInfo && !portionInfo.isExact100)

  const activeNutrition = useMemo(() => {
    return computePortionNutrition(nutrition, portionInfo, canToggle ? mode : '100')
  }, [nutrition, portionInfo, canToggle, mode])

  if (!activeNutrition) return null

  const kcal =
    activeNutrition.kcal ??
    activeNutrition.energy_kcal ??
    activeNutrition.energy_kcal_100g ??
    activeNutrition['energy-kcal_100g']
  const protein =
    activeNutrition.protein ?? activeNutrition.protein_100g ?? activeNutrition.proteins_100g
  const fat = activeNutrition.fat ?? activeNutrition.fat_100g
  const carbs = activeNutrition.carbs ?? activeNutrition.carbohydrates_100g
  const sugar = activeNutrition.sugar ?? activeNutrition.sugars_100g ?? activeNutrition.sugars
  const salt = activeNutrition.salt ?? activeNutrition.salt_100g

  const hasAny = [kcal, protein, fat, carbs, sugar, salt].some((v) => v != null)
  if (!hasAny) return null

  const hasSugarSalt = sugar != null || salt != null
  const KCAL_COLOR = '#A78BFA'
  const unitG = t('product.unitG') || 'г'

  // Concentration thresholds for sugar and salt use base per-100g/ml facts
  const base100 = activeNutrition._base100 || activeNutrition
  const sugarBase = base100.sugar ?? base100.sugars_100g ?? base100.sugars
  const saltBase = base100.salt ?? base100.salt_100g

  const per100Label = portionInfo?.isLiquid
    ? t('product.nutritionPer100ml')
    : t('product.nutritionPer100g')

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, var(--glass-muted) 0%, var(--glass-subtle) 100%)',
        border: '1px solid var(--glass-border)',
        borderRadius: 18,
        padding: 16,
      }}
    >
      {/* Minimalist Apple-style Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            color: 'var(--text)',
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}
        >
          {t('product.nutrition')}
          {!canToggle && ` · ${per100Label}`}
        </div>

        {canToggle && (
          <div
            role="tablist"
            aria-label={t('product.nutrition')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--glass-muted)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 2,
              gap: 2,
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === '100'}
              onClick={() => setMode('100')}
              style={{
                border: 'none',
                background: mode === '100' ? 'var(--primary)' : 'transparent',
                color: mode === '100' ? '#ffffff' : 'var(--text-soft)',
                fontSize: 11,
                fontWeight: mode === '100' ? 600 : 500,
                fontFamily: 'var(--font-display)',
                padding: '4px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background 0.16s ease, color 0.16s ease',
                whiteSpace: 'nowrap',
                lineHeight: 1.2,
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {per100Label}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'whole'}
              onClick={() => setMode('whole')}
              style={{
                border: 'none',
                background: mode === 'whole' ? 'var(--primary)' : 'transparent',
                color: mode === 'whole' ? '#ffffff' : 'var(--text-soft)',
                fontSize: 11,
                fontWeight: mode === 'whole' ? 600 : 500,
                fontFamily: 'var(--font-display)',
                padding: '4px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background 0.16s ease, color 0.16s ease',
                whiteSpace: 'nowrap',
                lineHeight: 1.2,
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {t('product.nutritionWholeWithAmount', { amount: portionInfo.displayAmount })}
            </button>
          </div>
        )}
      </div>

      {/* Clean organic Apple-style crossfade for values on switch */}
      <div key={mode} className="nutrition-unified__animated">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 1fr',
            gap: 10,
            marginBottom: hasSugarSalt ? 14 : 0,
          }}
        >
          <div
            style={{
              background: `linear-gradient(145deg, ${KCAL_COLOR}22 0%, ${KCAL_COLOR}08 100%)`,
              border: `1px solid ${KCAL_COLOR}44`,
              borderRadius: 14,
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `inset 0 0 22px ${KCAL_COLOR}15`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: KCAL_COLOR,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {t('product.energy')}
            </div>
            <div
              style={{
                fontSize: 42,
                fontWeight: 900,
                color: 'var(--text)',
                fontFamily: 'var(--font-display)',
                lineHeight: 1,
                letterSpacing: '-0.03em',
                textShadow: `0 0 24px ${KCAL_COLOR}50`,
              }}
            >
              {fmt(kcal)}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-faint)',
                marginTop: 4,
                letterSpacing: '0.04em',
              }}
            >
              {t('product.kcal')}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateRows: '1fr 1fr 1fr',
              gap: 6,
            }}
          >
            <MacroRow
              label={t('product.protein')}
              value={protein}
              color="#3B82F6"
              unitLabel={unitG}
            />
            <MacroRow label={t('product.fat')} value={fat} color="#F59E0B" unitLabel={unitG} />
            <MacroRow label={t('product.carbs')} value={carbs} color="#10B981" unitLabel={unitG} />
          </div>
        </div>

        {hasSugarSalt && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '64px 1fr 96px',
              rowGap: 10,
              columnGap: 10,
              alignItems: 'center',
              paddingTop: 14,
              borderTop: '1px solid var(--line-soft)',
            }}
          >
            {sugar != null && (
              <ThreeStepRow
                label={t('product.sugar')}
                value={sugar}
                unit={unitG}
                thresholds={[5, 22.5]}
                thresholdValue={sugarBase}
                t={t}
              />
            )}
            {salt != null && (
              <ThreeStepRow
                label={t('product.salt')}
                value={salt}
                unit={unitG}
                thresholds={[0.3, 1.5]}
                thresholdValue={saltBase}
                t={t}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
