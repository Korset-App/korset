import test from 'node:test'
import assert from 'node:assert/strict'
import {
  convertKeyboardLayout,
  normalizeSearchInput,
  normalizeKazakhDiacritics,
  correctGroceryTypos,
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

test('correctGroceryTypos fixes common grocery misspellings in RU and KZ', () => {
  assert.equal(correctGroceryTypos('малако 3.2%'), 'молоко 3.2%')
  assert.equal(correctGroceryTypos('хлеп бородинский'), 'хлеб бородинский')
  assert.equal(correctGroceryTypos('сасиски говяжьи'), 'сосиски говяжьи')
  assert.equal(correctGroceryTypos('печенья к чаю'), 'печенье к чаю')
  assert.equal(correctGroceryTypos('макороны шебекинские'), 'макароны шебекинские')
  assert.equal(correctGroceryTypos('яица с1'), 'яйца с1')
  assert.equal(correctGroceryTypos('падсолнечное масло'), 'подсолнечное масло')
  assert.equal(correctGroceryTypos('сут каймак'), 'сүт қаймақ')
  assert.equal(correctGroceryTypos('молоко эмиль'), 'молоко эмиль')
})

test('buildSearchQueryVariants produces original, layout converted, kazakh and typo variants', () => {
  const variants = buildSearchQueryVariants('vjkjrj')
  assert.ok(variants.includes('vjkjrj'))
  assert.ok(variants.includes('молоко'))

  const kzVariants = buildSearchQueryVariants('сүт')
  assert.ok(kzVariants.includes('сүт'))
  assert.ok(kzVariants.includes('сут'))

  const typoVariants = buildSearchQueryVariants('малако')
  assert.ok(typoVariants.includes('малако'))
  assert.ok(typoVariants.includes('молоко'))

  const breadVariants = buildSearchQueryVariants('хлеп')
  assert.ok(breadVariants.includes('хлеп'))
  assert.ok(breadVariants.includes('хлеб'))
})
