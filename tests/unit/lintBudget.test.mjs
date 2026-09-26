import test from 'node:test'
import assert from 'node:assert/strict'
import { assessLint } from '../../scripts/check-lint-budget.mjs'

const root = process.cwd()
const result = (ruleId, severity = 1) => ({
  filePath: `${root}/src/example.js`,
  messages: [{ ruleId, severity }],
})

test('accepts existing warning count for its file and rule', () => {
  assert.deepEqual(assessLint([result('no-unused-vars')], {
    'src/example.js': { 'no-unused-vars': 1 },
  }, root), [])
})

test('rejects added warnings for an existing file and rule', () => {
  const current = result('no-unused-vars')
  current.messages.push({ ruleId: 'no-unused-vars', severity: 1 })
  assert.match(assessLint([current], {
    'src/example.js': { 'no-unused-vars': 1 },
  }, root).join('\n'), /no-unused-vars.*2 > 1/)
})

test('rejects a warning from a new rule', () => {
  assert.match(assessLint([result('no-undef')], {
    'src/example.js': { 'no-unused-vars': 1 },
  }, root).join('\n'), /no-undef.*1 > 0/)
})

test('rejects errors regardless of the warning baseline', () => {
  assert.match(assessLint([result('no-undef', 2)], {}, root).join('\n'), /error/)
})
