/**
 * Validates EAN-13, EAN-8, UPC-A, UPC-E barcode check digits.
 * GS1 standard Modulo-10 algorithm with alternating weights (3 and 1).
 */
export function isValidBarcodeChecksum(rawBarcode) {
  if (!rawBarcode || typeof rawBarcode !== 'string') return false
  const clean = rawBarcode.trim()

  // Must be only digits
  if (!/^\d+$/.test(clean)) return false

  // Standard EAN-13 (13 digits)
  if (clean.length === 13) {
    let sum = 0
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(clean[i], 10)
      sum += i % 2 === 0 ? digit * 1 : digit * 3
    }
    const checkDigit = (10 - (sum % 10)) % 10
    return checkDigit === parseInt(clean[12], 10)
  }

  // Standard EAN-8 (8 digits)
  if (clean.length === 8) {
    let sum = 0
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(clean[i], 10)
      sum += i % 2 === 0 ? digit * 3 : digit * 1
    }
    const checkDigit = (10 - (sum % 10)) % 10
    return checkDigit === parseInt(clean[7], 10)
  }

  // UPC-A (12 digits)
  if (clean.length === 12) {
    let sum = 0
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(clean[i], 10)
      sum += i % 2 === 0 ? digit * 3 : digit * 1
    }
    const checkDigit = (10 - (sum % 10)) % 10
    return checkDigit === parseInt(clean[11], 10)
  }

  // Other lengths (e.g. 14 digits ITF-14)
  if (clean.length === 14) {
    let sum = 0
    for (let i = 0; i < 13; i++) {
      const digit = parseInt(clean[i], 10)
      sum += i % 2 === 0 ? digit * 3 : digit * 1
    }
    const checkDigit = (10 - (sum % 10)) % 10
    return checkDigit === parseInt(clean[13], 10)
  }

  // Non-GS1 length formats
  return false
}
