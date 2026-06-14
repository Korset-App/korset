import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import test from 'node:test'

import {
  IMAGE_AI_LIMITS,
  buildImageAIUsageEvent,
  buildPackageImagePrompt,
  classifyImageAIError,
  sanitizeImageAIRequest,
} from '../../api/ai.js'

const validDataUrl = `data:image/png;base64,${Buffer.from('package').toString('base64')}`

test('image AI API validates package image payload without retaining raw image data', () => {
  const result = sanitizeImageAIRequest({
    lang: 'kz',
    storeSlug: 'mars\n<script>',
    message: '  Проверь состав  ',
    image: {
      dataUrl: validDataUrl,
      mimeType: 'image/png',
      sizeBytes: 999999,
    },
  })

  assert.equal(result.ok, true)
  assert.equal(result.value.lang, 'kz')
  assert.equal(result.value.storeSlug, 'mars <script>')
  assert.equal(result.value.message, 'Проверь состав')
  assert.equal(result.value.image.mimeType, 'image/png')
  assert.equal(result.value.image.bytes, 7)
  assert.equal(result.value.image.dataUrl, validDataUrl)
})

test('image AI API rejects missing, unsupported, and oversized images', () => {
  assert.equal(sanitizeImageAIRequest({ image: null }).error, 'image_required')
  assert.equal(
    sanitizeImageAIRequest({
      image: { dataUrl: 'data:image/gif;base64,AAAA', mimeType: 'image/gif' },
    }).error,
    'unsupported_image_type'
  )
  assert.equal(
    sanitizeImageAIRequest({
      image: {
        dataUrl: `data:image/png;base64,${'a'.repeat(
          Math.ceil((IMAGE_AI_LIMITS.maxPayloadBytes + 1) / 3) * 4
        )}`,
        mimeType: 'image/png',
      },
    }).error,
    'image_payload_too_large'
  )
})

test('image AI prompt is package-only and excludes generic image chat', () => {
  const prompt = buildPackageImagePrompt({ lang: 'ru', storeSlug: 'mars', message: 'Можно мне?' })
  assert.match(prompt, /упаковк/)
  assert.match(prompt, /не анализируй людей/i)
  assert.match(prompt, /не используй markdown/i)
  assert.match(prompt, /проверь физическую упаковку/i)
  assert.doesNotMatch(prompt, /generic image chat/i)
})

test('image AI usage event excludes raw image bytes and OCR text', () => {
  const originalNow = Date.now
  Date.now = () => 2_500
  try {
    assert.deepEqual(
      buildImageAIUsageEvent({
        startedAt: 1_000,
        status: 'ok',
        model: 'gpt-4o-mini',
        storeSlug: 'mars',
        imageBytes: 7000,
        imageMime: 'image/png',
        message: 'do not log me',
        imageData: validDataUrl,
        extractedText: 'do not log me either',
      }),
      {
        event: 'ai_image_analysis',
        status: 'ok',
        errorType: null,
        model: 'gpt-4o-mini',
        durationMs: 1500,
        imageBytes: 7000,
        imageMime: 'image/png',
        storeSlug: 'mars',
      }
    )
  } finally {
    Date.now = originalNow
  }
})

test('image AI provider errors are classified compactly', () => {
  assert.equal(classifyImageAIError(400), 'bad_request')
  assert.equal(classifyImageAIError(401), 'auth')
  assert.equal(classifyImageAIError(429), 'rate_limited')
  assert.equal(classifyImageAIError(503), 'provider_error')
  assert.equal(classifyImageAIError(418), 'unknown')
})
