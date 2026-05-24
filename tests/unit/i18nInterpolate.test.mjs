import test from 'node:test'
import assert from 'node:assert/strict'

import { interpolate } from '../../src/i18n/interpolate.js'

test('interpolate supports double-brace translation variables', () => {
  assert.equal(interpolate('{{count}} магазина', { count: 3 }), '3 магазина')
})
