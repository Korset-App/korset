import { DietIcon } from '../../screens/ProfileScreen.jsx'
import { DIET_PREFERENCES } from '../../constants/dietGoals.js'

const DIET_BADGE_COLORS = {
  halal: '#10B981',
  sugar_free: '#8B5CF6',
  lactose_free: '#06B6D4',
  gluten_free: '#F59E0B',
  vegan: '#10B981',
  vegetarian: '#22C55E',
  keto: '#EC4899',
  kid_friendly: '#3B82F6',
}

const BADGE_KEYS = ['halal', 'sugar_free', 'gluten_free', 'lactose_free', 'vegan']

function matchBadge(key, product) {
  const diet = product.dietTags || []
  if (key === 'halal') return product.halalStatus === 'yes' || product.halal === 'yes'
  return diet.includes(key)
}

export default function DietBadges({ product, lang }) {
  const badges = BADGE_KEYS.map((id) => {
    const pref = DIET_PREFERENCES.find((p) => p.id === id)
    if (!pref) return null
    return {
      id,
      iconName: pref.icon,
      label: pref.label[lang] || pref.label.ru,
      color: DIET_BADGE_COLORS[id] || '#8B5CF6',
      matched: matchBadge(id, product),
    }
  }).filter(Boolean)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${badges.length}, 1fr)`,
        gap: 8,
      }}
    >
      {badges.map((b) => (
        <div
          key={b.id}
          style={{
            aspectRatio: '1 / 1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            borderRadius: 14,
            background: b.matched ? `${b.color}14` : 'var(--glass-subtle)',
            border: `1px solid ${b.matched ? `${b.color}38` : 'var(--glass-soft-border)'}`,
            color: b.matched ? b.color : 'var(--text-disabled)',
            opacity: b.matched ? 1 : 0.5,
            transition: 'all 0.2s',
          }}
        >
          <DietIcon name={b.iconName} size={22} />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.02em',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            {b.label}
          </span>
        </div>
      ))}
    </div>
  )
}
