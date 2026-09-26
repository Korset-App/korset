import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { runWorkflow, validateInput } from '../../scripts/jev-workflow.mjs'

const input = { state: 'Choose a review route.', questions: { route: { type: 'choice', instructions: 'Which route?', criteria: { fast: 'Faster', safe: 'Safer' } } } }

test('validates bounded choice questions without changing input', () => {
  assert.deepEqual(validateInput(input), { model: 'jev-latest', ...input })
  for (const bad of [
    { ...input, extra: true },
    { ...input, state: 'x'.repeat(16001) },
    { ...input, questions: {} },
    { ...input, questions: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`q${i}`, input.questions.route])) },
    { ...input, questions: { route: { ...input.questions.route, criteria: { fast: 'Faster' } } } },
  ]) assert.throws(() => validateInput(bad))
})

test('dry run returns a bounded payload and never fetches or reads a key', async () => {
  const result = await runWorkflow(input, { fetchImpl: () => { throw Error('network') }, execute: false })
  assert.deepEqual(result, { mode: 'dry-run', payload: { model: 'jev-latest', ...input } })
})

test('execution sends one fixed request and marks uncertain answers for review', async () => {
  const calls = []
  const result = await runWorkflow(input, {
    execute: true,
    apiKey: 'synthetic-secret',
    fetchImpl: async (...args) => {
      calls.push(args)
      return { ok: true, json: async () => ({ answers: { route: { type: 'choice', choice: 'safe', confidence: 0.72, probabilities: { fast: 0.28, safe: 0.72 } } }, usage: { total_tokens: 123 }, private_note: 'omit' }) }
    },
  })
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], 'https://api.typesafe.ai/v1/systemone')
  assert.equal(calls[0][1].headers.Authorization, 'Bearer synthetic-secret')
  assert.equal(calls[0][1].signal.aborted, false)
  assert.deepEqual(JSON.parse(calls[0][1].body), { model: 'jev-latest', ...input })
  assert.deepEqual(result, { mode: 'execute', answers: { route: { choice: 'safe', confidence: 0.72, needs_review: true } }, usage: { total_tokens: 123 } })
  assert.doesNotMatch(JSON.stringify(result), /synthetic-secret|private_note|probabilities/)
})

test('rejects malformed responses and hides provider errors', async () => {
  await assert.rejects(runWorkflow(input, { execute: true, apiKey: 'secret', fetchImpl: async () => ({ ok: true, json: async () => ({ answers: { route: { type: 'choice', choice: ['safe'], confidence: 1 } } }) }) }), /Invalid Jev response/)
  await assert.rejects(runWorkflow(input, { execute: true, apiKey: 'secret', fetchImpl: async () => ({ ok: false, status: 400, text: async () => 'secret payload' }) }), /Jev request failed \(HTTP 400\)/)
  await assert.rejects(runWorkflow(input, { execute: true, apiKey: 'secret', fetchImpl: async () => ({ ok: true, json: async () => ({ answers: { route: { type: 'choice', choice: 'other', confidence: 1 } } }) }) }), /Invalid Jev response/)
})

test('CLI defaults to dry run and rejects unknown flags', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'jev-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const file = join(dir, 'input.json')
  writeFileSync(file, JSON.stringify(input))
  const script = resolve('scripts/jev-workflow.mjs')
  const dry = spawnSync(process.execPath, [script, '--input', file], { encoding: 'utf8', env: { ...process.env, TYPESAFE_API_KEY: 'synthetic-secret' } })
  assert.equal(dry.status, 0, dry.stderr)
  assert.equal(JSON.parse(dry.stdout).mode, 'dry-run')
  assert.doesNotMatch(dry.stdout + dry.stderr, /synthetic-secret/)
  const bad = spawnSync(process.execPath, [script, '--input', file, '--wat'], { encoding: 'utf8' })
  assert.notEqual(bad.status, 0)
})
