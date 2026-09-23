/**
 * Storage conditions and shelf life extractor for grocery products.
 */

export function extractStorageConditions(text) {
  if (!text || typeof text !== 'string') return null;

  // Pattern: "Хранить при температуре от X до Y ..."
  const re = /(?:хранить|условия хранения)[\s:—–-]+([^\n\r]+?(?:хранения|лучей|влажност[ие]|°[cс]|суток|месяц[а-я]*|\.))/i;
  const m = text.match(re);
  if (m && m[0]) {
    const clean = m[0].trim();
    if (clean.length > 10 && clean.length < 350) {
      return clean;
    }
  }

  // Look for temperature patterns: "от +2 до +6 °C"
  const tempMatch = text.match(/(?:при температуре|температура хранения)?\s*(?:от\s*[-+]?\d+°?[CС]?\s*до\s*[-+]?\d+°?[CС]?|не выше\s*[-+]?\d+°?[CС]?)[^.\n\r]*/i);
  if (tempMatch) {
    return `Хранить ${tempMatch[0].trim()}`;
  }

  return null;
}

export function extractShelfLife(text) {
  if (!text || typeof text !== 'string') return null;

  const re = /(?:срок годности|годен до|годен в течение)[\s:—–-]+([^\n\r,.]+(?:суток|дней|дня|месяц(?:ев|а)?|год(?:а)?|лет))/i;
  const m = text.match(re);
  if (m && m[1]) {
    return m[1].trim();
  }

  const durationMatch = text.match(/\b(\d+)\s*(?:суток|дней|месяцев|месяца|лет|года)\b/i);
  if (durationMatch) {
    return durationMatch[0].trim();
  }

  return null;
}

export function inferStandardStorageConditions(category, productName = '', description = '') {
  const explicit = extractStorageConditions(description);
  if (explicit) return explicit;

  const cat = String(category || '').toLowerCase();
  const name = String(productName || '').toLowerCase();

  // 1. Frozen
  if (cat.includes('frozen') || cat.includes('замороз') || name.includes('мороженое') || name.includes('пельмен')) {
    return 'Хранить в морозильной камере при температуре не выше -18°C. Повторному замораживанию не подлежит.';
  }

  // 2. Dairy & Chilled
  if (cat.includes('dairy') || cat.includes('молоч') || name.includes('молоко') || name.includes('кефир') || name.includes('сыр') || name.includes('йогурт') || name.includes('творог') || name.includes('сметана')) {
    return 'Хранить в холодильнике при температуре от +2°C до +6°C. После вскрытия упаковки употребить в течение 24–48 часов.';
  }

  // 3. Fresh Meat & Fish
  if (cat.includes('meat') || cat.includes('мясо') || cat.includes('птица') || cat.includes('рыба') || name.includes('колбас') || name.includes('сосиск')) {
    return 'Хранить при температуре от 0°C до +6°C и относительной влажности воздуха 75-78%.';
  }

  // 4. Bread & Bakery
  if (cat.includes('bakery') || cat.includes('хлеб') || cat.includes('выпечк')) {
    return 'Хранить в сухом проветриваемом помещении при температуре не ниже +6°C изолированно от источников сильного нагрева или охлаждения.';
  }

  // 5. Ambient / Grocery / Sweets / Drinks
  return 'Хранить в сухом, прохладном месте при температуре от 0°C до +25°C и относительной влажности воздуха не более 75%, вдали от прямых солнечных лучей.';
}
