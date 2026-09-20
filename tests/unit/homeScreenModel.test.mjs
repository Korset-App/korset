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
    'stories',
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
  assert.equal(actions.find((action) => action.key === 'favorites')?.path, '/s/mars/profile?tab=favorites')
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

test('getProductDisplayBadges extracts discount, halal and diet tags correctly', async () => {
  const { getProductDisplayBadges } = await import('../../src/domain/home/homeScreenModel.js')

  const product = {
    halal_status: 'halal',
    diet_tags: ['gluten_free', 'vegan'],
    is_on_sale: true,
    discount_percent: 25,
  }

  // Max 2 badges per card to avoid visual clutter
  const badges = getProductDisplayBadges(product)
  assert.equal(badges.length, 2)
  assert.equal(badges[0].type, 'discount')
  assert.equal(badges[0].label, '-25%')
  assert.equal(badges[1].type, 'halal')
  assert.equal(badges[1].label, 'Халал')

  // Diet badge is shown when discount is absent
  const dietProduct = {
    halal_status: 'halal',
    diet_tags: ['gluten_free'],
  }
  const dietBadges = getProductDisplayBadges(dietProduct)
  assert.equal(dietBadges.length, 2)
  assert.equal(dietBadges[0].type, 'halal')
  assert.equal(dietBadges[1].type, 'diet')
  assert.equal(dietBadges[1].label, 'Без глютена')
})

test('getShowcaseProducts prioritizes popular KZ brands and enforces category diversity', async () => {
  const { getShowcaseProducts } = await import('../../src/domain/home/homeScreenModel.js')

  const sampleProducts = [
    { id: '1', name: 'Лаваш тонкий 1', category_id: 'bakery', price: 200, image_url: 'https://img.com/1' },
    { id: '2', name: 'Лаваш тонкий 2', category_id: 'bakery', price: 220, image_url: 'https://img.com/2' },
    { id: '3', name: 'Лаваш армянский', category_id: 'bakery', price: 250, image_url: 'https://img.com/3' },
    { id: '4', name: 'Вода Tassay без газа 1.5л', category_id: 'drinks', brand: 'Tassay', price: 280, halal_status: 'halal', image_url: 'https://img.com/4' },
    { id: '5', name: 'Шоколад Казахстанский Рахат', category_id: 'sweets', brand: 'Рахат', price: 650, halal_status: 'halal', image_url: 'https://img.com/5' },
    { id: '6', name: 'Молоко FoodMaster 3.2%', category_id: 'dairy', brand: 'FoodMaster', price: 490, halal_status: 'halal', image_url: 'https://img.com/6' },
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

test('clearSeenStories resets seen stories correctly', async () => {
  const { markStorySeen, loadSeenStories, clearSeenStories } = await import(
    '../../src/domain/home/homeScreenModel.js'
  )

  const mockStorage = {}
  globalThis.window = {
    localStorage: {
      getItem: (k) => mockStorage[k] || null,
      setItem: (k, v) => {
        mockStorage[k] = v
      },
      removeItem: (k) => {
        delete mockStorage[k]
      },
    },
  }

  markStorySeen('test-store', 'scan')
  assert.ok(loadSeenStories('test-store').has('scan'))

  clearSeenStories('test-store')
  assert.equal(loadSeenStories('test-store').size, 0)
})

test('recordStorySlideView tracks slide progress and marks fully seen only on completion', async () => {
  const {
    recordStorySlideView,
    loadStoryProgress,
    loadSeenStories,
    sortStoriesBySeen,
    clearSeenStories,
  } = await import('../../src/domain/home/homeScreenModel.js')

  const mockStorage = {}
  globalThis.window = {
    localStorage: {
      getItem: (k) => mockStorage[k] || null,
      setItem: (k, v) => {
        mockStorage[k] = v
      },
      removeItem: (k) => {
        delete mockStorage[k]
      },
    },
  }

  // 1. Viewing slide 0 out of 3 -> progress 1, not fully seen
  const res1 = recordStorySlideView('test-store', 'store', 0, 3)
  assert.equal(res1.isFullySeen, false)
  assert.equal(res1.progressMap.store, 1)
  assert.equal(loadSeenStories('test-store').has('store'), false)

  // 2. Sorting keeps partially seen story in front group
  const mockStories = [{ key: 'store', slides: [0, 1, 2] }, { key: 'scan', slides: [0, 1, 2] }]
  const sorted = sortStoriesBySeen(mockStories, loadSeenStories('test-store'), res1.progressMap)
  assert.equal(sorted[0].key, 'store')

  // 3. Completing slide 2 (last slide) -> marks fully seen
  const res2 = recordStorySlideView('test-store', 'store', 2, 3)
  assert.equal(res2.isFullySeen, true)
  assert.equal(res2.progressMap.store, 3)
  assert.ok(loadSeenStories('test-store').has('store'))

  // 4. clearSeenStories resets both progress and seen set
  clearSeenStories('test-store')
  assert.equal(loadStoryProgress('test-store').store, undefined)
  assert.equal(loadSeenStories('test-store').size, 0)
})

test('recordStorySlideView supports variable slide counts (4 and 5 slides)', async () => {
  const {
    recordStorySlideView,
    loadStoryProgress,
    loadSeenStories,
    clearSeenStories,
  } = await import('../../src/domain/home/homeScreenModel.js')

  const mockStorage = {}
  globalThis.window = {
    localStorage: {
      getItem: (k) => mockStorage[k] || null,
      setItem: (k, v) => {
        mockStorage[k] = v
      },
      removeItem: (k) => {
        delete mockStorage[k]
      },
    },
  }

  // Story with 5 slides: viewing slide 3 out of 5 -> 4 viewed, not fully seen
  const res1 = recordStorySlideView('store-5', 'fit', 3, 5)
  assert.equal(res1.isFullySeen, false)
  assert.equal(res1.progressMap.fit, 4)
  assert.equal(loadSeenStories('store-5').has('fit'), false)

  // Viewing final slide 4 out of 5 -> 5 viewed, marked fully seen
  const res2 = recordStorySlideView('store-5', 'fit', 4, 5)
  assert.equal(res2.isFullySeen, true)
  assert.equal(res2.progressMap.fit, 5)
  assert.ok(loadSeenStories('store-5').has('fit'))

  clearSeenStories('store-5')
})
