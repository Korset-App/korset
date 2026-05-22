function highlightMatches(text, query) {
  if (!text || !query) return text
  var tokens = query
    .trim()
    .split(/\s+/)
    .filter(function (t) {
      return t.length >= 2
    })
  if (!tokens.length) return text
  var escaped = tokens.map(function (t) {
    return t.replace(/[.*+?^${}()|[\]\\]/g, function (m) {
      return '\\' + m
    })
  })
  var regex = new RegExp('\\b(' + escaped.join('|') + ')\\b', 'gi')
  var parts = String(text).split(regex)
  if (parts.length === 1) return text
  return parts
    .map(function (part, i) {
      return i % 2 === 1 ? '\u003cmark\u003e' + part + '\u003c/mark\u003e' : part
    })
    .join('')
}
