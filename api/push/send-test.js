import {
  cors,
  getDeviceId,
  getJsonBody,
  getSupabaseAdmin,
  json,
  requireAuth,
  sendPushToSubscription,
} from './helpers.js'

export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })

  try {
    const { user, error: authError } = await requireAuth(req)
    if (authError) return json(res, 401, { error: 'unauthorized', details: authError })

    const body = await getJsonBody(req)
    const deviceId = getDeviceId(body)
    const authUserId = user.id
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
    if (authUserId) query = query.eq('auth_user_id', authUserId)
    else if (deviceId) query = query.eq('device_id', deviceId)

    const { data, error } = await query
    if (error)
      return json(res, 500, { error: 'subscription_lookup_failed', details: error.message })
    const subscription = data?.[0]
    if (!subscription) return json(res, 404, { error: 'no_active_subscription' })

    const payload = {
      title: 'Körset',
      body: 'Тестовое push-уведомление работает. Цивилизация пока держится.',
      url: '/profile',
      type: 'system',
      tag: 'test',
    }

    await sendPushToSubscription(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload
    )

    await supabase
      .from('notification_events')
      .insert({
        type: 'system',
        title: payload.title,
        body: payload.body,
        status: 'sent',
        meta: { test: true },
      })

    return json(res, 200, { ok: true })
  } catch (error) {
    return json(res, 500, { error: 'send_test_failed', details: error.message })
  }
}
