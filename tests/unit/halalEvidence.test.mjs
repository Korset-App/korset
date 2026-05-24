import test from 'node:test'
import assert from 'node:assert/strict'

import { classifyHalalEvidence } from '../../src/domain/product/halalEvidence.js'

test('explicit halal text in the name yields a medium yes', () => {
  const result = classifyHalalEvidence({ name: 'Halal Chicken Nuggets' })

  assert.equal(result.decision, 'yes')
  assert.equal(result.confidence, 'medium')
})

test('brand registry match yields a high yes', () => {
  const result = classifyHalalEvidence({
    name: 'Premium Cookies',
    brand: 'Rakhat',
    registryMatches: [{ name: 'Rakhat JSC' }],
  })

  assert.equal(result.decision, 'yes')
  assert.equal(result.confidence, 'high')
  assert.equal(result.shouldPromote, true)
})

test('clear haram markers yield a high no', () => {
  const result = classifyHalalEvidence({
    name: 'Smoked Bacon',
    ingredients_raw: 'pork, salt, spices',
  })

  assert.equal(result.decision, 'no')
  assert.equal(result.confidence, 'high')
})

test('alcohol yields a high no even when the name looks neutral', () => {
  const result = classifyHalalEvidence({
    name: 'Berry Dessert',
    nutriments: { alcohol: 0.5 },
  })

  assert.equal(result.decision, 'no')
  assert.equal(result.confidence, 'high')
})

test('halal text plus ambiguous ingredients stays reviewable', () => {
  const result = classifyHalalEvidence({
    name: 'Halal Gummies',
    ingredients_raw: 'gelatin, glucose syrup, flavoring',
  })

  assert.equal(result.decision, 'review')
  assert.equal(result.confidence, 'medium')
})

test('conflicting explicit status becomes conflict', () => {
  const result = classifyHalalEvidence({
    halalStatus: 'yes',
    ingredients_raw: 'pork, salt',
  })

  assert.equal(result.decision, 'conflict')
  assert.equal(result.shouldPromote, false)
})
