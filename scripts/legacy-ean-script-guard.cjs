function isLegacyEanScriptDryRunAllowed(args = process.argv.slice(2)) {
  return Array.isArray(args) && args.includes('--dry-run')
}

function assertLegacyEanScriptDryRunOnly({ scriptName = 'legacy EAN script', args = process.argv.slice(2) } = {}) {
  if (isLegacyEanScriptDryRunAllowed(args)) return true
  throw new Error(
    `${scriptName} is blocked from live writes. Run with --dry-run only; rebuild writes through product_ean_aliases review/trusted flow.`
  )
}

module.exports = {
  assertLegacyEanScriptDryRunOnly,
  isLegacyEanScriptDryRunAllowed,
}
