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

export function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error('supabase_service_role_missing')
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
}

export function configureWebPush() {
  if (configured) return
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) throw new Error('vapid_keys_missing')
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  configured = true
}

export function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export function cors(req, res) {
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

export function requireInternalToken(req) {
  const headerToken =
    req.headers['x-push-internal-token'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '')
  return INTERNAL_TOKEN && headerToken === INTERNAL_TOKEN
}

export async function requireAuth(req) {
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
  } catch (e) {
    return { user: null, error: e.message }
  }
}

export async function sendPushToSubscription(subscription, payload) {
  configureWebPush()
  return webpush.sendNotification(subscription, JSON.stringify(payload))
}

export async function getJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const text = Buffer.concat(chunks).toString('utf8')
  return text ? JSON.parse(text) : {}
}

export function getDeviceId(body = {}) {
  return body.deviceId || body.device_id || null
}
