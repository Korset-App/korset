/* global process, console */

import { writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import baseline from './lint-baseline.json' with { type: 'json' }

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const baselinePath = fileURLToPath(new URL('./lint-baseline.json', import.meta.url))

function fileKey(filePath, root) {
  return relative(root, filePath).replaceAll('\\', '/')
}

export function warningCounts(results, root) {
  const counts = {}
  for (const result of results) {
    for (const message of result.messages) {
      if (message.severity !== 1) continue
      const file = fileKey(result.filePath, root)
      const rule = message.ruleId || '(unknown rule)'
      counts[file] ||= {}
      counts[file][rule] = (counts[file][rule] || 0) + 1
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([file, rules]) => [
    file,
    Object.fromEntries(Object.entries(rules).sort(([a], [b]) => a.localeCompare(b))),
  ]))
}

export function assessLint(results, allowed, root) {
  const violations = []
  const current = warningCounts(results, root)
  for (const result of results) {
    const errors = result.messages.filter((message) => message.severity === 2).length
    if (errors) violations.push(`${fileKey(result.filePath, root)}: ${errors} error(s)`)
  }
  for (const [file, rules] of Object.entries(current)) {
    for (const [rule, count] of Object.entries(rules)) {
      const limit = allowed[file]?.[rule] || 0
      if (count > limit) violations.push(`${file}: ${rule}: ${count} > ${limit} warning(s)`)
    }
  }
  return violations
}

async function main() {
  const eslint = new ESLint({ cwd: projectRoot })
  const results = await eslint.lintFiles(['src'])
  const formatter = await eslint.loadFormatter('stylish')
  const formatted = formatter.format(results)
  if (formatted) console.log(formatted)

  if (process.argv[2] === '--write-baseline') {
    const errors = results.reduce((count, result) => count + result.errorCount, 0)
    if (errors) throw new Error(`Cannot baseline ${errors} lint error(s)`)
    await writeFile(baselinePath, `${JSON.stringify(warningCounts(results, projectRoot), null, 2)}\n`)
    console.log('[lint-budget] Baseline written; review the diff before committing it')
    return
  }
  if (process.argv.length > 2) throw new Error(`Unknown argument: ${process.argv[2]}`)

  const violations = assessLint(results, baseline, projectRoot)
  if (violations.length) {
    console.error(`[lint-budget] New lint findings:\n${violations.join('\n')}`)
    process.exitCode = 1
  } else {
    console.log('[lint-budget] No new lint warnings or errors')
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
