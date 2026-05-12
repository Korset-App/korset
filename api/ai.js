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

const RATE_LIMITS = {
  authenticated: { maxRequests: 30, windowMs: 60_000 },
  anonymous: { maxRequests: 8, windowMs: 60_000 },
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

const MAX_MESSAGES = 20
const MAX_MESSAGE_LEN = 4000
const MAX_TOTAL_LEN = 16000

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return null
  }
  let total = 0
  for (const m of messages) {
    if (!m || typeof m !== 'object') return null
    if (m.role !== 'user' && m.role !== 'assistant') return null
    if (typeof m.content !== 'string' || m.content.length === 0 || m.content.length > MAX_MESSAGE_LEN) {
      return null
    }
    total += m.content.length
    if (total > MAX_TOTAL_LEN) return null
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
    name: cleanString(product.name, 200),
    brand: cleanString(product.brand, 100),
    ingredients: cleanString(product.ingredients, 1500),
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
      systemPrompt = buildProductPrompt(product, profile, lang, ragContext)
    } else if (mode === 'enrich' && product) {
      systemPrompt = buildEnrichPrompt(product)
    } else if (mode === 'compare' && productA && productB) {
      systemPrompt = buildComparePrompt(productA, productB, profile, winner, lang, ragContext)
    } else {
      systemPrompt = buildGeneralPrompt(lang)
    }

    // ── Вызов OpenAI ──
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        max_tokens: mode === 'enrich' ? 300 : mode === 'compare' ? 200 : 400,
        temperature: mode === 'enrich' ? 0.3 : 0.7,
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

    return res.status(200).json({ reply: reply || '', ragUsed: !!ragContext })
  } catch (e) {
    console.error('API /ai error:', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// ── System prompts ──────────────────────────────────────────────

function buildProductPrompt(product, profile, lang, ragContext) {
  const profileParts = []
  if (profile?.halal || profile?.halalOnly) profileParts.push('нужен халал')
  if (profile?.allergens?.length) profileParts.push(`аллергии: ${profile.allergens.join(', ')}`)
  if (profile?.dietGoals?.length) profileParts.push(`диета: ${profile.dietGoals.join(', ')}`)

  const nutr = formatNutrition(product)
  const langNote = lang === 'kz' ? 'Отвечай на казахском языке.' : 'Отвечай на русском языке.'

  const ragSection = ragContext
    ? `\n\nПРОВЕРЕННЫЕ ЗНАНИЯ (используй как факт, приоритет над общими знаниями):\n${ragContext}`
    : ''

  return `Ты — Körset AI, умный помощник покупателя в супермаркете Казахстана. Отвечай кратко, по делу. Максимум 3–4 предложения. Без markdown — пиши живым текстом как друг.
${langNote}

ТОВАР: ${product.name} | Бренд: ${product.brand || '—'}
КБЖУ: ${nutr} | Состав: ${product.ingredients || '—'}
Халал: ${product.halalStatus === 'yes' ? 'да' : product.halalStatus === 'no' ? 'нет' : 'неизвестно'}
Аллергены: ${product.allergens?.join(', ') || 'нет'}
ПРОФИЛЬ: ${profileParts.length ? profileParts.join('; ') : 'не задан'}${ragSection}`
}

function buildGeneralPrompt(lang) {
  if (lang === 'kz') {
    return 'Сен — Қазақстан супермаркетіндегі Körset AI көмекшісісің. Тауар табуға, рецепт ұсынуға және құрамын түсіндіруге көмектес. Қысқа, түсінікті қазақша жауап бер. Максимум 3-4 сөйлем.'
  }
  return 'Ты — Körset AI, помощник покупателя в супермаркете Казахстана. Помогаешь найти товары, советуешь рецепты, отвечаешь про состав и аллергены. Кратко, по-русски, как дружелюбный консультант. Максимум 3-4 предложения.'
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
