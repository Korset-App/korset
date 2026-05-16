import { supabase } from './supabase.js'

export const NAME_MIN = 1
export const NAME_MAX = 20
export const NAME_REGEX = /^[a-zA-Zа-яА-ЯәіңғүұқөһӘІҢҒҮҰҚӨҺ0-9\s]*$/

export function validateName(value, t) {
  const trimmed = value.trim()
  if (!NAME_REGEX.test(value)) {
    return { valid: false, error: t('profileSetup.invalid') }
  }
  if (trimmed.length > NAME_MAX) {
    return { valid: false, error: t('profileSetup.nameTooLong', { max: NAME_MAX }) }
  }
  if (trimmed.length > 0 && trimmed.length < NAME_MIN) {
    return { valid: false, error: t('profileSetup.minName') }
  }
  return { valid: true, error: '' }
}

export function canSaveName(value) {
  const trimmed = value.trim()
  return trimmed.length >= NAME_MIN && trimmed.length <= NAME_MAX
}

export function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

export async function updateAuthUserWithRetry(payload, retries = 1) {
  let lastError = null
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { error } = await supabase.auth.updateUser({ data: payload })
    if (!error) return
    lastError = error
    if (!/lock request|lock is aborted/i.test(error.message || '') || attempt === retries) break
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw lastError || new Error('auth_update_failed')
}
