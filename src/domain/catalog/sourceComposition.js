const COMPOSITION_LABEL = /(^|[.!?;]\s*|\n\s*)(?<label>состав|құрамы)\s*:\s*/gimu
const METADATA_LABEL = /(^|[.!?;]\s*|\n\s*)(?:пищевая ценность|энергетическая ценность|условия хранения|срок годности|срок хранения|тағамдық құндылығы|энергетикалық құндылығы|сақтау шарттары|жарамдылық мерзімі)\s*:/gimu
const PAIRS = { '(': ')', '[': ']', '{': '}', '«': '»', '“': '”' }
const CLOSERS = new Set(Object.values(PAIRS))

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

function preserveLines(value) {
  return typeof value === 'string' ? value
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim() : ''
}

function languageForLabel(label) {
  return label.toLocaleLowerCase() === 'состав' ? 'ru' : 'kz'
}

function balanced(text) {
  const stack = []
  for (const char of text) {
    if (char === '"') {
      if (stack.at(-1) === '"') stack.pop()
      else stack.push('"')
      continue
    }
    if (PAIRS[char]) stack.push(PAIRS[char])
    else if (CLOSERS.has(char) && stack.pop() !== char) return false
  }
  return stack.length === 0
}

function topLevelAt(text, index) {
  const stack = []
  for (const char of text.slice(0, index)) {
    if (char === '"') {
      if (stack.at(-1) === '"') stack.pop()
      else stack.push('"')
      continue
    }
    if (PAIRS[char]) stack.push(PAIRS[char])
    else if (CLOSERS.has(char) && stack.pop() !== char) return false
  }
  return stack.length === 0
}

function collectDescriptionCandidates(description) {
  const text = preserveLines(description)
  const headings = [...text.matchAll(COMPOSITION_LABEL)].filter(match => topLevelAt(text, match.index + match[1].length)).map(match => ({
    language: languageForLabel(match.groups.label),
    start: match.index + match[1].length,
    end: match.index + match[0].length,
  }))
  const metadata = [...text.matchAll(METADATA_LABEL)]
    .map(match => match.index + match[1].length)
    .filter(position => topLevelAt(text, position))
  const candidates = { ru: [], kz: [] }

  for (let index = 0; index < headings.length; index++) {
    const heading = headings[index]
    const nextHeading = headings[index + 1]?.start ?? text.length
    const nextMetadata = metadata.find(position => position >= heading.end && position < nextHeading)
    candidates[heading.language].push(text.slice(heading.end, nextMetadata ?? nextHeading).trim())
  }
  return candidates
}

function collectFeatureCandidates(features) {
  const candidates = { ru: [], kz: [] }
  const entries = Array.isArray(features) ? features : Object.entries(features || {})
  for (const [rawKey, rawValue] of entries) {
    const key = normalizeText(rawKey).replace(/:$/, '').toLocaleLowerCase()
    if (key !== 'состав' && key !== 'құрамы') continue
    const language = languageForLabel(key)
    const value = preserveLines(rawValue)
    const prefixed = [...value.matchAll(COMPOSITION_LABEL)]
    if (prefixed.length > 1) {
      candidates[language].push(null, null)
      continue
    }
    if (prefixed.length === 1 && prefixed[0].index !== 0) {
      candidates[language].push(null)
      continue
    }
    const withoutLabel = prefixed.length === 1 && prefixed[0].index === 0
      ? value.slice(prefixed[0][0].length)
      : value
    const metadata = [...withoutLabel.matchAll(METADATA_LABEL)]
      .filter(match => topLevelAt(withoutLabel, match.index + match[1].length))
    candidates[language].push(metadata.length ? withoutLabel.slice(0, metadata[0].index + metadata[0][1].length).trim() : withoutLabel)
  }
  return candidates
}

function cleanCandidate(value) {
  const text = normalizeText(value)
  if (!text || !balanced(text) || /[,;:]$/.test(text) || /(?:^|\s)(?:и|или|and)$/iu.test(text)) return null
  if (/(?:^|[.!?]\s+)(?:«[^»]{1,80}»\s*[—–-]\s*это(?:\s|$)|компания\s|бренд\s|разработан(?:о|а)?\s+специально\s)/iu.test(text)) return null
  if (/^(?:для\s|в\s+состав(?:е)?\s|может\s+содержать\s|не\s+содержит\s)/iu.test(text)) return null
  if (!/[,;()]/.test(text) && text.split(/\s+/).length > 3) {
    const warning = text.match(/^([^.]+)\.\s+(?:Может содержать|Не содержит|Құрамында болуы мүмкін)/iu)
    if (!warning || warning[1].trim().split(/\s+/).length > 3) return null
  }
  return text
}

function comparable(value) {
  return value.toLocaleLowerCase().replace(/[.!?]+$/, '').replace(/\s+/g, ' ').trim()
}

export function extractSourceCompositions({ description = '', features = [] } = {}) {
  const fromDescription = collectDescriptionCandidates(description)
  const fromFeatures = collectFeatureCandidates(features)
  const result = { ru: null, kz: null }

  for (const language of ['ru', 'kz']) {
    const descriptionCandidates = fromDescription[language]
    const featureCandidates = fromFeatures[language]
    const uniqueFeatures = new Map()
    for (const value of featureCandidates) {
      const key = value ? comparable(value) : null
      if (!uniqueFeatures.has(key)) uniqueFeatures.set(key, value)
    }
    const uniqueFeatureCandidates = [...uniqueFeatures.values()]
    if (descriptionCandidates.length > 1 || uniqueFeatureCandidates.length > 1) continue
    const descriptionValue = descriptionCandidates.length ? cleanCandidate(descriptionCandidates[0]) : null
    const featureValue = uniqueFeatureCandidates.length ? cleanCandidate(uniqueFeatureCandidates[0]) : null
    if (descriptionCandidates.length && !descriptionValue) continue
    if (uniqueFeatureCandidates.length && !featureValue) continue
    if (descriptionValue && featureValue && comparable(descriptionValue) !== comparable(featureValue)) continue
    result[language] = featureValue || descriptionValue
  }

  return result
}
