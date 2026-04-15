import { useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../utils/i18n.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { getStores } from '../data/stores.js'
import { buildAuthNavigateState } from '../utils/authFlow.js'

export default function HomeScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, lang } = useI18n()
  const { currentStore, isStoreApp, rememberStore, routes } = useStore()
  const { user } = useAuth()

  if (isStoreApp && currentStore && routes) {
    return (
      <div
        className="screen"
        style={{ paddingBottom: 100, background: '#080C18', minHeight: '100vh' }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'fixed',
            top: -100,
            left: -100,
            width: 300,
            height: 300,
            background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
            zIndex: 0,
          }}
        />
        <div
          style={{
            position: 'fixed',
            top: 200,
            right: -150,
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)',
            zIndex: 0,
          }}
        />

        <div style={{ padding: '20px 24px 0', position: 'relative', zIndex: 10 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            {currentStore.logo_url || currentStore.logo ? (
              <img
                src={currentStore.logo_url || currentStore.logo}
                alt={currentStore.name}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  objectFit: 'cover',
                  background: 'rgba(255,255,255,0.05)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background:
                    'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(124,58,237,0.25))',
                  border: '1px solid rgba(56,189,248,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  fontWeight: 800,
                  color: '#fff',
                  fontFamily: 'var(--font-display)',
                  flexShrink: 0,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              >
                {currentStore.name?.[0]?.toUpperCase() || 'K'}
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 14, color: '#38BDF8' }}
                >
                  verified
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'rgba(167,139,250,0.8)',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  Официальный магазин
                </span>
              </div>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 28,
                  fontWeight: 900,
                  color: '#fff',
                  lineHeight: 1.1,
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                {currentStore.name}
              </h1>
              <div
                style={{
                  fontSize: 13,
                  color: 'rgba(180,180,210,0.65)',
                  marginTop: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  location_on
                </span>
                {currentStore.city} · {currentStore.address}
              </div>
            </div>
          </div>

          {/* Context Banner */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
              marginBottom: 24,
              display: 'flex',
              gap: 14,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(124,58,237,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: '#A78BFA', fontSize: 20 }}
              >
                info
              </span>
            </div>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: '#fff',
                  marginBottom: 2,
                  fontFamily: 'var(--font-display)',
                }}
              >
                Контекст магазина
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.4, color: 'rgba(220,220,255,0.6)' }}>
                Аллергены, халал, КБЖУ, наличие и цена адаптированы под этот филиал.
              </div>
            </div>
          </div>

          {/* Primary Action: Scan */}
          <button
            onClick={() => navigate(routes.scan)}
            style={{
              width: '100%',
              padding: '24px 20px',
              borderRadius: 24,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(56,189,248,0.15))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              boxShadow: '0 16px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
              marginBottom: 16,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onActive={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)'
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                flexShrink: 0,
                background: 'linear-gradient(135deg, #7C3AED, #38BDF8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(56,189,248,0.4)',
              }}
            >
              <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 28 }}>
                barcode_scanner
              </span>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#fff',
                  marginBottom: 4,
                  letterSpacing: '-0.01em',
                }}
              >
                {t.home.scanBtn}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                {t.home.scanSub}
              </div>
            </div>
            <span
              className="material-symbols-outlined"
              style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)', fontSize: 24 }}
            >
              chevron_right
            </span>
          </button>

          {/* Bento Grid for Secondary Actions */}
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}
          >
            <div
              onClick={() => navigate(routes.catalog)}
              style={{
                padding: '20px 16px',
                borderRadius: 24,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'rgba(56,189,248,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#fff',
                    marginBottom: 2,
                  }}
                >
                  {t.home.catalog}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.3 }}>
                  {t.home.catalogSub}
                </div>
              </div>
            </div>

            <div
              onClick={() => navigate(routes.ai)}
              style={{
                padding: '20px 16px',
                borderRadius: 24,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'rgba(167,139,250,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#A78BFA"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#fff',
                    marginBottom: 2,
                  }}
                >
                  {t.home.ai}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.3 }}>
                  {t.home.aiSub}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate(routes.history)}
            style={{
              width: '100%',
              padding: '18px 20px',
              borderRadius: 20,
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 20,
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(52,211,153,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: '#34D399', fontSize: 20 }}
              >
                history
              </span>
            </div>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: '#fff',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.01em',
                }}
              >
                {lang === 'kz' ? 'Менің тарихым' : 'Моя история'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                {lang === 'kz' ? 'Сканерленген тауарлар' : 'Отсканированные товары'}
              </div>
            </div>
            <span
              className="material-symbols-outlined"
              style={{ color: 'rgba(255,255,255,0.2)', fontSize: 20 }}
            >
              arrow_forward
            </span>
          </button>
        </div>
      </div>
    )
  }

  const stores = getStores()
  const continueStore = currentStore && !isStoreApp ? currentStore : null

  return (
    <>
      <style>{`
        .landing-page {
          --primary: #d2bbff;
          --primary-container: #7c3aed;
          --secondary: #d2bbff;
          --secondary-container: #523787;
          --tertiary: #ffb784;
          --tertiary-container: #a15100;
          --bg: #07070F;
          --surface: #131317;
          --surface-variant: #353439;
          --on-surface-variant: #ccc3d8;
          --error: #ffb4ab;
          
          font-family: 'Manrope', sans-serif;
          background-color: var(--bg);
          color: #e4e1e7;
          min-height: 100vh;
          overflow-x: hidden;
        }
        
        .font-headline { font-family: 'Advent Pro', sans-serif; }
        .font-label { font-family: 'Manrope', sans-serif; }
        
        .glass { 
          background: rgba(53, 52, 57, 0.4); 
          backdrop-filter: blur(20px); 
          -webkit-backdrop-filter: blur(20px);
        }
        .ghost-border { 
          border: 1px solid rgba(74, 68, 85, 0.15); 
        }
        
        .top-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 50;
          background: rgba(19, 19, 23, 0.4);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
        }

        .hero-section {
          position: relative;
          padding: 120px 24px 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .hero-radial {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 600px;
          background: radial-gradient(circle at center, rgba(124,58,237,0.12) 0%, transparent 60%);
          z-index: 0;
          pointer-events: none;
        }

        .hero-content {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 1000px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .floating-plates {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 30px;
          width: 100%;
        }
        .plate {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 99px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.3);
          white-space: nowrap;
        }
        .plate-left {
          transform: rotate(-4deg);
          margin-right: -20px;
          z-index: 1;
          background: rgba(53, 52, 57, 0.4);
        }
        .plate-center {
          transform: rotate(0deg) scale(1.05);
          z-index: 2;
          padding: 14px 28px;
          border: 1px solid rgba(210, 187, 255, 0.2);
          background: rgba(40, 39, 44, 0.85);
          box-shadow: 0 20px 50px rgba(0,0,0,0.4);
        }
        .plate-right {
          transform: rotate(4deg);
          margin-left: -20px;
          z-index: 1;
          background: rgba(53, 52, 57, 0.4);
        }

        .hero-title {
          font-size: clamp(36px, 9vw, 72px);
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.02em;
          margin-bottom: 24px;
        }
        .gradient-text {
          background: linear-gradient(135deg, var(--primary), var(--primary-container));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-btns {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          align-items: center;
          margin-top: 10px;
        }
        @media (min-width: 600px) {
          .hero-btns { flex-direction: row; justify-content: center; gap: 20px; }
        }

        .cta-btn-main {
          background: linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%);
          color: #fff;
          width: 100%;
          max-width: 280px;
          padding: 18px 24px;
          border-radius: 99px;
          font-family: 'Advent Pro', sans-serif;
          font-weight: 700;
          font-size: 16px;
          border: none;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(124, 58, 237, 0.3);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .cta-btn-main:active { transform: scale(0.98); box-shadow: 0 5px 15px rgba(124, 58, 237, 0.2); }

        .cta-btn-sec {
          background: rgba(255,255,255,0.05);
          color: #fff;
          width: 100%;
          max-width: 280px;
          padding: 18px 24px;
          border-radius: 99px;
          border: 1px solid rgba(255,255,255,0.1);
          font-family: 'Advent Pro', sans-serif;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .cta-btn-sec:hover { background: rgba(255,255,255,0.1); }
        .cta-btn-sec:active { background: rgba(255,255,255,0.08); transform: scale(0.98); }

        .neon-glow-primary { box-shadow: 0 0 40px -10px rgba(210, 187, 255, 0.4); }
        .neon-glow-tertiary { box-shadow: 0 0 40px -10px rgba(255, 183, 132, 0.4); }
        .neon-glow-emerald { box-shadow: 0 0 40px -10px rgba(16, 185, 129, 0.4); }

        .step-card {
          position: relative;
          overflow: hidden;
          padding: 40px;
          border-radius: 24px;
          background: rgba(31, 31, 35, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(210, 187, 255, 0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          z-index: 1;
        }
        .step-card:hover {
          transform: scale(1.03);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .step-num {
          position: absolute;
          top: -24px;
          right: -16px;
          font-family: 'Advent Pro', sans-serif;
          font-size: 160px;
          font-weight: 900;
          color: rgba(255,255,255,0.02);
          line-height: 1;
          transition: color 0.3s ease;
          z-index: -1;
          pointer-events: none;
        }
        .step-card:hover .step-num {
          color: rgba(210, 187, 255, 0.08);
        }

        .section-padding { padding: 80px 24px; }
        .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px; max-width: 1100px; margin: 0 auto; }
        .bento-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; max-width: 1200px; margin: 0 auto; }
        
        @media (max-width: 800px) {
          .bento-grid { display: flex; flex-direction: column; }
          .floating-plates { gap: 10px; flex-wrap: wrap; margin-bottom: 40px; }
          .plate-left { transform: rotate(0deg); margin-right: 0; padding: 10px 16px; font-size: 12px; }
          .plate-right { transform: rotate(0deg); margin-left: 0; padding: 10px 16px; font-size: 12px; }
          .plate-center { width: calc(100% - 40px); justify-content: center; margin: 0 auto 10px; order: -1; transform: scale(1); }
        }

        .icon-box {
          width: 64px; height: 64px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 24px;
        }

        .bento-item {
          border-radius: 24px;
          padding: 32px;
          display: flex;
          flex-direction: column;
        }
        .col-8 { grid-column: span 8; }
        .col-4 { grid-column: span 4; }
      `}</style>

      <div className="landing-page">
        {/* Top Header */}
        <header className="top-nav">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="Körset" style={{ height: 36, objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => navigate('/retail')}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(53, 52, 57, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                color: '#d2bbff',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                storefront
              </span>
            </button>
            <button
              onClick={() =>
                navigate(user ? '/retail' : '/auth', {
                  state: user ? undefined : buildAuthNavigateState(location),
                })
              }
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(53, 52, 57, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                color: '#d2bbff',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="hero-section">
          <div className="hero-radial"></div>

          <div className="hero-content">
            <div className="floating-plates">
              <div className="plate plate-left ghost-border">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#d2bbff" stroke="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span
                  className="font-label"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  Халал
                </span>
              </div>
              <div
                className="plate plate-center ghost-border"
                style={{ border: '1px solid rgba(210, 187, 255, 0.2)' }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#d2bbff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                <span
                  className="font-label"
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  Умный анализ
                </span>
              </div>
              <div className="plate plate-right ghost-border">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffb784" stroke="none">
                  <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
                </svg>
                <span
                  className="font-label"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  Без глютена
                </span>
              </div>
            </div>

            <h1 className="hero-title font-headline">
              Узнайте <span className="gradient-text">правду</span> о<br />
              том, что вы едите
            </h1>
            <p
              className="font-label"
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 16,
                lineHeight: 1.6,
                maxWidth: 460,
                marginBottom: 40,
                fontWeight: 500,
              }}
            >
              Körset за секунду расшифрует состав продукта, найдет скрытые Е-добавки и предупредит
              об аллергенах. Выбирайте еду осознанно.
            </p>

            <div className="hero-btns">
              <button className="cta-btn-main" onClick={() => navigate('/stores')}>
                Выбрать магазин
              </button>
              <button
                className="cta-btn-sec"
                onClick={() =>
                  document.getElementById('b2b-section')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                О проекте
              </button>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="b2b-section"
          className="section-padding"
          style={{ maxWidth: 1200, margin: '0 auto' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2
              className="font-headline"
              style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, marginBottom: 16 }}
            >
              Как это работает
            </h2>
            <div
              style={{
                width: 80,
                height: 4,
                background: 'var(--primary)',
                margin: '0 auto',
                borderRadius: 99,
              }}
            ></div>
          </div>

          <div className="grid-3">
            {/* Step 1 */}
            <div className="step-card group">
              <div className="step-num">01</div>
              <div style={{ marginBottom: 32 }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 48, color: 'var(--primary)' }}
                >
                  barcode_scanner
                </span>
              </div>
              <h3
                className="font-headline"
                style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}
              >
                Сканируйте штрихкод
              </h3>
              <p
                className="font-label"
                style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6, fontSize: 15 }}
              >
                Просто наведите камеру на штрихкод продукта, чтобы мгновенно получить его данные
                прямо в магазине.
              </p>
            </div>

            {/* Step 2 */}
            <div className="step-card group">
              <div className="step-num">02</div>
              <div style={{ marginBottom: 32 }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 48, color: 'var(--primary)' }}
                >
                  psychology
                </span>
              </div>
              <h3
                className="font-headline"
                style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}
              >
                Анализ нейросетью
              </h3>
              <p
                className="font-label"
                style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6, fontSize: 15 }}
              >
                Наши алгоритмы Körset AI расшифруют состав, найдут добавки, консерванты и скрытые
                аллергены.
              </p>
            </div>

            {/* Step 3 */}
            <div className="step-card group">
              <div className="step-num">03</div>
              <div style={{ marginBottom: 32 }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 48, color: 'var(--primary)' }}
                >
                  fact_check
                </span>
              </div>
              <h3
                className="font-headline"
                style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}
              >
                Умный вердикт
              </h3>
              <p
                className="font-label"
                style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6, fontSize: 15 }}
              >
                Получите строгую оценку качества продукта и его соответствия вашим предпочтениям.
              </p>
            </div>
          </div>
        </section>

        {/* Features Vertical Stack (Mobile First) */}
        <section
          className="section-padding"
          style={{ background: 'rgba(14, 15, 20, 0.6)', backdropFilter: 'blur(30px)' }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              maxWidth: 1100,
              margin: '0 auto',
            }}
          >
            {/* Карточка 1: E-добавки */}
            <div
              className="glass"
              style={{
                padding: '32px',
                borderRadius: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                borderTop: '1px solid rgba(210, 187, 255, 0.15)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
              }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background:
                      'linear-gradient(135deg, rgba(210, 187, 255, 0.15), rgba(124, 58, 237, 0.1))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(210, 187, 255, 0.2)',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 28, color: 'var(--primary)' }}
                  >
                    science
                  </span>
                </div>
                <h3
                  className="font-headline"
                  style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0 }}
                >
                  E-Добавки
                </h3>
              </div>
              <p
                className="font-label"
                style={{
                  fontSize: 16,
                  color: 'var(--on-surface-variant)',
                  lineHeight: 1.6,
                  opacity: 0.9,
                  margin: 0,
                }}
              >
                Körset выявляет все скрытые красители, консерванты и эмульгаторы, разбивая сложный
                химический состав на понятные компоненты.
              </p>
            </div>

            {/* Карточка 2: Умный сканер */}
            <div
              className="glass"
              style={{
                padding: '32px',
                borderRadius: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                borderTop: '1px solid rgba(255, 183, 132, 0.15)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
              }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background:
                      'linear-gradient(135deg, rgba(255, 183, 132, 0.15), rgba(161, 81, 0, 0.1))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255, 183, 132, 0.2)',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 28, color: 'var(--tertiary)' }}
                  >
                    center_focus_strong
                  </span>
                </div>
                <h3
                  className="font-headline"
                  style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0 }}
                >
                  Умный сканер
                </h3>
              </div>
              <p
                className="font-label"
                style={{
                  fontSize: 16,
                  color: 'var(--on-surface-variant)',
                  lineHeight: 1.6,
                  opacity: 0.9,
                  margin: 0,
                }}
              >
                Наведите камеру смартфона на штрихкод товара, и вы за долю секунды получите
                подробный Fit-Check прямо у полки магазина.
              </p>
            </div>

            {/* Карточка 3: Персональные фильтры (Халал/Веган) */}
            <div
              className="glass"
              style={{
                padding: '32px',
                borderRadius: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                borderTop: '1px solid rgba(16, 185, 129, 0.15)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
              }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background:
                      'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(4, 120, 87, 0.1))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 28, color: '#10B981' }}
                  >
                    person_search
                  </span>
                </div>
                <h3
                  className="font-headline"
                  style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0 }}
                >
                  Ваш профиль
                </h3>
              </div>
              <p
                className="font-label"
                style={{
                  color: 'var(--on-surface-variant)',
                  fontSize: 16,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Настройте фильтры: Халал, Веган или диетические программы. Приложение заранее
                предупредит вас, если продукт вам не подходит.
              </p>
            </div>

            {/* Карточка 4: Защита аллергиков */}
            <div
              className="glass"
              style={{
                padding: '32px',
                borderRadius: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                borderTop: '1px solid rgba(244, 63, 94, 0.15)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
              }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background:
                      'linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(159, 18, 57, 0.1))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(244, 63, 94, 0.2)',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 28, color: '#F43F5E' }}
                  >
                    health_and_safety
                  </span>
                </div>
                <h3
                  className="font-headline"
                  style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0 }}
                >
                  Детектор аллергий
                </h3>
              </div>
              <p
                className="font-label"
                style={{
                  color: 'var(--on-surface-variant)',
                  fontSize: 16,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Мгновенное выявление критичных аллергенов (орехи, лактоза, глютен и др.). Сохраняйте
                проверенные безопасные продукты в историю.
              </p>
            </div>
          </div>
        </section>

        {/* B2B Section */}
        <section
          className="section-padding"
          style={{ background: 'rgba(8,12,24,0.95)', position: 'relative' }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              height: '100%',
              background:
                'radial-gradient(ellipse at center, rgba(56,189,248,0.1) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          <div
            className="glass"
            style={{
              maxWidth: 1100,
              margin: '0 auto',
              borderRadius: 32,
              borderTop: '1px solid rgba(56,189,248,0.2)',
              padding: '64px 40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 24,
              textAlign: 'center',
              boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background:
                    'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(124,58,237,0.1))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(56,189,248,0.2)',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 28, color: '#38BDF8' }}
                >
                  storefront
                </span>
              </div>
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#38BDF8',
                fontFamily: 'Manrope, sans-serif',
              }}
            >
              Для бизнеса
            </div>

            <h2
              style={{
                fontFamily: "'Advent Pro', sans-serif",
                fontSize: 'clamp(32px, 6vw, 48px)',
                fontWeight: 800,
                color: '#fff',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Вы владелец магазина?
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #38BDF8, #A78BFA)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Подключите Körset
              </span>
            </h2>
            <p
              style={{
                fontSize: 16,
                color: 'rgba(200,200,240,0.7)',
                lineHeight: 1.6,
                margin: 0,
                maxWidth: 600,
              }}
            >
              Retail Cabinet даёт вам аналитику сканирований, статистику вовлечённости покупателей и
              инструменты управления каталогом — всё в одном месте.
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 32,
                marginTop: 16,
                marginBottom: 16,
              }}
            >
              {[
                ['analytics', 'Аналитика'],
                ['inventory_2', 'Каталог товаров'],
                ['qr_code_2', 'QR-интеграция'],
              ].map(([icon, label]) => (
                <div
                  key={icon}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'rgba(255,255,255,0.03)',
                    padding: '12px 24px',
                    borderRadius: 99,
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 22, color: '#A78BFA' }}
                  >
                    {icon}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#fff',
                      fontFamily: 'Manrope, sans-serif',
                    }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/retail')}
              style={{
                marginTop: 16,
                padding: '20px 40px',
                borderRadius: 99,
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #38BDF8, #7C3AED)',
                border: 'none',
                color: '#fff',
                fontSize: 16,
                fontWeight: 800,
                fontFamily: "'Advent Pro', sans-serif",
                letterSpacing: '0.02em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: '0 12px 30px rgba(56,189,248,0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onActive={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                login
              </span>
              {user ? 'Открыть Retail Cabinet' : 'Войти в кабинет магазина'}
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{
            padding: '60px 24px 30px',
            background: 'linear-gradient(180deg, #0a0a0f 0%, #050508 100%)',
            borderTop: '1px solid rgba(124,58,237,0.15)',
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Main Footer Content */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                gap: '48px 32px',
                marginBottom: 48,
              }}
            >
              {/* Brand Column */}
              <div style={{ flex: '1 1 100%', minWidth: 280 }}>
                <div style={{ marginBottom: 16, width: '100%', maxWidth: 600 }}>
                  <img
                    src="/logo.png"
                    alt="Körset"
                    style={{ width: '100%', height: 'auto', objectFit: 'contain', maxHeight: 70 }}
                  />
                </div>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: 16,
                    maxWidth: 400,
                  }}
                >
                  Умная платформа для проверки продуктов. Состав, аллергены, КБЖУ и халал-статус —
                  всё в одном скане.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#22c55e',
                      animation: 'pulse 2s infinite',
                    }}
                  />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                    Система работает нормально
                  </span>
                </div>
              </div>

              {/* Links Row */}
              <div
                style={{ display: 'flex', flexWrap: 'wrap', gap: '32px 64px', flex: '2 1 600px' }}
              >
                {/* Product Column */}
                <div style={{ flex: '1 1 140px', minWidth: 140 }}>
                  <h4
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.4)',
                      marginBottom: 16,
                    }}
                  >
                    Продукт
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                      onClick={() => navigate('/catalog')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 14,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.target.style.color = '#a78bfa')}
                      onMouseLeave={(e) => (e.target.style.color = 'rgba(255,255,255,0.7)')}
                    >
                      Каталог
                    </button>
                    <button
                      onClick={() => navigate('/scan')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 14,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.target.style.color = '#a78bfa')}
                      onMouseLeave={(e) => (e.target.style.color = 'rgba(255,255,255,0.7)')}
                    >
                      Сканер
                    </button>
                    <button
                      onClick={() => navigate('/ai')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 14,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.target.style.color = '#a78bfa')}
                      onMouseLeave={(e) => (e.target.style.color = 'rgba(255,255,255,0.7)')}
                    >
                      AI Анализ
                    </button>
                  </div>
                </div>

                {/* Company Column */}
                <div>
                  <h4
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.4)',
                      marginBottom: 16,
                    }}
                  >
                    Компания
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                      onClick={() => navigate('/about')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 14,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.target.style.color = '#a78bfa')}
                      onMouseLeave={(e) => (e.target.style.color = 'rgba(255,255,255,0.7)')}
                    >
                      О нас
                    </button>
                    <button
                      onClick={() => navigate('/contacts')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 14,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.target.style.color = '#a78bfa')}
                      onMouseLeave={(e) => (e.target.style.color = 'rgba(255,255,255,0.7)')}
                    >
                      Контакты
                    </button>
                    <button
                      onClick={() => navigate('/business')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 14,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.target.style.color = '#a78bfa')}
                      onMouseLeave={(e) => (e.target.style.color = 'rgba(255,255,255,0.7)')}
                    >
                      Для бизнеса
                    </button>
                  </div>
                </div>

                {/* Support & Legal Column */}
                <div>
                  <h4
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.4)',
                      marginBottom: 16,
                    }}
                  >
                    Поддержка
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                      onClick={() => navigate('/profile/help')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 14,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.target.style.color = '#a78bfa')}
                      onMouseLeave={(e) => (e.target.style.color = 'rgba(255,255,255,0.7)')}
                    >
                      Справка
                    </button>
                    <button
                      onClick={() => navigate('/profile/privacy')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 14,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.target.style.color = '#a78bfa')}
                      onMouseLeave={(e) => (e.target.style.color = 'rgba(255,255,255,0.7)')}
                    >
                      Приватность
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 24,
                borderTop: '1px solid rgba(255,255,255,0.05)',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
                  © 2024 Körset. Все права защищены.
                </span>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  background: 'rgba(124,58,237,0.1)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  borderRadius: 99,
                }}
              >
                <span style={{ fontSize: 14 }}>🇰🇿</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: 'rgba(167,139,250,0.8)',
                  }}
                >
                  Made in Kazakhstan
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

function QuickCard({ title, sub, color, border, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '16px',
        borderRadius: 18,
        cursor: 'pointer',
        background: color,
        border: `1px solid ${border}`,
        textAlign: 'left',
      }}
    >
      <div
        style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}
      >
        {title}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(167,139,250,0.6)', marginTop: 4 }}>{sub}</div>
    </button>
  )
}
