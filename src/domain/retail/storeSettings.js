const AI_STORE_NOTES_LIMIT = 2000

function cleanString(value, max = 500) {
  if (typeof value !== 'string') return null
  const cleaned = value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
  return cleaned || null
}

function normalizeKzPhone(localPhone) {
  const digits = String(localPhone || '').replace(/\D/g, '')
  if (!digits) return null
  const local =
    digits.length > 10 && (digits.startsWith('7') || digits.startsWith('8'))
      ? digits.slice(1, 11)
      : digits.slice(0, 10)
  return local.length === 10 ? `7${local}` : null
}

export function getAIStoreNotesLimit() {
  return AI_STORE_NOTES_LIMIT
}

export function buildRetailStoreSettingsPayload(settings = {}) {
  return {
    name: cleanString(settings.name, 160),
    address: cleanString(settings.address, 240),
    phone: normalizeKzPhone(settings.phone),
    short_description: cleanString(settings.short_description, 240),
    description: cleanString(settings.description, 1200),
    instagram_url: cleanString(settings.instagram_url, 300),
    whatsapp_number: normalizeKzPhone(settings.whatsapp_number),
    twogis_url: cleanString(settings.twogis_url, 300),
    ai_store_notes: cleanString(settings.ai_store_notes, AI_STORE_NOTES_LIMIT),
  }
}
