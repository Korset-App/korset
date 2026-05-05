import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CATEGORY_SHOWCASE,
  CATEGORY_SHOWCASE_ORDER,
  getCategoryShowcase,
} from '../../src/domain/product/catalogShowcase.js'
import { getAllCategoryKeys } from '../../src/domain/product/categoryMap.js'

test('catalog showcase covers every normalized category', () => {
  const categoryKeys = getAllCategoryKeys()

  assert.equal(Object.keys(CATEGORY_SHOWCASE).length, categoryKeys.length)
  assert.deepEqual([...CATEGORY_SHOWCASE_ORDER].sort(), [...categoryKeys].sort())

  for (const key of categoryKeys) {
    const showcase = getCategoryShowcase(key)

    assert.equal(typeof showcase.image, 'string', `${key} image is missing`)
    assert.match(showcase.image, /^\/catalog-categories\/category-[a-z-]+\.webp$/)
    assert.equal(typeof showcase.variant, 'string', `${key} variant is missing`)
    assert.equal(typeof showcase.tone, 'string', `${key} tone is missing`)
    assert.equal(typeof showcase.textTone, 'string', `${key} text tone is missing`)
  }
})

test('catalog showcase uses a controlled responsive variant set', () => {
  const variants = new Set(Object.values(CATEGORY_SHOWCASE).map((item) => item.variant))

  assert.deepEqual(
    [...variants].sort(),
    ['compact', 'hero', 'portrait', 'wide'].sort()
  )
})

test('catalog showcase keeps the Figma-inspired merchandising order', () => {
  assert.deepEqual(CATEGORY_SHOWCASE_ORDER.slice(0, 8), [
    'dairy_eggs',
    'water_beverages',
    'sweets',
    'meat',
    'tea_coffee',
    'fish',
    'deli',
    'grocery',
  ])
})
