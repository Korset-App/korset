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
    .map((message) => {
      const cleanMessage = {
        role: message.role,
        content: message.content.trim(),
      }

      if (message.role === 'assistant') {
        if (Array.isArray(message.productGroups)) {
          cleanMessage.productGroups = message.productGroups.slice(0, 4).map((group) => ({
            id: cleanString(group.id, 120),
            title: cleanString(group.title, 120),
            products: Array.isArray(group.products)
              ? group.products.slice(0, 4).map((product) => ({
                  ean: cleanString(product.ean, 40),
                  name: cleanString(product.name, 220),
                  brand: cleanString(product.brand, 120),
                  category: cleanString(product.category, 80),
                  subcategory: cleanString(product.subcategory, 80),
                  priceKzt: Number.isFinite(Number(product.priceKzt))
                    ? Number(product.priceKzt)
                    : null,
                  stockStatus: cleanString(product.stockStatus, 40),
                  image: cleanString(product.image, 500),
                }))
              : [],
          }))
        }
        if (Array.isArray(message.followUps)) {
          cleanMessage.followUps = message.followUps
            .filter((item) => typeof item === 'string')
            .slice(0, 4)
            .map((item) => cleanString(item, 80))
        }
        if (Array.isArray(message.warnings)) {
          cleanMessage.warnings = message.warnings
            .filter((item) => typeof item === 'string')
            .slice(0, 3)
            .map((item) => cleanString(item, 180))
        }
      }

      return cleanMessage
    })
    .slice(-MAX_STORED_MESSAGES)
}

export function buildStoreAIContext(store, fallback = null) {
  if (!store && !fallback?.slug) return null
  const source = store || fallback

  return {
    slug: cleanString(source.slug || source.code, 80),
    name: cleanString(source.name || source.slug || source.code, 120),
    city: cleanString(source.city, 80),
    address: cleanString(source.address, 160),
    phone: cleanString(source.phone, 80),
    email: cleanString(source.email, 120),
    type: cleanString(source.type, 80),
    shortDescription: cleanString(source.short_description || source.shortDescription, 240),
    description: cleanString(source.description, 500),
    whatsappNumber: cleanString(source.whatsapp_number || source.whatsappNumber, 80),
    twogisUrl: cleanString(source.twogis_url || source.twogisUrl, 240),
    instagramUrl: cleanString(source.instagram_url || source.instagramUrl, 240),
    websiteUrl: cleanString(source.website_url || source.websiteUrl, 240),
    aiStoreNotes: cleanString(source.ai_store_notes || source.aiStoreNotes, MAX_STORE_NOTES_LENGTH),
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
