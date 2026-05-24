/* global Buffer */
import crypto from 'crypto'

export function verifyWebhookSecret(provided, expected) {
  if (!expected || typeof expected !== 'string' || expected.length === 0) {
    return { valid: false, reason: 'not_configured' }
  }
  if (!provided || typeof provided !== 'string' || provided.length === 0) {
    return { valid: false, reason: 'missing_header' }
  }
  if (provided.length !== expected.length) {
    return { valid: false, reason: 'mismatch' }
  }
  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(expected)
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return { valid: false, reason: 'mismatch' }
  }
  return { valid: true, reason: null }
}
