import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AI_VOICE_LIMITS,
  getSupportedVoiceMimeType,
  validateVoiceRecording,
} from '../../src/domain/ai/voiceTranscription.js'

test('voice transcription limits match the approved V1 scope', () => {
  assert.equal(AI_VOICE_LIMITS.maxDurationMs, 20_000)
  assert.equal(AI_VOICE_LIMITS.minDurationMs, 800)
  assert.equal(AI_VOICE_LIMITS.maxBytes, 4 * 1024 * 1024)
})

test('voice recording validation rejects too short, too long, empty, and oversized audio', () => {
  assert.equal(validateVoiceRecording({ durationMs: 799, size: 1000 }).error, 'audio_too_short')
  assert.equal(validateVoiceRecording({ durationMs: 20_001, size: 1000 }).error, 'audio_too_long')
  assert.equal(validateVoiceRecording({ durationMs: 1200, size: 0 }).error, 'audio_empty')
  assert.equal(
    validateVoiceRecording({ durationMs: 1200, size: AI_VOICE_LIMITS.maxBytes + 1 }).error,
    'audio_too_large'
  )
  assert.equal(validateVoiceRecording({ durationMs: 1200, size: 1000 }).ok, true)
})

test('voice mime selection prefers compact mobile-friendly formats', () => {
  const supported = new Set(['audio/mp4', 'audio/webm;codecs=opus'])
  const mime = getSupportedVoiceMimeType((candidate) => supported.has(candidate))
  assert.equal(mime, 'audio/webm;codecs=opus')

  const safariMime = getSupportedVoiceMimeType((candidate) => candidate === 'audio/mp4')
  assert.equal(safariMime, 'audio/mp4')

  assert.equal(getSupportedVoiceMimeType(() => false), '')
})
