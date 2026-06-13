import assert from 'node:assert/strict'
import test from 'node:test'

import {
  handleManualAliasCandidateCreate,
  handleTrustedAliasPromotion,
} from '../../api/ean-recovery.js'

function createResponse() {
  return {
    statusCode: null,
    body: null,
    headers: null,
    status(code) {
      this.statusCode = code
      return this
    },
    set(headers) {
      this.headers = headers
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

function createAdminMock({ aliasOverrides = {}, trustedConflict = null, primaryTarget = null } = {}) {
  const state = { updatePayload: null }
  const alias = {
    id: 'alias-1',
    ean: '4870035005035',
    global_product_id: 'product-1',
    status: 'review',
    source: 'manual_admin',
    confidence: 95,
    evidence_json: { reviewerConfirmedSameSku: true },
    is_active: true,
    ...aliasOverrides,
  }

  const admin = {
    from(table) {
      if (table === 'global_products') {
        return {
          select() {
            return this
          },
          eq() {
            return this
          },
          async maybeSingle() {
            return { data: primaryTarget, error: null }
          },
        }
      }

      assert.equal(table, 'product_ean_aliases')
      return {
        _filters: [],
        select() {
          return this
        },
        eq(column, value) {
          this._filters.push([column, value])
          return this
        },
        async maybeSingle() {
          const idFilter = this._filters.find(([column]) => column === 'id')
          if (idFilter) return { data: alias, error: null }
          return { data: trustedConflict, error: null }
        },
        update(payload) {
          state.updatePayload = payload
          return {
            eq() {
              return this
            },
            select() {
              return this
            },
            async single() {
              return {
                data: {
                  id: alias.id,
                  ean: alias.ean,
                  global_product_id: alias.global_product_id,
                  status: payload.status,
                  confidence: payload.confidence,
                },
                error: null,
              }
            },
          }
        },
      }
    },
  }

  return { admin, state }
}

function createManualCandidateAdminMock({ targetProduct = null, trustedConflict = null, primaryTarget = null } = {}) {
  const state = { insertPayload: null }
  const product = targetProduct || {
    id: 'product-1',
    ean: '4870000000001',
    name: 'Same product multipack',
    is_active: true,
  }

  const admin = {
    from(table) {
      if (table === 'global_products') {
        return {
          _filters: [],
          select() {
            return this
          },
          eq(column, value) {
            this._filters.push([column, value])
            return this
          },
          async maybeSingle() {
            const idFilter = this._filters.find(([column]) => column === 'id')
            if (idFilter) return { data: product, error: null }
            return { data: primaryTarget, error: null }
          },
        }
      }

      assert.equal(table, 'product_ean_aliases')
      return {
        _filters: [],
        select() {
          return this
        },
        eq(column, value) {
          this._filters.push([column, value])
          return this
        },
        async maybeSingle() {
          return { data: trustedConflict, error: null }
        },
        insert(payload) {
          state.insertPayload = payload
          return {
            select() {
              return this
            },
            async single() {
              return {
                data: { id: 'alias-new', ...payload },
                error: null,
              }
            },
          }
        },
      }
    },
  }

  return { admin, state }
}

test('handleTrustedAliasPromotion promotes only after live conflict reads pass', async () => {
  const { admin, state } = createAdminMock()
  const res = createResponse()

  await handleTrustedAliasPromotion({
    admin,
    cors: {},
    id: 'alias-1',
    res,
    user: { id: 'admin-1' },
    isAdmin: true,
  })

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.ok, true)
  assert.equal(res.body.action, 'promote-ean-alias-trusted')
  assert.equal(state.updatePayload.status, 'trusted')
  assert.equal(state.updatePayload.reviewed_by_auth_id, 'admin-1')
  assert.equal(state.updatePayload.evidence_json.trustedPromotion.source, 'manual_admin')
})

test('handleTrustedAliasPromotion is admin-only', async () => {
  const { admin, state } = createAdminMock()
  const res = createResponse()

  await handleTrustedAliasPromotion({
    admin,
    cors: {},
    id: 'alias-1',
    res,
    user: { id: 'owner-1' },
    isAdmin: false,
  })

  assert.equal(res.statusCode, 403)
  assert.equal(res.body.error, 'Forbidden')
  assert.equal(state.updatePayload, null)
})

test('handleTrustedAliasPromotion blocks live primary EAN conflicts', async () => {
  const { admin, state } = createAdminMock({ primaryTarget: { id: 'product-2' } })
  const res = createResponse()

  await handleTrustedAliasPromotion({
    admin,
    cors: {},
    id: 'alias-1',
    res,
    user: { id: 'admin-1' },
    isAdmin: true,
  })

  assert.equal(res.statusCode, 400)
  assert.equal(res.body.error, 'promotion_blocked')
  assert.ok(res.body.reasons.includes('ean_is_another_primary_product'))
  assert.equal(state.updatePayload, null)
})

test('handleTrustedAliasPromotion blocks legacy source rows', async () => {
  const { admin, state } = createAdminMock({ aliasOverrides: { source: 'legacy_alternate_eans' } })
  const res = createResponse()

  await handleTrustedAliasPromotion({
    admin,
    cors: {},
    id: 'alias-1',
    res,
    user: { id: 'admin-1' },
    isAdmin: true,
  })

  assert.equal(res.statusCode, 400)
  assert.equal(res.body.error, 'promotion_blocked')
  assert.ok(res.body.reasons.includes('source_not_trustable'))
  assert.equal(state.updatePayload, null)
})

test('handleManualAliasCandidateCreate creates review manual_admin candidate only for admins', async () => {
  const { admin, state } = createManualCandidateAdminMock()
  const res = createResponse()

  await handleManualAliasCandidateCreate({
    admin,
    cors: {},
    ean: '4870035005035',
    globalProductId: 'product-1',
    res,
    user: { id: 'admin-1' },
    isAdmin: true,
  })

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.ok, true)
  assert.equal(res.body.action, 'create-manual-alias-candidate')
  assert.equal(state.insertPayload.ean, '4870035005035')
  assert.equal(state.insertPayload.global_product_id, 'product-1')
  assert.equal(state.insertPayload.status, 'review')
  assert.equal(state.insertPayload.source, 'manual_admin')
  assert.equal(state.insertPayload.confidence, 95)
  assert.equal(state.insertPayload.evidence_json.reviewerConfirmedSameSku, true)
  assert.equal(state.insertPayload.evidence_json.manualAdminCandidate.reviewerAuthId, 'admin-1')
})

test('handleManualAliasCandidateCreate is admin-only and does not insert for owners', async () => {
  const { admin, state } = createManualCandidateAdminMock()
  const res = createResponse()

  await handleManualAliasCandidateCreate({
    admin,
    cors: {},
    ean: '4870035005035',
    globalProductId: 'product-1',
    res,
    user: { id: 'owner-1' },
    isAdmin: false,
  })

  assert.equal(res.statusCode, 403)
  assert.equal(res.body.error, 'Forbidden')
  assert.equal(state.insertPayload, null)
})

test('handleManualAliasCandidateCreate blocks primary EAN conflicts before insert', async () => {
  const { admin, state } = createManualCandidateAdminMock({ primaryTarget: { id: 'product-2' } })
  const res = createResponse()

  await handleManualAliasCandidateCreate({
    admin,
    cors: {},
    ean: '4870035005035',
    globalProductId: 'product-1',
    res,
    user: { id: 'admin-1' },
    isAdmin: true,
  })

  assert.equal(res.statusCode, 400)
  assert.equal(res.body.error, 'manual_candidate_blocked')
  assert.ok(res.body.reasons.includes('ean_is_another_primary_product'))
  assert.equal(state.insertPayload, null)
})

test('handleManualAliasCandidateCreate blocks aliases that duplicate the target primary EAN', async () => {
  const { admin, state } = createManualCandidateAdminMock({ primaryTarget: { id: 'product-1' } })
  const res = createResponse()

  await handleManualAliasCandidateCreate({
    admin,
    cors: {},
    ean: '4870035005035',
    globalProductId: 'product-1',
    res,
    user: { id: 'admin-1' },
    isAdmin: true,
  })

  assert.equal(res.statusCode, 400)
  assert.equal(res.body.error, 'manual_candidate_blocked')
  assert.ok(res.body.reasons.includes('ean_already_primary_for_same_product'))
  assert.equal(state.insertPayload, null)
})
