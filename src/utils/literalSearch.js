export function escapeLiteralPattern(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function quoteLiteralSearchPattern(value) {
  const pattern = escapeLiteralPattern(String(value).trim())
  return `"${pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}
