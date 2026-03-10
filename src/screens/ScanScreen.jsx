import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import products from '../data/products.json'
import { formatPrice, CATEGORY_LABELS, checkProductFit } from '../utils/fitCheck.js'
import { loadProfile } from '../utils/profile.js'

// ─── Scanner Component ────────────────────────────────────────────────────────
function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectedRef = useRef(false)
  const [status, setStatus] = useState('Запрашиваю доступ к камере...')
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let stopped = false
    let animId = null

    async function start() {
      // 1. Get camera stream
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
      } catch (e) {
        if (!stopped) setError(
          e.name === 'NotAllowedError'
            ? 'Доступ к камере отклонён.\nОткройте настройки браузера и разрешите доступ к камере.'
            : `Не удалось открыть камеру: ${e.message}`
        )
        return
      }
      if (stopped) { stream.getTracks().forEach(t => t.stop()); return }

      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      if (stopped) return
      setStatus('Наводите на штрихкод')
      setReady(true)

      // 2. Load ZXing from CDN (no npm conflicts)
      if (!window.ZXingBrowser) {
        await new Promise((res, rej) => {
          // use the UMD build from jsdelivr - very reliable
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.1/umd/index.min.js'
          s.onload = res
          s.onerror = () => {
            // fallback to unpkg
            const s2 = document.createElement('script')
            s2.src = 'https://unpkg.com/@zxing/browser@0.0.9/umd/index.min.js'
            s2.onload = res
            s2.onerror = rej
            document.head.appendChild(s2)
          }
          document.head.appendChild(s)
        })
      }
      if (stopped) return

      // 3. Scan loop using canvas snapshot
      const ZXing = window.ZXingBrowser || window.ZXing
      let reader
      try {
        reader = new ZXing.BrowserMultiFormatReader()
      } catch {
        // try alternate export name
        const lib = window.ZXingBrowser || window.ZXing
        const keys = Object.keys(lib || {})
        const ReaderClass = lib[keys.find(k => k.includes('MultiFormat') || k.includes('Reader'))]
        if (!ReaderClass) { setError('Не удалось инициализировать сканер'); return }
        reader = new ReaderClass()
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      const tick = async () => {
        if (stopped || detectedRef.current) return
        const video = videoRef.current
        if (video && video.readyState >= 2) {
          try {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            ctx.drawImage(video, 0, 0)
            const imgData = canvas.toDataURL('image/jpeg', 0.8)
            const img = new Image()
            img.src = imgData
            await img.decode()
            const result = await reader.decodeFromImageElement(img)
            if (result && !detectedRef.current) {
              detectedRef.current = true
              setStatus('✓ Штрихкод считан!')
              onDetected(result.getText())
              return
            }
          } catch { /* no barcode in frame - normal */ }
        }
        animId = setTimeout(tick, 300) // check 3x per second
      }
      tick()
    }

    start()

    return () => {
      stopped = true
      clearTimeout(animId)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: '#000', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />

        {!error && ready && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                position: 'relative', zIndex: 2,
                width: 280, height: 160,
                borderRadius: 12,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
              }}>
                {/* Corners */}
                {[
                  { top: -3, left: -3,  borderTop: '3px solid #A78BFA', borderLeft: '3px solid #A78BFA',  borderRadius: '4px 0 0 0' },
                  { top: -3, right: -3, borderTop: '3px solid #A78BFA', borderRight: '3px solid #A78BFA', borderRadius: '0 4px 0 0' },
                  { bottom: -3, left: -3,  borderBottom: '3px solid #A78BFA', borderLeft: '3px solid #A78BFA',  borderRadius: '0 0 0 4px' },
                  { bottom: -3, right: -3, borderBottom: '3px solid #A78BFA', borderRight: '3px solid #A78BFA', borderRadius: '0 0 4px 0' },
                ].map((s, i) => (
                  <div key={i} style={{ position: 'absolute', width: 26, height: 26, ...s }} />
                ))}
                {/* Scan line */}
                <div style={{
                  position: 'absolute', left: 4, right: 4, height: 2,
                  background: 'linear-gradient(90deg, transparent, #A78BFA 30%, #7C3AED 70%, transparent)',
                  animation: 'scanLine 2s ease-in-out infinite',
                  borderRadius: 2,
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(7,7,15,0.96)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '32px 24px', gap: 16, textAlign: 'center',
          }}>
            <div style={{ fontSize: 52 }}>📷</div>
            <p style={{ color: '#F87171', fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{error}</p>
            <button onClick={onClose} style={{
              padding: '13px 32px', borderRadius: 14,
              background: '#7C3AED', border: 'none',
              color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>Закрыть</button>
          </div>
        )}

        {/* Close button */}
        {!error && (
          <button onClick={onClose} style={{
            position: 'absolute', top: 52, right: 16, zIndex: 10,
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(0,0,0,0.65)', border: '1.5px solid rgba(255,255,255,0.25)',
            color: 'white', fontSize: 22, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        )}
      </div>

      {!error && (
        <div style={{
          padding: '20px 24px 40px', background: '#09090F',
          borderTop: '1px solid rgba(139,92,246,0.2)', textAlign: 'center',
        }}>
          <p style={{ color: ready ? '#C4B5FD' : '#9898B8', fontSize: 15, fontWeight: 500 }}>{status}</p>
          <p style={{ color: '#58587A', fontSize: 12, marginTop: 6 }}>EAN-8 · EAN-13 · QR-код · Code-128</p>
        </div>
      )}

      <style>{`
        @keyframes scanLine {
          0%   { top: 8%; }
          50%  { top: 86%; }
          100% { top: 8%; }
        }
      `}</style>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ScanScreen() {
  const navigate = useNavigate()
  const profile = loadProfile()
  const [scannerOpen, setScannerOpen] = useState(false)

  const hasProfile = Boolean(
    profile?.halal || profile?.halalOnly ||
    profile?.allergens?.length || profile?.dietGoals?.length
  )

  const handleDetected = (ean) => {
    setScannerOpen(false)
    // Check our local DB first
    const local = products.find(p => p.ean === ean)
    if (local) {
      navigate(`/product/${local.id}`)
    } else {
      // Not in DB → go to external product screen with EAN
      navigate(`/product/ext/${ean}`)
    }
  }

  const demoProducts = products.slice(0, 8)

  return (
    <>
      {scannerOpen && (
        <BarcodeScanner onDetected={handleDetected} onClose={() => setScannerOpen(false)} />
      )}

      <div className="screen">
        <div className="scan-btn-container">
          <button className="scan-btn" onClick={() => setScannerOpen(true)}>
            <div className="scan-icon">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <span>Сканировать штрихкод</span>
          </button>
          <p className="scan-hint">Наведите камеру на штрихкод любого товара</p>
        </div>

        <div className="divider" />

        <div className="section">
          <div className="section-title" style={{ marginBottom: 10 }}>Демо-товары</div>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12, lineHeight: 1.5 }}>
            Нажмите чтобы открыть карточку без сканирования
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {demoProducts.map((product, i) => {
              const fits = hasProfile ? checkProductFit(product, profile).fits : null
              return (
                <div key={product.id} className="product-item"
                  style={{ animationDelay: `${i * 0.04}s` }}
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div className="product-emoji" style={{
                    background: 'var(--primary-dim)',
                    border: '1px solid rgba(139,92,246,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 700, color: 'var(--primary-bright)',
                  }}>{product.name[0]}</div>
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
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: fits ? 'rgba(16,185,129,0.15)' : 'rgba(220,38,38,0.12)',
                      border: `1.5px solid ${fits ? 'rgba(16,185,129,0.4)' : 'rgba(220,38,38,0.3)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 700,
                      color: fits ? 'var(--success-bright)' : 'var(--error-bright)',
                    }}>{fits ? '✓' : '✕'}</div>
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
