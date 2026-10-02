// Фразы для обнаружения "следов" аллергенов в ingredients_raw
// Оранжевый уровень (WARNING): пользователь решает сам
// Источник: ТР ТС 022/2011, практика маркировки ЕАЭС

import { matchesTermWithBoundary, normalizeCompositionText } from '../utils/compositionMatcher.js'

// Все фразы — lowercase, ищутся как подстроки в ingredients_raw.toLowerCase()
export const TRACE_PHRASES_RU = [
  'может содержать следы',
  'может содержать незначительное количество',
  'может содержать',
  'возможно наличие следов',
  'возможно содержание следов',
  'произведено на предприятии, где используется',
  'произведено на предприятии',
  'производится на предприятии',
  'произведено на оборудовании, где',
  'произведено на оборудовании',
  'изготовлено на линии, где',
  'изготовлено на линии',
  'на производстве используется',
  'на предприятии используются',
  'не исключено наличие',
  'возможно присутствие',
  'содержит следы',
  'құрамында ізі болуы мүмкін',
  'іздері болуы мүмкін',
]

export const TRACE_PHRASES_EN = [
  'may contain traces',
  'may contain',
  'produced in a facility',
  'manufactured on equipment',
  'processed in a plant',
  'traces of',
  'made on shared equipment',
]

export const ALL_TRACE_PHRASES = [...TRACE_PHRASES_RU, ...TRACE_PHRASES_EN]

/**
 * Проверяет, содержит ли текст ингредиентов предупреждения о следах.
 * Возвращает массив обнаруженных фраз-предупреждений.
 */
export function detectTraces(ingredientsRaw) {
  if (!ingredientsRaw) return []
  const lower = normalizeCompositionText(ingredientsRaw)
  return ALL_TRACE_PHRASES.filter((phrase) => lower.includes(normalizeCompositionText(phrase)))
}

/**
 * Извлекает из текста конкретные аллергены, упомянутые в контексте "следов".
 * Например: "может содержать следы арахиса и молока" → ['арахис', 'молока']
 */
export function extractTraceAllergens(ingredientsRaw, allergenSynonyms) {
  if (!ingredientsRaw) return []
  const lower = normalizeCompositionText(ingredientsRaw)

  const results = []
  const seenAllergens = new Set()

  for (const phrase of ALL_TRACE_PHRASES) {
    const normPhrase = normalizeCompositionText(phrase)
    let searchFrom = 0
    while (searchFrom < lower.length) {
      const idx = lower.indexOf(normPhrase, searchFrom)
      if (idx === -1) break
      searchFrom = idx + normPhrase.length

      // Берём текст после фразы до конца предложения (точки/точки с запятой) или до 180 символов
      const rest = lower.substring(idx + normPhrase.length, idx + normPhrase.length + 180)
      const sentenceEnd = rest.search(/[.;\n]/)
      const afterPhrase = sentenceEnd >= 0 ? rest.substring(0, sentenceEnd) : rest

      for (const [allergenId, synonyms] of Object.entries(allergenSynonyms)) {
        if (seenAllergens.has(allergenId)) continue
        for (const synonym of synonyms) {
          if (matchesTermWithBoundary(afterPhrase, synonym, { domain: allergenId })) {
            seenAllergens.add(allergenId)
            results.push({ allergenId, matchedPhrase: phrase, matchedSynonym: synonym })
            break
          }
        }
      }
    }
  }

  return results
}
