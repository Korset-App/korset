import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildConstraintLadder,
  isPermissionError,
  prefetchScannerEngine,
} from '../../src/utils/scannerEngine.js'
import * as cameraEngine from '../../src/utils/scannerEngine.js'

test('front camera constraints never fall back to another rear lens', () => {
  const ladder = buildConstraintLadder(null, 'user')
  assert.ok(ladder.length > 0)
  for (const constraints of ladder) {
    assert.equal(constraints.facingMode?.exact || constraints.facingMode, 'user')
  }
})

test('camera choices contain one main rear camera and one front camera', () => {
  assert.equal(typeof cameraEngine.selectFacingCamera, 'function')
  const devices = [
    { deviceId: 'ultra', label: 'Back Ultra Wide Camera' },
    { deviceId: 'tele', label: 'Back Telephoto Camera' },
    { deviceId: 'main', label: 'Back Camera' },
    { deviceId: 'front', label: 'Front Camera' },
  ]
  assert.equal(cameraEngine.selectFacingCamera(devices, 'environment').deviceId, 'main')
  assert.equal(cameraEngine.selectFacingCamera(devices, 'user').deviceId, 'front')
  assert.equal(cameraEngine.selectFacingCamera([{ deviceId: 'unknown', label: '' }], 'user'), null)
})

test('enumerating camera choices never opens another capture stream', async () => {
  assert.equal(typeof cameraEngine.enumerateCameraDevices, 'function')
  let captures = 0
  const devices = await cameraEngine.enumerateCameraDevices({
    getUserMedia: async () => { captures += 1 },
    enumerateDevices: async () => [
      { kind: 'audioinput', deviceId: 'mic' },
      { kind: 'videoinput', deviceId: 'camera' },
    ],
  })
  assert.equal(captures, 0)
  assert.deepEqual(devices.map((device) => device.deviceId), ['camera'])
})

test('a rear capture cannot count as a successful front-camera switch', () => {
  assert.equal(typeof cameraEngine.matchesCameraDirection, 'function')
  assert.equal(cameraEngine.matchesCameraDirection({ facingMode: 'environment' }, 'user'), false)
  assert.equal(cameraEngine.matchesCameraDirection({ facingMode: 'user', deviceId: 'front' }, 'user', 'front'), true)
  assert.equal(cameraEngine.matchesCameraDirection({ deviceId: 'rear' }, 'user', 'front'), false)
})

const BANNED_VIDEO_KEYS = new Set([
  'autoGainControl',
  'channelCount',
  'echoCancellation',
  'latency',
  'noiseSuppression',
  'sampleRate',
  'sampleSize',
  'volume',
])

test('constraint ladder always has entries and ends with the fully permissive one', () => {
  const ladder = buildConstraintLadder(null)
  assert.ok(ladder.length >= 4)
  assert.deepStrictEqual(ladder[ladder.length - 1], {})
})

test('constraint ladder prefers a pinned deviceId first', () => {
  const ladder = buildConstraintLadder('abc-123')
  assert.strictEqual(ladder[0].deviceId.exact, 'abc-123')
  assert.strictEqual(ladder[1].deviceId.ideal, 'abc-123')
})

test('constraint ladder covers environment and user fallbacks', () => {
  const modes = buildConstraintLadder(null).map((c) => c.facingMode)
  assert.ok(modes.includes('environment'))
  assert.ok(modes.includes('user'))
})

test('constraint ladder stays valid for html5-qrcode videoConstraints', () => {
  for (const constraints of buildConstraintLadder('abc-123')) {
    assert.strictEqual(typeof constraints, 'object')
    for (const key of Object.keys(constraints)) {
      assert.ok(!BANNED_VIDEO_KEYS.has(key), `${key} must not appear in videoConstraints`)
    }
  }
})

test('permission errors are recognised across browser phrasings', () => {
  for (const message of [
    'NotAllowedError: Permission denied',
    'Permission dismissed',
    'The request is not allowed by the user agent',
    'Camera access denied by system',
  ]) {
    assert.ok(isPermissionError(message), message)
  }
  assert.equal(isPermissionError('camera surface never started playing'), false)
  assert.equal(isPermissionError(''), false)
})

test('prefetch is safe to call repeatedly and never throws synchronously', () => {
  assert.doesNotThrow(() => {
    prefetchScannerEngine()
    prefetchScannerEngine()
  })
})

// Regression guard for the iOS grey-screen incident: `@undecaf/barcode-detector-
// polyfill` imports zbar-wasm from a hard-coded jsDelivr URL, and the
// `korset-local-zbar-wasm` plugin in vite.config.js is what rewrites it to the
// local package. If this fails, camera startup is once again hostage to a
// third-party CDN on slow or filtered networks.
test('built bundle contains no module imports from a third-party CDN', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  const distDir = path.join(root, 'dist')
  if (!fs.existsSync(distDir)) return // dist is not built in every environment

  const offenders = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.js')) {
        const source = fs.readFileSync(full, 'utf8')
        const matches = source.match(
          /(?:from\s*|import\(\s*)["'](https:\/\/[^"']*(?:jsdelivr|unpkg|cdnjs)[^"']*)["']/g
        )
        if (matches) offenders.push(`${entry.name}: ${matches.join(', ')}`)
      }
    }
  }
  walk(distDir)
  assert.deepStrictEqual(offenders, [], 'runtime CDN imports found in dist')
})
