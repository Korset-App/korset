// vite.config.js rewrites the polyfill's external WASM import to the bundled,
// precached decoder. ZXing inside html5-qrcode remains the loading fallback.

const ZBAR_WAIT_MS = 1500

// html5-qrcode rejects anything but `facingMode: string | { exact }` and
// `deviceId: string | { exact }` when it builds constraints itself. Supplying
// `videoConstraints` in the scan config bypasses that path and lets us try a
// ladder of increasingly permissive constraints without throwing.
export function buildConstraintLadder(deviceId, facingMode = null) {
  const hd = { width: { ideal: 1280 }, height: { ideal: 720 } }
  const ladder = []
  if (deviceId) {
    ladder.push({ deviceId: { exact: deviceId }, ...hd })
    if (!facingMode) ladder.push({ deviceId: { ideal: deviceId } })
  }
  if (facingMode) {
    ladder.push({ facingMode: { exact: facingMode }, ...hd })
    ladder.push({ facingMode, ...hd })
    ladder.push({ facingMode })
    return ladder
  }
  ladder.push({ facingMode: 'environment', ...hd })
  ladder.push({ facingMode: 'environment' })
  // Some Android shells (MIUI/HyperOS among them) report no `environment` camera.
  ladder.push({ facingMode: 'user', ...hd })
  ladder.push({ ...hd })
  ladder.push({})
  return ladder
}

export async function enumerateCameraDevices(mediaDevices = globalThis.navigator?.mediaDevices) {
  try {
    return ((await mediaDevices?.enumerateDevices()) || []).filter(
      (device) => device.kind === 'videoinput'
    )
  } catch {
    return []
  }
}

export function selectFacingCamera(devices, facingMode) {
  const front = /front|user|facetime|передн|фронт|алдыңғы/i
  const rear = /back|rear|environment|задн|тыльн|сзади|основн|артқы|негізгі/i
  const auxiliary = /ultra|tele|macro|depth|infrared|ультра|теле|макро|глубин/i
  return (
    devices.find((device) => {
      const label = device.label || ''
      return facingMode === 'user'
        ? front.test(label) && !auxiliary.test(label)
        : rear.test(label) && !front.test(label) && !auxiliary.test(label)
    }) || null
  )
}

export function matchesCameraDirection(settings = {}, facingMode, deviceId = null) {
  if (settings.facingMode && settings.facingMode !== facingMode) return false
  if (deviceId && settings.deviceId && settings.deviceId !== deviceId) return false
  return true
}

let cameraSurfaceSequence = 0
let cameraCaptureQueue = Promise.resolve()

export function createCameraController({ getSurface = () => null, startTimeoutMs = 15000 } = {}) {
  let generation = 0
  let active = null
  let queue = Promise.resolve()
  const stoppedTracks = new WeakSet()

  const stopTracks = (stream) =>
    stream?.getTracks().forEach((track) => {
      if (!stoppedTracks.has(track) && track.readyState !== 'ended') {
        stoppedTracks.add(track)
        track.stop()
      }
    })
  const release = async (session, late = false) => {
    if (!session || (session.released && !late)) return
    const alreadyReleased = session.released
    session.released = true
    session.cleanups.forEach((cleanup) => cleanup())
    stopTracks(session.stream || session.getVideo()?.srcObject)
    if (!alreadyReleased || session.scanner?.isScanning) {
      await withTimeout(
        Promise.resolve().then(() => session.scanner?.stop()),
        1000,
        null
      )
    }
    try {
      session.scanner?.clear()
    } catch {
      /* noop */
    }
    session.surface?.remove?.()
    if (active === session) active = null
  }
  const enqueue = (operation) => {
    const result = queue.then(operation)
    queue = result.catch(() => {})
    return result
  }
  const cancelActive = () => {
    active?.cleanups.forEach((cleanup) => cleanup())
    active?.cancel()
  }

  return {
    start(operation, surface = getSurface()) {
      const ticket = ++generation
      const host = surface
      cancelActive()
      return enqueue(async () => {
        await release(active)
        if (ticket !== generation) return
        let cancel
        const cancelled = new Promise((resolve) => {
          cancel = () => resolve('cancelled')
        })
        const session = {
          scanner: null,
          stream: null,
          surface: host?.ownerDocument ? null : host,
          cleanups: [],
          released: false,
          cancel,
          isCurrent: () => ticket === generation && active === session && !session.released,
          getVideo: () => session.surface?.querySelector('video') || null,
          setScanner(scanner) {
            session.scanner = scanner
          },
          setStream(stream) {
            session.stream = stream
            if (!session.isCurrent()) stopTracks(stream)
          },
          addCleanup(cleanup) {
            session.cleanups.push(cleanup)
          },
          startCapture(operation) {
            // getUserMedia cannot be aborted; a cancelled permission request
            // must settle before another screen can acquire the camera.
            const result = cameraCaptureQueue.then(() => {
              if (session.isCurrent()) return operation()
            })
            cameraCaptureQueue = result.catch(() => {})
            return result
          },
          async releaseCamera() {
            await release(session)
            if (ticket !== generation) return
            session.released = false
            session.scanner = null
            session.stream = null
            session.cleanups = []
            if (ticket === generation) {
              active = session
              if (host?.ownerDocument) {
                session.surface = host.ownerDocument.createElement('div')
                session.surface.id = 'korset-camera-' + ++cameraSurfaceSequence
                session.surface.style.height = '100%'
                host.appendChild(session.surface)
              } else session.surface = host
            }
          },
        }
        active = session
        const work = Promise.resolve().then(() => operation(session))
        work
          .then(
            () => {
              if (!session.isCurrent()) return release(session, true)
            },
            () => {
              if (!session.isCurrent()) return release(session, true)
            }
          )
          .catch(() => {})
        let timer
        try {
          const result = await Promise.race([
            work,
            cancelled,
            new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error('camera start timeout')), startTimeoutMs)
            }),
          ])
          if (!session.isCurrent() || result === 'cancelled') await release(session)
          return result
        } catch (error) {
          const current = ticket === generation
          if (ticket === generation) generation += 1
          await release(session)
          if (current) throw error
        } finally {
          clearTimeout(timer)
        }
      })
    },
    stop() {
      generation += 1
      cancelActive()
      return enqueue(() => release(active))
    },
  }
}

export function patchCameraVideo(video) {
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  video.setAttribute('muted', '')
  video.muted = true
  video.setAttribute('autoplay', '')
}

export function waitForCameraFrames(
  getVideo,
  { timeoutMs = 2500, pollMs = 80, isCurrent = () => true } = {}
) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs
    let lastTime = null
    const check = () => {
      if (!isCurrent()) return resolve(false)
      const video = getVideo()
      if (video) {
        patchCameraVideo(video)
        if (video.readyState >= 2 && video.videoWidth > 0 && !video.paused) {
          if (lastTime !== null && video.currentTime > lastTime) return resolve(true)
          lastTime = video.currentTime
        } else {
          video.play()?.catch(() => {})
        }
      }
      if (Date.now() >= deadline) return resolve(false)
      setTimeout(check, pollMs)
    }
    check()
  })
}

export function watchCameraFrames(
  video,
  track,
  onInterrupted,
  { stallMs = 3000, pollMs = 500 } = {}
) {
  let stopped = false
  let lastTime = video.currentTime
  let lastFrameAt = Date.now()
  const stop = () => {
    stopped = true
    clearInterval(timer)
    track.removeEventListener('ended', interrupt)
  }
  const interrupt = () => {
    if (stopped) return
    stop()
    onInterrupted()
  }
  const timer = setInterval(() => {
    if (globalThis.document?.hidden) {
      lastFrameAt = Date.now()
      return
    }
    if (video.currentTime > lastTime && !track.muted && !video.paused) {
      lastTime = video.currentTime
      lastFrameAt = Date.now()
    }
    if (track.readyState === 'ended' || Date.now() - lastFrameAt >= stallMs) interrupt()
  }, pollMs)
  track.addEventListener('ended', interrupt)
  return stop
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
