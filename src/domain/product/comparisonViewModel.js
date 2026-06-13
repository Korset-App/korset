import { extractFlavorAttribute } from './attributeExtractor.js'
import { getSubcategoryLabel } from './categoryMap.js'
import { computePricePerUnit, getDisplayQuantity } from '../../utils/parseQuantity.js'
import { formatPrice } from '../../utils/formatPrice.js'

function cleanText(value) {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  return trimmed || null
}

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function formatNumber(value) {
  const number = numberValue(value)
  if (number === null) return null
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(number)
}

function formatGrams(value) {
  const formatted = formatNumber(value)
  return formatted ? `${formatted} г` : null
}

function formatKcal(value) {
  const formatted = formatNumber(value)
  return formatted ? `${formatted} ккал` : null
}

function winnerByLower(valueA, valueB) {
  const a = numberValue(valueA)
  const b = numberValue(valueB)
  if (a === null || b === null || a === b) return null
  return a < b ? 'A' : 'B'
}

function winnerByHigher(valueA, valueB) {
  const a = numberValue(valueA)
  const b = numberValue(valueB)
  if (a === null || b === null || a === b) return null
  return a > b ? 'A' : 'B'
}

function getQuantityValue(product, lang) {
  return cleanText(getDisplayQuantity(product, lang))
}

function getLocalizedLabel(labels, lang) {
  return lang === 'kz' ? labels.kz : labels.ru
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[«»"“”]/g, ' ')
    .replace(/[.,;:()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getSpecificProductType(product, lang) {
  const name = normalizeSearchText(product?.name)
  const subcategory = cleanText(product?.subcategory)
  if (
    subcategory === 'gum' ||
    /\b(?:dirol|orbit|wrigley|eclipse|stimorol)\b/i.test(name) ||
    /жевательн/.test(name)
  ) {
    return getLocalizedLabel({ ru: 'Жевательная резинка', kz: 'Сағыз' }, lang)
  }
  if (/\b(?:halls)\b/i.test(name) || /леденц|карамел/.test(name)) {
    return getLocalizedLabel({ ru: 'Леденцы', kz: 'Мұзкәмпит' }, lang)
  }
  return null
}

function getTypeValue(product, lang) {
  const specificType = getSpecificProductType(product, lang)
  if (specificType) return specificType
  const subcategory = cleanText(product?.subcategory)
  if (!subcategory) return null
  return cleanText(getSubcategoryLabel(product?.category, subcategory, lang)) || subcategory
}

function normalizeFlavorValue(value) {
  const cleaned = cleanText(value)
  if (!cleaned) return null
  const normalized = cleaned
    .replace(/оригинальным/i, 'оригинальный')
    .replace(/мятным/i, 'мятный')
    .trim()
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase()
}

function extractCompareFlavorFromName(name) {
  const text = cleanText(name)
  if (!text) return null
  if (/морозн\w*\s+мят/i.test(text)) return 'Морозная мята'
  const explicitBeforeTaste = text.match(/(?:с|со)\s+([^,()]+?)\s+вкусом/i)
  if (explicitBeforeTaste) return normalizeFlavorValue(explicitBeforeTaste[1])
  if (/\bмят/i.test(text)) return 'Мята'
  return null
}

function getFlavorValue(product) {
  return (
    cleanText(product?.flavorMeta?.value) ||
    cleanText(product?.flavor) ||
    cleanText(product?.specs?.flavor) ||
    extractCompareFlavorFromName(product?.name) ||
    cleanText(extractFlavorAttribute({ name: product?.name, category: product?.category })?.value)
  )
}

function getUnitPrice(product) {
  const quantityInput =
    product?.quantityParsed || product?.quantity || product?.specs?.weight || product?.name
  return computePricePerUnit(product?.priceKzt, quantityInput)
}

function formatUnitPrice(unitPrice) {
  if (!unitPrice) return null
  if (unitPrice.per100 != null) return `${formatPrice(unitPrice.per100)} / ${unitPrice.suffix}`
  if (unitPrice.perUnit != null)
    return `${formatPrice(unitPrice.perUnit)} / ${unitPrice.unitSuffix}`
  return null
}

function getNutrition(product) {
  return product?.nutritionPer100 || product?.nutrition || product?.nutriments || {}
}

function getHalalValue(product) {
  if (product?.halalStatus === 'yes') return { key: 'compare.halalYes', rank: 2 }
  if (product?.halalStatus === 'no') return { key: 'compare.halalNo', rank: 0 }
  return { key: 'compare.halalUnk', rank: 1 }
}

function getStockValue(product) {
  if (product?.stockStatus === 'in_stock') return { key: 'compare.stock.inStock', rank: 3 }
  if (product?.stockStatus === 'low_stock') return { key: 'compare.stock.lowStock', rank: 2 }
  if (product?.stockStatus === 'out_of_stock') return { key: 'compare.stock.outOfStock', rank: 0 }
  return { key: 'compare.stock.unknown', rank: 1 }
}

function winnerByRank(valueA, valueB) {
  if (!valueA || !valueB || valueA.rank === valueB.rank) return null
  return valueA.rank > valueB.rank ? 'A' : 'B'
}

function maybePushRow(rows, row) {
  const hasA = row.valueA || row.valueAKey
  const hasB = row.valueB || row.valueBKey
  if (!hasA && !hasB) return
  rows.push(row)
}

function buildProductDataRows(productA = {}, productB = {}, { lang = 'ru' } = {}) {
  const rows = []
  const typeA = getTypeValue(productA, lang)
  const typeB = getTypeValue(productB, lang)
  const unitA = getUnitPrice(productA)
  const unitB = getUnitPrice(productB)
  const halalA = getHalalValue(productA)
  const halalB = getHalalValue(productB)
  const stockA = getStockValue(productA)
  const stockB = getStockValue(productB)
  const nutritionA = getNutrition(productA)
  const nutritionB = getNutrition(productB)

  maybePushRow(rows, {
    id: 'type',
    labelKey: 'compare.row.type',
    valueA: typeA,
    valueB: typeB,
    winnerSide: null,
  })
  maybePushRow(rows, {
    id: 'quantity',
    labelKey: 'compare.row.quantity',
    valueA: getQuantityValue(productA, lang),
    valueB: getQuantityValue(productB, lang),
    winnerSide: null,
  })
  maybePushRow(rows, {
    id: 'flavor',
    labelKey: 'compare.row.flavor',
    valueA: getFlavorValue(productA),
    valueB: getFlavorValue(productB),
    winnerSide: null,
  })
  maybePushRow(rows, {
    id: 'price',
    labelKey: 'compare.row.price',
    valueA: productA?.priceKzt != null ? formatPrice(productA.priceKzt) : null,
    valueB: productB?.priceKzt != null ? formatPrice(productB.priceKzt) : null,
    winnerSide: winnerByLower(productA?.priceKzt, productB?.priceKzt),
  })
  maybePushRow(rows, {
    id: 'unit_price',
    labelKey: 'compare.row.unitPrice',
    valueA: formatUnitPrice(unitA),
    valueB: formatUnitPrice(unitB),
    winnerSide: winnerByLower(unitA?.per100 ?? unitA?.perUnit, unitB?.per100 ?? unitB?.perUnit),
  })
  maybePushRow(rows, {
    id: 'halal',
    labelKey: 'compare.row.halal',
    valueAKey: halalA.key,
    valueBKey: halalB.key,
    winnerSide: winnerByRank(halalA, halalB),
  })
  maybePushRow(rows, {
    id: 'availability',
    labelKey: 'compare.row.availability',
    valueAKey: stockA.key,
    valueBKey: stockB.key,
    winnerSide: winnerByRank(stockA, stockB),
  })
  maybePushRow(rows, {
    id: 'kcal',
    labelKey: 'compare.row.kcal',
    valueA: formatKcal(nutritionA.kcal),
    valueB: formatKcal(nutritionB.kcal),
    winnerSide: winnerByLower(nutritionA.kcal, nutritionB.kcal),
  })
  maybePushRow(rows, {
    id: 'sugar',
    labelKey: 'compare.row.sugar',
    valueA: formatGrams(nutritionA.sugar),
    valueB: formatGrams(nutritionB.sugar),
    winnerSide: winnerByLower(nutritionA.sugar, nutritionB.sugar),
  })
  maybePushRow(rows, {
    id: 'protein',
    labelKey: 'compare.row.protein',
    valueA: formatGrams(nutritionA.protein),
    valueB: formatGrams(nutritionB.protein),
    winnerSide: winnerByHigher(nutritionA.protein, nutritionB.protein),
  })
  maybePushRow(rows, {
    id: 'fat',
    labelKey: 'compare.row.fat',
    valueA: formatGrams(nutritionA.fat),
    valueB: formatGrams(nutritionB.fat),
    winnerSide: winnerByLower(nutritionA.fat, nutritionB.fat),
  })
  maybePushRow(rows, {
    id: 'salt',
    labelKey: 'compare.row.salt',
    valueA: formatGrams(nutritionA.salt ?? nutritionA.sodium),
    valueB: formatGrams(nutritionB.salt ?? nutritionB.sodium),
    winnerSide: winnerByLower(
      nutritionA.salt ?? nutritionA.sodium,
      nutritionB.salt ?? nutritionB.sodium
    ),
  })
  maybePushRow(rows, {
    id: 'fiber',
    labelKey: 'compare.row.fiber',
    valueA: formatGrams(nutritionA.fiber),
    valueB: formatGrams(nutritionB.fiber),
    winnerSide: winnerByHigher(nutritionA.fiber, nutritionB.fiber),
  })

  return rows
}

function hasArrayItems(value) {
  return Array.isArray(value) && value.length > 0
}

function hasProfileSignals(profile = {}) {
  return Boolean(
    profile.halal ||
    profile.halalOnly ||
    profile.halalStrict ||
    hasArrayItems(profile.allergens) ||
    hasArrayItems(profile.customAllergens) ||
    hasArrayItems(profile.dietGoals) ||
    hasArrayItems(profile.healthConditions) ||
    profile.sugarFree
  )
}

function getStatus(comparison = {}) {
  if (comparison.isComparable === false) return 'blocked'
  if (comparison.winner === 'draw') return 'draw'
  return 'winner'
}

function getVerdictKey(status, comparison = {}) {
  if (status === 'blocked') return 'compare.verdict.blocked'
  if (status === 'draw') return 'compare.verdict.draw'
  if (comparison.confidence === 'preliminary') return 'compare.verdict.preliminary'
  return 'compare.verdict.winner'
}

function getProfileNote(comparison = {}, profile = {}) {
  if (!hasProfileSignals(profile)) {
    return {
      type: 'setup',
      messageKey: 'compare.profile.setupPrompt',
    }
  }

  const perspective = comparison.profilePerspective
  if (
    perspective?.winner &&
    perspective.winner !== 'draw' &&
    perspective.winner !== comparison.winner
  ) {
    return {
      type: 'diverges',
      winnerSide: perspective.winner,
      reason: perspective.reason,
      messageKey: 'compare.profile.differs',
    }
  }

  return null
}

function getFactorLabelKey(reason) {
  if (reason === 'safety') return 'compare.factor.safety'
  if (reason === 'halal') return 'compare.factor.halal'
  if (reason === 'availability') return 'compare.factor.availability'
  if (reason === 'nutrition') return 'compare.factor.nutrition'
  if (reason === 'value') return 'compare.factor.value'
  if (reason === 'price') return 'compare.factor.price'
  if (reason === 'data') return 'compare.factor.data'
  if (reason === 'category_mismatch') return 'compare.factor.category'
  return 'compare.factor.similar'
}

function buildTopFactors(comparison = {}) {
  const factors = []
  if (comparison.primaryReason) {
    factors.push({
      id: comparison.primaryReason,
      winnerSide: comparison.winner === 'draw' ? null : comparison.winner,
      labelKey: getFactorLabelKey(comparison.primaryReason),
      reasonKey: comparison.summaryKey ? `compare.reason.${comparison.summaryKey}` : null,
    })
  }

  if (comparison.dataCoverage?.level && comparison.dataCoverage.level !== 'high') {
    factors.push({
      id: `data_${comparison.dataCoverage.level}`,
      winnerSide: null,
      labelKey: 'compare.factor.data',
      reasonKey: `compare.data.${comparison.dataCoverage.level}`,
    })
  }

  return factors
}

function getDataNote(comparison = {}) {
  const level = comparison.dataCoverage?.level
  if (!level || level === 'high') return null
  return {
    level,
    missing: comparison.dataCoverage.missing || [],
    messageKey: `compare.data.${level}`,
  }
}

function buildSections(comparison = {}) {
  return [
    {
      id: 'decision',
      titleKey: 'compare.section.decision',
      factorIds: [comparison.primaryReason].filter(Boolean),
    },
    {
      id: 'profile',
      titleKey: 'compare.section.profile',
      factorIds: [comparison.profilePerspective?.reason].filter(Boolean),
    },
    {
      id: 'data',
      titleKey: 'compare.section.data',
      factorIds: comparison.dataCoverage?.missing || [],
    },
  ]
}

export function buildProductComparisonViewModel({
  productA,
  productB,
  comparison,
  profile,
  lang = 'ru',
} = {}) {
  const status = getStatus(comparison)
  const winnerSide = status === 'winner' ? comparison?.winner || null : null

  return {
    status,
    winnerSide,
    loserSide: winnerSide === 'A' ? 'B' : winnerSide === 'B' ? 'A' : null,
    confidence: comparison?.confidence || 'draw',
    verdictKey: getVerdictKey(status, comparison),
    reasonKey: comparison?.summaryKey ? `compare.reason.${comparison.summaryKey}` : null,
    actionKey: status === 'blocked' ? 'compare.action.findSameCategory' : null,
    productRefs: {
      A: productA?.ean || null,
      B: productB?.ean || null,
    },
    profileNote: getProfileNote(comparison, profile),
    dataNote: getDataNote(comparison),
    dataRows: buildProductDataRows(productA, productB, { lang }),
    topFactors: buildTopFactors(comparison),
    sections: buildSections(comparison),
  }
}
