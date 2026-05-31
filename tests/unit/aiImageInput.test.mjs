import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import test from 'node:test'

import {
  AI_IMAGE_INPUT_LIMITS,
  buildImageOnlyPrompt,
  getImagePayloadBytes,
  isSupportedAIImageMimeType,
  validateAIImageFile,
  validateAIImagePayload,
} from '../../src/domain/ai/imageInput.js'

test('AI image input limits match the approved Stage 13 contract', () => {
  assert.deepEqual(AI_IMAGE_INPUT_LIMITS.acceptedMimeTypes, [
    'image/jpeg',
    'image/png',
    'image/webp',
  ])
  assert.equal(AI_IMAGE_INPUT_LIMITS.maxSourceBytes, 8 * 1024 * 1024)
  assert.equal(AI_IMAGE_INPUT_LIMITS.maxPayloadBytes, 2 * 1024 * 1024)
  assert.equal(AI_IMAGE_INPUT_LIMITS.targetPayloadBytes, Math.round(1.5 * 1024 * 1024))
  assert.equal(AI_IMAGE_INPUT_LIMITS.maxDimensionPx, 1600)
  assert.equal(AI_IMAGE_INPUT_LIMITS.compressionQuality, 0.8)
  assert.equal(AI_IMAGE_INPUT_LIMITS.maxImagesPerMessage, 1)
})

test('AI image file validation accepts only one supported grocery package image', () => {
  assert.equal(isSupportedAIImageMimeType('image/jpeg'), true)
  assert.equal(isSupportedAIImageMimeType('image/png'), true)
  assert.equal(isSupportedAIImageMimeType('image/webp'), true)
  assert.equal(isSupportedAIImageMimeType('image/gif'), false)
  assert.deepEqual(validateAIImageFile({ type: 'image/png', size: 1200 }), {
    ok: true,
    error: null,
  })
  assert.equal(validateAIImageFile({ type: 'image/gif', size: 1200 }).error, 'unsupported_image_type')
  assert.equal(validateAIImageFile({ type: 'image/png', size: 0 }).error, 'image_empty')
  assert.equal(
    validateAIImageFile({ type: 'image/png', size: AI_IMAGE_INPUT_LIMITS.maxSourceBytes + 1 })
      .error,
    'image_source_too_large'
  )
})

test('AI image payload validation calculates base64 bytes and rejects oversized payloads', () => {
  const dataUrl = `data:image/png;base64,${Buffer.from('package').toString('base64')}`
  assert.equal(getImagePayloadBytes(dataUrl), 7)
  assert.deepEqual(validateAIImagePayload({ dataUrl, mimeType: 'image/png' }), {
    ok: true,
    error: null,
    bytes: 7,
  })

  const tooLargeDataUrl = `data:image/png;base64,${'a'.repeat(
    Math.ceil((AI_IMAGE_INPUT_LIMITS.maxPayloadBytes + 1) / 3) * 4
  )}`
  assert.equal(
    validateAIImagePayload({ dataUrl: tooLargeDataUrl, mimeType: 'image/png' }).error,
    'image_payload_too_large'
  )
  assert.equal(
    validateAIImagePayload({ dataUrl: 'data:image/gif;base64,AAAA', mimeType: 'image/gif' }).error,
    'unsupported_image_type'
  )
})

test('image-only prompt is localized and package scoped', () => {
  assert.equal(buildImageOnlyPrompt('ru'), 'Проверь упаковку и состав этого товара.')
  assert.equal(buildImageOnlyPrompt('kz'), 'Осы тауардың қаптамасы мен құрамын тексеріңіз.')
})
