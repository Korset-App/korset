import { supabase } from './supabase.js'
import {
  buildRetailImportPreview,
  buildRetailImportTemplateRows,
  parseCsv,
  partitionRetailImportRows,
} from './retailImportCore.js'

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function toCsv(rows) {
  return rows
    .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\n')
}

export async function downloadRetailImportTemplate(format = 'csv') {
  const rows = buildRetailImportTemplateRows()

  if (format === 'xlsx') {
    const ExcelJSMod = await import('exceljs')
    const ExcelJS = ExcelJSMod.default || ExcelJSMod
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Import')
    rows.forEach((row) => sheet.addRow(row))
    const buffer = await workbook.xlsx.writeBuffer()
    downloadBlob(
      new globalThis.Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      'korset-import-template.xlsx'
    )
    return
  }

  downloadBlob(
    new globalThis.Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' }),
    'korset-import-template.csv'
  )
}

export function downloadUnknownEansReport(rows) {
  const exportRows = [
    ['EAN', 'Цена', 'Наличие', 'Полка', 'Название', 'Причина'],
    ...rows.map((row) => [
      row.ean,
      row.priceKzt,
      row.stockStatus,
      row.shelfZone,
      row.localName,
      row.reason,
    ]),
  ]

  downloadBlob(
    new globalThis.Blob([`\uFEFF${toCsv(exportRows)}`], { type: 'text/csv;charset=utf-8' }),
    'korset-unknown-ean-report.csv'
  )
}

function cellToString(value) {
  if (value == null) return ''
  if (typeof value === 'object') {
    // exceljs returns rich text objects { richText: [...] } and hyperlinks { text, hyperlink }
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text || '').join('')
    }
    if (typeof value.text === 'string') return value.text
    if (typeof value.result !== 'undefined') return typeof value.result === 'number' ? value.result : String(value.result)
    if (value instanceof Date) return value.toISOString()
    return ''
  }
  return String(value)
}

export async function parseRetailImportFile(file) {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'csv') {
    const text = await file.text()
    return buildRetailImportPreview(parseCsv(text))
  }

  const ExcelJSMod = await import('exceljs')
  const ExcelJS = ExcelJSMod.default || ExcelJSMod
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return buildRetailImportPreview([])

  const rows = []
  sheet.eachRow({ includeEmpty: false }, (row) => {
    // row.values — array с пустым элементом на 0-ой позиции (1-indexed cells)
    const values = Array.isArray(row.values) ? row.values.slice(1) : []
    const normalized = values.map((value) => typeof value === 'number' ? value : cellToString(value))
    if (normalized.some((value) => String(value ?? '').trim().length > 0)) rows.push(normalized)
  })

  return buildRetailImportPreview(rows)
}

async function fetchExistingProducts(storeId, eans) {
  const map = new Map()
  const chunkSize = 500

  for (let i = 0; i < eans.length; i += chunkSize) {
    const chunk = eans.slice(i, i + chunkSize)
    const { data, error } = await supabase
      .from('store_products')
      .select('id, ean')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .in('ean', chunk)

    if (error) throw new Error(error.message ?? error)
    ;(data || []).forEach((item) => map.set(String(item.ean), item))
  }

  return map
}

function isValidCount(count, limit = Infinity) {
  return Number.isInteger(count) && count >= 0 && count <= limit
}

function isUnconfirmedWriteError(error, responseStatus) {
  const status = Number(responseStatus ?? error?.status)
  const message = errorReason(error)
  return status >= 500 || String(error?.code || '').startsWith('5') ||
    (!error?.code && /fetch|network|timeout|connection|failed to send request/i.test(message))
}

function markUnconfirmed(result, rows, phase) {
  rows.forEach(({ reason: _reason, ...row }) => result.unconfirmed.push({ ...row, code: 'write_unconfirmed', phase }))
}

function errorReason(error) {
  return error?.message || String(error)
}

export async function applyRetailImport(storeId, rows, _fileName) {
  if (!storeId) throw new Error('Store is not loaded')

  const existing = await fetchExistingProducts(
    storeId,
    rows.map((row) => row.ean)
  )

  const { knownRows, unknownRows } = partitionRetailImportRows(rows, existing)
  const result = {
    updated: 0,
    staged: 0,
    autoResolved: 0,
    skipped: unknownRows,
    unknownRows,
    failed: [],
    unconfirmed: [],
    catalogMayHaveChanged: false,
  }

  if (knownRows.length > 0) {
    let bulkResponse
    let bulkThrew = false
    try {
      bulkResponse = await supabase.rpc('bulk_update_store_products', {
        p_store_id: storeId,
        p_eans: knownRows.map((r) => r.ean),
        p_price_kzts: knownRows.map((r) => r.priceKzt),
        p_stock_statuses: knownRows.map((r) => r.stockStatus),
        p_shelf_zones: knownRows.map((r) => r.shelfZone || ''),
      })
    } catch {
      bulkThrew = true
      markUnconfirmed(result, knownRows, 'known')
      result.catalogMayHaveChanged = true
    }

    if (bulkResponse?.error) {
      const error = bulkResponse.error
      if (!isUnconfirmedWriteError(error, bulkResponse.status) && (error.code === 'PGRST202' || error.code === '42883')) {
        for (const row of knownRows) {
          const product = existing.get(String(row.ean))
          if (!product) {
            result.failed.push({ ...row, reason: 'Строка отсутствует (race кэша)' })
            continue
          }
          const payload = {
            price_kzt: row.priceKzt,
            stock_status: row.stockStatus,
            shelf_zone: row.shelfZone || null,
            updated_at: new Date().toISOString(),
          }
          try {
            const { data, error: updateError, status } = await supabase
              .from('store_products')
              .update(payload)
              .eq('id', product.id)
              .eq('store_id', storeId)
              .select('id')

            if (updateError) {
              if (isUnconfirmedWriteError(updateError, status)) {
                markUnconfirmed(result, [row], 'known')
                result.catalogMayHaveChanged = true
              } else {
                result.failed.push({ ...row, reason: errorReason(updateError) })
              }
            } else if (data?.length === 1) {
              result.updated += 1
              result.catalogMayHaveChanged = true
            } else if (Array.isArray(data) && data.length === 0) {
              result.failed.push({ ...row, reason: 'RLS или строка не найдена' })
            } else {
              markUnconfirmed(result, [row], 'known')
              result.catalogMayHaveChanged = true
            }
          } catch {
            markUnconfirmed(result, [row], 'known')
            result.catalogMayHaveChanged = true
          }
        }
      } else if (isUnconfirmedWriteError(error, bulkResponse.status)) {
        markUnconfirmed(result, knownRows, 'known')
        result.catalogMayHaveChanged = true
      } else {
        knownRows.forEach((row) => result.failed.push({ ...row, reason: errorReason(error) }))
      }
    } else if (bulkResponse) {
      const count = bulkResponse.data
      if (isValidCount(count, knownRows.length)) {
        result.updated = count
        if (count > 0) result.catalogMayHaveChanged = true
        if (count === 0) {
          knownRows.forEach((row) => result.failed.push({ ...row, code: 'not_updated', reason: 'Not updated' }))
        } else if (count < knownRows.length) {
          markUnconfirmed(result, knownRows, 'known')
        }
      } else {
        markUnconfirmed(result, knownRows, 'known')
        result.catalogMayHaveChanged = true
      }
    } else if (!bulkThrew) {
      markUnconfirmed(result, knownRows, 'known')
      result.catalogMayHaveChanged = true
    }
  }

  if (unknownRows.length > 0) {
    let stageResponse
    let stageThrew = false
    try {
      stageResponse = await supabase.rpc('stage_unknown_eans', {
        p_store_id: storeId,
        p_eans: unknownRows.map((r) => r.ean),
        p_local_names: unknownRows.map((r) => r.localName || ''),
        p_price_kzts: unknownRows.map((r) => r.priceKzt),
        p_stock_statuses: unknownRows.map((r) => r.stockStatus),
        p_shelf_zones: unknownRows.map((r) => r.shelfZone || ''),
      })
    } catch {
      stageThrew = true
      markUnconfirmed(result, unknownRows, 'staging')
    }

    if (stageResponse?.error) {
      if (isUnconfirmedWriteError(stageResponse.error, stageResponse.status)) {
        markUnconfirmed(result, unknownRows, 'staging')
      } else {
        unknownRows.forEach((row) => result.failed.push({ ...row, reason: errorReason(stageResponse.error) }))
      }
    } else if (stageResponse) {
      const count = stageResponse.data
      if (isValidCount(count, unknownRows.length)) result.staged = count
      if (count === 0) {
        unknownRows.forEach((row) => result.failed.push({ ...row, code: 'not_updated', reason: 'Not staged' }))
      } else if (count !== unknownRows.length) {
        markUnconfirmed(result, unknownRows, 'staging')
      } else {
        result.catalogMayHaveChanged = true
        try {
          const resolveResponse = await supabase.rpc('resolve_unknown_eans', {
            p_store_id: storeId,
            p_limit: unknownRows.length,
          })
          const { data: resolved, error: resolveError } = resolveResponse
          if (resolveError) {
            result.resolutionError = errorReason(resolveError)
            if (isUnconfirmedWriteError(resolveError, resolveResponse.status)) {
              markUnconfirmed(result, unknownRows, 'resolution')
            }
          } else if (isValidCount(resolved)) {
            result.autoResolved = resolved
          } else {
            result.resolutionError = 'Invalid resolution acknowledgment'
            markUnconfirmed(result, unknownRows, 'resolution')
          }
        } catch (error) {
          result.resolutionError = errorReason(error)
          markUnconfirmed(result, unknownRows, 'resolution')
        }
      }
    } else if (!stageThrew) {
      markUnconfirmed(result, unknownRows, 'staging')
    }
  }

  return result
}
