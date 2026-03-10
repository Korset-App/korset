import products from '../data/products.json'

export const ALLERGEN_NAMES = {
  milk: 'Молоко', gluten: 'Глютен', nuts: 'Орехи',
  soy: 'Соя', eggs: 'Яйца', fish: 'Рыба',
  shellfish: 'Моллюски', peanuts: 'Арахис', wheat: 'Пшеница',
}

export function checkProductFit(product, profile) {
  const reasons = []

  // Halal
  const halalOn = profile.halal || profile.halalOnly || profile.religion?.includes('halal')
  if (halalOn && product.halal === 'no') {
    reasons.push({ type: 'fail', text: 'Не является халал' })
  }

  // Allergens
  const allergens = profile.allergens || []
  if (allergens.length > 0) {
    const found = product.allergens.filter(a => allergens.includes(a))
    found.forEach(a => reasons.push({ type: 'fail', text: `Содержит аллерген: ${ALLERGEN_NAMES[a] || a}` }))
  }

  // Custom allergens — text match in ingredients/name
  const customAllergens = profile.customAllergens || []
  if (customAllergens.length > 0) {
    const haystack = `${product.name} ${product.ingredients || ''}`.toLowerCase()
    customAllergens.forEach(ca => {
      if (haystack.includes(ca.toLowerCase())) {
        reasons.push({ type: 'fail', text: `Содержит: ${ca}` })
      }
    })
  }

  // Diet goals
  const goals = profile.dietGoals || []
  if ((goals.includes('sugar_free') || profile.sugarFree) && product.dietTags.includes('contains_sugar')) {
    reasons.push({ type: 'fail', text: 'Содержит добавленный сахар' })
  }
  if (goals.includes('dairy_free') && product.dietTags.includes('contains_dairy')) {
    reasons.push({ type: 'fail', text: 'Содержит молочные продукты' })
  }
  if (goals.includes('gluten_free') && product.dietTags.includes('contains_gluten')) {
    reasons.push({ type: 'fail', text: 'Содержит глютен' })
  }
  if (goals.includes('vegan') && (product.dietTags.includes('contains_dairy') || product.allergens.includes('eggs') || product.allergens.includes('milk'))) {
    reasons.push({ type: 'fail', text: 'Не подходит для веганов' })
  }

  const fits = reasons.length === 0

  if (fits) {
    if (halalOn && product.halal === 'yes') reasons.push({ type: 'pass', text: 'Подтверждено как халал ✓' })
    if (allergens.length > 0 && product.allergens.length === 0) reasons.push({ type: 'pass', text: 'Не содержит ваших аллергенов ✓' })
    if ((goals.includes('sugar_free') || profile.sugarFree) && product.dietTags.includes('sugar_free')) {
      reasons.push({ type: 'pass', text: 'Без добавленного сахара ✓' })
    }
    if (product.qualityScore >= 80) reasons.push({ type: 'pass', text: `Рейтинг качества: ${product.qualityScore}/100` })
    if (reasons.length === 0) reasons.push({ type: 'pass', text: 'Соответствует вашим предпочтениям' })
  }

  return { fits, reasons: reasons.slice(0, 3) }
}

export function getAlternatives(product, profile) {
  // Same group first, then same category
  const sameGroup = products.filter(p => {
    if (p.id === product.id) return false
    if (!product.group || p.group !== product.group) return false
    return checkProductFit(p, profile).fits
  })

  const sameCategory = products.filter(p => {
    if (p.id === product.id) return false
    if (p.group === product.group) return false // already in sameGroup
    if (p.category !== product.category) return false
    return checkProductFit(p, profile).fits
  })

  const priority = profile.priority || 'balanced'
  const sortFn = (a, b) => {
    if (priority === 'price') return a.priceKzt - b.priceKzt
    if (priority === 'quality') return (b.qualityScore || 0) - (a.qualityScore || 0)
    // balanced: score = quality/100 * 0.5 + (1 - normalised price) * 0.5
    return (b.qualityScore || 0) - (a.qualityScore || 0)
  }

  const results = [...sameGroup.sort(sortFn), ...sameCategory.sort(sortFn)].slice(0, 3)
  return results.map(p => ({ ...p, whyFits: buildWhyFits(p, profile) }))
}

function buildWhyFits(product, profile) {
  const halalOn = profile.halal || profile.halalOnly || profile.religion?.includes('halal')
  if (halalOn && product.halal === 'yes') return 'Халал ✓'
  const goals = profile.dietGoals || []
  if ((goals.includes('sugar_free') || profile.sugarFree) && product.dietTags.includes('sugar_free')) return 'Без сахара ✓'
  if (goals.includes('dairy_free') && product.dietTags.includes('dairy_free')) return 'Без молочки ✓'
  if (profile.priority === 'price') return `Выгоднее на ${Math.round(((product.priceKzt) / 10)) * 10 < product.priceKzt ? '' : ''}${product.priceKzt} ₸`
  return `Рейтинг ${product.qualityScore}/100`
}

export function formatPrice(kzt) {
  if (!kzt && kzt !== 0) return '—'
  return kzt.toLocaleString('ru-RU') + '\u00a0\u20B8'
}

export const CATEGORY_LABELS = {
  grocery: 'Продукты',
  electronics: 'Электроника',
  diy: 'Стройматериалы',
}
