/* global process, fetch, console, Blob, FormData, Buffer */

import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: false,
  },
}

const CORS_ORIGINS = [
  'https://korset.app',
  'https://www.korset.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

export const TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe'

export const TRANSCRIPTION_LIMITS = {
  minDurationMs: 800,
  maxDurationMs: 20_000,
  maxBytes: 4 * 1024 * 1024,
}

export const TRANSCRIPTION_RATE_LIMITS = {
  anonymous: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  authenticated: { maxRequests: 30, windowMs: 60 * 60 * 1000 },
}

const SUPPORTED_AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
])

const rateLimitStore = new Map()

function cleanString(value, max = 120) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

function corsHeaders(req, res) {
  const origin = req.headers.origin || ''
  const allowOrigin = CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0]
  res.setHeader('Access-Control-Allow-Origin', allowOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')
}

function checkRateLimit(key, limit) {
  const now = Date.now()
  const entry = rateLimitStore.get(key)
  if (!entry || now - entry.windowStart > limit.windowMs) {
    rateLimitStore.set(key, { windowStart: now, count: 1 })
    return { allowed: true, remaining: limit.maxRequests - 1 }
  }
  if (entry.count >= limit.maxRequests) return { allowed: false, remaining: 0 }
  entry.count++
  return { allowed: true, remaining: limit.maxRequests - entry.count }
}

async function verifyAuth(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return { user: null, authenticated: false }

  const token = authHeader.slice(7)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return { user: null, authenticated: false }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return { user: null, authenticated: false }
    return { user: data.user, authenticated: true }
  } catch {
    return { user: null, authenticated: false }
  }
}

function getClientIp(req) {
  const forwarded = cleanString(req.headers['x-forwarded-for'], 200)
  return forwarded.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
}

export function buildTranscriptionRateLimitIdentity({ req, auth } = {}) {
  if (auth?.authenticated && auth.user?.id) {
    return {
      key: `user:${auth.user.id}`,
      limit: TRANSCRIPTION_RATE_LIMITS.authenticated,
      authenticated: true,
    }
  }

  return {
    key: `ip:${getClientIp(req || { headers: {} })}`,
    limit: TRANSCRIPTION_RATE_LIMITS.anonymous,
    authenticated: false,
  }
}

function readRequestBuffer(req) {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body)
  if (typeof req.body === 'string') return Promise.resolve(Buffer.from(req.body, 'binary'))

  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function parseContentDisposition(value = '') {
  const result = {}
  for (const part of value.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=')
    if (!rawValue.length) continue
    result[rawKey] = rawValue.join('=').replace(/^"|"$/g, '')
  }
  return result
}

export function parseMultipartFormData(buffer, contentType = '') {
  const boundary = contentType.match(/boundary=(?:(?:"([^"]+)")|([^;]+))/)?.[1] || contentType.match(/boundary=(?:(?:"([^"]+)")|([^;]+))/)?.[2]
  if (!boundary) throw new Error('missing_boundary')

  const raw = buffer.toString('binary')
  const parts = raw.split(`--${boundary}`).slice(1, -1)
  const fields = {}
  let file = null

  for (const part of parts) {
    const normalized = part.replace(/^\r\n/, '').replace(/\r\n$/, '')
    const splitAt = normalized.indexOf('\r\n\r\n')
    if (splitAt === -1) continue

    const headerLines = normalized.slice(0, splitAt).split('\r\n')
    const body = normalized.slice(splitAt + 4)
    const headers = Object.fromEntries(
      headerLines.map((line) => {
        const index = line.indexOf(':')
        return index === -1
          ? ['', '']
          : [line.slice(0, index).toLowerCase(), line.slice(index + 1).trim()]
      })
    )
    const disposition = parseContentDisposition(headers['content-disposition'])
    const name = disposition.name
    if (!name) continue

    if (disposition.filename) {
      file = {
        fieldName: name,
        filename: cleanString(disposition.filename, 180) || 'voice.webm',
        contentType: cleanString(headers['content-type'], 80) || 'application/octet-stream',
        buffer: Buffer.from(body, 'binary'),
      }
    } else {
      fields[name] = Buffer.from(body, 'binary').toString('utf8').trim()
    }
  }

  return { fields, file }
}

export function sanitizeTranscriptionMeta({ lang, storeSlug, durationMs } = {}) {
  const safeLang = lang === 'ru' || lang === 'kz' ? lang : 'auto'
  const safeDuration = Number(durationMs)
  return {
    lang: safeLang,
    storeSlug: cleanString(storeSlug, 80) || null,
    durationMs: Number.isFinite(safeDuration) && safeDuration >= 0 ? Math.round(safeDuration) : null,
  }
}

export function classifyTranscriptionError(status) {
  if (status === 400) return 'bad_request'
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'provider_error'
  return 'unknown'
}

export function isSupportedTranscriptionAudioType(contentType = '') {
  const baseType = cleanString(contentType, 100).split(';')[0].trim().toLowerCase()
  return SUPPORTED_AUDIO_TYPES.has(baseType)
}

export function buildTranscriptionUsageEvent({
  startedAt,
  status = 'ok',
  errorType = null,
  model = TRANSCRIPTION_MODEL,
  storeSlug = null,
  durationMs = null,
  audioBytes = null,
  language = null,
} = {}) {
  return {
    event: 'ai_transcription',
    status,
    errorType,
    model,
    durationMs: startedAt ? Math.max(0, Date.now() - startedAt) : null,
    audioDurationMs: Number.isFinite(Number(durationMs)) ? Math.max(0, Number(durationMs)) : null,
    audioBytes: Number.isFinite(Number(audioBytes)) ? Math.max(0, Number(audioBytes)) : null,
    language: cleanString(language, 12) || null,
    storeSlug: cleanString(storeSlug, 80) || null,
  }
}

function logTranscriptionUsage(event) {
  console.info('[ai-transcribe] usage', event)
}

function validateAudio({ file, durationMs }) {
  if (!file?.buffer?.length) return 'audio_empty'
  if (!isSupportedTranscriptionAudioType(file.contentType)) return 'unsupported_audio_type'
  if (file.buffer.length > TRANSCRIPTION_LIMITS.maxBytes) return 'audio_too_large'
  if (durationMs != null && durationMs < TRANSCRIPTION_LIMITS.minDurationMs) return 'audio_too_short'
  if (durationMs != null && durationMs > TRANSCRIPTION_LIMITS.maxDurationMs) return 'audio_too_long'
  return null
}

export default async function handler(req, res) {
  const startedAt = Date.now()
  corsHeaders(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })

  const auth = await verifyAuth(req)
  const rateLimitIdentity = buildTranscriptionRateLimitIdentity({ req, auth })
  const rateResult = checkRateLimit(rateLimitIdentity.key, rateLimitIdentity.limit)
  res.setHeader('X-RateLimit-Remaining', String(rateResult.remaining))
  if (!rateResult.allowed) {
    return res.status(429).json({ error: 'rate_limited', retryAfterMs: rateLimitIdentity.limit.windowMs })
  }

  try {
    const contentType = req.headers['content-type'] || ''
    const body = await readRequestBuffer(req)
    const { fields, file } = parseMultipartFormData(body, contentType)
    const meta = sanitizeTranscriptionMeta(fields)
    const validationError = validateAudio({ file, durationMs: meta.durationMs })
    if (validationError) return res.status(400).json({ error: validationError })

    const form = new FormData()
    form.append('model', TRANSCRIPTION_MODEL)
    form.append('response_format', 'json')
    if (meta.lang === 'ru') form.append('language', 'ru')
    if (meta.lang === 'kz') form.append('language', 'kk')
    form.append('file', new Blob([file.buffer], { type: file.contentType }), file.filename)

    const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })

    if (!openaiRes.ok) {
      const errorType = classifyTranscriptionError(openaiRes.status)
      logTranscriptionUsage(
        buildTranscriptionUsageEvent({
          startedAt,
          status: 'error',
          errorType,
          model: TRANSCRIPTION_MODEL,
          storeSlug: meta.storeSlug,
          durationMs: meta.durationMs,
          audioBytes: file.buffer.length,
          language: meta.lang,
        })
      )
      return res.status(502).json({ error: 'transcription_failed' })
    }

    const data = await openaiRes.json()
    const text = cleanString(data.text, 1200)
    if (!text) return res.status(422).json({ error: 'empty_transcription' })

    logTranscriptionUsage(
      buildTranscriptionUsageEvent({
        startedAt,
        status: 'ok',
        model: TRANSCRIPTION_MODEL,
        storeSlug: meta.storeSlug,
        durationMs: meta.durationMs,
        audioBytes: file.buffer.length,
        language: data.language || meta.lang,
      })
    )

    return res.status(200).json({ text, language: data.language || meta.lang, durationMs: meta.durationMs })
  } catch (error) {
    console.error('[ai-transcribe] error', error)
    logTranscriptionUsage(
      buildTranscriptionUsageEvent({ startedAt, status: 'error', errorType: 'unknown' })
    )
    return res.status(400).json({ error: 'invalid_audio_payload' })
  }
}
