import test from 'node:test'
import assert from 'node:assert/strict'
import { preloadCatalogImages } from '../../src/domain/catalog/catalogImageWarmup.js'

test('catalog artwork is decoded before navigation and reused across repeated warmups', async () => {
  const originalImage = globalThis.Image
  const requested = []
  const decoded = []
  globalThis.Image = class {
    set src(value) {
      this.url = value
      requested.push(value)
      queueMicrotask(() => this.onload())
    }
    async decode() {
      decoded.push(this.url)
    }
  }
  try {
    await Promise.all([preloadCatalogImages(6), preloadCatalogImages(6)])
    assert.equal(new Set(requested).size, 6)
    assert.equal(requested.length, 6)
    assert.equal(decoded.length, 6)
    await preloadCatalogImages(18)
    assert.equal(requested.length, 18)
    await preloadCatalogImages(18)
    assert.equal(requested.length, 18)
  } finally {
    globalThis.Image = originalImage
  }
})

test('a failed background image can be retried on the next warmup', async () => {
  const { preloadCatalogImages: retryWarmup } =
    await import('../../src/domain/catalog/catalogImageWarmup.js?retry')
  const originalImage = globalThis.Image
  let attempts = 0
  globalThis.Image = class {
    set src(_value) {
      attempts += 1
      queueMicrotask(() => (attempts === 1 ? this.onerror() : this.onload()))
    }
    async decode() {}
  }
  try {
    await retryWarmup(1)
    await retryWarmup(1)
    assert.equal(attempts, 2)
    await retryWarmup(1)
    assert.equal(attempts, 2)
  } finally {
    globalThis.Image = originalImage
  }
})
