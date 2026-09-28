import { buildSearchQueryVariants } from './searchNormalization.js'

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Transforms a token into a diacritic-tolerant and apostrophe-tolerant regex pattern.
 * e.g. "каймак" -> "[кқ][аә]йма[кқ]"
 * e.g. "lays" / "lay's" -> "lay['’‘]?s"
 */
function tokenToPattern(token) {
  let pattern = ''
  for (let i = 0; i < token.length; i++) {
    const ch = token[i]
    if (ch === 'а') pattern += '[аә]'
    else if (ch === 'ә') pattern += '[аә]'
    else if (ch === 'к') pattern += '[кқ]'
    else if (ch === 'қ') pattern += '[кқ]'
    else if (ch === 'о') pattern += '[оө]'
    else if (ch === 'ө') pattern += '[оө]'
    else if (ch === 'у') pattern += '[уұү]'
    else if (ch === 'ұ' || ch === 'ү') pattern += '[уұү]'
    else if (ch === 'и') pattern += '[иі]'
    else if (ch === 'і') pattern += '[иі]'
    else if (ch === 'н') pattern += '[нң]'
    else if (ch === 'ң') pattern += '[нң]'
    else if (ch === 'г') pattern += '[гғ]'
    else if (ch === 'ғ') pattern += '[гғ]'
    else if (ch === 'х') pattern += '[хһ]'
    else if (ch === 'һ') pattern += '[хһ]'
    else if (ch === 'е') pattern += '[её]'
    else if (ch === 'ё') pattern += '[её]'
    else if (ch === "'" || ch === '’' || ch === '‘') pattern += "['’‘]|&#039;"
    else pattern += escapeRegex(ch)
  }
  return pattern
}

/**
 * Splits text into segments for query highlighting.
 * Returns array of { text: string, match: boolean }.
 * Supports Cyrillic, Latin, QWERTY layout conversion, and Kazakh diacritics.
 *
 * @param {string} text - Product title or text to highlight
 * @param {string} query - Raw search query
 * @returns {Array<{ text: string, match: boolean }>}
 */
export function getSearchHighlightSegments(text, query) {
  if (!text || typeof text !== 'string') return []
  if (!query || typeof query !== 'string') return [{ text, match: false }]

  const trimmedQuery = query.trim()
  if (trimmedQuery.length < 2) return [{ text, match: false }]

  const variants = buildSearchQueryVariants(trimmedQuery)
  const tokenSet = new Set()

  for (const variant of variants) {
    if (!variant || typeof variant !== 'string') continue
    const words = variant
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2)
    for (const w of words) {
      tokenSet.add(w.toLowerCase())
    }
  }

  if (tokenSet.size === 0) return [{ text, match: false }]

  // Sort longest tokens first to match greedily
  const sortedTokens = Array.from(tokenSet).sort((a, b) => b.length - a.length)
  const patterns = sortedTokens.map(tokenToPattern)
  const combinedPattern = new RegExp(`(${patterns.join('|')})`, 'gi')

  const segments = []
  let lastIndex = 0
  let match

  while ((match = combinedPattern.exec(text)) !== null) {
    const matchIndex = match.index
    const matchText = match[0]

    if (matchIndex > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, matchIndex),
        match: false,
      })
    }

    segments.push({
      text: matchText,
      match: true,
    })

    lastIndex = matchIndex + matchText.length
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      match: false,
    })
  }

  return segments.length > 0 ? segments : [{ text, match: false }]
}
