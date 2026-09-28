import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getSearchHighlightSegments } from '../../src/domain/product/searchHighlight.js'

test('getSearchHighlightSegments handles exact match', () => {
  const segments = getSearchHighlightSegments('Молоко пастеризованное 1л', 'молоко')
  assert.equal(segments.length, 2)
  assert.deepEqual(segments[0], { text: 'Молоко', match: true })
  assert.deepEqual(segments[1], { text: ' пастеризованное 1л', match: false })
})

test('getSearchHighlightSegments handles QWERTY layout conversion', () => {
  // 'vjkjrj' converts to 'молоко'
  const segments = getSearchHighlightSegments('Молоко Зенченко 3,2%', 'vjkjrj')
  assert.equal(segments.length, 2)
  assert.deepEqual(segments[0], { text: 'Молоко', match: true })
  assert.deepEqual(segments[1], { text: ' Зенченко 3,2%', match: false })
})

test('getSearchHighlightSegments handles multi-word query', () => {
  const segments = getSearchHighlightSegments('Чипсы Lay’s со вкусом паприка', 'чипсы паприка')
  assert.equal(segments.length, 3)
  assert.deepEqual(segments[0], { text: 'Чипсы', match: true })
  assert.deepEqual(segments[1], { text: ' Lay’s со вкусом ', match: false })
  assert.deepEqual(segments[2], { text: 'паприка', match: true })
})

test('getSearchHighlightSegments returns original text if query is short or empty', () => {
  const segmentsEmpty = getSearchHighlightSegments('Сыр Hochland', '')
  assert.deepEqual(segmentsEmpty, [{ text: 'Сыр Hochland', match: false }])

  const segmentsSingleChar = getSearchHighlightSegments('Сыр Hochland', 'с')
  assert.deepEqual(segmentsSingleChar, [{ text: 'Сыр Hochland', match: false }])
})

test('getSearchHighlightSegments handles case insensitivity and Kazakh diacritics', () => {
  const segments = getSearchHighlightSegments('Қаймақ 20% ДЕП', 'каймак')
  assert.equal(segments[0].match, true)
  assert.equal(segments[0].text, 'Қаймақ')
})
