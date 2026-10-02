import { useState, useEffect, useRef, useCallback } from 'react'
import { loadSoundSettings } from '../utils/soundSettings.js'
import { isValidBarcodeChecksum } from '../utils/barcodeChecksum.js'
import {
  buildConstraintLadder,
  isPermissionError,
  loadScannerEngine,
  createCameraController,
  enumerateCameraDevices,
  selectFacingCamera,
  waitForCameraFrames,
  matchesCameraDirection,
  watchCameraFrames,
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
  const recoveryAttemptsRef = useRef(0)
  const resumeCameraRef = useRef(false)
  const videoHostRef = useRef(null)
  const [cameraController] = useState(createCameraController)

  const stopScanner = useCallback(async () => {
    scannerRef.current = null
    streamRef.current = null
    trackRef.current = null
    await cameraController.stop()
  }, [cameraController])

  const startScanner = useCallback(
    async (cameraList = [], idx = 0) => {
      busyRef.current = true
      setStatus('starting')
      statusRef.current = 'starting'
      setTorchOn(false)
      return cameraController
        .start(async (session) => {
          const isCurrent = () => mountedRef.current && session.isCurrent()
          if (!isCurrent()) return

          // If the camera has not gone live by the deadline, surface a tap-to-start
          // prompt instead of leaving the user staring at a grey rectangle. A real tap
          // re-arms the user activation WebKit needs for programmatic playback.
          const watchdog = setTimeout(() => {
            if (!isCurrent()) return
            setStatus((prev) => (prev === 'starting' ? 'blocked' : prev))
          }, CAMERA_WATCHDOG_MS)

          try {
            // Decoder loading is bounded: the WASM engine is a bonus, never a blocker.
            const { Html5Qrcode, Html5QrcodeSupportedFormats, zbarReady } =
              await loadScannerEngine()
            if (!isCurrent()) return

            const targetFps = zbarReady ? 20 : 10

            const createScanner = () =>
              new Html5Qrcode(session.surface.id, {
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

            const onScanSuccess = async (rawEan, decodedResult) => {
              if (busyRef.current || !isCurrent()) return
              const cleanEan = String(rawEan || '').trim()
              if (!cleanEan) return
              const format = decodedResult?.result?.format?.formatName
              if (
                /^\d{8,14}$/.test(cleanEan) &&
                format !== 'CODE_128' &&
                !isValidBarcodeChecksum(cleanEan, format)
              )
                return
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

            const facingMode = idx === 1 ? 'user' : 'environment'
            const ladder = buildConstraintLadder(cameraList[idx]?.id, facingMode)

            let lastStartError = null
            let live = false
            for (const videoConstraints of ladder) {
              if (!isCurrent()) return
              try {
                await session.releaseCamera()
                if (!isCurrent()) return
                const scanner = createScanner()
                session.setScanner(scanner)
                scannerRef.current = scanner
                // `cameraIdOrConfig` is ignored once `videoConstraints` is supplied,
                // but html5-qrcode still requires a truthy value.
                await session.startCapture(async () => {
                  await scanner.start(
                    { facingMode: 'environment' },
                    buildScanConfig(videoConstraints),
                    onScanSuccess,
                    () => {}
                  )
                  const video = session.getVideo()
                  if (video?.srcObject) session.setStream(video.srcObject)
                })
                const video = session.getVideo()
                if (!isCurrent()) return
                if (
                  !matchesCameraDirection(
                    video?.srcObject?.getVideoTracks()[0]?.getSettings?.(),
                    facingMode,
                    cameraList[idx]?.id
                  )
                ) {
                  throw new Error('requested camera unavailable')
                }
                live = await waitForCameraFrames(() => video, {
                  timeoutMs: VIDEO_LIVE_TIMEOUT_MS,
                  isCurrent,
                })
                if (!isCurrent()) return
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

            if (!isCurrent()) return

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
              const vid = session.getVideo()
              if (vid?.srcObject) {
                streamRef.current = vid.srcObject
                const track = vid.srcObject.getVideoTracks()[0]
                if (track) {
                  trackRef.current = track
                  // iOS/Android end the capture track on interruption (call, another
                  // app grabbing the camera, backgrounding); recover by restarting.
                  session.addCleanup(
                    watchCameraFrames(vid, track, () => {
                      if (!isCurrent() || busyRef.current || document.hidden) return
                      if (recoveryAttemptsRef.current >= 1) {
                        stopScanner()
                        setStatus('blocked')
                        return
                      }
                      recoveryAttemptsRef.current += 1
                      startScannerRef.current?.(camerasRef.current, camIdxRef.current)
                    })
                  )
                }
              }
            } catch {
              /* noop */
            }
            const devices = await enumerateCameraDevices()
            if (!isCurrent()) return
            const choices = ['environment', 'user'].map((mode) => ({
              id: selectFacingCamera(devices, mode)?.deviceId || null,
            }))
            camerasRef.current = choices
            setCameras(choices)
            const selectedId = trackRef.current?.getSettings?.().deviceId
            if (
              choices[idx]?.id &&
              selectedId &&
              choices[idx].id !== selectedId &&
              !cameraList[idx]?.id
            ) {
              startScannerRef.current?.(choices, idx)
              return
            }
            statusRef.current = 'ready'
            setStatus('ready')
            busyRef.current = false
          } catch (e) {
            if (!isCurrent()) return
            await session.releaseCamera()
            if (!isCurrent()) return
            busyRef.current = false
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
        }, videoHostRef.current)
        .catch(() => {
          if (!mountedRef.current) return
          busyRef.current = false
          setStatus('blocked')
        })
    },
    [onScan, stopScanner, cameraController]
  )

  // Stable handle so the mount effect and lifecycle callbacks can restart the
  // scanner without closing over the `useCallback` (the linter treats it as a
  // mutable value; the ref is not).
  useEffect(() => {
    startScannerRef.current = startScanner
  }, [startScanner])

  useEffect(() => {
    mountedRef.current = true
    startScannerRef.current?.([], 0)
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
      if (!mountedRef.current) return
      if (document.hidden) {
        resumeCameraRef.current =
          (statusRef.current === 'ready' && !busyRef.current) || statusRef.current === 'starting'
        if (resumeCameraRef.current) stopScanner()
        return
      }
      if (resumeCameraRef.current) {
        resumeCameraRef.current = false
        recoveryAttemptsRef.current = 0
        startScannerRef.current?.(camerasRef.current, camIdxRef.current)
        return
      }
      const track = trackRef.current
      if (statusRef.current === 'ready' && (!track || track.readyState !== 'live')) {
        busyRef.current = false
        startScannerRef.current?.(camerasRef.current, camIdxRef.current)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [stopScanner])

  const switchCamera = useCallback(async () => {
    if (busyRef.current || statusRef.current === 'starting') return
    const next = camIdxRef.current === 0 ? 1 : 0
    recoveryAttemptsRef.current = 0
    camIdxRef.current = next
    setCamIdx(next)
    startScanner(cameras, next)
  }, [cameras, startScanner])

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
        <div id={SCAN_ID} ref={videoHostRef} style={{ width: '100%', height: '100%' }} />

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
            disabled={status === 'starting'}
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
