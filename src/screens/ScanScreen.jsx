import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { lookupProduct } from '../utils/productLookup.js'

// ─── Barcode Scanner ───────────────────────────────────────────────────────────
function BarcodeScanner({ onDetected, onClose }) {
  const [status, setStatus] = useState('starting')
  const [error, setError]   = useState(null)
  const [searching, setSearching] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [torchMsg, setTorchMsg] = useState(null)
  const scannerRef = useRef(null)
  const busyRef    = useRef(false)
  const trackRef   = useRef(null)
  const torchTimerRef = useRef(null)
  const ID = 'korset-barcode-reader'

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
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        if (!mounted) return
        const scanner = new Html5Qrcode(ID, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
        })
        scannerRef.current = scanner
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
        const cameraConfig = isIOS
          ? { facingMode: { exact: 'environment' } }
          : await (async () => {
              const cameras = await Html5Qrcode.getCameras()
              if (!cameras?.length) return null
              const cam = cameras.find(c => /back|rear|environment/i.test(c.label)) || cameras[cameras.length - 1]
              return { deviceId: { exact: cam.id } }
            })()
        if (!cameraConfig) { setError('Камера не обнаружена'); setStatus('error'); return }
        if (!mounted) return
        await scanner.start(
          cameraConfig,
          { fps: 10, qrbox: { width: 300, height: 130 }, aspectRatio: 1.777 },
          async (ean) => {
            if (busyRef.current || !mounted) return
            busyRef.current = true
            try { navigator.vibrate?.(80) } catch {}
            setSearching(true)
            try { await scanner.stop(); scanner.clear(); scannerRef.current = null } catch {}
            if (mounted) onDetected(ean)
          },
          () => {}
        )
        if (mounted) setStatus('ready')
        // Save video track reference for torch control
        try {
          const videoEl = document.querySelector('#' + ID + ' video')
          if (videoEl?.srcObject) {
            const track = videoEl.srcObject.getVideoTracks()[0]
            if (track) trackRef.current = track
          }
        } catch {}
      } catch (e) {
        if (!mounted) return
        const msg = String(e?.message || e)
        setError(/permission|not allowed|denied/i.test(msg)
          ? 'Доступ к камере отклонён.\nРазрешите доступ в настройках браузера.'
          : `Ошибка камеры: ${msg}`)
        setStatus('error')
      }
    }
    start()
    return () => {
      mounted = false
      if (scannerRef.current) { scannerRef.current.stop().catch(()=>{}); try{scannerRef.current.clear()}catch{} }
    }
  }, [])

  const showTorchMsg = (msg) => {
    clearTimeout(torchTimerRef.current)
    setTorchMsg(msg)
    torchTimerRef.current = setTimeout(() => setTorchMsg(null), 2800)
  }

  const toggleTorch = async () => {
    const next = !torchOn
    // Method 1: applyConstraints torch (Chrome/Edge/Android WebView)
    if (trackRef.current) {
      try {
        await trackRef.current.applyConstraints({ advanced: [{ torch: next }] })
        setTorchOn(next)
        return
      } catch {}
      // Method 2: ImageCapture API (some browsers)
      try {
        const ic = new ImageCapture(trackRef.current)
        const caps = await ic.getPhotoCapabilities?.()
        if (caps?.fillLightMode?.includes('flash')) {
          await ic.takePhoto({ fillLightMode: next ? 'flash' : 'off' })
          setTorchOn(next)
          return
        }
      } catch {}
    }
    // Fallback: browser doesn't support torch
    showTorchMsg('Фонарик недоступен в этом браузере — используйте Chrome')
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:500,background:'#000',display:'flex',flexDirection:'column'}}>
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <div id={ID} style={{width:'100%',height:'100%'}} />

        {status==='ready' && !searching && (
          <div style={{position:'absolute',inset:0,pointerEvents:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)'}} />
            <div style={{position:'relative',zIndex:2,width:300,height:130,boxShadow:'0 0 0 9999px rgba(0,0,0,0.55)',borderRadius:8}}>
              {[
                {top:-3,left:-3,borderTop:'3px solid #A78BFA',borderLeft:'3px solid #A78BFA',borderRadius:'6px 0 0 0'},
                {top:-3,right:-3,borderTop:'3px solid #A78BFA',borderRight:'3px solid #A78BFA',borderRadius:'0 6px 0 0'},
                {bottom:-3,left:-3,borderBottom:'3px solid #A78BFA',borderLeft:'3px solid #A78BFA',borderRadius:'0 0 0 6px'},
                {bottom:-3,right:-3,borderBottom:'3px solid #A78BFA',borderRight:'3px solid #A78BFA',borderRadius:'0 0 6px 0'},
              ].map((s,i)=><div key={i} style={{position:'absolute',width:28,height:28,...s}}/>)}
              <div style={{position:'absolute',left:10,right:10,height:2,background:'linear-gradient(90deg,transparent,#A78BFA 30%,#7C3AED 70%,transparent)',animation:'scanLine 1.8s ease-in-out infinite',borderRadius:2}}/>
            </div>
          </div>
        )}

        {searching && (
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
            <div style={{width:48,height:48,borderRadius:'50%',border:'3px solid rgba(167,139,250,0.2)',borderTop:'3px solid #A78BFA',animation:'spin 0.8s linear infinite'}}/>
            <p style={{color:'#C4B5FD',fontSize:15,fontWeight:500}}>Ищем товар...</p>
            <p style={{color:'#58587A',fontSize:12}}>Проверяем базу данных</p>
          </div>
        )}

        {status==='error' && (
          <div style={{position:'absolute',inset:0,background:'#07070F',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 28px',gap:18,textAlign:'center'}}>
            <div style={{fontSize:52}}>📷</div>
            <p style={{color:'#F87171',fontSize:15,lineHeight:1.8,whiteSpace:'pre-line'}}>{error}</p>
            <button onClick={onClose} style={{padding:'13px 36px',borderRadius:14,background:'#7C3AED',border:'none',color:'#fff',fontSize:15,fontWeight:600,cursor:'pointer'}}>← Назад</button>
          </div>
        )}

      </div>

      {status!=='error' && !searching && (
        <div style={{
          padding:'16px 24px 40px', background:'#09090F',
          borderTop:'1px solid rgba(139,92,246,0.2)', flexShrink:0,
        }}>
          {/* Hint text */}
          <p style={{color:status==='ready'?'#C4B5FD':'#9898B8',fontSize:14,fontWeight:500,textAlign:'center',marginBottom:16}}>
            {status==='ready'?'Наведите на штрихкод товара':'Запуск камеры...'}
          </p>

          {/* Controls row: torch — [center spacer] — close */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>

            {/* Torch button */}
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flex:1}}>
              <button
                onClick={toggleTorch}
                style={{
                  width:52,height:52,borderRadius:16,cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  background: torchOn ? 'rgba(250,204,21,0.18)' : 'rgba(255,255,255,0.06)',
                  border: torchOn ? '1.5px solid rgba(250,204,21,0.7)' : '1.5px solid rgba(255,255,255,0.15)',
                  boxShadow: torchOn ? '0 0 20px rgba(250,204,21,0.35), inset 0 0 12px rgba(250,204,21,0.08)' : 'none',
                  transition:'all 0.22s ease',
                }}
              >
                {/* Flashlight icon — side view: body + beam */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  {/* body */}
                  <rect x="8" y="10" width="8" height="5" rx="1.5"
                    fill={torchOn ? 'rgba(250,204,21,0.25)' : 'rgba(255,255,255,0.1)'}
                    stroke={torchOn ? '#FDE68A' : 'rgba(255,255,255,0.6)'} strokeWidth="1.6"/>
                  {/* head / lens */}
                  <path d="M16 11.5 L19.5 10.5 L19.5 13.5 L16 12.5 Z"
                    fill={torchOn ? '#FDE68A' : 'rgba(255,255,255,0.5)'}
                    stroke={torchOn ? '#FDE68A' : 'rgba(255,255,255,0.6)'} strokeWidth="1"/>
                  {/* tail button */}
                  <rect x="6" y="11.2" width="2.2" height="1.6" rx="0.8"
                    fill={torchOn ? '#FDE68A' : 'rgba(255,255,255,0.4)'}/>
                  {/* beam lines when on */}
                  {torchOn && <>
                    <line x1="21" y1="10" x2="23" y2="9" stroke="#FDE68A" strokeWidth="1.4" opacity="0.8"/>
                    <line x1="21" y1="12" x2="23.5" y2="12" stroke="#FDE68A" strokeWidth="1.4" opacity="0.9"/>
                    <line x1="21" y1="14" x2="23" y2="15" stroke="#FDE68A" strokeWidth="1.4" opacity="0.8"/>
                  </>}
                </svg>
              </button>
              <span style={{
                fontSize:10,fontWeight:600,letterSpacing:'0.3px',
                color: torchOn ? '#FDE68A' : 'rgba(255,255,255,0.35)',
                transition:'color 0.2s',
              }}>
                {torchOn ? 'ВКЛ' : 'Фонарик'}
              </span>
              {torchMsg && (
                <span style={{
                  position:'absolute',bottom:140,left:16,right:16,
                  background:'rgba(0,0,0,0.85)',border:'1px solid rgba(255,255,255,0.12)',
                  borderRadius:10,padding:'8px 12px',
                  fontSize:12,color:'#F87171',textAlign:'center',
                  animation:'fadeIn 0.2s ease',
                }}>
                  {torchMsg}
                </span>
              )}
            </div>

            {/* Center: formats hint */}
            <div style={{flex:2,textAlign:'center'}}>
              <p style={{color:'rgba(100,100,140,0.7)',fontSize:11}}>EAN · UPC · CODE-128</p>
            </div>

            {/* Close button */}
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flex:1}}>
              <button
                onClick={doClose}
                style={{
                  width:52,height:52,borderRadius:16,cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  background:'rgba(255,255,255,0.06)',
                  border:'1.5px solid rgba(255,255,255,0.15)',
                  transition:'all 0.2s ease',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
              <span style={{fontSize:10,fontWeight:600,letterSpacing:'0.3px',color:'rgba(255,255,255,0.35)'}}>Закрыть</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        #${ID} video{width:100%!important;height:100%!important;object-fit:cover!important;position:absolute!important;top:0!important;left:0!important;}
        #${ID} img,#${ID} canvas{display:none!important;}
        #${ID}>div{background:transparent!important;border:none!important;}
        @keyframes scanLine{0%{top:10%}50%{top:80%}100%{top:10%}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}

// ─── Товар не найден ───────────────────────────────────────────────────────────
function NotFoundScreen({ ean, onRetry, onClose }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:500,background:'#07070F',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 28px',gap:20,textAlign:'center'}}>
      <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(239,68,68,0.1)',border:'2px solid rgba(239,68,68,0.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      </div>
      <div>
        <p style={{color:'#F0F0FF',fontSize:18,fontWeight:700,marginBottom:8}}>Товар не найден</p>
        <p style={{color:'#6060A0',fontSize:13,lineHeight:1.6}}>
          Штрихкод <span style={{color:'#A78BFA',fontFamily:'monospace'}}>{ean}</span><br/>не найден в базе данных
        </p>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10,width:'100%',maxWidth:280}}>
        <button onClick={onRetry} style={{padding:'14px',borderRadius:14,background:'#7C3AED',border:'none',color:'#fff',fontSize:15,fontWeight:600,cursor:'pointer'}}>
          Сканировать ещё раз
        </button>
        <button onClick={onClose} style={{padding:'14px',borderRadius:14,background:'transparent',border:'1px solid rgba(255,255,255,0.1)',color:'#8080A0',fontSize:14,cursor:'pointer'}}>
          Назад
        </button>
      </div>
    </div>
  )
}

// ─── Главный экран ─────────────────────────────────────────────────────────────
export default function ScanScreen() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('idle')
  const [notFoundEan, setNotFoundEan] = useState(null)

  const handleDetected = async (ean) => {
    const result = await lookupProduct(ean)
    if (result.type === 'local') {
      navigate(`/product/${result.product.id}`)
    } else if (result.type === 'external') {
      navigate(`/product/ext/${ean}`, { state: { product: result.product } })
    } else {
      setNotFoundEan(ean)
      setMode('not_found')
    }
  }

  if (mode === 'scanning') return <BarcodeScanner onDetected={handleDetected} onClose={() => setMode('idle')} />
  if (mode === 'not_found') return <NotFoundScreen ean={notFoundEan} onRetry={() => setMode('scanning')} onClose={() => setMode('idle')} />

  return (
    <div className="screen">
      <div className="header">
        <div className="screen-title" style={{textAlign:'center'}}>Сканер</div>
      </div>
      <div style={{padding:'20px 20px 0',display:'flex',flexDirection:'column',gap:14}}>

        {/* Кнопка сканирования */}
        <button onClick={() => setMode('scanning')} style={{
          width:'100%',padding:'32px 20px',borderRadius:20,
          background:'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(109,40,217,0.1) 100%)',
          border:'1.5px solid rgba(139,92,246,0.35)',cursor:'pointer',
          display:'flex',flexDirection:'column',alignItems:'center',gap:16,
          boxShadow:'0 0 40px rgba(124,58,237,0.1)',
        }}>
          <div style={{position:'relative'}}>
            <div style={{position:'absolute',inset:-20,background:'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)',pointerEvents:'none'}}/>
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" strokeLinecap="round" style={{position:'relative'}}>
              <line x1="4" y1="6" x2="4" y2="18" stroke="#A78BFA" strokeWidth="1.8"/>
              <line x1="6.5" y1="6" x2="6.5" y2="18" stroke="#7C3AED" strokeWidth="0.8"/>
              <line x1="9" y1="6" x2="9" y2="18" stroke="#A78BFA" strokeWidth="1.5"/>
              <line x1="11" y1="6" x2="11" y2="18" stroke="#7C3AED" strokeWidth="0.8"/>
              <line x1="13.5" y1="6" x2="13.5" y2="18" stroke="#A78BFA" strokeWidth="2"/>
              <line x1="15.5" y1="6" x2="15.5" y2="18" stroke="#7C3AED" strokeWidth="0.8"/>
              <line x1="18" y1="6" x2="18" y2="18" stroke="#A78BFA" strokeWidth="1.5"/>
              <line x1="20" y1="6" x2="20" y2="18" stroke="#7C3AED" strokeWidth="0.8"/>
              <path d="M1 8V4a2 2 0 0 1 2-2h3" stroke="#E9D5FF" strokeWidth="2"/>
              <path d="M23 8V4a2 2 0 0 0-2-2h-3" stroke="#E9D5FF" strokeWidth="2"/>
              <path d="M1 16v4a2 2 0 0 0 2 2h3" stroke="#E9D5FF" strokeWidth="2"/>
              <path d="M23 16v4a2 2 0 0 1-2 2h-3" stroke="#E9D5FF" strokeWidth="2"/>
            </svg>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{fontFamily:'var(--font-display)',fontSize:19,fontWeight:700,color:'#E9D5FF',marginBottom:6}}>
              Сканировать штрихкод
            </div>
            <div style={{fontSize:13,color:'rgba(167,139,250,0.7)'}}>
              Наведите на любой товар в магазине
            </div>
          </div>
        </button>

        {/* Шаги */}
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:16,padding:'16px 18px'}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--text-dim)',textTransform:'uppercase',letterSpacing:'1.1px',marginBottom:14}}>
            Как это работает
          </div>
          {[
            {n:'1', color:'#A78BFA', text:'Наведите камеру на штрихкод любого товара'},
            {n:'2', color:'#60A5FA', text:'Körset найдёт состав, аллергены и КБЖУ'},
            {n:'3', color:'#34D399', text:'AI проверит подходит ли товар именно вам'},
          ].map((s,i)=>(
            <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:i<2?12:0}}>
              <div style={{width:26,height:26,borderRadius:8,flexShrink:0,background:`rgba(${s.color==='#A78BFA'?'167,139,250':s.color==='#60A5FA'?'96,165,250':'52,211,153'},0.15)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:s.color}}>
                {s.n}
              </div>
              <p style={{fontSize:13,color:'rgba(200,200,240,0.85)',lineHeight:1.5,margin:0,paddingTop:4}}>{s.text}</p>
            </div>
          ))}
        </div>

        {/* База */}
        <div style={{background:'var(--card)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:16,padding:'14px 18px',display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:38,height:38,borderRadius:12,flexShrink:0,background:'rgba(16,185,129,0.1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              <path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6"/>
            </svg>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'rgba(220,220,255,0.9)'}}>3+ млн товаров в базе</div>
            <div style={{fontSize:11,color:'rgba(130,130,180,0.8)',marginTop:2}}>Open Food Facts · Обновляется автоматически</div>
          </div>
          <div style={{marginLeft:'auto',fontSize:11,fontWeight:700,color:'#10B981',background:'rgba(16,185,129,0.1)',padding:'3px 10px',borderRadius:20,border:'1px solid rgba(16,185,129,0.2)',flexShrink:0}}>
            LIVE
          </div>
        </div>

      </div>
    </div>
  )
}
