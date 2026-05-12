const AUTH_ERROR_PATTERNS = [
  {
    key: 'auth.errEmailDuplicate',
    patterns: [/already registered.*provider/i, /registered via provider/i],
  },
  {
    key: 'auth.errInvalidCredentials',
    patterns: [/invalid login credentials/i, /invalid credentials/i],
  },
  {
    key: 'auth.errEmailNotConfirmed',
    patterns: [/email not confirmed/i, /not confirmed/i],
  },
  {
    key: 'auth.errAlreadyRegistered',
    patterns: [/user already registered/i, /already registered/i, /already exists/i],
  },
  {
    key: 'auth.errSignupDisabled',
    patterns: [/signup_disabled/i, /signup disabled/i, /signups not allowed/i],
  },
  {
    key: 'auth.errOtpRateLimit',
    patterns: [/rate_limit/i, /rate limit/i, /too many requests/i, /email rate limit/i],
  },
  {
    key: 'auth.errPwSameAsOld',
    patterns: [/same password/i, /different from the old password/i, /should be different/i],
  },
]

export function localizeError(message, t) {
  if (!message) return { text: '', key: null }

  const raw = String(message)
  const match = AUTH_ERROR_PATTERNS.find(({ patterns }) =>
    patterns.some((pattern) => pattern.test(raw))
  )
  const key = match?.key || 'auth.errorGeneral'

  return {
    text: t(key),
    key,
  }
}

export function validatePassword(password) {
  const value = String(password || '')
  return value.length >= 8 && /\d/.test(value) && /[a-zа-яё]/i.test(value)
}

export function isValidEmail(email) {
  const value = String(email || '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
