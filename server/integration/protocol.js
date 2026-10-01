import { createHash, randomBytes } from 'node:crypto'

export const MAX_BATCH_ITEMS = 200
export const MAX_BODY_BYTES = 1024 * 1024
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const OPERATIONS = new Set(['upsert', 'dry_run', 'heartbeat', 'snapshot_begin', 'snapshot_complete', 'snapshot_abort'])

export class IntegrationError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status }
}

function requireValue(condition, code = 'INVALID_PAYLOAD') {
  if (!condition) throw new IntegrationError(code)
}

function object(value, keys) {
  requireValue(value && typeof value === 'object' && !Array.isArray(value))
  requireValue(Object.keys(value).every((key) => keys.includes(key)), 'UNSUPPORTED_FIELD')
}

function text(value, max = 128, empty = false) {
  requireValue(typeof value === 'string' && value.length <= max && (empty || value.length > 0) && !/[\u0000-\u001f]/.test(value))
  return value
}

function integer(value, max = Number.MAX_SAFE_INTEGER, min = 1) {
  requireValue(Number.isSafeInteger(value) && value >= min && value <= max)
  return value
}

function timestamp(value) {
  if (value == null) return null
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value), 'INVALID_PROMOTION')
  const date = new Date(value)
  requireValue(Number.isFinite(date.getTime()) && date.toISOString().replace('.000Z', 'Z') === value.replace('.000Z', 'Z'), 'INVALID_PROMOTION')
  return date.toISOString()
}

function barcode(value) {
  object(value, ['value', 'kind'])
  requireValue(typeof value.value === 'string', 'INVALID_BARCODE')
  requireValue(['gtin', 'local'].includes(value.kind), 'INVALID_BARCODE')
  text(value.value, 64)
  if (value.kind === 'gtin') {
    requireValue(/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value.value), 'INVALID_BARCODE')
    const digits = [...value.value].map(Number)
    const last = digits.pop()
    const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0)
    requireValue((10 - sum % 10) % 10 === last, 'INVALID_BARCODE')
    requireValue(!(value.value.length === 13 && /^2/.test(value.value)), 'LOCAL_BARCODE_REQUIRED')
  }
  return { value: value.value, kind: value.kind }
}

function price(value) {
  object(value, ['regular_minor', 'sale_minor', 'valid_from', 'valid_until'])
  const regular = value.regular_minor == null ? null : integer(value.regular_minor, 214748364700)
  const sale = value.sale_minor == null ? null : integer(value.sale_minor, 214748364700)
  const from = timestamp(value.valid_from)
  const until = timestamp(value.valid_until)
  requireValue(sale == null || (regular != null && sale < regular && from && until && from < until), 'INVALID_PROMOTION')
  requireValue(sale != null || (!from && !until), 'INVALID_PROMOTION')
  return { regular_minor: regular, sale_minor: sale, valid_from: from, valid_until: until }
}

function item(value) {
  object(value, ['external_id', 'variant_id', 'unit_id', 'name', 'barcodes', 'active', 'revision', 'price', 'stock'])
  requireValue(Array.isArray(value.barcodes) && value.barcodes.length <= 20)
  const codes = value.barcodes.map(barcode)
  requireValue(new Set(codes.map((code) => `${code.kind}:${code.value}`)).size === codes.length, 'DUPLICATE_BARCODE')
  object(value.stock, ['quantity', 'unit'])
  requireValue(['piece', 'kg', 'g', 'l', 'ml'].includes(value.stock.unit))
  const quantity = value.stock.quantity ?? null
  requireValue(quantity === null || (typeof quantity === 'string' && /^-?\d{1,12}(?:\.\d{1,6})?$/.test(quantity)), 'INVALID_STOCK')
  requireValue(typeof value.active === 'boolean')
  return { external_id: text(value.external_id), variant_id: text(value.variant_id ?? '', 128, true),
    unit_id: text(value.unit_id ?? 'unit'), name: text(value.name, 500), barcodes: codes,
    active: value.active, revision: integer(value.revision), price: price(value.price),
    stock: { quantity, unit: value.stock.unit } }
}

export function normalizeEnvelope(value) {
  object(value, ['protocol_version', 'request_id', 'operation', 'source_instance_id', 'sequence', 'connector_version', 'snapshot_id', 'expected_count', 'items'])
  requireValue(value.protocol_version === 1, 'UNSUPPORTED_PROTOCOL')
  requireValue(typeof value.request_id === 'string' && UUID.test(value.request_id))
  requireValue(OPERATIONS.has(value.operation))
  requireValue(typeof value.connector_version === 'string' && /^1\.\d{1,3}\.\d{1,3}$/.test(value.connector_version), 'UNSUPPORTED_CONNECTOR')
  const snapshotId = value.snapshot_id ?? null
  requireValue(snapshotId == null || (typeof snapshotId === 'string' && UUID.test(snapshotId)))
  const expected = value.expected_count ?? null
  if (expected !== null) integer(expected, 100000, 0)
  const items = value.items ?? []
  requireValue(Array.isArray(items) && items.length <= MAX_BATCH_ITEMS, 'BATCH_TOO_LARGE')
  requireValue(['upsert', 'dry_run'].includes(value.operation) ? items.length > 0 : items.length === 0)
  if (['snapshot_begin', 'snapshot_complete', 'snapshot_abort'].includes(value.operation)) requireValue(snapshotId !== null)
  if (value.operation === 'snapshot_begin') requireValue(expected !== null)
  else requireValue(expected === null)
  if (['heartbeat', 'dry_run'].includes(value.operation)) requireValue(snapshotId === null)
  const normalizedItems = items.map(item)
  const identities = normalizedItems.map((row) => JSON.stringify([row.external_id, row.variant_id, row.unit_id]))
  requireValue(new Set(identities).size === identities.length, 'DUPLICATE_IDENTITY')
  return { protocol_version: 1, request_id: value.request_id.toLowerCase(), operation: value.operation,
    source_instance_id: text(value.source_instance_id), sequence: integer(value.sequence),
    connector_version: value.connector_version, snapshot_id: snapshotId?.toLowerCase() ?? null,
    expected_count: expected, items: normalizedItems }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
  return value
}

export function envelopeHash(value) { return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex') }
export function issueConnectorToken() { return `krt1_${randomBytes(32).toString('hex')}` }
export function tokenHash(value) {
  requireValue(typeof value === 'string' && /^krt1_[a-f0-9]{64}$/.test(value), 'INVALID_TOKEN')
  return createHash('sha256').update(value).digest('hex')
}
