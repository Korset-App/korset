import { getGlobalDemoProducts } from './storeCatalog.js'
import { ALLERGEN_NAMES, getAllergenName } from '../constants/allergens.js'
import { ALLERGEN_SYNONYMS, ASPARTAME_SYNONYMS } from '../constants/allergenSynonyms.js'
import { extractTraceAllergens } from '../constants/tracePhrases.js'

export { ALLERGEN_NAMES }

function getHalalStatus(product) {
  if (product?.halalStatus) return product.halalStatus
  if (product?.halal === true) return 'yes'
  if (product?.halal === false) return 'no'
  return 'unknown'
}

/**
 * Fit-Check Engine v2.0
 * Evaluates a product against user profile constraints using a 4-level severity system.
 * @param {Object} product
 * @param {Object} profile
 * @returns {Object} { verdict: 'danger'|'warning'|'caution'|'safe', reasons: [], fits: boolean, score: number }
 */
export function checkProductFit(product, profile) {
  const reasons = []

  const addReason = ({ severity, category, text, textKz, source, details }) => {
    reasons.push({
      severity,
      category,
      text,
      textKz: textKz || text,
      source,
      details,
      type: severity === 'safe' ? 'pass' : 'fail', // For backward compatibility with v1.0 UI
    })
  }

  const userAllergens = profile.allergens || []
  const customAllergens = profile.customAllergens || []
  const healthConditions = profile.healthConditions || []
  const goals = profile.dietGoals || []

  const ingredientsRaw = (
    product.ingredients ||
    product.ingredients_raw ||
    product.ingredients_text ||
    ''
  ).toLowerCase()
  const prodAllergens = product.allergens || []
  const dietTags = product.dietTags || []
  const nutrition = product.nutritionPer100 || product.nutriments || product.nutriments_json || {}
  const sugar100g = nutrition.sugar ?? nutrition.sugars ?? nutrition.sugars_100g
  const protein100g = nutrition.protein ?? nutrition.proteins ?? nutrition.proteins_100g

  // 1. Structured Allergens
  if (userAllergens.length > 0) {
    const foundAllergens = prodAllergens.filter((a) => {
      const normalized = a.replace('en:', '')
      return userAllergens.includes(normalized) || userAllergens.includes(a)
    })

    foundAllergens.forEach((a) => {
      const id = a.replace('en:', '')
      addReason({
        severity: 'danger',
        category: 'allergen',
        text: `Содержит аллерген: ${getAllergenName(id, 'ru')}`,
        textKz: `Құрамында аллерген бар: ${getAllergenName(id, 'kz')}`,
        source: 'structured',
        details: { allergenId: id },
      })
    })
  }

  // 2. Parsed Allergens (Ingredients Raw)
  if (userAllergens.length > 0 && ingredientsRaw) {
    userAllergens.forEach((allergenId) => {
      const alreadyReported = reasons.some(
        (r) => r.category === 'allergen' && r.details?.allergenId === allergenId
      )
      if (!alreadyReported) {
        const synonyms = ALLERGEN_SYNONYMS[allergenId] || []
        const foundSynonym = synonyms.find((s) => ingredientsRaw.includes(s))
        if (foundSynonym) {
          addReason({
            severity: 'danger',
            category: 'allergen',
            text: `Обнаружен аллерген в составе: ${getAllergenName(allergenId, 'ru')} («${foundSynonym}»)`,
            textKz: `Құрамынан аллерген табылды: ${getAllergenName(allergenId, 'kz')} («${foundSynonym}»)`,
            source: 'ingredient_parse',
            details: { allergenId, foundIn: foundSynonym },
          })
        }
      }
    })
  }

  // 3. Custom Allergens
  if (customAllergens.length > 0) {
    const haystack = `${product.name || ''} ${ingredientsRaw}`.toLowerCase()
    customAllergens.forEach((ca) => {
      if (haystack.includes(ca.toLowerCase())) {
        addReason({
          severity: 'danger',
          category: 'allergen',
          text: `Содержит опасный ингредиент: ${ca}`,
          textKz: `Құрамында қауіпті ингредиент бар: ${ca}`,
          source: 'ingredient_parse',
        })
      }
    })
  }

  // 3.5 Trace Allergens (from structured traces data)
  const productTraces = product.traces || []
  if (userAllergens.length > 0 && productTraces.length > 0) {
    const foundTraces = productTraces.filter((t) => {
      const normalized = t.replace('en:', '')
      return userAllergens.includes(normalized) || userAllergens.includes(t)
    })
    foundTraces.forEach((t) => {
      const id = t.replace('en:', '')
      const alreadyReported = reasons.some(
        (r) => r.category === 'allergen' && r.details?.allergenId === id
      )
      if (!alreadyReported) {
        addReason({
          severity: 'warning',
          category: 'allergen',
          text: `Может содержать следы: ${getAllergenName(id, 'ru')}`,
          textKz: `Құрамында ізі болуы мүмкін: ${getAllergenName(id, 'kz')}`,
          source: 'structured_traces',
          details: { allergenId: id },
        })
      }
    })
  }

  // 4. Health Conditions
  if (healthConditions.includes('diabetes')) {
    const sugars100g = parseFloat(sugar100g)
    const hasSugarKeywords =
      ingredientsRaw.includes('сахар') ||
      ingredientsRaw.includes('сироп') ||
      ingredientsRaw.includes('фруктоз')

    if (!isNaN(sugars100g)) {
      if (sugars100g > 22.5) {
        addReason({
          severity: 'danger',
          category: 'health',
          text: `⚠️ Высокое содержание сахара: ${sugars100g}г/100г`,
          textKz: `⚠️ Қант мөлшері жоғары: ${sugars100g}г/100г`,
          source: 'nutriment',
        })
      } else if (sugars100g > 5) {
        addReason({
          severity: 'warning',
          category: 'health',
          text: `Среднее содержание сахара: ${sugars100g}г/100г`,
          textKz: `Қант мөлшері орташа: ${sugars100g}г/100г`,
          source: 'nutriment',
        })
      } else {
        addReason({
          severity: 'safe',
          category: 'health',
          text: `✓ Низкое содержание сахара: ${sugars100g}г/100г`,
          textKz: `✓ Қант мөлшері төмен: ${sugars100g}г/100г`,
          source: 'nutriment',
        })
      }
    } else if (hasSugarKeywords) {
      addReason({
        severity: 'warning',
        category: 'health',
        text: `Содержит добавленный сахар (количество неизвестно)`,
        textKz: `Құрамында қосылған қант бар (мөлшері белгісіз)`,
        source: 'ingredient_parse',
      })
    }
  }

  if (healthConditions.includes('celiac')) {
    const isGlutenDanger = reasons.some(
      (r) => r.details?.allergenId === 'gluten' && r.severity === 'danger'
    )
    if (!isGlutenDanger) {
      const glutenSynonyms = ALLERGEN_SYNONYMS['gluten'] || []
      const foundGluten = glutenSynonyms.find((s) => ingredientsRaw.includes(s))
      if (foundGluten || prodAllergens.some((a) => a.includes('gluten') || a.includes('wheat'))) {
        addReason({
          severity: 'danger',
          category: 'health',
          text: `Содержит глютен (Опасно при целиакии)`,
          textKz: `Құрамында глютен бар (Целиакия кезінде қауіпті)`,
          source: 'ingredient_parse',
        })
      }
    }
  }

  if (healthConditions.includes('pku')) {
    const foundAspartame = ASPARTAME_SYNONYMS.find((s) => ingredientsRaw.includes(s))
    if (foundAspartame) {
      addReason({
        severity: 'danger',
        category: 'health',
        text: `Содержит аспартам/фенилаланин («${foundAspartame}»)`,
        textKz: `Құрамында аспартам/фенилаланин бар («${foundAspartame}»)`,
        source: 'ingredient_parse',
      })
    }
    const proteins100g = parseFloat(protein100g)
    if (!isNaN(proteins100g) && proteins100g > 20) {
      addReason({
        severity: 'warning',
        category: 'health',
        text: `Высокое содержание белка (${proteins100g}г/100г) — предупреждение для ФКУ`,
        textKz: `Ақуыз мөлшері жоғары (${proteins100g}г/100г) — ФКУ үшін ескерту`,
        source: 'nutriment',
      })
    }
  }

  // 5. Traces (Cross-contamination)
  if (ingredientsRaw) {
    const traceMatches = extractTraceAllergens(ingredientsRaw, ALLERGEN_SYNONYMS)
    const profileAllergensSet = new Set(userAllergens)
    if (healthConditions.includes('celiac')) profileAllergensSet.add('gluten')

    const relevantTraces = traceMatches.filter((t) => profileAllergensSet.has(t.allergenId))

    // De-duplicate trace reasons by allergenId
    const seenTraces = new Set()
    relevantTraces.forEach((trace) => {
      if (!seenTraces.has(trace.allergenId)) {
        seenTraces.add(trace.allergenId)
        addReason({
          severity: 'warning',
          category: 'trace',
          text: `Возможно наличие следов: ${getAllergenName(trace.allergenId, 'ru')}`,
          textKz: `Іздері болуы мүмкін: ${getAllergenName(trace.allergenId, 'kz')}`,
          source: 'ingredient_parse',
          details: { allergenId: trace.allergenId, matchedPhrase: trace.matchedPhrase },
        })
      }
    })
  }

  // 6. Halal
  const halalOn = profile.halal || profile.halalOnly || profile.religion?.includes('halal')
  const halalStrict = profile.halalStrict
  const halalStatus = getHalalStatus(product)
  const alcoholInProduct =
    nutrition.alcohol != null && nutrition.alcohol > 0
      ? nutrition.alcohol
      : product.alcohol100g != null && product.alcohol100g > 0
        ? product.alcohol100g
        : null

  if (halalOn && halalStatus === 'no') {
    addReason({
      severity: halalStrict ? 'warning' : 'caution',
      category: 'halal',
      text: 'Не является халал',
      textKz: 'Халал емес',
      source: 'structured',
    })
  }

  if (halalOn && alcoholInProduct) {
    addReason({
      severity: 'danger',
      category: 'halal',
      text: `Содержит алкоголь (${alcoholInProduct}%) — запрещено для халал`,
      textKz: `Құрамында алкоголь бар (${alcoholInProduct}%) — халал үшін тыйым салынған`,
      source: 'nutriment',
    })
  }

  if (halalOn && halalStatus === 'unknown' && !alcoholInProduct) {
    const haramKeywords = [
      'винов',
      'коньяк',
      'ром',
      'ликёр',
      'пив',
      'этиловый спирт',
      'wine',
      'beer',
      'rum',
      'vodka',
    ]
    const foundHaram = haramKeywords.find((kw) => ingredientsRaw.includes(kw))
    if (foundHaram) {
      addReason({
        severity: 'danger',
        category: 'halal',
        text: `Возможно содержит алкоголь/харам («${foundHaram}»)`,
        textKz: `Алкоголь/харам болуы мүмкін («${foundHaram}»)`,
        source: 'ingredient_parse',
      })
    }
  }

  // 7. Diet Goals
  if ((goals.includes('sugar_free') || profile.sugarFree) && dietTags.includes('contains_sugar')) {
    addReason({
      severity: 'caution',
      category: 'diet',
      text: 'Содержит добавленный сахар',
      source: 'structured',
    })
  }
  if (goals.includes('dairy_free') && dietTags.includes('contains_dairy')) {
    addReason({
      severity: 'caution',
      category: 'diet',
      text: 'Содержит молочные продукты',
      source: 'structured',
    })
  }
  if (
    goals.includes('vegan') &&
    (dietTags.includes('contains_dairy') ||
      prodAllergens.includes('milk') ||
      prodAllergens.includes('en:milk'))
  ) {
    addReason({
      severity: 'caution',
      category: 'diet',
      text: 'Не подходит для веганов',
      source: 'structured',
    })
  }

  // 8. Determine Verdict
  let verdict = 'safe'
  if (reasons.some((r) => r.severity === 'danger')) verdict = 'danger'
  else if (reasons.some((r) => r.severity === 'warning')) verdict = 'warning'
  else if (reasons.some((r) => r.severity === 'caution')) verdict = 'caution'

  // Add Positive Confirmations if not danger
  if (verdict !== 'danger') {
    if (halalOn && halalStatus === 'yes') {
      addReason({
        severity: 'safe',
        category: 'halal',
        text: 'Подтверждено как халал ✓',
        textKz: 'Халал расталды ✓',
        source: 'structured',
      })
    }
    if (
      userAllergens.length > 0 &&
      !reasons.some((r) => r.category === 'allergen' || r.category === 'trace')
    ) {
      addReason({
        severity: 'safe',
        category: 'allergen',
        text: 'Не содержит ваших аллергенов ✓',
        textKz: 'Сіздің аллергендеріңіз жоқ ✓',
        source: 'structured',
      })
    }
  }

  // Filtering reasons based on verdict strategy for UI display
  let displayReasons
  if (verdict === 'danger') {
    // Show all danger and warning reasons
    displayReasons = reasons.filter((r) => r.severity === 'danger' || r.severity === 'warning')
  } else if (verdict === 'warning') {
    // Show all warnings and up to 1 caution
    const warnings = reasons.filter((r) => r.severity === 'warning')
    const cautions = reasons.filter((r) => r.severity === 'caution').slice(0, 1)
    displayReasons = [...warnings, ...cautions]
  } else if (verdict === 'caution') {
    // Show up to 3 cautions
    displayReasons = reasons.filter((r) => r.severity === 'caution').slice(0, 3)
  } else {
    // Show up to 3 safe positive feedbacks
    displayReasons = reasons.filter((r) => r.severity === 'safe').slice(0, 3)
    if (displayReasons.length === 0) {
      displayReasons.push({
        severity: 'safe',
        category: 'diet',
        type: 'pass',
        text: 'Соответствует вашим предпочтениям',
        source: 'structured',
      })
    }
  }

  // For backward compatibility: if there's any non-safe reason, fits is false
  const fits = verdict === 'safe'

  return {
    verdict,
    fits,
    reasons: displayReasons,
    score: product.qualityScore || 100,
    checkedAt: new Date().toISOString(),
  }
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
    .filter((p) => p.id !== product.id && product.group && p.group === product.group)
    .sort(sortFn)

  const needed = 3 - sameGroup.length
  const extras =
    needed > 0
      ? baseProducts
          .filter((p) => {
            if (p.id === product.id) return false
            if (p.group === product.group) return false
            if (p.category !== product.category) return false
            const sharedTags = (p.tags || []).filter((t) => (product.tags || []).includes(t))
            return sharedTags.length > 0
          })
          .sort(sortFn)
          .slice(0, needed)
      : []

  const results = [...sameGroup, ...extras].slice(0, 3)
  return results.map((p) => ({ ...p, whyFits: buildWhyFits(p, product, profile) }))
}

function buildWhyFits(alt, original, profile) {
  const halalOn = profile.halal || profile.halalOnly || profile.religion?.includes('halal')
  const halalStatus = getHalalStatus(alt)
  if (halalOn && halalStatus === 'yes') return 'Халал ✓'

  const goals = profile.dietGoals || []
  if (
    (goals.includes('sugar_free') || profile.sugarFree) &&
    (alt.dietTags || []).includes('sugar_free')
  ) {
    return 'Без сахара ✓'
  }
  if (goals.includes('dairy_free') && (alt.dietTags || []).includes('dairy_free')) {
    return 'Без молочки ✓'
  }
  if ((alt.priceKzt ?? Infinity) < (original.priceKzt ?? Infinity)) {
    return `Дешевле на ${((original.priceKzt || 0) - (alt.priceKzt || 0)).toLocaleString('ru-RU')} ₸`
  }
  return `Рейтинг ${alt.qualityScore || 0}/100`
}

export function formatPrice(kzt) {
  if (!kzt && kzt !== 0) return '—'
  return kzt.toLocaleString('ru-RU') + ' ₸'
}

export const CATEGORY_LABELS = {
  grocery: 'Продукты',
  electronics: 'Электроника',
  diy: 'Стройматериалы',
}
