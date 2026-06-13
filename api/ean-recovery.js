/* global process, console */
import { createClient } from '@supabase/supabase-js'
import { normalizeName } from '../src/domain/product/nameNormalizer.js'
import { buildProductCorrectionStatusUpdate } from '../src/domain/product/correctionReview.js'
import { buildTrustedAliasPromotionUpdate, isScannableAliasEan } from '../src/domain/product/eanAliases.js'

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

async function verifyJWT(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return { user: null, authenticated: false }
  const token = authHeader.slice(7)
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return { user: null, authenticated: false }
  try {
    const sb = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await sb.auth.getUser(token)
    if (error || !data.user) return { user: null, authenticated: false }
    return { user: data.user, authenticated: true }
  } catch {
    return { user: null, authenticated: false }
  }
}

function getAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function isStoreOwner(admin, storeId, userId) {
  if (!storeId || !userId) return false
  const { data, error } = await admin.from('stores').select('owner_id').eq('id', storeId).maybeSingle()
  if (error || !data) return false
  return data.owner_id === userId
}

export async function handleCorrectionStatusUpdate({ admin, cors, id, status, res, user, isAdmin }) {
  if (!id) return res.status(400).set(cors).json({ error: 'Missing correction event id' })
  if (!status) return res.status(400).set(cors).json({ error: 'Missing status' })

  const { data: event, error: eventError } = await admin
    .from('product_correction_events')
    .select('id, store_id, status')
    .eq('id', id)
    .maybeSingle()

  if (eventError) {
    console.error('[ean-recovery] correction event lookup error', eventError)
    return res.status(500).set(cors).json({ error: 'Correction lookup failed' })
  }
  if (!event) return res.status(404).set(cors).json({ error: 'Correction event not found' })

  const ownsStore = isAdmin ? true : await isStoreOwner(admin, event.store_id, user.id)
  if (!ownsStore) return res.status(403).set(cors).json({ error: 'Forbidden' })

  const update = buildProductCorrectionStatusUpdate({
    currentStatus: event.status,
    nextStatus: status,
    reviewerAuthId: user.id,
  })
  if (!update.ok) return res.status(400).set(cors).json({ error: update.reason })

  const { data, error: updateError } = await admin
    .from('product_correction_events')
    .update(update.update)
    .eq('id', id)
    .eq('status', event.status)
    .select('id, status, reviewed_at')
    .single()

  if (updateError) {
    console.error('[ean-recovery] correction status update error', updateError)
    return res.status(500).set(cors).json({ error: 'Correction update failed' })
  }

  return res.status(200).set(cors).json({ ok: true, action: 'update-correction-status', event: data })
}

export async function handleTrustedAliasPromotion({ admin, cors, id, res, user, isAdmin }) {
  if (!id) return res.status(400).set(cors).json({ error: 'Missing alias id' })
  if (!isAdmin) return res.status(403).set(cors).json({ error: 'Forbidden' })

  const { data: alias, error: aliasError } = await admin
    .from('product_ean_aliases')
    .select('id, ean, global_product_id, status, source, confidence, evidence_json, is_active')
    .eq('id', id)
    .maybeSingle()

  if (aliasError) {
    console.error('[ean-recovery] alias lookup error', aliasError)
    return res.status(500).set(cors).json({ error: 'Alias lookup failed' })
  }
  if (!alias) return res.status(404).set(cors).json({ error: 'Alias not found' })

  const { data: currentTrustedForEan, error: trustedError } = await admin
    .from('product_ean_aliases')
    .select('id, global_product_id')
    .eq('ean', alias.ean)
    .eq('status', 'trusted')
    .eq('is_active', true)
    .maybeSingle()

  if (trustedError) {
    console.error('[ean-recovery] trusted alias conflict lookup error', trustedError)
    return res.status(500).set(cors).json({ error: 'Trusted conflict lookup failed' })
  }

  const { data: primaryTargetForEan, error: primaryError } = await admin
    .from('global_products')
    .select('id')
    .eq('ean', alias.ean)
    .eq('is_active', true)
    .maybeSingle()

  if (primaryError) {
    console.error('[ean-recovery] primary EAN conflict lookup error', primaryError)
    return res.status(500).set(cors).json({ error: 'Primary conflict lookup failed' })
  }

  const update = buildTrustedAliasPromotionUpdate({
    alias,
    reviewerAuthId: user.id,
    currentTrustedForEan,
    primaryTargetForEan,
  })
  if (!update.ok) {
    return res.status(400).set(cors).json({ error: 'promotion_blocked', reasons: update.reasons })
  }

  const { data, error: updateError } = await admin
    .from('product_ean_aliases')
    .update(update.update)
    .eq('id', id)
    .eq('status', alias.status)
    .select('id, ean, global_product_id, status, confidence, reviewed_at')
    .single()

  if (updateError) {
    console.error('[ean-recovery] trusted alias promotion update error', updateError)
    return res.status(500).set(cors).json({ error: 'Alias promotion failed' })
  }

  return res.status(200).set(cors).json({ ok: true, action: 'promote-ean-alias-trusted', alias: data })
}

export async function handleManualAliasCandidateCreate({
  admin,
  cors,
  ean,
  globalProductId,
  res,
  user,
  isAdmin,
}) {
  if (!isAdmin) return res.status(403).set(cors).json({ error: 'Forbidden' })
  if (!globalProductId) return res.status(400).set(cors).json({ error: 'Missing product id' })
  if (!isScannableAliasEan(ean)) {
    return res.status(400).set(cors).json({ error: 'manual_candidate_blocked', reasons: ['ean_not_scannable'] })
  }

  const cleanEan = String(ean).trim()

  const { data: product, error: productError } = await admin
    .from('global_products')
    .select('id, ean, name, is_active')
    .eq('id', globalProductId)
    .maybeSingle()

  if (productError) {
    console.error('[ean-recovery] manual alias product lookup error', productError)
    return res.status(500).set(cors).json({ error: 'Product lookup failed' })
  }
  if (!product || product.is_active === false) return res.status(404).set(cors).json({ error: 'Product not found' })

  const { data: currentTrustedForEan, error: trustedError } = await admin
    .from('product_ean_aliases')
    .select('id, global_product_id')
    .eq('ean', cleanEan)
    .eq('status', 'trusted')
    .eq('is_active', true)
    .maybeSingle()

  if (trustedError) {
    console.error('[ean-recovery] manual alias trusted conflict lookup error', trustedError)
    return res.status(500).set(cors).json({ error: 'Trusted conflict lookup failed' })
  }

  const { data: primaryTargetForEan, error: primaryError } = await admin
    .from('global_products')
    .select('id')
    .eq('ean', cleanEan)
    .eq('is_active', true)
    .maybeSingle()

  if (primaryError) {
    console.error('[ean-recovery] manual alias primary conflict lookup error', primaryError)
    return res.status(500).set(cors).json({ error: 'Primary conflict lookup failed' })
  }

  const reasons = []
  if (primaryTargetForEan?.id) {
    if (String(primaryTargetForEan.id) === String(globalProductId)) {
      reasons.push('ean_already_primary_for_same_product')
    } else {
      reasons.push('ean_is_another_primary_product')
    }
  }
  if (
    currentTrustedForEan?.global_product_id &&
    String(currentTrustedForEan.global_product_id) !== String(globalProductId)
  ) {
    reasons.push('ean_already_trusted_for_another_product')
  }
  if (reasons.length > 0) {
    return res.status(400).set(cors).json({ error: 'manual_candidate_blocked', reasons })
  }

  const now = new Date().toISOString()
  const payload = {
    ean: cleanEan,
    global_product_id: globalProductId,
    status: 'review',
    source: 'manual_admin',
    confidence: 95,
    created_by_auth_id: user.id,
    evidence_json: {
      reviewerConfirmedSameSku: true,
      manualAdminCandidate: {
        reviewerAuthId: user.id,
        createdAt: now,
        targetProductPrimaryEan: product.ean || null,
      },
    },
  }

  const { data, error: insertError } = await admin
    .from('product_ean_aliases')
    .insert(payload)
    .select('id, ean, global_product_id, status, source, confidence, created_at')
    .single()

  if (insertError) {
    if (insertError.code === '23505' || insertError.message?.includes('duplicate key')) {
      return res.status(409).set(cors).json({ error: 'duplicate', message: 'EAN candidate already exists' })
    }
    console.error('[ean-recovery] manual alias candidate insert error', insertError)
    return res.status(500).set(cors).json({ error: 'Manual alias candidate create failed' })
  }

  return res.status(200).set(cors).json({ ok: true, action: 'create-manual-alias-candidate', alias: data })
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return res.status(200).set(cors).send('')
  }

  if (req.method !== 'POST') {
    return res.status(405).set(cors).json({ error: 'Method not allowed' })
  }

  const { user, authenticated } = await verifyJWT(req.headers.authorization)
  if (!authenticated) {
    return res.status(401).set(cors).json({ error: 'Unauthorized' })
  }

  const admin = getAdmin()
  if (!admin) {
    console.error('[ean-recovery] Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY missing')
    return res.status(500).set(cors).json({ error: 'Server misconfiguration' })
  }

  const { action, id, ean, name, status } = req.body || {}

  // Admin-only by default; correction status updates have a separate owner/admin check.
  let isAdmin
  try {
    const { data: adminResult, error: rpcError } = await admin.rpc('is_admin_user', { p_auth_id: user.id })
    if (rpcError) {
      console.error('[ean-recovery] is_admin_user rpc error', rpcError)
      return res.status(500).set(cors).json({ error: 'Authorization check failed' })
    }
    isAdmin = adminResult === true
    if (!isAdmin && action !== 'update-correction-status') {
      console.warn('[ean-recovery] Forbidden attempt by user', user.id)
      return res.status(403).set(cors).json({ error: 'Forbidden' })
    }
  } catch (e) {
    console.error('[ean-recovery] admin check exception', e)
    return res.status(500).set(cors).json({ error: 'Authorization check failed' })
  }

  if (!id && action !== 'delete-store-products') {
    return res.status(400).set(cors).json({ error: 'Missing product id' })
  }

  try {
    if (action === 'update-correction-status') {
      return handleCorrectionStatusUpdate({ admin, cors, id, status, res, user, isAdmin })
    }

    if (action === 'promote-ean-alias-trusted') {
      return handleTrustedAliasPromotion({ admin, cors, id, res, user, isAdmin })
    }

    if (action === 'create-manual-alias-candidate') {
      return handleManualAliasCandidateCreate({
        admin,
        cors,
        ean,
        globalProductId: id,
        res,
        user,
        isAdmin,
      })
    }

    if (action === 'delete') {
      await admin.from('store_products').delete().eq('global_product_id', id)
      const { error: gpError } = await admin.from('global_products').delete().eq('id', id)
      if (gpError) {
        console.error('[ean-recovery] delete error', gpError)
        return res.status(500).set(cors).json({ error: 'Delete failed' })
      }
      return res.status(200).set(cors).json({ ok: true, action: 'delete' })
    }

    if (action === 'update-ean') {
      if (!ean) return res.status(400).set(cors).json({ error: 'Missing ean' })
      const { error: gpError } = await admin.from('global_products').update({ ean }).eq('id', id)
      if (gpError) {
        if (gpError.code === '23505' || gpError.message?.includes('duplicate key')) {
          return res.status(409).set(cors).json({ error: 'duplicate', message: 'EAN already exists' })
        }
        console.error('[ean-recovery] update-ean error', gpError)
        return res.status(500).set(cors).json({ error: 'Update failed' })
      }
      await admin.from('store_products').update({ ean }).eq('global_product_id', id).eq('is_active', true)
      return res.status(200).set(cors).json({ ok: true, action: 'update-ean' })
    }

    if (action === 'update-name') {
      if (!name) return res.status(400).set(cors).json({ error: 'Missing name' })
      const { error: gpError } = await admin.from('global_products').update({ name: normalizeName(name) }).eq('id', id)
      if (gpError) {
        console.error('[ean-recovery] update-name error', gpError)
        return res.status(500).set(cors).json({ error: 'Update failed' })
      }
      return res.status(200).set(cors).json({ ok: true, action: 'update-name' })
    }

    return res.status(400).set(cors).json({ error: 'Unknown action' })
  } catch (e) {
    console.error('[ean-recovery] handler exception', e)
    return res.status(500).set(cors).json({ error: 'Internal error' })
  }
}
