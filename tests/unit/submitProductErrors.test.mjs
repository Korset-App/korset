/* global process, console, Buffer */
import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { envelope } from '../helpers/integrationFixtures.mjs'

const originalUrl = process.env.SUPABASE_URL
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const clientUrl = 'data:text/javascript,' + encodeURIComponent(`
  export const state = { result: null, exception: null, writes: [], uploads: [], uploadError: null, uploadException: null, publicUrl: 'https://images.test/photo.jpg' };
  export function createClient() {
    return { storage: { from() { return {
      async upload(path, bytes, options) { state.uploads.push({ path, bytes, options }); if (state.uploadException) throw state.uploadException; return { error: state.uploadError }; },
      getPublicUrl() { return { data: { publicUrl: state.publicUrl } }; }
    }; } }, from() { return {
      insert(value) { state.writes.push(value); return this; },
      select() { return this; },
      async single() { if (state.exception) throw state.exception; return state.result; }
    }; } };
  }
`)
const monitoringUrl = 'data:text/javascript,' + encodeURIComponent(`
  export function getRateLimitKey() { return 'test-only'; }
  export function checkRateLimit() { return { allowed: true }; }
`)
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.endsWith('/api/submit-product.js')) {
      if (specifier === '@supabase/supabase-js') return { url: clientUrl, shortCircuit: true }
      if (specifier === '../src/lib/monitoring.js') return { url: monitoringUrl, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})
const { default: handler } = await import('../../api/submit-product.js')
hook.deregister()
const { state } = await import(clientUrl)

afterEach(() => {
  for (const [name, value] of [['SUPABASE_URL', originalUrl], ['SUPABASE_SERVICE_ROLE_KEY', originalKey]]) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
})

async function submit(t, { result = { data: { id: 'test-event' }, error: null }, exception, configured = true, ean = envelope().items[0].barcodes[0].value, body = {}, uploadError = null, uploadException = null, publicUrl = 'https://images.test/photo.jpg' } = {}) {
  process.env.SUPABASE_URL = 'https://submission-test.invalid'
  if (configured) process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-not-a-secret'
  else delete process.env.SUPABASE_SERVICE_ROLE_KEY
  state.result = result
  state.exception = exception
  state.writes = []
  state.uploads = []
  state.uploadError = uploadError
  state.uploadException = uploadException
  state.publicUrl = publicUrl
  t.mock.method(console, 'log', () => {})
  t.mock.method(console, 'error', () => {})
  const response = {
    statusCode: null,
    headers: null,
    body: null,
    status(code) { this.statusCode = code; return this },
    set(headers) { this.headers = headers; return this },
    json(body) { this.body = body; return this },
  }
  await handler({ method: 'POST', headers: { origin: 'https://korset.app' }, body: { ean, ...body } }, response)
  return response
}

test('submission database failures do not expose schema details or database codes', async (t) => {
  const response = await submit(t, { result: { data: null, error: {
    code: '23503', message: 'private_schema.internal_table rejects private-column',
    hint: 'private tenant identifier: secret-test-sentinel',
  } } })
  assert.equal(response.statusCode, 500)
  assert.equal(response.body.errorCode, 'DB_INSERT_FAILED')
  assert.equal(Object.hasOwn(response.body, 'hint'), false)
  assert.doesNotMatch(JSON.stringify(response.body), /private|23503|secret-test-sentinel/)
  assert.equal(response.headers['Access-Control-Allow-Origin'], 'https://korset.app')
})

test('unexpected submission exceptions remain private', async (t) => {
  const response = await submit(t, { exception: new Error('secret-test-sentinel at internal-host') })
  assert.equal(response.statusCode, 500)
  assert.equal(response.body.errorCode, 'EXCEPTION')
  assert.doesNotMatch(JSON.stringify(response.body), /secret-test-sentinel|internal-host/)
})

test('unavailable submission configuration does not name server credentials', async (t) => {
  const response = await submit(t, { configured: false })
  assert.equal(response.statusCode, 500)
  assert.equal(response.body.errorCode, 'MISSING_ENV')
  assert.doesNotMatch(response.body.error, /SUPABASE|SERVICE_ROLE|KEY/)
  assert.equal(state.writes.length, 0)
})

test('successful submissions preserve their public response', async (t) => {
  const response = await submit(t, { result: { data: { id: 'test-event' }, error: null } })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body, { ok: true, id: 'test-event', photoUrls: [] })
  assert.equal(state.writes[0].ean, envelope().items[0].barcodes[0].value)
})

test('invalid submission input still stops before any write', async (t) => {
  const response = await submit(t, { ean: 'invalid-test-input' })
  assert.equal(response.statusCode, 400)
  assert.equal(response.body.errorCode, 'INVALID_EAN')
  assert.equal(state.writes.length, 0)
})

const jpeg = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64')

test('rejects invalid submission types before uploads or writes', async (t) => {
  const response = await submit(t, { body: { type: 'unexpected', images: [jpeg] } })
  assert.equal(response.statusCode, 400)
  assert.equal(response.body.errorCode, 'INVALID_TYPE')
  assert.equal(state.uploads.length, 0)
  assert.equal(state.writes.length, 0)
})

test('rejects more than five photos without silently dropping the sixth', async (t) => {
  const response = await submit(t, { body: { images: Array(6).fill(jpeg) } })
  assert.equal(response.body.errorCode, 'INVALID_IMAGES')
  assert.equal(state.uploads.length, 0)
  assert.equal(state.writes.length, 0)
})

test('rejects SVG and oversized photos before any upload', async (t) => {
  for (const image of [
    'data:image/svg+xml;base64,' + Buffer.from('<svg/>').toString('base64'),
    'data:image/png;base64,' + Buffer.alloc(3 * 1024 * 1024 + 1).toString('base64'),
  ]) {
    const response = await submit(t, { body: { images: [image] } })
    assert.equal(response.statusCode, 400)
    assert.equal(response.body.errorCode, 'INVALID_IMAGES')
    assert.equal(state.uploads.length, 0)
    assert.equal(state.writes.length, 0)
  }
})

test('failed photo upload cannot produce a successful submission', async (t) => {
  const response = await submit(t, { body: { images: [jpeg] }, uploadError: { message: 'private bucket secret' } })
  assert.equal(response.statusCode, 500)
  assert.equal(response.body.errorCode, 'PHOTO_UPLOAD_FAILED')
  assert.doesNotMatch(JSON.stringify(response.body), /private bucket secret/)
  assert.equal(state.writes.length, 0)
})

test('thrown photo upload error cannot leak internal details or save an event', async (t) => {
  const response = await submit(t, { body: { images: [jpeg] }, uploadException: new Error('private bucket secret') })
  assert.equal(response.statusCode, 500)
  assert.equal(response.body.errorCode, 'PHOTO_UPLOAD_FAILED')
  assert.doesNotMatch(JSON.stringify(response.body), /private bucket secret/)
  assert.equal(state.writes.length, 0)
})

test('missing public URL is reported as a failed photo upload', async (t) => {
  const response = await submit(t, { body: { images: [jpeg] }, publicUrl: null })
  assert.equal(response.statusCode, 500)
  assert.equal(response.body.errorCode, 'PHOTO_UPLOAD_FAILED')
  assert.equal(state.writes.length, 0)
})

test('successful photo upload returns its URL and preserves submitted fields', async (t) => {
  const response = await submit(t, { result: { data: { id: 'test-event' }, error: null }, body: {
    type: 'correction', reason: 'wrong_image', comment: 'Better image', images: [jpeg],
    shownEan: envelope().items[0].barcodes[0].value,
  } })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body, { ok: true, id: 'test-event', photoUrls: ['https://images.test/photo.jpg'] })
  assert.equal(state.writes[0].reason, 'wrong_image')
  assert.equal(state.writes[0].context, 'product_card')
  assert.equal(state.writes[0].metadata_json.photo_urls.length, 1)
})

test('two submissions at the same timestamp use distinct photo paths without overwrite', async (t) => {
  t.mock.method(Date, 'now', () => 123456789)
  const first = await submit(t, { body: { images: [jpeg] } })
  assert.equal(first.statusCode, 200)
  const firstUpload = state.uploads[0]
  const second = await submit(t, { body: { images: [jpeg] } })
  assert.equal(second.statusCode, 200)
  const secondUpload = state.uploads[0]
  assert.notEqual(firstUpload.path, secondUpload.path)
  assert.equal(firstUpload.options.upsert, false)
  assert.equal(secondUpload.options.upsert, false)
})
