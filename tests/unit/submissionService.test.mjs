import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

const imageUrl = 'data:image/jpeg;base64,/9j/2Q=='
const imageModule = 'data:text/javascript,' + encodeURIComponent(`
  export const state = { compressed: [], encoded: [], failFor: null };
  export async function compressSubmissionPhoto(file) { state.compressed.push(file); if (file === state.failFor) throw new Error('private decoder detail'); return { type: 'image/jpeg' }; }
  export async function blobToDataUrl(blob) { state.encoded.push(blob); return '${imageUrl}'; }
`)
const identityModule = 'data:text/javascript,export function getOrCreateClientToken() { return "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }'
const supabaseModule = 'data:text/javascript,export const supabase = new Proxy({}, { get() { throw new Error("Direct Supabase access") } })'
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.endsWith('/src/domain/product/submissionService.js')) {
      if (specifier === '../../utils/imageCompress.js') return { url: imageModule, shortCircuit: true }
      if (specifier === '../../utils/userIdentity.js') return { url: identityModule, shortCircuit: true }
      if (specifier === '../../utils/supabase.js') return { url: supabaseModule, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})
const { submitProductData } = await import('../../src/domain/product/submissionService.js')
hook.deregister()
const { state } = await import(imageModule)

const EAN = '4870201234567'
const shownProductId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

test('exact EAN rejects arbitrary characters without creating another barcode', async (t) => {
  let called = false
  t.mock.method(globalThis, 'fetch', async () => { called = true; throw new Error('Unexpected fetch') })
  const result = await submitProductData({ ean: `x${EAN}` })
  assert.equal(result.errorCode, 'INVALID_EAN')
  assert.equal(called, false)
})

test('submits compressed photos and all context through the server endpoint', async (t) => {
  const file = { name: 'front.png', type: 'image/png' }
  const steps = []
  let request
  state.compressed = []
  state.encoded = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    request = { url, options }
    return { ok: true, async json() { return { ok: true, id: 'event-1', photoUrls: ['https://images.test/front.jpg'] } } }
  })
  const result = await submitProductData({
    ean: EAN, storeSlug: 'mars', type: 'correction', reason: 'wrong_image', comment: 'Check image',
    priceKzt: 1200, shownEan: EAN, shownProductId, shownProductName: 'Previous',
    files: [file], onProgress: (step) => steps.push(step),
  })
  assert.deepEqual(result, { ok: true, id: 'event-1', photoUrls: ['https://images.test/front.jpg'] })
  assert.equal(request.url, '/api/submit-product')
  assert.equal(request.options.method, 'POST')
  const body = JSON.parse(request.options.body)
  assert.equal(body.ean, EAN)
  assert.equal(body.storeSlug, 'mars')
  assert.equal(body.type, 'correction')
  assert.equal(body.reason, 'wrong_image')
  assert.equal(body.comment, 'Check image')
  assert.equal(body.priceKzt, 1200)
  assert.equal(body.shownEan, EAN)
  assert.equal(body.shownProductId, shownProductId)
  assert.equal(body.shownProductName, 'Previous')
  assert.deepEqual(body.images, [{ label: 'front', dataUrl: imageUrl }])
  assert.deepEqual(state.compressed, [file])
  assert.equal(state.encoded.length, 1)
  assert.deepEqual(steps, ['compressing', 'uploading', 'done'])
})

test('server error is returned with its stable code without leaking details', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: false,
    async json() { return { error: 'Unable to upload photos', errorCode: 'PHOTO_UPLOAD_FAILED' } },
  }))
  const result = await submitProductData({ ean: EAN })
  assert.deepEqual(result, { ok: false, error: 'Unable to upload photos', errorCode: 'PHOTO_UPLOAD_FAILED' })
})

test('decodable image MIME values are sent after JPEG compression', async (t) => {
  const files = [
    { name: 'camera.heic', type: 'image/heic' },
    { name: 'animation.gif', type: 'image/gif' },
    { name: 'unknown', type: '' },
  ]
  let body
  state.compressed = []
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    body = JSON.parse(options.body)
    return { ok: true, async json() { return { ok: true, id: 'event-2', photoUrls: [] } } }
  })
  const result = await submitProductData({ ean: EAN, files })
  assert.equal(result.ok, true)
  assert.deepEqual(state.compressed, files)
  assert.equal(body.images.length, files.length)
  assert.ok(body.images.every((image) => image.dataUrl === imageUrl))
})

test('non-image and SVG source types stop before compression or POST', async (t) => {
  let called = false
  state.compressed = []
  t.mock.method(globalThis, 'fetch', async () => { called = true; throw new Error('Unexpected fetch') })
  for (const type of ['text/plain', 'image/svg+xml']) {
    const result = await submitProductData({ ean: EAN, files: [{ type }] })
    assert.equal(result.errorCode, 'INVALID_IMAGES')
  }
  assert.equal(called, false)
  assert.deepEqual(state.compressed, [])
})

test('compression failure stops before any request and keeps a stable error code', async (t) => {
  const file = { name: 'broken.heic', type: 'image/heic' }
  state.compressed = []
  state.failFor = file
  let called = false
  t.mock.method(globalThis, 'fetch', async () => { called = true; throw new Error('Unexpected fetch') })
  const result = await submitProductData({ ean: EAN, files: [file] })
  assert.equal(result.ok, false)
  assert.equal(result.errorCode, 'COMPRESS_FAILED')
  assert.equal(result.error, 'compress_failed')
  assert.equal(called, false)
  assert.deepEqual(state.compressed, [file])
  state.failFor = null
})
