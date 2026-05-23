import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeGlobalProduct } from '../../src/domain/product/normalizers.js'
import {
  buildProductScreenSectionKeys,
  hasProductScreenCharacteristics,
} from '../../src/domain/product/productScreenSections.js'

function product(row = {}, overlay = {}) {
  return normalizeGlobalProduct(
    {
      id: row.id || '11111111-1111-4111-8111-111111111117',
      ean: row.ean || '4870000000001',
      name: row.name || 'Test product',
      category: row.category || 'grocery',
      subcategory: row.subcategory || null,
      quantity: row.quantity ?? null,
      description: row.description ?? null,
      ingredients_raw: row.ingredients_raw ?? null,
      nutriments_json: row.nutriments_json ?? null,
      specs_json: row.specs_json ?? null,
      ...row,
    },
    overlay
  )
}

test('buildProductScreenSectionKeys orders characteristics before description', () => {
  const sectionKeys = buildProductScreenSectionKeys(
    product(
      {
        name: 'Йогурт клубничный 2.5% 100 г',
        category: 'dairy_eggs',
        subcategory: 'yogurt',
        description: 'Описание товара.',
        ingredients_raw: 'Молоко, клубника.',
        nutriments_json: {
          energy_kcal: 90,
          protein_100g: 3,
          fat_100g: 2.5,
          carbohydrates_100g: 12,
        },
        specs_json: {
          storage_conditions: 'Хранить при температуре от +2°C до +6°C',
        },
      },
      { priceKzt: 250 }
    ),
    { lang: 'ru' }
  )

  assert.deepEqual(sectionKeys, ['nutrition', 'ingredients', 'characteristics', 'description'])
})

test('hasProductScreenCharacteristics returns false when no reliable characteristic exists', () => {
  assert.equal(
    hasProductScreenCharacteristics(
      product({
        name: 'Test product',
        category: 'unknown_category',
        subcategory: 'raw_internal_code',
      }),
      { lang: 'ru' }
    ),
    false
  )
})

test('hasProductScreenCharacteristics returns true for useful specs or unit price', () => {
  assert.equal(
    hasProductScreenCharacteristics(
      product({
        name: 'Яйцо Test 10 шт',
        category: 'dairy_eggs',
        subcategory: 'eggs',
        quantity: '10 шт',
      }, { priceKzt: 500 }),
      { lang: 'ru' }
    ),
    true
  )

  assert.equal(
    hasProductScreenCharacteristics(
      product({
        name: 'Test product',
        category: 'grocery',
        specs_json: { storage_conditions: 'Хранить в сухом месте' },
      }),
      { lang: 'ru' }
    ),
    true
  )
})
