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
    ['catalog', 'ai', 'compare', 'favorites', 'history', 'profile']
  )
  assert.deepEqual(actions.find((action) => action.key === 'compare')?.navState, { compareMode: true })
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
