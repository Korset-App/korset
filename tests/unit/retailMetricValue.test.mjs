import test from 'node:test'
import assert from 'node:assert/strict'
import { readRetailMetric, readRetailSummary } from '../../src/domain/retail/metricValue.js'

const summary = { total_count: 0, winner_count: 0, draw_count: 0, blocked_count: 0, top_pair_count: 0 }
const categories = ['winner_count', 'draw_count', 'blocked_count']
const top = { top_pair_count: ['top_ean_a', 'top_ean_b'] }

test('summary requires a single explicit row, including a confirmed zero', () => {
  assert.equal(readRetailSummary(summary, categories, top), summary)
  assert.equal(readRetailSummary([summary], categories, top), summary)
  for (const data of [undefined, null, false, 0, '', [], {}, [summary, summary]]) {
    assert.throws(() => readRetailSummary(data, categories, top))
  }
})

test('summary missing or invalid counts cannot become inactive-store claims', () => {
  for (const field of ['total_count', ...categories, 'top_pair_count']) {
    for (const value of [undefined, null, '', 'bad', -1, 0.5, Infinity, false, []]) {
      assert.throws(() => readRetailSummary({ ...summary, [field]: value }, categories, top))
    }
  }
})

test('summary counts and top evidence remain consistent with the reported total', () => {
  assert.throws(() => readRetailSummary({ ...summary, winner_count: 1 }, categories, top))
  assert.throws(() => readRetailSummary({ ...summary, total_count: 2, winner_count: 2, draw_count: 1 }, categories, top))
  assert.throws(() => readRetailSummary({ ...summary, top_pair_count: 1 }, categories, top))
  assert.throws(() => readRetailSummary({ ...summary, total_count: 2, top_pair_count: 1 }, categories, top))
  const valid = { ...summary, total_count: '3', winner_count: '2', top_pair_count: '1', top_ean_a: '4870204070018', top_ean_b: '4870204070094' }
  assert.equal(readRetailSummary(valid, categories, top), valid)
  assert.equal(valid.top_ean_a, '4870204070018')
})

test('a confirmed zero and decimal monetary or percentage values retain their meaning', () => {
  assert.equal(readRetailMetric(0), 0)
  assert.equal(readRetailMetric('0', { count: true }), 0)
  assert.equal(readRetailMetric('1234.56'), 1234.56)
  assert.equal(readRetailMetric('82.5', { percentage: true }), 82.5)
  assert.equal(readRetailMetric(100, { percentage: true }), 100)
})

test('missing, malformed or impossible metrics cannot turn into an empty-store claim', () => {
  for (const value of [null, undefined, '', ' ', [], {}, false, NaN, Infinity, -1, 'not a number']) {
    assert.throws(() => readRetailMetric(value))
  }
})

test('counts remain exact and percentages remain within their stated range', () => {
  assert.throws(() => readRetailMetric(1.5, { count: true }))
  assert.throws(() => readRetailMetric('9007199254740993', { count: true }))
  assert.throws(() => readRetailMetric(100.1, { percentage: true }))
  assert.equal(readRetailMetric(48, { count: true }), 48)
})
