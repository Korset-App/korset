// Vercel Serverless Function — серверный прокси для OpenAI GPT-4.1 nano
// API ключ ТОЛЬКО на сервере (process.env.OPENAI_API_KEY)
// Клиент вызывает: POST /api/ai { messages, mode, product?, lang }
// RAG: перед OpenAI-вызовом подтягивает контекст из vault_embeddings (pgvector)
// Auth: JWT verification + IP-based rate limiting

import { createClient } from '@supabase/supabase-js'

const CORS_ORIGINS = [
  'https://korset.app',
  'https://www.korset.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

export const RATE_LIMITS = {
  authenticated: { maxRequests: 30, windowMs: 60_000 },
  anonymous: { maxRequests: 8, windowMs: 60_000 },
}

export const AI_LIMITS = {
  maxMessages: 12,
  maxMessageLength: 1200,
  maxTotalMessageLength: 6000,
  maxCatalogCandidates: 12,
  maxProductGroups: 4,
  maxProductsPerGroup: 3,
  maxStructuredProducts: 12,
  maxProductAlternatives: 4,
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
  }
  return messages
}

function cleanString(value, max = 200) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max)
}

function sanitizeProduct(product) {
  if (!product || typeof product !== 'object') return null
  return {
    ean: cleanString(product.ean, 80),
    name: cleanString(product.name, 200),
    brand: cleanString(product.brand, 100),
    ingredients: cleanString(product.ingredients, 1500),
    priceKzt: Number.isFinite(product.priceKzt) ? product.priceKzt : null,
    stockStatus: cleanString(product.stockStatus, 40),
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
    alternatives: Array.isArray(product.alternatives)
      ? product.alternatives.slice(0, AI_LIMITS.maxProductAlternatives).map((item) => ({
          ean: cleanString(item?.ean, 80),
          name: cleanString(item?.name, 180),
          brand: cleanString(item?.brand, 120),
          priceKzt: Number.isFinite(item?.priceKzt) ? item.priceKzt : null,
          stockStatus: cleanString(item?.stockStatus, 40),
          halalStatus: ['yes', 'no', 'unknown'].includes(item?.halalStatus)
            ? item.halalStatus
            : 'unknown',
        }))
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

function sanitizeStore(store) {
  if (!store || typeof store !== 'object') return null
  return {
    slug: cleanString(store.slug, 80),
    name: cleanString(store.name, 160),
    city: cleanString(store.city, 120),
    address: cleanString(store.address, 240),
    phone: cleanString(store.phone, 80),
    email: cleanString(store.email, 160),
    type: cleanString(store.type, 80),
    shortDescription: cleanString(store.shortDescription, 240),
    description: cleanString(store.description, 1000),
    whatsappNumber: cleanString(store.whatsappNumber, 80),
    twogisUrl: cleanString(store.twogisUrl, 300),
    instagramUrl: cleanString(store.instagramUrl, 300),
    websiteUrl: cleanString(store.websiteUrl, 300),
    aiStoreNotes: cleanString(store.aiStoreNotes, 2000),
  }
}

export function sanitizeCatalogContext(items) {
  if (!Array.isArray(items)) return []
  return items.slice(0, AI_LIMITS.maxCatalogCandidates).map((item) => ({
    ean: cleanString(item?.ean, 80),
    name: cleanString(item?.name, 180),
    brand: cleanString(item?.brand, 120),
    category: cleanString(item?.category, 80),
    priceKzt: Number.isFinite(item?.priceKzt) ? item.priceKzt : null,
    stockStatus: cleanString(item?.stockStatus, 40),
    halalStatus: ['yes', 'no', 'unknown'].includes(item?.halalStatus) ? item.halalStatus : 'unknown',
    dietTags: Array.isArray(item?.dietTags) ? item.dietTags.slice(0, 8).map((v) => cleanString(v, 40)) : [],
    allergens: Array.isArray(item?.allergens) ? item.allergens.slice(0, 8).map((v) => cleanString(v, 40)) : [],
  }))
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

async function fetchRagContext(product, mode, profile, lang) {
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
    const store = sanitizeStore(body.store)
    const catalogContext = sanitizeCatalogContext(body.catalogContext)
    const wantsStructured = body.responseFormat === 'structured'
    const winner = ['A', 'B', 'draw'].includes(body.winner) ? body.winner : null

    // ── RAG: подтягиваем релевантный контекст из vault ──
    let ragContext = null
    if (mode === 'product' && product) {
      ragContext = await fetchRagContext(product, mode, profile, lang)
    } else if (mode === 'compare' && productA && productB) {
      const combinedProduct = {
        name: `${productA.name} vs ${productB.name}`,
        ingredients: [productA.ingredients, productB.ingredients].filter(Boolean).join('; '),
        allergens: [...(productA.allergens || []), ...(productB.allergens || [])],
      }
      ragContext = await fetchRagContext(combinedProduct, mode, profile, lang)
    }

    // ── Формируем system prompt на сервере ──
    let systemPrompt

    if (mode === 'product' && product) {
      systemPrompt = buildProductPrompt(product, profile, lang, ragContext, store)
    } else if (mode === 'enrich' && product) {
      systemPrompt = buildEnrichPrompt(product)
    } else if (mode === 'compare' && productA && productB) {
      systemPrompt = buildComparePrompt(productA, productB, profile, winner, lang, ragContext)
    } else {
      systemPrompt = buildGeneralPrompt(lang, store, profile, catalogContext)
    }

    // ── Вызов OpenAI ──
    const completionLimits = getOpenAICompletionLimits(mode)
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        ...completionLimits,
        messages: [{ role: 'system', content: systemPrompt }, ...validMessages],
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.json().catch(() => ({}))
      console.error('[ai] OpenAI error', err)
      return res.status(502).json({ error: 'AI service unavailable' })
    }

    const data = await openaiRes.json()
    const reply = data.choices?.[0]?.message?.content?.trim()

    return res.status(200).json({
      reply: reply || '',
      productGroups: wantsStructured ? buildProductGroupsFromCatalog(catalogContext) : [],
      followUps: wantsStructured ? buildFollowUps(mode, catalogContext) : [],
      warnings: wantsStructured ? buildWarnings(catalogContext) : [],
      ragUsed: !!ragContext,
    })
  } catch (e) {
    console.error('API /ai error:', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export function getOpenAICompletionLimits(mode) {
  if (mode === 'enrich') return { max_tokens: 260, temperature: 0.3 }
  if (mode === 'compare') return { max_tokens: 180, temperature: 0.6 }
  if (mode === 'product') return { max_tokens: 280, temperature: 0.6 }
  return { max_tokens: 320, temperature: 0.6 }
}

export function buildProductGroupsFromCatalog(catalogContext) {
  const groups = new Map()
  for (const item of catalogContext || []) {
    if (!item.ean || !item.name) continue
    const title = item.category || 'Товары'
    const id = title.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-').replace(/^-|-$/g, '') || 'products'
    if (!groups.has(id)) groups.set(id, { id, title, products: [] })
    const group = groups.get(id)
    if (group.products.length < AI_LIMITS.maxProductsPerGroup) {
      group.products.push({
        ean: item.ean,
        name: item.name,
        brand: item.brand,
        category: item.category,
        priceKzt: item.priceKzt,
        stockStatus: item.stockStatus,
      })
    }
  }
  return [...groups.values()]
    .filter((group) => group.products.length > 0)
    .slice(0, AI_LIMITS.maxProductGroups)
}

function buildFollowUps(_mode, catalogContext) {
  if (!catalogContext?.length) return ['Показать похожие товары', 'Спросить про магазин']
  return ['Сделать дешевле', 'Только халал', 'Показать ещё варианты']
}

function buildWarnings(catalogContext) {
  if (!catalogContext?.length) return []
  return ['Цены и наличие указаны по каталогу магазина и могут отличаться на кассе.']
}

// ── System prompts ──────────────────────────────────────────────

function formatStorePrompt(store) {
  if (!store) return 'МАГАЗИН: не задан'
  const contacts = [
    store.phone ? `телефон ${store.phone}` : '',
    store.whatsappNumber ? `WhatsApp ${store.whatsappNumber}` : '',
    store.twogisUrl ? `2GIS ${store.twogisUrl}` : '',
    store.instagramUrl ? `Instagram ${store.instagramUrl}` : '',
    store.websiteUrl ? `сайт ${store.websiteUrl}` : '',
  ].filter(Boolean)
  const description = [store.shortDescription, store.description].filter(Boolean).join(' ')
  const notes = store.aiStoreNotes ? `\nДоп. факты магазина: ${store.aiStoreNotes}` : ''
  return `МАГАЗИН: ${store.name || 'текущий магазин'}${store.city ? `, ${store.city}` : ''}${store.address ? `, ${store.address}` : ''}
Тип: ${store.type || 'не указан'}
Описание: ${description || 'не указано'}
Контакты: ${contacts.length ? contacts.join('; ') : 'не указаны'}${notes}`
}

function buildProductPrompt(product, profile, lang, ragContext, store = null) {
  const profileParts = []
  if (profile?.halal || profile?.halalOnly) profileParts.push('нужен халал')
  if (profile?.allergens?.length) profileParts.push(`аллергии: ${profile.allergens.join(', ')}`)
  if (profile?.dietGoals?.length) profileParts.push(`диета: ${profile.dietGoals.join(', ')}`)

  const nutr = formatNutrition(product)
  const langNote = lang === 'kz' ? 'Отвечай на казахском языке.' : 'Отвечай на русском языке.'
  const price = product.priceKzt ? `${product.priceKzt} ₸` : 'не указана'
  const stock = product.stockStatus || 'не указано'
  const alternatives = formatProductAlternatives(product.alternatives)

  const ragSection = ragContext
    ? `\n\nПРОВЕРЕННЫЕ ЗНАНИЯ (используй как факт, приоритет над общими знаниями):\n${ragContext}`
    : ''

  return `Ты — Körset AI, помощник покупателя в конкретном магазине Казахстана. Отвечай на "вы", кратко и по делу. Максимум 3–4 предложения. Без markdown.
${langNote}

${formatStorePrompt(store)}

ТОВАР: ${product.name} | EAN: ${product.ean || '—'} | Бренд: ${product.brand || '—'} | Цена: ${price} | Наличие: ${stock}
КБЖУ: ${nutr} | Состав: ${product.ingredients || '—'}
Халал: ${product.halalStatus === 'yes' ? 'да' : product.halalStatus === 'no' ? 'нет' : 'неизвестно'}
Аллергены: ${product.allergens?.join(', ') || 'нет'}
ПРОФИЛЬ: ${profileParts.length ? profileParts.join('; ') : 'не задан'}
АЛЬТЕРНАТИВЫ В ЭТОМ ЖЕ МАГАЗИНЕ: ${alternatives}

Правила: не выдумывай состав, сертификаты, цену, наличие или медицинские выводы. Если в карточке не хватает данных, скажи это спокойно и предложи проверить упаковку. Если халал указан как "да", говори "по данным карточки товара: халал". Если пользователь просит альтернативу, предлагай только товары из списка альтернатив.${ragSection}`
}

function formatProductAlternatives(alternatives) {
  if (!alternatives?.length) return 'нет переданных альтернатив'
  return alternatives
    .filter((item) => item.ean && item.name)
    .map((item, index) => {
      const price = item.priceKzt ? `${item.priceKzt} ₸` : 'цена не указана'
      const stock = item.stockStatus || 'наличие не указано'
      const halal =
        item.halalStatus === 'yes'
          ? 'халал'
          : item.halalStatus === 'no'
            ? 'не халал'
            : 'халал неизвестно'
      return `${index + 1}. ${item.name}${item.brand ? `, ${item.brand}` : ''} | EAN ${item.ean} | ${price} | ${stock} | ${halal}`
    })
    .join('; ')
}

function formatCatalogPrompt(catalogContext) {
  if (!catalogContext?.length) return 'РЕЛЕВАНТНЫЕ ТОВАРЫ ИЗ КАТАЛОГА: не найдены или не переданы'
  const lines = catalogContext.slice(0, 20).map((item, index) => {
    const price = item.priceKzt ? `${item.priceKzt} ₸` : 'цена не указана'
    const stock = item.stockStatus || 'наличие не указано'
    const halal =
      item.halalStatus === 'yes' ? 'халал' : item.halalStatus === 'no' ? 'не халал' : 'халал неизвестно'
    return `${index + 1}. ${item.name}${item.brand ? `, ${item.brand}` : ''} | ${item.category || 'категория не указана'} | ${price} | ${stock} | ${halal}`
  })
  return `РЕЛЕВАНТНЫЕ ТОВАРЫ ИЗ КАТАЛОГА:\n${lines.join('\n')}`
}

function buildGeneralPrompt(lang, store = null, profile = null, catalogContext = []) {
  const profileParts = []
  if (profile?.halal || profile?.halalOnly) profileParts.push('нужен халал')
  if (profile?.allergens?.length) profileParts.push(`аллергии: ${profile.allergens.join(', ')}`)
  if (profile?.dietGoals?.length) profileParts.push(`диета: ${profile.dietGoals.join(', ')}`)
  const profileLine = `ПРОФИЛЬ: ${profileParts.length ? profileParts.join('; ') : 'не задан'}`

  if (lang === 'kz') {
    return `Сен — Körset AI, Қазақстандағы нақты дүкеннің көмекшісісің. Сатып алушыға осы дүкен туралы, тауар табуға, сатып алу тізімін құрастыруға және құрамын түсіндіруге көмектес. Қысқа, сыпайы, қазақша жауап бер. Максимум 3-4 сөйлем.

${formatStorePrompt(store)}
${profileLine}
${formatCatalogPrompt(catalogContext)}

Ереже: нақты тауар, баға, құрам, халал мәртебесі немесе бар-жоғын ойдан шығарма. Нақты тауар ұсынсаң, тек "РЕЛЕВАНТНЫЕ ТОВАРЫ ИЗ КАТАЛОГА" тізімінен ұсын. Егер дерек жоқ болса, оны анық айт.`
  }
  return `Ты — Körset AI, помощник покупателя в конкретном магазине Казахстана. Помогаете ответить про этот магазин, найти товары, собрать список покупок и объяснить состав. Отвечай на "вы", кратко, по-русски. Максимум 3-4 предложения.

${formatStorePrompt(store)}
${profileLine}
${formatCatalogPrompt(catalogContext)}

Правила: не выдумывай конкретные товары, цены, состав, халал-статус, наличие или медицинские выводы. Если рекомендуешь конкретные товары, используй только список "РЕЛЕВАНТНЫЕ ТОВАРЫ ИЗ КАТАЛОГА". Если подходящих товаров нет, скажи это спокойно и предложи следующий полезный шаг.`
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
