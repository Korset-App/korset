import test from 'node:test'
import assert from 'node:assert/strict'
import { escapeLiteralPattern, quoteLiteralSearchPattern } from '../../src/utils/literalSearch.js'

test('search punctuation matches literally instead of changing the pattern', () => {
  for (const query of ['(', ')', '+', '[x]', '3.2%', '_', '*', '?', '$', '^', '|', '\\', 'А+Б', 'Сүт (3.2%)']) {
    const matcher = new RegExp(escapeLiteralPattern(query), 'iu')
    assert.equal(matcher.test(`before ${query} after`), true, query)
    assert.equal(matcher.test('a completely different product'), false, query)
  }
  assert.equal(new RegExp(escapeLiteralPattern('Pilot'), 'iu').test('pilot milk'), true)
})

test('a quoted filter value preserves comma, quote, backslash and wildcard literals', () => {
  for (const query of ['Pilot, Brand', '"q"', '\\', '3.2%', '_', '*', ',price_kzt.gt.0', '",ean.eq.other']) {
    const quoted = quoteLiteralSearchPattern(query)
    const pattern = JSON.parse(quoted)
    const matcher = new RegExp(pattern, 'iu')
    assert.equal(matcher.test(`before ${query} after`), true, query)
    assert.equal(matcher.test('a completely different product'), false, query)
  }
})

test('outer whitespace is trimmed without dropping punctuation from a filter value', () => {
  assert.equal(JSON.parse(quoteLiteralSearchPattern('  (A+B)  ')), '\\(A\\+B\\)')
})
