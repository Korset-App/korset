import { compressSubmissionPhoto } from '../../utils/imageCompress.js'
import { getOrCreateClientToken } from '../../utils/userIdentity.js'
import { supabase } from '../../utils/supabase.js'

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

const VALID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
    return { ok: false, error: 'invalid_ean', errorCode: 'INVALID_EAN' }
  }

  const rawToken = getOrCreateClientToken()
  const clientToken = VALID_UUID.test(String(rawToken))
    ? String(rawToken)
    : '00000000-0000-0000-0000-000000000000'

  try {
    // Step 1: Compress & upload photos directly to Supabase Storage
    onProgress?.('compressing')
    const uploadedPhotoUrls = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file) continue
      try {
        const compressedBlob = await compressSubmissionPhoto(file)
        onProgress?.('uploading')

        const label = i === 0 ? 'front' : i === 1 ? 'ingredients' : `side_${i + 1}`
        const fileName = `submissions/${cleanEan}/${Date.now()}_${i}_${label}.jpg`

        const { error: uploadError } = await supabase.storage
          .from('public-assets')
          .upload(fileName, compressedBlob, {
            contentType: 'image/jpeg',
            upsert: true,
          })

        if (!uploadError) {
          const { data: pubData } = supabase.storage.from('public-assets').getPublicUrl(fileName)
          if (pubData?.publicUrl) {
            uploadedPhotoUrls.push(pubData.publicUrl)
          }
        } else {
          console.warn('[submissionService] storage upload failed, skipping photo', i, uploadError)
        }
      } catch (compressErr) {
        console.warn('[submissionService] file compress failed, skipping photo', i, compressErr)
      }
    }

    // Step 2: Resolve storeId if storeSlug provided
    onProgress?.('uploading')
    let storeId = null
    if (storeSlug) {
      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', storeSlug)
        .maybeSingle()
      if (store?.id) storeId = store.id
    }

    const cleanComment = typeof comment === 'string' ? comment.trim().slice(0, 500) : null
    const cleanPrice =
      Number.isFinite(Number(priceKzt)) && Number(priceKzt) > 0
        ? Math.round(Number(priceKzt))
        : null

    const metadataJson = {
      submission_type: type,
      photo_urls: uploadedPhotoUrls,
      price_kzt: cleanPrice,
      shownProductName: shownProductName ? String(shownProductName).slice(0, 160) : null,
      submitted_at: new Date().toISOString(),
    }

    // Step 3: Insert directly into product_correction_events
    const insertPayload = {
      ean: cleanEan,
      shown_ean: shownEan && /^\d{8,14}$/.test(String(shownEan)) ? String(shownEan) : null,
      shown_global_product_id:
        shownProductId && VALID_UUID.test(String(shownProductId)) ? String(shownProductId) : null,
      store_id: storeId,
      reason: reason || 'other',
      context: type === 'new_product' ? 'scan_result' : 'product_card',
      comment: cleanComment,
      client_token: clientToken,
      status: 'new',
      metadata_json: metadataJson,
    }

    const { data: event, error: insertError } = await supabase
      .from('product_correction_events')
      .insert(insertPayload)
      .select('id')
      .single()

    if (insertError) {
      console.error('[submissionService] direct insert error:', insertError)
      return {
        ok: false,
        error: insertError.message,
        errorCode: insertError.code || 'DB_ERROR',
      }
    }

    onProgress?.('done')
    return { ok: true, id: event?.id, photoUrls: uploadedPhotoUrls }
  } catch (err) {
    console.error('[submissionService] submission failed:', err)
    return { ok: false, error: err?.message || 'network_error', errorCode: 'NETWORK_ERROR' }
  }
}
