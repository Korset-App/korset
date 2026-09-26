import { checkProductFit } from '../../utils/fitCheck.js'
import { analyzeCatalogSearchQuery } from '../product/searchQuality.js'

export const FIT_VERDICT_ORDER = { safe: 0, caution: 1, warning: 2, danger: 3 }

export const CATALOG_SORT_OPTIONS = [
  { id: 'fit', labelKey: 'catalog.sort.fit', iconName: 'SortFitIcon' },
  { id: 'cheap', labelKey: 'catalog.sort.cheap', iconName: 'SortCheapIcon' },
  { id: 'pricey', labelKey: 'catalog.sort.pricey', iconName: 'SortPriceyIcon' },
  { id: 'protein', labelKey: 'catalog.sort.protein', iconName: 'SortProteinIcon' },
  { id: 'sugar', labelKey: 'catalog.sort.sugar', iconName: 'SortSugarIcon' },
]

export function getProductSearchKey(product) {
  return product.globalProductId || product.ean || product.storeProductId || product.canonicalId
}

export function mergeProductsBySearchKey(primary, secondary) {
  const seen = new Set()
  const merged = []
  for (const product of [...primary, ...secondary]) {
    const key = getProductSearchKey(product)
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(product)
  }
  return merged
}

export function getNutrientValue(product, type) {
  if (!product) return null
  let nutrition = product.nutritionPer100 || product.nutriments || product.nutriments_json
  if (!nutrition) return null
  if (typeof nutrition === 'string') {
    try {
      nutrition = JSON.parse(nutrition)
    } catch {
      return null
    }
  }
  if (!nutrition || typeof nutrition !== 'object') return null
  if (type === 'protein') {
    const val = nutrition.protein ?? nutrition.proteins ?? nutrition.proteins_100g
    return val != null ? Number(val) : null
  }
  if (type === 'sugar') {
    const val = nutrition.sugar ?? nutrition.sugars ?? nutrition.sugars_100g
    return val != null ? Number(val) : null
  }
  return null
}

export function getFitSortScore(product, profile) {
  const fit = checkProductFit(product, profile)
  return FIT_VERDICT_ORDER[fit.verdict] ?? (fit.fits ? 0 : 3)
}

export function sortCatalogProducts(products, sort, profile, isSearching) {
  if (products.length <= 1) return products

  if (sort === 'cheap') {
    return [...products].sort((a, b) => (a.priceKzt || 0) - (b.priceKzt || 0))
  }

  if (sort === 'pricey') {
    return [...products].sort((a, b) => (b.priceKzt || 0) - (a.priceKzt || 0))
  }

  if (sort === 'protein') {
    return products
      .map((product) => ({ product, value: getNutrientValue(product, 'protein') ?? 0 }))
      .sort((a, b) => b.value - a.value)
      .map((item) => item.product)
  }

  if (sort === 'sugar') {
    return products
      .map((product) => ({ product, value: getNutrientValue(product, 'sugar') }))
      .sort((a, b) => {
        if (a.value == null && b.value != null) return 1
        if (a.value != null && b.value == null) return -1
        if (a.value == null && b.value == null) return 0
        return a.value - b.value
      })
      .map((item) => item.product)
  }

  return products
    .map((product) => ({
      product,
      fitScore: getFitSortScore(product, profile),
      relevanceTier: product.relevanceTier != null ? product.relevanceTier : 99,
      searchRank: product.searchRank || 0,
    }))
    .sort((a, b) => {
      if (isSearching) {
        if (a.relevanceTier !== b.relevanceTier) return a.relevanceTier - b.relevanceTier
        const rankDiff = b.searchRank - a.searchRank
        if (rankDiff !== 0) return rankDiff
      }

      return a.fitScore - b.fitScore
    })
    .map((item) => item.product)
}

export function buildSearchSuggestions(query) {
  const normalized = query.trim().replace(/\s+/g, ' ')
  const suggestions = []
  const addSuggestion = (value) => {
    const next = value.trim()
    if (next.length >= 2 && next !== normalized && !suggestions.includes(next)) {
      suggestions.push(next)
    }
  }

  if (normalized.includes(' ')) {
    addSuggestion(normalized.split(' ')[0])
  }

  const compactDigits = normalized.replace(/\D/g, '')
  if (compactDigits.length >= 6) {
    addSuggestion(compactDigits)
  }

  const separatorMatch = normalized.match(/^(.+?)[,;:]/)
  if (separatorMatch?.[1]) {
    addSuggestion(separatorMatch[1])
  }

  const sq = analyzeCatalogSearchQuery(normalized)
  if (sq.intent?.category) {
    if (sq.intent.subcategory === 'milk') {
      addSuggestion(normalized + ' 1л')
      addSuggestion(normalized + ' 3.2%')
      addSuggestion(sq.mode === 'product' ? normalized + ' топленое' : normalized)
    } else if (sq.intent.subcategory === 'water') {
      addSuggestion(normalized + ' 1.5л')
      addSuggestion(normalized + ' минеральная')
      addSuggestion(normalized + ' негазированная')
    } else if (sq.intent.subcategory === 'chocolate' || sq.intent.subcategory === 'candy') {
      addSuggestion(normalized + ' молочный')
      addSuggestion(normalized + ' горький')
    }
  }

  return suggestions.slice(0, 3)
}
