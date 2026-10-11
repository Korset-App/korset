import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildRetailImportPreview,
  buildRetailImportTemplateRows,
  partitionRetailImportRows,
} from '../../src/utils/retailImportCore.js'

test('buildRetailImportTemplateRows returns required header order and example row', () => {
  const rows = buildRetailImportTemplateRows()

  assert.equal(rows.length, 2)
  assert.deepEqual(rows[0], ['EAN', 'Цена', 'Наличие', 'Полка', 'Название'])
  assert.equal(rows[1][0], '4870201234567')
  assert.equal(rows[1][1], 1290)
})

test('buildRetailImportPreview normalizes rows and reports duplicate and invalid data', () => {
  const preview = buildRetailImportPreview([
    ['EAN', 'Цена', 'Наличие', 'Полка', 'Название'],
    ['4870201234567', '1 290', 'есть', 'A-1', 'Молоко'],
    ['4870201234567', '1450', 'мало', 'A-2', 'Молоко дубль'],
    ['12345', '0', 'нет', '', 'Плохая строка'],
  ])

  assert.equal(preview.rows.length, 1)
  assert.deepEqual(preview.rows[0], {
    rowNumber: 2,
    ean: '4870201234567',
    priceKzt: 1290,
    stockStatus: 'in_stock',
    shelfZone: 'A-1',
    localName: 'Молоко',
  })
  assert.equal(preview.errors.length, 2)
  assert.equal(preview.errors[0].message, 'Дубликат EAN в файле')
  assert.equal(preview.errors[1].message, 'EAN должен содержать 8-14 цифр')
})

test('partitionRetailImportRows separates known rows from unknown ean candidates', () => {
  const rows = [
    { ean: '4870201234567', priceKzt: 1290, stockStatus: 'in_stock', shelfZone: 'A-1' },
    { ean: '4870207654321', priceKzt: 890, stockStatus: 'low_stock', shelfZone: 'B-2' },
  ]

  const result = partitionRetailImportRows(
    rows,
    new Map([
      ['4870201234567', { id: 'known-1', ean: '4870201234567' }],
    ])
  )

  assert.equal(result.knownRows.length, 1)
  assert.equal(result.knownRows[0].ean, '4870201234567')
  assert.equal(result.unknownRows.length, 1)
  assert.deepEqual(result.unknownRows[0], {
    ean: '4870207654321',
    priceKzt: 890,
    stockStatus: 'low_stock',
    shelfZone: 'B-2',
    reason: 'Товар с таким EAN не найден в каталоге магазина',
  })
})

test('buildRetailImportPreview rejects supplied unrecognized availability', () => {
  for (const value of ['unavailable', 'нетт', 'unknown', 0]) {
    const preview = buildRetailImportPreview([
      ['EAN', 'Цена', 'Наличие'],
      ['4870201234567', '1290', value],
    ])

    assert.deepEqual(preview.rows, [], `Invalid availability: ${value}`)
    assert.deepEqual(preview.errors, [
      { row: 2, ean: '4870201234567', code: 'invalid_stock_status', message: 'Некорректный статус наличия' },
    ])
  }
})

test('buildRetailImportPreview preserves empty availability defaults and supported aliases', () => {
  for (const value of ['', '  ', null, undefined]) {
    const preview = buildRetailImportPreview([
      ['EAN', 'Цена', 'Наличие'],
      ['4870201234567', '1290', value],
    ])
    assert.equal(preview.rows[0].stockStatus, 'in_stock')
    assert.deepEqual(preview.errors, [])
  }
  assert.equal(buildRetailImportPreview([
    ['EAN', 'Цена'], ['4870201234567', '1290'],
  ]).rows[0].stockStatus, 'in_stock')

  for (const [value, expected] of [
    [' В НАЛИЧИИ ', 'in_stock'], ['бар', 'in_stock'],
    ['low_stock', 'low_stock'], ['аз', 'low_stock'],
    ['out of stock', 'out_of_stock'], ['жоқ', 'out_of_stock'],
  ]) {
    const preview = buildRetailImportPreview([
      ['EAN', 'Цена', 'Наличие'], ['4870201234567', '1290', value],
    ])
    assert.equal(preview.rows[0].stockStatus, expected)
    assert.deepEqual(preview.errors, [])
  }
})
