/**
 * Attribute Matcher with Zero-Tolerance rules for grocery products.
 * Extracts and normalizes mass, volume, fat percentage, and checks exact identity.
 */

export function extractQuantityAndUnit(text) {
  if (!text || typeof text !== 'string') return null;
  const s = text.toLowerCase().replace(/,/g, '.');

  // Grams: 380г, 380 г, 100 гр, 250g
  const gMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:г|гр|g|gram|грамм)(?![а-яa-z])/);
  if (gMatch) {
    const val = parseFloat(gMatch[1]);
    if (!isNaN(val) && val > 0) {
      return { raw: gMatch[0].trim(), normalizedValue: val, baseUnit: 'g', display: `${val} г` };
    }
  }

  // Kilograms: 1кг, 1.5 кг, 2kg
  const kgMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:кг|kg|килограмм)(?![а-яa-z])/);
  if (kgMatch) {
    const val = parseFloat(kgMatch[1]);
    if (!isNaN(val) && val > 0) {
      return { raw: kgMatch[0].trim(), normalizedValue: Math.round(val * 1000), baseUnit: 'g', display: `${val} кг` };
    }
  }

  // Milliliters: 500мл, 930 мл, 150ml
  const mlMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:мл|ml|миллилитр)(?![а-яa-z])/);
  if (mlMatch) {
    const val = parseFloat(mlMatch[1]);
    if (!isNaN(val) && val > 0) {
      return { raw: mlMatch[0].trim(), normalizedValue: val, baseUnit: 'ml', display: `${val} мл` };
    }
  }

  // Liters: 1л, 0.5 л, 1.5l
  const lMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:л|l|литр)(?![а-яa-z])/);
  if (lMatch) {
    const val = parseFloat(lMatch[1]);
    if (!isNaN(val) && val > 0) {
      return { raw: lMatch[0].trim(), normalizedValue: Math.round(val * 1000), baseUnit: 'ml', display: `${val} л` };
    }
  }

  // Pieces / count: 10 шт, 6шт, 100 pcs
  const pcsMatch = s.match(/(\d+)\s*(?:шт|pcs|штук|пак|пакетик)(?![а-яa-z])/);
  if (pcsMatch) {
    const val = parseInt(pcsMatch[1], 10);
    if (!isNaN(val) && val > 0) {
      return { raw: pcsMatch[0].trim(), normalizedValue: val, baseUnit: 'pcs', display: `${val} шт` };
    }
  }

  return null;
}

export function extractFatPercent(text) {
  if (!text || typeof text !== 'string') return null;
  const s = text.replace(/,/g, '.');
  const m = s.match(/(\d+(?:\.\d+)?)\s*%/);
  if (m) {
    const val = parseFloat(m[1]);
    if (!isNaN(val) && val >= 0.1 && val <= 99.9) {
      return val;
    }
  }
  return null;
}

export function normalizeBrand(brand) {
  if (!brand) return '';
  return String(brand)
    .toLowerCase()
    .replace(/[«»""''`]/g, '')
    .trim();
}

export function cleanTokens(text, brand = '') {
  if (!text) return [];
  const b = normalizeBrand(brand);
  const s = String(text)
    .toLowerCase()
    .replace(/,/g, '.')
    // Remove quantity patterns
    .replace(/\d+(?:\.\d+)?\s*(?:г|гр|g|кг|kg|мл|ml|л|l|шт|pcs|%)\.?/g, ' ')
    // Remove punctuation
    .replace(/[«»""''`.,;:!?()\[\]\/\\+*#]/g, ' ')
    .trim();

  const words = s.split(/\s+/).filter(w => w.length > 2);
  const brandTokens = b.split(/\s+/).filter(w => w.length > 2);
  return words.filter(w => !brandTokens.includes(w));
}

export function calculateDiceSimilarity(tokensA, tokensB) {
  if (!tokensA.length && !tokensB.length) return 1.0;
  if (!tokensA.length || !tokensB.length) return 0.0;

  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of tokensA) {
    if (setB.has(t)) intersection++;
  }
  return (2 * intersection) / (tokensA.length + tokensB.length);
}

/**
 * Validates candidate product identity against target product.
 * @param {Object} target - The reference product { name, brand, quantity }
 * @param {Object} candidate - The candidate { name, brand, quantity, gtin }
 * @returns {Object} { isMatch: boolean, reason: string, score: number }
 */
export function checkZeroToleranceMatch(target, candidate) {
  if (!target || !candidate) {
    return { isMatch: false, reason: 'missing_arguments', score: 0 };
  }

  // 1. Brand Check
  const targetBrand = normalizeBrand(target.brand);
  const candBrand = normalizeBrand(candidate.brand);
  if (targetBrand) {
    if (candBrand) {
      if (targetBrand !== candBrand && !targetBrand.includes(candBrand) && !candBrand.includes(targetBrand)) {
        return { isMatch: false, reason: `brand_mismatch: ${targetBrand} vs ${candBrand}`, score: 0 };
      }
    } else {
      // Candidate lacks explicit brand attribute: check candidate title
      const candTitleNorm = normalizeBrand(candidate.name);
      if (!candTitleNorm.includes(targetBrand)) {
        return { isMatch: false, reason: `brand_missing_in_cand: ${targetBrand}`, score: 0 };
      }
    }
  }

  // 2. Quantity / Volume Check (Crucial for same-brand package variants)
  // Check title first because product title usually contains the exact net weight/volume
  const targetQty = extractQuantityAndUnit(target.name) || extractQuantityAndUnit(target.quantity);
  const candQty = extractQuantityAndUnit(candidate.name) || extractQuantityAndUnit(candidate.quantity);

  // 1.5 Bulk / Weighted check
  const isTargetBulk = /\b(?:вес|веc|на развес)\b/i.test(target.name) || target.quantity === 'кг';
  const isCandPackaged = candQty && candQty.baseUnit === 'g' && candQty.normalizedValue < 1000;
  if (isTargetBulk && isCandPackaged) {
    return {
      isMatch: false,
      reason: 'bulk_weighted_cannot_match_packaged_sku',
      score: 0,
    };
  }

  if (targetQty && candQty) {
    // If unit types differ (e.g. grams vs milliliters or pieces vs mass), mismatch!
    if (targetQty.baseUnit !== candQty.baseUnit) {
      return {
        isMatch: false,
        reason: `unit_mismatch: ${targetQty.baseUnit} vs ${candQty.baseUnit}`,
        score: 0,
      };
    }
    // Allow maximum 3% rounding variance or exact match
    const diff = Math.abs(targetQty.normalizedValue - candQty.normalizedValue);
    const maxVal = Math.max(targetQty.normalizedValue, candQty.normalizedValue);
    if (diff / maxVal > 0.03) {
      return {
        isMatch: false,
        reason: `quantity_mismatch: ${targetQty.display} vs ${candQty.display}`,
        score: 0,
      };
    }
  } else if (targetQty && !candQty) {
    // Target has specific weight, but candidate lacks weight -> unsafe, reject!
    return {
      isMatch: false,
      reason: `missing_candidate_quantity: target specifies ${targetQty.display}`,
      score: 0,
    };
  }

  // 3. Fat Percentage Check (e.g. milk 3.2% vs 2.5%, sour cream 15% vs 20%)
  const targetFat = extractFatPercent(target.name);
  const candFat = extractFatPercent(candidate.name);
  if (targetFat !== null && candFat !== null && Math.abs(targetFat - candFat) > 0.1) {
    return {
      isMatch: false,
      reason: `fat_percent_mismatch: ${targetFat}% vs ${candFat}%`,
      score: 0,
    };
  }

  // 4. Token Core Similarity
  const targetTokens = cleanTokens(target.name, targetBrand);
  const candTokens = cleanTokens(candidate.name, candBrand || targetBrand);
  const similarity = calculateDiceSimilarity(targetTokens, candTokens);

  if (similarity < 0.72) {
    return {
      isMatch: false,
      reason: `low_similarity_${similarity.toFixed(2)}: '${targetTokens.join(' ')}' vs '${candTokens.join(' ')}'`,
      score: Math.round(similarity * 100),
    };
  }

  return {
    isMatch: true,
    reason: 'exact_zero_tolerance_match',
    score: Math.round(similarity * 100),
  };
}
