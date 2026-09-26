import test from 'node:test'
import assert from 'node:assert/strict'

import { applyPreset, migrateAllergenIds, normalizeDietGoals } from '../../src/utils/profile.js'
import { mergeProfiles } from '../../src/utils/profileSync.js'

test('normalizeDietGoals migrates legacy dairy_free to lactose_free', () => {
  assert.deepEqual(normalizeDietGoals(['dairy_free', 'sugar_free', 'dairy_free']), [
    'lactose_free',
    'sugar_free',
  ])
})

test('lactose_free preset does not imply milk allergy', () => {
  const profile = applyPreset('lactose_free')
  assert.deepEqual(profile.dietGoals, ['lactose_free'])
  assert.deepEqual(profile.allergens, [])
})

test('legacy dairy_free preset remains compatible', () => {
  const profile = applyPreset('dairy_free')
  assert.deepEqual(profile.dietGoals, ['lactose_free'])
  assert.deepEqual(profile.allergens, [])
})

test('migrateAllergenIds moves legacy honey to customAllergens and removes from standard', () => {
  const result = migrateAllergenIds(['honey', 'peanuts', 'nuts', 'shellfish'])
  assert.deepEqual(result.allergens, ['peanuts', 'tree_nuts', 'crustaceans'])
  assert.deepEqual(result.addToCustom, ['Мёд'])
})

test('migrateAllergenIds safely handles non-array or empty inputs', () => {
  assert.deepEqual(migrateAllergenIds(null), { allergens: [], addToCustom: [] })
  assert.deepEqual(migrateAllergenIds(undefined), { allergens: [], addToCustom: [] })
  assert.deepEqual(migrateAllergenIds([]), { allergens: [], addToCustom: [] })
})

test('honey removal lifecycle: removing Мёд from custom allergens permanently persists', () => {
  // 1. Initial inbound state with legacy honey
  const initialRawAllergens = ['honey', 'milk']
  const { allergens: migrated, addToCustom } = migrateAllergenIds(initialRawAllergens)
  assert.deepEqual(migrated, ['milk'])
  assert.deepEqual(addToCustom, ['Мёд'])

  // 2. User removes "Мёд"
  const customAllergens = addToCustom.filter((x) => x !== 'Мёд')
  assert.deepEqual(customAllergens, [])

  // 3. User saves and re-migrates / syncs
  const { allergens: secondPass, addToCustom: secondCustom } = migrateAllergenIds(migrated)
  assert.deepEqual(secondPass, ['milk'])
  assert.deepEqual(secondCustom, [])

  // 4. Cloud merge does not resurrect honey
  const merged = mergeProfiles(
    { allergens: migrated, customAllergens },
    { allergens: migrated, customAllergens: [] }
  )
  assert.deepEqual(merged.allergens, ['milk'])
  assert.deepEqual(merged.customAllergens, [])
})
