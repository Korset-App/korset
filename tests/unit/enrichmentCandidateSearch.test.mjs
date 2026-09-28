import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCandidateIndex, findCandidates } from '../../scripts/utils/enrichmentCandidateSearch.mjs'

test('exact EAN reaches candidate list despite different word order', () => {
  const index = buildCandidateIndex([{ source: 'arbuz', id: '1', ean: '4870123456789', name: 'Молоко FoodMaster 2.5% 1 л', ingredients_raw: 'молоко' }])
  const [candidate] = findCandidates(index, { ean: '4870123456789', name: 'FoodMaster молоко 1л 2,5%' })
  assert.equal(candidate.matchRoute, 'ean')
  assert.equal(candidate.donor.id, '1')
})

test('missing brand does not prevent text retrieval and returns several candidates', () => {
  const index = buildCandidateIndex([
    { source: 'a', id: '1', name: 'Рахат шоколад темный 100 г' },
    { source: 'b', id: '2', name: 'Рахат шоколад темный 90 г' },
  ])
  const results = findCandidates(index, { name: 'Шоколад темный Рахат 100гр' }, { limit: 5 })
  assert.equal(results.length, 2)
  assert.equal(results[0].donor.id, '1')
  assert.ok(results[1].conflicts.includes('quantity'))
})

test('confirmed transliteration can retrieve a candidate without treating it as identity proof', () => {
  const index = buildCandidateIndex([{ source: 'a', id: '1', name: 'Рахат шоколад темный 100 г' }])
  const [candidate] = findCandidates(index, { name: 'Rakhat темный шоколад 100г' })
  assert.equal(candidate.donor.id, '1')
  assert.equal(candidate.matchRoute, 'text')
  assert.equal(candidate.verified, false)
})
