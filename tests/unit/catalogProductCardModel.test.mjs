import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildCatalogProductCardBadges,
  getCatalogProductCardKcal,
} from '../../src/domain/catalog/catalogProductCardModel.js'

const dict = {
  'catalog.badge.halal': 'Халал',
  'catalog.badge.sugarFree': 'Без сахара',
  'catalog.badge.glutenFree': 'Без глютена',
  'catalog.badge.lactoseFree': 'Без лактозы',
  'catalog.badge.vegan': 'Веган',
  'catalog.badge.keto': 'Кето',
  'catalog.badge.kcal': '{{value}} ккал',
}

function t(key, vars = {}) {
  return (dict[key] || key).replace('{{value}}', String(vars.value ?? ''))
}

test('buildCatalogProductCardBadges returns all positive product attributes', () => {
  const badges = buildCatalogProductCardBadges(
    {
      halalStatus: 'yes',
      dietTags: ['sugar_free', 'gluten_free', 'lactose_free', 'vegan', 'keto'],
    },
    t
  )

  assert.deepEqual(
    badges.map((badge) => badge.id),
    ['halal', 'sugar_free', 'gluten_free', 'lactose_free', 'vegan', 'keto']
  )
  assert.equal(badges[0].label, 'Халал')
  assert.equal(badges[1].label, 'Без сахара')
  assert.equal(badges[5].label, 'Кето')
})

test('buildCatalogProductCardBadges treats low carb as keto badge', () => {
  const badges = buildCatalogProductCardBadges(
    {
      dietTags: ['low_carb'],
    },
    t
  )

  assert.deepEqual(
    badges.map((badge) => badge.id),
    ['keto']
  )
})

test('buildCatalogProductCardBadges does not render empty or negative attributes', () => {
  const badges = buildCatalogProductCardBadges(
    {
      halalStatus: 'unknown',
      dietTags: ['contains_sugar', 'contains_dairy'],
    },
    t
  )

  assert.deepEqual(badges, [])
})

test('getCatalogProductCardKcal reads normalized and raw nutrition kcal', () => {
  assert.equal(getCatalogProductCardKcal({ nutritionPer100: { kcal: 54.4 } }), 54)
  assert.equal(
    getCatalogProductCardKcal({ nutriments_json: JSON.stringify({ energy_kcal_100g: 289 }) }),
    289
  )
  assert.equal(getCatalogProductCardKcal({ nutritionPer100: { kcal: 0 } }), null)
})
