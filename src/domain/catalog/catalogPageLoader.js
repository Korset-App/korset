export async function loadCatalogPages({
  fetchPage,
  onPage = () => {},
  isCancelled = () => false,
  pageSize = 500,
}) {
  let cursor = null
  let rows = []

  while (!isCancelled()) {
    const { data, error } = await fetchPage(cursor, pageSize)
    if (isCancelled()) break
    if (error) throw error
    if (!Array.isArray(data)) throw new Error('Catalog page response is missing data')
    if (data.length === 0) break

    const nextCursor = data.at(-1)?.ean
    if (!nextCursor || (cursor !== null && String(nextCursor) <= String(cursor))) {
      throw new Error('Catalog cursor did not advance')
    }

    rows.push(...data)
    onPage(data, rows.length)
    if (data.length < pageSize) break
    cursor = String(nextCursor)
  }

  return rows
}
