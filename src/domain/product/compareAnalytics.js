// Records a single compare screen view as a Supabase row. The actual insert
// is fire-and-forget — analytics must never break the screen or surface an
// error to the shopper. Returns a Promise so callers can await for tests.
import { supabase } from '../../utils/supabase.js'

const TRACKED_STATUSES = new Set(['winner', 'draw', 'blocked'])

export function buildCompareEventPayload({
  storeId,
  userId = null,
  eanA,
  eanB,
  status,
  winnerSide = null,
  primaryReason = null,
  lang = 'ru',
} = {}) {
  if (!storeId || !eanA || !eanB) return null
  if (!TRACKED_STATUSES.has(status)) return null

  return {
    store_id: storeId,
    user_id: userId,
    ean_a: String(eanA),
    ean_b: String(eanB),
    status,
    winner_side: winnerSide === 'A' || winnerSide === 'B' ? winnerSide : null,
    primary_reason: primaryReason || null,
    lang: lang === 'kz' ? 'kz' : 'ru',
  }
}

export async function recordCompareEvent(payload) {
  const row = buildCompareEventPayload(payload)
  if (!row) return { skipped: true }

  const result = await supabase.from('compare_events').insert(row)
  if (result.error) {
    // Silent by design; analytics failures never reach the UI.
    return { error: result.error.message }
  }
  return { ok: true }
}
