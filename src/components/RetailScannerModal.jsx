import { useState, useEffect, useRef, useCallback } from 'react'
import { loadSoundSettings } from '../utils/soundSettings.js'

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

export default function RetailScannerModal({ onScan, onClose }) {
  const [status, setStatus] = useState('starting') // starting | ready | error_permission | error
  const [torchOn, setTorchOn] = useState(false)
  const [torchErr, setTorchErr] = useState(false)
  const [cameras, setCameras] = useState([])
  const [camIdx, setCamIdx] = useState(0)

  const scannerRef = useRef(null)
  const busyRef = useRef(false)
  const trackRef = useRef(null)
  const mountedRef = useRef(true)
  const torchTimer = useRef(null)

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
      }
    } catch {
      /* noop */
    }
    trackRef.current = null
  }, [])

  const startScanner = useCallback(
    async (cameraList, idx) => {
      busyRef.current = true
      setStatus('starting')
      setTorchOn(false)

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        if (!mountedRef.current) return

        const scanner = new Html5Qrcode(SCAN_ID, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        })
        scannerRef.current = scanner

        let camCfg
        if (cameraList.length > 0 && cameraList[idx]) {
          camCfg = { deviceId: { exact: cameraList[idx].id } }
        } else {
          camCfg = { facingMode: 'environment' }
        }

        await scanner.start(
          camCfg,
          { fps: 20, qrbox: { width: 280, height: 160 }, aspectRatio: 1.777, disableFlip: false },
          async (ean) => {
            if (busyRef.current || !mountedRef.current) return
            busyRef.current = true
            playBeep()
            try {
              if (loadSoundSettings().vibration) {
                navigator.vibrate?.(60)
              }
            } catch {
              /* noop */
            }
            await stopScanner()
            if (mountedRef.current) onScan(ean)
          },
          () => {}
        )

        if (!mountedRef.current) {
          await stopScanner()
          return
        }
        setStatus('ready')
        busyRef.current = false

        try {
          const settings = scanner.getRunningTrackSettings()
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
            const track = vid.srcObject.getVideoTracks()[0]
            if (track) trackRef.current = track
          }
        } catch {
          /* noop */
        }
      } catch (e) {
        busyRef.current = false
        if (!mountedRef.current) return
        const msg = String(e?.message || e)
        setStatus(/permission|not allowed|denied/i.test(msg) ? 'error_permission' : 'error')
      }
    },
    [onScan, stopScanner]
  )

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
        startScanner(sorted, 0)
      } catch {
        if (mountedRef.current) startScanner([], 0)
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
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#38BDF8' }}>
            barcode_scanner
          </span>
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
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            close
          </span>
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
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 48, color: '#F87171', opacity: 0.7 }}
            >
              no_photography
            </span>
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
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 48, color: '#F87171', opacity: 0.7 }}
            >
              error_outline
            </span>
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
            <span className="material-symbols-outlined" style={{ fontSize: 26 }}>
              {torchOn ? 'flashlight_on' : 'flashlight_off'}
            </span>
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
            <span className="material-symbols-outlined" style={{ fontSize: 26 }}>
              cameraswitch
            </span>
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
