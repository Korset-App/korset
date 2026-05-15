/* global process, console */

import { spawnSync } from 'node:child_process'

const mode = process.argv[2] || 'quick'

const MODES = {
  docs: [
    ['git', ['diff', '--check', '--', 'AGENTS.md', 'docs', 'scripts']],
    ['node', ['--check', 'scripts/query-vault.mjs']],
    ['node', ['--check', 'scripts/embed-vault.mjs']],
    ['node', ['--check', 'scripts/agent-check.mjs']],
  ],
  quick: [
    ['git', ['diff', '--check']],
    ['node', ['--check', 'scripts/query-vault.mjs']],
    ['node', ['--check', 'scripts/embed-vault.mjs']],
    ['node', ['--check', 'scripts/agent-check.mjs']],
    ['npm', ['run', 'test:unit']],
  ],
  i18n: [['node', ['scripts/check-i18n.mjs']]],
  ui: [
    ['node', ['scripts/check-i18n.mjs']],
    ['npm', ['run', 'lint']],
    ['npm', ['run', 'build']],
  ],
  full: [
    ['git', ['diff', '--check']],
    ['node', ['scripts/check-i18n.mjs']],
    ['npm', ['run', 'test:unit']],
    ['npm', ['run', 'lint']],
    ['npm', ['run', 'build']],
  ],
}

if (!MODES[mode]) {
  console.error(`[agent-check] Unknown mode: ${mode}`)
  console.error(`[agent-check] Available modes: ${Object.keys(MODES).join(', ')}`)
  process.exit(1)
}

for (const [command, args] of MODES[mode]) {
  const useCmd = process.platform === 'win32' && command === 'npm'
  const executable = useCmd ? process.env.ComSpec || 'cmd.exe' : command
  const spawnArgs = useCmd ? ['/d', '/s', '/c', [command, ...args].join(' ')] : args
  console.log(`\n[agent-check] $ ${command} ${args.join(' ')}`)
  const result = spawnSync(executable, spawnArgs, {
    stdio: 'inherit',
  })

  if (result.error || result.status !== 0) {
    if (result.error) console.error(`[agent-check] ${result.error.message}`)
    console.error(`[agent-check] Failed in mode "${mode}"`)
    process.exit(result.status || 1)
  }
}

console.log(`\n[agent-check] PASS (${mode})`)
