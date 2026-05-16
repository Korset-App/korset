import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSafetyNotes,
  getAllergyConfidence,
  getHalalConfidence,
} from '../../src/domain/ai/safetyContract.js'

test('getHalalConfidence returns confirmed halal for trusted halal products', () => {
  assert.deepEqual(
    getHalalConfidence({
      halalStatus: 'yes',
      ingredients: 'milk, sugar',
    }),
    {
      level: 'confirmed_halal',
      priority: 1,
      source: 'trusted_status',
    }
  )
})

test('getHalalConfidence returns likely compatible when visible ingredients have no obvious haram terms', () => {
  assert.deepEqual(
    getHalalConfidence({
      halalStatus: 'unknown',
      ingredients: 'milk, sugar, cocoa butter, vanilla',
    }),
    {
      level: 'likely_compatible',
      priority: 2,
      source: 'visible_ingredients',
    }
  )
})

test('getHalalConfidence returns questionable when ingredient origin matters', () => {
  assert.deepEqual(
    getHalalConfidence({
      halalStatus: 'unknown',
      ingredients: 'sugar, gelatin, flavoring',
    }),
    {
      level: 'questionable',
      priority: 3,
      source: 'ambiguous_ingredients',
      matches: ['gelatin', 'flavoring'],
    }
  )
})

test('getHalalConfidence returns not halal for explicit haram ingredients or status', () => {
  assert.deepEqual(
    getHalalConfidence({
      halalStatus: 'no',
      ingredients: 'water, sugar',
    }),
    {
      level: 'not_halal',
      priority: 4,
      source: 'trusted_status',
    }
  )

  assert.deepEqual(
    getHalalConfidence({
      halalStatus: 'unknown',
      ingredients: 'pork gelatin, sugar',
    }),
    {
      level: 'not_halal',
      priority: 4,
      source: 'haram_ingredients',
      matches: ['pork'],
    }
  )
})

test('getHalalConfidence returns insufficient data when composition is missing', () => {
  assert.deepEqual(
    getHalalConfidence({
      halalStatus: 'unknown',
      ingredients: '',
    }),
    {
      level: 'insufficient_data',
      priority: 5,
      source: 'missing_ingredients',
    }
  )
})

test('getAllergyConfidence flags direct profile allergen matches', () => {
  assert.deepEqual(
    getAllergyConfidence(
      {
        allergens: ['milk', 'soy'],
        ingredients: 'milk, sugar',
      },
      { allergens: ['milk'] }
    ),
    {
      level: 'direct_match',
      source: 'allergen_fields',
      matches: ['milk'],
    }
  )
})

test('getAllergyConfidence asks for package check when user has allergies and ingredients are missing', () => {
  assert.deepEqual(
    getAllergyConfidence(
      {
        allergens: [],
        ingredients: '',
      },
      { allergens: ['peanuts'] }
    ),
    {
      level: 'insufficient_data',
      source: 'missing_ingredients',
      matches: [],
    }
  )
})

test('buildSafetyNotes returns balanced Russian wording without making AI helpless', () => {
  const notes = buildSafetyNotes({
    product: {
      halalStatus: 'unknown',
      ingredients: 'milk, sugar, cocoa butter',
      allergens: [],
    },
    profile: { halalOnly: true, allergens: ['peanuts'] },
    lang: 'ru',
  })

  assert.equal(notes.halal.level, 'likely_compatible')
  assert.match(notes.userNotes.join(' '), /явных запрещённых компонентов не видно/)
  assert.match(notes.userNotes.join(' '), /сертификат не указан/)
  assert.match(notes.userNotes.join(' '), /проверьте упаковку/)
})
