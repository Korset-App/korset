/* global process, console, Buffer */
import { createClient } from '@supabase/supabase-js'

const CORS_ORIGINS = [
  'https://korset.app',
  'https://www.korset.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

function corsHeaders(origin) {
  const allow = CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

const VALID_EAN = /^\d{8,14}$/
const VALID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED_REASONS = new Set([
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
])

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  console.log('[submit-product] env check — url:', url ? 'SET' : 'MISSING', '| key:', key ? 'SET' : 'MISSING')
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return res.status(200).set(cors).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).set(cors).json({ error: 'Method not allowed', errorCode: 'METHOD_NOT_ALLOWED' })
  }

  try {
    const admin = getAdminClient()
    if (!admin) {
      console.error('[submit-product] SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL missing from env')
      return res.status(500).set(cors).json({
        error: 'Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY',
        errorCode: 'MISSING_ENV',
      })
    }

    const {
      ean,
      storeSlug,
      type = 'new_product',
      reason = 'other',
      comment = '',
      priceKzt = null,
      clientToken = null,
      shownEan = null,
      shownProductId = null,
      shownProductName = null,
      images = [],
    } = req.body || {}

    const cleanEan = String(ean || '').trim()
    if (!VALID_EAN.test(cleanEan)) {
      return res.status(400).set(cors).json({ error: 'Invalid EAN format', errorCode: 'INVALID_EAN' })
    }

    // client_token must be a valid UUID for the uuid column in postgres
    const rawToken = clientToken && typeof clientToken === 'string' ? clientToken.trim() : ''
    const cleanClientToken = VALID_UUID.test(rawToken)
      ? rawToken
      : '00000000-0000-0000-0000-000000000000'

    // Resolve store_id if storeSlug provided
    let storeId = null
    if (storeSlug) {
      const { data: store, error: storeErr } = await admin
        .from('stores')
        .select('id')
        .eq('slug', storeSlug)
        .maybeSingle()
      if (storeErr) console.warn('[submit-product] store lookup error:', storeErr)
      if (store?.id) storeId = store.id
    }

    // Process and upload images to public-assets/submissions/{ean}/...
    const uploadedPhotoUrls = []
    if (Array.isArray(images) && images.length > 0) {
      const maxImages = Math.min(images.length, 5)
      for (let i = 0; i < maxImages; i++) {
        const item = images[i]
        const dataUrl = item?.dataUrl || item
        if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) continue

        const commaIdx = dataUrl.indexOf(',')
        if (commaIdx === -1) continue

        const metaPart = dataUrl.slice(0, commaIdx)
        const base64Data = dataUrl.slice(commaIdx + 1)
        const mimeMatch = metaPart.match(/data:(image\/\w+);base64/)
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
        const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg'

        const buffer = Buffer.from(base64Data, 'base64')
        // Size guard: max 3MB per photo
        if (buffer.length > 3 * 1024 * 1024) {
          console.warn('[submit-product] photo too large, skipping:', buffer.length)
          continue
        }

        const label = item?.label ? `_${item.label.replace(/[^a-z0-9]/gi, '')}` : ''
        const fileName = `submissions/${cleanEan}/${Date.now()}_${i}${label}.${ext}`

        const { error: uploadError } = await admin.storage
          .from('public-assets')
          .upload(fileName, buffer, {
            contentType: mimeType,
            upsert: true,
          })

        if (!uploadError) {
          const { data: pubData } = admin.storage.from('public-assets').getPublicUrl(fileName)
          if (pubData?.publicUrl) {
            uploadedPhotoUrls.push(pubData.publicUrl)
          }
        } else {
          console.error('[submit-product] upload error:', uploadError.message, uploadError)
        }
      }
    }

    const cleanReason = ALLOWED_REASONS.has(reason) ? reason : 'other'
    const cleanComment = typeof comment === 'string' ? comment.trim().slice(0, 500) : null
    const cleanPrice = Number.isFinite(Number(priceKzt)) && Number(priceKzt) > 0
      ? Math.round(Number(priceKzt))
      : null

    const metadataJson = {
      submission_type: type,
      photo_urls: uploadedPhotoUrls,
      price_kzt: cleanPrice,
      shownProductName: shownProductName ? String(shownProductName).slice(0, 160) : null,
      submitted_at: new Date().toISOString(),
    }

    const insertPayload = {
      ean: cleanEan,
      shown_ean: shownEan && VALID_EAN.test(String(shownEan)) ? String(shownEan) : null,
      shown_global_product_id:
        shownProductId && VALID_UUID.test(String(shownProductId)) ? String(shownProductId) : null,
      store_id: storeId,
      reason: cleanReason,
      context: type === 'new_product' ? 'scan_result' : 'product_card',
      comment: cleanComment,
      client_token: cleanClientToken,
      status: 'new',
      metadata_json: metadataJson,
    }

    console.log('[submit-product] inserting, ean:', cleanEan, 'type:', type, 'reason:', cleanReason, 'photos:', uploadedPhotoUrls.length)

    const { data: event, error: insertError } = await admin
      .from('product_correction_events')
      .insert(insertPayload)
      .select('id, created_at')
      .single()

    if (insertError) {
      console.error('[submit-product] insert error code:', insertError.code, '| message:', insertError.message, '| details:', insertError.details, '| hint:', insertError.hint)
      return res.status(500).set(cors).json({
        error: `Database insert failed: ${insertError.message}`,
        errorCode: insertError.code || 'DB_INSERT_FAILED',
        hint: insertError.hint || null,
      })
    }

    console.log('[submit-product] success, id:', event?.id)
    return res.status(200).set(cors).json({
      ok: true,
      id: event?.id,
      photoUrls: uploadedPhotoUrls,
    })
  } catch (err) {
    console.error('[submit-product] exception:', err)
    return res.status(500).set(cors).json({
      error: `Internal server error: ${err?.message}`,
      errorCode: 'EXCEPTION',
    })
  }
}
