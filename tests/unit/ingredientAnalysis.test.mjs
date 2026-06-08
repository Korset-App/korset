import assert from 'node:assert/strict'
import test from 'node:test'

import { analyzeProductIngredients } from '../../src/domain/product/ingredientAnalysis.js'

function highlightById(result, id) {
  return result.highlights.find((item) => item.id === id)
}

test('analyzeProductIngredients marks only profile-relevant allergens as danger', () => {
  const result = analyzeProductIngredients({
    product: {
      ingredients:
        'Сахар, молоко сухое, какао масло, эмульгатор соевый лецитин, ароматизатор.',
      allergens: ['milk', 'soy'],
    },
    profile: { allergens: ['milk'] },
    lang: 'ru',
  })

  assert.equal(highlightById(result, 'allergen:milk')?.tone, 'danger')
  assert.equal(highlightById(result, 'allergen:milk')?.kind, 'allergen')
  assert.equal(highlightById(result, 'allergen:soy'), undefined)
  assert.equal(highlightById(result, 'common:sugar'), undefined)
  assert.equal(result.summary.tone, 'danger')
})

test('analyzeProductIngredients classifies additives and E-codes without treating them as conflicts', () => {
  const result = analyzeProductIngredients({
    product: {
      ingredients:
        'Вода, стабилизатор каррагинан, диоксид кремния (E551), эмульгатор пирофосфат, краситель E120.',
    },
    profile: {},
    lang: 'ru',
  })

  assert.equal(highlightById(result, 'additive:стабилизатор')?.tone, 'additive')
  assert.equal(highlightById(result, 'additive:диоксид кремния')?.tone, 'additive')
  assert.equal(highlightById(result, 'ecode:E551')?.kind, 'additive')
  assert.equal(highlightById(result, 'ecode:E120')?.kind, 'additive')
  assert.equal(result.summary.counts.additives >= 4, true)
  assert.equal(result.summary.tone, 'additive')
})

test('analyzeProductIngredients promotes halal-sensitive ingredients when halal profile is enabled', () => {
  const result = analyzeProductIngredients({
    product: {
      ingredients:
        'Молоко нормализованное, сычужный фермент животного происхождения, ароматизатор.',
      halalStatus: 'unknown',
    },
    profile: { halalOnly: true },
    lang: 'ru',
  })

  const rennet = highlightById(result, 'halal:сычужный фермент')
  assert.equal(rennet?.tone, 'warning')
  assert.equal(rennet?.kind, 'halal')
  assert.equal(result.summary.tone, 'warning')
})

test('analyzeProductIngredients treats relevant trace allergens as warning', () => {
  const result = analyzeProductIngredients({
    product: {
      ingredients: 'Какао, сахар. Может содержать следы арахиса и фундука.',
      traces: ['peanuts'],
    },
    profile: { allergens: ['peanuts'] },
    lang: 'ru',
  })

  const trace = highlightById(result, 'trace:peanuts')
  assert.equal(trace?.tone, 'warning')
  assert.equal(trace?.kind, 'trace')
  assert.equal(result.summary.counts.conflicts, 1)
})

test('analyzeProductIngredients keeps direct allergens as danger when trace data exists too', () => {
  const result = analyzeProductIngredients({
    product: {
      ingredients: 'Арахисовая паста, сахар. Может содержать следы арахиса.',
      traces: ['peanuts'],
    },
    profile: { allergens: ['peanuts'] },
    lang: 'ru',
  })

  assert.equal(highlightById(result, 'allergen:peanuts')?.tone, 'danger')
  assert.equal(highlightById(result, 'trace:peanuts')?.tone, 'warning')
})

test('analyzeProductIngredients builds clickable tokens for highlighted fragments', () => {
  const result = analyzeProductIngredients({
    product: {
      ingredients: 'Молоко сухое, эмульгатор E471, соль.',
    },
    profile: { allergens: ['milk'] },
    lang: 'ru',
  })

  const clickable = result.tokens.filter((token) => token.highlightId)
  assert.equal(clickable.some((token) => token.highlightId === 'allergen:milk'), true)
  assert.equal(clickable.some((token) => token.highlightId === 'additive:эмульгатор'), true)
  assert.equal(clickable.some((token) => token.highlightId === 'ecode:E471'), true)
  assert.equal(clickable.some((token) => token.text.toLowerCase().includes('соль')), false)
})

test('analyzeProductIngredients explains non-obvious shopper ingredients in common compositions', () => {
  const result = analyzeProductIngredients({
    product: {
      ingredients:
        'Пшеничная мука, сахар, масла растительные (пальмовое), инвертный сироп (сахар, вода, регулятор кислотности (лимонная кислота)), вода, глюкозный сироп, сухое обезжиренное молоко, какао порошок.',
    },
    profile: {},
    lang: 'ru',
  })

  assert.equal(highlightById(result, 'info:пальмовое масло')?.tone, 'info')
  assert.equal(highlightById(result, 'info:инвертный сироп')?.tone, 'info')
  assert.equal(highlightById(result, 'info:глюкозный сироп')?.tone, 'info')
  assert.equal(highlightById(result, 'additive:регулятор кислотности')?.tone, 'additive')
  assert.equal(highlightById(result, 'additive:лимонная кислота')?.tone, 'additive')
  assert.equal(highlightById(result, 'common:сахар'), undefined)
  assert.equal(highlightById(result, 'common:вода'), undefined)
})

test('analyzeProductIngredients explains real package wording for vegetable fats and texture agents', () => {
  const result = analyzeProductIngredients({
    product: {
      ingredients:
        'Сахар, растительные жиры (пальмовый, ши), мука пшеничная, крахмал модифицированный, разрыхлитель, влагоудерживающий агент глицерин, усилитель вкуса.',
    },
    profile: {},
    lang: 'ru',
  })

  assert.equal(highlightById(result, 'info:растительные жиры')?.tone, 'info')
  assert.equal(highlightById(result, 'info:пальмовое масло')?.tone, 'info')
  assert.equal(highlightById(result, 'info:масло ши')?.tone, 'info')
  assert.equal(highlightById(result, 'additive:модифицированный крахмал')?.tone, 'additive')
  assert.equal(highlightById(result, 'additive:разрыхлитель')?.tone, 'additive')
  assert.equal(highlightById(result, 'additive:влагоудерживающий агент')?.tone, 'additive')
  assert.equal(highlightById(result, 'additive:усилитель вкуса')?.tone, 'additive')
  assert.equal(highlightById(result, 'common:мука'), undefined)
})

test('analyzeProductIngredients explains common sweetener aliases without highlighting plain sugar', () => {
  const result = analyzeProductIngredients({
    product: {
      ingredients:
        'Сахар, декстроза, фруктоза, глюкозно-фруктозный сироп, патока, мальтодекстрин, вода.',
    },
    profile: {},
    lang: 'ru',
  })

  assert.equal(highlightById(result, 'info:декстроза')?.tone, 'info')
  assert.equal(highlightById(result, 'info:фруктоза')?.tone, 'info')
  assert.equal(highlightById(result, 'info:глюкозно-фруктозный сироп')?.tone, 'info')
  assert.equal(highlightById(result, 'info:патока')?.tone, 'info')
  assert.equal(highlightById(result, 'info:мальтодекстрин')?.tone, 'info')
  assert.equal(highlightById(result, 'common:сахар'), undefined)
  assert.equal(highlightById(result, 'common:вода'), undefined)
})
