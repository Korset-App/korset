import test from 'node:test'
import assert from 'node:assert/strict'
import {
  convertKeyboardLayout,
  normalizeSearchInput,
  normalizeKazakhDiacritics,
  buildSearchQueryVariants,
} from '../../src/domain/product/searchNormalization.js'

test('convertKeyboardLayout converts qwerty to cyrillic', () => {
  assert.equal(convertKeyboardLayout('vjkjrj'), 'молоко')
  assert.equal(convertKeyboardLayout('ghbyukc'), 'принглс')
  assert.equal(convertKeyboardLayout('ytcnkt'), 'нестле')
})

test('convertKeyboardLayout converts cyrillic to qwerty', () => {
  assert.equal(convertKeyboardLayout('сникерс'), 'cybrthc')
  assert.equal(convertKeyboardLayout('чипсы'), 'xbgcs')
})

test('normalizeSearchInput cleans punctuation, spaces and ё', () => {
  assert.equal(normalizeSearchInput('  Молоко,  3.2% -  Эмиль! '), 'молоко 3 2% эмиль!')
  assert.equal(normalizeSearchInput('Тёмный шоколад'), 'темный шоколад')
})

test('normalizeKazakhDiacritics replaces kazakh special letters', () => {
  assert.equal(normalizeKazakhDiacritics('сүт'), 'сут')
  assert.equal(normalizeKazakhDiacritics('қаймақ'), 'каймак')
  assert.equal(normalizeKazakhDiacritics('шай'), 'шай')
})

test('buildSearchQueryVariants produces original, layout converted and kazakh normalized variants', () => {
  const variants = buildSearchQueryVariants('vjkjrj')
  assert.ok(variants.includes('vjkjrj'))
  assert.ok(variants.includes('молоко'))

  const kzVariants = buildSearchQueryVariants('сүт')
  assert.ok(kzVariants.includes('сүт'))
  assert.ok(kzVariants.includes('сут'))
})
