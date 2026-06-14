const AI_STORE_NOTES_LIMIT = 2000
const STORE_SETTINGS_COLUMNS = new Set([
  'name',
  'address',
  'phone',
  'opening_hours',
  'short_description',
  'description',
  'instagram_url',
  'whatsapp_number',
  'twogis_url',
  'ai_store_notes',
  'notify_oos_enabled',
  'notify_daily_enabled',
  'logo_url',
  'images',
  'latitude',
  'longitude',
  'is_published',
])

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
    opening_hours: cleanString(settings.opening_hours, 240),
    short_description: cleanString(settings.short_description, 240),
    description: cleanString(settings.description, 1200),
    instagram_url: cleanString(settings.instagram_url, 300),
    whatsapp_number: normalizeKzPhone(settings.whatsapp_number),
    twogis_url: cleanString(settings.twogis_url, 300),
    ai_store_notes: cleanString(settings.ai_store_notes, AI_STORE_NOTES_LIMIT),
    images: Array.isArray(settings.images) ? settings.images : [],
    latitude: settings.latitude !== undefined && settings.latitude !== '' && settings.latitude !== null ? Number(settings.latitude) : null,
    longitude: settings.longitude !== undefined && settings.longitude !== '' && settings.longitude !== null ? Number(settings.longitude) : null,
    is_published: settings.is_published !== undefined ? Boolean(settings.is_published) : true,
  }
}

export function getMissingStoreSettingsColumn(error) {
  const message = String(error?.message || '')
  if (!message) return null

  const schemaCacheMatch = message.match(/Could not find the '([^']+)' column of 'stores'/i)
  const postgresMatch = message.match(/column\s+stores\.([a-z0-9_]+)\s+does not exist/i)
  const column = schemaCacheMatch?.[1] || postgresMatch?.[1] || null

  return column && STORE_SETTINGS_COLUMNS.has(column) ? column : null
}

export function omitStoreSettingsColumn(payload = {}, column) {
  if (!column || !Object.prototype.hasOwnProperty.call(payload, column)) return payload
  const nextPayload = { ...payload }
  delete nextPayload[column]
  return nextPayload
}
