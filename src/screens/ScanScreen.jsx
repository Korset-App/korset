import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { lookupProduct } from '../utils/productLookup.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { useOffline } from '../contexts/OfflineContext.jsx'
import { buildProductPath, buildComparePath } from '../utils/routes.js'
import { useI18n } from '../i18n/index.js'
import { loadSoundSettings } from '../utils/soundSettings.js'
import { buildTermsPath, buildPrivacyPath } from '../utils/routes.js'
import TermsConsentSheet, { isTermsAccepted } from '../components/TermsConsentSheet.jsx'
import './ScanScreen.css'

// Success scan sound via Web Audio API, without asset files.
let globalAudioCtx = null

function playSuccessBeep() {
  if (!loadSoundSettings().sound) return
  try {
    if (!globalAudioCtx) {
      globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = globalAudioCtx
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})

    const now = ctx.currentTime

    function playNote(freq, startTime, peakGain, duration) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
      osc.start(startTime)
      osc.stop(startTime + duration + 0.01)
    }

    // Korset signature chime: a soft ascending C5 to E5 major third.
    playNote(523.25, now, 0.18, 0.22) // C5 base
    playNote(659.25, now + 0.085, 0.13, 0.2) // E5 accent
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

function saveRecentScan(product) {
  try {
    const recent = JSON.parse(localStorage.getItem('korset_recent_scans') || '[]')
    const updated = [
      { ean: product.ean, name: product.name, image_url: product.image_url || null },
      ...recent.filter((r) => r.ean !== product.ean),
    ].slice(0, 5)
    localStorage.setItem('korset_recent_scans', JSON.stringify(updated))
    return updated
  } catch {
    /* noop */
  }
  return null
}

// ─── Иконки ────────────────────────────────────────────────────────────────────
function formatManualEan(value) {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  if (digits.length <= 8) return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
  return digits.replace(/^(\d{1})(\d{0,6})(\d{0,6}).*/, (_, a, b, c) =>
    [a, b, c].filter(Boolean).join(' ')
  )
}

function IconGallery({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="16" cy="8" r="2" stroke="currentColor" strokeWidth="0.9" />
      <path
        d="M2 10.15l.98-.14c6.98-1 12.94 5.02 11.88 11.99"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      <path
        d="M22 13.39l-.97-.14c-2.85-.39-5.42 1.02-6.75 3.25"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      <path
        d="M22 12c0 4.71 0 7.07-1.46 8.54C19.07 22 16.71 22 12 22s-7.07 0-8.54-1.46C2 19.07 2 16.71 2 12s0-7.07 1.46-8.54C4.93 2 7.29 2 12 2s7.07 0 8.54 1.46c.97.98 1.3 2.35 1.4 4.54"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconSwitchCamera({ filled = false, size = 22 }) {
  if (filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M21 7c.51 0 .94.39.99.88L22 8v8.5c0 1.87-1.46 3.4-3.31 3.49L18.5 20H6.41l.3.29a1 1 0 0 1-1.32 1.5l-.1-.08-2-2-.02-.02a1 1 0 0 1-.08-1.28l.1-.12 2-2a1 1 0 0 1 1.5 1.32l-.08.1-.3.29H18.5c.78 0 1.42-.59 1.49-1.36L20 16.5V8a1 1 0 0 1 1-1ZM18.61 2.21l.1.08 2 2c.03.03.06.06.08.09l.02.02a1 1 0 0 1-.1 1.31l-2 2a1 1 0 0 1-1.5-1.32l.08-.1.3-.29H5.5c-.78 0-1.42.59-1.49 1.36L4 7.5V16a1 1 0 0 1-2 0V7.5c0-1.87 1.46-3.4 3.31-3.5h12.28l-.3-.29a1 1 0 0 1 1.32-1.5ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"
          fill="currentColor"
        />
      </svg>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.25 7.5C21.63 7.5 21.94 7.78 21.99 8.15L22 8.25V16.75C22 18.48 20.64 19.9 18.93 19.99L18.75 20H6.06L6.78 20.72C7.05 20.99 7.07 21.4 6.85 21.7L6.78 21.78C6.51 22.05 6.1 22.07 5.8 21.85L5.72 21.78L3.72 19.78L3.66 19.71L3.72 19.78C3.68 19.74 3.65 19.7 3.62 19.66C3.61 19.64 3.6 19.62 3.59 19.6C3.58 19.57 3.58 19.56 3.57 19.54C3.56 19.52 3.55 19.49 3.54 19.46L3.53 19.43C3.51 19.4 3.5 19.33 3.5 19.25C3.5 19.21 3.5 19.17 3.51 19.14L3.51 19.1C3.52 19.08 3.53 19.05 3.53 19.03L3.55 18.99C3.56 18.97 3.56 18.95 3.57 18.93L3.59 18.89C3.6 18.87 3.62 18.84 3.63 18.82L3.65 18.8L3.72 18.72L5.72 16.72C6.01 16.43 6.49 16.43 6.78 16.72C7.05 16.99 7.07 17.4 6.85 17.7L6.78 17.78L6.06 18.5H18.75C19.67 18.5 20.42 17.79 20.49 16.89L20.5 16.75V8.25C20.5 7.84 20.84 7.5 21.25 7.5Z"
        fill="currentColor"
      />
      <path
        d="M18.2 2.15L18.28 2.22L20.28 4.22L20.35 4.3L20.38 4.35L20.28 4.22C20.32 4.26 20.35 4.3 20.38 4.34C20.39 4.36 20.4 4.38 20.41 4.4C20.42 4.43 20.42 4.44 20.43 4.46C20.44 4.49 20.45 4.51 20.46 4.54L20.47 4.57C20.49 4.6 20.5 4.67 20.5 4.75C20.5 4.79 20.5 4.83 20.49 4.86L20.49 4.9C20.48 4.92 20.47 4.95 20.47 4.97L20.45 5.01C20.44 5.03 20.44 5.05 20.43 5.07L20.41 5.11C20.4 5.13 20.38 5.16 20.37 5.18L20.35 5.2L20.28 5.28L18.28 7.28C17.99 7.57 17.51 7.57 17.22 7.28C16.95 7.01 16.93 6.6 17.15 6.3L17.22 6.22L17.94 5.5H5.25C4.33 5.5 3.58 6.21 3.51 7.11L3.5 7.25V15.75C3.5 16.16 3.16 16.5 2.75 16.5C2.37 16.5 2.06 16.22 2.01 15.85L2 15.75V7.25C2 5.52 3.36 4.1 5.07 4.01L5.25 4H17.94L17.22 3.28C16.95 3.01 16.93 2.6 17.15 2.3L17.22 2.22C17.49 1.95 17.9 1.93 18.2 2.15Z"
        fill="currentColor"
      />
      <path
        d="M12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8ZM12 9.5C10.62 9.5 9.5 10.62 9.5 12C9.5 13.38 10.62 14.5 12 14.5C13.38 14.5 14.5 13.38 14.5 12C14.5 10.62 13.38 9.5 12 9.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconTorch({ on, size = 22 }) {
  if (on) {
    return (
      <svg width={size} height={size} viewBox="0 0 51 51" fill="none" aria-hidden="true">
        <path
          d="M5.08 22.88a2.54 2.54 0 0 1 0 5.08H2.54a2.54 2.54 0 0 1 0-5.08h2.54ZM25.41 0a2.54 2.54 0 0 1 2.54 2.54v2.54a2.54 2.54 0 0 1-5.08 0V2.54A2.54 2.54 0 0 1 25.41 0ZM48.29 22.88a2.54 2.54 0 0 1 0 5.08h-2.54a2.54 2.54 0 0 1 0-5.08h2.54ZM7.35 7.35a2.54 2.54 0 0 1 3.59 0l1.78 1.78a2.54 2.54 0 1 1-3.59 3.59l-1.78-1.77a2.54 2.54 0 0 1 0-3.6ZM39.88 7.35a2.54 2.54 0 0 1 3.6 3.6l-1.78 1.78a2.54 2.54 0 0 1-3.6-3.6l1.78-1.78ZM30.5 40.67a2.54 2.54 0 0 1 2.54 2.54 7.63 7.63 0 1 1-15.25 0 2.54 2.54 0 0 1 2.54-2.54H30.5ZM25.41 10.17a15.25 15.25 0 0 1 9.15 27.45 2.54 2.54 0 0 1-1.52.5H17.79c-.55 0-1.09-.18-1.53-.5a15.25 15.25 0 0 1 9.15-27.45Z"
          fill="currentColor"
        />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M1 20h2.11M20 1v2.11M36.89 20H39M6.49 6.49l1.48 1.48M33.51 6.49l-1.48 1.48"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.67 28.44a10.56 10.56 0 1 1 12.66 0 9.22 9.22 0 0 0-2.11 6.34 4.22 4.22 0 1 1-8.44 0 9.22 9.22 0 0 0-2.11-6.34Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.14 30.56h9.72"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconCompare({ active = false, size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ transform: active ? 'scaleX(-1)' : 'none', transition: 'transform 0.22s ease' }}
    >
      <path d="M2 4h9v1H3v15h8v1H2zm10 19h1V2h-1zM8.28 10.28l-.56-.56L4.93 12.5l2.79 2.78.56-.56L6.57 13H11v-1H6.57zM14 12h4.08l-1.54-1.54.92-.92 2.96 2.96-2.96 2.96-.92-.92L18.08 13H14v8h9V4h-9z" />
    </svg>
  )
}

function IconHistory({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 8v4l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.6 5.6 4.34 6.87l2.54.01M4.32 4.33l.02 2.54M3 12a9 9 0 0 0 13.5 7.79M19.8 16.5A9 9 0 0 0 5.67 5.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ScanActionButton({
  active = false,
  disabled = false,
  label,
  tone = 'default',
  icon,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`scan-action ${active ? 'is-active' : ''} tone-${tone}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="scan-action__icon">{icon}</span>
      <span className="scan-action__label">{label}</span>
    </button>
  )
}

function ProductScanChip({ product, index, t }) {
  if (!product) return null
  return (
    <div className="scan-product-chip">
      <div className="scan-product-chip__index">{index}</div>
      <div className="scan-product-chip__media catalog-img-box">
        {product.image_url ? (
          <img src={product.image_url} alt="" className="product-img-blend" />
        ) : (
          <span className="material-symbols-outlined">barcode</span>
        )}
      </div>
      <div className="scan-product-chip__copy">
        <span>{index === 1 ? t('scan.compareFirstReady') : t('scan.compareSecondReady')}</span>
        <strong>{product.name || product.ean}</strong>
      </div>
    </div>
  )
}

function CompareTray({ active, firstProduct, secondProduct, onCompare, onCancel, t }) {
  if (!active) return null
  return (
    <div className="scan-compare-tray">
      <div className="scan-compare-tray__header">
        <span className="material-symbols-outlined">compare_arrows</span>
        <div>
          <strong>{t('scan.compareTrayTitle')}</strong>
          <p>
            {firstProduct
              ? secondProduct
                ? t('scan.compareReady')
                : t('scan.compareNeedSecond')
              : t('scan.compareNeedFirst')}
          </p>
        </div>
      </div>
      <div className="scan-compare-tray__products">
        <ProductScanChip product={firstProduct} index={1} t={t} />
        <ProductScanChip product={secondProduct} index={2} t={t} />
      </div>
      <div className="scan-compare-tray__actions">
        <button type="button" className="scan-small-btn ghost" onClick={onCancel}>
          {t('compare.cancel')}
        </button>
        {firstProduct && secondProduct && (
          <button type="button" className="scan-small-btn primary" onClick={onCompare}>
            {t('scan.compareStart')}
          </button>
        )}
      </div>
    </div>
  )
}

function ScanHintSheet({ open, onClose, t }) {
  if (!open) return null
  return (
    <div className="scan-sheet-backdrop" onClick={onClose}>
      <div className="scan-sheet scan-sheet--hint" onClick={(e) => e.stopPropagation()}>
        <div className="scan-sheet__handle" />
        <div className="scan-sheet__hero">
          <IconCompare active size={28} />
        </div>
        <h2>{t('scan.compareHintTitle')}</h2>
        <p>{t('scan.compareHintBody')}</p>
        <div className="scan-hint-steps">
          <span>{t('scan.compareHintStep1')}</span>
          <span>{t('scan.compareHintStep2')}</span>
        </div>
        <button type="button" className="scan-sheet__button" onClick={onClose}>
          {t('scan.gotIt')}
        </button>
      </div>
    </div>
  )
}

function RecentScansSheet({ open, scans, onClose, onSelect, t }) {
  if (!open) return null
  return (
    <div className="scan-sheet-backdrop" onClick={onClose}>
      <div className="scan-sheet scan-sheet--recent" onClick={(e) => e.stopPropagation()}>
        <div className="scan-sheet__handle" />
        <h2>{t('scan.recentScans')}</h2>
        {scans.length === 0 ? (
          <p>{t('scan.recentEmpty')}</p>
        ) : (
          <div className="scan-recent-list">
            {scans.map((scan) => (
              <button
                key={scan.ean}
                type="button"
                className="scan-recent-item"
                onClick={() => onSelect(scan)}
              >
                <span className="scan-recent-item__media catalog-img-box">
                  {scan.image_url ? (
                    <img src={scan.image_url} alt="" className="product-img-blend" />
                  ) : (
                    <IconHistory size={22} />
                  )}
                </span>
                <span>
                  <strong>{scan.name || scan.ean}</strong>
                  <small>{scan.ean}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
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
  const [scanFlash, setScanFlash] = useState(false)
  const [notFoundEan, setNotFoundEan] = useState(null)
  const [cameras, setCameras] = useState([])
  const [camIdx, setCamIdx] = useState(0)
  const [focusPt, setFocusPt] = useState(null)
  const [galleryState, setGalleryState] = useState('idle')
  const [galleryError, setGalleryError] = useState(null)
  const [consentOpen, setConsentOpen] = useState(() => !isTermsAccepted())
  const [cameraSwitchPressed, setCameraSwitchPressed] = useState(false)
  const [recentScans, setRecentScans] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('korset_recent_scans') || '[]')
    } catch {
      return []
    }
  })
  const [historyOpen, setHistoryOpen] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [manualError, setManualError] = useState(null)
  const [manualFocused, setManualFocused] = useState(false)
  const [keyboardOffset, setKeyboardOffset] = useState(0)

  const initCompare = Boolean(location.state?.compareMode)
  const initProductA = location.state?.productA || null
  const [compareModeActive, setCompareModeActive] = useState(initCompare)
  const [pinnedProduct, setPinnedProduct] = useState(initProductA)
  const [secondCompareProduct, setSecondCompareProduct] = useState(null)
  const [compareHintOpen, setCompareHintOpen] = useState(false)
  const compareModeRef = useRef(initCompare)
  const pinnedProductRef = useRef(initProductA)
  const secondCompareProductRef = useRef(null)
  const storeRef = useRef(currentStore)
  const slugRef = useRef(storeSlug)

  const historyOpenRef = useRef(historyOpen)
  const compareModeActiveRef2 = useRef(initCompare)
  const compareHintOpenRef = useRef(compareHintOpen)

  useEffect(() => {
    historyOpenRef.current = historyOpen
    compareModeActiveRef2.current = compareModeActive
    compareHintOpenRef.current = compareHintOpen
  })

  const cancelCompareModeRef = useRef(null)
  const closeCompareHintRef = useRef(null)

  useEffect(() => {
    compareModeRef.current = compareModeActive
  }, [compareModeActive])

  useEffect(() => {
    const handlePopState = () => {
      if (historyOpenRef.current) {
        setHistoryOpen(false)
      } else if (compareHintOpenRef.current) {
        closeCompareHintRef.current?.()
      } else if (compareModeActiveRef2.current) {
        cancelCompareModeRef.current?.()
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    pinnedProductRef.current = pinnedProduct
  }, [pinnedProduct])

  useEffect(() => {
    secondCompareProductRef.current = secondCompareProduct
  }, [secondCompareProduct])

  useEffect(() => {
    storeRef.current = currentStore
  }, [currentStore])

  useEffect(() => {
    slugRef.current = storeSlug
  }, [storeSlug])

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return undefined
    const updateKeyboardOffset = () => {
      const hidden = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      setKeyboardOffset(hidden)
    }
    updateKeyboardOffset()
    viewport.addEventListener('resize', updateKeyboardOffset)
    viewport.addEventListener('scroll', updateKeyboardOffset)
    return () => {
      viewport.removeEventListener('resize', updateKeyboardOffset)
      viewport.removeEventListener('scroll', updateKeyboardOffset)
    }
  }, [])

  const rememberScan = useCallback((product) => {
    const updated = saveRecentScan(product)
    if (updated) setRecentScans(updated)
  }, [])

  const fileInputRef = useRef(null)
  const scannerRef = useRef(null)
  const busyRef = useRef(false)
  const trackRef = useRef(null)
  const torchTimer = useRef(null)
  const nfTimer = useRef(null)
  const focusTimer = useRef(null)
  const mountedRef = useRef(true)
  const startScannerRef = useRef(null)
  const startSeqRef = useRef(0)
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
      const startSeq = ++startSeqRef.current
      busyRef.current = true
      setStatus('starting')
      setTorchOn(false)
      await stopScanner()
      if (!mountedRef.current || startSeq !== startSeqRef.current) return

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        if (!mountedRef.current || startSeq !== startSeqRef.current) return

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

        const scanConfig = {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const safeWidth = Math.max(160, viewfinderWidth - 24)
            const safeHeight = Math.max(120, viewfinderHeight - 24)
            const width = Math.min(340, Math.max(220, Math.floor(viewfinderWidth * 0.82)))
            const height = Math.min(210, Math.max(140, Math.floor(width * 0.58)))
            return {
              width: Math.min(width, safeWidth),
              height: Math.min(height, safeHeight),
            }
          },
          disableFlip: false,
        }

        let cameraConfig
        if (cameraList.length > 0 && cameraList[idx]) {
          cameraConfig = { deviceId: { exact: cameraList[idx].id } }
        } else {
          cameraConfig = { facingMode: 'environment' }
        }

        const onScanSuccess = async (ean) => {
          if (busyRef.current || !mountedRef.current) return
          busyRef.current = true
          playSuccessBeep()
          try {
            if (loadSoundSettings().vibration) {
              navigator.vibrate?.(60)
            }
          } catch {
            /* noop */
          }
          if (compareModeRef.current) {
            // Compare mode: wait for product before deciding flow
            setSearching(true)
            const [result] = await Promise.all([
              lookupProduct(ean, storeRef.current?.id || slugRef.current),
              stopScanner(),
            ])
            if (!mountedRef.current) return

            if (result.type === 'local' || result.type === 'external') {
              const scannedProduct = result.product
              const pinned = pinnedProductRef.current
              if (!pinned) {
                // First scan in compare mode: pin product A.
                rememberScan(scannedProduct)
                pinnedProductRef.current = scannedProduct
                setPinnedProduct(scannedProduct)
                setSearching(false)
                busyRef.current = false
                startScannerRef.current?.(cameraList, idx)
              } else {
                // Second scan: keep both products visible before explicit compare action.
                rememberScan(scannedProduct)
                secondCompareProductRef.current = scannedProduct
                setSecondCompareProduct(scannedProduct)
                setSearching(false)
                busyRef.current = false
              }
            } else {
              setNotFoundEan(ean)
              setSearching(false)
              busyRef.current = false
              clearTimeout(nfTimer.current)
              nfTimer.current = setTimeout(() => setNotFoundEan(null), 5000)
              startScannerRef.current?.(cameraList, idx)
            }
          } else {
            // Normal mode: navigate immediately, then enrich recent scans in background.
            setScanFlash(true)
            setTimeout(() => {
              if (mountedRef.current) setScanFlash(false)
            }, 350)
            stopScanner()
            lookupProduct(ean, storeRef.current?.id || slugRef.current)
              .then((r) => {
                if (r?.product) rememberScan(r.product)
              })
              .catch(() => {})
            navigate(buildProductPath(slugRef.current, ean), {
              state: { ean, fromScan: true },
            })
          }
        }

        const cameraAttempts = [
          cameraConfig,
          cameraList[idx]?.id,
          { facingMode: { ideal: 'environment' } },
          { facingMode: 'environment' },
          cameraList[0]?.id,
        ].filter(Boolean)
        let lastStartError = null
        for (const config of cameraAttempts) {
          if (!mountedRef.current || startSeq !== startSeqRef.current) return
          try {
            await scanner.start(config, scanConfig, onScanSuccess, () => {})
            if (!mountedRef.current || startSeq !== startSeqRef.current) {
              try {
                await scanner.stop()
                scanner.clear()
              } catch {
                /* noop */
              }
              return
            }
            lastStartError = null
            break
          } catch (err) {
            lastStartError = err
          }
        }
        if (lastStartError) throw lastStartError

        if (!mountedRef.current) {
          try {
            await scanner.stop()
            scanner.clear()
          } catch {
            /* noop */
          }
          return
        }
        setStatus('ready')
        try {
          const settings = scanner.getRunningTrackSettings()
          const host = document.getElementById('korset-scan-view')
          if (host && settings?.facingMode === 'user') {
            host.classList.add('scan-video-mirrored')
          } else if (host) {
            host.classList.remove('scan-video-mirrored')
          }
        } catch {
          /* noop */
        }
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
    [navigate, rememberScan, stopScanner]
  )
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
          const backRe = /back|rear|environment|задн|тыльн|сзади|основн|арт|артқы|негізгі/i
          const aBack = backRe.test(a.label) ? 1 : 0
          const bBack = backRe.test(b.label) ? 1 : 0
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
      startSeqRef.current += 1
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
    setCameraSwitchPressed(nextIdx !== 0)
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
              rememberScan(scannedProduct)
              pinnedProductRef.current = scannedProduct
              setPinnedProduct(scannedProduct)
              setSearching(false)
              startScanner(cameras, camIdx)
            } else {
              rememberScan(scannedProduct)
              secondCompareProductRef.current = scannedProduct
              setSecondCompareProduct(scannedProduct)
              setSearching(false)
            }
          } else {
            rememberScan(scannedProduct)
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
    [cameras, camIdx, navigate, rememberScan, stopScanner, startScanner]
  )

  const toggleCompareMode = useCallback(() => {
    const next = !compareModeActive
    const shouldRestartScanner = !next && Boolean(secondCompareProductRef.current)
    setCompareModeActive(next)
    compareModeRef.current = next
    if (next) {
      try {
        window.history.pushState(
          { _scanInternal: true },
          '',
          window.location.pathname + window.location.search
        )
      } catch {
        /* noop */
      }
      const seen = localStorage.getItem('korset_compare_scan_hint_seen') === '1'
      if (!seen) {
        try {
          window.history.pushState(
            { _scanInternal: true },
            '',
            window.location.pathname + window.location.search
          )
        } catch {
          /* noop */
        }
        setCompareHintOpen(true)
      }
    }
    if (!next) {
      setPinnedProduct(null)
      setSecondCompareProduct(null)
      pinnedProductRef.current = null
      secondCompareProductRef.current = null
      setSearching(false)
      busyRef.current = false
      if (shouldRestartScanner) startScannerRef.current?.(cameras, camIdx)
    }
  }, [cameras, camIdx, compareModeActive])

  const closeCompareHint = useCallback(() => {
    localStorage.setItem('korset_compare_scan_hint_seen', '1')
    setCompareHintOpen(false)
  }, [])

  useEffect(() => {
    closeCompareHintRef.current = closeCompareHint
  })

  const cancelCompareMode = useCallback(() => {
    const shouldRestartScanner = Boolean(secondCompareProductRef.current)
    setCompareModeActive(false)
    compareModeRef.current = false
    setPinnedProduct(null)
    setSecondCompareProduct(null)
    pinnedProductRef.current = null
    secondCompareProductRef.current = null
    setSearching(false)
    busyRef.current = false
    if (shouldRestartScanner) startScannerRef.current?.(cameras, camIdx)
  }, [cameras, camIdx])
  useEffect(() => {
    cancelCompareModeRef.current = cancelCompareMode
  })

  const handleHistoryOpen = useCallback(() => {
    try {
      window.history.pushState(
        { _scanInternal: true },
        '',
        window.location.pathname + window.location.search
      )
    } catch (e) {
      /* noop */
    }
    setHistoryOpen(true)
  }, [])

  const openCompareResult = useCallback(() => {
    const first = pinnedProductRef.current
    const second = secondCompareProductRef.current
    if (!first || !second) return
    navigate(buildComparePath(slugRef.current, first.ean, second.ean), {
      state: { productA: first, productB: second },
    })
  }, [navigate])

  const retryCamera = useCallback(() => {
    busyRef.current = false
    setSearching(false)
    setStatus('starting')
    startScannerRef.current?.(cameras, camIdx)
  }, [cameras, camIdx])

  const handleManualSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      const raw = manualInput.trim()
      if (raw.length !== 8 && raw.length !== 13) {
        setManualError(t('scan.manualInvalid'))
        return
      }
      setManualError(null)
      setManualInput('')
      setSearching(true)
      await stopScanner()
      const result = await lookupProduct(raw, storeRef.current?.id || slugRef.current)
      if (!mountedRef.current) return
      if (result.type === 'local' || result.type === 'external') {
        const p = result.product
        rememberScan(p)
        if (compareModeRef.current) {
          const pinned = pinnedProductRef.current
          if (!pinned) {
            pinnedProductRef.current = p
            setPinnedProduct(p)
            setSearching(false)
            startScannerRef.current?.(cameras, camIdx)
          } else {
            secondCompareProductRef.current = p
            setSecondCompareProduct(p)
            setSearching(false)
          }
        } else {
          navigate(buildProductPath(slugRef.current, p?.ean || raw), { state: { product: p } })
        }
      } else {
        setNotFoundEan(raw)
        setSearching(false)
        clearTimeout(nfTimer.current)
        nfTimer.current = setTimeout(() => setNotFoundEan(null), 4000)
        startScannerRef.current?.(cameras, camIdx)
      }
    },
    [manualInput, stopScanner, navigate, cameras, camIdx, rememberScan, t]
  )

  const dockLift = manualFocused ? Math.min(keyboardOffset, 340) : 0
  const canSwitchCamera = cameras.length > 1
  const hasManualValue = manualInput.trim().length > 0

  return (
    <div className="scan-screen">
      <div className="scan-stage" onClick={handleTapFocus} onTouchEnd={handleTapFocus}>
        <div id={ID} className="scan-video-host" />

        <div className="scan-topbar">
          <button
            type="button"
            className="scan-glass-icon"
            onClick={() => navigate(-1)}
            aria-label={t('common.back')}
          >
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <div className="scan-title-pill">
            <h1>{t('scan.scanTitle') || t('scan.title')}</h1>
          </div>
          <div className="scan-topbar__spacer" />
        </div>

        {status === 'ready' && !searching && (
          <div className="scan-frame-layer" aria-hidden="true">
            <div className="scan-frame">
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />
              <span className="scan-line" />
            </div>
            <p className="scan-frame-hint">{t('scan.hint')}</p>
          </div>
        )}

        <CompareTray
          active={compareModeActive && !searching}
          firstProduct={pinnedProduct}
          secondProduct={secondCompareProduct}
          onCompare={openCompareResult}
          onCancel={cancelCompareMode}
          t={t}
        />

        {focusPt && (
          <div className="scan-focus-ring" style={{ left: focusPt.x - 24, top: focusPt.y - 24 }} />
        )}

        {status === 'starting' && !searching && (
          <div className="scan-status-overlay">
            <div className="scan-spinner" />
            <p>{t('scan.startCamera')}</p>
          </div>
        )}

        {searching && (
          <div className="scan-status-overlay">
            <div className="scan-spinner" />
            <p>{t('scan.searching')}</p>
          </div>
        )}

        {status === 'error_permission' && (
          <div className="scan-status-overlay scan-status-overlay--error">
            <span className="material-symbols-outlined">photo_camera</span>
            <strong>{t('scan.cameraAccessDeniedTitle')}</strong>
            <p>{t('scan.cameraPermission')}</p>
            <div className="scan-status-overlay__actions">
              <button type="button" onClick={retryCamera}>
                {t('common.retry')}
              </button>
              <button type="button" className="ghost" onClick={openGallery}>
                {t('scan.galleryBtn')}
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="scan-status-overlay scan-status-overlay--error">
            <span className="material-symbols-outlined">camera_video_off</span>
            <strong>{t('scan.cameraError')}</strong>
            <p>{t('scan.cameraErrorBody')}</p>
            <div className="scan-status-overlay__actions">
              <button type="button" onClick={retryCamera}>
                {t('common.retry')}
              </button>
              <button type="button" className="ghost" onClick={openGallery}>
                {t('scan.galleryBtn')}
              </button>
            </div>
          </div>
        )}

        {scanFlash && <div className="scan-success-flash" />}

        {notFoundEan && (
          <div className="scan-toast scan-toast--bad">
            <strong>{!isOnline ? t('scan.offlineNotFound') : t('scan.notFoundToast')}</strong>
            <span>{notFoundEan}</span>
          </div>
        )}

        {galleryState === 'error' && (
          <div className="scan-toast scan-toast--bad wide">
            <strong>
              {galleryError === 'noBarcode' ? t('scan.galleryNoBarcode') : t('scan.galleryError')}
            </strong>
          </div>
        )}

        {torchErr && (
          <div className="scan-toast scan-toast--top">
            <strong>{t('scan.torchUnavailable')}</strong>
          </div>
        )}
      </div>

      <div
        className={`scan-dock ${manualFocused ? 'is-keyboard' : ''}`}
        style={{ transform: `translate3d(0, -${dockLift}px, 0)` }}
      >
        <div className="scan-actions">
          <ScanActionButton
            active={compareModeActive}
            label={t('scan.compare')}
            tone="compare"
            icon={<IconCompare active={compareModeActive} size={24} />}
            onClick={toggleCompareMode}
          />
          <ScanActionButton
            active={torchOn}
            label={t('scan.torch')}
            tone="torch"
            icon={<IconTorch on={torchOn} size={24} />}
            onClick={toggleTorch}
          />
          <ScanActionButton
            disabled={!canSwitchCamera}
            label={t('scan.cameraSwitch')}
            tone="camera"
            icon={<IconSwitchCamera filled={cameraSwitchPressed} size={24} />}
            onClick={switchCamera}
          />
          <ScanActionButton
            active={galleryState === 'scanning'}
            label={t('scan.gallery')}
            tone="gallery"
            icon={
              galleryState === 'scanning' ? (
                <span className="scan-mini-spinner" />
              ) : (
                <IconGallery size={24} />
              )
            }
            onClick={openGallery}
          />
        </div>

        <form
          className={`scan-manual-form ${hasManualValue ? 'has-value' : ''}`}
          onSubmit={handleManualSubmit}
        >
          <label className={`scan-manual-input ${manualError ? 'has-error' : ''}`}>
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={17}
              aria-describedby="scan-manual-helper"
              placeholder={t('scan.manualInputPlaceholder')}
              value={formatManualEan(manualInput)}
              onFocus={() => setManualFocused(true)}
              onBlur={() => setManualFocused(false)}
              onChange={(e) => {
                setManualInput(e.target.value.replace(/\D/g, '').slice(0, 13))
                setManualError(null)
              }}
            />
          </label>
          <button
            type="button"
            className="scan-history-btn"
            onClick={handleHistoryOpen}
            aria-label={t('scan.recentScans')}
          >
            <IconHistory size={24} />
          </button>
          {hasManualValue && (
            <button type="submit" className="scan-submit-btn" aria-label={t('scan.manualSubmit')}>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          )}
        </form>
        {(manualFocused || hasManualValue) && (
          <p id="scan-manual-helper" className="scan-manual-helper">
            {hasManualValue
              ? t('scan.manualHelperActive', { count: manualInput.length })
              : t('scan.manualHelper')}
          </p>
        )}
        {manualError && <p className="scan-manual-error">{manualError}</p>}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleGalleryFile}
      />

      <ScanHintSheet open={compareHintOpen} onClose={closeCompareHint} t={t} />
      <RecentScansSheet
        open={historyOpen}
        scans={recentScans}
        onClose={() => setHistoryOpen(false)}
        onSelect={(scan) => {
          setHistoryOpen(false)
          navigate(buildProductPath(slugRef.current, scan.ean))
        }}
        t={t}
      />
      <TermsConsentSheet
        open={consentOpen}
        onAccept={() => setConsentOpen(false)}
        onNavigateTerms={() => navigate(buildTermsPath(storeSlug))}
        onNavigatePolicy={() => navigate(buildPrivacyPath(storeSlug))}
      />
    </div>
  )
}
