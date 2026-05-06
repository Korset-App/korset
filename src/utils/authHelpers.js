const errKeys = {
  'Invalid login credentials': 'auth.errInvalidCredentials',
  'Email not confirmed': 'auth.errEmailNotConfirmed',
  'User already registered': 'auth.errAlreadyRegistered',
  signup_disabled: 'auth.errSignupDisabled',
  rate_limit: 'auth.errOtpRateLimit',
  'Rate limit exceeded': 'auth.errOtpRateLimit',
  'Email rate limit exceeded': 'auth.errOtpRateLimit',
}

export function localizeError(msg, t) {
  if (!msg) return { text: '', key: null }
  if (/already.*registered.*provider/i.test(msg))
    return { text: t('auth.errEmailDuplicate'), key: 'auth.errEmailDuplicate' }
  for (const [key, i18nKey] of Object.entries(errKeys)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return { text: t(i18nKey), key: i18nKey }
  }
  return { text: t('auth.errorGeneral'), key: 'auth.errorGeneral' }
}

export function validatePassword(pw) {
  return pw.length >= 8 && /[0-9]/.test(pw) && /[A-Za-z]/.test(pw)
}

export function isValidEmail(v) {
  return /^.+@.+\..+$/.test(v.trim())
}
