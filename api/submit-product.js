/* global process, console, Buffer */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { checkRateLimit, getRateLimitKey } from '../src/lib/monitoring.js'

const CORS_ORIGINS = [
  'https://korset.app',
  'https://www.korset.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

const SUBMIT_RATE_LIMIT = { maxRequests: 10, windowMs: 60_000 }

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
const IMAGE_MIME_TYPES = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']])
const MAX_IMAGE_BYTES = 3 * 1024 * 1024
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

  const rateKey = getRateLimitKey(req, { authenticated: false })
  const rateResult = checkRateLimit(rateKey, SUBMIT_RATE_LIMIT)
  if (!rateResult.allowed) {
    return res.status(429).set(cors).json({
      error: 'Too many submissions. Please wait a minute and try again.',
      errorCode: 'RATE_LIMITED',
    })
  }

  try {
    const admin = getAdminClient()
    if (!admin) {
      console.error('[submit-product] SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL missing from env')
      return res.status(500).set(cors).json({
        error: 'Submission service unavailable',
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

    if (type !== 'new_product' && type !== 'correction') {
      return res.status(400).set(cors).json({ error: 'Invalid submission type', errorCode: 'INVALID_TYPE' })
    }
    if (!Array.isArray(images) || images.length > 5) {
      return res.status(400).set(cors).json({ error: 'Invalid photos', errorCode: 'INVALID_IMAGES' })
    }
    const preparedImages = []
    for (const item of images) {
      const dataUrl = typeof item === 'string' ? item : item?.dataUrl
      const match = typeof dataUrl === 'string'
        ? /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl)
        : null
      if (!match || match[2].length % 4 !== 0) {
        return res.status(400).set(cors).json({ error: 'Invalid photos', errorCode: 'INVALID_IMAGES' })
      }
      const buffer = Buffer.from(match[2], 'base64')
      const mimeType = match[1]
      const isRaster = mimeType === 'image/jpeg'
        ? buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
        : mimeType === 'image/png'
          ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
      if (!buffer.length || buffer.length > MAX_IMAGE_BYTES || !isRaster) {
        return res.status(400).set(cors).json({ error: 'Invalid photos', errorCode: 'INVALID_IMAGES' })
      }
      preparedImages.push({ buffer, mimeType, ext: IMAGE_MIME_TYPES.get(mimeType), label: item?.label })
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
    if (preparedImages.length > 0) {
      for (let i = 0; i < preparedImages.length; i++) {
        const { buffer, mimeType, ext } = preparedImages[i]

        const rawLabel = preparedImages[i].label
        const label = typeof rawLabel === 'string' ? `_${rawLabel.replace(/[^a-z0-9]/gi, '')}` : ''
        const fileName = `submissions/${cleanEan}/${randomUUID()}_${i}${label}.${ext}`

        try {
          const { error: uploadError } = await admin.storage
            .from('public-assets')
            .upload(fileName, buffer, {
              contentType: mimeType,
              upsert: false,
            })
          if (uploadError) throw uploadError
          const { data: pubData } = admin.storage.from('public-assets').getPublicUrl(fileName)
          if (!pubData?.publicUrl) throw new Error('Public URL unavailable')
          uploadedPhotoUrls.push(pubData.publicUrl)
        } catch (uploadFailure) {
          console.error('[submit-product] upload error:', uploadFailure)
          return res.status(500).set(cors).json({ error: 'Unable to upload photos', errorCode: 'PHOTO_UPLOAD_FAILED' })
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
        error: 'Unable to save submission',
        errorCode: 'DB_INSERT_FAILED',
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
      error: 'Unable to save submission',
      errorCode: 'EXCEPTION',
    })
  }
}
