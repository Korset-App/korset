export function normalizeReturnTo(raw, fallback = '/') {
  if (!raw || typeof raw !== 'string') return fallback
  let value = raw.trim()
  try {
    value = decodeURIComponent(value)
  } catch {
    /* malformed URI */
  }
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}

export function getCurrentPath(location, fallback = '/') {
  if (!location) return fallback
  return `${location.pathname || ''}${location.search || ''}${location.hash || ''}` || fallback
}

export function getReturnTo(location, fallback = '/') {
  const stateValue = location?.state?.returnTo
  const queryValue = new URLSearchParams(location?.search || '').get('returnTo')
  return normalizeReturnTo(stateValue || queryValue, fallback)
}

export function buildAuthNavigateState(location, extras = {}, fallback = '/') {
  return {
    returnTo: getCurrentPath(location, fallback),
    ...extras,
  }
}
