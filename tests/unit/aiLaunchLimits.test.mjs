import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AI_LIMITS,
  RATE_LIMITS,
  buildProductGroupsFromCatalog,
  getOpenAICompletionLimits,
  sanitizeCatalogContext,
  validateMessages,
} from '../../api/ai.js'
import { buildCatalogAIContext } from '../../src/domain/ai/catalogSearch.js'

test('AI request limits are explicit for anonymous and authenticated users', () => {
  assert.deepEqual(RATE_LIMITS.anonymous, { maxRequests: 8, windowMs: 60_000 })
  assert.deepEqual(RATE_LIMITS.authenticated, { maxRequests: 30, windowMs: 60_000 })
})

test('validateMessages rejects overlong history, messages, and total payloads', () => {
  const valid = Array.from({ length: AI_LIMITS.maxMessages }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: 'ok',
  }))

  assert.equal(validateMessages(valid)?.length, AI_LIMITS.maxMessages)
  assert.equal(validateMessages([...valid, { role: 'user', content: 'too much' }]), null)
  assert.equal(validateMessages([{ role: 'system', content: 'nope' }]), null)
  assert.equal(validateMessages([{ role: 'user', content: 'x'.repeat(AI_LIMITS.maxMessageLength + 1) }]), null)
  assert.equal(
    validateMessages([
      { role: 'user', content: 'x'.repeat(AI_LIMITS.maxMessageLength) },
      { role: 'assistant', content: 'x'.repeat(AI_LIMITS.maxMessageLength) },
      { role: 'user', content: 'x'.repeat(AI_LIMITS.maxTotalMessageLength) },
    ]),
    null
  )
})

test('catalog candidates are capped consistently on client and server', () => {
  const products = Array.from({ length: 30 }, (_, index) => ({
    ean: `48700000000${index}`,
    name: `Product ${index}`,
    category: index < 15 ? 'one' : 'two',
    priceKzt: 100 + index,
  }))

  const clientContext = buildCatalogAIContext(products)
  const serverContext = sanitizeCatalogContext(products)
  const groups = buildProductGroupsFromCatalog(serverContext)
  const groupItems = groups.reduce((sum, group) => sum + group.products.length, 0)

  assert.equal(clientContext.length, AI_LIMITS.maxCatalogCandidates)
  assert.equal(serverContext.length, AI_LIMITS.maxCatalogCandidates)
  assert.ok(groups.length <= AI_LIMITS.maxProductGroups)
  assert.ok(groupItems <= AI_LIMITS.maxStructuredProducts)
})

test('OpenAI completion limits stay mobile-sized by mode', () => {
  assert.deepEqual(getOpenAICompletionLimits('enrich'), { max_tokens: 260, temperature: 0.3 })
  assert.deepEqual(getOpenAICompletionLimits('compare'), { max_tokens: 180, temperature: 0.6 })
  assert.deepEqual(getOpenAICompletionLimits('product'), { max_tokens: 280, temperature: 0.6 })
  assert.deepEqual(getOpenAICompletionLimits('general'), { max_tokens: 320, temperature: 0.6 })
})
