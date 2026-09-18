export const CACHE_STALE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Checks if cache timestamp is considered stale (> 7 days).
 * @param {number|null} cacheAge - timestamp in ms
 * @param {number} [now] - current timestamp in ms
 * @returns {boolean}
 */
export function isCacheStale(cacheAge, now = Date.now()) {
  if (!cacheAge || typeof cacheAge !== 'number') return false
  return now - cacheAge > CACHE_STALE_MS
}

/**
 * Formats cache age relative string with i18n support.
 * @param {number|null} cacheAge - timestamp in ms
 * @param {Function} [t] - optional translation function (t(key, params))
 * @param {number} [now] - current timestamp in ms
 * @returns {string|null}
 */
export function formatCacheAge(cacheAge, t = null, now = Date.now()) {
  if (!cacheAge || typeof cacheAge !== 'number') return null
  const diffMs = Math.max(0, now - cacheAge)
  const minutes = Math.floor(diffMs / 60000)

  if (typeof t === 'function') {
    if (minutes < 1) return t('scan.offlineJustNow')
    if (minutes < 60) return t('scan.offlineMinutesAgo', { count: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t('scan.offlineHoursAgo', { count: hours })
    const days = Math.floor(hours / 24)
    return t('scan.offlineDaysAgo', { count: days })
  }

  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}ч назад`
  const days = Math.floor(hours / 24)
  return `${days}д назад`
}

/**
 * Resolves the message and type for the offline banner.
 * @param {Object} params
 * @param {boolean} params.isOnline
 * @param {boolean} [params.justRestored]
 * @param {number|null} [params.cacheAge]
 * @param {boolean} [params.cacheStale]
 * @param {Function} params.t
 * @param {number} [params.now]
 * @returns {{ type: 'restored'|'offline'|null, message: string|null }}
 */
export function getOfflineBannerModel({
  isOnline,
  justRestored = false,
  cacheAge = null,
  cacheStale = false,
  t,
  now = Date.now(),
}) {
  if (isOnline && !justRestored) {
    return { type: null, message: null }
  }

  if (justRestored) {
    return {
      type: 'restored',
      message: typeof t === 'function' ? t('scan.offlineRestored') : 'Подключение восстановлено',
    }
  }

  if (!cacheAge) {
    return {
      type: 'offline',
      message:
        typeof t === 'function' ? t('scan.offlineBannerNoCache') : 'Нет подключения к интернету',
    }
  }

  const ageText = formatCacheAge(cacheAge, t, now)
  if (cacheStale) {
    const fallback = typeof t === 'function' ? t('scan.longAgo') : 'давно'
    const prefix = typeof t === 'function' ? t('scan.offlineBannerStale') : 'Кэш устарел. Данные от'
    return {
      type: 'offline',
      message: `${prefix} ${ageText || fallback}.`,
    }
  }

  const baseText =
    typeof t === 'function' ? t('scan.offlineBanner') : 'Офлайн-режим. Данные из кэша'
  return {
    type: 'offline',
    message: `${baseText}${ageText ? ` (${ageText})` : ''}.`,
  }
}
