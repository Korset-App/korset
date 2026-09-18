import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isCacheStale,
  formatCacheAge,
  getOfflineBannerModel,
  CACHE_STALE_MS,
} from '../../src/domain/offline/offlineStatus.js'

test('isCacheStale returns false when cacheAge is empty or null', () => {
  assert.equal(isCacheStale(null), false)
  assert.equal(isCacheStale(undefined), false)
  assert.equal(isCacheStale(0), false)
})

test('isCacheStale detects fresh vs stale timestamps', () => {
  const now = 1000000000000
  const fresh = now - (2 * 24 * 60 * 60 * 1000) // 2 days ago
  const stale = now - (CACHE_STALE_MS + 1000) // 7 days + 1 sec ago

  assert.equal(isCacheStale(fresh, now), false)
  assert.equal(isCacheStale(stale, now), true)
})

test('formatCacheAge formats minutes, hours, days without t function', () => {
  const now = 1000000000000
  assert.equal(formatCacheAge(null, null, now), null)
  assert.equal(formatCacheAge(now - 30000, null, now), 'только что')
  assert.equal(formatCacheAge(now - 5 * 60000, null, now), '5 мин назад')
  assert.equal(formatCacheAge(now - 3 * 3600000, null, now), '3ч назад')
  assert.equal(formatCacheAge(now - 4 * 86400000, null, now), '4д назад')
})

test('formatCacheAge formats with translation function t', () => {
  const mockT = (key, params) => {
    if (key === 'scan.offlineJustNow') return 'жаңа ғана'
    if (key === 'scan.offlineMinutesAgo') return `${params.count} мин бұрын`
    if (key === 'scan.offlineHoursAgo') return `${params.count} сағ бұрын`
    if (key === 'scan.offlineDaysAgo') return `${params.count} күн бұрын`
    return key
  }

  const now = 1000000000000
  assert.equal(formatCacheAge(now - 20000, mockT, now), 'жаңа ғана')
  assert.equal(formatCacheAge(now - 12 * 60000, mockT, now), '12 мин бұрын')
  assert.equal(formatCacheAge(now - 2 * 3600000, mockT, now), '2 сағ бұрын')
  assert.equal(formatCacheAge(now - 5 * 86400000, mockT, now), '5 күн бұрын')
})

test('getOfflineBannerModel returns null when online and not just restored', () => {
  const model = getOfflineBannerModel({
    isOnline: true,
    justRestored: false,
    cacheAge: Date.now() - 10000,
    cacheStale: false,
    t: (k) => k,
  })
  assert.deepEqual(model, { type: null, message: null })
})

test('getOfflineBannerModel returns restored state when just restored even if isOnline is true', () => {
  const model = getOfflineBannerModel({
    isOnline: true,
    justRestored: true,
    cacheAge: null,
    t: (k) => (k === 'scan.offlineRestored' ? 'Подключение восстановлено' : k),
  })
  assert.equal(model.type, 'restored')
  assert.equal(model.message, 'Подключение восстановлено')
})

test('getOfflineBannerModel handles offline with no cache', () => {
  const model = getOfflineBannerModel({
    isOnline: false,
    cacheAge: null,
    t: (k) => (k === 'scan.offlineBannerNoCache' ? 'Нет подключения к интернету' : k),
  })
  assert.equal(model.type, 'offline')
  assert.equal(model.message, 'Нет подключения к интернету')
})

test('getOfflineBannerModel handles offline with fresh cache', () => {
  const now = 1000000000000
  const model = getOfflineBannerModel({
    isOnline: false,
    cacheAge: now - 15 * 60000,
    cacheStale: false,
    now,
    t: (k, params) => {
      if (k === 'scan.offlineBanner') return 'Офлайн-режим. Данные из кэша'
      if (k === 'scan.offlineMinutesAgo') return `${params.count} мин назад`
      return k
    },
  })
  assert.equal(model.type, 'offline')
  assert.ok(model.message.includes('Офлайн-режим. Данные из кэша'))
  assert.ok(model.message.includes('15 мин назад'))
})

test('getOfflineBannerModel handles offline with stale cache', () => {
  const now = 1000000000000
  const model = getOfflineBannerModel({
    isOnline: false,
    cacheAge: now - 8 * 86400000,
    cacheStale: true,
    now,
    t: (k, params) => {
      if (k === 'scan.offlineBannerStale') return 'Кэш устарел. Данные от'
      if (k === 'scan.offlineDaysAgo') return `${params.count} д назад`
      return k
    },
  })
  assert.equal(model.type, 'offline')
  assert.ok(model.message.includes('Кэш устарел. Данные от'))
  assert.ok(model.message.includes('8 д назад'))
})
