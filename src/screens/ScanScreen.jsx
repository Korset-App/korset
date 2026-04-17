import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { lookupProduct } from '../utils/productLookup.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { useOffline } from '../contexts/OfflineContext.jsx'
import { buildProductPath, buildComparePath } from '../utils/routes.js'
import { useI18n } from '../utils/i18n.js'

// ─── Звук успешного сканирования (Web Audio API, без файлов) ──────────────────
let globalAudioCtx = null

function playSuccessBeep() {
  try {
    if (!globalAudioCtx) {
      globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = globalAudioCtx
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.36)
  } catch {
    /* noop */
  }
}

function cleanupAudioContext() {
  try {
    if (globalAudioCtx && globalAudioCtx.state !== 'closed') {
      globalAudioCtx.close().catch(() => {})
      globalAudioCtx = null
    }
  } catch {
    /* noop */
  }
}

// ─── Иконки ────────────────────────────────────────────────────────────────────
function IconGallery({ size = 22 }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size }}>
      image
    </span>
  )
}

function IconSwitchCamera({ size = 22 }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size }}>
      cameraswitch
    </span>
  )
}

function IconTorch({ on, size = 22 }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size }}>
      {on ? 'flashlight_on' : 'flashlight_off'}
    </span>
  )
}

// ─── Главный экран (камера открывается СРАЗУ) ─────────────────────────────────
export default function ScanScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const { currentStore } = useStore()
  const { isOnline } = useOffline()
  const storeSlug = currentStore?.slug || null

  const [status, setStatus] = useState('starting')
  const [torchOn, setTorchOn] = useState(false)
  const [torchErr, setTorchErr] = useState(false)
  const [searching, setSearching] = useState(false)
  const [notFoundEan, setNotFoundEan] = useState(null)
  const [cameras, setCameras] = useState([])
  const [camIdx, setCamIdx] = useState(0)
  const [focusPt, setFocusPt] = useState(null)
  const [galleryState, setGalleryState] = useState('idle')
  const [galleryError, setGalleryError] = useState(null)

  const initCompare = Boolean(location.state?.compareMode)
  const initProductA = location.state?.productA || null
  const [compareModeActive, setCompareModeActive] = useState(initCompare)
  const [pinnedProduct, setPinnedProduct] = useState(initProductA)
  const compareModeRef = useRef(initCompare)
  const pinnedProductRef = useRef(initProductA)
  const storeRef = useRef(currentStore)
  const slugRef = useRef(storeSlug)

  useEffect(() => {
    compareModeRef.current = compareModeActive
  }, [compareModeActive])

  useEffect(() => {
    pinnedProductRef.current = pinnedProduct
  }, [pinnedProduct])

  useEffect(() => {
    storeRef.current = currentStore
  }, [currentStore])

  useEffect(() => {
    slugRef.current = storeSlug
  }, [storeSlug])

  const fileInputRef = useRef(null)
  const scannerRef = useRef(null)
  const busyRef = useRef(false)
  const trackRef = useRef(null)
  const torchTimer = useRef(null)
  const nfTimer = useRef(null)
  const focusTimer = useRef(null)
  const mountedRef = useRef(true)
  const ID = 'korset-scan-view'

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

        const scanner = new Html5Qrcode(ID, {
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

        let cameraConfig
        if (cameraList.length > 0 && cameraList[idx]) {
          cameraConfig = { deviceId: { exact: cameraList[idx].id } }
        } else {
          const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
          cameraConfig = isIOS
            ? { facingMode: { exact: 'environment' } }
            : { facingMode: 'environment' }
        }

        await scanner.start(
          cameraConfig,
          { fps: 20, qrbox: { width: 300, height: 180 }, aspectRatio: 1.777, disableFlip: false },
          async (ean) => {
            if (busyRef.current || !mountedRef.current) return
            busyRef.current = true
            playSuccessBeep()
            try {
              navigator.vibrate?.(60)
            } catch {
              /* noop */
            }
            setSearching(true)
            await stopScanner()
            const result = await lookupProduct(ean, storeRef.current?.id || slugRef.current)
            if (!mountedRef.current) return

            if (result.type === 'local' || result.type === 'external') {
              const scannedProduct = result.product

              if (compareModeRef.current) {
                const pinned = pinnedProductRef.current
                if (!pinned) {
                  // First scan in compare mode — pin product A
                  pinnedProductRef.current = scannedProduct
                  setPinnedProduct(scannedProduct)
                  setSearching(false)
                  busyRef.current = false
                  startScanner(cameraList, idx)
                } else {
                  // Second scan — navigate to CompareScreen
                  navigate(buildComparePath(slugRef.current, pinned.ean, scannedProduct.ean), {
                    state: { productA: pinned, productB: scannedProduct },
                  })
                }
              } else {
                navigate(buildProductPath(slugRef.current, scannedProduct?.ean || ean), {
                  state: { product: scannedProduct },
                })
              }
            } else if (compareModeRef.current) {
              setNotFoundEan(ean)
              setSearching(false)
              busyRef.current = false
              clearTimeout(nfTimer.current)
              nfTimer.current = setTimeout(() => setNotFoundEan(null), 5000)
              startScanner(cameraList, idx)
            } else {
              setNotFoundEan(ean)
              setSearching(false)
              busyRef.current = false
              clearTimeout(nfTimer.current)
              nfTimer.current = setTimeout(() => setNotFoundEan(null), 4000)
              startScanner(cameraList, idx)
            }
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
          const videoEl = document.querySelector('#' + ID + ' video')
          if (videoEl?.srcObject) {
            const track = videoEl.srcObject.getVideoTracks()[0]
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
    [navigate, stopScanner]
  )

  useEffect(() => {
    mountedRef.current = true
    async function init() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        const list = await Html5Qrcode.getCameras()
        if (!mountedRef.current) return
        const sorted = [...(list || [])].sort((a, b) => {
          const aBack = /back|rear|environment/i.test(a.label) ? 1 : 0
          const bBack = /back|rear|environment/i.test(b.label) ? 1 : 0
          return bBack - aBack
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
      clearTimeout(nfTimer.current)
      clearTimeout(torchTimer.current)
      clearTimeout(focusTimer.current)
      cleanupAudioContext()
    }
  }, []) // eslint-disable-line

  const switchCamera = useCallback(async () => {
    if (cameras.length < 2) return
    busyRef.current = false
    await stopScanner()
    const nextIdx = (camIdx + 1) % cameras.length
    setCamIdx(nextIdx)
    setSearching(false)
    startScanner(cameras, nextIdx)
  }, [cameras, camIdx, stopScanner, startScanner])

  const toggleTorch = useCallback(async () => {
    const track = trackRef.current
    const supported = (() => {
      try {
        return Boolean(track?.getCapabilities?.()?.torch)
      } catch {
        return false
      }
    })()
    if (!supported) {
      clearTimeout(torchTimer.current)
      setTorchErr(true)
      torchTimer.current = setTimeout(() => setTorchErr(false), 2500)
      return
    }
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
      setTorchErr(false)
    } catch {
      setTorchErr(true)
      torchTimer.current = setTimeout(() => setTorchErr(false), 2500)
    }
  }, [torchOn])

  const handleTapFocus = useCallback(
    async (e) => {
      if (e.target.closest('button')) return
      const track = trackRef.current
      if (!track || status !== 'ready') return
      const rect = e.currentTarget.getBoundingClientRect()
      const clientX = e.touches?.[0]?.clientX ?? e.clientX
      const clientY = e.touches?.[0]?.clientY ?? e.clientY
      const x = (clientX - rect.left) / rect.width
      const y = (clientY - rect.top) / rect.height
      setFocusPt({ x: clientX - rect.left, y: clientY - rect.top })
      clearTimeout(focusTimer.current)
      focusTimer.current = setTimeout(() => setFocusPt(null), 1000)
      try {
        await track.applyConstraints({
          advanced: [{ focusMode: 'manual', pointsOfInterest: [{ x, y }] }],
        })
        setTimeout(async () => {
          try {
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
          } catch {
            /* noop */
          }
        }, 800)
      } catch {
        /* noop */
      }
    },
    [status]
  )

  const openGallery = useCallback(() => {
    setGalleryState('idle')
    setGalleryError(null)
    fileInputRef.current?.click()
  }, [])

  const handleGalleryFile = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      e.target.value = ''
      setGalleryState('scanning')
      const TEMP_ID = 'korset-gallery-dec'
      let div = document.getElementById(TEMP_ID)
      if (!div) {
        div = document.createElement('div')
        div.id = TEMP_ID
        div.style.cssText = 'position:fixed;visibility:hidden;width:1px;height:1px;'
        document.body.appendChild(div)
      }
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        const s = new Html5Qrcode(TEMP_ID, { verbose: false })
        const ean = await s.scanFile(file, false)
        try {
          s.clear()
        } catch {
          /* noop */
        }
        setGalleryState('idle')
        playSuccessBeep()
        setSearching(true)
        await stopScanner()
        const result = await lookupProduct(ean, storeRef.current?.id || slugRef.current)
        if (result.type === 'local' || result.type === 'external') {
          const scannedProduct = result.product
          if (compareModeRef.current) {
            const pinned = pinnedProductRef.current
            if (!pinned) {
              pinnedProductRef.current = scannedProduct
              setPinnedProduct(scannedProduct)
              setSearching(false)
              startScanner(cameras, camIdx)
            } else {
              navigate(buildComparePath(slugRef.current, pinned.ean, scannedProduct.ean), {
                state: { productA: pinned, productB: scannedProduct },
              })
            }
          } else {
            navigate(buildProductPath(slugRef.current, scannedProduct?.ean || ean), {
              state: { product: scannedProduct },
            })
          }
        } else {
          setNotFoundEan(ean)
          setSearching(false)
          clearTimeout(nfTimer.current)
          nfTimer.current = setTimeout(() => setNotFoundEan(null), 4000)
          startScanner(cameras, camIdx)
        }
      } catch (err) {
        try {
          const { Html5Qrcode } = await import('html5-qrcode')
          const s = new Html5Qrcode(TEMP_ID, { verbose: false })
          s.clear()
        } catch {
          /* noop */
        }
        const msg = String(err?.message || err).toLowerCase()
        setGalleryState('error')
        setGalleryError(
          msg.includes('no multiformat') || msg.includes('not found') ? 'noBarcode' : 'readError'
        )
        setTimeout(() => {
          setGalleryState('idle')
          setGalleryError(null)
        }, 3200)
      }
    },
    [cameras, camIdx, navigate, stopScanner, startScanner]
  )

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
      }}
    >
      {/* ── Видео-зона ── */}
      <div
        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'crosshair' }}
        onClick={handleTapFocus}
        onTouchEnd={handleTapFocus}
      >
        <div id={ID} style={{ width: '100%', height: '100%' }} />

        {/* Маска + прицел */}
        {status === 'ready' && !searching && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <defs>
                <mask id="scan-cutout">
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x="50%"
                    y="50%"
                    width="300"
                    height="180"
                    rx="12"
                    transform="translate(-150,-90)"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.52)" mask="url(#scan-cutout)" />
            </svg>

            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 300,
                height: 180,
                transform: 'translate(-50%,-50%)',
              }}
            >
              {[
                {
                  top: -2,
                  left: -2,
                  borderTop: '2.5px solid #A78BFA',
                  borderLeft: '2.5px solid #A78BFA',
                  borderRadius: '8px 0 0 0',
                },
                {
                  top: -2,
                  right: -2,
                  borderTop: '2.5px solid #A78BFA',
                  borderRight: '2.5px solid #A78BFA',
                  borderRadius: '0 8px 0 0',
                },
                {
                  bottom: -2,
                  left: -2,
                  borderBottom: '2.5px solid #A78BFA',
                  borderLeft: '2.5px solid #A78BFA',
                  borderRadius: '0 0 0 8px',
                },
                {
                  bottom: -2,
                  right: -2,
                  borderBottom: '2.5px solid #A78BFA',
                  borderRight: '2.5px solid #A78BFA',
                  borderRadius: '0 0 8px 0',
                },
              ].map((s, i) => (
                <div key={i} style={{ position: 'absolute', width: 32, height: 32, ...s }} />
              ))}
              <div
                style={{
                  position: 'absolute',
                  left: 4,
                  right: 4,
                  height: 2,
                  borderRadius: 2,
                  background:
                    'linear-gradient(90deg, transparent 0%, #A78BFA 20%, #E9D5FF 50%, #A78BFA 80%, transparent 100%)',
                  boxShadow: '0 0 10px 3px rgba(167,139,250,0.5)',
                  animation: 'scanLine 1.8s ease-in-out infinite',
                }}
              />
            </div>

            <div
              style={{
                position: 'absolute',
                top: 'calc(50% + 102px)',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 13,
                color: 'rgba(200,200,255,0.6)',
                whiteSpace: 'nowrap',
                textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              }}
            >
              {t.scan.hint}
            </div>
          </div>
        )}

        {/* Tap-to-focus индикатор */}
        {focusPt && (
          <div
            style={{
              position: 'absolute',
              pointerEvents: 'none',
              left: focusPt.x - 24,
              top: focusPt.y - 24,
              width: 48,
              height: 48,
              border: '2px solid rgba(255,255,255,0.85)',
              borderRadius: 6,
              animation: 'focusFade 0.9s ease forwards',
            }}
          />
        )}

        {/* Загрузка */}
        {status === 'starting' && !searching && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#07070F',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: '3px solid rgba(167,139,250,0.15)',
                borderTop: '3px solid #A78BFA',
                animation: 'spin 0.75s linear infinite',
              }}
            />
            <p style={{ color: '#9898B8', fontSize: 14 }}>{t.scan.startCamera}</p>
          </div>
        )}

        {/* Поиск товара */}
        {searching && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                border: '3px solid rgba(167,139,250,0.15)',
                borderTop: '3px solid #A78BFA',
                animation: 'spin 0.75s linear infinite',
              }}
            />
            <p style={{ color: '#C4B5FD', fontSize: 15, fontWeight: 500 }}>{t.scan.searching}</p>
          </div>
        )}

        {/* Нет доступа к камере */}
        {status === 'error_permission' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#07070F',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 28px',
              gap: 18,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 52 }}>📷</div>
            <div>
              <p style={{ color: '#F87171', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                {t.scan.cameraAccessDeniedTitle}
              </p>
              <p style={{ color: '#6060A0', fontSize: 13, lineHeight: 1.7 }}>
                {t.scan.cameraPermission}
              </p>
            </div>
            <button
              onClick={openGallery}
              style={{
                padding: '13px 28px',
                borderRadius: 14,
                background: 'rgba(167,139,250,0.12)',
                border: '1px solid rgba(167,139,250,0.3)',
                color: '#C4B5FD',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t.scan.galleryBtn}
            </button>
          </div>
        )}

        {/* Бейдж: режим магазина */}
        {(status === 'ready' || status === 'starting') && !searching && (
          <div
            style={{
              position: 'absolute',
              top: 56,
              left: '50%',
              transform: 'translateX(-50%)',
              background: currentStore ? 'rgba(52,211,153,0.15)' : 'rgba(245,158,11,0.12)',
              border: `1px solid ${currentStore ? 'rgba(52,211,153,0.3)' : 'rgba(245,158,11,0.25)'}`,
              borderRadius: 20,
              padding: '5px 14px',
              fontSize: 11,
              fontWeight: 700,
              color: currentStore ? '#34D399' : '#F59E0B',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'none',
            }}
          >
            {currentStore ? `📍 ${currentStore.name}` : t.scan.globalMode}
          </div>
        )}

        {/* Toast: товар не найден */}
        {notFoundEan && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(12,8,22,0.94)',
              border: '1px solid rgba(248,113,113,0.35)',
              borderRadius: 14,
              padding: '10px 20px',
              textAlign: 'center',
              backdropFilter: 'blur(12px)',
              animation: 'toastUp 0.25s ease',
            }}
          >
            <p style={{ color: '#F87171', fontSize: 14, fontWeight: 700, marginBottom: 3 }}>
              {!isOnline
                ? lang === 'kz'
                  ? 'Желі жоқ, деректер қол жеткізбейді'
                  : 'Офлайн. Данных нет'
                : t.scan.notFoundToast}
            </p>
            <p style={{ color: 'rgba(180,100,100,0.7)', fontSize: 11, fontFamily: 'monospace' }}>
              {notFoundEan}
            </p>
          </div>
        )}

        {/* Toast: ошибка галереи */}
        {galleryState === 'error' && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: 16,
              right: 16,
              background: 'rgba(12,8,22,0.94)',
              border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: 14,
              padding: '12px 16px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
              animation: 'toastUp 0.2s ease',
            }}
          >
            <p style={{ color: '#F87171', fontSize: 13, fontWeight: 600 }}>
              {galleryError === 'noBarcode' ? t.scan.galleryNoBarcode : t.scan.galleryError}
            </p>
          </div>
        )}

        {/* Toast: фонарик недоступен */}
        {torchErr && (
          <div
            style={{
              position: 'absolute',
              top: 110,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 40,
              whiteSpace: 'nowrap',
              background: 'rgba(12,8,22,0.92)',
              border: '1px solid rgba(248,113,113,0.35)',
              borderRadius: 12,
              padding: '8px 16px',
              fontSize: 12,
              color: '#FCA5A5',
              fontWeight: 500,
              backdropFilter: 'blur(10px)',
            }}
          >
            ⚠️ {t.scan.torchUnavailable}
          </div>
        )}

        {/* Compare mode banner */}
        {compareModeActive && !searching && (
          <div
            style={{
              position: 'absolute',
              top: pinnedProduct ? 56 : 56,
              left: 16,
              right: 16,
              zIndex: 31,
              background: 'rgba(124,58,237,0.18)',
              border: '1.5px solid rgba(139,92,246,0.5)',
              borderRadius: 14,
              padding: '8px 14px',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              pointerEvents: 'none',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16, color: '#A78BFA', flexShrink: 0 }}
            >
              compare_arrows
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#C4B5FD', lineHeight: 1.4 }}>
              {pinnedProduct
                ? `${t.compare?.modeBannerPinned || 'Первый товар выбран'}: ${pinnedProduct.name}`
                : t.compare?.modeBanner || 'Режим сравнения: выберите товар'}
            </span>
          </div>
        )}

        {/* Кнопки: фонарик + переключение камеры + compare toggle */}
        {status !== 'error_permission' && !searching && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 30,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '12px 16px 0',
              pointerEvents: 'none',
            }}
          >
            <button
              onClick={toggleTorch}
              style={{
                pointerEvents: 'all',
                width: 44,
                height: 44,
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: torchOn ? 'rgba(253,230,138,0.2)' : 'rgba(0,0,0,0.55)',
                border: `1.5px solid ${torchOn ? 'rgba(253,230,138,0.7)' : 'rgba(255,255,255,0.18)'}`,
                color: torchOn ? '#FDE68A' : 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(8px)',
                boxShadow: torchOn ? '0 0 18px rgba(253,230,138,0.35)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <IconTorch on={torchOn} size={22} />
            </button>

            <div style={{ display: 'flex', gap: 8, pointerEvents: 'all' }}>
              <button
                onClick={() => {
                  const next = !compareModeActive
                  setCompareModeActive(next)
                  compareModeRef.current = next
                  if (!next) {
                    setPinnedProduct(null)
                    pinnedProductRef.current = null
                  }
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: compareModeActive ? 'rgba(124,58,237,0.35)' : 'rgba(0,0,0,0.55)',
                  border: `1.5px solid ${compareModeActive ? 'rgba(167,139,250,0.7)' : 'rgba(255,255,255,0.18)'}`,
                  color: compareModeActive ? '#C4B5FD' : 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: compareModeActive ? '0 0 14px rgba(124,58,237,0.35)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  compare_arrows
                </span>
              </button>

              {cameras.length > 1 ? (
                <button
                  onClick={switchCamera}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.55)',
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    color: 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <IconSwitchCamera size={22} />
                </button>
              ) : (
                <div style={{ width: 44 }} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Нижняя панель ── */}
      <div
        style={{
          flexShrink: 0,
          background: 'rgba(7,7,15,0.97)',
          borderTop: '1px solid rgba(139,92,246,0.18)',
          padding: '12px 20px',
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          onClick={openGallery}
          disabled={galleryState === 'scanning'}
          style={{
            flex: 1,
            padding: '11px 16px',
            borderRadius: 14,
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            color: 'rgba(190,190,230,0.8)',
            transition: 'opacity 0.2s ease',
            opacity: galleryState === 'scanning' ? 0.6 : 1,
          }}
        >
          {galleryState === 'scanning' ? (
            <div
              style={{
                width: 17,
                height: 17,
                borderRadius: '50%',
                border: '2px solid rgba(167,139,250,0.25)',
                borderTop: '2px solid #A78BFA',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          ) : (
            <IconGallery size={17} />
          )}
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {galleryState === 'scanning' ? t.scan.galleryScanning : t.scan.galleryBtn}
          </span>
        </button>

        <div
          style={{
            fontSize: 9,
            color: '#282840',
            textAlign: 'right',
            lineHeight: 1.6,
            flexShrink: 0,
          }}
        >
          EAN-13 · EAN-8
          <br />
          CODE128 · UPC
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleGalleryFile}
      />

      <style>{`
        #${ID} video {
          width:100%!important;height:100%!important;
          object-fit:cover!important;
          position:absolute!important;top:0!important;left:0!important;
        }
        #${ID} img,#${ID} canvas{display:none!important;}
        #${ID}>div{background:transparent!important;border:none!important;}
        @keyframes scanLine{
          0%{top:6px;opacity:0.5}10%{opacity:1}90%{opacity:1}100%{top:calc(100% - 8px);opacity:0.5}
        }
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes focusFade{
          0%{opacity:1;transform:scale(1.15)}60%{opacity:0.7;transform:scale(1)}100%{opacity:0;transform:scale(0.92)}
        }
        @keyframes toastUp{
          from{opacity:0;transform:translateX(-50%) translateY(10px)}
          to{opacity:1;transform:translateX(-50%) translateY(0)}
        }
      `}</style>
    </div>
  )
}
