import assert from 'node:assert/strict'
import test from 'node:test'
import { HOME_BANNERS, getHomeBanners } from '../../src/domain/home/homeScreenModel.js'

test('home banners cover five distinct shopper journeys without a separate fit-check slide', () => {
  assert.deepEqual(
    HOME_BANNERS.map(({ id }) => id),
    ['scan', 'compare', 'store', 'dinner', 'pwa']
  )
  assert.deepEqual(
    HOME_BANNERS.map(({ actionType }) => actionType),
    ['fitGuide', 'compare', 'catalog', 'dinner', 'install']
  )
  assert.equal(HOME_BANNERS.find(({ id }) => id === 'scan').ctaKey, 'home.banners.scan.learn')
})

test('installation slide disappears after installation, keeping the other journeys intact', () => {
  const browser = getHomeBanners({ isInstalled: false })
  const installed = getHomeBanners({ isInstalled: true })
  assert.equal(browser.length, 5)
  assert.deepEqual(
    installed.map(({ id }) => id),
    ['scan', 'compare', 'store', 'dinner']
  )
  assert.equal(getHomeBanners().length, 5)
})

test('first banner explains product checking before offering camera or preferences', () => {
  const unconfigured = getHomeBanners({ isFitConfigured: false })[0]
  const configured = getHomeBanners({ isFitConfigured: true })[0]
  assert.equal(unconfigured.actionType, 'fitGuide')
  assert.equal(configured.actionType, 'fitGuide')
  assert.equal(unconfigured.secondaryActionType, undefined)
  assert.equal(configured.secondaryActionType, undefined)
})

test('infographic images follow the interface language without changing actions or base metadata', () => {
  const russian = getHomeBanners({ lang: 'ru' })
  const kazakh = getHomeBanners({ lang: 'kz', isFitConfigured: true })
  for (const id of ['scan', 'compare']) {
    const ru = russian.find((banner) => banner.id === id)
    const kz = kazakh.find((banner) => banner.id === id)
    assert.notEqual(ru.image, kz.image)
    assert.match(kz.image, /-kz\.webp$/)
    assert.equal(ru.actionType, kz.actionType)
    assert.equal(HOME_BANNERS.find((banner) => banner.id === id).image, ru.image)
  }
  assert.equal(kazakh[0].actionType, 'fitGuide')
  assert.equal(getHomeBanners({ lang: 'unknown' })[0].image, russian[0].image)
})
