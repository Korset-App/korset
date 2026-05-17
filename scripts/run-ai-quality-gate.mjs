#!/usr/bin/env node

import { runNoSpendAIQualityGate } from '../src/domain/ai/noSpendQualityGate.js'

const report = runNoSpendAIQualityGate()

console.log('[ai-quality-gate] No-spend AI QA gate')
console.log(
  `[ai-quality-gate] total=${report.total} pass=${report.summary.pass} review=${report.summary.review} fail=${report.summary.fail}`
)

if (Object.keys(report.issueTags).length > 0) {
  console.log('[ai-quality-gate] issue tags:')
  for (const [tag, count] of Object.entries(report.issueTags)) {
    console.log(`[ai-quality-gate]   ${tag}: ${count}`)
  }
}

for (const result of report.results) {
  const tagText = result.tags.length > 0 ? ` tags=${result.tags.join(',')}` : ''
  console.log(
    `[ai-quality-gate] ${result.status.toUpperCase()} ${result.id} ${result.mode}/${result.lang}/${result.intent} score=${result.score}${tagText}`
  )
}

if (report.summary.fail > 0) {
  process.exitCode = 1
}
