import { blobToDataUrl, compressSubmissionPhoto } from '../../utils/imageCompress.js'
import { getOrCreateClientToken } from '../../utils/userIdentity.js'

export const CORRECTION_REASONS = [
  {
    id: 'wrong_product',
    labelRu: 'Не тот товар / вес / вкус',
    labelKz: 'Басқа тауар / салмақ / дәм',
  },
  { id: 'wrong_ingredients', labelRu: 'Неправильный состав', labelKz: 'Құрамы қате' },
  { id: 'wrong_nutrition', labelRu: 'Неверное КБЖУ', labelKz: 'КБЖУ қате' },
  { id: 'wrong_image', labelRu: 'Плохое / чужое фото', labelKz: 'Сапасыз / бөтен фото' },
  { id: 'other', labelRu: 'Другое', labelKz: 'Басқа' },
]

const VALID_EAN = /^\d{8,14}$/
const VALID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function submitProductData({
  ean,
  storeSlug = null,
  type = 'new_product',
  reason = 'other',
  comment = '',
  priceKzt = null,
  shownEan = null,
  shownProductId = null,
  shownProductName = null,
  files = [],
  onProgress = null,
}) {
  const cleanEan = String(ean ?? '').trim()
  if (!VALID_EAN.test(cleanEan)) {
    return { ok: false, error: 'invalid_ean', errorCode: 'INVALID_EAN' }
  }
  if (type !== 'new_product' && type !== 'correction') {
    return { ok: false, error: 'invalid_type', errorCode: 'INVALID_TYPE' }
  }
  if (!Array.isArray(files) || files.length > 5 || files.some((file) =>
    !file || typeof file.type !== 'string' ||
    (file.type && (!file.type.startsWith('image/') || file.type === 'image/svg+xml'))
  )) {
    return { ok: false, error: 'invalid_images', errorCode: 'INVALID_IMAGES' }
  }

  const rawToken = getOrCreateClientToken()
  const clientToken = VALID_UUID.test(String(rawToken))
    ? String(rawToken)
    : '00000000-0000-0000-0000-000000000000'

  try {
    onProgress?.('compressing')
    const images = []
    for (let i = 0; i < files.length; i++) {
      let dataUrl
      try {
        const compressed = await compressSubmissionPhoto(files[i])
        dataUrl = await blobToDataUrl(compressed)
      } catch {
        return { ok: false, error: 'compress_failed', errorCode: 'COMPRESS_FAILED' }
      }
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/jpeg;base64,')) {
        return { ok: false, error: 'compress_failed', errorCode: 'COMPRESS_FAILED' }
      }
      const label = i === 0 ? 'front' : i === 1 ? 'ingredients' : 'side_' + (i + 1)
      images.push({ label, dataUrl })
    }

    onProgress?.('uploading')
    const response = await fetch('/api/submit-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ean: cleanEan,
        storeSlug,
        type,
        reason,
        comment,
        priceKzt,
        clientToken,
        shownEan,
        shownProductId,
        shownProductName,
        images,
      }),
    })
    const body = await response.json()
    if (!response.ok || !body?.ok) {
      return {
        ok: false,
        error: typeof body?.error === 'string' ? body.error : 'submission_failed',
        errorCode: typeof body?.errorCode === 'string' ? body.errorCode : 'SUBMISSION_FAILED',
      }
    }
    onProgress?.('done')
    return { ok: true, id: body.id, photoUrls: body.photoUrls }
  } catch {
    return { ok: false, error: 'network_error', errorCode: 'NETWORK_ERROR' }
  }
}
