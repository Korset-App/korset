import assert from 'node:assert/strict'
import test from 'node:test'
import { korzinaDonorId, korzinaDonorName } from '../../scripts/catalog-v4-autonomous-enricher.mjs'
import { cleanTokens } from '../../scripts/utils/retail-tokenizer.mjs'

test('Korzina donor name uses the saved catalog productName', () => {
  const row = { productName: 'Чай черный гранулированный Assam, 250г', name: undefined }

  assert.equal(korzinaDonorName(row), row.productName)
  assert.ok(cleanTokens(korzinaDonorName(row)).length > 0)
})

test('Korzina donor id uses the saved catalog quantumNumber', () => {
  assert.equal(korzinaDonorId({ quantumNumber: 123, id: undefined }), 123)
  assert.equal(korzinaDonorId({ id: 456 }), 456)
})
