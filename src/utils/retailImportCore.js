const HEADER_ALIASES = {
  ean: ['ean', 'barcode', 'bar code', 'штрихкод', 'штрих код', 'штк'],
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
  const text = String(value ?? '').trim().replace(/\s/gu, ' ')
  if (!/^(?:\d+|\d{1,3}(?: \d{3})+)(?:[.,]0{1,2})?(?: ?(?:₸|тг|тенге|KZT))?$/iu.test(text)) return null
  const normalized = text.replace(/(?:₸|тг|тенге|KZT)$/iu, '').replace(/ /g, '').replace(',', '.')
  const parsed = Number(normalized)
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > 2147483647) return null
  return parsed
}

function parseStockStatus(value) {
  const normalized = normalizeHeader(value)
  return STOCK_MAP.get(normalized) || null
}

function normalizeEan(value) {
  return String(value ?? '').trim()
}

function cell(row, index) {
  if (index == null) return ''
  return row[index] ?? ''
}

function detectDelimiter(line) {
  const counts = new Map([[';', 0], [',', 0], ['\t', 0]])
  let quoted = false
  for (let index = 0; index < line.length; index++) {
    if (line[index] === '"') {
      if (quoted && line[index + 1] === '"') index++
      else quoted = !quoted
    } else if (!quoted && counts.has(line[index])) counts.set(line[index], counts.get(line[index]) + 1)
  }
  return [...counts].sort((left, right) => right[1] - left[1])[0][0]
}

export function parseCsvLine(line, delimiter = detectDelimiter(line)) {
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
    } else if (char === delimiter && !quoted) {
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
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const delimiter = detectDelimiter(lines[0] || '')
  return lines.map((line) => parseCsvLine(line, delimiter))
}

export function buildRetailImportPreview(rows) {
  if (rows.length < 2) {
    return { rows: [], errors: [{ row: 0, message: 'Файл пустой или без строк товаров' }] }
  }

  const columns = detectColumns(rows[0])
  const errors = []

  if (columns.ean == null) errors.push({ row: 1, code: 'missing_ean_column', message: 'Не найдена колонка EAN/Штрихкод' })
  if (columns.price == null) errors.push({ row: 1, code: 'missing_price_column', message: 'Не найдена колонка Цена/Price' })
  if (errors.length) return { rows: [], errors }

  const eanCounts = new Map()
  for (const row of rows.slice(1)) {
    const ean = normalizeEan(cell(row, columns.ean))
    eanCounts.set(ean, (eanCounts.get(ean) || 0) + 1)
  }
  const parsedRows = []

  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2
    const eanValue = cell(row, columns.ean)
    const ean = normalizeEan(cell(row, columns.ean))
    const priceKzt = parsePrice(cell(row, columns.price))
    const stockValue = String(cell(row, columns.stockStatus)).trim()
    const stockStatus = stockValue ? parseStockStatus(stockValue) : null
    const shelfZone = String(cell(row, columns.shelfZone) || '').trim()
    const localName = String(cell(row, columns.localName) || '').trim()

    if (typeof eanValue !== 'string' && eanValue != null && eanValue !== '') {
      errors.push({ row: rowNumber, ean, code: 'non_text_ean', message: 'Штрихкод должен храниться как текст' })
      return
    }

    if (!ean) {
      errors.push({ row: rowNumber, message: 'Пустой EAN' })
      return
    }
    if (!/^\d{8,14}$/.test(ean)) {
      errors.push({ row: rowNumber, ean, code: 'invalid_ean', message: 'EAN должен содержать 8-14 цифр' })
      return
    }
    if (eanCounts.get(ean) > 1) {
      errors.push({ row: rowNumber, ean, code: 'duplicate_ean', message: 'Дубликат EAN в файле' })
      return
    }
    if (!priceKzt) {
      errors.push({ row: rowNumber, ean, code: 'invalid_price', message: 'Некорректная цена' })
      return
    }
    if (!stockStatus) {
      errors.push({ row: rowNumber, ean, code: stockValue ? 'invalid_stock_status' : 'missing_stock_status', message: stockValue ? 'Некорректный статус наличия' : 'Не указано наличие' })
      return
    }

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
