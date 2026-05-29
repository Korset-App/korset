import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AI_CHAT_HISTORY_MAX_PER_STORE,
  AI_CHAT_HISTORY_TTL_MS,
  createMemoryAIChatHistoryStore,
} from '../../src/domain/ai/localChatHistory.js'

const DAY = 24 * 60 * 60 * 1000

function makeStore(options = {}) {
  let now = options.now ?? 1_000_000
  let id = 0
  const store = createMemoryAIChatHistoryStore({
    ...options,
    now: () => now,
    idFactory: () => `chat-${++id}`,
  })
  return {
    store,
    setNow: (value) => {
      now = value
    },
  }
}

test('creates a store-scoped conversation with sanitized messages and metadata', async () => {
  const { store } = makeStore()

  const conversation = await store.upsertConversation({
    storeSlug: 'mars',
    messages: [
      { role: 'system', content: 'drop me' },
      { role: 'user', content: '  Подбери йогурт без сахара  ', file: { secret: true } },
      {
        role: 'assistant',
        content: 'Нашёл варианты.',
        followUps: ['Показать дешевле', 'Сравнить'],
        productGroups: [{ id: 'dairy', title: 'Молочное', products: [{ ean: '1', name: 'Йогурт' }] }],
      },
    ],
  })

  assert.equal(conversation.id, 'chat-1')
  assert.equal(conversation.storeSlug, 'mars')
  assert.equal(conversation.title, 'Подбери йогурт без сахара')
  assert.equal(conversation.preview, 'Нашёл варианты.')
  assert.equal(conversation.messageCount, 2)
  assert.equal(conversation.messages.length, 2)
  assert.equal(conversation.messages[0].role, 'user')
  assert.equal(conversation.messages[0].content, 'Подбери йогурт без сахара')
  assert.equal('file' in conversation.messages[0], false)
  assert.deepEqual(conversation.messages[1].followUps, ['Показать дешевле', 'Сравнить'])
  assert.equal(conversation.messages[1].productGroups[0].products[0].ean, '1')
})

test('lists only metadata for the requested store sorted by newest update', async () => {
  const { store, setNow } = makeStore()

  await store.upsertConversation({ storeSlug: 'mars', messages: [{ role: 'user', content: 'first' }] })
  setNow(1_001_000)
  await store.upsertConversation({ storeSlug: 'nurly', messages: [{ role: 'user', content: 'other' }] })
  setNow(1_002_000)
  await store.upsertConversation({ storeSlug: 'mars', messages: [{ role: 'user', content: 'second' }] })

  const list = await store.listConversations('mars')

  assert.deepEqual(
    list.map((item) => item.title),
    ['second', 'first']
  )
  assert.equal(list[0].messages, undefined)
  assert.equal(list[0].storeSlug, 'mars')
})

test('updates an existing conversation without changing its createdAt timestamp', async () => {
  const { store, setNow } = makeStore()

  const created = await store.upsertConversation({
    storeSlug: 'mars',
    messages: [{ role: 'user', content: 'first' }],
  })
  setNow(1_010_000)
  const updated = await store.upsertConversation({
    id: created.id,
    storeSlug: 'mars',
    messages: [
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'reply' },
    ],
  })

  assert.equal(updated.id, created.id)
  assert.equal(updated.createdAt, created.createdAt)
  assert.equal(updated.updatedAt, 1_010_000)
  assert.equal(updated.preview, 'reply')
  assert.equal(updated.messageCount, 2)
})

test('enforces max conversations per store without deleting other stores', async () => {
  const { store, setNow } = makeStore({ maxPerStore: 2 })

  await store.upsertConversation({ storeSlug: 'mars', messages: [{ role: 'user', content: 'one' }] })
  setNow(1_001_000)
  await store.upsertConversation({ storeSlug: 'nurly', messages: [{ role: 'user', content: 'nurly' }] })
  setNow(1_002_000)
  await store.upsertConversation({ storeSlug: 'mars', messages: [{ role: 'user', content: 'two' }] })
  setNow(1_003_000)
  await store.upsertConversation({ storeSlug: 'mars', messages: [{ role: 'user', content: 'three' }] })

  assert.deepEqual(
    (await store.listConversations('mars')).map((item) => item.title),
    ['three', 'two']
  )
  assert.deepEqual(
    (await store.listConversations('nurly')).map((item) => item.title),
    ['nurly']
  )
})

test('deletes one conversation and clears only one store', async () => {
  const { store, setNow } = makeStore()

  const mars = await store.upsertConversation({
    storeSlug: 'mars',
    messages: [{ role: 'user', content: 'mars' }],
  })
  setNow(1_001_000)
  await store.upsertConversation({ storeSlug: 'nurly', messages: [{ role: 'user', content: 'nurly' }] })

  await store.deleteConversation(mars.id)
  assert.deepEqual(await store.listConversations('mars'), [])

  await store.upsertConversation({ storeSlug: 'mars', messages: [{ role: 'user', content: 'again' }] })
  await store.clearStoreConversations('mars')

  assert.deepEqual(await store.listConversations('mars'), [])
  assert.equal((await store.listConversations('nurly')).length, 1)
})

test('drops expired conversations by TTL during reads and writes', async () => {
  const { store, setNow } = makeStore({ now: 0 })

  await store.upsertConversation({ storeSlug: 'mars', messages: [{ role: 'user', content: 'old' }] })
  setNow(AI_CHAT_HISTORY_TTL_MS + DAY)
  await store.upsertConversation({ storeSlug: 'mars', messages: [{ role: 'user', content: 'fresh' }] })

  assert.deepEqual(
    (await store.listConversations('mars')).map((item) => item.title),
    ['fresh']
  )
})

test('uses production defaults for local-only AI history limits', () => {
  assert.equal(AI_CHAT_HISTORY_MAX_PER_STORE, 20)
  assert.equal(AI_CHAT_HISTORY_TTL_MS, 30 * DAY)
})
