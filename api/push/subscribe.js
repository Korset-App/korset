import { cors, getDeviceId, getJsonBody, getSupabaseAdmin, json, requireAuth } from './helpers.js'

export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })

  try {
    const { user, error: authError } = await requireAuth(req)
    if (authError) return json(res, 401, { error: 'unauthorized', details: authError })

    const body = await getJsonBody(req)
    const { subscription, preferences = {}, storeSlug = null } = body
    const deviceId = getDeviceId(body)
    const authUserId = user.id

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return json(res, 400, { error: 'invalid_subscription' })
    }

    const supabase = getSupabaseAdmin()
    const payload = {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      auth_user_id: authUserId,
      device_id: deviceId,
      store_slug: storeSlug,
      preferences,
      is_active: true,
      user_agent: req.headers['user-agent'] || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(payload, { onConflict: 'endpoint' })

    if (error) return json(res, 500, { error: 'subscription_save_failed', details: error.message })
    return json(res, 200, { ok: true })
  } catch (error) {
    return json(res, 500, { error: 'subscribe_failed', details: error.message })
  }
}
