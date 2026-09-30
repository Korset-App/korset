// Scanner engine loading for the barcode scanner.
//
// Two production constraints drive this module:
//
// 1. Camera start must never await the network. WebKit (iOS Safari and every
//    other iOS browser) only unlocks programmatic media playback while the user
//    activation from the tap is still fresh. Any slow import sitting between the
//    tap and `getUserMedia()` can leave the viewfinder permanently grey.
//
// 2. The decoder has to be self-hosted. `@undecaf/barcode-detector-polyfill`
//    imports zbar-wasm from a hard-coded jsDelivr URL; `korset-local-zbar-wasm`
//    in vite.config.js rewrites that to the local package so the WASM is bundled
//    and precached instead of fetched from a third party at scan time.
//
// The WASM decoder is therefore loaded opportunistically and only used when it
// is already there. ZXing (bundled inside html5-qrcode) is always the fallback.

const ZBAR_WAIT_MS = 1500

// html5-qrcode rejects anything but `facingMode: string | { exact }` and
// `deviceId: string | { exact }` when it builds constraints itself. Supplying
// `videoConstraints` in the scan config bypasses that path and lets us try a
// ladder of increasingly permissive constraints without throwing.
export function buildConstraintLadder(deviceId) {
  const hd = { width: { ideal: 1280 }, height: { ideal: 720 } }
  const ladder = []
  if (deviceId) {
    ladder.push({ deviceId: { exact: deviceId }, ...hd })
    ladder.push({ deviceId: { ideal: deviceId } })
  }
  ladder.push({ facingMode: 'environment', ...hd })
  ladder.push({ facingMode: 'environment' })
  // Some Android shells (MIUI/HyperOS among them) report no `environment` camera.
  ladder.push({ facingMode: 'user', ...hd })
  ladder.push({ ...hd })
  ladder.push({})
  return ladder
}

// getUserMedia failures worth surfacing as a permission problem rather than a
// generic camera error.
export function isPermissionError(message) {
  return /permission|not allowed|denied|notallowed|security/i.test(String(message || ''))
}

let html5Promise = null
let zbarPromise = null

function withTimeout(promise, ms, fallback) {
  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      resolve(fallback)
    }, ms)
    promise.then(
      (value) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(fallback)
      }
    )
  })
}

export function hasBarcodeDetector() {
  return typeof window !== 'undefined' && typeof window.BarcodeDetector !== 'undefined'
}

function loadZbar() {
  if (zbarPromise) return zbarPromise
  if (hasBarcodeDetector()) {
    zbarPromise = Promise.resolve(true)
    return zbarPromise
  }
  zbarPromise = import('@undecaf/barcode-detector-polyfill')
    .then((mod) => {
      const Polyfill = mod?.BarcodeDetectorPolyfill
      if (!Polyfill) return false
      if (!hasBarcodeDetector()) window.BarcodeDetector = Polyfill
      return true
    })
    .catch(() => false)
  return zbarPromise
}

function loadHtml5() {
  if (!html5Promise) html5Promise = import('html5-qrcode')
  return html5Promise
}

// Warm both modules ahead of the tap that opens the scanner. Safe to call often.
export function prefetchScannerEngine() {
  loadHtml5()
  loadZbar()
}

export async function loadScannerEngine({ zbarWaitMs = ZBAR_WAIT_MS } = {}) {
  const [html5, zbarReady] = await Promise.all([
    loadHtml5(),
    withTimeout(loadZbar(), zbarWaitMs, false),
  ])
  return {
    Html5Qrcode: html5.Html5Qrcode,
    Html5QrcodeSupportedFormats: html5.Html5QrcodeSupportedFormats,
    zbarReady: zbarReady === true || hasBarcodeDetector(),
  }
}
