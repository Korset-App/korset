import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeGlobalProduct } from '../../src/domain/product/normalizers.js'
import { buildProductUnitPrice } from '../../src/domain/product/unitPrice.js'

function product(overrides = {}) {
  const { priceKzt = 1000, ...row } = overrides
  return normalizeGlobalProduct(
    {
      id: row.id || '11111111-1111-4111-8111-111111111116',
      ean: row.ean || '4870000000000',
      name: row.name || 'Test product',
      category: row.category || 'grocery',
      subcategory: row.subcategory || null,
      quantity: row.quantity ?? null,
      ...row,
    },
    { priceKzt }
  )
}

test('buildProductUnitPrice shows per 100 g for comparable packaged solid foods', () => {
  assert.deepEqual(
    buildProductUnitPrice(
      product({
        name: 'DORITOS mexic.s.190 г',
        category: 'snacks',
        quantity: '180 g',
        priceKzt: 900,
      })
    ),
    {
      kind: 'per100',
      value: 500,
      suffix: '100 г',
    }
  )
})

test('buildProductUnitPrice shows per 100 ml for drinks with reliable volume', () => {
  assert.deepEqual(
    buildProductUnitPrice(
      product({
        name: 'Напиток Adrenaline тонизирующий апельсин 250 мл',
        category: 'water_beverages',
        quantity: '250 мл',
        priceKzt: 350,
      })
    ),
    {
      kind: 'per100',
      value: 140,
      suffix: '100 мл',
    }
  )
})

test('buildProductUnitPrice shows per piece only for meaningful count comparisons', () => {
  assert.deepEqual(
    buildProductUnitPrice(
      product({
        name: 'Яйцо Казгер-Құс С1 куриное, в лотке 30 шт',
        category: 'dairy_eggs',
        subcategory: 'eggs',
        quantity: '30 шт',
        priceKzt: 450,
      })
    ),
    {
      kind: 'perUnit',
      value: 15,
      suffix: 'шт',
    }
  )
})

test('buildProductUnitPrice hides unit price for ambiguous single-piece catalog quantity', () => {
  assert.equal(
    buildProductUnitPrice(
      product({
        name: 'Конфеты Merci апельсин и миндаль',
        category: 'sweets',
        subcategory: 'candy',
        quantity: 'шт',
        priceKzt: 550,
      })
    ),
    null
  )
})

test('buildProductUnitPrice hides misleading unit price for spices and non-comparable categories', () => {
  assert.equal(
    buildProductUnitPrice(
      product({
        name: 'Приправа Test для плова, 20 г',
        category: 'sauces_spices',
        subcategory: 'spices',
        quantity: '20 г',
        priceKzt: 400,
      })
    ),
    null
  )

  assert.equal(
    buildProductUnitPrice(
      product({
        name: 'Губка для посуды Test 5 шт',
        category: 'household',
        subcategory: 'cleaning',
        quantity: '5 шт',
        priceKzt: 300,
      })
    ),
    null
  )
})
