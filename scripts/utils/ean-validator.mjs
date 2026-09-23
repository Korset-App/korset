/**
 * EAN/UPC barcode strict validator and country classifier.
 * Mission-critical: zero tolerance for checksum errors or non-scannable codes.
 */

export function calculateEan13Checksum(digits12) {
  if (typeof digits12 !== 'string' || digits12.length !== 12 || !/^\d{12}$/.test(digits12)) {
    return null;
  }
  const sum = digits12
    .split('')
    .reduce((acc, d, i) => acc + parseInt(d, 10) * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

export function calculateEan8Checksum(digits7) {
  if (typeof digits7 !== 'string' || digits7.length !== 7 || !/^\d{7}$/.test(digits7)) {
    return null;
  }
  const sum = digits7
    .split('')
    .reduce((acc, d, i) => acc + parseInt(d, 10) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

export function isRestrictedOrWeightedEan(code) {
  if (!code || typeof code !== 'string') return true;
  const clean = code.replace(/\s/g, '');
  // Prefix 20-29 is GS1 reserved for internal retail store scale weights (весовой товар)
  if (clean.length === 13 && /^(2[0-9])/.test(clean)) {
    return true;
  }
  // Prefix 02 is restricted circulation
  if (clean.length === 8 && clean.startsWith('2')) {
    return true;
  }
  return false;
}

export function getCountryByPrefix(prefix) {
  if (!prefix) return null;
  if (prefix === '487') return 'KZ';
  if (prefix >= '460' && prefix <= '469') return 'RU';
  if (prefix === '481') return 'BY';
  if (prefix === '482') return 'UA';
  if (prefix >= '000' && prefix <= '139') return 'US/CA';
  if (prefix >= '300' && prefix <= '379') return 'FR';
  if (prefix >= '400' && prefix <= '440') return 'DE';
  if (prefix >= '500' && prefix <= '509') return 'UK';
  if (prefix >= '540' && prefix <= '549') return 'BE/LU';
  if (prefix >= '590' && prefix <= '599') return 'PL';
  if (prefix >= '760' && prefix <= '769') return 'CH';
  if (prefix >= '800' && prefix <= '839') return 'IT';
  if (prefix >= '840' && prefix <= '849') return 'ES';
  if (prefix >= '868' && prefix <= '869') return 'TR';
  if (prefix >= '870' && prefix <= '879') return 'NL';
  if (prefix >= '880' && prefix <= '880') return 'KR';
  if (prefix >= '885' && prefix <= '885') return 'TH';
  if (prefix >= '690' && prefix <= '699') return 'CN';
  return 'Other';
}

export function validateBarcodeStrict(rawCode) {
  if (!rawCode || typeof rawCode !== 'string') {
    return { valid: false, reason: 'empty_or_non_string' };
  }
  const clean = rawCode.trim().replace(/\s/g, '');
  if (!/^\d+$/.test(clean)) {
    return { valid: false, reason: 'non_numeric', code: clean };
  }

  // Handle 12-digit UPC-A by converting to EAN-13 (leading 0)
  if (clean.length === 12) {
    const padded = '0' + clean;
    return validateBarcodeStrict(padded);
  }

  if (clean.length === 13) {
    if (isRestrictedOrWeightedEan(clean)) {
      return { valid: false, reason: 'restricted_weight_scale_prefix', code: clean };
    }
    const body = clean.slice(0, 12);
    const expectedCheck = calculateEan13Checksum(body);
    const actualCheck = parseInt(clean[12], 10);
    if (expectedCheck !== actualCheck) {
      return { valid: false, reason: 'invalid_checksum', expectedCheck, actualCheck, code: clean };
    }
    const prefix = clean.slice(0, 3);
    const country = getCountryByPrefix(prefix);
    return {
      valid: true,
      ean: clean,
      type: 'EAN-13',
      prefix,
      country,
      isKZ: prefix === '487',
      isRU: prefix >= '460' && prefix <= '469',
    };
  }

  if (clean.length === 8) {
    if (isRestrictedOrWeightedEan(clean)) {
      return { valid: false, reason: 'restricted_weight_scale_prefix', code: clean };
    }
    const body = clean.slice(0, 7);
    const expectedCheck = calculateEan8Checksum(body);
    const actualCheck = parseInt(clean[7], 10);
    if (expectedCheck !== actualCheck) {
      return { valid: false, reason: 'invalid_checksum', expectedCheck, actualCheck, code: clean };
    }
    return {
      valid: true,
      ean: clean,
      type: 'EAN-8',
      country: null,
      isKZ: false,
      isRU: false,
    };
  }

  return { valid: false, reason: `unsupported_length_${clean.length}`, code: clean };
}
