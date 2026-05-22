import test from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeCatalogSearchQuery,
  scoreCatalogSearchProduct,
  sortCatalogSearchProducts,
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
