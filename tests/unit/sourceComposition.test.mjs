import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { URL } from 'node:url'
import { extractSourceCompositions } from '../../src/domain/catalog/sourceComposition.js'

test('ignores company history that uses состав as an ordinary noun', () => {
  assert.deepEqual(extractSourceCompositions({ description: 'В состав компании «Славянка» вошли предприятия.' }), {
    ru: null,
    kz: null,
  })
  assert.equal(extractSourceCompositions({ description: 'Продукт в составе набора.' }).ru, null)
})

test('extracts standalone Russian and Kazakh labels without losing warnings', () => {
  const result = extractSourceCompositions({
    description: 'Состав: сахар, какао (эмульгатор E322 (соевый лецитин)). Может содержать следы молока. Не содержит глютен. Құрамы: қант, какао. Сүт іздері болуы мүмкін. Пищевая ценность: 500 ккал.',
  })
  assert.equal(result.ru, 'сахар, какао (эмульгатор E322 (соевый лецитин)). Может содержать следы молока. Не содержит глютен.')
  assert.equal(result.kz, 'қант, какао. Сүт іздері болуы мүмкін.')
})

test('plain shelf-life wording inside the recipe is retained', () => {
  assert.equal(
    extractSourceCompositions({ description: 'Состав: молоко, закваска. После вскрытия срок годности сокращается до суток. Условия хранения: 2–6 °C.' }).ru,
    'молоко, закваска. После вскрытия срок годности сокращается до суток.',
  )
})

test('retains allergen warning and negation after a single ingredient', () => {
  assert.equal(
    extractSourceCompositions({ description: 'Состав: молоко. Может содержать следы сои. Не содержит глютен.' }).ru,
    'молоко. Может содержать следы сои. Не содержит глютен.',
  )
})

test('accepts only exact normalized feature keys', () => {
  const result = extractSourceCompositions({ features: [
    [' Особенности состава ', 'для здорового роста и развития'],
    ['СОСТАВ:', 'Молоко, закваска.'],
    [' ҚҰРАМЫ ', 'Сүт, ашытқы.'],
  ] })
  assert.equal(result.ru, 'Молоко, закваска.')
  assert.equal(result.kz, 'Сүт, ашытқы.')
})

test('identical feature values from embedded data and table are one candidate', () => {
  const result = extractSourceCompositions({ features: [
    ['состав', 'Сахар, какао.'],
    ['СОСТАВ:', ' сахар,   какао '],
    ['құрамы', 'Қант, какао.'],
    ['ҚҰРАМЫ', 'қант, какао'],
  ] })
  assert.equal(result.ru, 'Сахар, какао.')
  assert.equal(result.kz, 'Қант, какао.')
})

test('conflicting duplicate feature values remain unknown', () => {
  const result = extractSourceCompositions({ features: [
    ['состав', 'сахар, какао'], ['состав', 'сахар, молоко'],
    ['құрамы', 'қант, какао'], ['құрамы', 'қант, сүт'],
  ] })
  assert.equal(result.ru, null)
  assert.equal(result.kz, null)
})

test('metadata wording inside nested parentheses or quotes is part of the recipe', () => {
  const result = extractSourceCompositions({
    description: 'Состав: молоко, добавка (смесь (примечание. Срок годности: зависит от хранения)), ароматизатор «Примечание. Условия хранения: указаны отдельно». Может содержать сою. Условия хранения: холодное место.',
  })
  assert.equal(result.ru, 'молоко, добавка (смесь (примечание. Срок годности: зависит от хранения)), ароматизатор «Примечание. Условия хранения: указаны отдельно». Может содержать сою.')
})

test('straight quoted metadata wording does not end the recipe', () => {
  const result = extractSourceCompositions({
    description: 'Состав: молоко, ароматизатор "Примечание. Условия хранения: указаны отдельно". Может содержать сою. Условия хранения: холодное место.',
  })
  assert.equal(result.ru, 'молоко, ароматизатор "Примечание. Условия хранения: указаны отдельно". Может содержать сою.')
})

test('feature metadata heading on a new line ends the ingredient value', () => {
  assert.equal(extractSourceCompositions({
    features: [['состав', 'молоко, сахар\nУсловия хранения: холод']],
  }).ru, 'молоко, сахар')
})

test('rejects branded narrative following apparent ingredients without trimming it into a recipe', () => {
  assert.equal(extractSourceCompositions({
    description: 'Состав: молоко нормализованное, йогуртовая закваска. «Растишка» — это серия молочных продуктов для детей. Разработан специально для детей.',
  }).ru, null)
  assert.equal(extractSourceCompositions({
    description: 'Состав: молоко, сахар. Компания выпускает продукцию с 1999 года.',
  }).ru, null)
})

test('unbalanced composition brackets are unknown', () => {
  assert.equal(extractSourceCompositions({ description: 'Состав: молоко, добавка (соя, лецитин. Условия хранения: холод.' }).ru, null)
  assert.equal(extractSourceCompositions({ features: [['состав', 'молоко, добавка (соя, лецитин']] }).ru, null)
})

test('composition label must start a sentence or line', () => {
  assert.equal(extractSourceCompositions({ description: 'Мой состав: неизвестен.' }).ru, null)
  assert.equal(extractSourceCompositions({ description: 'Описание товара\nСостав: молоко, сахар.' }).ru, 'молоко, сахар.')
})

test('rejects claim-only and visibly incomplete candidates', () => {
  assert.equal(extractSourceCompositions({ features: [['состав', 'для здорового роста и развития']] }).ru, null)
  assert.equal(extractSourceCompositions({ description: 'Состав: мука, сахар,' }).ru, null)
  assert.equal(extractSourceCompositions({ description: 'Состав: мука и' }).ru, null)
})

test('returns unknown for duplicate Russian or Kazakh headings', () => {
  const result = extractSourceCompositions({ description: 'Состав: сахар. Состав: соль. Құрамы: қант. Құрамы: тұз.' })
  assert.equal(result.ru, null)
  assert.equal(result.kz, null)
})

test('returns unknown for conflicting fields and description', () => {
  const result = extractSourceCompositions({
    features: [['состав', 'сахар, какао'], ['құрамы', 'қант, какао']],
    description: 'Состав: сахар, молоко. Құрамы: қант, сүт.',
  })
  assert.equal(result.ru, null)
  assert.equal(result.kz, null)
})

test('agrees across field and description after spacing and terminal period normalization', () => {
  assert.equal(extractSourceCompositions({
    features: [['состав', 'Сахар, какао.']],
    description: 'Состав: сахар,   какао',
  }).ru, 'Сахар, какао.')
})

test('crawler keeps checksum validation and existing barcode output mapping', () => {
  const crawler = readFileSync(new URL('../../scripts/crawl-semeiniy.mjs', import.meta.url), 'utf8')
  assert.match(crawler, /c\.valid && c\.checksumOk/)
  assert.match(crawler, /ingredients_raw: compositionRu/)
  assert.match(crawler, /ingredients_kz: compositionKz/)
})
