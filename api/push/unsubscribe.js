import { cors, getJsonBody, getSupabaseAdmin, json, requireAuth } from './helpers.js'

export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })

  try {
    const { user, error: authError } = await requireAuth(req)
    if (authError) return json(res, 401, { error: 'unauthorized', details: authError })

    const body = await getJsonBody(req)
    const endpoint = body?.endpoint
    if (!endpoint) return json(res, 400, { error: 'endpoint_required' })

    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('push_subscriptions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('endpoint', endpoint)
    if (error) return json(res, 500, { error: 'unsubscribe_failed', details: error.message })

    return json(res, 200, { ok: true })
  } catch (error) {
    return json(res, 500, { error: 'unsubscribe_failed', details: error.message })
  }
}
