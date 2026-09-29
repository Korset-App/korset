import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_PROTOTYPE_BANNER_IMAGE,
  HOME_BANNERS,
  getHomeBanners,
} from '../../src/domain/home/homeScreenModel.js'

test('default prototype banner image exists and matches public asset name', () => {
  assert.equal(
    DEFAULT_PROTOTYPE_BANNER_IMAGE,
    '/banners/banner-scan.webp'
  )
})

test('HOME_BANNERS defines exactly 4 initial banners with proper tones and actions', () => {
  assert.equal(HOME_BANNERS.length, 4)

  const [scanBanner, fitBanner, aiBanner, storeBanner] = HOME_BANNERS

  // Scanner Banner
  assert.equal(scanBanner.id, 'scan')
  assert.equal(scanBanner.tone, 'purple')
  assert.equal(scanBanner.actionType, 'scan')
  assert.equal(scanBanner.ctaIcon, 'scan')
  assert.equal(scanBanner.kickerKey, 'home.banners.scan.kicker')
  assert.equal(scanBanner.headlineKey, 'home.banners.scan.headline')
  assert.equal(scanBanner.descriptionKey, 'home.banners.scan.description')
  assert.equal(scanBanner.ctaKey, 'home.banners.scan.cta')

  // Fit-Check Banner
  assert.equal(fitBanner.id, 'fitCheck')
  assert.equal(fitBanner.tone, 'teal')
  assert.equal(fitBanner.actionType, 'fitCheck')
  assert.equal(fitBanner.ctaIcon, 'fit')
  assert.equal(fitBanner.kickerKey, 'home.banners.fitCheck.kicker')
  assert.equal(fitBanner.headlineKey, 'home.banners.fitCheck.headline')
  assert.equal(fitBanner.descriptionKey, 'home.banners.fitCheck.description')
  assert.equal(fitBanner.ctaKey, 'home.banners.fitCheck.cta')
  assert.equal(fitBanner.ctaConfiguredKey, 'home.banners.fitCheck.ctaConfigured')

  // AI Banner
  assert.equal(aiBanner.id, 'ai')
  assert.equal(aiBanner.tone, 'violet')
  assert.equal(aiBanner.actionType, 'ai')
  assert.equal(aiBanner.ctaIcon, 'ai')
  assert.equal(aiBanner.kickerKey, 'home.banners.ai.kicker')
  assert.equal(aiBanner.headlineKey, 'home.banners.ai.headline')
  assert.equal(aiBanner.descriptionKey, 'home.banners.ai.description')
  assert.equal(aiBanner.ctaKey, 'home.banners.ai.cta')

  // Store Catalog Banner
  assert.equal(storeBanner.id, 'store')
  assert.equal(storeBanner.tone, 'blue')
  assert.equal(storeBanner.actionType, 'catalog')
  assert.equal(storeBanner.ctaIcon, 'store')
  assert.equal(storeBanner.kickerKey, 'home.banners.store.kicker')
  assert.equal(storeBanner.headlineKey, 'home.banners.store.headline')
  assert.equal(storeBanner.descriptionKey, 'home.banners.store.description')
  assert.equal(storeBanner.ctaKey, 'home.banners.store.cta')
})

test('getHomeBanners dynamically resolves fit-check CTA key based on configuration state', () => {
  const unconfigured = getHomeBanners({ isFitConfigured: false })
  const fitUnconfigured = unconfigured.find((b) => b.id === 'fitCheck')
  assert.equal(fitUnconfigured.ctaKey, 'home.banners.fitCheck.cta')

  const configured = getHomeBanners({ isFitConfigured: true })
  const fitConfigured = configured.find((b) => b.id === 'fitCheck')
  assert.equal(fitConfigured.ctaKey, 'home.banners.fitCheck.ctaConfigured')

  // Other banners remain unaffected
  assert.equal(
    configured.find((b) => b.id === 'scan').ctaKey,
    'home.banners.scan.cta'
  )
  assert.equal(
    configured.find((b) => b.id === 'ai').ctaKey,
    'home.banners.ai.cta'
  )
})
