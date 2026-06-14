/* global process, console */
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

const VALID_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
const VALID_TYPES = ['supermarket', 'minimarket', 'halal', 'specialty', 'other']
const VALID_PLANS = ['pilot', 'basic', 'pro', 'enterprise']

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
    console.error('[admin-stores] Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY missing')
    return res.status(500).set(cors).json({ error: 'Server misconfiguration' })
  }

  // Verify superadmin status via RPC
  let isSuperadmin = false
  try {
    const { data: superadminResult, error: rpcError } = await admin.rpc('is_superadmin_user', { p_auth_id: user.id })
    if (rpcError) {
      console.error('[admin-stores] is_superadmin_user rpc error', rpcError)
      return res.status(500).set(cors).json({ error: 'Authorization check failed' })
    }
    isSuperadmin = superadminResult === true
    if (!isSuperadmin) {
      console.warn('[admin-stores] Forbidden attempt by user', user.id)
      return res.status(403).set(cors).json({ error: 'Forbidden' })
    }
  } catch (e) {
    console.error('[admin-stores] superadmin check exception', e)
    return res.status(500).set(cors).json({ error: 'Authorization check failed' })
  }

  const {
    action,
    slug,
    name,
    type,
    city,
    address,
    phone,
    whatsappNumber,
    shortDescription,
    description,
    ownerEmail,
    ownerPassword,
    plan,
    storeId,
    isActive,
    planExpiresAt,
    ownerId,
    newEmail,
    newPassword,
    isPublished,
    ownerPrivatePhone,
    ownerPrivateNotes,
    targetUserId,
    searchQuery,
  } = req.body || {}

  try {
    // ACTION: LIST STORES WITH METRICS
    if (action === 'list') {
      let stores = []
      const { data: rpcData, error: rpcError } = await admin.rpc('fn_admin_get_stores_with_metrics')

      if (rpcError && (rpcError.message?.includes('Could not find the function') || rpcError.code === 'PGRST202')) {
        // Fallback: load stores and calculate metrics manually
        const { data: dbStores, error: storesError } = await admin
          .from('stores')
          .select('*')
          .order('created_at', { ascending: false })

        if (storesError) {
          console.error('[admin-stores] list error', storesError)
          return res.status(500).set(cors).json({ error: 'Failed to list stores' })
        }

        stores = await Promise.all(
          dbStores.map(async (store) => {
            const { count: catalogCount } = await admin
              .from('store_products')
              .select('*', { count: 'exact', head: true })
              .eq('store_id', store.id)

            const { count: scanCount } = await admin
              .from('scan_events')
              .select('*', { count: 'exact', head: true })
              .eq('store_id', store.id)

            const { count: eanRecoveryCount } = await admin
              .from('product_correction_events')
              .select('*', { count: 'exact', head: true })
              .eq('store_id', store.id)
              .in('status', ['new', 'reviewing'])

            return {
              ...store,
              catalog_count: Number(catalogCount || 0),
              scan_count: Number(scanCount || 0),
              ean_recovery_count: Number(eanRecoveryCount || 0),
            }
          })
        )
      } else if (rpcError) {
        console.error('[admin-stores] metrics rpc error', rpcError)
        return res.status(500).set(cors).json({ error: 'Failed to load stores with metrics' })
      } else {
        stores = (rpcData || []).map((store) => ({
          ...store,
          catalog_count: Number(store.catalog_count || 0),
          scan_count: Number(store.scan_count || 0),
          ean_recovery_count: Number(store.ean_recovery_count || 0),
        }))
      }

      // Fetch owner emails/phones from auth.users (requires service_role)
      const { data: listResult, error: listError } = await admin.auth.admin.listUsers()
      if (listError) {
        console.error('[admin-stores] listUsers error', listError)
        // Non-blocking fallback: output stores without emails
        return res.status(200).set(cors).json({ ok: true, stores })
      }

      const usersMap = new Map(listResult.users.map((u) => [u.id, u]))
      const storesWithOwners = stores.map((store) => {
        const owner = usersMap.get(store.owner_id)
        return {
          ...store,
          owner_email: owner?.email || null,
          owner_phone: owner?.phone || null,
          owner_is_superadmin: Boolean(owner?.app_metadata?.is_superadmin),
        }
      })

      return res.status(200).set(cors).json({ ok: true, stores: storesWithOwners })
    }

    // ACTION: TOGGLE ACTIVE STATUS
    if (action === 'toggle-active') {
      if (!storeId) {
        return res.status(400).set(cors).json({ error: 'Missing storeId' })
      }
      if (typeof isActive !== 'boolean') {
        return res.status(400).set(cors).json({ error: 'isActive must be a boolean' })
      }

      const { data: updatedStore, error: updateError } = await admin
        .from('stores')
        .update({ is_active: isActive })
        .eq('id', storeId)
        .select()
        .single()

      if (updateError) {
        console.error('[admin-stores] toggle-active error', updateError)
        return res.status(500).set(cors).json({ error: 'Failed to update store status' })
      }

      return res.status(200).set(cors).json({ ok: true, store: updatedStore })
    }

    // ACTION: UPDATE STORE DETAILS
    if (action === 'update-store-details') {
      if (!storeId) {
        return res.status(400).set(cors).json({ error: 'Missing storeId' })
      }

      const updateData = {}
      if (name !== undefined) updateData.name = name
      if (type !== undefined) updateData.type = type
      if (city !== undefined) updateData.city = city
      if (address !== undefined) updateData.address = address
      if (phone !== undefined) updateData.phone = phone
      if (whatsappNumber !== undefined) updateData.whatsapp_number = whatsappNumber
      if (shortDescription !== undefined) {
        updateData.short_description = shortDescription ? shortDescription.substring(0, 240) : null
      }
      if (description !== undefined) {
        updateData.description = description ? description.substring(0, 1200) : null
      }
      if (isPublished !== undefined) {
        updateData.is_published = Boolean(isPublished)
      }
      if (ownerPrivatePhone !== undefined) {
        updateData.owner_private_phone = ownerPrivatePhone || null
      }
      if (ownerPrivateNotes !== undefined) {
        updateData.owner_private_notes = ownerPrivateNotes || null
      }
      if (ownerId !== undefined) {
        updateData.owner_id = ownerId || null
      }
      if (plan !== undefined) {
        if (!VALID_PLANS.includes(plan)) {
          return res.status(400).set(cors).json({ error: 'invalid_plan' })
        }
        updateData.plan = plan
      }
      if (planExpiresAt !== undefined) {
        if (planExpiresAt) {
          const parsedDate = new Date(planExpiresAt)
          if (isNaN(parsedDate.getTime())) {
            return res.status(400).set(cors).json({ error: 'invalid_date_format', message: 'Некорректный формат даты окончания подписки' })
          }
          updateData.plan_expires_at = parsedDate.toISOString()
        } else {
          updateData.plan_expires_at = null
        }
      }

      const { data: updatedStore, error: updateError } = await admin
        .from('stores')
        .update(updateData)
        .eq('id', storeId)
        .select()
        .single()

      if (updateError) {
        console.error('[admin-stores] update-store-details error', updateError)
        return res.status(500).set(cors).json({ error: 'Failed to update store details' })
      }

      return res.status(200).set(cors).json({ ok: true, store: updatedStore })
    }

    // ACTION: UPDATE OWNER AUTH
    if (action === 'update-owner-auth') {
      if (!ownerId) {
        return res.status(400).set(cors).json({ error: 'Missing ownerId' })
      }

      const updatePayload = {}
      if (newEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(newEmail)) {
          return res.status(400).set(cors).json({ error: 'invalid_email_format' })
        }
        updatePayload.email = newEmail
        updatePayload.email_confirm = true
      }
      if (newPassword) {
        if (newPassword.length < 8) {
          return res.status(400).set(cors).json({ error: 'password_too_short' })
        }
        updatePayload.password = newPassword
      }

      if (Object.keys(updatePayload).length === 0) {
        return res.status(400).set(cors).json({ error: 'No update parameters provided' })
      }

      const { data: updatedUser, error: authError } = await admin.auth.admin.updateUserById(
        ownerId,
        updatePayload
      )

      if (authError) {
        console.error('[admin-stores] update-owner-auth error', authError)
        return res.status(500).set(cors).json({ error: 'auth_update_failed', message: authError.message })
      }

      return res.status(200).set(cors).json({ ok: true, user: updatedUser.user })
    }

    // ACTION: CREATE STORE
    if (action === 'create') {
      // Validate inputs
      const errors = []
      if (!slug) errors.push('slug_required')
      if (!name) errors.push('name_required')
      if (!type) errors.push('type_required')
      if (!city) errors.push('city_required')

      if (slug && !VALID_SLUG.test(slug)) errors.push('invalid_slug_format')
      if (type && !VALID_TYPES.includes(type)) errors.push('invalid_type')
      if (plan && !VALID_PLANS.includes(plan)) errors.push('invalid_plan')

      const phoneRegex = /^7\d{10}$/
      if (phone && !phoneRegex.test(phone)) errors.push('invalid_phone_format')
      if (whatsappNumber && !phoneRegex.test(whatsappNumber)) errors.push('invalid_whatsapp_format')

      if (!ownerId) {
        if (!ownerEmail) errors.push('owner_email_required')
        if (!ownerPassword) errors.push('owner_password_required')
        if (ownerPassword && ownerPassword.length < 8) errors.push('password_too_short')
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (ownerEmail && !emailRegex.test(ownerEmail)) errors.push('invalid_email_format')
      }

      if (errors.length > 0) {
        return res.status(400).set(cors).json({ error: 'validation_failed', reasons: errors })
      }

      // Check if store slug already exists
      const { data: existingStore } = await admin
        .from('stores')
        .select('id')
        .eq('code', slug)
        .maybeSingle()

      if (existingStore) {
        return res.status(409).set(cors).json({ error: 'slug_taken', message: 'URL-адрес (slug) магазина уже занят' })
      }

      let finalOwnerId = ownerId

      if (!finalOwnerId) {
        // Check if owner email already exists
        const { data: listResult } = await admin.auth.admin.listUsers()
        const existingUser = listResult?.users?.find(u => u.email?.toLowerCase() === ownerEmail.toLowerCase())
        if (existingUser) {
          return res.status(409).set(cors).json({ error: 'owner_email_taken', message: 'Пользователь с таким Email уже существует' })
        }

        // Step 1: Create owner auth user
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
          email: ownerEmail,
          password: ownerPassword,
          email_confirm: true,
        })

        if (authError) {
          console.error('[admin-stores] createUser error', authError)
          return res.status(500).set(cors).json({ error: 'auth_creation_failed', message: authError.message })
        }

        finalOwnerId = authData.user.id
      }

      // Step 2: Create store record
      const storeRecord = {
        code: slug,
        name,
        city,
        type,
        plan: plan || 'pilot',
        is_active: true,
        is_published: isPublished !== undefined ? Boolean(isPublished) : true,
        owner_id: finalOwnerId,
      }
      if (address) storeRecord.address = address
      if (phone) storeRecord.phone = phone
      if (whatsappNumber) storeRecord.whatsapp_number = whatsappNumber
      if (shortDescription) storeRecord.short_description = shortDescription.substring(0, 240)
      if (description) storeRecord.description = description.substring(0, 1200)
      if (ownerPrivatePhone) storeRecord.owner_private_phone = ownerPrivatePhone
      if (ownerPrivateNotes) storeRecord.owner_private_notes = ownerPrivateNotes

      const { data: storeData, error: storeError } = await admin
        .from('stores')
        .insert(storeRecord)
        .select()
        .single()

      if (storeError) {
        console.error('[admin-stores] store insert error', storeError)
        // Clean up created auth user to avoid orphan accounts
        if (!ownerId) {
          await admin.auth.admin.deleteUser(finalOwnerId)
        }
        return res.status(500).set(cors).json({ error: 'store_insertion_failed', message: storeError.message })
      }
      return res.status(200).set(cors).json({ ok: true, store: storeData })
    }
    // ACTION: SCAN ACTIVITY FOR CHARTING
    if (action === 'scan-activity') {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

      const { data: scanData, error: scanError } = await admin
        .from('scan_events')
        .select('scanned_at, store_id')
        .gte('scanned_at', fourteenDaysAgo)
        .order('scanned_at', { ascending: true })

      if (scanError) {
        console.error('[admin-stores] scan-activity error', scanError)
        return res.status(500).set(cors).json({ error: 'Failed to fetch scan activity' })
      }

      // Group scan activity by store and date
      const counts = {} // { storeId: { 'YYYY-MM-DD': count } }
      scanData.forEach((event) => {
        const date = event.scanned_at.slice(0, 10)
        const sId = event.store_id || 'global'
        if (!counts[sId]) counts[sId] = {}
        counts[sId][date] = (counts[sId][date] || 0) + 1
      })

      return res.status(200).set(cors).json({ ok: true, activity: counts })
    }

    // ACTION: TOGGLE USER SUPERADMIN PRIVILEGES
    if (action === 'toggle-superadmin') {
      if (!targetUserId) {
        return res.status(400).set(cors).json({ error: 'Missing targetUserId' })
      }
      if (typeof isActive !== 'boolean') {
        return res.status(400).set(cors).json({ error: 'isActive must be a boolean' })
      }

      const { data: updatedUser, error: updateError } = await admin
        .from('users')
        .update({ is_superadmin: isActive })
        .eq('auth_id', targetUserId)
        .select()
        .single()

      if (updateError) {
        console.error('[admin-stores] toggle-superadmin error', updateError)
        return res.status(500).set(cors).json({ error: 'Failed to update superadmin status' })
      }

      return res.status(200).set(cors).json({ ok: true, user: updatedUser })
    }

    // ACTION: SEARCH USER CANDIDATES FOR STORE OWNERSHIP
    if (action === 'search-owners') {
      const { data: listResult, error: listError } = await admin.auth.admin.listUsers()
      if (listError) {
        console.error('[admin-stores] search-owners listUsers error', listError)
        return res.status(500).set(cors).json({ error: 'Failed to search owners' })
      }

      const { data: dbUsers, error: dbError } = await admin
        .from('users')
        .select('auth_id, name, is_superadmin')

      if (dbError) {
        console.error('[admin-stores] search-owners dbUsers error', dbError)
        return res.status(500).set(cors).json({ error: 'Failed to query user records' })
      }

      const dbUsersMap = new Map(dbUsers.map((u) => [u.auth_id, u]))
      const query = (searchQuery || '').toLowerCase().trim()

      const results = listResult.users
        .map((u) => {
          const dbUser = dbUsersMap.get(u.id)
          return {
            id: u.id,
            email: u.email,
            phone: u.phone || null,
            name: dbUser?.name || u.email.split('@')[0],
            is_superadmin: dbUser?.is_superadmin || false,
          }
        })
        .filter((u) => {
          if (!query) return true
          return (
            u.email.toLowerCase().includes(query) ||
            u.name.toLowerCase().includes(query)
          )
        })
        .slice(0, 30)

      return res.status(200).set(cors).json({ ok: true, users: results })
    }

    return res.status(400).set(cors).json({ error: 'Unknown action' })
  } catch (e) {
    console.error('[admin-stores] handler exception', e)
    return res.status(500).set(cors).json({ error: 'Internal error' })
  }
}
