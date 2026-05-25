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

test('home quick actions keep only catalog and AI on the main canvas', () => {
  const actions = buildHomeQuickActions({
    routes: {
      catalog: '/s/mars/catalog',
      ai: '/s/mars/ai',
      history: '/s/mars/history',
    },
  })

  assert.deepEqual(
    actions.map((action) => action.key),
    ['catalog', 'ai']
  )
  assert.equal(actions.some((action) => action.path === '/s/mars/history'), false)
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

test('fit-check setup state treats halal allergens and sugar as completion signals', () => {
  const state = buildFitCheckSetupState({
    halal: true,
    allergens: ['peanut'],
    dietGoals: ['sugar_free'],
  })

  assert.equal(state.completedCount, 3)
  assert.equal(state.isComplete, true)
  assert.deepEqual(state.signals, {
    halal: true,
    allergens: true,
    sugar: true,
  })
})
