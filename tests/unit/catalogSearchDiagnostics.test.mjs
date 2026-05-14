import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildProductSearchDiagnostics,
  getProductSearchDiagnosticsAttrs,
  getSearchMatchGroup,
  getSearchRankBucket,
  normalizeSearchMatchType,
} from '../../src/domain/product/searchDiagnostics.js'

test('search diagnostics normalizes match types into stable groups', () => {
  assert.equal(normalizeSearchMatchType(' FTS_Name '), 'fts_name')
  assert.equal(normalizeSearchMatchType(''), null)
  assert.equal(getSearchMatchGroup('ean_exact'), 'exact')
  assert.equal(getSearchMatchGroup('fts_name'), 'text')
  assert.equal(getSearchMatchGroup('fts_name_simple'), 'text')
  assert.equal(getSearchMatchGroup('fts_ingredients'), 'text')
  assert.equal(getSearchMatchGroup('phrase_name'), 'text')
  assert.equal(getSearchMatchGroup('all_tokens_name'), 'text')
  assert.equal(getSearchMatchGroup('intent_subcategory'), 'intent')
  assert.equal(getSearchMatchGroup('brand_product'), 'intent')
  assert.equal(getSearchMatchGroup('quantity_match'), 'intent')
  assert.equal(getSearchMatchGroup('attribute_tag'), 'attribute')
  assert.equal(getSearchMatchGroup('ingredient_match'), 'attribute')
  assert.equal(getSearchMatchGroup('token_fuzzy'), 'fuzzy')
  assert.equal(getSearchMatchGroup('word_match'), 'fuzzy')
  assert.equal(getSearchMatchGroup('trigram_brand'), 'fuzzy')
  assert.equal(getSearchMatchGroup('offline_client'), 'local')
  assert.equal(getSearchMatchGroup('unknown_match'), 'other')
})

test('search diagnostics buckets ranks and exports data attributes', () => {
  assert.equal(getSearchRankBucket(512.5), 'high')
  assert.equal(getSearchRankBucket(42), 'medium')
  assert.equal(getSearchRankBucket(0.7), 'low')
  assert.equal(getSearchRankBucket(null), null)

  const diagnostics = buildProductSearchDiagnostics({
    source: 'search_rpc',
    matchType: 'trigram_local_name',
    searchRank: '12.5',
  })

  assert.deepEqual(diagnostics, {
    source: 'search_rpc',
    matchType: 'trigram_local_name',
    matchGroup: 'fuzzy',
    rank: 12.5,
    rankBucket: 'medium',
  })

  assert.deepEqual(getProductSearchDiagnosticsAttrs({ searchMeta: diagnostics }), {
    'data-search-source': 'search_rpc',
    'data-search-match': 'trigram_local_name',
    'data-search-match-group': 'fuzzy',
    'data-search-rank-bucket': 'medium',
  })
})
