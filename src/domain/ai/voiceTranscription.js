export const AI_VOICE_LIMITS = {
  minDurationMs: 800,
  maxDurationMs: 30_000,
  maxBytes: 4 * 1024 * 1024,
}

export const AI_VOICE_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
]

export function validateVoiceRecording({ durationMs, size } = {}) {
  const safeDuration = Number(durationMs)
  const safeSize = Number(size)
  if (!Number.isFinite(safeDuration) || safeDuration < AI_VOICE_LIMITS.minDurationMs) {
    return { ok: false, error: 'audio_too_short' }
  }
  if (safeDuration > AI_VOICE_LIMITS.maxDurationMs) {
    return { ok: false, error: 'audio_too_long' }
  }
  if (!Number.isFinite(safeSize) || safeSize <= 0) {
    return { ok: false, error: 'audio_empty' }
  }
  if (safeSize > AI_VOICE_LIMITS.maxBytes) {
    return { ok: false, error: 'audio_too_large' }
  }
  return { ok: true, error: null }
}

export function getSupportedVoiceMimeType(isTypeSupported) {
  if (typeof isTypeSupported !== 'function') return ''
  return AI_VOICE_MIME_CANDIDATES.find((candidate) => isTypeSupported(candidate)) || ''
}
