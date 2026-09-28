import { cleanTokens, extractFatPercent, extractNormalizedWeight } from './retail-tokenizer.mjs'

const knownSpellings = new Map([
  ['rakhat', 'рахат'], ['rahat', 'рахат'], ['foodmaster', 'фудмастер'],
  ['yashkino', 'яшкино'], ['bayan', 'баян'], ['sulu', 'сулу'],
  ['nestle', 'нестле'], ['hochland', 'хохланд'], ['president', 'президент'],
])

function tokens(name, brand) {
  return [...new Set(cleanTokens(`${brand || ''} ${name || ''}`)
    .map(token => knownSpellings.get(token) || token))]
}

function quantityConflict(a, b) {
  if (!a || !b) return false
  if (a.pieces && b.pieces && a.pieces !== b.pieces) return true
  if (a.grams !== undefined && b.grams !== undefined) return a.grams !== b.grams
  if (a.ml !== undefined && b.ml !== undefined) return a.ml !== b.ml
  return false
}

export function buildCandidateIndex(donors) {
  const byEan = new Map()
  const byToken = new Map()
  const indexed = []
  for (const donor of donors) {
    if (!donor?.name || !donor.source || donor.id == null) continue
    const entry = {
      donor,
      tokens: tokens(donor.name, donor.brand),
      quantity: extractNormalizedWeight(donor.name),
      fat: extractFatPercent(donor.name),
    }
    indexed.push(entry)
    const ean = String(donor.ean || '')
    if (/^\d{8,14}$/.test(ean)) {
      if (!byEan.has(ean)) byEan.set(ean, [])
      byEan.get(ean).push(entry)
    }
    for (const token of entry.tokens) {
      if (!byToken.has(token)) byToken.set(token, [])
      byToken.get(token).push(entry)
    }
  }
  return { byEan, byToken, size: indexed.length }
}

export function findCandidates(index, target, { limit = 5 } = {}) {
  const targetTokens = tokens(target.name, target.brand)
  const targetQuantity = extractNormalizedWeight(target.name)
  const targetFat = extractFatPercent(target.name)
  const seen = new Map()
  const exact = index.byEan.get(String(target.ean || '')) || []
  for (const entry of exact) seen.set(entry, 'ean')
  const textHits = new Map()
  for (const token of targetTokens) {
    for (const entry of index.byToken.get(token) || []) {
      textHits.set(entry, (textHits.get(entry) || 0) + 1)
    }
  }
  for (const [entry, common] of textHits) {
    if (common >= 2 && !seen.has(entry)) seen.set(entry, 'text')
  }
  const results = []
  for (const [entry, matchRoute] of seen) {
    const common = entry.tokens.filter(token => targetTokens.includes(token)).length
    const union = new Set([...entry.tokens, ...targetTokens]).size || 1
    const conflicts = []
    if (quantityConflict(targetQuantity, entry.quantity)) conflicts.push('quantity')
    if (targetFat !== null && entry.fat !== null && targetFat !== entry.fat) conflicts.push('fat_percent')
    const score = (matchRoute === 'ean' ? 2 : 0) + common / union - conflicts.length * 0.25
    results.push({ donor: entry.donor, matchRoute, score, conflicts, verified: false })
  }
  results.sort((a, b) => b.score - a.score || String(a.donor.source).localeCompare(String(b.donor.source)) || String(a.donor.id).localeCompare(String(b.donor.id)))
  return results.slice(0, limit)
}
