const validateEan13 = (code) => {
  if (!code || typeof code !== 'string') return { valid: false, reason: 'empty' }
  const clean = code.replace(/\s/g, '')
  if (!/^\d+$/.test(clean)) return { valid: false, reason: 'non-numeric' }
  if (clean.length === 12) {
    const sum = clean.split('').reduce((s, d, i) => s + parseInt(d) * (i % 2 === 0 ? 1 : 3), 0)
    const check = (10 - (sum % 10)) % 10
    return { valid: true, ean13: clean + check, type: 'UPC-A padded' }
  }
  if (clean.length !== 13) return { valid: false, reason: `wrong length: ${clean.length}` }
  const sum = clean.slice(0, 12).split('').reduce((s, d, i) => s + parseInt(d) * (i % 2 === 0 ? 1 : 3), 0)
  const check = (10 - (sum % 10)) % 10
  const match = parseInt(clean[12]) === check
  return { valid: match, ean13: clean, type: 'EAN-13', checksumOk: match }
}

const validateEan8 = (code) => {
  if (!code || typeof code !== 'string') return { valid: false, reason: 'empty' }
  const clean = code.replace(/\s/g, '')
  if (clean.length !== 8 || !/^\d+$/.test(clean)) return { valid: false, reason: 'not EAN-8' }
  const sum = clean.slice(0, 7).split('').reduce((s, d, i) => s + parseInt(d) * (i % 2 === 0 ? 3 : 1), 0)
  const check = (10 - (sum % 10)) % 10
  const match = parseInt(clean[7]) === check
  return { valid: match, ean8: clean, type: 'EAN-8', checksumOk: match }
}

function classifyBarcode(code) {
  if (!code) return { type: 'none', valid: false }
  const clean = String(code).replace(/\s/g, '')
  if (clean.length === 13) {
    const r = validateEan13(clean)
    const prefix = clean.substring(0, 3)
    let country = 'unknown'
    if (prefix >= '000' && prefix <= '139') country = 'US/CA'
    else if (prefix >= '300' && prefix <= '379') country = 'FR'
    else if (prefix >= '400' && prefix <= '440') country = 'DE'
    else if (prefix >= '460' && prefix <= '469') country = 'RU'
    else if (prefix === '487') country = 'KZ'
    else if (prefix >= '500' && prefix <= '509') country = 'UK'
    else if (prefix >= '540' && prefix <= '549') country = 'BE/LU'
    else if (prefix >= '560' && prefix <= '569') country = 'PT'
    else if (prefix >= '570' && prefix <= '579') country = 'DK'
    else if (prefix >= '590' && prefix <= '599') country = 'PL'
    else if (prefix >= '600' && prefix <= '639') country = 'ZA'
    else if (prefix >= '640' && prefix <= '649') country = 'FI'
    else if (prefix >= '700' && prefix <= '709') country = 'NO'
    else if (prefix >= '730' && prefix <= '739') country = 'SE'
    else if (prefix >= '760' && prefix <= '769') country = 'CH'
    else if (prefix >= '800' && prefix <= '839') country = 'IT'
    else if (prefix >= '840' && prefix <= '849') country = 'ES'
    else if (prefix >= '860' && prefix <= '869') country = 'TR'
    else if (prefix >= '870' && prefix <= '879') country = 'NL'
    else if (prefix >= '900' && prefix <= '919') country = 'AT'
    else if (prefix >= '930' && prefix <= '939') country = 'AU'
    return { ...r, prefix, country }
  }
  if (clean.length === 8) return validateEan8(clean)
  if (clean.length === 12) return validateEan13(clean)
  if (clean.length < 7) return { type: 'internal', valid: false, reason: 'too short (likely internal code)', code: clean }
  return { type: 'unknown', valid: false, reason: `unusual length: ${clean.length}`, code: clean }
}

module.exports = { validateEan13, validateEan8, classifyBarcode }

if (require.main === module) {
  const codes = process.argv.slice(2)
  if (codes.length === 0) {
    console.log('Usage: node validate-ean.cjs <code1> <code2> ...')
    process.exit(1)
  }
  for (const code of codes) {
    const r = classifyBarcode(code)
    console.log(code, '→', JSON.stringify(r))
  }
}
