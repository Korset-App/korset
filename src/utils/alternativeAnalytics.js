import { loadPrivacySettings } from './privacySettings.js'
import { supabase } from './supabase.js'
import { getOrCreateClientToken } from './userIdentity.js'

export const ALTERNATIVE_EVENT = 'korset:alternative_event'

const ALLOWED_TYPES = new Set([
  'alternatives_scenario_selected',
  'alternatives_product_opened',
  'alternatives_compare_clicked',
  'alternatives_ai_help_clicked',
])

const VALID_SCENARIOS = new Set(['similar', 'fits_me', 'cheaper', 'better_composition'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EAN_RE = /^\d{8,14}$/

export function trackAlternativeEvent(type, payload = {}) {
  if (!ALLOWED_TYPES.has(type)) return null

  const event = {
    type,
    storeId: payload.storeId || null,
    storeSlug: payload.storeSlug || null,
    sourceEan: payload.sourceEan ? String(payload.sourceEan) : null,
    alternativeEan: payload.alternativeEan ? String(payload.alternativeEan) : null,
    scenario: payload.scenario || null,
    alternativesCount: Number.isFinite(Number(payload.alternativesCount))
      ? Number(payload.alternativesCount)
      : null,
    ts: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ALTERNATIVE_EVENT, { detail: event }))
    persistAlternativeEvent(event).catch(() => {})
  }

  return event
}

export function buildAlternativeEventInsert(event = {}) {
  if (!ALLOWED_TYPES.has(event.type)) return null
  if (!UUID_RE.test(String(event.storeId || ''))) return null
  if (!EAN_RE.test(String(event.sourceEan || ''))) return null
  if (event.alternativeEan && !EAN_RE.test(String(event.alternativeEan))) return null
  if (event.scenario && !VALID_SCENARIOS.has(event.scenario)) return null
  if (!UUID_RE.test(String(event.clientToken || ''))) return null

  return {
    event_type: event.type,
    store_id: event.storeId,
    source_ean: String(event.sourceEan),
    candidate_ean: event.alternativeEan ? String(event.alternativeEan) : null,
    scenario: event.scenario || null,
    alternatives_count: Number.isFinite(Number(event.alternativesCount))
      ? Number(event.alternativesCount)
      : null,
    client_token: event.clientToken,
  }
}

export async function persistAlternativeEvent(event = {}) {
  const privacy = loadPrivacySettings()
  if (!privacy.analyticsEnabled) return { skipped: 'privacy_disabled' }

  const row = buildAlternativeEventInsert({
    ...event,
    clientToken: getOrCreateClientToken(),
  })
  if (!row) return { skipped: 'invalid_event' }

  const { error } = await supabase.from('alternative_events').insert(row)
  if (error) {
    console.error('alternative event error', error)
    return { error }
  }

  return { ok: true }
}
