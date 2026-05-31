/* global FormData */
import { normalizeAIResponse } from '../domain/ai/responseShape.js'

const AI_ENDPOINT = '/api/ai'
const AI_TRANSCRIBE_ENDPOINT = '/api/ai-transcribe'
const REQUEST_TIMEOUT_MS = 25000
const TRANSCRIBE_TIMEOUT_MS = 45000

function compactProduct(product = {}) {
  return {
    ean: product.ean,
    name: product.name,
    brand: product.brand,
    category: product.category,
    subcategory: product.subcategory,
    group: product.group,
    ingredients: product.ingredients,
    ingredientsKz: product.ingredientsKz,
    allergens: product.allergens,
    dietTags: product.dietTags,
    nutrition: product.nutrition || product.nutritionPer100,
    halalStatus:
      product.halalStatus ??
      (product.halal === true ? 'yes' : product.halal === false ? 'no' : 'unknown'),
    priceKzt: product.priceKzt,
    stockStatus: product.stockStatus,
    quantity: product.quantity,
    image: product.image || product.imageUrl,
  }
}

export async function askProductAI(
  messages,
  product,
  profile,
  lang,
  storeContext = null,
  alternatives = []
) {
  const response = await askProductAIResponse(
    messages,
    product,
    profile,
    lang,
    storeContext,
    alternatives
  )
  return response.reply
}

export async function askProductAIResponse(
  messages,
  product,
  profile,
  lang,
  storeContext = null,
  alternatives = []
) {
  const response = await callAI({
    messages,
    mode: 'product',
    product: {
      ...compactProduct(product),
      alternatives: alternatives.slice(0, 5).map(compactProduct),
    },
    profile: profile
      ? {
          halal: profile.halal || profile.halalOnly,
          halalOnly: profile.halalOnly,
          halalStrict: profile.halalStrict,
          allergens: profile.allergens,
          dietGoals: profile.dietGoals,
        }
      : null,
    storeContext,
    lang,
  })
  return normalizeAIResponse(response)
}

export async function askGeneralAI(
  messages,
  lang,
  storeContext = null,
  profile = null,
  catalogContext = []
) {
  return normalizeAIResponse(
    await callAI({
      messages,
      mode: 'general',
      lang,
      storeContext,
      profile,
      catalogContext,
    })
  )
}

/**
 * AI обогащение данных товара (ingredients, allergens, dietTags)
 * @param {Object} product — {name, brand}
 * @returns {Promise<Object|null>} — {ingredients, allergens, dietTags, description} или null
 */
export async function enrichProductAI(product) {
  try {
    const reply = await callAI({
      messages: [{ role: 'user', content: `Проанализируй товар: ${product.name}` }],
      mode: 'enrich',
      product: { name: product.name, brand: product.brand },
    })
    // Парсим JSON из ответа
    const cleaned = reply.replace(/```json|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

export async function transcribeVoiceInput({
  audioBlob,
  lang = 'auto',
  storeSlug = '',
  durationMs = null,
}) {
  if (!audioBlob) throw new Error('audio_empty')

  const form = new FormData()
  const extension = audioBlob.type?.includes('mp4') ? 'm4a' : 'webm'
  form.append('audio', audioBlob, `voice.${extension}`)
  form.append('lang', lang)
  form.append('storeSlug', storeSlug || '')
  if (durationMs != null) form.append('durationMs', String(Math.round(Number(durationMs))))

  const signal =
    typeof globalThis.AbortSignal?.timeout === 'function'
      ? globalThis.AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS)
      : undefined

  let res
  try {
    res = await fetch(AI_TRANSCRIBE_ENDPOINT, {
      method: 'POST',
      body: form,
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
      throw new Error('transcription_timeout', { cause: error })
    }
    throw new Error('transcription_unavailable', { cause: error })
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (res.status === 404) throw new Error('transcription_unavailable')
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  const data = await res.json()
  const text = typeof data.text === 'string' ? data.text.trim() : ''
  if (!text) throw new Error('empty_transcription')
  return {
    text,
    language: data.language || lang,
    durationMs: Number.isFinite(Number(data.durationMs)) ? Number(data.durationMs) : durationMs,
  }
}

// ── Internal ──

async function callAI(body) {
  const signal =
    typeof globalThis.AbortSignal?.timeout === 'function'
      ? globalThis.AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      : undefined

  const res = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  const data = await res.json()
  if (!data.reply) throw new Error('Empty reply')
  return data
}
