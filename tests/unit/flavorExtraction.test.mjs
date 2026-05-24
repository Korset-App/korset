import test from 'node:test'
import assert from 'node:assert/strict'

import {
  extractAllAttributes,
  extractFlavorAttribute,
} from '../../src/domain/product/attributeExtractor.js'
import { normalizeGlobalProduct } from '../../src/domain/product/normalizers.js'
import { buildProductCharacteristicSpecs } from '../../src/domain/product/productSpecs.js'

test('extractFlavorAttribute detects explicit savory flavor phrase', () => {
  assert.deepEqual(
    extractFlavorAttribute({
      name: 'ТМ BOMBBAR Кукурузные палочки протеиновые со вкусом "Вяленые томаты" 60 г',
      category: 'snacks',
    }),
    {
      value: 'Вяленые томаты',
      confidence: 'high',
      source: 'explicit_flavor_phrase',
    }
  )
})

test('extractFlavorAttribute detects high-confidence flavor after product context', () => {
  assert.deepEqual(
    extractFlavorAttribute({
      name: 'Напиток Adrenaline тонизирующий апельсин 250 мл',
      category: 'water_beverages',
    }),
    {
      value: 'Апельсин',
      confidence: 'high',
      source: 'known_flavor_token',
    }
  )
})

test('extractFlavorAttribute detects simple compound flavor tokens', () => {
  assert.deepEqual(
    extractFlavorAttribute({
      name: 'Конфеты Merci апельсин и миндаль 100 г',
      category: 'sweets',
    }),
    {
      value: 'Апельсин и миндаль',
      confidence: 'high',
      source: 'compound_known_flavor_tokens',
    }
  )
})

test('extractFlavorAttribute does not confuse product type or brand words with flavor', () => {
  assert.equal(
    extractFlavorAttribute({
      name: 'Яйцо Казгер-Құс С1 куриное, в лотке 30 шт',
      category: 'dairy_eggs',
    }),
    null
  )
  assert.deepEqual(
    extractFlavorAttribute({
      name: 'Сыр Тысяча Озёр творожный с лососем, 140 г',
      category: 'dairy_eggs',
    }),
    {
      value: 'Лосось',
      confidence: 'high',
      source: 'with_known_flavor',
    }
  )
})

test('extractFlavorAttribute keeps ambiguous ingredient-like matches below display confidence', () => {
  assert.deepEqual(
    extractFlavorAttribute({
      name: 'Сосиски Bizhan с сыром, 440 г',
      category: 'deli',
    }),
    {
      value: 'Сыр',
      confidence: 'medium',
      source: 'ambiguous_with_known_flavor',
    }
  )
})

test('extractFlavorAttribute treats cheese as flavor for snacks, not as generic product type', () => {
  assert.deepEqual(
    extractFlavorAttribute({
      name: 'Сухарики Хрусteam барная коллекция сырные палочки 140 г',
      category: 'snacks',
    }),
    {
      value: 'Сыр',
      confidence: 'high',
      source: 'known_flavor_token',
    }
  )
})

test('extractFlavorAttribute keeps catalog multi-word savory flavors', () => {
  assert.deepEqual(
    extractFlavorAttribute({
      name: 'Сыр Тысяча Озёр творожный с маринованными огурчиками и зеленью, 140 г',
      category: 'dairy_eggs',
    }),
    {
      value: 'Огурчики и зелень',
      confidence: 'high',
      source: 'known_flavor_token',
    }
  )
})

test('normalizeGlobalProduct exposes only high-confidence flavor for ProductScreen specs', () => {
  const flavored = normalizeGlobalProduct({
    id: '11111111-1111-4111-8111-111111111114',
    ean: '4660298503605',
    name: 'ТМ BOMBBAR Кукурузные палочки протеиновые со вкусом "Вяленые томаты" 60 г',
    brand: 'Bombbar',
    category: 'snacks',
    subcategory: 'chips',
  })

  const ambiguous = normalizeGlobalProduct({
    id: '11111111-1111-4111-8111-111111111115',
    ean: '4630018742195',
    name: 'Сосиски Bizhan с сыром, 440 г',
    brand: 'Bizhan',
    category: 'deli',
    subcategory: 'sausage',
  })

  assert.equal(flavored.flavor, 'Вяленые томаты')
  assert.equal(flavored.flavorMeta.confidence, 'high')
  assert.equal(ambiguous.flavor, null)
  assert.equal(ambiguous.flavorMeta.confidence, 'medium')
  assert.equal(
    buildProductCharacteristicSpecs(flavored, { lang: 'ru' }).find((row) => row.key === 'flavor')
      ?.value,
    'Вяленые томаты'
  )
  assert.equal(
    buildProductCharacteristicSpecs(ambiguous, { lang: 'ru' }).some((row) => row.key === 'flavor'),
    false
  )
})

test('extractAllAttributes keeps flavor out of database attribute payload for now', () => {
  const attrs = extractAllAttributes({
    name: 'Напиток Adrenaline тонизирующий апельсин 250 мл',
    category: 'water_beverages',
  })

  assert.equal(Object.hasOwn(attrs, 'flavor'), false)
  assert.equal(Object.hasOwn(attrs, 'flavor_meta_json'), false)
})

test('extractAllAttributes adds keto diet tag from product name', () => {
  const attrs = extractAllAttributes({
    name: 'Кето батончик протеиновый без сахара 50 г',
    category: 'healthy',
  })

  const tags = JSON.parse(attrs.diet_tags_json)
  assert.ok(tags.includes('keto'))
})

test('extractAllAttributes adds low_carb diet tag from product name', () => {
  const attrs = extractAllAttributes({
    name: 'Низкоуглеводный протеиновый батончик 50 г',
    category: 'healthy',
  })

  const tags = JSON.parse(attrs.diet_tags_json)
  assert.ok(tags.includes('low_carb'))
})
