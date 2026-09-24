import test from 'node:test'
import assert from 'node:assert/strict'

import { detectBrowserContext } from '../../src/utils/browserDetection.js'

test('detectBrowserContext detects iOS Safari', () => {
  const nav = {
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  }
  const res = detectBrowserContext(nav)
  assert.equal(res.platform, 'ios')
  assert.equal(res.browser, 'safari')
  assert.equal(res.isIos, true)
  assert.equal(res.isAndroid, false)
  assert.equal(res.badgeLabel, 'iOS · Safari')
})

test('detectBrowserContext detects iOS Chrome', () => {
  const nav = {
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1',
  }
  const res = detectBrowserContext(nav)
  assert.equal(res.platform, 'ios')
  assert.equal(res.browser, 'chrome')
  assert.equal(res.badgeLabel, 'iOS · Chrome')
})

test('detectBrowserContext detects Android Chrome', () => {
  const nav = {
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.80 Mobile Safari/537.36',
  }
  const res = detectBrowserContext(nav)
  assert.equal(res.platform, 'android')
  assert.equal(res.browser, 'chrome')
  assert.equal(res.isAndroid, true)
  assert.equal(res.badgeLabel, 'Android · Chrome')
})

test('detectBrowserContext detects Android Samsung Internet', () => {
  const nav = {
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36',
  }
  const res = detectBrowserContext(nav)
  assert.equal(res.platform, 'android')
  assert.equal(res.browser, 'samsung')
  assert.equal(res.badgeLabel, 'Samsung Internet')
})

test('detectBrowserContext detects Yandex Browser on Android', () => {
  const nav = {
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; 2201116PG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 YaBrowser/24.1.4.92 Mobile Safari/537.36',
  }
  const res = detectBrowserContext(nav)
  assert.equal(res.platform, 'android')
  assert.equal(res.browser, 'yandex')
  assert.equal(res.badgeLabel, 'Android · Яндекс')
})

test('detectBrowserContext detects Telegram in-app browser', () => {
  const nav = {
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Telegram/10.9.1',
  }
  const res = detectBrowserContext(nav)
  assert.equal(res.isInApp, true)
  assert.equal(res.inAppName, 'Telegram')
  assert.equal(res.browser, 'in_app')
})

test('detectBrowserContext detects Instagram in-app browser', () => {
  const nav = {
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36 Instagram 325.0.0.35.91 Android',
  }
  const res = detectBrowserContext(nav)
  assert.equal(res.isInApp, true)
  assert.equal(res.inAppName, 'Instagram')
  assert.equal(res.browser, 'in_app')
})

test('detectBrowserContext detects Firefox on Android', () => {
  const nav = {
    userAgent:
      'Mozilla/5.0 (Android 14; Mobile; rv:124.0) Gecko/124.0 Firefox/124.0',
  }
  const res = detectBrowserContext(nav)
  assert.equal(res.platform, 'android')
  assert.equal(res.browser, 'firefox')
  assert.equal(res.badgeLabel, 'Android · Firefox')
})
