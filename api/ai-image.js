/* global process, fetch, console */

import { createClient } from '@supabase/supabase-js'
import {
  AI_IMAGE_INPUT_LIMITS,
  validateAIImagePayload,
} from '../src/domain/ai/imageInput.js'
import { normalizeAIResponse } from '../src/domain/ai/responseShape.js'

const CORS_ORIGINS = [
  'https://korset.app',
  'https://www.korset.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

export const IMAGE_AI_MODEL =
  process.env.OPENAI_VISION_MODEL || process.env.OPENAI_IMAGE_MODEL || 'gpt-4o-mini'

export const IMAGE_AI_LIMITS = {
  ...AI_IMAGE_INPUT_LIMITS,
  maxMessageLength: 1200,
  anonymous: { maxRequests: 4, windowMs: 60_000 },
  authenticated: { maxRequests: 12, windowMs: 60_000 },
}

const rateLimitStore = new Map()

function cleanString(value, max = 200) {
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

export function sanitizeImageAIRequest(body = {}) {
  if (!body.image || typeof body.image !== 'object') return { ok: false, error: 'image_required' }
  const mimeType = cleanString(body.image.mimeType, 80).toLowerCase()
  const dataUrl = typeof body.image.dataUrl === 'string' ? body.image.dataUrl : ''
  const payloadValidation = validateAIImagePayload({ dataUrl, mimeType })
  if (!payloadValidation.ok) return { ok: false, error: payloadValidation.error }

  const lang = body.lang === 'kz' ? 'kz' : 'ru'
  const message = cleanString(body.message, IMAGE_AI_LIMITS.maxMessageLength)
  return {
    ok: true,
    value: {
      lang,
      storeSlug: cleanString(body.storeSlug || body.storeContext?.slug, 120) || null,
      storeName: cleanString(body.storeContext?.name, 160) || null,
      message,
      image: {
        dataUrl,
        mimeType,
        bytes: payloadValidation.bytes,
      },
      profile: sanitizeProfile(body.profile),
    },
  }
}

function sanitizeProfile(profile) {
  if (!profile || typeof profile !== 'object') return null
  return {
    halal: !!(profile.halal || profile.halalOnly),
    halalOnly: !!profile.halalOnly,
    allergens: Array.isArray(profile.allergens)
      ? profile.allergens.filter((item) => typeof item === 'string').slice(0, 20).map((item) => cleanString(item, 50))
      : [],
    dietGoals: Array.isArray(profile.dietGoals)
      ? profile.dietGoals.filter((item) => typeof item === 'string').slice(0, 20).map((item) => cleanString(item, 50))
      : [],
  }
}

export function buildPackageImagePrompt({ lang = 'ru', storeSlug = null, message = '' } = {}) {
  const langNote = lang === 'kz' ? 'Қазақ тілінде жауап бер.' : 'Отвечай на русском языке.'
  const storeLine = storeSlug ? `Магазин context: ${storeSlug}.` : 'Магазин context не указан.'
  const userMessage = message ? `Запрос покупателя: ${message}` : 'Запрос покупателя: проверь упаковку и состав этого товара.'
  return `Ты — Körset AI, помощник покупателя продуктового магазина в Казахстане. ${langNote} ${storeLine} ${userMessage}
Анализируй только фото упаковки продуктового товара: состав, аллергены, следы аллергенов, халал-маркеры, КБЖУ, срок годности, условия хранения и предупреждения, если они видимы.
Если фото не похоже на упаковку продуктового товара, честно скажи, что можешь работать только с упаковкой продуктов. Не анализируй людей, лица, документы, чеки, банковские карты, полки, витрины, лекарства, электронику, стройтовары, алкоголь или табак.
Не выдумывай невидимый текст, сертификаты, состав, цену, наличие или халал-статус. Если часть упаковки не читается, так и скажи.
Для аллергий, халал, детского питания, беременности, здоровья, срока годности и безопасности обязательно напиши покупателю: проверь физическую упаковку. Не представляй чтение фото как сертификат, медицинскую гарантию или окончательный вердикт.
Не используй markdown-разметку: без **, *, заголовков, таблиц и bullet-списков. Ответь живым текстом, максимум 4 предложения.`
}

export function classifyImageAIError(status) {
  if (status === 400) return 'bad_request'
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'provider_error'
  return 'unknown'
}

export function buildImageAIUsageEvent({
  startedAt,
  status = 'ok',
  errorType = null,
  model = IMAGE_AI_MODEL,
  storeSlug = null,
  imageBytes = null,
  imageMime = null,
} = {}) {
  return {
    event: 'ai_image_analysis',
    status,
    errorType,
    model,
    durationMs: startedAt ? Math.max(0, Date.now() - startedAt) : null,
    imageBytes: Number.isFinite(Number(imageBytes)) ? Math.max(0, Number(imageBytes)) : null,
    imageMime: cleanString(imageMime, 80) || null,
    storeSlug: cleanString(storeSlug, 120) || null,
  }
}

function logImageAIUsage(event) {
  console.info('[ai-image] usage', event)
}

export default async function handler(req, res) {
  const startedAt = Date.now()
  corsHeaders(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })

  const auth = await verifyAuth(req)
  const rateKey = auth.authenticated && auth.user?.id ? `user:${auth.user.id}` : `ip:${getClientIp(req)}`
  const rateLimit = auth.authenticated ? IMAGE_AI_LIMITS.authenticated : IMAGE_AI_LIMITS.anonymous
  const rateResult = checkRateLimit(rateKey, rateLimit)
  res.setHeader('X-RateLimit-Remaining', String(rateResult.remaining))
  if (!rateResult.allowed) return res.status(429).json({ error: 'rate_limited', retryAfterMs: rateLimit.windowMs })

  const sanitized = sanitizeImageAIRequest(req.body || {})
  if (!sanitized.ok) return res.status(400).json({ error: sanitized.error })

  const request = sanitized.value

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: IMAGE_AI_MODEL,
        max_completion_tokens: 360,
        temperature: 0.4,
        messages: [
          {
            role: 'developer',
            content: buildPackageImagePrompt({
              lang: request.lang,
              storeSlug: request.storeSlug,
              message: request.message,
            }),
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  request.message ||
                  (request.lang === 'kz'
                    ? 'Осы тауардың қаптамасы мен құрамын тексеріңіз.'
                    : 'Проверь упаковку и состав этого товара.'),
              },
              { type: 'image_url', image_url: { url: request.image.dataUrl, detail: 'auto' } },
            ],
          },
        ],
      }),
    })

    if (!openaiRes.ok) {
      const errorType = classifyImageAIError(openaiRes.status)
      logImageAIUsage(
        buildImageAIUsageEvent({
          startedAt,
          status: 'error',
          errorType,
          model: IMAGE_AI_MODEL,
          storeSlug: request.storeSlug,
          imageBytes: request.image.bytes,
          imageMime: request.image.mimeType,
        })
      )
      return res.status(502).json({ error: 'image_ai_unavailable' })
    }

    const data = await openaiRes.json()
    const reply = data.choices?.[0]?.message?.content?.trim() || ''
    logImageAIUsage(
      buildImageAIUsageEvent({
        startedAt,
        status: 'ok',
        model: IMAGE_AI_MODEL,
        storeSlug: request.storeSlug,
        imageBytes: request.image.bytes,
        imageMime: request.image.mimeType,
      })
    )

    return res.status(200).json(
      normalizeAIResponse({
        reply,
        productGroups: [],
        followUps: [],
        warnings: [],
        ragUsed: false,
      })
    )
  } catch (error) {
    console.error('[ai-image] error', error)
    logImageAIUsage(buildImageAIUsageEvent({ startedAt, status: 'error', errorType: 'unknown' }))
    return res.status(500).json({ error: 'image_ai_failed' })
  }
}
