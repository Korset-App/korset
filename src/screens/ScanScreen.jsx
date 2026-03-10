import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import products from '../data/products.json'
import { formatPrice, CATEGORY_LABELS, checkProductFit } from '../utils/fitCheck.js'
import { loadProfile } from '../utils/profile.js'

const QR_PREFIX = 'korset:'

// ─── Scanner ──────────────────────────────────────────────────────────────────
function BarcodeScanner({ onDetected, onClose }) {
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)
  const [wrongScan, setWrongScan] = useState(false)
  const scannerRef = useRef(null)
  const busyRef = useRef(false)
  const ID = 'korset-qr-reader'

  const doClose = async () => {
    if (busyRef.current) return
    busyRef.current = true
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
      }
    } catch {}
    onClose()
  }

  useEffect(() => {
    let mounted = true

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (!mounted) return

        const scanner = new Html5Qrcode(ID, { verbose: false })
        scannerRef.current = scanner

        if (!mounted) return

        // iOS fix: use facingMode directly instead of getCameras()
        // getCameras() on iPhone returns multiple lenses and causes flickering
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

        const cameraConfig = isIOS
          ? { facingMode: { exact: 'environment' } }
          : await (async () => {
              const cameras = await Html5Qrcode.getCameras()
              if (!cameras?.length) return null
              const cam = cameras.find(c => /back|rear|environment/i.test(c.label)) || cameras[cameras.length - 1]
              return { deviceId: { exact: cam.id } }
            })()

        if (!cameraConfig) { setError('Камера не обнаружена.'); return }
        if (!mounted) return

        await scanner.start(
          cameraConfig,
          { fps: 15, qrbox: 250, aspectRatio: 1.0 },
          async (text) => {
            if (busyRef.current || !mounted) return

            // Only accept korset: QR codes
            if (!text.startsWith(QR_PREFIX)) {
              // Show hint for 2 sec then clear
              setWrongScan(true)
              setTimeout(() => mounted && setWrongScan(false), 2000)
              return
            }

            busyRef.current = true
            try { navigator.vibrate?.(80) } catch {}
            try {
              await scanner.stop()
              scanner.clear()
              scannerRef.current = null
            } catch {}
            if (mounted) onDetected(text)
          },
          () => {}
        )

        if (mounted) setReady(true)
      } catch (e) {
        if (!mounted) return
        const msg = String(e?.message || e)
        if (/permission|not allowed|denied/i.test(msg)) {
          setError('Доступ к камере отклонён.\nРазрешите доступ в настройках браузера.')
        } else {
          setError(`Ошибка камеры: ${msg}`)
        }
      }
    }

    start()
    return () => {
      mounted = false
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        try { scannerRef.current.clear() } catch {}
      }
    }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#000', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div id={ID} style={{ width: '100%', height: '100%' }} />

        {ready && !error && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'relative', zIndex: 2, width: 250, height: 250, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)', borderRadius: 12 }}>
              {[
                { top:-3,left:-3,   borderTop:'3px solid #A78BFA',borderLeft:'3px solid #A78BFA',  borderRadius:'6px 0 0 0' },
                { top:-3,right:-3,  borderTop:'3px solid #A78BFA',borderRight:'3px solid #A78BFA', borderRadius:'0 6px 0 0' },
                { bottom:-3,left:-3,  borderBottom:'3px solid #A78BFA',borderLeft:'3px solid #A78BFA',  borderRadius:'0 0 0 6px' },
                { bottom:-3,right:-3, borderBottom:'3px solid #A78BFA',borderRight:'3px solid #A78BFA', borderRadius:'0 0 6px 0' },
              ].map((s,i) => <div key={i} style={{ position:'absolute',width:32,height:32,...s }} />)}
              <div style={{ position:'absolute',left:8,right:8,height:2, background:'linear-gradient(90deg,transparent,#A78BFA 30%,#7C3AED 70%,transparent)', animation:'scanLine 2s ease-in-out infinite',borderRadius:2 }} />
            </div>
          </div>
        )}

        {/* Wrong QR hint */}
        {wrongScan && (
          <div style={{ position:'absolute',bottom:120,left:0,right:0,display:'flex',justifyContent:'center',zIndex:10 }}>
            <div style={{ background:'rgba(245,158,11,0.95)',borderRadius:12,padding:'10px 20px',fontSize:13,fontWeight:600,color:'#000' }}>
              ⚠️ Это не QR-код Körset
            </div>
          </div>
        )}

        {error && (
          <div style={{ position:'absolute',inset:0,background:'#07070F',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 28px',gap:18,textAlign:'center' }}>
            <div style={{ fontSize:56 }}>📷</div>
            <p style={{ color:'#F87171',fontSize:15,lineHeight:1.8,whiteSpace:'pre-line' }}>{error}</p>
            <button onClick={onClose} style={{ padding:'13px 36px',borderRadius:14,background:'#7C3AED',border:'none',color:'#fff',fontSize:15,fontWeight:600,cursor:'pointer' }}>
              ← Назад
            </button>
          </div>
        )}

        {!error && (
          <button onClick={doClose} style={{ position:'absolute',top:52,right:16,zIndex:30,width:44,height:44,borderRadius:'50%',background:'rgba(0,0,0,0.75)',border:'2px solid rgba(255,255,255,0.3)',color:'#fff',fontSize:22,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1 }}>
            ×
          </button>
        )}
      </div>

      {!error && (
        <div style={{ padding:'18px 24px 40px',background:'#09090F',borderTop:'1px solid rgba(139,92,246,0.2)',textAlign:'center',flexShrink:0 }}>
          <p style={{ color:ready?'#C4B5FD':'#9898B8',fontSize:15,fontWeight:500 }}>
            {ready ? 'Наводите на QR-код с ценника' : 'Запуск камеры...'}
          </p>
          <p style={{ color:'#58587A',fontSize:12,marginTop:6 }}>Сканируйте QR-коды Körset</p>
        </div>
      )}

      <style>{`
        #${ID} video { width:100%!important;height:100%!important;object-fit:cover!important;position:absolute!important;top:0!important;left:0!important; }
        #${ID} img, #${ID} canvas { display:none!important; }
        #${ID} > div { background:transparent!important;border:none!important; }
        @keyframes scanLine { 0%{top:8%} 50%{top:86%} 100%{top:8%} }
      `}</style>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ScanScreen() {
  const navigate = useNavigate()
  const profile = loadProfile()
  const [scannerOpen, setScannerOpen] = useState(false)
  const hasProfile = Boolean(profile?.halal || profile?.halalOnly || profile?.allergens?.length || profile?.dietGoals?.length)

  const handleDetected = (text) => {
    setScannerOpen(false)
    const id = text.startsWith(QR_PREFIX) ? text.slice(QR_PREFIX.length) : text
    const product = products.find(p => p.id === id)
    if (product) {
      navigate(`/product/${product.id}`)
    }
    // If not found — just stay on scan screen (no dark screen bug)
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
          <p className="scan-hint">Наведите камеру на QR-код с ценника Körset</p>
        </div>

        <div className="divider" />

        <div className="section">
          <div className="section-title" style={{ marginBottom:10 }}>Все товары</div>
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {products.map((product, i) => {
              const fits = hasProfile ? checkProductFit(product, profile).fits : null
              return (
                <div key={product.id} className="product-item" style={{ animationDelay:`${i*0.03}s` }} onClick={() => navigate(`/product/${product.id}`)}>
                  <div className="product-emoji" style={{ background:'var(--primary-dim)',border:'1px solid rgba(139,92,246,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:'var(--primary-bright)' }}>
                    {product.name[0]}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div className="product-name" style={{ overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{product.name}</div>
                    <div className="product-meta">
                      <span className="product-price">{formatPrice(product.priceKzt)}</span>
                      <span className="product-shelf">{product.shelf}</span>
                    </div>
                  </div>
                  {fits !== null && (
                    <div style={{ width:32,height:32,borderRadius:'50%',flexShrink:0,background:fits?'rgba(16,185,129,0.15)':'rgba(220,38,38,0.12)',border:`1.5px solid ${fits?'rgba(16,185,129,0.4)':'rgba(220,38,38,0.3)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:700,color:fits?'var(--success-bright)':'var(--error-bright)' }}>
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
