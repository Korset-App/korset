import { getGlobalDemoProducts } from './storeCatalog.js'
import { ALLERGEN_NAMES } from '../data/allergens.js'

export { ALLERGEN_NAMES }

function getHalalStatus(product) {
  if (product?.halalStatus) return product.halalStatus
  if (product?.halal === true) return 'yes'
  if (product?.halal === false) return 'no'
  return 'unknown'
}

export function checkProductFit(product, profile) {
  const reasons = []
  const halalOn = profile.halal || profile.halalOnly || profile.religion?.includes('halal')
  const halalStatus = getHalalStatus(product)

  if (halalOn && halalStatus === 'no') {
    reasons.push({ type: 'fail', text: 'Не является халал' })
  }

  const allergens = profile.allergens || []
  if (allergens.length > 0) {
    const found = (product.allergens || []).filter(a => allergens.includes(a))
    found.forEach(a => reasons.push({ type: 'fail', text: `Содержит аллерген: ${ALLERGEN_NAMES[a] || a}` }))
  }

  const customAllergens = profile.customAllergens || []
  if (customAllergens.length > 0) {
    const haystack = `${product.name} ${product.ingredients || ''}`.toLowerCase()
    customAllergens.forEach(ca => {
      if (haystack.includes(ca.toLowerCase())) {
        reasons.push({ type: 'fail', text: `Содержит: ${ca}` })
      }
    })
  }

  const goals = profile.dietGoals || []
  const dietTags = product.dietTags || []
  if ((goals.includes('sugar_free') || profile.sugarFree) && dietTags.includes('contains_sugar'))
    reasons.push({ type: 'fail', text: 'Содержит добавленный сахар' })
  if (goals.includes('dairy_free') && dietTags.includes('contains_dairy'))
    reasons.push({ type: 'fail', text: 'Содержит молочные продукты' })
  if (goals.includes('gluten_free') && dietTags.includes('contains_gluten'))
    reasons.push({ type: 'fail', text: 'Содержит глютен' })
  if (goals.includes('vegan') && (dietTags.includes('contains_dairy') || (product.allergens||[]).includes('milk')))
    reasons.push({ type: 'fail', text: 'Не подходит для веганов' })

  const fits = reasons.length === 0

  if (fits) {
    if (halalOn && halalStatus === 'yes') reasons.push({ type: 'pass', text: 'Подтверждено как халал ✓' })
    if (allergens.length > 0 && (product.allergens||[]).length === 0) reasons.push({ type: 'pass', text: 'Не содержит ваших аллергенов ✓' })
    if ((goals.includes('sugar_free') || profile.sugarFree) && dietTags.includes('sugar_free'))
      reasons.push({ type: 'pass', text: 'Без добавленного сахара ✓' })
    if (product.qualityScore >= 80) reasons.push({ type: 'pass', text: `Рейтинг качества: ${product.qualityScore}/100` })
    if (reasons.length === 0) reasons.push({ type: 'pass', text: 'Соответствует вашим предпочтениям' })
  }

  return { fits, reasons: reasons.slice(0, 3) }
}

export function getAlternatives(product, profile) {
  const priority = profile.priority || 'balanced'
  const baseProducts = getGlobalDemoProducts()

  const sortFn = (a, b) => {
    if (priority === 'price') return (a.priceKzt || Infinity) - (b.priceKzt || Infinity)
    if (priority === 'quality') return (b.qualityScore || 0) - (a.qualityScore || 0)
    return (b.qualityScore || 0) - (a.qualityScore || 0)
  }

  const sameGroup = baseProducts
    .filter(p => p.id !== product.id && product.group && p.group === product.group)
    .sort(sortFn)

  const needed = 3 - sameGroup.length
  const extras = needed > 0
    ? baseProducts
        .filter(p => {
          if (p.id === product.id) return false
          if (p.group === product.group) return false
          if (p.category !== product.category) return false
          const sharedTags = (p.tags || []).filter(t => (product.tags || []).includes(t))
          return sharedTags.length > 0
        })
        .sort(sortFn)
        .slice(0, needed)
    : []

  const results = [...sameGroup, ...extras].slice(0, 3)
  return results.map(p => ({ ...p, whyFits: buildWhyFits(p, product, profile) }))
}

function buildWhyFits(alt, original, profile) {
  const halalOn = profile.halal || profile.halalOnly || profile.religion?.includes('halal')
  const halalStatus = getHalalStatus(alt)
  if (halalOn && halalStatus === 'yes') return 'Халал ✓'
  const goals = profile.dietGoals || []
  if ((goals.includes('sugar_free') || profile.sugarFree) && (alt.dietTags||[]).includes('sugar_free')) return 'Без сахара ✓'
  if (goals.includes('dairy_free') && (alt.dietTags||[]).includes('dairy_free')) return 'Без молочки ✓'
  if ((alt.priceKzt ?? Infinity) < (original.priceKzt ?? Infinity)) return `Дешевле на ${((original.priceKzt || 0) - (alt.priceKzt || 0)).toLocaleString('ru-RU')} ₸`
  return `Рейтинг ${alt.qualityScore}/100`
}

export function formatPrice(kzt) {
  if (!kzt && kzt !== 0) return '—'
  return kzt.toLocaleString('ru-RU') + ' ₸'
}

export const CATEGORY_LABELS = {
  grocery: 'Продукты',
  electronics: 'Электроника',
  diy: 'Стройматериалы',
}
