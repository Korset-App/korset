import test from 'node:test'
import assert from 'node:assert/strict'
import { readRetailMetric } from '../../src/domain/retail/metricValue.js'

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
