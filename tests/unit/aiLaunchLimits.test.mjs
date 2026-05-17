import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AI_LIMITS,
  AI_MODELS,
  RATE_LIMITS,
  buildAISafetyConfidence,
  buildAIUsageEvent,
  buildProductGroupsFromCatalog,
  classifyOpenAIError,
  getOpenAICompletionLimits,
  inferAIIntent,
  sanitizeCatalogContext,
  selectOpenAIModel,
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

test('validateMessages strips UI-only message fields before OpenAI payload', () => {
  const messages = [
    {
      role: 'assistant',
      content: 'Вот товары из магазина.',
      productGroups: [{ id: 'dairy_eggs', products: [] }],
      followUps: ['Показать дешевле'],
      warnings: ['Проверьте цену на кассе'],
    },
    {
      role: 'user',
      content: 'А есть дешевле?',
      localDraftId: 'draft-1',
    },
  ]

  assert.deepEqual(validateMessages(messages), [
    { role: 'assistant', content: 'Вот товары из магазина.' },
    { role: 'user', content: 'А есть дешевле?' },
  ])
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

test('server product groups can prioritize a single explicit product mention', () => {
  const groups = buildProductGroupsFromCatalog(
    sanitizeCatalogContext([
      {
        ean: '1',
        name: 'Гранола манго-ананас',
        brand: 'granolife',
        category: 'grocery',
        subcategory: 'breakfast',
      },
      {
        ean: '2',
        name: 'Напиток манго-тропиканго',
        brand: 'Моя семья',
        category: 'water_beverages',
        subcategory: 'juice',
      },
    ]),
    { replyText: 'Могу предложить напиток манго-тропиканго «Моя семья».' }
  )

  assert.deepEqual(
    groups.flatMap((group) => group.products.map((product) => product.ean)),
    ['2', '1']
  )
})

test('OpenAI completion limits stay mobile-sized by mode', () => {
  assert.deepEqual(getOpenAICompletionLimits('enrich'), {
    max_completion_tokens: 260,
    temperature: 0.3,
  })
  assert.deepEqual(getOpenAICompletionLimits('compare'), {
    max_completion_tokens: 180,
    temperature: 0.6,
  })
  assert.deepEqual(getOpenAICompletionLimits('product'), {
    max_completion_tokens: 280,
    temperature: 0.6,
  })
  assert.deepEqual(getOpenAICompletionLimits('general'), {
    max_completion_tokens: 320,
    temperature: 0.6,
  })
})

test('OpenAI model routing defaults to nano without automatic premium routing', () => {
  assert.equal(AI_MODELS.default, 'gpt-5.4-nano')
  assert.equal(AI_MODELS.highQuality, 'gpt-5.4-mini')
  assert.deepEqual(selectOpenAIModel({ mode: 'general' }), {
    model: 'gpt-5.4-nano',
    route: 'default',
    reason: 'general:default',
  })
  assert.deepEqual(selectOpenAIModel({ mode: 'product', profile: { allergens: ['milk'] } }), {
    model: 'gpt-5.4-nano',
    route: 'default',
    reason: 'product:default',
  })
})

test('OpenAI error classification keeps provider failures actionable', () => {
  assert.equal(classifyOpenAIError(401), 'auth')
  assert.equal(classifyOpenAIError(429, { code: 'insufficient_quota' }), 'quota')
  assert.equal(classifyOpenAIError(429), 'rate_limited')
  assert.equal(classifyOpenAIError(404, { code: 'model_not_found' }), 'model_not_found')
  assert.equal(classifyOpenAIError(400), 'bad_request')
  assert.equal(classifyOpenAIError(503), 'provider_error')
  assert.equal(classifyOpenAIError(418), 'unknown')
})

test('AI usage event is compact, diagnostic, and excludes user message content', () => {
  const originalNow = Date.now
  Date.now = () => 1_500
  try {
    assert.deepEqual(
      buildAIUsageEvent({
        mode: 'general',
        modelRoute: 'default',
        model: 'gpt-5.4-nano',
        completionLimits: { max_completion_tokens: 320 },
        usage: {
          prompt_tokens: 240,
          completion_tokens: 80,
          total_tokens: 320,
        },
        startedAt: 1_000,
        status: 'ok',
        storeContext: { slug: 'store-one', name: 'Store One' },
        catalogContext: [{ ean: '1', name: 'A' }, { ean: '2', name: 'B' }],
        intent: 'catalog_recommendation',
        safetyConfidence: null,
        noCatalogMatch: false,
        productGroupsCount: 2,
        ragUsed: true,
      }),
      {
        event: 'ai_completion',
        mode: 'general',
        intent: 'catalog_recommendation',
        model: 'gpt-5.4-nano',
        modelRoute: 'default',
        status: 'ok',
        errorType: null,
        durationMs: 500,
        latencyMs: 500,
        promptTokens: 240,
        completionTokens: 80,
        totalTokens: 320,
        maxCompletionTokens: 320,
        catalogCandidates: 2,
        noCatalogMatch: false,
        productGroupsCount: 2,
        safetyConfidence: null,
        ragUsed: true,
        storeSlug: 'store-one',
      }
    )
  } finally {
    Date.now = originalNow
  }
})

test('AI usage event derives no-match diagnostics without message text', () => {
  const event = buildAIUsageEvent({
    mode: 'general',
    modelRoute: 'default',
    model: 'gpt-5.4-nano',
    status: 'error',
    errorType: 'provider_error',
    latencyMs: 35,
    catalogContext: [],
  })

  assert.equal(event.intent, 'catalog_no_match')
  assert.equal(event.noCatalogMatch, true)
  assert.equal(event.latencyMs, 35)
  assert.equal(event.errorType, 'provider_error')
  assert.equal(Object.hasOwn(event, 'messages'), false)
  assert.equal(Object.hasOwn(event, 'message'), false)
  assert.equal(Object.hasOwn(event, 'profile'), false)
})

test('AI intent and safety confidence are metadata-only', () => {
  assert.equal(inferAIIntent({ mode: 'product', product: { name: 'Milk' } }), 'product_fit_check')
  assert.equal(
    inferAIIntent({
      mode: 'compare',
      productA: { name: 'A' },
      productB: { name: 'B' },
    }),
    'product_compare'
  )
  assert.equal(inferAIIntent({ mode: 'general', catalogContext: [{ ean: '1' }] }), 'catalog_recommendation')
  assert.equal(inferAIIntent({ mode: 'general', catalogContext: [] }), 'catalog_no_match')

  const confidence = buildAISafetyConfidence({
    mode: 'product',
    product: {
      name: 'Chocolate',
      ingredients: 'milk, sugar, cocoa',
      halalStatus: 'unknown',
      allergens: ['milk'],
    },
    profile: { halalOnly: true, allergens: ['milk'] },
  })

  assert.deepEqual(confidence, {
    halal: 'likely_compatible',
    allergy: 'direct_match',
  })
})
