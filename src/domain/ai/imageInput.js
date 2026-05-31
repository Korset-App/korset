/* global FileReader, Image */

export const AI_IMAGE_INPUT_LIMITS = {
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxImagesPerMessage: 1,
  maxSourceBytes: 8 * 1024 * 1024,
  targetPayloadBytes: Math.round(1.5 * 1024 * 1024),
  maxPayloadBytes: 2 * 1024 * 1024,
  maxDimensionPx: 1600,
  compressionQuality: 0.8,
}

export function isSupportedAIImageMimeType(type = '') {
  return AI_IMAGE_INPUT_LIMITS.acceptedMimeTypes.includes(String(type).toLowerCase())
}

export function validateAIImageFile(file = {}) {
  const type = String(file.type || '').toLowerCase()
  const size = Number(file.size)
  if (!isSupportedAIImageMimeType(type)) return { ok: false, error: 'unsupported_image_type' }
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: 'image_empty' }
  if (size > AI_IMAGE_INPUT_LIMITS.maxSourceBytes) {
    return { ok: false, error: 'image_source_too_large' }
  }
  return { ok: true, error: null }
}

export function getImagePayloadBytes(dataUrl = '') {
  const [, base64 = ''] = String(dataUrl).split(',')
  if (!base64) return 0
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

export function validateAIImagePayload({ dataUrl = '', mimeType = '' } = {}) {
  const safeMime = String(mimeType || '').toLowerCase()
  if (!isSupportedAIImageMimeType(safeMime)) return { ok: false, error: 'unsupported_image_type' }
  if (!String(dataUrl).startsWith(`data:${safeMime};base64,`)) {
    return { ok: false, error: 'invalid_image_payload' }
  }

  const bytes = getImagePayloadBytes(dataUrl)
  if (bytes <= 0) return { ok: false, error: 'image_empty', bytes }
  if (bytes > AI_IMAGE_INPUT_LIMITS.maxPayloadBytes) {
    return { ok: false, error: 'image_payload_too_large', bytes }
  }
  return { ok: true, error: null, bytes }
}

export function buildImageOnlyPrompt(lang = 'ru') {
  return lang === 'kz'
    ? 'Осы тауардың қаптамасы мен құрамын тексеріңіз.'
    : 'Проверь упаковку и состав этого товара.'
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('image_read_failed'))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image_decode_failed'))
    image.src = dataUrl
  })
}

export async function prepareAIImageFile(file) {
  const validation = validateAIImageFile(file)
  if (!validation.ok) throw new Error(validation.error)

  const originalDataUrl = await readFileAsDataUrl(file)
  const originalPayload = validateAIImagePayload({ dataUrl: originalDataUrl, mimeType: file.type })
  if (originalPayload.ok && originalPayload.bytes <= AI_IMAGE_INPUT_LIMITS.targetPayloadBytes) {
    return {
      dataUrl: originalDataUrl,
      previewUrl: originalDataUrl,
      mimeType: file.type,
      sizeBytes: originalPayload.bytes,
      name: file.name || 'package-image',
    }
  }

  const image = await loadImage(originalDataUrl)
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  const scale = Math.min(1, AI_IMAGE_INPUT_LIMITS.maxDimensionPx / Math.max(width, height))
  const targetWidth = Math.max(1, Math.round(width * scale))
  const targetHeight = Math.max(1, Math.round(height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('image_processing_failed')
  context.drawImage(image, 0, 0, targetWidth, targetHeight)

  const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const dataUrl = canvas.toDataURL(outputMime, AI_IMAGE_INPUT_LIMITS.compressionQuality)
  const payload = validateAIImagePayload({ dataUrl, mimeType: outputMime })
  if (!payload.ok) throw new Error(payload.error)

  return {
    dataUrl,
    previewUrl: dataUrl,
    mimeType: outputMime,
    sizeBytes: payload.bytes,
    name: file.name || 'package-image',
    width: targetWidth,
    height: targetHeight,
  }
}
