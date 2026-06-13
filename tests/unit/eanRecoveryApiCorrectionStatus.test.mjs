import assert from 'node:assert/strict'
import test from 'node:test'

import { handleCorrectionStatusUpdate } from '../../api/ean-recovery.js'

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

function createAdminMock({ ownerId = 'owner-1', eventStatus = 'new' } = {}) {
  const state = { updatePayload: null }
  const admin = {
    from(table) {
      if (table === 'stores') {
        return {
          select() {
            return this
          },
          eq() {
            return this
          },
          async maybeSingle() {
            return { data: { owner_id: ownerId }, error: null }
          },
        }
      }

      assert.equal(table, 'product_correction_events')
      return {
        select() {
          return this
        },
        eq() {
          return this
        },
        async maybeSingle() {
          return { data: { id: 'event-1', store_id: 'store-1', status: eventStatus }, error: null }
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
                data: { id: 'event-1', status: payload.status, reviewed_at: payload.reviewed_at },
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

test('handleCorrectionStatusUpdate lets a store owner update only correction status fields', async () => {
  const { admin, state } = createAdminMock({ ownerId: 'owner-1' })
  const res = createResponse()

  await handleCorrectionStatusUpdate({
    admin,
    cors: { 'Access-Control-Allow-Origin': 'http://localhost:5173' },
    id: 'event-1',
    status: 'fixed',
    res,
    user: { id: 'owner-1' },
    isAdmin: false,
  })

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.ok, true)
  assert.equal(state.updatePayload.status, 'fixed')
  assert.equal(state.updatePayload.reviewed_by_auth_id, 'owner-1')
  assert.deepEqual(state.updatePayload.resolution_json, { action: 'fixed' })
  assert.equal('product_ean_aliases' in state.updatePayload, false)
  assert.equal('global_products' in state.updatePayload, false)
})

test('handleCorrectionStatusUpdate rejects non-owner non-admin users', async () => {
  const { admin, state } = createAdminMock({ ownerId: 'owner-1' })
  const res = createResponse()

  await handleCorrectionStatusUpdate({
    admin,
    cors: {},
    id: 'event-1',
    status: 'fixed',
    res,
    user: { id: 'other-user' },
    isAdmin: false,
  })

  assert.equal(res.statusCode, 403)
  assert.equal(res.body.error, 'Forbidden')
  assert.equal(state.updatePayload, null)
})
