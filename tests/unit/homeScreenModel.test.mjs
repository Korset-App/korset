import assert from 'node:assert/strict'
import test from 'node:test'

import {
  HOME_SCREEN_SECTIONS,
  buildFitCheckSetupState,
  buildHomeQuickActions,
  buildHomeStoreFacts,
} from '../../src/domain/home/homeScreenModel.js'

test('home screen pilot order keeps scan before profile and secondary actions', () => {
  assert.deepEqual(HOME_SCREEN_SECTIONS, [
    'header',
    'banners',
    'scan',
    'fitCheck',
    'quickActions',
    'install',
    'store',
  ])
})

test('home quick actions expose store-scoped secondary actions', () => {
  const actions = buildHomeQuickActions({
    routes: {
      catalog: '/s/mars/catalog',
      ai: '/s/mars/ai',
      scan: '/s/mars/scan',
      profile: '/s/mars/profile',
      history: '/s/mars/history',
    },
  })

  assert.deepEqual(
    actions.map((action) => action.key),
    ['catalog', 'scan', 'favorites', 'ai', 'history', 'profile']
  )
  assert.equal(actions.find((action) => action.key === 'scan')?.path, '/s/mars/scan')
  assert.equal(
    actions.find((action) => action.key === 'favorites')?.path,
    '/s/mars/profile?tab=favorites'
  )
})

test('home store facts expose only shopper-useful public facts', () => {
  const facts = buildHomeStoreFacts({
    city: 'Усть-Каменогорск',
    address: 'ул. Абая',
    opening_hours: 'ежедневно 09:00-23:00',
    product_count: 10228,
    status: 'official',
  })

  assert.deepEqual(facts, [
    { key: 'address', icon: 'location_on', text: 'Усть-Каменогорск · ул. Абая' },
    { key: 'opening_hours', icon: 'schedule', text: 'ежедневно 09:00-23:00' },
  ])
})

test('fit-check setup state treats preference and allergen steps as completion signals', () => {
  const state = buildFitCheckSetupState({
    halal: true,
    allergens: ['peanut'],
    dietGoals: ['sugar_free'],
  })

  assert.equal(state.completedCount, 2)
  assert.equal(state.isComplete, true)
  assert.deepEqual(state.signals, {
    preferences: true,
    allergens: true,
  })
})

test('fit-check setup state can be completed with explicit no-preference choices', () => {
  const state = buildFitCheckSetupState({
    noDietPreferences: true,
    noAllergies: true,
  })

  assert.equal(state.completedCount, 2)
  assert.equal(state.isComplete, true)
  assert.deepEqual(state.signals, {
    preferences: true,
    allergens: true,
  })
})

test('getProductDisplayBadges shows one primary attribute and counts the rest', async () => {
  const { getProductDisplayBadges, getProductBadgeSummary } =
    await import('../../src/domain/home/homeScreenModel.js')

  const product = {
    halal_status: 'halal',
    diet_tags: ['gluten_free', 'vegan'],
    is_on_sale: true,
    discount_percent: 25,
  }

  const badges = getProductDisplayBadges(product)
  assert.equal(badges.length, 1)
  assert.equal(badges[0].type, 'halal')
  assert.equal(getProductBadgeSummary(product).extraCount, 2)
  assert.equal(getProductBadgeSummary(product).discountBadge.label, '-25%')

  const dietProduct = {
    halal_status: 'halal',
    diet_tags: ['gluten_free'],
  }
  const dietBadges = getProductDisplayBadges(dietProduct)
  assert.equal(dietBadges.length, 1)
  assert.equal(dietBadges[0].type, 'halal')
  assert.equal(getProductBadgeSummary(dietProduct).extraCount, 1)
})

test('getShowcaseProducts prioritizes popular KZ brands and enforces category diversity', async () => {
  const { getShowcaseProducts } = await import('../../src/domain/home/homeScreenModel.js')

  const sampleProducts = [
    {
      id: '1',
      name: 'Лаваш тонкий 1',
      category_id: 'bakery',
      price: 200,
      image_url: 'https://img.com/1',
    },
    {
      id: '2',
      name: 'Лаваш тонкий 2',
      category_id: 'bakery',
      price: 220,
      image_url: 'https://img.com/2',
    },
    {
      id: '3',
      name: 'Лаваш армянский',
      category_id: 'bakery',
      price: 250,
      image_url: 'https://img.com/3',
    },
    {
      id: '4',
      name: 'Вода Tassay без газа 1.5л',
      category_id: 'drinks',
      brand: 'Tassay',
      price: 280,
      halal_status: 'halal',
      image_url: 'https://img.com/4',
    },
    {
      id: '5',
      name: 'Шоколад Казахстанский Рахат',
      category_id: 'sweets',
      brand: 'Рахат',
      price: 650,
      halal_status: 'halal',
      image_url: 'https://img.com/5',
    },
    {
      id: '6',
      name: 'Молоко FoodMaster 3.2%',
      category_id: 'dairy',
      brand: 'FoodMaster',
      price: 490,
      halal_status: 'halal',
      image_url: 'https://img.com/6',
    },
  ]

  const showcase = getShowcaseProducts(sampleProducts, 4)
  assert.equal(showcase.length, 4)

  // Top products should include recognized Kazakhstani brands
  const brands = showcase.map((p) => p.brand).filter(Boolean)
  assert.ok(brands.includes('Tassay'))
  assert.ok(brands.includes('Рахат'))
  assert.ok(brands.includes('FoodMaster'))

  // Should NOT have multiple identical lavash items dominating the list
  const bakeryItems = showcase.filter((p) => p.category_id === 'bakery')
  assert.ok(bakeryItems.length <= 1)
})

test('every home banner has translated content, an image and a supported action', async () => {
  const { HOME_BANNERS } = await import('../../src/domain/home/homeScreenModel.js')
  const { readFile } = await import('node:fs/promises')
  const ru = JSON.parse(
    await readFile(new URL('../../src/locales/ru/home.json', import.meta.url), 'utf8')
  )
  const kz = JSON.parse(
    await readFile(new URL('../../src/locales/kz/home.json', import.meta.url), 'utf8')
  )
  for (const banner of HOME_BANNERS) {
    for (const key of ['kickerKey', 'headlineKey', 'descriptionKey', 'ctaKey']) {
      assert.ok(ru[banner[key]], `Missing RU text for ${banner.id}: ${key}`)
      assert.ok(kz[banner[key]], `Missing KZ text for ${banner.id}: ${key}`)
    }
    assert.ok(['scan', 'compare', 'catalog', 'dinner', 'install', 'fitGuide'].includes(banner.actionType))
    assert.match(banner.image, /^\/banners\/.+\.webp$/)
  }
})
