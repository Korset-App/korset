import { openDB } from 'idb'

export const AI_CHAT_HISTORY_MAX_PER_STORE = 20
export const AI_CHAT_HISTORY_TTL_MS = 30 * 24 * 60 * 60 * 1000

const DB_NAME = 'korset-ai-chat-history'
const DB_VERSION = 1
const STORE_CONVERSATIONS = 'conversations'
const TITLE_MAX_LENGTH = 64
const PREVIEW_MAX_LENGTH = 110
const MESSAGE_MAX_LENGTH = 2000

let dbPromise = null

function cleanString(value, max = 300) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function buildConversationId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `ai-chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function cleanProduct(product = {}) {
  return {
    ean: cleanString(product.ean, 40),
    name: cleanString(product.name, 220),
    brand: cleanString(product.brand, 120),
    category: cleanString(product.category, 80),
    subcategory: cleanString(product.subcategory, 80),
    priceKzt: Number.isFinite(Number(product.priceKzt)) ? Number(product.priceKzt) : null,
    stockStatus: cleanString(product.stockStatus, 40),
    image: cleanString(product.image, 500),
  }
}

function cleanMessage(message) {
  if (!message || (message.role !== 'user' && message.role !== 'assistant')) return null
  const content = cleanString(message.content, MESSAGE_MAX_LENGTH)
  if (!content) return null

  const next = {
    role: message.role,
    content,
  }

  if (message.role === 'assistant') {
    if (Array.isArray(message.productGroups)) {
      next.productGroups = message.productGroups.slice(0, 4).map((group) => ({
        id: cleanString(group.id, 120),
        title: cleanString(group.title, 120),
        products: Array.isArray(group.products)
          ? group.products
              .slice(0, 4)
              .map(cleanProduct)
              .filter((product) => product.ean)
          : [],
      }))
    }
    if (Array.isArray(message.followUps)) {
      next.followUps = message.followUps
        .filter((item) => typeof item === 'string')
        .slice(0, 4)
        .map((item) => cleanString(item, 80))
        .filter(Boolean)
    }
    if (Array.isArray(message.warnings)) {
      next.warnings = message.warnings
        .filter((item) => typeof item === 'string')
        .slice(0, 3)
        .map((item) => cleanString(item, 180))
        .filter(Boolean)
    }
  }

  return next
}

function cleanMessages(messages) {
  return Array.isArray(messages) ? messages.map(cleanMessage).filter(Boolean) : []
}

function buildTitle(messages) {
  const firstUser = messages.find((message) => message.role === 'user')
  return cleanString(firstUser?.content || 'Новый чат', TITLE_MAX_LENGTH) || 'Новый чат'
}

function buildPreview(messages) {
  const last = messages.at(-1)
  return cleanString(last?.content || '', PREVIEW_MAX_LENGTH)
}

function toMetadata(conversation) {
  if (!conversation) return null
  return {
    id: conversation.id,
    storeSlug: conversation.storeSlug,
    title: conversation.title,
    preview: conversation.preview,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: conversation.messageCount,
  }
}

function isExpired(conversation, now, ttlMs) {
  return Number(conversation?.updatedAt || 0) + ttlMs <= now
}

function createAIChatHistoryStore(driver, options = {}) {
  const now = options.now || (() => Date.now())
  const idFactory = options.idFactory || buildConversationId
  const maxPerStore = options.maxPerStore || AI_CHAT_HISTORY_MAX_PER_STORE
  const ttlMs = options.ttlMs || AI_CHAT_HISTORY_TTL_MS

  const cleanupExpired = async () => {
    const current = now()
    const rows = await driver.getAll()
    await Promise.all(
      rows
        .filter((conversation) => isExpired(conversation, current, ttlMs))
        .map((conversation) => driver.delete(conversation.id))
    )
  }

  const enforceStoreLimit = async (storeSlug) => {
    const rows = (await driver.getAll())
      .filter((conversation) => conversation.storeSlug === storeSlug)
      .sort((a, b) => b.updatedAt - a.updatedAt)
    await Promise.all(rows.slice(maxPerStore).map((conversation) => driver.delete(conversation.id)))
  }

  return {
    async upsertConversation({ id, storeSlug, messages }) {
      const safeStoreSlug = cleanString(storeSlug, 80) || 'default'
      const cleanedMessages = cleanMessages(messages)
      const current = now()
      const safeId = cleanString(id, 120) || idFactory()
      const existing = await driver.get(safeId)
      const conversation = {
        id: safeId,
        storeSlug: safeStoreSlug,
        title: buildTitle(cleanedMessages),
        preview: buildPreview(cleanedMessages),
        createdAt: existing?.createdAt || current,
        updatedAt: current,
        messageCount: cleanedMessages.length,
        messages: cleanedMessages,
      }
      await driver.put(conversation)
      await cleanupExpired()
      await enforceStoreLimit(safeStoreSlug)
      return conversation
    },

    async listConversations(storeSlug) {
      await cleanupExpired()
      const safeStoreSlug = cleanString(storeSlug, 80) || 'default'
      return (await driver.getAll())
        .filter((conversation) => conversation.storeSlug === safeStoreSlug)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(toMetadata)
    },

    async getConversation(id) {
      await cleanupExpired()
      const conversation = await driver.get(cleanString(id, 120))
      return conversation && !isExpired(conversation, now(), ttlMs) ? conversation : null
    },

    async deleteConversation(id) {
      await driver.delete(cleanString(id, 120))
    },

    async clearStoreConversations(storeSlug) {
      const safeStoreSlug = cleanString(storeSlug, 80) || 'default'
      const rows = await driver.getAll()
      await Promise.all(
        rows
          .filter((conversation) => conversation.storeSlug === safeStoreSlug)
          .map((conversation) => driver.delete(conversation.id))
      )
    },
  }
}

function createMemoryDriver(initial = []) {
  const rows = new Map(initial.map((item) => [item.id, item]))
  return {
    async getAll() {
      return Array.from(rows.values())
    },
    async get(id) {
      return rows.get(id) || null
    },
    async put(value) {
      rows.set(value.id, value)
    },
    async delete(id) {
      rows.delete(id)
    },
  }
}

function runMigrations(db) {
  if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
    const store = db.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'id' })
    store.createIndex('storeSlug', 'storeSlug')
    store.createIndex('updatedAt', 'updatedAt')
  }
}

function getIndexedDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade: runMigrations,
      blocking() {
        if (dbPromise) {
          dbPromise.then((db) => db.close()).catch(() => {})
          dbPromise = null
        }
      },
      terminated() {
        dbPromise = null
      },
    })
  }
  return dbPromise
}

function createIndexedDBDriver() {
  return {
    async getAll() {
      return (await getIndexedDB()).getAll(STORE_CONVERSATIONS)
    },
    async get(id) {
      return (await getIndexedDB()).get(STORE_CONVERSATIONS, id)
    },
    async put(value) {
      return (await getIndexedDB()).put(STORE_CONVERSATIONS, value)
    },
    async delete(id) {
      return (await getIndexedDB()).delete(STORE_CONVERSATIONS, id)
    },
  }
}

export function createMemoryAIChatHistoryStore(options = {}) {
  return createAIChatHistoryStore(createMemoryDriver(options.initial), options)
}

export function createIndexedDBAIChatHistoryStore(options = {}) {
  return createAIChatHistoryStore(createIndexedDBDriver(), options)
}
