import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAIChatStorageKey,
  buildStoreAIContext,
  loadAIChatSession,
  saveAIChatSession,
} from '../../src/domain/ai/context.js'

test('buildStoreAIContext keeps only compact public store fields', () => {
  const context = buildStoreAIContext({
    id: 'store-1',
    code: 'mast',
    slug: 'mast',
    name: 'Mast Market',
    city: 'Ust-Kamenogorsk',
    address: 'Auezov 10',
    phone: '+7 777 111 22 33',
    email: 'hello@example.kz',
    type: 'minimarket',
    short_description: 'Neighborhood minimarket',
    description: 'Fresh groceries and household essentials',
    whatsapp_number: '+7 777 000 11 22',
    twogis_url: 'https://2gis.kz/example',
    instagram_url: 'https://instagram.com/example',
    website_url: 'https://example.kz',
    owner_id: 'private-owner',
    plan: 'enterprise',
  })

  assert.deepEqual(context, {
    slug: 'mast',
    name: 'Mast Market',
    city: 'Ust-Kamenogorsk',
    address: 'Auezov 10',
    phone: '+7 777 111 22 33',
    email: 'hello@example.kz',
    type: 'minimarket',
    shortDescription: 'Neighborhood minimarket',
    description: 'Fresh groceries and household essentials',
    whatsappNumber: '+7 777 000 11 22',
    twogisUrl: 'https://2gis.kz/example',
    instagramUrl: 'https://instagram.com/example',
    websiteUrl: 'https://example.kz',
    aiStoreNotes: '',
  })
})

test('buildStoreAIContext preserves route slug while store details are still loading', () => {
  assert.deepEqual(buildStoreAIContext(null, { slug: 'store-one' }), {
    slug: 'store-one',
    name: 'store-one',
    city: '',
    address: '',
    phone: '',
    email: '',
    type: '',
    shortDescription: '',
    description: '',
    whatsappNumber: '',
    twogisUrl: '',
    instagramUrl: '',
    websiteUrl: '',
    aiStoreNotes: '',
  })
})

test('buildStoreAIContext trims long owner notes and strips line noise', () => {
  const longNotes = `  Delivery after 18:00\nFresh bakery every morning\t${'x'.repeat(2500)}`
  const context = buildStoreAIContext({
    code: 'demo',
    name: 'Demo',
    ai_store_notes: longNotes,
  })

  assert.equal(context.aiStoreNotes.includes('\n'), false)
  assert.equal(context.aiStoreNotes.includes('\t'), false)
  assert.equal(context.aiStoreNotes.length, 2000)
})

test('buildAIChatStorageKey scopes chats by store and product', () => {
  assert.equal(
    buildAIChatStorageKey({ mode: 'general', storeSlug: 'mast' }),
    'korset_ai_chat_general_mast'
  )
  assert.equal(
    buildAIChatStorageKey({ mode: 'product', storeSlug: 'mast', ean: '4870204070018' }),
    'korset_ai_chat_product_mast_4870204070018'
  )
})

test('saveAIChatSession stores only recent valid messages and loadAIChatSession restores them', () => {
  const storage = new Map()
  const adapter = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
  }
  const messages = Array.from({ length: 35 }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `message ${i}`,
  }))

  saveAIChatSession({
    storage: adapter,
    key: 'chat-key',
    messages: [...messages, { role: 'system', content: 'drop me' }, { role: 'user', content: '' }],
    now: 1000,
  })

  const restored = loadAIChatSession({ storage: adapter, key: 'chat-key', now: 1000 })

  assert.equal(restored.messages.length, 30)
  assert.equal(restored.messages[0].content, 'message 5')
  assert.equal(restored.messages.at(-1).content, 'message 34')
  assert.equal(restored.updatedAt, 1000)
})

test('saveAIChatSession preserves assistant product cards and follow ups', () => {
  const storage = new Map()
  const adapter = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
  }

  saveAIChatSession({
    storage: adapter,
    key: 'chat-key',
    messages: [
      {
        role: 'assistant',
        content: 'Нашёл товары.',
        productGroups: [
          {
            id: 'grocery:rice',
            title: 'Рис',
            products: [
              {
                ean: '4870204070018',
                name: 'Рис для плова',
                brand: 'Salus',
                category: 'grocery',
                subcategory: 'rice',
                priceKzt: 250,
                stockStatus: 'in_stock',
                image: '/rice.webp',
              },
            ],
          },
        ],
        followUps: ['Показать дешевле'],
        warnings: ['Проверьте цену на кассе'],
      },
    ],
    now: 1000,
  })

  const restored = loadAIChatSession({ storage: adapter, key: 'chat-key', now: 1000 })

  assert.deepEqual(restored.messages[0].productGroups[0].products[0], {
    ean: '4870204070018',
    name: 'Рис для плова',
    brand: 'Salus',
    category: 'grocery',
    subcategory: 'rice',
    priceKzt: 250,
    stockStatus: 'in_stock',
    image: '/rice.webp',
  })
  assert.deepEqual(restored.messages[0].followUps, ['Показать дешевле'])
  assert.deepEqual(restored.messages[0].warnings, ['Проверьте цену на кассе'])
})

test('saveAIChatSession preserves premium product AI response fields', () => {
  const storage = new Map()
  const adapter = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
  }

  saveAIChatSession({
    storage: adapter,
    key: 'chat-key',
    messages: [
      {
        role: 'assistant',
        content: 'Проверьте упаковку перед покупкой.',
        verdict: { label: 'fits_but_check', title: 'Нужно проверить упаковку', tone: 'caution' },
        confidenceNotes: ['Состав неполный.'],
        checkOnPackage: ['Состав', 'Следы аллергенов'],
        alternatives: [
          {
            ean: '4870204070094',
            name: 'Alt Milk',
            brand: 'Demo',
            priceKzt: 790,
            stockStatus: 'in_stock',
            image: '/alt.webp',
            quantity: '1 л',
          },
        ],
      },
    ],
    now: 1000,
  })

  const restored = loadAIChatSession({ storage: adapter, key: 'chat-key', now: 1000 })

  assert.equal(restored.messages[0].verdict.label, 'fits_but_check')
  assert.deepEqual(restored.messages[0].confidenceNotes, ['Состав неполный.'])
  assert.deepEqual(restored.messages[0].checkOnPackage, ['Состав', 'Следы аллергенов'])
  assert.equal(restored.messages[0].alternatives[0].ean, '4870204070094')
  assert.equal(restored.messages[0].alternatives[0].quantity, '1 л')
})

test('loadAIChatSession drops expired sessions', () => {
  const storage = new Map()
  const adapter = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  }
  adapter.setItem(
    'chat-key',
    JSON.stringify({
      messages: [{ role: 'user', content: 'old' }],
      updatedAt: 1000,
    })
  )

  const restored = loadAIChatSession({
    storage: adapter,
    key: 'chat-key',
    now: 1000 + 15 * 24 * 60 * 60 * 1000,
    ttlMs: 14 * 24 * 60 * 60 * 1000,
  })

  assert.deepEqual(restored.messages, [])
  assert.equal(storage.has('chat-key'), false)
})
