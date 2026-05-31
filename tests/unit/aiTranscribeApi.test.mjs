import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import test from 'node:test'

import {
  TRANSCRIPTION_LIMITS,
  TRANSCRIPTION_RATE_LIMITS,
  buildTranscriptionRateLimitIdentity,
  buildTranscriptionUsageEvent,
  classifyTranscriptionError,
  isSupportedTranscriptionAudioType,
  parseMultipartFormData,
  sanitizeTranscriptionMeta,
} from '../../api/ai-transcribe.js'

test('transcription API limits are explicit and privacy-safe', () => {
  assert.equal(TRANSCRIPTION_LIMITS.maxDurationMs, 30_000)
  assert.equal(TRANSCRIPTION_LIMITS.minDurationMs, 800)
  assert.equal(TRANSCRIPTION_LIMITS.maxBytes, 4 * 1024 * 1024)
})

test('sanitizeTranscriptionMeta keeps only compact non-PII fields', () => {
  assert.deepEqual(
    sanitizeTranscriptionMeta({ lang: 'kz', storeSlug: 'mars\n<script>', durationMs: 1200 }),
    { lang: 'kz', storeSlug: 'mars <script>', durationMs: 1200 }
  )
  assert.deepEqual(sanitizeTranscriptionMeta({ lang: 'en', storeSlug: '', durationMs: -1 }), {
    lang: 'auto',
    storeSlug: null,
    durationMs: null,
  })
})

test('parseMultipartFormData extracts audio file and text fields', () => {
  const boundary = '----korset-test-boundary'
  const body = Buffer.from(
    [
      `--${boundary}`,
      'Content-Disposition: form-data; name="lang"',
      '',
      'ru',
      `--${boundary}`,
      'Content-Disposition: form-data; name="audio"; filename="voice.webm"',
      'Content-Type: audio/webm',
      '',
      'audio-bytes',
      `--${boundary}--`,
      '',
    ].join('\r\n'),
    'utf8'
  )

  const parsed = parseMultipartFormData(body, `multipart/form-data; boundary=${boundary}`)

  assert.equal(parsed.fields.lang, 'ru')
  assert.equal(parsed.file.filename, 'voice.webm')
  assert.equal(parsed.file.contentType, 'audio/webm')
  assert.equal(parsed.file.buffer.toString('utf8'), 'audio-bytes')
})

test('transcription usage event excludes recognized text and raw audio', () => {
  const originalNow = Date.now
  Date.now = () => 2_000
  try {
    assert.deepEqual(
      buildTranscriptionUsageEvent({
        startedAt: 1_000,
        status: 'ok',
        model: 'gpt-4o-mini-transcribe',
        storeSlug: 'mars',
        durationMs: 1300,
        audioBytes: 5000,
        language: 'ru',
        text: 'do not log me',
        audio: Buffer.from('nope'),
      }),
      {
        event: 'ai_transcription',
        status: 'ok',
        errorType: null,
        model: 'gpt-4o-mini-transcribe',
        durationMs: 1000,
        audioDurationMs: 1300,
        audioBytes: 5000,
        language: 'ru',
        storeSlug: 'mars',
      }
    )
  } finally {
    Date.now = originalNow
  }
})

test('classifyTranscriptionError maps provider and validation failures', () => {
  assert.equal(classifyTranscriptionError(400), 'bad_request')
  assert.equal(classifyTranscriptionError(401), 'auth')
  assert.equal(classifyTranscriptionError(429), 'rate_limited')
  assert.equal(classifyTranscriptionError(503), 'provider_error')
  assert.equal(classifyTranscriptionError(418), 'unknown')
})

test('transcription API accepts only supported audio content types', () => {
  assert.equal(isSupportedTranscriptionAudioType('audio/webm'), true)
  assert.equal(isSupportedTranscriptionAudioType('audio/webm;codecs=opus'), true)
  assert.equal(isSupportedTranscriptionAudioType('audio/mp4'), true)
  assert.equal(isSupportedTranscriptionAudioType('audio/wav'), true)
  assert.equal(isSupportedTranscriptionAudioType('image/png'), false)
  assert.equal(isSupportedTranscriptionAudioType('application/octet-stream'), false)
})

test('transcription rate limit identity separates authenticated users from anonymous IPs', () => {
  const anonymous = buildTranscriptionRateLimitIdentity({
    req: { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }, socket: { remoteAddress: 'local' } },
    auth: { authenticated: false, user: null },
  })

  assert.deepEqual(anonymous, {
    key: 'ip:1.2.3.4',
    limit: TRANSCRIPTION_RATE_LIMITS.anonymous,
    authenticated: false,
  })

  const authenticated = buildTranscriptionRateLimitIdentity({
    req: { headers: {}, socket: { remoteAddress: 'local' } },
    auth: { authenticated: true, user: { id: 'user-123' } },
  })

  assert.deepEqual(authenticated, {
    key: 'user:user-123',
    limit: TRANSCRIPTION_RATE_LIMITS.authenticated,
    authenticated: true,
  })
})
