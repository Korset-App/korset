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

export function readRetailSummary(data, categoryFields, topFields) {
  const row = Array.isArray(data) ? (data.length === 1 ? data[0] : null) : data
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('Invalid retail summary response')
  }
  const total = readRetailMetric(row.total_count, { count: true })
  const counts = categoryFields.map((field) => readRetailMetric(row[field], { count: true }))
  if (counts.reduce((sum, count) => sum + count, 0) > total) {
    throw new Error('Invalid retail summary response')
  }
  for (const [field, labels] of Object.entries(topFields)) {
    const count = readRetailMetric(row[field], { count: true })
    if (count > total || (count > 0 && labels.some((label) => typeof row[label] !== 'string' || !row[label].trim()))) {
      throw new Error('Invalid retail summary response')
    }
  }
  return row
}
