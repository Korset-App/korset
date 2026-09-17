import test from 'node:test'
import assert from 'node:assert/strict'
import { parseStoreSchedule } from '../../../src/domain/stores/schedule.js'

test('parseStoreSchedule handles empty or missing input', () => {
  assert.deepEqual(parseStoreSchedule(null), { isConfigured: false, raw: '' })
  assert.deepEqual(parseStoreSchedule(''), { isConfigured: false, raw: '' })
  assert.deepEqual(parseStoreSchedule('   '), { isConfigured: false, raw: '' })
})

test('parseStoreSchedule detects 24/7 store', () => {
  const result = parseStoreSchedule('24/7')
  assert.equal(result.isConfigured, true)
  assert.equal(result.isOpen, true)
  assert.equal(result.isAlwaysOpen, true)
})

test('parseStoreSchedule parses normal day hours correctly', () => {
  // Test at 14:00 UTC (which is 19:00 in UTC+5 Kazakhstan -> open)
  const nowDay = new Date('2026-09-18T14:00:00Z')
  const result = parseStoreSchedule('09:00 - 23:00', nowDay)
  assert.equal(result.isConfigured, true)
  assert.equal(result.isOpen, true)
  assert.equal(result.opens, '09:00')
  assert.equal(result.closes, '23:00')

  // Test at 21:00 UTC (which is 02:00 next day in UTC+5 Kazakhstan -> closed)
  const nowNight = new Date('2026-09-18T21:00:00Z')
  const resultNight = parseStoreSchedule('09:00 - 23:00', nowNight)
  assert.equal(resultNight.isConfigured, true)
  assert.equal(resultNight.isOpen, false)
})
