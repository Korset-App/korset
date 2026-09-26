import { checkProductFit } from '../../utils/fitCheck.js'

const COMPLEMENTS = {
  bread: ['dairy_eggs', 'deli', 'sauces_spices'],
  dairy_eggs: ['bread', 'tea_coffee', 'grocery'],
  meat: ['grocery', 'sauces_spices', 'fruits_veg'],
  deli: ['bread', 'sauces_spices', 'fruits_veg'],
  fish: ['grocery', 'sauces_spices', 'fruits_veg'],
  grocery: ['sauces_spices', 'meat', 'fruits_veg'],
  sauces_spices: ['grocery', 'meat', 'fish'],
  tea_coffee: ['sweets', 'dairy_eggs', 'bread'],
  sweets: ['tea_coffee', 'dairy_eggs'],
  snacks: ['water_beverages', 'tea_coffee'],
  water_beverages: ['snacks', 'sweets'],
  fruits_veg: ['dairy_eggs', 'grocery', 'meat'],
  frozen: ['sauces_spices', 'bread'],
  ready_meals: ['water_beverages', 'fruits_veg'],
  healthy: ['fruits_veg', 'dairy_eggs', 'water_beverages'],
}

export function selectShoppingRecommendations({
  items = [],
  catalog = [],
  promotedEans = [],
  profile = {},
  limit = 5,
} = {}) {
  if (!items.length || !catalog.length || limit < 1) return []
  const selectedEans = new Set(items.map((item) => item?.ean).filter(Boolean))
  const promoted = new Set(promotedEans)
  const anchors = items.map((item) => item?.category).filter(Boolean)
  const relevant = []

  for (const product of catalog) {
    if (!product?.ean || selectedEans.has(product.ean)) continue
    if (!['in_stock', 'low_stock'].includes(product.stockStatus)) continue
    if (!Number.isFinite(product.priceKzt) || product.priceKzt <= 0) continue
    let score = 0
    for (const category of anchors) {
      if (COMPLEMENTS[category]?.includes(product.category)) score += 1
    }
    if (score === 0) continue
    relevant.push({ product, score, promoted: promoted.has(product.ean) })
  }

  relevant.sort((a, b) => b.score - a.score || a.product.ean.localeCompare(b.product.ean))
  const organic = []
  const storePicks = []
  for (const entry of relevant) {
    if (entry.promoted ? storePicks.length >= 2 : organic.length >= limit) continue
    if (checkProductFit(entry.product, profile).verdict !== 'safe') continue
    if (entry.promoted) storePicks.push(entry)
    else organic.push(entry)
    if (organic.length >= limit && storePicks.length >= 2) break
  }
  const promotedLimit = Math.min(
    2,
    Math.floor(limit * 0.4),
    storePicks.length,
    Math.floor((organic.length * 2) / 3)
  )
  const chosenOrganic = organic.slice(0, limit - promotedLimit)
  const chosenPromoted = storePicks.slice(0, Math.min(promotedLimit, limit - chosenOrganic.length))
  const result = []
  const organicQueue = [...chosenOrganic]
  const promotedQueue = [...chosenPromoted]
  while (result.length < limit && (organicQueue.length || promotedQueue.length)) {
    if (organicQueue.length) result.push(organicQueue.shift().product)
    if (result.length < limit && promotedQueue.length) result.push(promotedQueue.shift().product)
  }
  return result
}
