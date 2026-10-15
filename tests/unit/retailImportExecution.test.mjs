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

function configureClient({ existing = [], responses = {}, updateResponses = [] } = {}) {
  const calls = []
  supabase.from = (table) => {
    assert.equal(table, 'store_products')
    return {
      select() { return this.isUpdate ? Promise.resolve(updateResponses.shift()) : this },
      eq() { return this },
      update(payload) { calls.push({ name: 'update', payload }); this.isUpdate = true; return this },
      async in() { return { data: existing, error: null } },
    }
  }
  supabase.rpc = async (name, args) => {
    calls.push({ name, args })
    assert.ok(Object.hasOwn(responses, name), `Unexpected write: ${name}`)
    return typeof responses[name] === 'function' ? responses[name]() : responses[name]
  }
  return calls
}

test('confirmed known updates survive a thrown staging request', async () => {
  const calls = configureClient({
    existing: [{ id: 'known-1', ean: known.ean }],
    responses: {
      bulk_update_store_products: { data: 1, error: null },
      stage_unknown_eans: () => { throw new TypeError('Failed to fetch') },
    },
  })
  const result = await applyRetailImport('store-1', [known, unknown])
  assert.equal(result.updated, 1)
  assert.equal(result.staged, 0)
  assert.deepEqual(result.unconfirmed, [{ ...unknown, code: 'write_unconfirmed', phase: 'staging' }])
  assert.equal(result.catalogMayHaveChanged, true)
  assert.deepEqual(calls.map(({ name }) => name), ['bulk_update_store_products', 'stage_unknown_eans'])
})

test('lost bulk response is unconfirmed and never replayed', async () => {
  const calls = configureClient({
    existing: [{ id: 'known-1', ean: known.ean }],
    responses: { bulk_update_store_products: () => { throw new TypeError('Failed to fetch') } },
  })
  const result = await applyRetailImport('store-1', [known])
  assert.equal(result.updated, 0)
  assert.deepEqual(result.failed, [])
  assert.deepEqual(result.unconfirmed, [{ ...known, code: 'write_unconfirmed', phase: 'known' }])
  assert.equal(result.catalogMayHaveChanged, true)
  assert.deepEqual(calls.map(({ name }) => name), ['bulk_update_store_products'])
})

test('partial bulk and staging acknowledgments retain counts without guessing identities', async () => {
  const calls = configureClient({
    existing: [{ id: 'known-1', ean: known.ean }, { id: 'known-2', ean: unknown.ean }],
    responses: { bulk_update_store_products: { data: 1, error: null } },
  })
  const bulk = await applyRetailImport('store-1', [known, unknown])
  assert.equal(bulk.updated, 1)
  assert.deepEqual(bulk.unconfirmed, [known, unknown].map(row => ({ ...row, code: 'write_unconfirmed', phase: 'known' })))
  assert.equal(bulk.catalogMayHaveChanged, true)
  assert.deepEqual(calls.map(({ name }) => name), ['bulk_update_store_products'])

  const stageCalls = configureClient({
    responses: { stage_unknown_eans: { data: 1, error: null } },
  })
  const staged = await applyRetailImport('store-1', [known, unknown])
  assert.equal(staged.staged, 1)
  assert.deepEqual(staged.unconfirmed, [known, unknown].map(row => ({ ...row, code: 'write_unconfirmed', phase: 'staging' })))
  assert.deepEqual(stageCalls.map(({ name }) => name), ['stage_unknown_eans'])
})

test('zero bulk acknowledgment reports definite not-updated rows', async () => {
  configureClient({ existing: [{ id: 'known-1', ean: known.ean }], responses: {
    bulk_update_store_products: { data: 0, error: null },
  } })
  const result = await applyRetailImport('store-1', [known])
  assert.deepEqual(result.failed, [{ ...known, code: 'not_updated', reason: 'Not updated' }])
  assert.deepEqual(result.unconfirmed, [])
  assert.equal(result.catalogMayHaveChanged, false)
})

test('zero staging acknowledgment reports definite unstaged rows without resolving', async () => {
  const calls = configureClient({ responses: {
    stage_unknown_eans: { data: 0, error: null },
  } })
  const result = await applyRetailImport('store-1', [unknown])
  assert.equal(result.staged, 0)
  assert.deepEqual(result.failed, [{ ...unknown, code: 'not_updated', reason: 'Not staged' }])
  assert.deepEqual(result.unconfirmed, [])
  assert.deepEqual(calls.map(({ name }) => name), ['stage_unknown_eans'])
})

test('missing bulk function falls back sequentially and preserves prior successes', async () => {
  const calls = configureClient({
    existing: [{ id: 'known-1', ean: known.ean }, { id: 'known-2', ean: unknown.ean }],
    responses: { bulk_update_store_products: { data: null, error: { code: 'PGRST202', message: 'Missing function' } } },
    updateResponses: [{ data: [{ id: 'known-1' }], error: null }, { data: null, error: { code: '42501', message: 'Denied' } }],
  })
  const result = await applyRetailImport('store-1', [known, unknown])
  assert.equal(result.updated, 1)
  assert.deepEqual(result.failed, [{ ...unknown, reason: 'Denied' }])
  assert.deepEqual(result.unconfirmed, [])
  assert.equal(result.catalogMayHaveChanged, true)
  assert.deepEqual(calls.map(({ name }) => name), ['bulk_update_store_products', 'update', 'update'])
})

test('permission bulk error never falls back', async () => {
  const calls = configureClient({
    existing: [{ id: 'known-1', ean: known.ean }],
    responses: { bulk_update_store_products: { data: null, error: { code: '42501', message: 'Denied' } } },
  })
  const result = await applyRetailImport('store-1', [known])
  assert.deepEqual(result.failed, [{ ...known, reason: 'Denied' }])
  assert.deepEqual(result.unconfirmed, [])
  assert.deepEqual(calls.map(({ name }) => name), ['bulk_update_store_products'])
})

test('thrown resolver preserves staged count and records resolution error', async () => {
  configureClient({ responses: {
    stage_unknown_eans: { data: 1, error: null },
    resolve_unknown_eans: () => { throw new TypeError('Failed to fetch') },
  } })
  const result = await applyRetailImport('store-1', [unknown])
  assert.equal(result.staged, 1)
  assert.equal(result.autoResolved, 0)
  assert.match(result.resolutionError, /Failed to fetch/)
  assert.deepEqual(result.unconfirmed, [{ ...unknown, code: 'write_unconfirmed', phase: 'resolution' }])
})

test('HTTP 5xx on bulk write is unconfirmed even with missing-function code', async () => {
  const calls = configureClient({
    existing: [{ id: 'known-1', ean: known.ean }],
    responses: { bulk_update_store_products: { data: null, status: 503, error: { code: 'PGRST202', message: 'Service unavailable' } } },
  })
  const result = await applyRetailImport('store-1', [known])
  assert.deepEqual(result.unconfirmed, [{ ...known, code: 'write_unconfirmed', phase: 'known' }])
  assert.deepEqual(calls.map(({ name }) => name), ['bulk_update_store_products'])
})

test('staging HTTP 5xx with an empty error code leaves rows unconfirmed', async () => {
  const calls = configureClient({ responses: {
    stage_unknown_eans: { data: null, status: 503, error: { message: 'Response unavailable' } },
  } })
  const result = await applyRetailImport('store-1', [unknown])
  assert.equal(result.staged, 0)
  assert.deepEqual(result.unconfirmed, [{ ...unknown, code: 'write_unconfirmed', phase: 'staging' }])
  assert.deepEqual(calls.map(({ name }) => name), ['stage_unknown_eans'])
})

test('empty-code fetch error is unconfirmed and is not replayed', async () => {
  const calls = configureClient({
    existing: [{ id: 'known-1', ean: known.ean }],
    responses: { bulk_update_store_products: { data: null, error: { message: 'Failed to fetch' } } },
  })
  const result = await applyRetailImport('store-1', [known])
  assert.deepEqual(result.unconfirmed, [{ ...known, code: 'write_unconfirmed', phase: 'known' }])
  assert.deepEqual(calls.map(({ name }) => name), ['bulk_update_store_products'])
})

test('malformed write acknowledgments are unconfirmed', async () => {
  const calls = configureClient({
    existing: [{ id: 'known-1', ean: known.ean }],
    responses: { bulk_update_store_products: { data: '1', error: null }, stage_unknown_eans: { data: 3, error: null } },
  })
  const result = await applyRetailImport('store-1', [known, unknown])
  assert.equal(result.updated, 0)
  assert.equal(result.staged, 0)
  assert.deepEqual(result.unconfirmed, [
    { ...known, code: 'write_unconfirmed', phase: 'known' },
    { ...unknown, code: 'write_unconfirmed', phase: 'staging' },
  ])
  assert.deepEqual(calls.map(({ name }) => name), ['bulk_update_store_products', 'stage_unknown_eans'])
})

test('null bulk RPC response is unconfirmed', async () => {
  const calls = configureClient({
    existing: [{ id: 'known-1', ean: known.ean }],
    responses: { bulk_update_store_products: null },
  })
  const result = await applyRetailImport('store-1', [known])
  assert.deepEqual(result.unconfirmed, [{ ...known, code: 'write_unconfirmed', phase: 'known' }])
  assert.equal(result.catalogMayHaveChanged, true)
  assert.deepEqual(calls.map(({ name }) => name), ['bulk_update_store_products'])
})

test('resolver may acknowledge rows from an existing global queue', async () => {
  configureClient({ responses: {
    stage_unknown_eans: { data: 1, error: null },
    resolve_unknown_eans: { data: 9, error: null },
  } })
  const result = await applyRetailImport('store-1', [unknown])
  assert.equal(result.staged, 1)
  assert.equal(result.autoResolved, 9)
  assert.deepEqual(result.unconfirmed, [])
})

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
