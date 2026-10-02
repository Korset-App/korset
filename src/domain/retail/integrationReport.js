export function getCoverage(report) {
  const total = Math.max(0, Number(report?.total) || 0)
  const matched = Math.min(total, Math.max(0, Number(report?.matched) || 0))
  return {
    total,
    matched,
    remaining: total - matched,
    percent: total ? (matched / total) * 100 : 0,
  }
}

export async function collectIntegrationIssues(fetchPage) {
  const rows = new Map()
  const cursors = new Set()
  let generation
  let cursor = null
  do {
    const page = await fetchPage(cursor)
    if (!Array.isArray(page?.items)) throw new Error('INVALID_PAGE')
    if (generation !== undefined && generation !== page.generation) throw new Error('QUEUE_CHANGED')
    generation = page.generation
    for (const item of page.items) rows.set(item.source_id, item)
    cursor = page.next_cursor || null
    if (cursor && cursors.has(cursor)) throw new Error('INVALID_PAGE')
    if (cursor) cursors.add(cursor)
  } while (cursor)
  return [...rows.values()]
}
