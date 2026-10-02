import test from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeCatalogSearchQuery,
  scoreCatalogSearchProduct,
  sortCatalogSearchProducts,
  extractAttributeIntent,
  getEffectiveSearchQuery,
} from '../../src/domain/product/searchQuality.js'

test('analyzeCatalogSearchQuery normalizes text, aliases, intent, mode, and quantity', () => {
  const milk = analyzeCatalogSearchQuery('  Молоко 1000мл  ')
  assert.equal(milk.normalized, 'молоко 1000 мл')
  assert.equal(milk.mode, 'product')
  assert.equal(milk.intent.category, 'dairy_eggs')
  assert.equal(milk.intent.subcategory, 'milk')
  assert.deepEqual(milk.quantity, { unitType: 'volume', baseValue: 1000, display: '1000 мл' })
  assert.ok(milk.tokens.includes('молоко'))

  const snickers = analyzeCatalogSearchQuery('сникерс')
  assert.equal(snickers.mode, 'product')
  assert.equal(snickers.intent.category, 'sweets')
  assert.equal(snickers.intent.subcategory, 'chocolate')
  assert.ok(snickers.aliasTokens.includes('snickers'))

  const halal = analyzeCatalogSearchQuery('халал сосиски')
  assert.equal(halal.mode, 'attribute')
  assert.equal(halal.attribute, 'halal')

})

test('scoreCatalogSearchProduct ranks direct product intent above accidental text matches', () => {
  const query = analyzeCatalogSearchQuery('молоко')
  const milk = scoreCatalogSearchProduct(query, {
    name: 'Молоко Эмиль 3.2% 1 л',
    brand: 'Эмиль',
    category: 'dairy_eggs',
    subcategory: 'milk',
    quantity: '1 л',
  })
  const chocolate = scoreCatalogSearchProduct(query, {
    name: 'Шоколад молочный Alpen Gold',
    brand: 'Alpen Gold',
    category: 'sweets',
    subcategory: 'chocolate',
  })

  assert.ok(milk.score > chocolate.score)
  assert.ok(milk.relevanceTier < chocolate.relevanceTier)
  assert.equal(milk.matchType, 'intent_subcategory')
})

test('scoreCatalogSearchProduct boosts matching quantities without requiring them', () => {
  const query = analyzeCatalogSearchQuery('молоко 1л')
  const oneLiter = scoreCatalogSearchProduct(query, {
    name: 'Молоко Эмиль 3.2% 1 л',
    brand: 'Эмиль',
    category: 'dairy_eggs',
    subcategory: 'milk',
    quantity: '1000 мл',
  })
  const halfLiter = scoreCatalogSearchProduct(query, {
    name: 'Молоко Домик в деревне 3.2% 500 мл',
    brand: 'Домик в деревне',
    category: 'dairy_eggs',
    subcategory: 'milk',
    quantity: '500 мл',
  })

  assert.ok(oneLiter.score > halfLiter.score)
  assert.ok(oneLiter.matchedQuantity)
  assert.ok(halfLiter.score > 0)
})

test('scoreCatalogSearchProduct handles token order, brand/product combinations, and common typos', () => {
  const query = analyzeCatalogSearchQuery('молоко Эмиль топленное')
  const branded = scoreCatalogSearchProduct(query, {
    name: 'Эмиль Молоко топленое 4% 1 л',
    brand: 'Эмиль',
    category: 'dairy_eggs',
    subcategory: 'milk',
    quantity: '1 л',
  })
  const fallback = scoreCatalogSearchProduct(query, {
    name: 'Молоко топлёное 3.2% 1 л',
    brand: 'Другой бренд',
    category: 'dairy_eggs',
    subcategory: 'milk',
    quantity: '1 л',
  })

  assert.ok(branded.score > fallback.score)
  assert.ok(branded.matchedTokens >= fallback.matchedTokens)
  assert.equal(branded.matchType, 'brand_product')
  assert.ok(fallback.score > 0)
})

test('sortCatalogSearchProducts uses search relevance before Fit-Check score', () => {
  const query = analyzeCatalogSearchQuery('молоко')
  const products = [
    {
      name: 'Шоколад молочный без сахара',
      category: 'sweets',
      subcategory: 'chocolate',
      fitScore: 0,
    },
    {
      name: 'Молоко 3.2%',
      category: 'dairy_eggs',
      subcategory: 'milk',
      fitScore: 3,
    },
  ]

  const sorted = sortCatalogSearchProducts(products, query, (product) => product.fitScore)
  assert.equal(sorted[0].name, 'Молоко 3.2%')
})

test('scoreCatalogSearchProduct supports conservative attribute matching', () => {
  const query = analyzeCatalogSearchQuery('без сахара')
  const tagged = scoreCatalogSearchProduct(query, {
    name: 'Печенье без сахара',
    category: 'healthy',
    subcategory: 'sugar_free',
    tags: ['без сахара'],
    dietTags: ['sugar_free'],
  })
  const accidental = scoreCatalogSearchProduct(query, {
    name: 'Сахар белый',
    category: 'grocery',
    subcategory: 'sugar',
    ingredients: 'сахар',
  })

  assert.equal(tagged.matchType, 'attribute_tag')
  assert.ok(tagged.score > accidental.score)
})

test('extractAttributeIntent decouples dietary properties in RU and KZ', () => {
  const halal = extractAttributeIntent('халал сосиски')
  assert.equal(halal.attribute, 'halal')
  assert.equal(halal.cleanQuery, 'сосиски')

  const halalSuffix = extractAttributeIntent('сосиски халал')
  assert.equal(halalSuffix.attribute, 'halal')
  assert.equal(halalSuffix.cleanQuery, 'сосиски')

  const halyal = extractAttributeIntent('халяль курица')
  assert.equal(halyal.attribute, 'halal')
  assert.equal(halyal.cleanQuery, 'курица')

  const sugarFree = extractAttributeIntent('печенье без сахара')
  assert.equal(sugarFree.attribute, 'sugar_free')
  assert.equal(sugarFree.cleanQuery, 'печенье')

  const sugarFreeKz = extractAttributeIntent('қантсыз печенье')
  assert.equal(sugarFreeKz.attribute, 'sugar_free')
  assert.equal(sugarFreeKz.cleanQuery, 'печенье')

  const lactoseFree = extractAttributeIntent('безлактозное молоко')
  assert.equal(lactoseFree.attribute, 'lactose_free')
  assert.equal(lactoseFree.cleanQuery, 'молоко')

  const glutenFree = extractAttributeIntent('хлеб без глютена')
  assert.equal(glutenFree.attribute, 'gluten_free')
  assert.equal(glutenFree.cleanQuery, 'хлеб')

  const pureAttribute = extractAttributeIntent('халал')
  assert.equal(pureAttribute.attribute, 'halal')
  assert.equal(pureAttribute.cleanQuery, '')

  const noAttribute = extractAttributeIntent('молоко эмиль')
  assert.equal(noAttribute.attribute, null)
  assert.equal(noAttribute.cleanQuery, 'молоко эмиль')
})

test('getEffectiveSearchQuery extracts clean search query or corrects typos for server RPC', () => {
  assert.equal(getEffectiveSearchQuery('халал сосиски'), 'сосиски')
  assert.equal(getEffectiveSearchQuery('сосиски халал'), 'сосиски')
  assert.equal(getEffectiveSearchQuery('печенье без сахара'), 'печенье')
  assert.equal(getEffectiveSearchQuery('малако'), 'молоко')
  assert.equal(getEffectiveSearchQuery('малако 3.2%'), 'молоко 3 2%')
  assert.equal(getEffectiveSearchQuery('хлеп'), 'хлеб')
  assert.equal(getEffectiveSearchQuery('халал'), 'халал')
  assert.equal(getEffectiveSearchQuery('молоко'), 'молоко')
})

test('scoreCatalogSearchProduct boosts verified attribute matches and excludes irrelevant products', () => {
  const query = analyzeCatalogSearchQuery('халал сосиски')

  const halalSausage = scoreCatalogSearchProduct(query, {
    name: 'Сосиски Султан Говяжьи 450г',
    category: 'deli',
    subcategory: 'sausage',
    halalStatus: 'verified',
  })

  const regularSausage = scoreCatalogSearchProduct(query, {
    name: 'Сосиски Докторские 450г',
    category: 'deli',
    subcategory: 'sausage',
    halalStatus: 'unknown',
  })

  const halalMilk = scoreCatalogSearchProduct(query, {
    name: 'Молоко Эмиль 3.2% 1л',
    category: 'dairy_eggs',
    subcategory: 'milk',
    halalStatus: 'verified',
  })

  assert.ok(halalSausage.score > regularSausage.score)
  assert.equal(halalSausage.relevanceTier, 1)
  assert.equal(halalMilk.score, 0) // Disqualified: milk does not match sausage query
})

test('sortCatalogSearchProducts handles typos and attribute filters synergy', () => {
  const products = [
    {
      name: 'Сосиски Докторские Мираторг',
      category: 'deli',
      subcategory: 'sausage',
      halalStatus: 'unknown',
    },
    {
      name: 'Сосиски Мусульманские Халал',
      category: 'deli',
      subcategory: 'sausage',
      halalStatus: 'verified',
    },
    {
      name: 'Шоколад молочный без сахара',
      category: 'sweets',
      subcategory: 'chocolate',
      halalStatus: 'verified',
    },
  ]

  // User typed with typo "сасиски" + attribute "халал"
  const sorted = sortCatalogSearchProducts(products, 'сасиски халал')

  assert.equal(sorted.length, 2) // chocolate is excluded
  assert.equal(sorted[0].name, 'Сосиски Мусульманские Халал')
  assert.equal(sorted[1].name, 'Сосиски Докторские Мираторг')
})

test('scoreCatalogSearchProduct does not match products containing palm oil when searching "без пальмового масла"', () => {
  const query = analyzeCatalogSearchQuery('печенье без пальмового масла')
  const withPalmOil = scoreCatalogSearchProduct(query, {
    name: 'Печенье сахарное',
    category: 'sweets',
    subcategory: 'cookies',
    ingredients: 'Мука пшеничная, сахар, пальмовое масло, вода',
  })
  const withoutPalmOil = scoreCatalogSearchProduct(query, {
    name: 'Печенье овсяное на сливочном масле',
    category: 'sweets',
    subcategory: 'cookies',
    ingredients: 'Мука овсяная, масло сливочное, сахар, яйца',
  })

  assert.equal(withPalmOil.attributeMatch, false)
  assert.equal(withoutPalmOil.attributeMatch, true)
  assert.ok(withoutPalmOil.score > withPalmOil.score)
})
