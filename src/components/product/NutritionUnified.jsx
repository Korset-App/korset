import { useI18n } from '../../i18n/index.js'

function fmt(v) {
  if (v == null) return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function MacroRow({ label, value, color }) {
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
          г
        </span>
      </span>
    </div>
  )
}

function ThreeStepRow({ label, value, unit, thresholds, t }) {
  const [low, high] = thresholds
  let activeIdx = 0
  if (value > high) activeIdx = 2
  else if (value > low) activeIdx = 1
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

export default function NutritionUnified({ nutrition }) {
  const { t } = useI18n()
  if (!nutrition) return null
  const kcal =
    nutrition.kcal ??
    nutrition.energy_kcal ??
    nutrition.energy_kcal_100g ??
    nutrition['energy-kcal_100g']
  const protein = nutrition.protein ?? nutrition.protein_100g ?? nutrition.proteins_100g
  const fat = nutrition.fat ?? nutrition.fat_100g
  const carbs = nutrition.carbs ?? nutrition.carbohydrates_100g
  const sugar = nutrition.sugar ?? nutrition.sugars_100g ?? nutrition.sugars
  const salt = nutrition.salt ?? nutrition.salt_100g

  const hasAny = [kcal, protein, fat, carbs, sugar, salt].some((v) => v != null)
  if (!hasAny) return null

  const hasSugarSalt = sugar != null || salt != null
  const KCAL_COLOR = '#A78BFA'

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, var(--glass-muted) 0%, var(--glass-subtle) 100%)',
        border: '1px solid var(--glass-border)',
        borderRadius: 18,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        {t('product.nutrition')} · {t('product.nutritionPer100')}
      </div>

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
          <MacroRow label={t('product.protein')} value={protein} color="#3B82F6" />
          <MacroRow label={t('product.fat')} value={fat} color="#F59E0B" />
          <MacroRow label={t('product.carbs')} value={carbs} color="#10B981" />
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
              unit={t('product.unitG')}
              thresholds={[5, 22.5]}
              t={t}
            />
          )}
          {salt != null && (
            <ThreeStepRow
              label={t('product.salt')}
              value={salt}
              unit={t('product.unitG')}
              thresholds={[0.3, 1.5]}
              t={t}
            />
          )}
        </div>
      )}
    </div>
  )
}
