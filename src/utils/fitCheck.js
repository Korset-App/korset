import { ALLERGEN_NAMES } from './profile.js'
import products from '../data/products.json'

/**
 * Returns { fits: bool, reasons: [{type, text}] }
 */
export function checkProductFit(product, profile) {
  const reasons = []

  // Halal check (new format: religion array)
  const halalOn = profile.religion?.includes('halal') || profile.halalOnly
  if (halalOn && product.halal === 'no') {
    reasons.push({ type: 'fail', text: 'Не является халал' })
  }

  // Allergen check
  if (profile.allergens?.length > 0) {
    const found = product.allergens.filter((a) => profile.allergens.includes(a))
    found.forEach((a) =>
      reasons.push({ type: 'fail', text: `Содержит аллерген: ${ALLERGEN_NAMES[a] || a}` })
    )
  }

  // Diet goals check (new format)
  const dietGoals = profile.dietGoals || []
  if (dietGoals.includes('sugar_free') || profile.sugarFree) {
    if (product.dietTags.includes('contains_sugar')) {
      reasons.push({ type: 'fail', text: 'Содержит добавленный сахар' })
    }
  }
  if (dietGoals.includes('dairy_free') && product.dietTags.includes('contains_dairy')) {
    reasons.push({ type: 'fail', text: 'Содержит молочные продукты' })
  }
  if (dietGoals.includes('gluten_free') && product.dietTags.includes('contains_gluten')) {
    reasons.push({ type: 'fail', text: 'Содержит глютен' })
  }
  if (dietGoals.includes('vegan') && (product.dietTags.includes('contains_dairy') || product.allergens.includes('eggs') || product.allergens.includes('milk'))) {
    reasons.push({ type: 'fail', text: 'Не подходит для веганов' })
  }

  const fits = reasons.length === 0

  // Positive reasons
  if (fits) {
    if (halalOn && product.halal === 'yes') {
      reasons.push({ type: 'pass', text: 'Подтверждено как халал ✓' })
    }
    if (profile.allergens?.length > 0 && product.allergens.length === 0) {
      reasons.push({ type: 'pass', text: 'Не содержит ваших аллергенов ✓' })
    }
    if ((dietGoals.includes('sugar_free') || profile.sugarFree) && product.dietTags.includes('sugar_free')) {
      reasons.push({ type: 'pass', text: 'Без добавленного сахара ✓' })
    }
    if (product.qualityScore >= 80) {
      reasons.push({ type: 'pass', text: `Рейтинг качества: ${product.qualityScore}/100` })
    }
    if (reasons.length === 0) {
      reasons.push({ type: 'pass', text: 'Соответствует вашим предпочтениям' })
    }
  }

  return { fits, reasons: reasons.slice(0, 3) }
}

/**
 * Returns up to 3 alternatives that fit the profile
 */
export function getAlternatives(product, profile) {
  const candidates = products.filter((p) => {
    if (p.id === product.id) return false
    const { fits } = checkProductFit(p, profile)
    return fits
  })

  // Prefer same category first
  const sameCategory = candidates.filter((p) => p.category === product.category)
  const others = candidates.filter((p) => p.category !== product.category)
  const sorted = [...sameCategory, ...others]

  // Sort by priority
  if (profile.priority === 'price') {
    sorted.sort((a, b) => a.priceKzt - b.priceKzt)
  } else if (profile.priority === 'balanced') {
    // Simple score: quality per 1000 KZT (higher is better)
    sorted.sort((a, b) => {
      const sa = (a.qualityScore || 0) / Math.max(1, a.priceKzt / 1000)
      const sb = (b.qualityScore || 0) / Math.max(1, b.priceKzt / 1000)
      return sb - sa
    })
  } else {
    sorted.sort((a, b) => b.qualityScore - a.qualityScore)
  }

  return sorted.slice(0, 3).map((p) => ({
    ...p,
    whyFits: buildWhyFits(p, profile),
  }))
}

function buildWhyFits(product, profile) {
  if (profile.halalOnly && product.halal === 'yes') return 'Халал, без ваших аллергенов'
  if (profile.sugarFree && product.dietTags.includes('sugar_free')) return 'Без сахара ✓'
  if (profile.priority === 'price') return `Лучшая цена в категории`
  if (profile.priority === 'balanced') return `Хороший баланс цены и качества`
  if (product.dietTags.includes('dairy_free')) return 'Без молочных продуктов'
  if (product.dietTags.includes('gluten_free')) return 'Без глютена'
  return `Рейтинг ${product.qualityScore}/100 — отличный выбор`
}

export function formatPrice(kzt) {
  return kzt.toLocaleString('ru-RU') + ' ₸'
}

export const CATEGORY_LABELS = {
  grocery: 'Продукты',
  electronics: 'Электроника',
  diy: 'Стройматериалы',
}
