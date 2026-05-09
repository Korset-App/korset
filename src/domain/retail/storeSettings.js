const AI_STORE_NOTES_LIMIT = 2000

function cleanText(value, max = null) {
  if (typeof value !== 'string') return null
  const cleaned = value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return null
  return max ? cleaned.slice(0, max) : cleaned
}

function formatPhone(localPhone) {
  const digits = String(localPhone || '')
    .replace(/\D/g, '')
    .slice(0, 10)
  return digits ? `7${digits}` : null
}

export function buildRetailStoreSettingsPayload(settings = {}) {
  return {
    name: settings.name,
    address: settings.address,
    phone: formatPhone(settings.phone),
    short_description: cleanText(settings.short_description),
    description: cleanText(settings.description),
    instagram_url: cleanText(settings.instagram_url),
    whatsapp_number: formatPhone(settings.whatsapp_number),
    twogis_url: cleanText(settings.twogis_url),
    ai_store_notes: cleanText(settings.ai_store_notes, AI_STORE_NOTES_LIMIT),
  }
}

export function getAIStoreNotesLimit() {
  return AI_STORE_NOTES_LIMIT
}
