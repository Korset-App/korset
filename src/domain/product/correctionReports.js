export const PRODUCT_CORRECTION_REASONS = [
  'wrong_product',
  'wrong_weight_or_volume',
  'wrong_fat_percent',
  'wrong_flavor',
  'wrong_package',
  'wrong_brand',
  'wrong_price',
  'wrong_stock',
  'wrong_ingredients',
  'wrong_allergens',
  'wrong_halal',
  'wrong_nutrition',
  'wrong_image',
  'other',
]

const REASON_SET = new Set(PRODUCT_CORRECTION_REASONS)
const VALID_EAN = /^\d{8,14}$/
const MAX_COMMENT_LENGTH = 500
const MAX_NAME_LENGTH = 160

function cleanText(value, maxLength) {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  return text ? text.slice(0, maxLength) : null
}

export function normalizeProductCorrectionReason(reason) {
  return REASON_SET.has(reason) ? reason : 'other'
}

export function canSubmitProductCorrectionReport({ ean, clientToken }) {
  return Boolean(VALID_EAN.test(String(ean || '').trim()) && clientToken)
}

export function buildProductCorrectionPayload({
  reason,
  comment,
  ean,
  storeId = null,
  context = 'product_card',
  clientToken,
  product = null,
}) {
  const normalizedEan = String(ean || '').trim()
  const sourceMeta = product?.sourceMeta || {}
  const shownProductName = cleanText(product?.name, MAX_NAME_LENGTH)

  return {
    ean: normalizedEan,
    shown_ean: product?.ean ? String(product.ean) : null,
    shown_global_product_id: sourceMeta.globalProductId || null,
    shown_store_product_id: sourceMeta.storeProductId || null,
    store_id: storeId || null,
    reason: normalizeProductCorrectionReason(reason),
    context,
    comment: cleanText(comment, MAX_COMMENT_LENGTH),
    client_token: clientToken || null,
    metadata_json: shownProductName ? { shownProductName } : {},
  }
}

export async function submitProductCorrectionReport({ client, payload }) {
  if (
    !client ||
    !canSubmitProductCorrectionReport({ ean: payload?.ean, clientToken: payload?.client_token })
  ) {
    return { ok: false, reason: 'invalid_request' }
  }
  try {
    const { error } = await client.from('product_correction_events').insert(payload)
    if (error) return { ok: false, reason: 'insert_error', error }
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: 'network_error', error }
  }
}
