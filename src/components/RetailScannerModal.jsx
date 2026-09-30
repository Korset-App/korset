import { useState, useEffect, useRef, useCallback } from 'react'
import { loadSoundSettings } from '../utils/soundSettings.js'
import {
  buildConstraintLadder,
  isPermissionError,
  loadScannerEngine,
} from '../utils/scannerEngine.js'
import {
  BarcodeScannerIcon,
  CloseIcon,
  AlertTriangleIcon,
  CameraIcon,
  SyncIcon,
} from './icons/index.js'

// ── Web Audio beep ─────────────────────────────────────────────────
let _audioCtx = null
function playBeep() {
  if (!loadSoundSettings().sound) return
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const ctx = _audioCtx
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.36)
  } catch {
    /* noop */
  }
}

// ── Main component ─────────────────────────────────────────────────
const SCAN_ID = 'retail-scanner-view'

// iOS WebKit (Safari/Chrome/Yandex on iPhone) and several Android shells
// (MIUI/HyperOS among them) only render an inline camera stream after a fresh
// user tap and with `playsinline`/`muted`/`autoplay` on the <video>. The decoder
// is self-hosted via the `korset-local-zbar-wasm` Vite plugin, so startup must
// never block on the network.
const VIDEO_LIVE_TIMEOUT_MS = 2000
const CAMERA_WATCHDOG_MS = 4000

// getUserMedia succeeded but the surface never produced a frame. On iOS that is
// a playback-policy block that only a real tap will clear, not a constraint error.
class CameraSurfaceError extends Error {
  constructor() {
    super('camera surface never started playing')
    this.name = 'CameraSurfaceError'
  }
}

function patchVideoElement(el) {
  try {
    el.setAttribute('playsinline', '')
    el.setAttribute('webkit-playsinline', '')
    el.setAttribute('muted', '')
    el.muted = true
    el.setAttribute('autoplay', '')
  } catch {
    /* noop */
  }
}

// html5-qrcode resolves `start()` before the video actually plays, so verify
// frames arrive instead of trusting the resolved promise.
function waitForVideoLive(timeoutMs) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs
    const check = () => {
      const video = document.querySelector(`#${SCAN_ID} video`)
      if (video) {
        patchVideoElement(video)
        if (video.readyState >= 2 && video.videoWidth > 0 && !video.paused) {
          resolve(true)
          return
        }
        // WebKit regularly swallows the first play() call; retrying is free.
        try {
          const played = video.play()
          if (played && typeof played.catch === 'function') played.catch(() => {})
        } catch {
          /* noop */
        }
      }
      if (Date.now() >= deadline) {
        resolve(false)
        return
      }
      setTimeout(check, 120)
    }
    check()
  })
}

export default function RetailScannerModal({ onScan, onClose }) {
  const [status, setStatus] = useState('starting') // starting | ready | error_permission | error
  const [torchOn, setTorchOn] = useState(false)
  const [torchErr, setTorchErr] = useState(false)
  const [cameras, setCameras] = useState([])
  const [camIdx, setCamIdx] = useState(0)

  const scannerRef = useRef(null)
  const busyRef = useRef(false)
  const trackRef = useRef(null)
  const streamRef = useRef(null)
  const camerasRef = useRef([])
  const camIdxRef = useRef(0)
  const statusRef = useRef('starting')
  const startScannerRef = useRef(null)
  const mountedRef = useRef(true)
  const torchTimer = useRef(null)

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    scannerRef.current = null
    try {
      if (scanner) {
        if (scanner.isScanning) {
          await scanner.stop()
        }
        scanner.clear()
      }
    } catch {
      /* noop */
    }
    // html5-qrcode only releases tracks when stop() succeeds. A half-opened
    // stream — permission granted but playback never started — keeps the camera
    // occupied on iOS/Android and makes every later attempt fail.
    const stream = streamRef.current
    streamRef.current = null
    if (stream) {
      try {
        stream.getTracks().forEach((t) => t.stop())
      } catch {
        /* noop */
      }
    }
    const container = document.getElementById(SCAN_ID)
    if (container) container.innerHTML = ''
    trackRef.current = null
  }, [])

  const startScanner = useCallback(
    async (cameraList, idx) => {
      busyRef.current = true
      setStatus('starting')
      setTorchOn(false)
      await stopScanner()
      if (!mountedRef.current) return

      // If the camera has not gone live by the deadline, surface a tap-to-start
      // prompt instead of leaving the user staring at a grey rectangle. A real tap
      // re-arms the user activation WebKit needs for programmatic playback.
      const watchdog = setTimeout(() => {
        if (!mountedRef.current) return
        setStatus((prev) => (prev === 'starting' ? 'blocked' : prev))
      }, CAMERA_WATCHDOG_MS)

      try {
        // Decoder loading is bounded: the WASM engine is a bonus, never a blocker.
        const { Html5Qrcode, Html5QrcodeSupportedFormats, zbarReady } = await loadScannerEngine()
        if (!mountedRef.current) return

        // WASM ZBar is roughly 3x faster than ZXing on 1D product barcodes.
        const targetFps = zbarReady ? 20 : 10

        const createScanner = () =>
          new Html5Qrcode(SCAN_ID, {
            verbose: false,
            useBarCodeDetectorIfSupported: zbarReady,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
            ],
          })

        const buildScanConfig = (videoConstraints) => ({
          fps: targetFps,
          videoConstraints,
          aspectRatio: 1.777,
          disableFlip: false,
          qrbox: (w, h) => {
            const width = Math.min(w - 16, Math.max(200, Math.floor(w * 0.9)))
            const height = Math.min(h - 16, Math.max(160, Math.floor(h * 0.6)))
            return { width: Math.max(120, width), height: Math.max(140, height) }
          },
        })

        const onScanSuccess = async (rawEan) => {
          if (busyRef.current || !mountedRef.current) return
          const cleanEan = String(rawEan || '').trim()
          if (!cleanEan) return
          busyRef.current = true
          playBeep()
          try {
            if (loadSoundSettings().vibration) navigator.vibrate?.(60)
          } catch {
            /* noop */
          }
          await stopScanner()
          if (mountedRef.current) onScan(cleanEan)
        }

        const deviceId = idx > 0 && cameraList[idx]?.id ? cameraList[idx].id : null
        const ladder = buildConstraintLadder(deviceId)

        let lastStartError = null
        let live = false
        for (const videoConstraints of ladder) {
          if (!mountedRef.current) return
          try {
            await stopScanner()
            const scanner = createScanner()
            scannerRef.current = scanner
            // `cameraIdOrConfig` is ignored once `videoConstraints` is supplied,
            // but html5-qrcode still requires a truthy value.
            await scanner.start(
              { facingMode: 'environment' },
              buildScanConfig(videoConstraints),
              onScanSuccess,
              () => {}
            )
            if (!mountedRef.current) return
            live = await waitForVideoLive(VIDEO_LIVE_TIMEOUT_MS)
            if (live) {
              lastStartError = null
              break
            }
            // getUserMedia succeeded but nothing renders: a playback-policy block,
            // not a constraint problem — stop burning attempts.
            lastStartError = new CameraSurfaceError()
            break
          } catch (err) {
            lastStartError = err
            if (isPermissionError(err?.message || err)) break
          }
        }

        if (lastStartError) throw lastStartError

        if (!mountedRef.current) return
        setStatus('ready')
        busyRef.current = false

        try {
          const settings = scannerRef.current?.getRunningTrackSettings()
          const host = document.getElementById(SCAN_ID)
          if (host && settings?.facingMode === 'user') {
            host.classList.add('scan-video-mirrored')
          } else if (host) {
            host.classList.remove('scan-video-mirrored')
          }
        } catch {
          /* noop */
        }

        try {
          const vid = document.querySelector(`#${SCAN_ID} video`)
          if (vid?.srcObject) {
            streamRef.current = vid.srcObject
            patchVideoElement(vid)
            const track = vid.srcObject.getVideoTracks()[0]
            if (track) {
              trackRef.current = track
              // iOS/Android end the capture track on interruption (call, another
              // app grabbing the camera, backgrounding); recover by restarting.
              track.addEventListener('ended', () => {
                if (!mountedRef.current) return
                busyRef.current = false
                startScannerRef.current?.(camerasRef.current, camIdxRef.current)
              })
            }
          }
        } catch {
          /* noop */
        }
      } catch (e) {
        busyRef.current = false
        if (!mountedRef.current) return
        if (e?.name === 'CameraSurfaceError') {
          setStatus('blocked')
        } else if (isPermissionError(e?.message || e)) {
          setStatus('error_permission')
        } else {
          setStatus('error')
        }
      } finally {
        clearTimeout(watchdog)
      }
    },
    [onScan, stopScanner]
  )

  // Stable handle so the mount effect and lifecycle callbacks can restart the
  // scanner without closing over the `useCallback` (the linter treats it as a
  // mutable value; the ref is not).
  useEffect(() => {
    startScannerRef.current = startScanner
  }, [startScanner])

  useEffect(() => {
    mountedRef.current = true
    async function init() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        const list = await Html5Qrcode.getCameras()
        if (!mountedRef.current) return
        const sorted = [...(list || [])].sort((a, b) => {
          const aB = /back|rear|environment|задн|тыльн|сзади|основн|арт|артқы|негізгі/i.test(
            a.label
          )
            ? 1
            : 0
          const bB = /back|rear|environment|задн|тыльн|сзади|основн|арт|артқы|негізгі/i.test(
            b.label
          )
            ? 1
            : 0
          return bB - aB
        })
        setCameras(sorted)
        startScannerRef.current?.(sorted, 0)
      } catch {
        if (mountedRef.current) startScannerRef.current?.([], 0)
      }
    }
    init()
    return () => {
      mountedRef.current = false
      stopScanner()
      clearTimeout(torchTimer.current)
      try {
        if (_audioCtx) {
          _audioCtx.close()
          _audioCtx = null
        }
      } catch {
        /* noop */
      }
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    camerasRef.current = cameras
    camIdxRef.current = camIdx
  }, [cameras, camIdx])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  // iOS/Android tear the capture session down when the app is backgrounded or
  // another app takes the camera. Restart once the view is visible again.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden || !mountedRef.current) return
      const track = trackRef.current
      if (statusRef.current === 'ready' && (!track || track.readyState !== 'live')) {
        busyRef.current = false
        startScannerRef.current?.(camerasRef.current, camIdxRef.current)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  const switchCamera = useCallback(async () => {
    if (cameras.length < 2) return
    busyRef.current = false
    await stopScanner()
    const next = (camIdx + 1) % cameras.length
    setCamIdx(next)
    startScanner(cameras, next)
  }, [cameras, camIdx, stopScanner, startScanner])

  const toggleTorch = useCallback(async () => {
    const track = trackRef.current
    const ok = (() => {
      try {
        return Boolean(track?.getCapabilities?.()?.torch)
      } catch {
        return false
      }
    })()
    if (!ok) {
      clearTimeout(torchTimer.current)
      setTorchErr(true)
      torchTimer.current = setTimeout(() => setTorchErr(false), 2000)
      return
    }
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
    } catch {
      setTorchErr(true)
      torchTimer.current = setTimeout(() => setTorchErr(false), 2000)
    }
  }, [torchOn])

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(4,6,14,0.96)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: 'rgba(8,12,24,0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(56,189,248,0.12)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarcodeScannerIcon size={22} color="#38BDF8" />
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-inverse)',
                fontFamily: 'var(--font-display)',
              }}
            >
              Сканер штрихкода
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
              Наведите на штрихкод товара
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: 'none',
            background: 'rgba(255,255,255,0.07)',
            color: 'var(--text-inverse)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CloseIcon size={20} color="currentColor" />
        </button>
      </div>

      {/* Camera area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Html5Qrcode mount point */}
        <div id={SCAN_ID} style={{ width: '100%', height: '100%' }} />

        {/* Viewfinder overlay */}
        {status === 'ready' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Corner brackets */}
            {[
              {
                top: 'calc(50% - 90px)',
                left: 'calc(50% - 150px)',
                borderTop: '3px solid #38BDF8',
                borderLeft: '3px solid #38BDF8',
                borderRadius: '4px 0 0 0',
              },
              {
                top: 'calc(50% - 90px)',
                right: 'calc(50% - 150px)',
                borderTop: '3px solid #38BDF8',
                borderRight: '3px solid #38BDF8',
                borderRadius: '0 4px 0 0',
              },
              {
                bottom: 'calc(50% - 90px)',
                left: 'calc(50% - 150px)',
                borderBottom: '3px solid #38BDF8',
                borderLeft: '3px solid #38BDF8',
                borderRadius: '0 0 0 4px',
              },
              {
                bottom: 'calc(50% - 90px)',
                right: 'calc(50% - 150px)',
                borderBottom: '3px solid #38BDF8',
                borderRight: '3px solid #38BDF8',
                borderRadius: '0 0 4px 0',
              },
            ].map((s, i) => (
              <div key={i} style={{ position: 'absolute', width: 28, height: 28, ...s }} />
            ))}
            {/* Scan line */}
            <div
              style={{
                position: 'absolute',
                top: 'calc(50% - 90px)',
                left: 'calc(50% - 150px)',
                width: 300,
                height: 2,
                background: 'linear-gradient(90deg, transparent, #38BDF8, transparent)',
                animation: 'retail-scan-line 1.8s ease-in-out infinite',
                borderRadius: 1,
              }}
            />
          </div>
        )}

        {/* Starting spinner */}
        {status === 'starting' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                border: '3px solid rgba(56,189,248,0.15)',
                borderTop: '3px solid #38BDF8',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Подготовка камеры...</div>
          </div>
        )}

        {/* Permission error */}
        {status === 'error_permission' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              padding: '0 32px',
              textAlign: 'center',
            }}
          >
            <AlertTriangleIcon size={48} color="#F87171" style={{ opacity: 0.7 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-inverse)' }}>
              Нет доступа к камере
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
              Разрешите доступ к камере в настройках браузера и попробуйте снова.
            </div>
            <button
              onClick={onClose}
              style={{
                marginTop: 8,
                padding: '12px 28px',
                borderRadius: 12,
                border: 'none',
                background: 'rgba(56,189,248,0.15)',
                color: '#38BDF8',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Закрыть
            </button>
          </div>
        )}

        {/* Generic error */}
        {status === 'error' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              padding: '0 32px',
              textAlign: 'center',
            }}
          >
            <AlertTriangleIcon size={48} color="#F87171" style={{ opacity: 0.7 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-inverse)' }}>
              Ошибка камеры
            </div>
            <button
              onClick={() => startScanner(cameras, camIdx)}
              style={{
                padding: '12px 28px',
                borderRadius: 12,
                border: 'none',
                background: 'rgba(56,189,248,0.15)',
                color: '#38BDF8',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Попробовать снова
            </button>
          </div>
        )}

        {/* Blocked: camera permission granted but never went live — offer a
            manual tap to re-arm playback, instead of a permanent grey screen. */}
        {status === 'blocked' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              padding: '0 32px',
              textAlign: 'center',
            }}
          >
            <CameraIcon size={48} color="#38BDF8" style={{ opacity: 0.8 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-inverse)' }}>
              Камера не запустилась
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
              Нажмите кнопку ниже, чтобы включить камеру вручную.
            </div>
            <button
              onClick={() => startScanner(cameras, camIdx)}
              style={{
                marginTop: 8,
                padding: '12px 28px',
                borderRadius: 12,
                border: 'none',
                background: 'rgba(56,189,248,0.15)',
                color: '#38BDF8',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Включить камеру
            </button>
          </div>
        )}
      </div>

      {/* Controls bar */}
      {(status === 'ready' || status === 'starting') && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            padding: '20px 24px',
            background: 'rgba(8,12,24,0.9)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}
        >
          {/* Torch */}
          <button
            onClick={toggleTorch}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: torchErr ? '#F87171' : torchOn ? '#FCD34D' : 'var(--text-dim)',
              padding: 8,
            }}
          >
            <CameraIcon size={26} color="currentColor" />
            <span style={{ fontSize: 10, fontWeight: 600 }}>
              {torchErr ? 'Не поддерж.' : torchOn ? 'Вкл.' : 'Фонарик'}
            </span>
          </button>

          {/* Switch camera */}
          <button
            onClick={switchCamera}
            disabled={cameras.length < 2}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              background: 'none',
              border: 'none',
              cursor: cameras.length < 2 ? 'default' : 'pointer',
              color: cameras.length < 2 ? 'rgba(255,255,255,0.15)' : 'var(--text-dim)',
              padding: 8,
            }}
          >
            <SyncIcon size={26} color="currentColor" />
            <span style={{ fontSize: 10, fontWeight: 600 }}>Камера</span>
          </button>
        </div>
      )}

      {/* CSS */}
      <style>{`
        .scan-video-mirrored video {
          transform: scaleX(-1) !important;
        }
        @keyframes retail-scan-line {
          0%   { transform: translateY(0); opacity: 0.8; }
          50%  { transform: translateY(176px); opacity: 1; }
          100% { transform: translateY(0); opacity: 0.8; }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
        #${SCAN_ID} > div { border: none !important; }
        #${SCAN_ID} video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
      `}</style>
    </div>
  )
}
