import { spawnSync } from 'child_process'
import { readFileSync } from 'node:fs'

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(`[memory-save] Command failed: ${result.error.message}`)
    process.exit(1)
  }

  if (result.status !== 0) {
    console.error(`[memory-save] Command exited with status ${result.status}`)
    process.exit(result.status ?? 1)
  }
}

const args = process.argv.slice(2)
const allowed = new Set(['--remote', '--apply', '--help'])
if (args.some((arg) => !allowed.has(arg))) {
  console.error('[memory-save] Unknown option. Use --help.')
  process.exit(1)
}
if (args.includes('--help')) {
  console.log('Usage: npm run memory:save [-- --remote --apply]\nDefault: local validation only. --remote --apply sends Vault text to the embedding provider and writes/deletes the Supabase index; may incur cost.')
  process.exit(0)
}
const remote = args.includes('--remote')
if (remote !== args.includes('--apply')) {
  console.error('[memory-save] Remote synchronization requires both --remote and --apply.')
  process.exit(1)
}
try {
  const contextLines = readFileSync('docs/CONTEXT.md', 'utf8').trimEnd().split(/\r?\n/).length
  if (contextLines >= 250) throw new Error(`docs/CONTEXT.md must stay under 250 lines (found ${contextLines}).`)
  for (const script of ['query-vault.mjs', 'embed-vault.mjs', 'memory-save.mjs']) {
    run(process.execPath, ['--check', `scripts/${script}`])
  }
  console.log('[memory-save] Local validation passed. Markdown files are the source of truth.')
  if (remote) {
    run(process.execPath, ['scripts/embed-vault.mjs'])
    console.log('[memory-save] Remote synchronization command finished; inspect its output for changes or skipped work.')
  } else {
    console.log('[memory-save] Remote index not synced. No network calls or database writes performed.')
  }
} catch (error) {
  console.error(`[memory-save] ${error.message}`)
  process.exit(1)
}
