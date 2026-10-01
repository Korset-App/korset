import test from 'node:test'
import assert from 'node:assert/strict'
import { getIntegrationHealth } from '../../../src/domain/retail/integrationStatus.js'

const now = Date.parse('2026-10-01T12:00:00Z')

test('no integration is unconfigured', () => {
  assert.equal(getIntegrationHealth(null, now).state, 'unconfigured')
})

test('heartbeat does not imply recent applied data', () => {
  const result = getIntegrationHealth({ status: 'active', last_seen_at: '2026-10-01T11:55:00Z', last_applied_at: '2026-09-29T12:00:00Z' }, now)
  assert.equal(result.connection, 'recent')
  assert.equal(result.data, 'stale')
})

test('missing and invalid timestamps are unknown', () => {
  const result = getIntegrationHealth({ status: 'active', last_seen_at: 'bad', last_applied_at: null }, now)
  assert.equal(result.connection, 'unknown')
  assert.equal(result.data, 'unknown')
})

test('heartbeat older than 15 minutes is stale', () => {
  const result = getIntegrationHealth({ status: 'active', last_seen_at: '2026-10-01T11:44:59Z', last_applied_at: '2026-10-01T11:45:00Z' }, now)
  assert.equal(result.connection, 'stale')
  assert.equal(result.data, 'recent')
})

test('application older than 30 minutes is stale', () => {
  const result = getIntegrationHealth({ status: 'active', last_seen_at: '2026-10-01T11:55:00Z', last_applied_at: '2026-10-01T11:29:59Z' }, now)
  assert.equal(result.connection, 'recent')
  assert.equal(result.data, 'stale')
})

test('future timestamp beyond clock tolerance is unknown', () => {
  const result = getIntegrationHealth({ status: 'active', last_seen_at: '2026-10-01T12:05:01Z', last_applied_at: '2026-10-01T12:05:01Z' }, now)
  assert.equal(result.connection, 'unknown')
  assert.equal(result.data, 'unknown')
})

test('heartbeat without successful application does not imply fresh data', () => {
  const result = getIntegrationHealth({ status: 'active', last_seen_at: '2026-10-01T11:59:00Z', last_applied_at: null }, now)
  assert.equal(result.connection, 'recent')
  assert.equal(result.data, 'unknown')
  assert.equal(result.healthy, false)
})

test('paused and revoked states override timestamps', () => {
  assert.equal(getIntegrationHealth({ status: 'paused', last_seen_at: '2026-10-01T12:00:00Z' }, now).state, 'paused')
  assert.equal(getIntegrationHealth({ status: 'revoked' }, now).state, 'revoked')
})

test('recent heartbeats and data never hide a known source error',()=>{
  assert.equal(getIntegrationHealth({status:'active',last_seen_at:'2026-10-01T12:00:00Z',last_applied_at:'2026-10-01T12:00:00Z',last_error_code:'ITEMS_REQUIRE_REVIEW'},now).healthy,false)
})
