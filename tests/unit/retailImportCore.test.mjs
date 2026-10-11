import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildRetailImportPreview,
  buildRetailImportTemplateRows,
  partitionRetailImportRows,
  parseCsv,
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

  assert.deepEqual(preview.rows, [])
  assert.equal(preview.errors.length, 3)
  assert.equal(preview.errors[0].message, 'Дубликат EAN в файле')
  assert.equal(preview.errors[1].message, 'Дубликат EAN в файле')
  assert.equal(preview.errors[2].message, 'EAN должен содержать 8-14 цифр')
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

test('buildRetailImportPreview rejects missing availability without inventing stock', () => {
  for (const value of ['', '  ', null, undefined]) {
    const preview = buildRetailImportPreview([
      ['EAN', 'Цена', 'Наличие'],
      ['4870201234567', '1290', value],
    ])
    assert.deepEqual(preview.rows, [])
    assert.equal(preview.errors[0].code, 'missing_stock_status')
  }
  assert.equal(buildRetailImportPreview([
    ['EAN', 'Цена'], ['4870201234567', '1290'],
  ]).errors[0].code, 'missing_stock_status')
})

test('buildRetailImportPreview preserves supported availability aliases', () => {
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

test('import rejects altered or scientific-notation EAN instead of repairing digits', () => {
  for (const ean of ['4870201234567x', '4870-201234567', '4870 201234567', '4.870201234567E+12']) {
    const preview = buildRetailImportPreview([['EAN', 'Цена', 'Наличие'], [ean, '1290', 'есть']])
    assert.deepEqual(preview.rows, [], ean)
    assert.equal(preview.errors.length, 1)
  }
  const preview = buildRetailImportPreview([['EAN', 'Цена', 'Наличие'], [' 4870201234567 ', '1290', 'есть']])
  assert.equal(preview.rows[0].ean, '4870201234567')
})

test('internal item-code headers are not declared EAN columns', () => {
  for (const header of ['Код', 'Артикул']) {
    assert.deepEqual(buildRetailImportPreview([[header, 'Цена', 'Наличие'], ['4870201234567', '1290', 'есть']]).rows, [])
  }
})

test('conflicting duplicate rows are all excluded while distinct products remain usable', () => {
  const preview = buildRetailImportPreview([
    ['EAN', 'Цена', 'Наличие'],
    ['4870201234567', '1290', 'есть'],
    ['4870201234567', '1590', 'нет'],
    ['4870207654321', '890', 'аз'],
  ])
  assert.deepEqual(preview.rows.map(row => row.ean), ['4870207654321'])
  assert.deepEqual(preview.errors.map(error => error.row), [2, 3])
})

test('import rejects negative, foreign-currency, fractional and ambiguous prices without coercion', () => {
  for (const price of ['-1290', '−1290', 'USD 1290', '1e3', '1290.50', '1 29', '12.34.56', '2147483648']) {
    const preview = buildRetailImportPreview([['EAN', 'Цена', 'Наличие'], ['4870201234567', price, 'есть']])
    assert.deepEqual(preview.rows, [], price)
    assert.equal(preview.errors[0].message, 'Некорректная цена')
  }
})

test('import retains supported whole-tenge formats without changing their value', () => {
  for (const price of ['1 290 ₸', '1290,00', '1\u00a0290,00 KZT', 1290]) {
    const preview = buildRetailImportPreview([['EAN', 'Цена', 'Наличие'], ['4870201234567', price, 'есть']])
    assert.equal(preview.rows[0].priceKzt, 1290)
    assert.deepEqual(preview.errors, [])
  }
})

test('CSV uses the header delimiter and retains other punctuation inside fields', () => {
  for (const content of [
    'EAN;Цена;Наличие;Название\n4870201234567;1290,00;есть;"Молоко, сахар"',
    'EAN,Цена,Наличие,Название\n4870201234567,"1290,00",есть,"Молоко; сахар"',
    'EAN\tЦена\tНаличие\tНазвание\n4870201234567\t1290,00\tесть\tМолоко; сахар',
  ]) {
    const preview = buildRetailImportPreview(parseCsv(content))
    assert.equal(preview.rows.length, 1)
    assert.equal(preview.rows[0].priceKzt, 1290)
    assert.match(preview.rows[0].localName, /^Молоко[,;] сахар$/)
  }
})
