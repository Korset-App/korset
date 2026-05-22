const fs = require('fs')

function highlightMatches(text, query) { return text }

const HIGHLIGHT_FN = `function highlightMatches(text, query) {
  if (!text || !query) return text
  const tokens = query.trim().split(/\\s+/).filter(function(t) { return t.length >= 2 })
  if (!tokens.length) return text
  var pattern = tokens.map(function(t) { return t.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&') }).join('|')
  var regex = new RegExp('(' + pattern + ')', 'gi')
  var parts = String(text).split(regex)
  if (parts.length === 1) return text
  return parts.map(function(part, i) { return i % 2 === 1 ? '<mark>' + part + '</mark>' : part }).join('')
}
`

let c = fs.readFileSync('src/screens/CatalogScreen.jsx', 'utf8')
c = c.replace('function buildSearchSuggestions(query)', HIGHLIGHT_FN + '\nfunction buildSearchSuggestions(query)')
fs.writeFileSync('src/screens/CatalogScreen.jsx', c)
console.log('done')
