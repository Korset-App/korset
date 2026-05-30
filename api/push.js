/* global process, Buffer */

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@korset.app'
const INTERNAL_TOKEN = process.env.PUSH_INTERNAL_TOKEN || ''

const CORS_ORIGINS = [
  'https://korset.app',
  'https://www.korset.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

let configured = false

function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function cors(req, res) {
  const origin = req.headers.origin || ''
  const allowOrigin = CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0]
  res.setHeader('Access-Control-Allow-Origin', allowOrigin)
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-push-internal-token'
  )
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error('supabase_service_role_missing')
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
}

function configureWebPush() {
  if (configured) return
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) throw new Error('vapid_keys_missing')
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  configured = true
}

function requireInternalToken(req) {
  const headerToken =
    req.headers['x-push-internal-token'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '')
  return INTERNAL_TOKEN && headerToken === INTERNAL_TOKEN
}

async function requireAuth(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return { user: null, error: 'missing_token' }

  const token = authHeader.slice(7)
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { user: null, error: 'supabase_not_configured' }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    })
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return { user: null, error: error?.message || 'invalid_token' }
    return { user: data.user, error: null }
  } catch (error) {
    return { user: null, error: error.message }
  }
}

async function getJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const text = Buffer.concat(chunks).toString('utf8')
  return text ? JSON.parse(text) : {}
}

function getDeviceId(body = {}) {
  return body.deviceId || body.device_id || null
}

async function sendPushToSubscription(subscription, payload) {
  configureWebPush()
  return webpush.sendNotification(subscription, JSON.stringify(payload))
}

function getPushAction(req) {
  const fromQuery = String(req.query?.route || req.query?.action || '').replace(/^\/+/, '')
  if (fromQuery) return fromQuery.split('/')[0]
  const match = req.url?.match(/\/api\/push\/([^/?#]+)/)
  return match?.[1] || ''
}

async function handleSubscribe(req, res) {
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

  const { error } = await supabase.from('push_subscriptions').upsert(payload, { onConflict: 'endpoint' })
  if (error) return json(res, 500, { error: 'subscription_save_failed', details: error.message })
  return json(res, 200, { ok: true })
}

async function handleUnsubscribe(req, res) {
  const { error: authError } = await requireAuth(req)
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
}

async function handleSendTest(req, res) {
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
  if (error) return json(res, 500, { error: 'subscription_lookup_failed', details: error.message })
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

  await supabase.from('notification_events').insert({
    type: 'system',
    title: payload.title,
    body: payload.body,
    status: 'sent',
    meta: { test: true },
  })

  return json(res, 200, { ok: true })
}

async function handleSendEvent(req, res) {
  if (!requireInternalToken(req)) return json(res, 401, { error: 'unauthorized' })

  const body = await getJsonBody(req)
  const {
    type = 'system',
    title = 'Körset',
    message = 'Новое уведомление.',
    url = '/profile',
    authUserId = null,
    deviceId = null,
    storeSlug = null,
  } = body

  const supabase = getSupabaseAdmin()
  let query = supabase.from('push_subscriptions').select('*').eq('is_active', true)

  if (authUserId) query = query.eq('auth_user_id', authUserId)
  if (deviceId) query = query.eq('device_id', deviceId)
  if (storeSlug) query = query.or(`store_slug.eq.${storeSlug},store_slug.is.null`)

  const { data: subscriptions, error } = await query
  if (error) return json(res, 500, { error: 'subscription_lookup_failed', details: error.message })

  const eventPayload = { type, title, body: message, url, storeSlug, tag: type }
  const { data: eventRow, error: eventErr } = await supabase
    .from('notification_events')
    .insert({ type, title, body: message, status: 'pending', meta: { url, authUserId, deviceId, storeSlug } })
    .select('id')
    .maybeSingle()
  if (eventErr) return json(res, 500, { error: 'event_create_failed', details: eventErr.message })

  let sent = 0
  let failed = 0
  for (const sub of subscriptions || []) {
    try {
      await sendPushToSubscription({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, eventPayload)
      sent += 1
      await supabase.from('notification_deliveries').insert({ event_id: eventRow?.id || null, endpoint: sub.endpoint, status: 'sent' })
    } catch (error) {
      failed += 1
      await supabase.from('notification_deliveries').insert({ event_id: eventRow?.id || null, endpoint: sub.endpoint, status: 'failed', error_message: error.message })
    }
  }

  await supabase
    .from('notification_events')
    .update({ status: failed ? (sent ? 'partial' : 'failed') : 'sent', deliveries_total: sent + failed, deliveries_success: sent, deliveries_failed: failed })
    .eq('id', eventRow?.id)

  return json(res, 200, { ok: true, sent, failed })
}

export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })

  try {
    const action = getPushAction(req)
    if (action === 'subscribe') return handleSubscribe(req, res)
    if (action === 'unsubscribe') return handleUnsubscribe(req, res)
    if (action === 'send-test') return handleSendTest(req, res)
    if (action === 'send-event') return handleSendEvent(req, res)
    return json(res, 404, { error: 'push_action_not_found' })
  } catch (error) {
    return json(res, 500, { error: 'push_failed', details: error.message })
  }
}
