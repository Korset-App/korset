import { cors, getDeviceId, getJsonBody, getSupabaseAdmin, json, requireAuth } from './helpers.js'

export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })

  try {
    const body = await getJsonBody(req)
    const endpoint = body?.endpoint
    if (!endpoint) return json(res, 400, { error: 'endpoint_required' })

    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('push_subscriptions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('endpoint', endpoint)

    const { user } = await requireAuth(req).catch(() => ({ user: null }))
    if (user) {
      query = query.eq('auth_user_id', user.id)
    } else {
      const deviceId = getDeviceId(body)
      if (!deviceId) return json(res, 400, { error: 'device_id_or_auth_required' })
      query = query.eq('device_id', deviceId)
    }

    const { error } = await query
    if (error) return json(res, 500, { error: 'unsubscribe_failed', details: error.message })

    return json(res, 200, { ok: true })
  } catch (error) {
    return json(res, 500, { error: 'unsubscribe_failed', details: error.message })
  }
}
