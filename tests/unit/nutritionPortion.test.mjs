import test from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveNutritionPortion,
  computePortionNutrition,
} from '../../src/domain/product/nutritionPortion.js'

test('resolveNutritionPortion calculates milk 950 ml correctly', () => {
  const product = {
    name: 'Молоко Домик в деревне 3.2% 950 мл',
    category: 'dairy_eggs',
    quantity: '950 мл',
  }
  const portion = resolveNutritionPortion(product)
  assert.ok(portion)
  assert.equal(portion.amount, 950)
  assert.equal(portion.factor, 9.5)
  assert.equal(portion.isLiquid, true)
  assert.equal(portion.isExact100, false)
  assert.equal(portion.displayAmount, '950 мл')
})

test('resolveNutritionPortion calculates small portion (bar 40 g) less than 100 g', () => {
  const product = {
    name: 'Протеиновый батончик 40 г',
    category: 'healthy',
    quantity: '40 г',
  }
  const portion = resolveNutritionPortion(product)
  assert.ok(portion)
  assert.equal(portion.amount, 40)
  assert.equal(portion.factor, 0.4)
  assert.equal(portion.isLiquid, false)
  assert.equal(portion.displayAmount, '40 г')
})

test('resolveNutritionPortion marks 100 g product as isExact100', () => {
  const product = {
    name: 'Шоколад Казахстан 100 г',
    category: 'sweets',
    quantity: '100 г',
  }
  const portion = resolveNutritionPortion(product)
  assert.ok(portion)
  assert.equal(portion.amount, 100)
  assert.equal(portion.factor, 1)
  assert.equal(portion.isExact100, true)
})

test('resolveNutritionPortion handles 1 kg properly', () => {
  const product = {
    name: 'Сахар белый 1 кг',
    category: 'grocery',
    quantity: '1 кг',
  }
  const portion = resolveNutritionPortion(product)
  assert.ok(portion)
  assert.equal(portion.amount, 1000)
  assert.equal(portion.factor, 10)
  assert.equal(portion.isLiquid, false)
  assert.equal(portion.displayAmount, '1 кг')
})

test('resolveNutritionPortion handles 1.5 л beverage', () => {
  const product = {
    name: 'Минеральная вода 1.5 л',
    category: 'water_beverages',
    quantity: '1.5 л',
  }
  const portion = resolveNutritionPortion(product)
  assert.ok(portion)
  assert.equal(portion.amount, 1500)
  assert.equal(portion.factor, 15)
  assert.equal(portion.isLiquid, true)
  assert.equal(portion.displayAmount, '1,5 л')
})

test('resolveNutritionPortion returns null for bulk items (by weight)', () => {
  const product = {
    name: 'Бананы фасованные за кг',
    category: 'fruits_veg',
    quantityParsed: {
      value: 1,
      unit: 'кг',
      unitType: 'weight',
      isWeightByWeight: true,
    },
  }
  const portion = resolveNutritionPortion(product)
  assert.equal(portion, null)
})

test('resolveNutritionPortion returns null for non-food items', () => {
  const product = {
    name: 'Порошок стиральный 450 г',
    category: 'household',
    quantity: '450 г',
  }
  const portion = resolveNutritionPortion(product)
  assert.equal(portion, null)
})

test('resolveNutritionPortion returns null for pieces without weight', () => {
  const product = {
    name: 'Яйцо куриное С1 10 шт',
    category: 'dairy_eggs',
    quantity: '10 шт',
  }
  const portion = resolveNutritionPortion(product)
  assert.equal(portion, null)
})

test('computePortionNutrition accurately scales macros and calories', () => {
  const baseNutrition = {
    kcal: 60,
    protein: 3.0,
    fat: 3.2,
    carbs: 4.7,
    sugar: 4.7,
    salt: 0.1,
  }
  const portionInfo = {
    factor: 9.5,
    amount: 950,
    displayAmount: '950 мл',
    isLiquid: true,
  }

  const scaled = computePortionNutrition(baseNutrition, portionInfo, 'whole')
  assert.equal(scaled._isPortion, true)
  assert.equal(scaled.kcal, 570)
  assert.equal(scaled.protein, 28.5)
  assert.equal(scaled.fat, 30.4)
  assert.equal(scaled.carbs, 44.7)
  assert.equal(scaled.sugar, 44.7)
  assert.equal(scaled.salt, 1.0)
  assert.deepEqual(scaled._base100, baseNutrition)

  // In '100' mode, values remain standard
  const standard = computePortionNutrition(baseNutrition, portionInfo, '100')
  assert.equal(standard._isPortion, false)
  assert.equal(standard.kcal, 60)
  assert.equal(standard.protein, 3.0)
})

test('computePortionNutrition scales small items (<100g) correctly', () => {
  const baseNutrition = {
    kcal: 400,
    protein: 20.0,
    fat: 15.0,
    carbs: 40.0,
    sugar: 5.0,
    salt: 0.5,
  }
  const portionInfo = {
    factor: 0.4, // 40 g
    amount: 40,
    displayAmount: '40 г',
    isLiquid: false,
  }

  const scaled = computePortionNutrition(baseNutrition, portionInfo, 'whole')
  assert.equal(scaled.kcal, 160)
  assert.equal(scaled.protein, 8.0)
  assert.equal(scaled.fat, 6.0)
  assert.equal(scaled.carbs, 16.0)
  assert.equal(scaled.sugar, 2.0)
  assert.equal(scaled.salt, 0.2)
})
