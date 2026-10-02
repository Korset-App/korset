import { ALLERGEN_NAMES, getAllergenName } from '../constants/allergens.js'
import { formatPrice } from './formatPrice.js'
import { ALLERGEN_SYNONYMS } from '../constants/allergenSynonyms.js'
import { extractTraceAllergens } from '../constants/tracePhrases.js'
import {
  findDirectAllergenInText,
  findMatchingTerm,
  hasAddedSugarInText,
  hasAspartameInText,
  matchesTermWithBoundary,
  splitCompositionClauses,
} from './compositionMatcher.js'

// Veganизм: ключевые маркеры животных продуктов в составе (с учётом границ слов).
const NON_VEGAN_INGREDIENT_MARKERS = [
  'мясо',
  'мяса',
  'мясн',
  'говяд',
  'говяж',
  'телят',
  'теляч',
  'свинин',
  'свиной',
  'свиная',
  'свиное',
  'свиного',
  'баранин',
  'бараний',
  'барань',
  'конин',
  'конск',
  'крольч',
  'кролик',
  'куриц',
  'курин',
  'цыплен',
  'цыплят',
  'птиц',
  'индейк',
  'индюш',
  'утка',
  'утки',
  'утин',
  'гусь',
  'гуся',
  'гусин',
  'желатин',
  'желток',
  'желтк',
  'яичн',
  'яйц',
  'яиц',
  'мёд',
  'мед',
  'меда',
  'медовый',
  'прополис',
  'воск пчел',
  'пчелиный воск',
  'фарш',
  'бекон',
  'ветчин',
  'шпик',
  'сало',
  'сала',
  'колбас',
  'сосиск',
  'сардельк',
  'субпродукт',
  'животный жир',
  'жир животн',
  'кармин',
  'кошениль',
  'e120',
  'шеллак',
  'e904',
  'сычужн',
  // EN fallback
  'meat',
  'beef',
  'veal',
  'pork',
  'lamb',
  'mutton',
  'chicken',
  'poultry',
  'turkey',
  'duck',
  'goose',
  'gelatin',
  'gelatine',
  'honey',
  'lard',
  'bacon',
  'ham',
  'carmine',
  'shellac',
  'rennet',
]

const NON_VEGETARIAN_INGREDIENT_MARKERS = [
  'мясо',
  'мяса',
  'мясн',
  'говяд',
  'говяж',
  'телят',
  'теляч',
  'свинин',
  'свиной',
  'свиная',
  'свиное',
  'свиного',
  'баранин',
  'бараний',
  'барань',
  'конин',
  'конск',
  'крольч',
  'кролик',
  'куриц',
  'курин',
  'цыплен',
  'цыплят',
  'птиц',
  'индейк',
  'индюш',
  'утка',
  'утки',
  'утин',
  'гусь',
  'гуся',
  'гусин',
  'рыба',
  'рыбы',
  'рыбн',
  'рыбий',
  'тунец',
  'тунца',
  'лосос',
  'семг',
  'сёмг',
  'форел',
  'сельд',
  'скумбр',
  'треск',
  'минтай',
  'горбуш',
  'кильк',
  'шпрот',
  'сардин',
  'анчоус',
  'сурими',
  'креветк',
  'краб',
  'крабов',
  'кальмар',
  'мидии',
  'мидий',
  'устриц',
  'осьминог',
  'моллюск',
  'ракообразн',
  'желатин',
  'фарш',
  'бекон',
  'ветчин',
  'шпик',
  'сало',
  'сала',
  'колбас',
  'сосиск',
  'сардельк',
  'субпродукт',
  'животный жир',
  'жир животн',
  'кармин',
  'кошениль',
  'e120',
  'сычужн',
  'meat',
  'beef',
  'veal',
  'pork',
  'lamb',
  'mutton',
  'chicken',
  'poultry',
  'turkey',
  'duck',
  'goose',
  'fish',
  'tuna',
  'salmon',
  'shrimp',
  'prawn',
  'crab',
  'squid',
  'mussel',
  'oyster',
  'octopus',
  'gelatin',
  'gelatine',
  'lard',
  'bacon',
  'ham',
  'carmine',
  'rennet',
]

const HARAM_INGREDIENT_MARKERS = [
  // Свинина и продукты из свинины
  'свинин',
  'свиной',
  'свиная',
  'свиное',
  'свиные',
  'свиного',
  'свиных',
  'шпик',
  'бекон',
  'ветчин',
  'сало',
  'сала',
  'хамон',
  'прошутто',
  'панчетта',
  'кабан',
  // Кровь и насекомые (кармин в строгом халал)
  'кровь',
  'кровян',
  'альбумин черный',
  'гематоген',
  // Вино и винные напитки (с границами слов)
  'вино',
  'вина',
  'вином',
  'кагор',
  'херес',
  'портвейн',
  'вермут',
  'шампанск',
  'игристое вино',
  // Крепкий алкоголь
  'коньяк',
  'коньячн',
  'водк',
  'виски',
  'джин',
  'текил',
  'абсент',
  'бренди',
  'ром',
  'рома',
  'ромом',
  // Пиво и ликёры
  'ликёр',
  'ликер',
  'пиво',
  'пивной эль',
  'сидр',
  'медовух',
  // Спирт и этанол
  'алкогол',
  'этиловый спирт',
  'этанол',
  'спирт этил',
  'медицинский спирт',
  // Восточные напитки
  'арак',
  'саке',
  // EN fallback
  'pork',
  'swine',
  'lard',
  'bacon',
  'ham',
  'prosciutto',
  'alcohol',
  'wine',
  'beer',
  'rum',
  'vodka',
  'whisky',
  'whiskey',
  'gin',
  'liqueur',
  'liquor',
  'ethanol',
  'ethyl alcohol',
  'spirits',
  'champagne',
  'cognac',
  'brandy',
  'absinthe',
  'tequila',
  'sake',
]

const HALAL_AMBIGUOUS_INGREDIENT_MARKERS = [
  'желатин',
  'ароматизатор',
  'ароматизаторы',
  'натуральный ароматизатор',
  'ферменты',
  'сычужный фермент',
  'эмульгатор e471',
  'e471',
  'e472',
  'e441',
  'e904',
  'шеллак',
  'глицерин',
  'кармин',
  'кошениль',
  'e120',
  'gelatin',
  'gelatine',
  'flavouring',
  'flavoring',
  'natural flavor',
  'rennet',
  'enzymes',
  'glycerin',
  'glycerol',
  'carmine',
]

const LACTOSE_FREE_MARKERS = [
  'безлактоз',
  'без лактоз',
  'не содержит лактоз',
  'лактозасыз',
  'lactose free',
  'lactose-free',
]

const LACTOSE_RISK_MARKERS = [
  'лактоза',
  'лактоз',
  'молоко',
  'молока',
  'молоком',
  'молочн',
  'сливки',
  'сливк',
  'сливочн',
  'сыворотк',
  'сывороточн',
  'сухое молоко',
  'молочный порошок',
  'сгущ',
  'йогурт',
  'кефир',
  'ряженк',
  'сметан',
  'творог',
  'творож',
  'сыр',
  'сыра',
  'сыром',
  'сырн',
  'сырок',
  'казеин',
  'казеинат',
  'пахт',
  'кумыс',
  'шубат',
  'айран',
  'каймак',
  'курт',
  'lactose',
  'milk',
  'cream',
  'butter',
  'whey',
  'casein',
  'yogurt',
  'yoghurt',
  'cheese',
]

const CHILD_UNFRIENDLY_INGREDIENT_MARKERS = [
  'кофеин',
  'таурин',
  'гуарана',
  'энергетик',
  'energy drink',
  'caffeine',
  'taurine',
  'guarana',
  // Southampton 6 азокрасители (ТР ТС 022/2011: отрицательное влияние на активность и внимание детей)
  'e102',
  'тартразин',
  'e104',
  'хинолиновый желтый',
  'e110',
  'солнечный закат',
  'e122',
  'азорубин',
  'кармуазин',
  'e124',
  'понсо',
  'e129',
  'очаровательный красный',
  // Интенсивные подсластители, усилители вкуса и нитриты
  'глутамат натрия',
  'e621',
  'нитрит натрия',
  'e250',
  'бензоат натрия',
  'e211',
  'аспартам',
  'e951',
  'ацесульфам',
  'e950',
  'сахарин',
  'e954',
  'цикламат',
  'e952',
  'алкогол',
  'спирт этил',
  'этанол',
]

export { ALLERGEN_NAMES }

function getHalalStatus(product) {
  if (product?.halalStatus) return product.halalStatus
  if (product?.halal_status) return product.halal_status
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
export function checkProductFit(product, profile = {}) {
  if (product?.storeSourceItemId && product.needsEnrichment)
    return {
      verdict: 'warning',
      fits: false,
      checkedAt: new Date().toISOString(),
      reasons: [
        {
          severity: 'warning',
          category: 'data',
          source: 'store_integration',
          type: 'fail',
          text: 'Состав и свойства товара ещё не подтверждены.',
          textKz: 'Тауардың құрамы мен қасиеттері әлі расталмаған.',
        },
      ],
    }
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
  const wantsLactoseFree = goals.includes('lactose_free') || goals.includes('dairy_free')

  const ingredientsRaw = (
    product?.ingredients ||
    product?.ingredients_raw ||
    product?.ingredients_text ||
    product?.ingredientsKz ||
    product?.ingredients_kz ||
    ''
  ).toLowerCase()
  const { mainText, negatedText } = splitCompositionClauses(ingredientsRaw)

  const prodAllergens = product?.allergens || []
  const dietTags = product?.dietTags || product?.diet_tags || []
  const nutrition =
    product?.nutritionPer100 || product?.nutriments || product?.nutriments_json || {}
  const sugar100g = nutrition.sugar ?? nutrition.sugars ?? nutrition.sugars_100g
  const carbs100g =
    nutrition.carbs ??
    nutrition.carbohydrates ??
    nutrition.carbohydrates_100g ??
    nutrition.carbohydrate ??
    nutrition.carbohydrate_100g
  const fat100g = nutrition.fat ?? nutrition.fat_100g
  const fiber100g =
    nutrition.fiber ?? nutrition.fiber_100g ?? nutrition.fibers ?? nutrition.fibers_100g
  const protein100g =
    nutrition.protein ?? nutrition.protein_100g ?? nutrition.proteins ?? nutrition.proteins_100g
  const fatPercent = product?.fatPercent ?? product?.fat_percent ?? fat100g ?? null
  const hasKetoTag = dietTags.includes('keto')
  const hasLowCarbTag = dietTags.includes('low_carb')

  // 1. Structured Allergens
  if (userAllergens.length > 0) {
    const foundAllergens = prodAllergens.filter((a) => {
      const normalized = String(a).replace(/^en:/, '')
      return userAllergens.includes(normalized) || userAllergens.includes(a)
    })

    foundAllergens.forEach((a) => {
      const id = String(a).replace(/^en:/, '')
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

  // 2. Parsed Allergens (Main Ingredients Only — excluding trace clauses & negations)
  if (userAllergens.length > 0 && mainText) {
    userAllergens.forEach((allergenId) => {
      const alreadyReported = reasons.some(
        (r) => r.category === 'allergen' && r.details?.allergenId === allergenId
      )
      if (!alreadyReported) {
        const foundSynonym = findDirectAllergenInText(mainText, allergenId)
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
    const haystack = `${product?.name || ''} ${mainText}`.toLowerCase()
    customAllergens.forEach((ca) => {
      const cleanCa = String(ca || '').trim()
      if (!cleanCa) return
      if (matchesTermWithBoundary(haystack, cleanCa) || haystack.includes(cleanCa.toLowerCase())) {
        addReason({
          severity: 'danger',
          category: 'allergen',
          text: `Содержит опасный ингредиент: ${cleanCa}`,
          textKz: `Құрамында қауіпті ингредиент бар: ${cleanCa}`,
          source: 'ingredient_parse',
        })
      }
    })
  }

  // 3.5 Trace Allergens (from structured traces data)
  const productTraces = product?.traces || []
  if (userAllergens.length > 0 && productTraces.length > 0) {
    const foundTraces = productTraces.filter((t) => {
      const normalized = String(t).replace(/^en:/, '')
      return userAllergens.includes(normalized) || userAllergens.includes(t)
    })
    foundTraces.forEach((t) => {
      const id = String(t).replace(/^en:/, '')
      const alreadyReported = reasons.some(
        (r) => (r.category === 'allergen' || r.category === 'trace') && r.details?.allergenId === id
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
    const foundSugarKeyword = hasAddedSugarInText(ingredientsRaw)

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
    } else if (foundSugarKeyword) {
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
      const foundGluten = findDirectAllergenInText(mainText, 'gluten')
      if (
        foundGluten ||
        prodAllergens.some((a) => String(a).includes('gluten') || String(a).includes('wheat'))
      ) {
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
    const foundAspartame = hasAspartameInText(ingredientsRaw)
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

  // 5. Traces (Cross-contamination in trace clauses)
  if (ingredientsRaw) {
    const traceMatches = extractTraceAllergens(ingredientsRaw, ALLERGEN_SYNONYMS)
    const profileAllergensSet = new Set(userAllergens)
    if (healthConditions.includes('celiac')) profileAllergensSet.add('gluten')

    const relevantTraces = traceMatches.filter((t) => profileAllergensSet.has(t.allergenId))

    const seenTraces = new Set()
    relevantTraces.forEach((trace) => {
      const alreadyReported = reasons.some(
        (r) =>
          (r.category === 'allergen' || r.category === 'trace') &&
          r.details?.allergenId === trace.allergenId
      )
      if (!alreadyReported && !seenTraces.has(trace.allergenId)) {
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
  const halalStatus = getHalalStatus(product)
  const alcoholInProduct =
    nutrition.alcohol != null && nutrition.alcohol > 0
      ? nutrition.alcohol
      : product?.alcohol100g != null && product?.alcohol100g > 0
        ? product.alcohol100g
        : null

  if (halalOn && halalStatus === 'no') {
    addReason({
      severity: 'danger',
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
    const foundHaram = findMatchingTerm(mainText, HARAM_INGREDIENT_MARKERS, { domain: 'halal' })
    if (foundHaram) {
      addReason({
        severity: 'danger',
        category: 'halal',
        text: `Возможно содержит алкоголь/харам («${foundHaram}»)`,
        textKz: `Алкоголь/харам болуы мүмкін («${foundHaram}»)`,
        source: 'ingredient_parse',
      })
    } else {
      const foundAmbiguous = findMatchingTerm(mainText, HALAL_AMBIGUOUS_INGREDIENT_MARKERS, {
        domain: 'halal',
      })
      addReason({
        severity: foundAmbiguous ? 'warning' : 'caution',
        category: 'halal',
        text: foundAmbiguous
          ? `Халал-статус не подтверждён; есть спорный ингредиент («${foundAmbiguous}»)`
          : 'Халал-статус не подтверждён',
        textKz: foundAmbiguous
          ? `Халал мәртебесі расталмаған; күмәнді ингредиент бар («${foundAmbiguous}»)`
          : 'Халал мәртебесі расталмаған',
        source: foundAmbiguous ? 'ingredient_parse' : 'structured',
      })
    }
  }

  // 7. Diet Goals
  if (goals.includes('sugar_free') || profile.sugarFree) {
    const sugars100g = Number.parseFloat(sugar100g)
    const hasSugarKeywords = Boolean(hasAddedSugarInText(ingredientsRaw))
    const hasExplicitSugarFree =
      dietTags.includes('sugar_free') ||
      negatedText.includes('сахар') ||
      negatedText.includes('sugar')
    if (dietTags.includes('contains_sugar') || (hasSugarKeywords && !hasExplicitSugarFree)) {
      addReason({
        severity: 'caution',
        category: 'diet',
        text: 'Содержит добавленный сахар',
        textKz: 'Құрамында қосылған қант бар',
        source: dietTags.includes('contains_sugar') ? 'structured' : 'ingredient_parse',
      })
    } else if (Number.isFinite(sugars100g) && sugars100g > 5) {
      addReason({
        severity: 'caution',
        category: 'diet',
        text: `Сахара больше 5 г/100 г: ${sugars100g}г/100г`,
        textKz: `Қант 5 г/100 г-нан жоғары: ${sugars100g}г/100г`,
        source: 'nutriment',
      })
    } else if (
      hasExplicitSugarFree ||
      (Number.isFinite(sugars100g) && sugars100g <= 0.5 && Boolean(mainText))
    ) {
      addReason({
        severity: 'safe',
        category: 'diet',
        text: 'Без сахара ✓',
        textKz: 'Қантсыз ✓',
        source: dietTags.includes('sugar_free') ? 'structured' : 'nutriment',
      })
    }
  }

  if (goals.includes('low_fat')) {
    const fatValue = Number.parseFloat(fatPercent)
    if (Number.isFinite(fatValue) && fatValue > 20) {
      addReason({
        severity: 'caution',
        category: 'diet',
        text: `Высокая жирность: ${fatValue}%`,
        textKz: `Жоғары майлылық: ${fatValue}%`,
        source: 'nutriment',
      })
    } else if (Number.isFinite(fatValue) && fatValue <= 5) {
      addReason({
        severity: 'safe',
        category: 'diet',
        text: `Низкая жирность: ${fatValue}%`,
        textKz: `Төмен майлылық: ${fatValue}%`,
        source: 'nutriment',
      })
    } else if (dietTags.includes('low_fat')) {
      addReason({
        severity: 'safe',
        category: 'diet',
        text: 'Низкая жирность ✓',
        textKz: 'Төмен майлылық ✓',
        source: 'structured',
      })
    }
  }

  if (goals.includes('gluten_free')) {
    const foundGluten = findDirectAllergenInText(mainText, 'gluten')
    const hasStructuredGluten = prodAllergens.some(
      (a) => String(a).includes('gluten') || String(a).includes('wheat')
    )
    if (foundGluten || hasStructuredGluten) {
      addReason({
        severity: 'caution',
        category: 'diet',
        text: `Содержит глютен («${foundGluten || 'structured'}»)`,
        textKz: `Құрамында глютен бар («${foundGluten || 'structured'}»)`,
        source: foundGluten ? 'ingredient_parse' : 'structured',
      })
    } else if (
      dietTags.includes('gluten_free') ||
      negatedText.includes('глютен') ||
      negatedText.includes('gluten') ||
      Boolean(mainText)
    ) {
      addReason({
        severity: 'safe',
        category: 'diet',
        text: 'Без глютена ✓',
        textKz: 'Глютенсіз ✓',
        source: dietTags.includes('gluten_free') ? 'structured' : 'ingredient_parse',
      })
    }
  }

  if (wantsLactoseFree) {
    const hasExplicitLactoseFree =
      dietTags.includes('lactose_free') ||
      LACTOSE_FREE_MARKERS.some((marker) => ingredientsRaw.includes(marker)) ||
      negatedText.includes('лактоз') ||
      negatedText.includes('lactose')
    const foundLactoseRisk = findMatchingTerm(mainText, LACTOSE_RISK_MARKERS, {
      domain: 'lactose',
    })
    const hasStructuredMilk =
      dietTags.includes('contains_dairy') ||
      prodAllergens.includes('milk') ||
      prodAllergens.includes('en:milk')

    if (hasExplicitLactoseFree) {
      addReason({
        severity: 'safe',
        category: 'diet',
        text: 'Без лактозы ✓',
        textKz: 'Лактозасыз ✓',
        source: dietTags.includes('lactose_free') ? 'structured' : 'ingredient_parse',
      })
    } else if (foundLactoseRisk || hasStructuredMilk) {
      addReason({
        severity: 'caution',
        category: 'diet',
        text: foundLactoseRisk
          ? `Может содержать лактозу («${foundLactoseRisk}»)`
          : 'Может содержать лактозу',
        textKz: foundLactoseRisk
          ? `Құрамында лактоза болуы мүмкін («${foundLactoseRisk}»)`
          : 'Құрамында лактоза болуы мүмкін',
        source: foundLactoseRisk ? 'ingredient_parse' : 'structured',
      })
    } else if (mainText) {
      addReason({
        severity: 'safe',
        category: 'diet',
        text: 'Без лактозы ✓',
        textKz: 'Лактозасыз ✓',
        source: 'ingredient_parse',
      })
    }
  }

  if (goals.includes('keto')) {
    const carbsValue = Number.parseFloat(carbs100g)
    const sugarsValue = Number.parseFloat(sugar100g)
    const fiberValue = Number.parseFloat(fiber100g)
    const hasCarbsData = Number.isFinite(carbsValue)
    const hasSugarData = Number.isFinite(sugarsValue)
    const hasFiberData = Number.isFinite(fiberValue)
    const netCarbs =
      hasCarbsData && hasFiberData && fiberValue > 0 && fiberValue <= carbsValue
        ? carbsValue - fiberValue
        : null
    const carbBasis = netCarbs != null ? netCarbs : carbsValue
    const hasCarbBasis = Number.isFinite(carbBasis)
    const hasSugarSignals =
      dietTags.includes('contains_sugar') || Boolean(hasAddedSugarInText(ingredientsRaw))
    const highCarbs = hasCarbBasis && carbBasis > 10
    const highSugar = hasSugarData && sugarsValue > 5
    const lowCarbs = hasCarbBasis && carbBasis <= 7

    if (highCarbs || highSugar || hasSugarSignals) {
      addReason({
        severity: 'caution',
        category: 'diet',
        text: highCarbs
          ? `Для keto много углеводов: ${carbBasis}г/100г`
          : highSugar
            ? `Для keto много сахара: ${sugarsValue}г/100г`
            : 'Для keto есть признаки добавленного сахара',
        textKz: highCarbs
          ? `Keto үшін көмірсу көп: ${carbBasis}г/100г`
          : highSugar
            ? `Keto үшін қант көп: ${sugarsValue}г/100г`
            : 'Keto үшін қосылған қант белгілері бар',
        source: highCarbs || highSugar ? 'nutriment' : 'ingredient_parse',
      })
    } else if (lowCarbs) {
      addReason({
        severity: 'safe',
        category: 'diet',
        text:
          netCarbs != null
            ? `Подходит для keto: ${netCarbs}г net carbs/100г`
            : `Подходит для keto: ${carbsValue}г углеводов/100г`,
        textKz:
          netCarbs != null
            ? `Keto үшін жарайды: ${netCarbs}г net carbs/100г`
            : `Keto үшін жарайды: ${carbsValue}г көмірсу/100г`,
        source: 'nutriment',
      })
    } else if (hasKetoTag || hasLowCarbTag) {
      addReason({
        severity: 'caution',
        category: 'diet',
        text: 'Маркировка keto/low carb есть, но БЖУ недостаточно для подтверждения',
        textKz: 'Keto/low carb белгісі бар, бірақ растау үшін БЖУ жеткіліксіз',
        source: 'structured',
      })
    } else if (hasCarbBasis) {
      addReason({
        severity: 'caution',
        category: 'diet',
        text:
          netCarbs != null
            ? `Погранично для keto: ${netCarbs}г net carbs/100г`
            : `Погранично для keto: ${carbsValue}г углеводов/100г`,
        textKz:
          netCarbs != null
            ? `Keto үшін шекаралық: ${netCarbs}г net carbs/100г`
            : `Keto үшін шекаралық: ${carbsValue}г көмірсу/100г`,
        source: 'nutriment',
      })
    } else {
      addReason({
        severity: 'caution',
        category: 'diet',
        text: 'Недостаточно данных, чтобы подтвердить совместимость с keto',
        textKz: 'Keto-ға сәйкестігін растауға дерек жеткіліксіз',
        source: 'structured',
      })
    }
  }

  if (goals.includes('kid_friendly')) {
    const sugarsValue = Number.parseFloat(sugar100g)
    const foundChildRisk = findMatchingTerm(mainText, CHILD_UNFRIENDLY_INGREDIENT_MARKERS)
    const energyCategory =
      product?.subcategory === 'energy' ||
      product?.subcategory === 'energy_drinks' ||
      product?.category === 'energy_drinks'
    if (energyCategory || foundChildRisk || (Number.isFinite(sugarsValue) && sugarsValue > 15)) {
      addReason({
        severity: 'caution',
        category: 'diet',
        text: energyCategory
          ? 'Не лучший выбор для детей: энергетический напиток'
          : foundChildRisk
            ? `Не лучший выбор для детей («${foundChildRisk}»)`
            : `Много сахара для детского рациона: ${sugarsValue}г/100г`,
        textKz: energyCategory
          ? 'Балаларға ең жақсы таңдау емес: энергетикалық сусын'
          : foundChildRisk
            ? `Балаларға ең жақсы таңдау емес («${foundChildRisk}»)`
            : `Балалар рационы үшін қант көп: ${sugarsValue}г/100г`,
        source: energyCategory ? 'structured' : foundChildRisk ? 'ingredient_parse' : 'nutriment',
      })
    } else if (dietTags.includes('kid_friendly') || product?.category === 'baby_food') {
      addReason({
        severity: 'safe',
        category: 'diet',
        text: 'Подходит для детей ✓',
        textKz: 'Балаларға жарайды ✓',
        source: 'structured',
      })
    }
  }

  if (goals.includes('vegan')) {
    const veganViolations = []
    if (
      dietTags.includes('contains_dairy') ||
      prodAllergens.includes('milk') ||
      prodAllergens.includes('en:milk') ||
      Boolean(findDirectAllergenInText(mainText, 'milk'))
    ) {
      veganViolations.push('молочные продукты')
    }
    if (
      prodAllergens.includes('eggs') ||
      prodAllergens.includes('en:eggs') ||
      Boolean(findDirectAllergenInText(mainText, 'eggs'))
    ) {
      veganViolations.push('яйца')
    }
    if (
      prodAllergens.includes('fish') ||
      prodAllergens.includes('en:fish') ||
      Boolean(findDirectAllergenInText(mainText, 'fish'))
    ) {
      veganViolations.push('рыба')
    }
    if (
      prodAllergens.includes('crustaceans') ||
      prodAllergens.includes('en:crustaceans') ||
      prodAllergens.includes('mollusks') ||
      prodAllergens.includes('en:molluscs') ||
      Boolean(findDirectAllergenInText(mainText, 'crustaceans')) ||
      Boolean(findDirectAllergenInText(mainText, 'mollusks'))
    ) {
      veganViolations.push('морепродукты')
    }
    if (mainText) {
      const foundAnimal = findMatchingTerm(mainText, NON_VEGAN_INGREDIENT_MARKERS, {
        domain: 'vegan',
      })
      if (foundAnimal) veganViolations.push(`животные ингредиенты «${foundAnimal}»`)
    }
    if (veganViolations.length > 0) {
      addReason({
        severity: 'caution',
        category: 'diet',
        text: `Не подходит для веганов: ${veganViolations.join(', ')}`,
        textKz: `Вегандарға жарамайды: ${veganViolations.join(', ')}`,
        source: 'structured',
      })
    } else if (dietTags.includes('vegan') || Boolean(mainText)) {
      addReason({
        severity: 'safe',
        category: 'diet',
        text: 'Подходит для веганов ✓',
        textKz: 'Вегандарға жарайды ✓',
        source: dietTags.includes('vegan') ? 'structured' : 'ingredient_parse',
      })
    }
  }

  if (goals.includes('vegetarian')) {
    const vegetarianViolations = []
    if (
      prodAllergens.includes('fish') ||
      prodAllergens.includes('en:fish') ||
      Boolean(findDirectAllergenInText(mainText, 'fish'))
    ) {
      vegetarianViolations.push('рыба')
    }
    if (
      prodAllergens.includes('crustaceans') ||
      prodAllergens.includes('en:crustaceans') ||
      prodAllergens.includes('mollusks') ||
      prodAllergens.includes('en:molluscs') ||
      Boolean(findDirectAllergenInText(mainText, 'crustaceans')) ||
      Boolean(findDirectAllergenInText(mainText, 'mollusks'))
    ) {
      vegetarianViolations.push('морепродукты')
    }
    if (mainText) {
      const foundAnimal = findMatchingTerm(mainText, NON_VEGETARIAN_INGREDIENT_MARKERS, {
        domain: 'vegetarian',
      })
      if (foundAnimal) vegetarianViolations.push(`животные ингредиенты «${foundAnimal}»`)
    }
    if (vegetarianViolations.length > 0) {
      addReason({
        severity: 'caution',
        category: 'diet',
        text: `Не подходит для вегетарианцев: ${vegetarianViolations.join(', ')}`,
        textKz: `Вегетариандарға жарамайды: ${vegetarianViolations.join(', ')}`,
        source: 'ingredient_parse',
      })
    } else if (dietTags.includes('vegetarian') || dietTags.includes('vegan') || Boolean(mainText)) {
      addReason({
        severity: 'safe',
        category: 'diet',
        text: 'Подходит для вегетарианцев ✓',
        textKz: 'Вегетариандарға жарайды ✓',
        source:
          dietTags.includes('vegetarian') || dietTags.includes('vegan')
            ? 'structured'
            : 'ingredient_parse',
      })
    }
  }

  // 8. Determine Verdict
  const hasAllergenData = Boolean(
    ingredientsRaw.trim() || prodAllergens.length > 0 || productTraces.length > 0
  )

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
      if (hasAllergenData) {
        addReason({
          severity: 'safe',
          category: 'allergen',
          text: 'Не содержит ваших аллергенов ✓',
          textKz: 'Сіздің аллергендеріңіз жоқ ✓',
          source: 'structured',
        })
      } else {
        addReason({
          severity: 'safe',
          category: 'allergen',
          text: 'Состав не указан — проверьте упаковку на аллергены',
          textKz: 'Құрамы көрсетілмеген — аллергендерді қаптамадан тексеріңіз',
          source: 'missing_data',
        })
      }
    }
  }

  const hasHealthConditionMissingData = healthConditions.some((hc) => {
    if (hc === 'pku') return isNaN(parseFloat(protein100g)) && !ingredientsRaw.trim()
    if (hc === 'diabetes') return isNaN(parseFloat(sugar100g)) && !ingredientsRaw.trim()
    if (hc === 'celiac') return !ingredientsRaw.trim() && prodAllergens.length === 0
    return !ingredientsRaw.trim()
  })

  const hasDietOrHealthRules =
    customAllergens.length > 0 ||
    hasHealthConditionMissingData ||
    (goals.length > 0 && !ingredientsRaw.trim()) ||
    (Boolean(profile.sugarFree) && isNaN(parseFloat(sugar100g)) && !ingredientsRaw.trim())

  if (
    verdict === 'safe' &&
    hasDietOrHealthRules &&
    reasons.length === 0 &&
    !ingredientsRaw.trim()
  ) {
    addReason({
      severity: 'safe',
      category: 'diet',
      text: 'Состав не указан — проверьте упаковку',
      textKz: 'Құрамы көрсетілмеген — қаптаманы тексеріңіз',
      source: 'missing_data',
    })
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
        textKz: 'Сіздің талғамыңызға сәйкес келеді',
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
    checkedAt: new Date().toISOString(),
  }
}

export async function getAlternatives(product, profile) {
  const priority = profile.priority || 'balanced'
  const baseProducts = []

  const sortFn = (a, b) => {
    if (priority === 'price') return (a.priceKzt || Infinity) - (b.priceKzt || Infinity)
    return 0
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
    return `Дешевле на ${formatPrice((original.priceKzt || 0) - (alt.priceKzt || 0))}`
  }
  return 'Похожий товар'
}

export { formatPrice } from './formatPrice.js'

export {
  getCategoryLabel as getCategoryLabel,
  getSubcategoryLabel as getSubcategoryLabel,
  getAllCategoryKeys as getAllCategoryKeys,
  getSubcategoryKeys as getSubcategoryKeys,
  CATEGORY_ICONS as CATEGORY_ICONS,
  CATEGORIES as CATEGORY_LABELS_MAP,
} from '../domain/product/categoryMap.js'
