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
  }

  if (knownRows.length > 0) {
    const { data: updated, error: bulkError } = await supabase.rpc('bulk_update_store_products', {
      p_store_id: storeId,
      p_eans: knownRows.map((r) => r.ean),
      p_price_kzts: knownRows.map((r) => r.priceKzt),
      p_stock_statuses: knownRows.map((r) => r.stockStatus),
      p_shelf_zones: knownRows.map((r) => r.shelfZone || ''),
    })

    if (bulkError) {
      const batchSize = 20
      for (let i = 0; i < knownRows.length; i += batchSize) {
        const batch = knownRows.slice(i, i + batchSize)
        const updates = await Promise.all(
          batch.map(async (row) => {
            const product = existing.get(String(row.ean))
            if (!product) {
              return { ok: false, row, reason: 'Строка отсутствует (race кэша)' }
            }
            const payload = {
              price_kzt: row.priceKzt,
              stock_status: row.stockStatus,
              shelf_zone: row.shelfZone || null,
              updated_at: new Date().toISOString(),
            }
            const { data, error } = await supabase
              .from('store_products')
              .update(payload)
              .eq('id', product.id)
              .eq('store_id', storeId)
              .select('id')

            if (error || !data?.length) {
              return { ok: false, row, reason: error?.message || 'RLS или строка не найдена' }
            }
            return { ok: true }
          })
        )

        updates.forEach((item) => {
          if (item.ok) result.updated += 1
          else result.failed.push({ ...item.row, reason: item.reason })
        })
      }
    } else {
      result.updated = updated || 0
    }
  }

  if (unknownRows.length > 0) {
    const { data: staged, error: stageError } = await supabase.rpc('stage_unknown_eans', {
      p_store_id: storeId,
      p_eans: unknownRows.map((r) => r.ean),
      p_local_names: unknownRows.map((r) => r.localName || ''),
      p_price_kzts: unknownRows.map((r) => r.priceKzt),
      p_stock_statuses: unknownRows.map((r) => r.stockStatus),
      p_shelf_zones: unknownRows.map((r) => r.shelfZone || ''),
    })

    if (stageError) {
      unknownRows.forEach((row) => {
        result.failed.push({ ...row, reason: stageError.message || String(stageError) })
      })
    } else {
      result.staged = staged || 0
      const { data: resolved, error: resolveError } = await supabase.rpc('resolve_unknown_eans', {
        p_store_id: storeId,
        p_limit: unknownRows.length,
      })
      if (resolveError) result.resolutionError = resolveError.message || String(resolveError)
      else result.autoResolved = resolved || 0
    }
  }

  return result
}
