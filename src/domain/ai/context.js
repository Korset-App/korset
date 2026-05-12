const DEFAULT_SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000
const MAX_STORED_MESSAGES = 30
const MAX_STORE_NOTES_LENGTH = 2000

function cleanString(value, max = 300) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return []
  return messages
    .filter(
      (message) =>
        message &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string' &&
        message.content.trim()
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .slice(-MAX_STORED_MESSAGES)
}

export function buildStoreAIContext(store) {
  if (!store) return null

  return {
    slug: cleanString(store.slug || store.code, 80),
    name: cleanString(store.name, 120),
    city: cleanString(store.city, 80),
    address: cleanString(store.address, 160),
    phone: cleanString(store.phone, 80),
    email: cleanString(store.email, 120),
    type: cleanString(store.type, 80),
    shortDescription: cleanString(store.short_description || store.shortDescription, 240),
    description: cleanString(store.description, 500),
    whatsappNumber: cleanString(store.whatsapp_number || store.whatsappNumber, 80),
    twogisUrl: cleanString(store.twogis_url || store.twogisUrl, 240),
    instagramUrl: cleanString(store.instagram_url || store.instagramUrl, 240),
    websiteUrl: cleanString(store.website_url || store.websiteUrl, 240),
    aiStoreNotes: cleanString(store.ai_store_notes || store.aiStoreNotes, MAX_STORE_NOTES_LENGTH),
  }
}

export function buildAIChatStorageKey({ mode = 'general', storeSlug = 'default', ean } = {}) {
  const safeMode = cleanString(mode, 40) || 'general'
  const safeStore = cleanString(storeSlug, 80) || 'default'
  const safeEan = cleanString(ean, 80)
  return ['korset_ai_chat', safeMode, safeStore, safeEan].filter(Boolean).join('_')
}

export function saveAIChatSession({ storage, key, messages, now = Date.now() }) {
  if (!storage || !key) return
  const payload = {
    messages: cleanMessages(messages),
    updatedAt: now,
  }
  try {
    storage.setItem(key, JSON.stringify(payload))
  } catch {
    /* noop */
  }
}

export function loadAIChatSession({
  storage,
  key,
  now = Date.now(),
  ttlMs = DEFAULT_SESSION_TTL_MS,
}) {
  const empty = { messages: [], updatedAt: null }
  if (!storage || !key) return empty

  try {
    const raw = storage.getItem(key)
    if (!raw) return empty
    const parsed = JSON.parse(raw)
    const updatedAt = Number(parsed.updatedAt) || null

    if (updatedAt && now - updatedAt > ttlMs) {
      storage.removeItem?.(key)
      return empty
    }

    return {
      messages: cleanMessages(parsed.messages),
      updatedAt,
    }
  } catch {
    return empty
  }
}

export function clearAIChatSession({ storage, key }) {
  if (!storage || !key) return
  try {
    storage.removeItem?.(key)
  } catch {
    /* noop */
  }
}
