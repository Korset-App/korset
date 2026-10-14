export function readRetailMetric(value, { count = false, percentage = false } = {}) {
  const number = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')
    ? Number(value)
    : NaN
  if (!Number.isFinite(number) || number < 0 ||
    (count && !Number.isSafeInteger(number)) || (percentage && number > 100)) {
    throw new Error('Invalid retail metric response')
  }
  return number
}
