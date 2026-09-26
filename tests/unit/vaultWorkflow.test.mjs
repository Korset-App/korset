import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const queryScript = resolve('scripts/query-vault.mjs')
const saveScript = resolve('scripts/memory-save.mjs')

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'korset-vault-'))
  t.after(() => rmSync(cwd, { recursive: true, force: true }))
  mkdirSync(join(cwd, 'docs/vault/knowledge'), { recursive: true })
  mkdirSync(join(cwd, 'scripts'))
  writeFileSync(join(cwd, 'docs/CONTEXT.md'), '# Context\n')
  for (const name of ['query-vault.mjs', 'embed-vault.mjs', 'memory-save.mjs']) {
    writeFileSync(join(cwd, 'scripts', name), 'console.log("REMOTE_DELEGATED")\n')
  }
  const trap = join(cwd, 'network-trap.mjs')
  writeFileSync(trap, 'globalThis.fetch = () => { console.error("NETWORK_FORBIDDEN"); throw new Error("NETWORK_FORBIDDEN") }\n')
  const env = {
    ...process.env,
    GEMINI_API_KEY: 'synthetic-test-key',
    SUPABASE_URL: 'https://example.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-key',
  }
  const run = (script, args = [], overrides = {}) => spawnSync(process.execPath,
    ['--import', pathToFileURL(trap).href, script, ...args],
    { cwd, env: { ...env, ...overrides }, encoding: 'utf8', timeout: 10000 })
  const doc = (name, metadata, body = 'workflow memory') => writeFileSync(
    join(cwd, 'docs/vault/knowledge', name), `---\n${metadata}\n---\n# Workflow\n${body}\n`)
  return { cwd, run, doc }
}

test('vault query defaults to local search even with provider credentials', (t) => {
  const { run, doc } = fixture(t)
  doc('current.md', 'domain: knowledge\nstatus: active')
  const result = run(queryScript, ['workflow'])
  assert.equal(result.status, 0, result.stderr)
  assert.doesNotMatch(result.stderr, /NETWORK_FORBIDDEN/)
  assert.match(result.stdout, /current\.md/)
  assert.match(result.stdout, /relevance:/)
  assert.doesNotMatch(result.stdout, /sim:|\d%/)
})

test('local query does not load dotenv or initialize the remote client', (t) => {
  const { cwd, run, doc } = fixture(t)
  doc('current.md', 'domain: knowledge')
  writeFileSync(join(cwd, '.env.local'), 'SUPABASE_URL=not-a-url\n')
  const result = run(queryScript, ['workflow', '--local'], { SUPABASE_URL: '', VITE_SUPABASE_URL: '' })
  assert.equal(result.status, 0, result.stderr)
  assert.doesNotMatch(result.stderr, /NETWORK_FORBIDDEN/)
})

test('local metadata filters apply before ranking and count', (t) => {
  const { run, doc } = fixture(t)
  doc('stale.md', 'domain: knowledge\nsubdomain: process\nstatus: superseded\nupdated: 2026-09-01', 'workflow '.repeat(20))
  doc('active.md', 'domain: operations\nsubdomain: process\nstatus: active\nupdated: 2026-09-25')
  doc('wrong-status.md', 'domain: operations\nsubdomain: process\nstatus: superseded\nupdated: 2026-09-25', 'workflow '.repeat(20))
  doc('old-date.md', 'domain: operations\nsubdomain: process\nstatus: active\nupdated: 2026-09-01', 'workflow '.repeat(20))
  doc('wrong-subdomain.md', 'domain: operations\nsubdomain: other\nstatus: active\nupdated: 2026-09-25', 'workflow '.repeat(20))
  const result = run(queryScript, ['workflow', '--local', '--domain', 'operations', '--subdomain', 'process', '--status', 'active', '--updated-after', '2026-09-20', '--count', '1'])
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /active\.md/)
  assert.doesNotMatch(result.stdout, /stale\.md/)
})

test('query rejects unknown, conflicting and invalid options before network access', (t) => {
  const { run } = fixture(t)
  for (const args of [['--wat'], ['--local', '--remote'], ['--count', '0'], ['--count'], ['--domain', '--remote'], ['--min-similarity', '0.2junk'], ['--updated-after', 'yesterday']]) {
    const result = run(queryScript, ['workflow', ...args])
    assert.notEqual(result.status, 0, JSON.stringify(args))
    assert.doesNotMatch(result.stderr, /NETWORK_FORBIDDEN/)
  }
})

test('memory save validates locally without executing embedding script', (t) => {
  const { run } = fixture(t)
  const result = run(saveScript)
  assert.equal(result.status, 0, result.stderr)
  assert.doesNotMatch(result.stdout + result.stderr, /REMOTE_DELEGATED|NETWORK_FORBIDDEN/)
  assert.match(result.stdout, /not synced/i)
})

test('memory save requires both remote and apply to delegate', (t) => {
  const { run } = fixture(t)
  for (const args of [['--remote'], ['--apply'], ['--wat']]) {
    const result = run(saveScript, args)
    assert.notEqual(result.status, 0, JSON.stringify(args))
    assert.doesNotMatch(result.stdout, /REMOTE_DELEGATED/)
  }
  const result = run(saveScript, ['--remote', '--apply'])
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /REMOTE_DELEGATED/)
})

test('memory save rejects oversized context and invalid scripts', (t) => {
  const { cwd, run } = fixture(t)
  writeFileSync(join(cwd, 'docs/CONTEXT.md'), 'line\n'.repeat(250))
  assert.notEqual(run(saveScript).status, 0)
  writeFileSync(join(cwd, 'docs/CONTEXT.md'), '# Context\n')
  writeFileSync(join(cwd, 'scripts/query-vault.mjs'), 'const =')
  assert.notEqual(run(saveScript).status, 0)
})
