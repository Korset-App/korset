import { compressSubmissionPhoto, blobToDataUrl } from '../../utils/imageCompress.js'
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

export async function submitProductData({
  ean,
  storeSlug = null,
  type = 'new_product', // 'new_product' | 'correction'
  reason = 'other',
  comment = '',
  priceKzt = null,
  shownEan = null,
  shownProductId = null,
  shownProductName = null,
  files = [], // File[] or Blob[]
  onProgress = null, // (step: string) => void
}) {
  const cleanEan = String(ean || '').replace(/\D+/g, '')
  if (!cleanEan || cleanEan.length < 8 || cleanEan.length > 14) {
    return { ok: false, error: 'invalid_ean' }
  }

  const clientToken = getOrCreateClientToken()

  try {
    onProgress?.('compressing')
    const images = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file) continue
      try {
        const compressedBlob = await compressSubmissionPhoto(file)
        const dataUrl = await blobToDataUrl(compressedBlob)
        images.push({
          dataUrl,
          label: i === 0 ? 'front' : i === 1 ? 'ingredients' : `side_${i + 1}`,
        })
      } catch (err) {
        console.warn('[submissionService] file compress failed, skipping file', i, err)
      }
    }

    onProgress?.('uploading')
    const payload = {
      ean: cleanEan,
      storeSlug,
      type,
      reason,
      comment: comment?.trim() || null,
      priceKzt: priceKzt ? Number(priceKzt) : null,
      clientToken,
      shownEan,
      shownProductId,
      shownProductName,
      images,
    }

    const response = await fetch('/api/submit-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}))
      return { ok: false, error: errJson.error || `HTTP_${response.status}` }
    }

    const result = await response.json()
    onProgress?.('done')
    return { ok: true, id: result.id, photoUrls: result.photoUrls }
  } catch (err) {
    console.error('[submissionService] submission failed:', err)
    return { ok: false, error: err?.message || 'network_error' }
  }
}
