/**
 * Клиентский сервис для AI — единая точка вызова
 * Все запросы идут через серверный прокси /api/ai
 * API ключ НЕ уходит в клиент
 */

import { buildStoreAIContext } from '../domain/ai/context.js'

const AI_ENDPOINT = '/api/ai'

/**
 * Спросить AI о конкретном товаре
 * @param {Array} messages — история сообщений [{role, content}]
 * @param {Object} product — данные товара
 * @param {Object} profile — профиль пользователя
 * @param {string} lang — 'ru' или 'kz'
 * @returns {Promise<string>} — ответ AI
 */
function compactProductAlternative(product) {
  if (!product) return null
  return {
    ean: product.ean,
    name: product.name,
    brand: product.brand,
    priceKzt: product.priceKzt,
    stockStatus: product.stockStatus,
    halalStatus:
      product.halalStatus ??
      (product.halal === true ? 'yes' : product.halal === false ? 'no' : 'unknown'),
  }
}

export async function askProductAI(
  messages,
  product,
  profile,
  lang,
  store = null,
  alternatives = []
) {
  const storeContext = store ? buildStoreAIContext(store) : null
  return callAI({
    messages,
    mode: 'product',
    product: {
      ean: product.ean,
      name: product.name,
      brand: product.brand,
      ingredients: product.ingredients,
      allergens: product.allergens,
      nutrition: product.nutrition || product.nutritionPer100,
      halalStatus:
        product.halalStatus ??
        (product.halal === true ? 'yes' : product.halal === false ? 'no' : 'unknown'),
      priceKzt: product.priceKzt,
      stockStatus: product.stockStatus,
      alternatives: alternatives.map(compactProductAlternative).filter(Boolean).slice(0, 5),
    },
    profile: profile
      ? {
          halal: profile.halal || profile.halalOnly,
          allergens: profile.allergens,
          dietGoals: profile.dietGoals,
        }
      : null,
    store: storeContext,
    lang,
  })
}

/**
 * Спросить AI общий вопрос (без контекста товара)
 * @param {Array} messages — история сообщений
 * @param {string} lang — 'ru' или 'kz'
 * @returns {Promise<string>} — ответ AI
 */
export async function askGeneralAI(
  messages,
  lang,
  store = null,
  profile = null,
  catalogContext = []
) {
  const storeContext = store ? buildStoreAIContext(store) : null
  return callAI({
    messages,
    mode: 'general',
    lang,
    store: storeContext,
    profile: profile
      ? {
          halal: profile.halal || profile.halalOnly,
          allergens: profile.allergens,
          dietGoals: profile.dietGoals,
        }
      : null,
    catalogContext,
    responseFormat: 'structured',
  })
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

// ── Internal ──

async function callAI(body) {
  const res = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  const data = await res.json()
  if (!data.reply) throw new Error('Empty reply')
  if (body.responseFormat === 'structured') return data
  return data.reply
}
