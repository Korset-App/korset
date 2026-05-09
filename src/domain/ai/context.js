/**
 * AI Store Context and Local Storage Session Management.
 */

export function buildStoreAIContext(store) {
  if (!store) return null

  let notes = String(store.ai_store_notes || store.aiStoreNotes || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    slug: store.slug || store.code || '',
    name: store.name || '',
    city: store.city || '',
    address: store.address || '',
    phone: store.phone || '',
    email: store.email || '',
    type: store.type || '',
    shortDescription: store.short_description || store.shortDescription || '',
    description: store.description || '',
    whatsappNumber: store.whatsapp_number || store.whatsappNumber || '',
    twogisUrl: store.twogis_url || store.twogisUrl || '',
    instagramUrl: store.instagram_url || store.instagramUrl || '',
    websiteUrl: store.website_url || store.websiteUrl || '',
    aiStoreNotes: notes.slice(0, 2000),
  }
}

export function buildAIChatStorageKey({ mode, storeSlug, ean }) {
  if (mode === 'general') {
    return `korset_ai_chat_general_${storeSlug}`
  }
  if (mode === 'product') {
    return `korset_ai_chat_product_${storeSlug}_${ean}`
  }
  return ''
}

export function saveAIChatSession({ storage, key, messages = [], now = Date.now() }) {
  const filtered = messages.filter(
    (msg) =>
      msg &&
      (msg.role === 'user' || msg.role === 'assistant') &&
      typeof msg.content === 'string' &&
      msg.content.trim() !== ''
  )
  const recent = filtered.slice(-30)
  storage.setItem(
    key,
    JSON.stringify({
      messages: recent,
      updatedAt: now,
    })
  )
}

export function loadAIChatSession({
  storage,
  key,
  now = Date.now(),
  ttlMs = 14 * 24 * 60 * 60 * 1000,
}) {
  const raw = storage.getItem(key)
  if (!raw) {
    return { messages: [], updatedAt: null }
  }
  try {
    const data = JSON.parse(raw)
    const messages = data.messages || []
    const updatedAt = data.updatedAt || null

    if (updatedAt && now - updatedAt > ttlMs) {
      if (typeof storage.removeItem === 'function') {
        storage.removeItem(key)
      } else if (typeof storage.delete === 'function') {
        storage.delete(key)
      }
      return { messages: [], updatedAt: null }
    }

    return { messages, updatedAt }
  } catch (err) {
    return { messages: [], updatedAt: null }
  }
}

export function clearAIChatSession({ storage, key }) {
  if (!storage) return
  if (typeof storage.removeItem === 'function') {
    storage.removeItem(key)
  } else if (typeof storage.delete === 'function') {
    storage.delete(key)
  }
}
