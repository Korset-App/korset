const HEADER_ALIASES = {
  ean: ['ean', 'barcode', 'bar code', 'штрихкод', 'штрих код', 'штк', 'код', 'артикул'],
  price: ['price', 'цена', 'баға', 'стоимость', 'розница', 'retail price'],
  stockStatus: ['stock', 'status', 'наличие', 'остаток', 'қойма', 'статус'],
  shelfZone: ['shelf', 'полка', 'зона', 'ряд', 'сөре'],
  localName: ['name', 'название', 'тауар', 'наименование', 'product'],
}

const STOCK_MAP = new Map([
  ['in_stock', 'in_stock'],
  ['in stock', 'in_stock'],
  ['есть', 'in_stock'],
  ['в наличии', 'in_stock'],
  ['бар', 'in_stock'],
  ['low_stock', 'low_stock'],
  ['low stock', 'low_stock'],
  ['мало', 'low_stock'],
  ['аз', 'low_stock'],
  ['out_of_stock', 'out_of_stock'],
  ['out of stock', 'out_of_stock'],
  ['нет', 'out_of_stock'],
  ['нет в наличии', 'out_of_stock'],
  ['жоқ', 'out_of_stock'],
])

export const UNKNOWN_EAN_REASON = 'Товар с таким EAN не найден в каталоге магазина'

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function detectColumns(headerRow) {
  const normalized = headerRow.map(normalizeHeader)
  const columns = {}

  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    const index = normalized.findIndex((header) => aliases.includes(header))
    if (index >= 0) columns[key] = index
  }

  return columns
}

function parsePrice(value) {
  const normalized = String(value || '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '')
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(parsed)
}

function parseStockStatus(value) {
  const normalized = normalizeHeader(value)
  return STOCK_MAP.get(normalized) || null
}

function normalizeEan(value) {
  return String(value || '').replace(/\D/g, '')
}

function cell(row, index) {
  if (index == null) return ''
  return row[index] ?? ''
}

export function parseCsvLine(line) {
  const cells = []
  let current = ''
  let quoted = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && quoted && next === '"') {
      current += '"'
      i++
    } else if (char === '"') {
      quoted = !quoted
    } else if ((char === ',' || char === ';' || char === '\t') && !quoted) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current.trim())
  return cells
}

export function parseCsv(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine)
}

export function buildRetailImportPreview(rows) {
  if (rows.length < 2) {
    return { rows: [], errors: [{ row: 0, message: 'Файл пустой или без строк товаров' }] }
  }

  const columns = detectColumns(rows[0])
  const errors = []

  if (columns.ean == null) errors.push({ row: 1, message: 'Не найдена колонка EAN/Штрихкод' })
  if (columns.price == null) errors.push({ row: 1, message: 'Не найдена колонка Цена/Price' })
  if (errors.length) return { rows: [], errors }

  const seen = new Set()
  const parsedRows = []

  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2
    const ean = normalizeEan(cell(row, columns.ean))
    const priceKzt = parsePrice(cell(row, columns.price))
    const stockValue = String(cell(row, columns.stockStatus)).trim()
    const stockStatus = stockValue ? parseStockStatus(stockValue) : 'in_stock'
    const shelfZone = String(cell(row, columns.shelfZone) || '').trim()
    const localName = String(cell(row, columns.localName) || '').trim()

    if (!ean) {
      errors.push({ row: rowNumber, message: 'Пустой EAN' })
      return
    }
    if (ean.length < 8 || ean.length > 14) {
      errors.push({ row: rowNumber, ean, message: 'EAN должен содержать 8-14 цифр' })
      return
    }
    if (seen.has(ean)) {
      errors.push({ row: rowNumber, ean, message: 'Дубликат EAN в файле' })
      return
    }
    if (!priceKzt) {
      errors.push({ row: rowNumber, ean, message: 'Некорректная цена' })
      return
    }
    if (!stockStatus) {
      errors.push({ row: rowNumber, ean, code: 'invalid_stock_status', message: 'Некорректный статус наличия' })
      return
    }

    seen.add(ean)
    parsedRows.push({ rowNumber, ean, priceKzt, stockStatus, shelfZone, localName })
  })

  return { rows: parsedRows, errors }
}

export function buildRetailImportTemplateRows() {
  return [
    ['EAN', 'Цена', 'Наличие', 'Полка', 'Название'],
    ['4870201234567', 1290, 'в наличии', 'Ряд A / Полка 1', 'Пример товара'],
  ]
}

export function partitionRetailImportRows(rows, existing) {
  const knownRows = []
  const unknownRows = []

  rows.forEach((row) => {
    if (existing.has(row.ean)) {
      knownRows.push(row)
      return
    }
    unknownRows.push({ ...row, reason: UNKNOWN_EAN_REASON })
  })

  return { knownRows, unknownRows }
}
