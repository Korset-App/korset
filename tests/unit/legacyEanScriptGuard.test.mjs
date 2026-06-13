import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const {
  assertLegacyEanScriptDryRunOnly,
  isLegacyEanScriptDryRunAllowed,
} = require('../../scripts/legacy-ean-script-guard.cjs')

test('legacy EAN scripts can run in dry-run mode', () => {
  assert.equal(isLegacyEanScriptDryRunAllowed(['--dry-run']), true)
  assert.doesNotThrow(() => assertLegacyEanScriptDryRunOnly({ scriptName: 'npc-enrich.cjs', args: ['--dry-run'] }))
})

test('legacy EAN scripts block live mode by default', () => {
  assert.equal(isLegacyEanScriptDryRunAllowed([]), false)
  assert.throws(
    () => assertLegacyEanScriptDryRunOnly({ scriptName: 'npc-enrich.cjs', args: [] }),
    /blocked from live writes/
  )
})

test('legacy EAN scripts do not allow override flags', () => {
  assert.throws(
    () => assertLegacyEanScriptDryRunOnly({ scriptName: 'npc-enrich.cjs', args: ['--live'] }),
    /blocked from live writes/
  )
  assert.throws(
    () => assertLegacyEanScriptDryRunOnly({ scriptName: 'npc-enrich.cjs', args: ['--force'] }),
    /blocked from live writes/
  )
})
