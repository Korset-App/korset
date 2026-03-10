import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import products from '../data/products.json'
import { formatPrice, CATEGORY_LABELS } from '../utils/fitCheck.js'
import { loadProfile } from '../utils/profile.js'
import { checkProductFit } from '../utils/fitCheck.js'

// ── EAN barcode scanner using ZXing via CDN ────────────────────────────────
function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [status, setStatus] = useState('Наводите камеру на штрихкод')
  const [error, setError] = useState(null)

  useEffect(() => {
    let stopped = false

    async function startScanner() {
      try {
        // Load ZXing dynamically
        if (!window.ZXing) {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script')
            s.src = 'https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js'
            s.onload = resolve
            s.onerror = reject
            document.head.appendChild(s)
          })
        }

        const codeReader = new window.ZXing.BrowserMultiFormatReader()
        readerRef.current = codeReader

        const devices = await window.ZXing.BrowserMultiFormatReader.listVideoInputDevices()
        // prefer back camera
        const device = devices.find(d => /back|rear|environment/i.test(d.label)) || devices[devices.length - 1]

        if (!device) {
          setError('Камера не найдена')
          return
        }

        setStatus('Сканирую...')

        await codeReader.decodeFromVideoDevice(
          device.deviceId,
          videoRef.current,
          (result, err) => {
            if (stopped) return
            if (result) {
              const ean = result.getText()
              onDetected(ean)
            }
          }
        )
      } catch (e) {
        if (!stopped) setError('Нет доступа к камере. Проверьте разрешения.')
      }
    }

    startScanner()

    return () => {
      stopped = true
      readerRef.current?.reset()
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: '#000',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Video */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          autoPlay
          muted
          playsInline
        />

        {/* Scan frame overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
          {/* Transparent scan window */}
          <div style={{
            position: 'relative', zIndex: 1,
            width: 280, height: 140,
            borderRadius: 12,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
          }}>
            {/* Corner marks */}
            {[['0,0', '0,0'], ['0,100%', '0,0'], ['100%,0', '0,0'], ['100%,100%', '0,0']].map((_, i) => {
              const corners = [
                { top: -2, left: -2, borderTop: '3px solid #A78BFA', borderLeft: '3px solid #A78BFA' },
                { top: -2, right: -2, borderTop: '3px solid #A78BFA', borderRight: '3px solid #A78BFA' },
                { bottom: -2, left: -2, borderBottom: '3px solid #A78BFA', borderLeft: '3px solid #A78BFA' },
                { bottom: -2, right: -2, borderBottom: '3px solid #A78BFA', borderRight: '3px solid #A78BFA' },
              ]
              return (
                <div key={i} style={{
                  position: 'absolute', width: 24, height: 24, borderRadius: 2,
                  ...corners[i],
                }} />
              )
            })}
            {/* Scan line animation */}
            <div style={{
              position: 'absolute', left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent, #A78BFA, transparent)',
              animation: 'scanLine 1.8s ease-in-out infinite',
              top: '50%',
            }} />
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 52, right: 20, zIndex: 10,
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'white', fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>

      {/* Status bar */}
      <div style={{
        padding: '20px 24px 40px',
        background: '#0C0C18',
        borderTop: '1px solid rgba(139,92,246,0.2)',
        textAlign: 'center',
      }}>
        {error ? (
          <p style={{ color: '#F87171', fontSize: 14 }}>{error}</p>
        ) : (
          <p style={{ color: '#C4B5FD', fontSize: 14 }}>{status}</p>
        )}
        <p style={{ color: '#58587A', fontSize: 12, marginTop: 6 }}>
          Поддерживаются штрихкоды EAN-8, EAN-13 и QR-коды
        </p>
      </div>

      <style>{`
        @keyframes scanLine {
          0% { top: 10%; }
          50% { top: 90%; }
          100% { top: 10%; }
        }
      `}</style>
    </div>
  )
}

// ── Main ScanScreen ────────────────────────────────────────────────────────
export default function ScanScreen() {
  const navigate = useNavigate()
  const profile = loadProfile()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanResult, setScanResult] = useState(null) // { found: bool, product?, ean }

  const handleDetected = (ean) => {
    setScannerOpen(false)
    const product = products.find(p => p.ean === ean)
    if (product) {
      navigate(`/product/${product.id}`)
    } else {
      setScanResult({ found: false, ean })
    }
  }

  const hasProfile = Boolean(
    profile?.halal || profile?.halalOnly ||
    profile?.allergens?.length ||
    profile?.dietGoals?.length
  )

  const getFit = (product) => {
    if (!hasProfile) return null
    return checkProductFit(product, profile).fits
  }

  // Demo products for quick access
  const demoProducts = products.slice(0, 8)

  return (
    <>
      {scannerOpen && (
        <BarcodeScanner
          onDetected={handleDetected}
          onClose={() => setScannerOpen(false)}
        />
      )}

      <div className="screen">
        {/* Scan button */}
        <div className="scan-btn-container">
          <button
            className="scan-btn"
            onClick={() => { setScanResult(null); setScannerOpen(true) }}
          >
            <div className="scan-icon">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <span>Сканировать штрихкод</span>
          </button>
          <p className="scan-hint">
            Наведите камеру на EAN штрихкод любого товара
          </p>
        </div>

        {/* Not found result */}
        {scanResult && !scanResult.found && (
          <div style={{ padding: '0 20px 8px' }}>
            <div style={{
              background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: 'var(--radius)', padding: '14px 16px',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--error-bright)', marginBottom: 4 }}>
                Товар не найден в каталоге
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>EAN: {scanResult.ean}</div>
            </div>
          </div>
        )}

        <div className="divider" />

        {/* Demo list */}
        <div className="section">
          <div className="section-title" style={{ marginBottom: 10 }}>Демо-товары</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {demoProducts.map((product, i) => {
              const fits = getFit(product)
              return (
                <div
                  key={product.id}
                  className="product-item"
                  style={{ animationDelay: `${i * 0.04}s` }}
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div className="product-emoji" style={{
                    background: 'var(--primary-dim)',
                    border: '1px solid rgba(139,92,246,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, color: 'var(--primary-bright)',
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                  }}>
                    {product.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="product-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {product.name}
                    </div>
                    <div className="product-meta">
                      <span className="product-price">{formatPrice(product.priceKzt)}</span>
                      <span className="product-shelf">{product.shelf}</span>
                      <span className={`category-badge ${product.category}`}>{CATEGORY_LABELS[product.category]}</span>
                    </div>
                  </div>
                  {fits !== null && (
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: fits ? 'rgba(16,185,129,0.15)' : 'rgba(220,38,38,0.12)',
                      border: `1.5px solid ${fits ? 'rgba(16,185,129,0.4)' : 'rgba(220,38,38,0.3)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, color: fits ? 'var(--success-bright)' : 'var(--error-bright)',
                    }}>
                      {fits ? '✓' : '✕'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
