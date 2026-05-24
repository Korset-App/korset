import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { verifyWebhookSecret } from '../../src/telegram-bot/verifyWebhook.js'

const VALID_SECRET = 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4'

describe('verifyWebhookSecret', () => {
  it('returns valid when provided token matches expected', () => {
    const result = verifyWebhookSecret(VALID_SECRET, VALID_SECRET)
    assert.equal(result.valid, true)
    assert.equal(result.reason, null)
  })

  it('rejects mismatched token', () => {
    const result = verifyWebhookSecret('wrong-token-value', VALID_SECRET)
    assert.equal(result.valid, false)
    assert.equal(result.reason, 'mismatch')
  })

  it('rejects empty header (missing X-Telegram-Bot-Api-Secret-Token)', () => {
    const result = verifyWebhookSecret('', VALID_SECRET)
    assert.equal(result.valid, false)
    assert.equal(result.reason, 'missing_header')
  })

  it('rejects null header', () => {
    const result = verifyWebhookSecret(null, VALID_SECRET)
    assert.equal(result.valid, false)
    assert.equal(result.reason, 'missing_header')
  })

  it('rejects undefined header', () => {
    const result = verifyWebhookSecret(undefined, VALID_SECRET)
    assert.equal(result.valid, false)
    assert.equal(result.reason, 'missing_header')
  })

  it('rejects when expected secret is not configured (empty string)', () => {
    const result = verifyWebhookSecret(VALID_SECRET, '')
    assert.equal(result.valid, false)
    assert.equal(result.reason, 'not_configured')
  })

  it('rejects when expected secret is not configured (null)', () => {
    const result = verifyWebhookSecret(VALID_SECRET, null)
    assert.equal(result.valid, false)
    assert.equal(result.reason, 'not_configured')
  })

  it('rejects when tokens have same prefix but differ later (resists early-exit timing)', () => {
    const similarButDifferent = VALID_SECRET.slice(0, -4) + 'ffff'
    const result = verifyWebhookSecret(similarButDifferent, VALID_SECRET)
    assert.equal(result.valid, false)
    assert.equal(result.reason, 'mismatch')
  })
})
