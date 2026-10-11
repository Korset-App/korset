import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { buildRetailImportPreview } from '../../src/utils/retailImportCore.js'

const clientUrl = 'data:text/javascript,export const supabase = {}'
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './supabase.js' && context.parentURL?.endsWith('/retailImport.js')) {
      return { url: clientUrl, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})
const { applyRetailImport, parseRetailImportFile } = await import('../../src/utils/retailImport.js')
hook.deregister()
const { supabase } = await import(clientUrl)

const known = { ean: '4870201234567', priceKzt: 1290, stockStatus: 'in_stock' }
const unknown = { ean: '4870207654321', priceKzt: 890, stockStatus: 'low_stock' }

function configureClient({ existing = [], responses = {} } = {}) {
  const calls = []
  supabase.from = (table) => {
    assert.equal(table, 'store_products')
    return {
      select() { return this },
      eq() { return this },
      async in() { return { data: existing, error: null } },
    }
  }
  supabase.rpc = async (name, args) => {
    calls.push({ name, args })
    assert.ok(Object.hasOwn(responses, name), `Unexpected write: ${name}`)
    return responses[name]
  }
  return calls
}

test('applyRetailImport reports every failed staging row while retaining known updates', async () => {
  const calls = configureClient({
    existing: [{ id: 'known-1', ean: known.ean }],
    responses: {
      bulk_update_store_products: { data: 1, error: null },
      stage_unknown_eans: { data: null, error: { message: 'Not store owner' } },
    },
  })

  const result = await applyRetailImport('store-1', [known, unknown])

  assert.equal(result.updated, 1)
  assert.equal(result.staged, 0)
  assert.equal(result.autoResolved, 0)
  assert.deepEqual(result.failed, [{ ...unknown, reason: 'Not store owner' }])
  assert.equal(result.unknownRows[0].ean, unknown.ean)
  assert.deepEqual(calls.map(({ name }) => name), ['bulk_update_store_products', 'stage_unknown_eans'])
})

test('applyRetailImport stages and resolves unknown rows after a successful write', async () => {
  const calls = configureClient({ responses: {
    stage_unknown_eans: { data: 1, error: null },
    resolve_unknown_eans: { data: 1, error: null },
  } })
  const result = await applyRetailImport('store-1', [unknown])

  assert.equal(result.staged, 1)
  assert.equal(result.autoResolved, 1)
  assert.deepEqual(result.failed, [])
  assert.equal(calls[0].args.p_store_id, 'store-1')
  assert.deepEqual(calls[0].args.p_eans, [unknown.ean])
  assert.deepEqual(calls[0].args.p_stock_statuses, ['low_stock'])
  assert.deepEqual(calls.map(({ name }) => name), ['stage_unknown_eans', 'resolve_unknown_eans'])
})

test('applyRetailImport preserves staged rows and reports failed automatic resolution', async () => {
  configureClient({ responses: {
    stage_unknown_eans: { data: 1, error: null },
    resolve_unknown_eans: { data: null, error: { message: 'Queue worker unavailable' } },
  } })
  const result = await applyRetailImport('store-1', [unknown])
  assert.equal(result.staged, 1)
  assert.equal(result.autoResolved, 0)
  assert.equal(result.resolutionError, 'Queue worker unavailable')
  assert.deepEqual(result.failed, [])
})

test('applyRetailImport counts all unknown rows when their staging batch fails', async () => {
  const calls = configureClient({ responses: {
    stage_unknown_eans: { data: null, error: { message: 'Permission denied' } },
  } })
  const result = await applyRetailImport('store-1', [known, unknown])

  assert.equal(result.failed.length, 2)
  assert.deepEqual(result.failed.map(({ ean }) => ean), [known.ean, unknown.ean])
  assert.ok(result.failed.every(({ reason }) => reason === 'Permission denied'))
  assert.equal(result.staged, 0)
  assert.equal(result.autoResolved, 0)
  assert.deepEqual(calls.map(({ name }) => name), ['stage_unknown_eans'])
})

test('an import containing invalid availability excludes that row from writes', async () => {
  const preview = buildRetailImportPreview([
    ['EAN', 'Цена', 'Наличие'],
    [known.ean, '1290', 'typo'],
    [unknown.ean, '890', 'аз'],
  ])
  const calls = configureClient({ responses: {
    stage_unknown_eans: { data: 1, error: null },
    resolve_unknown_eans: { data: 0, error: null },
  } })
  await applyRetailImport('store-1', preview.rows)

  assert.deepEqual(calls[0].args.p_eans, [unknown.ean])
  assert.deepEqual(calls[0].args.p_stock_statuses, ['low_stock'])
  assert.equal(preview.errors.length, 1)
})

test('XLSX barcode cells retain text identity and numeric cells are not repaired', async () => {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Import')
  sheet.addRow(['EAN', 'Цена', 'Наличие'])
  sheet.addRow([known.ean, 1290, 'есть'])
  sheet.addRow([Number(unknown.ean), 890, 'аз'])
  sheet.getCell('A3').numFmt = '0000000000000'
  const bytes = await workbook.xlsx.writeBuffer()
  const preview = await parseRetailImportFile({ name: 'pilot.xlsx', arrayBuffer: async () => bytes })
  assert.deepEqual(preview.rows.map(row => row.ean), [known.ean])
  assert.equal(preview.rows[0].priceKzt, 1290)
  assert.equal(preview.errors[0].code, 'non_text_ean')
})

test('XLSX numeric formula result is not treated as a proven text barcode', async () => {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.addWorksheet('Import').addRows([
    ['EAN', 'Цена', 'Наличие'],
    [{ formula: '1+1', result: Number(known.ean) }, 1290, 'есть'],
  ])
  const bytes = await workbook.xlsx.writeBuffer()
  const preview = await parseRetailImportFile({ name: 'formula.xlsx', arrayBuffer: async () => bytes })
  assert.deepEqual(preview.rows, [])
  assert.equal(preview.errors[0].code, 'non_text_ean')
})
