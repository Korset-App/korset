export function summarizeShoppingList(products) {
  const items = Array.isArray(products) ? products : []
  let pricedCount = 0
  let pricedTotalKzt = 0

  for (const product of items) {
    const price = product?.priceKzt
    if (Number.isFinite(price) && price > 0) {
      pricedCount += 1
      pricedTotalKzt += price
    }
  }

  return {
    itemCount: items.length,
    pricedCount,
    missingPriceCount: items.length - pricedCount,
    pricedTotalKzt: pricedCount === items.length ? pricedTotalKzt : null,
    knownSubtotalKzt: pricedTotalKzt,
  }
}
