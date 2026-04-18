function parseHTMLSpecs(html) {
  const specs = {}
  const regex = /<span class="specifications-list__spec-term-text">([^<]+)<\/span><\/dt><dd class="specifications-list__spec-definition">([^<]+)<\/dd>/g
  let m
  while ((m = regex.exec(html)) !== null) {
    specs[m[1].trim()] = m[2].trim()
  }
  return specs
}

module.exports = { parseHTMLSpecs }
