const MATCH_GROUP_BY_TYPE = {
  ean_exact: 'exact',
  alternate_ean: 'exact',
  local_ean: 'exact',
  fts_name: 'text',
  fts_brand: 'text',
  fts_local_name: 'text',
  trigram_name: 'fuzzy',
  trigram_brand: 'fuzzy',
  trigram_local_name: 'fuzzy',
  local_client: 'local',
  offline_client: 'local',
}

export function normalizeSearchMatchType(matchType) {
  return (
    String(matchType || '')
      .trim()
      .toLowerCase() || null
  )
}

export function getSearchMatchGroup(matchType) {
  const normalized = normalizeSearchMatchType(matchType)
  if (!normalized) return null
  return MATCH_GROUP_BY_TYPE[normalized] || 'other'
}

export function getSearchRankBucket(searchRank) {
  const rank = Number(searchRank)
  if (!Number.isFinite(rank) || rank <= 0) return null
  if (rank >= 100) return 'high'
  if (rank >= 10) return 'medium'
  return 'low'
}

export function buildProductSearchDiagnostics(product) {
  const matchType = normalizeSearchMatchType(product?.matchType)
  const rank = Number(product?.searchRank)
  return {
    source: product?.source || 'local_client',
    matchType,
    matchGroup: getSearchMatchGroup(matchType),
    rank: Number.isFinite(rank) ? rank : null,
    rankBucket: getSearchRankBucket(rank),
  }
}

export function getProductSearchDiagnosticsAttrs(product) {
  const diagnostics = product?.searchMeta || buildProductSearchDiagnostics(product)
  return {
    'data-search-source': diagnostics.source || undefined,
    'data-search-match': diagnostics.matchType || undefined,
    'data-search-match-group': diagnostics.matchGroup || undefined,
    'data-search-rank-bucket': diagnostics.rankBucket || undefined,
  }
}
