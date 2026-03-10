import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import products from '../data/products.json'
import { formatPrice, CATEGORY_LABELS, checkProductFit } from '../utils/fitCheck.js'
import { loadProfile } from '../utils/profile.js'

const QR_PREFIX = 'korset:'

function BarcodeScanner({ onDetected, onClose }) {
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)
  const scannerRef = useRef(null)
  const detectedRef = useRef(false)
  const ID = 'korset-qr-reader'

  useEffect(() => {
    let scanner = null

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        scanner = new Html5Qrcode(ID, { verbose: false })
        scannerRef.current = scanner

        const cameras = await Html5Qrcode.getCameras()
        if (!cameras?.length) { setError('Камера не найдена.'); return }

        const cam = cameras.find(c => /back|rear|environment/i.test(c.label)) || cameras[cameras.length - 1]

        await scanner.start(
          cam.id,
          { fps: 20, qrbox: 250, aspectRatio: 1.0 },
          (text) => {
            if (detectedRef.current) return
            detectedRef.current = true
            try { navigator.vibrate?.(80) } catch {}
            onDetected(text)
          },
          () => {}
        )
        setReady(true)
      } catch (e) {
        const msg = String(e?.message || e)
        if (/permission|not allowed|denied/i.test(msg)) {
          setError('Доступ к камере отклонён.\nРазрешите доступ в настройках браузера.')
        } else {
          setError(`Ошибка: ${msg}`)
        }
      }
    }

    start()
    return () => {
      scannerRef.current?.stop().catch(() => {})
      scannerRef.current?.clear()
    }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#000', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div id={ID} style={{ width: '100%', height: '100%' }} />

        {ready && !error && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 250, height: 250 }}>
              {[
                { top: -3, left: -3,   borderTop: '3px solid #A78BFA', borderLeft: '3px solid #A78BFA',  borderRadius: '6px 0 0 0' },
                { top: -3, right: -3,  borderTop: '3px solid #A78BFA', borderRight: '3px solid #A78BFA', borderRadius: '0 6px 0 0' },
                { bottom: -3, left: -3,  borderBottom: '3px solid #A78BFA', borderLeft: '3px solid #A78BFA',  borderRadius: '0 0 0 6px' },
                { bottom: -3, right: -3, borderBottom: '3px solid #A78BFA', borderRight: '3px solid #A78BFA', borderRadius: '0 0 6px 0' },
              ].map((s, i) => <div key={i} style={{ position: 'absolute', width: 32, height: 32, ...s }} />)}
              <div style={{
                position: 'absolute', left: 8, right: 8, height: 2,
                background: 'linear-gradient(90deg, transparent, #A78BFA 30%, #7C3AED 70%, transparent)',
                animation: 'scanLine 2s ease-in-out infinite', borderRadius: 2,
              }} />
            </div>
          </div>
        )}

        {error && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,7,15,0.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 28px', gap: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 56 }}>📷</div>
            <p style={{ color: '#F87171', fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{error}</p>
            <button onClick={onClose} style={{ padding: '13px 36px', borderRadius: 14, background: '#7C3AED', border: 'none', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              Закрыть
            </button>
          </div>
        )}

        {!error && (
          <button onClick={onClose} style={{ position: 'absolute', top: 52, right: 16, zIndex: 20, width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: '1.5px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        )}
      </div>

      {!error && (
        <div style={{ padding: '18px 24px 40px', background: '#09090F', borderTop: '1px solid rgba(139,92,246,0.2)', textAlign: 'center' }}>
          <p style={{ color: ready ? '#C4B5FD' : '#9898B8', fontSize: 15, fontWeight: 500 }}>
            {ready ? 'Наводите на QR-код товара' : 'Запуск камеры...'}
          </p>
          <p style={{ color: '#58587A', fontSize: 12, marginTop: 6 }}>Сканируйте QR-коды с ценников Körset</p>
        </div>
      )}

      <style>{`
        #${ID} video { width:100%!important; height:100%!important; object-fit:cover!important; position:absolute!important; top:0!important; left:0!important; }
        #${ID} img, #${ID} canvas, #${ID} > div:not([id]) { display:none!important; }
        @keyframes scanLine { 0%{top:8%} 50%{top:86%} 100%{top:8%} }
      `}</style>
    </div>
  )
}

export default function ScanScreen() {
  const navigate = useNavigate()
  const profile = loadProfile()
  const [scannerOpen, setScannerOpen] = useState(false)

  const hasProfile = Boolean(profile?.halal || profile?.halalOnly || profile?.allergens?.length || profile?.dietGoals?.length)

  const handleDetected = (text) => {
    setScannerOpen(false)
    // QR содержит "korset:p001" или просто "p001"
    const id = text.startsWith(QR_PREFIX) ? text.slice(QR_PREFIX.length) : text
    const product = products.find(p => p.id === id)
    if (product) {
      navigate(`/product/${product.id}`)
    } else {
      // fallback — попробовать по EAN
      const byEan = products.find(p => p.ean === text)
      if (byEan) navigate(`/product/${byEan.id}`)
      else navigate(`/product/ext/${text}`)
    }
  }

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleDetected} onClose={() => setScannerOpen(false)} />}

      <div className="screen">
        <div className="scan-btn-container">
          <button className="scan-btn" onClick={() => setScannerOpen(true)}>
            <div className="scan-icon">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/>
                <rect x="3" y="16" width="5" height="5" rx="1"/>
                <path d="M16 16h5v5M16 16v5M3 12h4M10 3v4M12 10h7M10 16v5"/>
              </svg>
            </div>
            <span>Сканировать QR-код</span>
          </button>
          <p className="scan-hint">Наведите камеру на QR-код с ценника</p>
        </div>

        {/* Link to QR sheet */}
        <div style={{ padding: '0 20px 8px' }}>
          <button
            className="btn btn-secondary btn-full"
            onClick={() => navigate('/qr-print')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"/><polyline points="6 15 6 20 18 20 18 15"/>
              <rect x="3" y="9" width="18" height="6"/>
            </svg>
            Распечатать QR-коды товаров
          </button>
        </div>

        <div className="divider" />

        <div className="section">
          <div className="section-title" style={{ marginBottom: 10 }}>Все товары</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {products.map((product, i) => {
              const fits = hasProfile ? checkProductFit(product, profile).fits : null
              return (
                <div key={product.id} className="product-item" style={{ animationDelay: `${i * 0.03}s` }}
                  onClick={() => navigate(`/product/${product.id}`)}>
                  <div className="product-emoji" style={{ background: 'var(--primary-dim)', border: '1px solid rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--primary-bright)' }}>
                    {product.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="product-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                    <div className="product-meta">
                      <span className="product-price">{formatPrice(product.priceKzt)}</span>
                      <span className="product-shelf">{product.shelf}</span>
                    </div>
                  </div>
                  {fits !== null && (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: fits ? 'rgba(16,185,129,0.15)' : 'rgba(220,38,38,0.12)', border: `1.5px solid ${fits ? 'rgba(16,185,129,0.4)' : 'rgba(220,38,38,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: fits ? 'var(--success-bright)' : 'var(--error-bright)' }}>
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
