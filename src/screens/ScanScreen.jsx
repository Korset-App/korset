import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { lookupProduct } from '../utils/productLookup.js'

// ─── Barcode Scanner ───────────────────────────────────────────────────────────
function BarcodeScanner({ onDetected, onClose }) {
  const [status, setStatus]       = useState('starting')
  const [error, setError]         = useState(null)
  const [searching, setSearching] = useState(false)
  const [torchOn, setTorchOn]     = useState(false)
  const [torchErr, setTorchErr]   = useState(false)   // недоступен в браузере
  const scannerRef  = useRef(null)
  const busyRef     = useRef(false)
  const trackRef    = useRef(null)
  const errTimerRef = useRef(null)
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
        // Сохраняем трек для управления фонариком
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
      if (scannerRef.current) { scannerRef.current.stop().catch(() => {}); try { scannerRef.current.clear() } catch {} }
    }
  }, [])

  const toggleTorch = async () => {
    const next = !torchOn
    const track = trackRef.current
    // Проверяем поддержку через getCapabilities — надёжнее чем try/catch
    const supported = (() => {
      try { return Boolean(track?.getCapabilities?.()?.torch) } catch { return false }
    })()
    if (!supported) {
      clearTimeout(errTimerRef.current)
      setTorchErr(true)
      errTimerRef.current = setTimeout(() => setTorchErr(false), 3000)
      return
    }
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
      setTorchErr(false)
    } catch {
      clearTimeout(errTimerRef.current)
      setTorchErr(true)
      errTimerRef.current = setTimeout(() => setTorchErr(false), 3000)
    }
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 80, zIndex: 50, background: '#000', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div id={ID} style={{ width: '100%', height: '100%' }} />

        {/* ── Прицел ── */}
        {status === 'ready' && !searching && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Затемнение */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />

            {/* Рамка */}
            <div style={{ position: 'relative', zIndex: 2, width: 300, height: 130, boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }}>

              {/* Угловые маркеры — белые, тонкие */}
              {[
                { top: -2, left: -2,  borderTop: '2px solid rgba(255,255,255,0.9)', borderLeft:  '2px solid rgba(255,255,255,0.9)', borderRadius: '6px 0 0 0' },
                { top: -2, right: -2, borderTop: '2px solid rgba(255,255,255,0.9)', borderRight: '2px solid rgba(255,255,255,0.9)', borderRadius: '0 6px 0 0' },
                { bottom: -2, left: -2,  borderBottom: '2px solid rgba(255,255,255,0.9)', borderLeft:  '2px solid rgba(255,255,255,0.9)', borderRadius: '0 0 0 6px' },
                { bottom: -2, right: -2, borderBottom: '2px solid rgba(255,255,255,0.9)', borderRight: '2px solid rgba(255,255,255,0.9)', borderRadius: '0 0 6px 0' },
              ].map((s, i) => (
                <div key={i} style={{ position: 'absolute', width: 28, height: 28, ...s }} />
              ))}

              {/* Линия сканирования — тонкая, белая с лёгким свечением */}
              <div style={{
                position: 'absolute', left: 0, right: 0, height: 1.5,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 15%, rgba(255,255,255,0.95) 45%, rgba(255,255,255,0.95) 55%, rgba(255,255,255,0.3) 85%, transparent 100%)',
                boxShadow: '0 0 8px 2px rgba(255,255,255,0.25)',
                animation: 'scanLine 2s cubic-bezier(0.45,0,0.55,1) infinite',
              }} />
            </div>
          </div>
        )}

        {/* ── Поиск ── */}
        {searching && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(167,139,250,0.2)', borderTop: '3px solid #A78BFA', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#C4B5FD', fontSize: 15, fontWeight: 500 }}>Ищем товар...</p>
            <p style={{ color: '#58587A', fontSize: 12 }}>Проверяем базу данных</p>
          </div>
        )}

        {/* ── Ошибка камеры ── */}
        {status === 'error' && (
          <div style={{ position: 'absolute', inset: 0, background: '#07070F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 28px', gap: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 52 }}>📷</div>
            <p style={{ color: '#F87171', fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{error}</p>
            <button onClick={onClose} style={{ padding: '13px 36px', borderRadius: 14, background: '#7C3AED', border: 'none', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>← Назад</button>
          </div>
        )}

        {/* ── Кнопки сверху: фонарик (слева) + закрыть (справа) ── */}
        {status !== 'error' && !searching && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            padding: '14px 16px 0',
            pointerEvents: 'none',
          }}>
            {/* Фонарик */}
            <button
              onClick={toggleTorch}
              style={{
                pointerEvents: 'all',
                width: 44, height: 44, borderRadius: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: torchOn ? 'rgba(250,204,21,0.22)' : 'rgba(0,0,0,0.65)',
                border: torchOn ? '1.5px solid rgba(250,204,21,0.85)' : '1.5px solid rgba(255,255,255,0.25)',
                backdropFilter: 'blur(8px)',
                boxShadow: torchOn ? '0 0 18px rgba(250,204,21,0.5)' : 'none',
                transition: 'all 0.22s ease',
              }}
            >
              {/* Иконка фонарика — вертикальный факел сверху вниз */}
              {/* Иконка молнии */}
              {torchOn ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M13.2319 2.28681C13.5409 2.38727 13.75 2.6752 13.75 3.00005V9.25005H19C19.2821 9.25005 19.5403 9.40834 19.6683 9.65972C19.7963 9.9111 19.7725 10.213 19.6066 10.4412L11.6066 21.4412C11.4155 21.7039 11.077 21.8137 10.7681 21.7133C10.4591 21.6128 10.25 21.3249 10.25 21.0001V14.7501H5C4.71791 14.7501 4.45967 14.5918 4.33167 14.3404C4.20366 14.089 4.22753 13.7871 4.39345 13.5589L12.3935 2.55892C12.5845 2.2962 12.923 2.18635 13.2319 2.28681Z" fill="#FDE68A"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 10V3L5 14H11V21L19 10H13Z"/>
                </svg>
              )}
            </button>

            {/* Закрыть */}
            <button
              onClick={doClose}
              style={{
                pointerEvents: 'all',
                width: 44, height: 44, borderRadius: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.65)',
                border: '1.5px solid rgba(255,255,255,0.25)',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Тост: фонарик недоступен ── */}
        {torchErr && (
          <div style={{
            position: 'absolute', top: 116, left: '50%', transform: 'translateX(-50%)',
            zIndex: 40, whiteSpace: 'nowrap',
            background: 'rgba(15,15,25,0.92)', border: '1px solid rgba(248,113,113,0.4)',
            borderRadius: 12, padding: '9px 16px',
            fontSize: 12, color: '#FCA5A5', fontWeight: 500,
            animation: 'fadeSlideDown 0.25s ease',
            backdropFilter: 'blur(10px)',
          }}>
            ⚠️ Фонарик недоступен в этом браузере
          </div>
        )}
      </div>

      {/* ── Нижняя панель ── */}
      {status !== 'error' && !searching && (
        <div style={{
          padding: '14px 24px 40px', background: '#09090F',
          borderTop: '1px solid rgba(139,92,246,0.2)', flexShrink: 0,
          textAlign: 'center',
        }}>
          <p style={{ color: status === 'ready' ? '#C4B5FD' : '#9898B8', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
            {status === 'ready' ? 'Наведите на штрихкод товара' : 'Запуск камеры...'}
          </p>
          <p style={{ color: '#58587A', fontSize: 12 }}>Поддерживаются все форматы штрихкодов</p>
        </div>
      )}

      <style>{`
        #${ID} video{width:100%!important;height:100%!important;object-fit:cover!important;position:absolute!important;top:0!important;left:0!important;}
        #${ID} img,#${ID} canvas{display:none!important;}
        #${ID}>div{background:transparent!important;border:none!important;}
        @keyframes scanLine{0%{top:5%}50%{top:88%}100%{top:5%}}
        @keyframes fadeSlideDown{from{opacity:0;transform:translateX(-50%) translateY(-6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}

// ─── Товар не найден ───────────────────────────────────────────────────────────
function NotFoundScreen({ ean, onRetry, onClose }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 80, zIndex: 50, background: '#07070F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 28px', gap: 20, textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </div>
      <div>
        <p style={{ color: '#F0F0FF', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Товар не найден</p>
        <p style={{ color: '#6060A0', fontSize: 13, lineHeight: 1.6 }}>
          Штрихкод <span style={{ color: '#A78BFA', fontFamily: 'monospace' }}>{ean}</span><br />не найден в базе данных
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
        <button onClick={onRetry} style={{ padding: '14px', borderRadius: 14, background: '#7C3AED', border: 'none', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Сканировать ещё раз
        </button>
        <button onClick={onClose} style={{ padding: '14px', borderRadius: 14, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8080A0', fontSize: 14, cursor: 'pointer' }}>
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
        <div className="screen-title" style={{ textAlign: 'center' }}>Сканер</div>
      </div>
      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Кнопка сканирования */}
        <button onClick={() => setMode('scanning')} style={{
          width: '100%', padding: '32px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(109,40,217,0.1) 100%)',
          border: '1.5px solid rgba(139,92,246,0.35)', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          boxShadow: '0 0 40px rgba(124,58,237,0.1)',
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" strokeLinecap="round" style={{ position: 'relative' }}>
              <line x1="4"  y1="6" x2="4"  y2="18" stroke="#A78BFA" strokeWidth="1.8" />
              <line x1="6.5" y1="6" x2="6.5" y2="18" stroke="#7C3AED" strokeWidth="0.8" />
              <line x1="9"  y1="6" x2="9"  y2="18" stroke="#A78BFA" strokeWidth="1.5" />
              <line x1="11" y1="6" x2="11" y2="18" stroke="#7C3AED" strokeWidth="0.8" />
              <line x1="13.5" y1="6" x2="13.5" y2="18" stroke="#A78BFA" strokeWidth="2" />
              <line x1="15.5" y1="6" x2="15.5" y2="18" stroke="#7C3AED" strokeWidth="0.8" />
              <line x1="18" y1="6" x2="18" y2="18" stroke="#A78BFA" strokeWidth="1.5" />
              <line x1="20" y1="6" x2="20" y2="18" stroke="#7C3AED" strokeWidth="0.8" />
              <path d="M1 8V4a2 2 0 0 1 2-2h3"  stroke="#E9D5FF" strokeWidth="2" />
              <path d="M23 8V4a2 2 0 0 0-2-2h-3" stroke="#E9D5FF" strokeWidth="2" />
              <path d="M1 16v4a2 2 0 0 0 2 2h3"  stroke="#E9D5FF" strokeWidth="2" />
              <path d="M23 16v4a2 2 0 0 1-2 2h-3" stroke="#E9D5FF" strokeWidth="2" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: '#E9D5FF', marginBottom: 6 }}>
              Сканировать штрихкод
            </div>
            <div style={{ fontSize: 13, color: 'rgba(167,139,250,0.7)' }}>
              Наведите на любой товар в магазине
            </div>
          </div>
        </button>

        {/* Шаги */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1.1px', marginBottom: 14 }}>
            Как это работает
          </div>
          {[
            { n: '1', color: '#A78BFA', text: 'Наведите камеру на штрихкод любого товара' },
            { n: '2', color: '#60A5FA', text: 'Körset найдёт состав, аллергены и КБЖУ' },
            { n: '3', color: '#34D399', text: 'AI проверит подходит ли товар именно вам' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < 2 ? 12 : 0 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: `rgba(${s.color === '#A78BFA' ? '167,139,250' : s.color === '#60A5FA' ? '96,165,250' : '52,211,153'},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: s.color }}>
                {s.n}
              </div>
              <p style={{ fontSize: 13, color: 'rgba(200,200,240,0.85)', lineHeight: 1.5, margin: 0, paddingTop: 4 }}>{s.text}</p>
            </div>
          ))}
        </div>

        {/* База */}
        <div style={{ background: 'var(--card)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              <path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(220,220,255,0.9)' }}>3+ млн товаров в базе</div>
            <div style={{ fontSize: 11, color: 'rgba(130,130,180,0.8)', marginTop: 2 }}>Open Food Facts · Обновляется автоматически</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(16,185,129,0.2)', flexShrink: 0 }}>
            LIVE
          </div>
        </div>

      </div>
    </div>
  )
}
