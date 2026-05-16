/* global process, fetch, console */
// Vercel Serverless Function — server-side proxy for OpenAI chat models
// API ключ ТОЛЬКО на сервере (process.env.OPENAI_API_KEY)
// Клиент вызывает: POST /api/ai { messages, mode, product?, lang }
// RAG: перед OpenAI-вызовом подтягивает контекст из vault_embeddings (pgvector)
// Auth: JWT verification + IP-based rate limiting

import { createClient } from '@supabase/supabase-js'
import { buildGeneralAIFollowUps } from '../src/domain/ai/followUps.js'
import {
  buildAIProductGroups,
  buildProductAIResponseMeta,
} from '../src/domain/ai/responseShape.js'
import { buildSafetyNotes } from '../src/domain/ai/safetyContract.js'

const CORS_ORIGINS = [
  'https://korset.app',
  'https://www.korset.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

export const AI_MODELS = {
  default: process.env.OPENAI_CHAT_MODEL || 'gpt-5.4-nano',
  highQuality: process.env.OPENAI_CHAT_MODEL_HIGH_QUALITY || 'gpt-5.4-mini',
}

export const AI_MODEL = AI_MODELS.default

export const AI_LIMITS = {
  maxMessages: 12,
  maxMessageLength: 1200,
  maxTotalMessageLength: 6000,
  maxCatalogCandidates: 12,
  maxProductGroups: 4,
  maxProductsPerGroup: 3,
  maxStructuredProducts: 12,
}

export const RATE_LIMITS = {
  authenticated: { maxRequests: 30, windowMs: 60_000 },
  anonymous: { maxRequests: 8, windowMs: 60_000 },
}

export function selectOpenAIModel({ mode } = {}) {
  return {
    model: AI_MODELS.default,
    route: 'default',
    reason: mode ? `${mode}:default` : 'default',
  }
}

export function classifyOpenAIError(status, error = {}) {
  const code = typeof error.code === 'string' ? error.code : ''
  const type = typeof error.type === 'string' ? error.type : ''

  if (status === 401 || status === 403) return 'auth'
  if (status === 429 && code === 'insufficient_quota') return 'quota'
  if (status === 429) return 'rate_limited'
  if (status === 404 || code === 'model_not_found') return 'model_not_found'
  if (status === 400) return 'bad_request'
  if (status >= 500) return 'provider_error'
  if (type === 'invalid_request_error') return 'bad_request'
  return 'unknown'
}

export function buildAIUsageEvent({
  mode,
  modelRoute,
  model,
  completionLimits = {},
  usage = null,
  startedAt,
  status = 'ok',
  errorType = null,
  storeContext = null,
  catalogContext = [],
  ragUsed = false,
}) {
  const safeUsage = usage && typeof usage === 'object' ? usage : {}
  return {
    event: 'ai_completion',
    mode,
    model,
    modelRoute,
    status,
    errorType,
    durationMs: startedAt ? Math.max(0, Date.now() - startedAt) : null,
    promptTokens: Number.isFinite(Number(safeUsage.prompt_tokens))
      ? Number(safeUsage.prompt_tokens)
      : null,
    completionTokens: Number.isFinite(Number(safeUsage.completion_tokens))
      ? Number(safeUsage.completion_tokens)
      : null,
    totalTokens: Number.isFinite(Number(safeUsage.total_tokens))
      ? Number(safeUsage.total_tokens)
      : null,
    maxCompletionTokens: completionLimits.max_completion_tokens || null,
    catalogCandidates: Array.isArray(catalogContext) ? catalogContext.length : 0,
    ragUsed: !!ragUsed,
    storeSlug: storeContext?.slug || null,
  }
}

function logAIUsage(event) {
  console.info('[ai] usage', event)
}

const rateLimitStore = new Map()

function checkRateLimit(key, limit) {
  const now = Date.now()
  const entry = rateLimitStore.get(key)
  if (!entry || now - entry.windowStart > limit.windowMs) {
    rateLimitStore.set(key, { windowStart: now, count: 1 })
    return { allowed: true, remaining: limit.maxRequests - 1 }
  }
  if (entry.count >= limit.maxRequests) {
    return { allowed: false, remaining: 0 }
  }
  entry.count++
  return { allowed: true, remaining: limit.maxRequests - entry.count }
}

function corsHeaders(req, res) {
  const origin = req.headers.origin || ''
  const allowOrigin = CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0]
  res.setHeader('Access-Control-Allow-Origin', allowOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')
}

// ── Input validation & sanitization ─────────────────────────────

export function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > AI_LIMITS.maxMessages) {
    return null
  }
  let total = 0
  const cleanMessages = []
  for (const m of messages) {
    if (!m || typeof m !== 'object') return null
    if (m.role !== 'user' && m.role !== 'assistant') return null
    if (
      typeof m.content !== 'string' ||
      m.content.length === 0 ||
      m.content.length > AI_LIMITS.maxMessageLength
    ) {
      return null
    }
    total += m.content.length
    if (total > AI_LIMITS.maxTotalMessageLength) return null
    cleanMessages.push({ role: m.role, content: m.content })
  }
  return cleanMessages
}

function cleanString(value, max = 200) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max)
}

function sanitizeProduct(product) {
  if (!product || typeof product !== 'object') return null
  return {
    ean: cleanString(product.ean, 32),
    name: cleanString(product.name, 200),
    brand: cleanString(product.brand, 100),
    category: cleanString(product.category, 80),
    subcategory: cleanString(product.subcategory, 80),
    group: cleanString(product.group, 80),
    ingredients: cleanString(product.ingredients, 1500),
    ingredientsKz: cleanString(product.ingredientsKz, 1500),
    halalStatus: ['yes', 'no', 'unknown'].includes(product.halalStatus)
      ? product.halalStatus
      : 'unknown',
    allergens: Array.isArray(product.allergens)
      ? product.allergens
          .filter((a) => typeof a === 'string')
          .slice(0, 20)
          .map((a) => cleanString(a, 50))
      : [],
    nutrition:
      product.nutrition && typeof product.nutrition === 'object' ? product.nutrition : null,
    nutritionPer100:
      product.nutritionPer100 && typeof product.nutritionPer100 === 'object'
        ? product.nutritionPer100
        : null,
    priceKzt: Number.isFinite(Number(product.priceKzt)) ? Number(product.priceKzt) : null,
    stockStatus: cleanString(product.stockStatus, 40) || 'unknown',
    quantity: cleanString(product.quantity, 80),
    image: cleanString(product.image, 500),
    alternatives: Array.isArray(product.alternatives)
      ? sanitizeCatalogContext(product.alternatives, { maxItems: 5 })
      : [],
  }
}

function sanitizeProfile(profile) {
  if (!profile || typeof profile !== 'object') return null
  return {
    halal: !!(profile.halal || profile.halalOnly),
    halalOnly: !!profile.halalOnly,
    allergens: Array.isArray(profile.allergens)
      ? profile.allergens
          .filter((a) => typeof a === 'string')
          .slice(0, 20)
          .map((a) => cleanString(a, 50))
      : [],
    dietGoals: Array.isArray(profile.dietGoals)
      ? profile.dietGoals
          .filter((g) => typeof g === 'string')
          .slice(0, 20)
          .map((g) => cleanString(g, 50))
      : [],
  }
}

function sanitizeStoreContext(storeContext) {
  if (!storeContext || typeof storeContext !== 'object') return null
  return {
    slug: cleanString(storeContext.slug, 120),
    name: cleanString(storeContext.name, 160),
    city: cleanString(storeContext.city, 120),
    address: cleanString(storeContext.address, 240),
    aiStoreNotes: cleanString(storeContext.aiStoreNotes, 2000),
  }
}

export function sanitizeCatalogContext(products = [], options = {}) {
  const maxItems = options.maxItems || AI_LIMITS.maxCatalogCandidates
  if (!Array.isArray(products)) return []

  return products
    .filter((product) => product?.ean && product?.name)
    .slice(0, maxItems)
    .map((product) => ({
      ean: cleanString(product.ean, 32),
      name: cleanString(product.name, 200),
      brand: cleanString(product.brand, 100),
      category: cleanString(product.category, 80),
      subcategory: cleanString(product.subcategory, 80),
      group: cleanString(product.group, 80),
      priceKzt: Number.isFinite(Number(product.priceKzt)) ? Number(product.priceKzt) : null,
      stockStatus: cleanString(product.stockStatus, 40) || 'unknown',
      halalStatus: ['yes', 'no', 'unknown'].includes(product.halalStatus)
        ? product.halalStatus
        : 'unknown',
      dietTags: Array.isArray(product.dietTags)
        ? product.dietTags.slice(0, 12).map((tag) => cleanString(tag, 50))
        : [],
      allergens: Array.isArray(product.allergens)
        ? product.allergens.slice(0, 12).map((allergen) => cleanString(allergen, 50))
        : [],
      image: cleanString(product.image, 500),
      quantity: cleanString(product.quantity, 80),
    }))
}

export function buildProductGroupsFromCatalog(catalogContext = [], options = {}) {
  return buildAIProductGroups(catalogContext, {
    maxGroups: AI_LIMITS.maxProductGroups,
    maxProductsPerGroup: AI_LIMITS.maxProductsPerGroup,
    lang: options.lang || 'ru',
    replyText: options.replyText || '',
  })
}

export function getOpenAICompletionLimits(mode) {
  if (mode === 'enrich') return { max_completion_tokens: 260, temperature: 0.3 }
  if (mode === 'compare') return { max_completion_tokens: 180, temperature: 0.6 }
  if (mode === 'product') return { max_completion_tokens: 280, temperature: 0.6 }
  return { max_completion_tokens: 320, temperature: 0.6 }
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

const RAG_EMBEDDING_MODEL = 'text-embedding-3-small'
const RAG_EMBEDDING_DIMENSIONS = 1536
const RAG_MAX_CHUNKS = 3
const RAG_MAX_CONTEXT_TOKENS = 400
const RAG_MIN_SIMILARITY = 0.5

function getRagSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function fetchRagContext(product, _mode, profile) {
  const supabase = getRagSupabase()
  if (!supabase) return null

  try {
    const queryParts = []
    if (product?.ingredients) queryParts.push(product.ingredients.slice(0, 200))
    if (product?.allergens?.length) queryParts.push(product.allergens.join(' '))
    if (profile?.halal) queryParts.push('халал halal сомнительные добавки')
    if (profile?.allergens?.length) queryParts.push(profile.allergens.join(' '))

    const queryText = queryParts.join(' ').slice(0, 500)
    if (!queryText) return null

    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: RAG_EMBEDDING_MODEL,
        dimensions: RAG_EMBEDDING_DIMENSIONS,
        input: queryText,
      }),
    })

    if (!embRes.ok) return null

    const embData = await embRes.json()
    const queryEmbedding = embData.data?.[0]?.embedding
    if (!queryEmbedding) return null

    const filter = { domain: 'knowledge' }

    const { data, error } = await supabase.rpc('match_vault_chunks', {
      query_embedding: queryEmbedding,
      match_count: RAG_MAX_CHUNKS * 2,
      filter,
    })

    if (error || !data?.length) return null

    const filtered = data.filter((r) => r.similarity >= RAG_MIN_SIMILARITY).slice(0, RAG_MAX_CHUNKS)

    if (filtered.length === 0) return null

    const contextParts = filtered.map(
      (r) => `[${r.heading || r.source_file}]: ${r.content.slice(0, 300)}`
    )

    const totalTokens = contextParts.reduce((sum, p) => sum + Math.ceil(p.length / 4), 0)
    if (totalTokens > RAG_MAX_CONTEXT_TOKENS) {
      while (contextParts.length > 1) {
        contextParts.pop()
        const reduced = contextParts.reduce((sum, p) => sum + Math.ceil(p.length / 4), 0)
        if (reduced <= RAG_MAX_CONTEXT_TOKENS) break
      }
    }

    return contextParts.join('\n\n')
  } catch (e) {
    console.warn('RAG unavailable, falling back to standard prompt:', e.message)
    return null
  }
}

export default async function handler(req, res) {
  const requestStartedAt = Date.now()
  corsHeaders(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })

  // ── Auth + Rate limit ──
  const { user, authenticated } = await verifyAuth(req)
  const rateLimitKey = authenticated
    ? `user:${user.id}`
    : `ip:${req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'}`
  const limit = authenticated ? RATE_LIMITS.authenticated : RATE_LIMITS.anonymous
  const rateResult = checkRateLimit(rateLimitKey, limit)

  res.setHeader('X-RateLimit-Remaining', String(rateResult.remaining))
  if (!rateResult.allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded', retryAfterMs: limit.windowMs })
  }

  try {
    const body = req.body || {}
    const rawMode = body.mode
    const allowedModes = ['product', 'enrich', 'compare', 'general']
    const mode = allowedModes.includes(rawMode) ? rawMode : 'general'
    const lang = body.lang === 'kz' ? 'kz' : 'ru'

    const validMessages = validateMessages(body.messages)
    if (!validMessages) {
      return res.status(400).json({ error: 'Invalid messages payload' })
    }

    const product = sanitizeProduct(body.product)
    const productA = sanitizeProduct(body.productA)
    const productB = sanitizeProduct(body.productB)
    const profile = sanitizeProfile(body.profile)
    const storeContext = sanitizeStoreContext(body.storeContext)
    const catalogContext = sanitizeCatalogContext(body.catalogContext)
    const winner = ['A', 'B', 'draw'].includes(body.winner) ? body.winner : null

    // ── RAG: подтягиваем релевантный контекст из vault ──
    let ragContext = null
    if (mode === 'product' && product) {
      ragContext = await fetchRagContext(product, mode, profile)
    } else if (mode === 'compare' && productA && productB) {
      const combinedProduct = {
        name: `${productA.name} vs ${productB.name}`,
        ingredients: [productA.ingredients, productB.ingredients].filter(Boolean).join('; '),
        allergens: [...(productA.allergens || []), ...(productB.allergens || [])],
      }
      ragContext = await fetchRagContext(combinedProduct, mode, profile)
    }

    // ── Формируем developer prompt на сервере ──
    let systemPrompt

    if (mode === 'product' && product) {
      systemPrompt = buildProductPrompt(product, profile, lang, ragContext, storeContext)
    } else if (mode === 'enrich' && product) {
      systemPrompt = buildEnrichPrompt(product)
    } else if (mode === 'compare' && productA && productB) {
      systemPrompt = buildComparePrompt(productA, productB, profile, winner, lang, ragContext)
    } else {
      systemPrompt = buildGeneralPrompt(lang, storeContext, catalogContext)
    }

    const completionLimits = getOpenAICompletionLimits(mode)
    const modelSelection = selectOpenAIModel({ mode, product, profile, catalogContext })

    // ── Вызов OpenAI ──
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelSelection.model,
        ...completionLimits,
        messages: [{ role: 'developer', content: systemPrompt }, ...validMessages],
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.json().catch(() => ({}))
      const errorType = classifyOpenAIError(openaiRes.status, err?.error || err)
      console.error('[ai] OpenAI error', { type: errorType, status: openaiRes.status, error: err })
      logAIUsage(
        buildAIUsageEvent({
          mode,
          modelRoute: modelSelection.route,
          model: modelSelection.model,
          completionLimits,
          startedAt: requestStartedAt,
          status: 'error',
          errorType,
          storeContext,
          catalogContext,
          ragUsed: !!ragContext,
        })
      )
      return res.status(502).json({ error: 'AI service unavailable' })
    }

    const data = await openaiRes.json()
    const reply = data.choices?.[0]?.message?.content?.trim()
    const responseProductGroups =
      mode === 'general'
        ? buildProductGroupsFromCatalog(catalogContext, { lang, replyText: reply || '' })
        : []
    const productResponseMeta =
      mode === 'product'
        ? buildProductAIResponseMeta({
            product,
            profile,
            alternatives: product?.alternatives || [],
            lang,
          })
        : null
    const followUps =
      mode === 'general'
        ? buildGeneralAIFollowUps({
            query: validMessages.at(-1)?.content || '',
            catalogContext,
            profile,
            lang,
          })
        : []

    logAIUsage(
      buildAIUsageEvent({
        mode,
        modelRoute: modelSelection.route,
        model: modelSelection.model,
        completionLimits,
        usage: data.usage,
        startedAt: requestStartedAt,
        status: 'ok',
        storeContext,
        catalogContext,
        ragUsed: !!ragContext,
      })
    )

    return res.status(200).json({
      reply: reply || '',
      productGroups: responseProductGroups,
      followUps,
      warnings:
        productResponseMeta?.warnings ||
        (mode === 'general' && catalogContext.length === 0
          ? ['Я могу рекомендовать только товары, которые вижу в каталоге текущего магазина.']
          : []),
      verdict: productResponseMeta?.verdict || null,
      confidenceNotes: productResponseMeta?.confidenceNotes || [],
      checkOnPackage: productResponseMeta?.checkOnPackage || [],
      alternatives: productResponseMeta?.alternatives || [],
      ragUsed: !!ragContext,
    })
  } catch (e) {
    console.error('API /ai error:', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// ── Developer prompts ───────────────────────────────────────────

export function buildProductPrompt(product, profile, lang, ragContext, storeContext) {
  const profileParts = []
  if (profile?.halal || profile?.halalOnly) profileParts.push('нужен халал')
  if (profile?.allergens?.length) profileParts.push(`аллергии: ${profile.allergens.join(', ')}`)
  if (profile?.dietGoals?.length) profileParts.push(`диета: ${profile.dietGoals.join(', ')}`)

  const nutr = formatNutrition(product)
  const langNote = lang === 'kz' ? 'Отвечай на казахском языке.' : 'Отвечай на русском языке.'

  const ragSection = ragContext
    ? `\n\nПРОВЕРЕННЫЕ ЗНАНИЯ (используй как факт, приоритет над общими знаниями):\n${ragContext}`
    : ''
  const safetyNotes = buildSafetyNotes({ product, profile, lang })
  const safetySection = `\nSAFETY CONTRACT:
- halalConfidence: ${safetyNotes.halal.level}
- allergyConfidence: ${safetyNotes.allergy.level}
- ${safetyNotes.userNotes.join('\n- ')}
- Если halalConfidence = likely_compatible, объясни это как осторожную практическую оценку по видимому составу: явных запрещённых компонентов не видно, но сертификат не указан.
- не делай вид, что AI полностью беспомощен при unknown halal, если состав достаточно понятен; помогай, но маркируй уверенность и проси проверить упаковку при строгих требованиях.
- Если Fit-Check или данные профиля показывают реальный риск, не спорь с ними и не снижай риск.`
  const storeSection = storeContext?.name
    ? `\nМАГАЗИН: ${storeContext.name}${storeContext.address ? ` | ${storeContext.address}` : ''}${storeContext.aiStoreNotes ? `\nФАКТЫ МАГАЗИНА: ${storeContext.aiStoreNotes}` : ''}`
    : ''
  const alternativesSection = product.alternatives?.length
    ? `\nАЛЬТЕРНАТИВЫ В ЭТОМ МАГАЗИНЕ: ${product.alternatives
        .map((item) => `${item.name}${item.priceKzt ? ` (${item.priceKzt} ₸)` : ''}`)
        .join('; ')}`
    : ''

  return `Ты — Körset AI, умный помощник покупателя в супермаркете Казахстана. Отвечай кратко, по делу. Максимум 3–4 предложения. Без markdown — пиши живым текстом как друг.
${langNote}
Рекомендуй только товары из текущего магазина и только из переданных данных. Если подходящего товара нет в данных, честно скажи, что не видишь его в каталоге этого магазина.
Не выдумывай цену, наличие, состав, сертификаты, халал-статус, аллергены или свойства товара.
Не называй товар безопасным, если данных мало, состав отсутствует, есть совпадение с аллергенами профиля или есть только неполные сведения.
При сильных аллергиях всегда советуй сверить состав, следы аллергенов и маркировку на упаковке; не заменяй медицинскую консультацию.
Халал-статус unknown означает, что сертификат не подтверждён. Не называй товар "подтверждённо халал", но используй halalConfidence из SAFETY CONTRACT: confirmed_halal / likely_compatible / questionable / not_halal / insufficient_data.
Если состав отсутствует, прямо скажи, что данных о составе нет, и перечисли, что проверить на упаковке.
Альтернативы предлагай только из блока "АЛЬТЕРНАТИВЫ В ЭТОМ МАГАЗИНЕ"; если блока нет, скажи, что не видишь подходящих альтернатив в текущем магазине.

ТОВАР: ${product.name} | EAN: ${product.ean || '—'} | Бренд: ${product.brand || '—'}${storeSection}
КБЖУ: ${nutr} | Состав: ${product.ingredients || '—'}
Цена: ${product.priceKzt ? `${product.priceKzt} ₸` : '—'} | Наличие: ${product.stockStatus || 'unknown'}
Халал: ${product.halalStatus === 'yes' ? 'да' : product.halalStatus === 'no' ? 'нет' : 'неизвестно'}
Аллергены: ${product.allergens?.join(', ') || 'нет'}
ПРОФИЛЬ: ${profileParts.length ? profileParts.join('; ') : 'не задан'}${safetySection}${alternativesSection}${ragSection}`
}

export function buildGeneralPrompt(lang, storeContext, catalogContext = []) {
  const storeName = storeContext?.name || 'текущего магазина'
  const catalogSection = catalogContext.length
    ? `\n\nТОВАРЫ, КОТОРЫЕ ВИДНЫ В КАТАЛОГЕ ${storeName}:\n${catalogContext
        .map(
          (item) =>
            `- ${item.name}${item.brand ? `, ${item.brand}` : ''}${item.priceKzt ? `, ${item.priceKzt} ₸` : ''}${item.category ? `, категория: ${item.category}` : ''}${item.subcategory ? `/${item.subcategory}` : ''}, наличие: ${item.stockStatus}`
        )
        .join('\n')}`
    : '\n\nВ переданном catalog context нет подходящих товаров: честно скажи, что не вижу подходящих товаров в каталоге этого магазина, и не предлагай товары вне текущего магазина.'

  if (lang === 'kz') {
    return `Сен — ${storeName} дүкеніндегі Körset AI көмекшісісің. Тек осы дүкеннің берілген каталогындағы тауарларды ұсын. Егер тауар берілген каталогта жоқ болса, оны көрмей тұрғаныңды ашық айт. Қысқа, түсінікті қазақша жауап бер. Максимум 3-4 сөйлем. Markdown, жұлдызша және ұзын тізім қолданба; карточкалардағы тауарларды мәтінде толық қайталама.
ПРЕМИУМ ЖАУАП ЕРЕЖЕСІ: тауарларды тек ағымдағы дүкеннің берілген каталогынан ұсын; карточкалардағы барлық тауарды мәтінде қайталама; тауар топтары сұрауға неге сәйкес келетінін қысқа түсіндір; пайдалы келесі қадам ұсын; сәйкес тауар көрінбесе, осы дүкен каталогында көрмей тұрғаныңды айт.${catalogSection}`
  }
  return `Ты — Körset AI, помощник покупателя в магазине ${storeName}. Помогаешь найти товары, советуешь простые покупки и отвечаешь про состав и аллергены. Рекомендуй только товары из переданного каталога текущего магазина. Если товара нет в данных, честно скажи, что не видишь его в этом магазине. Кратко, по-русски, как дружелюбный консультант. Максимум 3-4 предложения. Не используй markdown, звёздочки и длинные списки; не дублируй в тексте весь список товаров, который уже показан карточками.
ПРЕМИУМ-КОНТРАКТ ОТВЕТА: рекомендуй только из переданного каталога текущего магазина; не повторяй в тексте весь список товаров из карточек; объясни, почему группы товаров подходят под запрос; предложи следующий шаг, например дешевле, без аллергена, halal-фильтр, замену или проверку упаковки; если подходящих товаров не видно, скажи, что не вижу подходящих товаров в каталоге этого магазина, и не предлагай товары вне текущего магазина.${catalogSection}`
}

function buildComparePrompt(productA, productB, profile, winner, lang, ragContext) {
  const profileParts = []
  if (profile?.halal || profile?.halalOnly) profileParts.push('нужен халал')
  if (profile?.allergens?.length) profileParts.push(`аллергии: ${profile.allergens.join(', ')}`)
  if (profile?.dietGoals?.length) profileParts.push(`диета: ${profile.dietGoals.join(', ')}`)

  const langNote = lang === 'kz' ? 'Отвечай на казахском языке.' : 'Отвечай на русском языке.'
  const profileStr = profileParts.length ? profileParts.join('; ') : 'не задан'

  const nutrA = formatNutrition(productA)
  const nutrB = formatNutrition(productB)

  const isDraw = winner === 'draw'
  const winnerLine = isDraw
    ? 'Эти товары по безопасности и составу одинаковы.'
    : `По расчёту Körset, ${winner === 'A' ? productA.name : productB.name} лучше для данного пользователя.`

  const ragSection = ragContext ? `\n\nПРОВЕРЕННЫЕ ЗНАНИЯ:\n${ragContext}` : ''

  return `Ты — Körset AI. Ты только что сравнил два товара для покупателя. Напиши 1-2 предложения объяснения — почему именно этот товар лучше (или почему ничья). Без markdown, живым текстом.
${langNote}
ПРОФИЛЬ: ${profileStr}
ТОВАР A: ${productA.name} | Халал: ${productA.halalStatus || '?'} | КБЖУ: ${nutrA} | Аллергены: ${productA.allergens?.join(', ') || 'нет'}
ТОВАР B: ${productB.name} | Халал: ${productB.halalStatus || '?'} | КБЖУ: ${nutrB} | Аллергены: ${productB.allergens?.join(', ') || 'нет'}
${winnerLine}${ragSection}`
}

function buildEnrichPrompt(product) {
  // ID аллергенов — canonical из ТР ТС 022/2011 (см. src/constants/allergens.js).
  // ВАЖНО: НЕ 'nuts' (legacy) → 'tree_nuts'; НЕ 'shellfish' → 'crustaceans';
  // НЕ 'molluscs'/'sulphites' (OFF-форма) → 'mollusks'/'sulfites' (наша форма).
  return `Товар: "${product.name}"${product.brand ? `, бренд: ${product.brand}` : ''}.
Ответь ТОЛЬКО JSON без markdown:
{"ingredients":"состав на русском","allergens":["milk","eggs","gluten","peanuts","tree_nuts","soy","fish","crustaceans","mollusks","sesame","celery","mustard","lupin","sulfites"],"dietTags":["halal","vegan","vegetarian","gluten_free","dairy_free","sugar_free"],"description":"1 предложение о товаре"}
Оставь в allergens и dietTags ТОЛЬКО те, которые реально относятся к этому товару. Используй ТОЛЬКО перечисленные ID, не выдумывай свои.`
}

function formatNutrition(product) {
  // Поддерживаем оба формата: nutrition (external) и nutritionPer100 (local)
  const n = product.nutrition || product.nutritionPer100
  if (!n) return 'не указано'

  const protein = n.protein ?? '—'
  const fat = n.fat ?? '—'
  const carbs = n.carbs ?? '—'
  const kcal = n.calories ?? n.kcal ?? '—'

  return `Белки ${protein}г, Жиры ${fat}г, Углеводы ${carbs}г, Ккал ${kcal}`
}
