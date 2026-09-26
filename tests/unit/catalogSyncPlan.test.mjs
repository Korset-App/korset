import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCatalogSyncPlan } from '../../scripts/utils/catalog-sync-plan.mjs'

test('proposes only missing fields and requires same-EAN photo provenance', () => {
  const local = {
    ean: '1234567890123', category: 'dairy_eggs',
    image_url: 'https://semeiniy.kz/photo.jpg',
    ingredients_raw: 'Молоко, закваска',
    nutriments_json: { energy_kcal: 100, protein_100g: 4, fat_100g: 5, carbohydrates_100g: 6 },
  }
  const remote = { ean: local.ean, image_url: null, ingredients_raw: null, nutriments_json: {} }
  const plan = buildCatalogSyncPlan(local, remote, { sameEanPhoto: true })

  assert.ok(plan)
  assert.equal(plan.image_url, local.image_url)
  assert.equal(plan.ingredients_raw, local.ingredients_raw)
  assert.deepEqual(plan.nutriments_json, local.nutriments_json)
  assert.equal(plan.requiresReview, true)
  assert.equal(plan.category, undefined)
})

test('does not overwrite existing data or transfer unproven external photos', () => {
  const local = {
    ean: '1234567890123', category: 'grocery',
    image_url: 'https://arbuz.kz/other-product.jpg', ingredients_raw: 'New composition',
    nutriments_json: { energy_kcal: 100, protein_100g: 4, fat_100g: 5, carbohydrates_100g: 6 },
  }
  const remote = {
    ean: local.ean, image_url: 'https://cdn.korset.app/verified.webp', ingredients_raw: 'Verified composition',
    nutriments_json: { energy_kcal: 99, protein_100g: 4, fat_100g: 5, carbohydrates_100g: 6 },
  }
  const plan = buildCatalogSyncPlan(local, remote, { sameEanPhoto: false })

  assert.deepEqual(plan, null)
})

test('keeps existing nutrition values and only proposes missing values', () => {
  const local = {
    ean: '1234567890123', category: 'dairy_eggs', image_url: null, ingredients_raw: null,
    nutriments_json: { energy_kcal: 100, protein_100g: 4, fat_100g: 5, carbohydrates_100g: 6 },
  }
  const remote = {
    ean: local.ean, image_url: null, ingredients_raw: null,
    nutriments_json: { energy_kcal: 120, protein_100g: 4 },
  }
  const plan = buildCatalogSyncPlan(local, remote, { sameEanPhoto: false })

  assert.ok(plan)
  assert.deepEqual(plan.nutriments_json, { fat_100g: 5, carbohydrates_100g: 6 })
  assert.equal(plan.nutritionConflict, true)
})
