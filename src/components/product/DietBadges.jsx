import { useMemo } from 'react'
import { DietIcon } from '../icons/DietIcon.jsx'
import { DIET_PREFERENCES } from '../../constants/dietGoals.js'
import { extractDietTags, extractHalalFromName } from '../../domain/product/attributeExtractor.js'

const DIET_BADGE_COLORS = {
  halal: '#10B981',
  sugar_free: '#8B5CF6',
  lactose_free: '#06B6D4',
  gluten_free: '#F59E0B',
  vegan: '#10B981',
  vegetarian: '#22C55E',
  keto: '#EC4899',
  kid_friendly: '#3B82F6',
  low_fat: '#14B8A6',
}

const CORE_BADGE_KEYS = ['halal', 'sugar_free', 'gluten_free', 'lactose_free', 'vegan']
const EXTRA_BADGE_KEYS = ['keto', 'low_fat', 'kid_friendly', 'vegetarian']

export default function DietBadges({ product, lang }) {
  const { resolvedDietSet, isHalal } = useMemo(() => {
    if (!product) return { resolvedDietSet: new Set(), isHalal: false }
    const baseTags = Array.isArray(product.dietTags) ? product.dietTags : []
    const rawHalal = product.halalStatus || product.halal || 'unknown'
    const ingredients = product.ingredients || product.ingredients_raw || ''
    const nutriments = product.nutritionPer100 || product.nutriments || null
    const computedHalal = extractHalalFromName(product.name || '', rawHalal, ingredients)
    const computedTags = extractDietTags(product.name || '', baseTags, {
      category: product.category || '',
      ingredients,
      nutriments,
      halalStatus: computedHalal,
      allergens: product.allergens,
      traces: product.traces,
    })
    return {
      resolvedDietSet: new Set(computedTags),
      isHalal:
        computedHalal === 'yes' ||
        rawHalal === 'yes' ||
        rawHalal === 'verified' ||
        rawHalal === 'certified' ||
        computedTags.includes('halal'),
    }
  }, [product])

  const badges = useMemo(() => {
    const activeExtraKeys = EXTRA_BADGE_KEYS.filter((key) => resolvedDietSet.has(key))
    const allKeys = [...CORE_BADGE_KEYS, ...activeExtraKeys]
    return allKeys
      .map((id) => {
        const pref = DIET_PREFERENCES.find((p) => p.id === id)
        if (!pref) return null
        const matched = id === 'halal' ? isHalal : resolvedDietSet.has(id)
        return {
          id,
          iconName: pref.icon,
          label: pref.label[lang] || pref.label.ru,
          color: DIET_BADGE_COLORS[id] || '#8B5CF6',
          matched,
        }
      })
      .filter(Boolean)
  }, [resolvedDietSet, isHalal, lang])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
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
