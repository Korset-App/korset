import products from '../data/products.json'

export const ALLERGEN_NAMES = {
  milk: 'Молоко', gluten: 'Глютен', nuts: 'Орехи',
  soy: 'Соя', eggs: 'Яйца', fish: 'Рыба',
  shellfish: 'Моллюски', peanuts: 'Арахис', wheat: 'Пшеница',
}

export function checkProductFit(product, profile) {
  const reasons = []
  const halalOn = profile.halal || profile.halalOnly || profile.religion?.includes('halal')

  if (halalOn && product.halal === 'no') {
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
    if (halalOn && product.halal === 'yes') reasons.push({ type: 'pass', text: 'Подтверждено как халал ✓' })
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

  const sortFn = (a, b) => {
    if (priority === 'price') return a.priceKzt - b.priceKzt
    if (priority === 'quality') return (b.qualityScore || 0) - (a.qualityScore || 0)
    return (b.qualityScore || 0) - (a.qualityScore || 0)
  }

  // 1. Same group — ALWAYS first (water→water, cola→cola, etc.)
  const sameGroup = products
    .filter(p => p.id !== product.id && product.group && p.group === product.group)
    .sort(sortFn)

  // 2. If not enough from same group — fill with same GROUP TYPE
  //    (e.g. if water group has only 1 item, don't show rice — show nothing extra)
  //    Only add from same category if groups are semantically related
  const needed = 3 - sameGroup.length
  const extras = needed > 0
    ? products
        .filter(p => {
          if (p.id === product.id) return false
          if (p.group === product.group) return false // already included
          if (p.category !== product.category) return false
          // Only add if product shares at least 1 tag with original
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
  if (halalOn && alt.halal === 'yes') return 'Халал ✓'
  const goals = profile.dietGoals || []
  if ((goals.includes('sugar_free') || profile.sugarFree) && (alt.dietTags||[]).includes('sugar_free')) return 'Без сахара ✓'
  if (goals.includes('dairy_free') && (alt.dietTags||[]).includes('dairy_free')) return 'Без молочки ✓'
  if (alt.priceKzt < original.priceKzt) return `Дешевле на ${(original.priceKzt - alt.priceKzt).toLocaleString('ru-RU')} ₸`
  return `Рейтинг ${alt.qualityScore}/100`
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
