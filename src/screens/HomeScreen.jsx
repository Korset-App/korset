import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../utils/i18n.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { getStores } from '../data/stores.js'
import { buildStorePublicPath } from '../utils/routes.js'

export default function HomeScreen() {
  const navigate = useNavigate()
  const [pressedStep, setPressedStep] = useState(null)
  const { t, lang } = useI18n()
  const { currentStore, isStoreApp, rememberStore, routes } = useStore()

  if (isStoreApp && currentStore && routes) {
    return (
      <div className="screen" style={{ paddingBottom: 100 }}>
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <img src={currentStore.logo} alt={currentStore.name} style={{ width: 56, height: 56, borderRadius: 18, objectFit: 'cover', background: 'rgba(255,255,255,0.05)' }} />
            <div>
              <div style={{ fontSize: 12, color: 'rgba(167,139,250,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Körset Store Mode
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.1, margin: 0 }}>
                {currentStore.name}
              </h1>
              <div style={{ fontSize: 13, color: 'rgba(180,180,210,0.65)', marginTop: 6 }}>
                {currentStore.city} · {currentStore.address}
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 18px', borderRadius: 18, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.28)', marginBottom: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#E9D5FF', marginBottom: 6 }}>Проверяйте товар в контексте магазина</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(220,220,255,0.75)' }}>
              Состав, аллергены, халал, КБЖУ, цена и полка будут показаны в логике именно этого магазина.
            </div>
          </div>

          <button onClick={() => navigate(routes.scan)} style={{
            width: '100%', padding: '24px 20px', borderRadius: 22, cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.22), rgba(109,40,217,0.1))',
            border: '1.5px solid rgba(124,58,237,0.4)',
            display: 'flex', alignItems: 'center', gap: 18,
            boxShadow: '0 8px 32px rgba(124,58,237,0.12)', marginBottom: 14,
          }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, flexShrink: 0, background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M3 7V4a1 1 0 0 1 1-1h3"/><path d="M17 3h3a1 1 0 0 1 1 1v3"/><path d="M21 17v3a1 1 0 0 1-1 1h-3"/><path d="M7 21H4a1 1 0 0 1-1-1v-3"/><line x1="7" y1="12" x2="17" y2="12" strokeWidth="2.5"/></svg>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: '#E9D5FF', marginBottom: 3 }}>{t.home.scanBtn}</div>
              <div style={{ fontSize: 12, color: 'rgba(167,139,250,0.6)' }}>{t.home.scanSub}</div>
            </div>
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <QuickCard title={t.home.catalog} sub={t.home.catalogSub} color="rgba(96,165,250,0.08)" border="rgba(96,165,250,0.18)" onClick={() => navigate(routes.catalog)} />
            <QuickCard title={t.home.ai} sub={t.home.aiSub} color="rgba(124,58,237,0.1)" border="rgba(124,58,237,0.25)" onClick={() => navigate(routes.ai)} />
          </div>

          <button onClick={() => navigate(routes.history)} style={{
            width: '100%', padding: '16px', borderRadius: 18, cursor: 'pointer',
            background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.18)',
            display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🕘</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>
                {lang === 'kz' ? 'Менің тарихым' : 'Моя история'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(52,211,153,0.6)', marginTop: 2 }}>
                {lang === 'kz' ? 'Сканерленген тауарлар' : 'Отсканированные товары'}
              </div>
            </div>
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
          transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
          z-index: 1;
          touch-action: manipulation;
          user-select: none;
        }
        @media (hover: hover) and (pointer: fine) {
          .step-card:hover {
            transform: translateY(-8px) scale(1.015);
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            border-color: rgba(210, 187, 255, 0.24);
          }
        }
        .step-card.is-pressed,
        .step-card:active,
        .step-card:focus-visible {
          transform: translateY(-6px) scale(1.01);
          box-shadow: 0 18px 36px rgba(0,0,0,0.34);
          border-color: rgba(210, 187, 255, 0.22);
          outline: none;
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
        @media (hover: hover) and (pointer: fine) {
          .step-card:hover .step-num {
            color: rgba(210, 187, 255, 0.08);
          }
        }
        .step-card.is-pressed .step-num,
        .step-card:active .step-num,
        .step-card:focus-visible .step-num {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/icon_logo.svg" alt="logo" style={{ width: 36, height: 36, borderRadius: 10 }} />
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }} className="font-headline">Körset</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => navigate('/auth')} style={{ 
              width: 44, height: 44, borderRadius: '50%', background: 'rgba(53, 52, 57, 0.4)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', color: '#d2bbff'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="hero-section">
          <div className="hero-radial"></div>
          
          <div className="hero-content">
            <div className="floating-plates">
              <div className="plate plate-left ghost-border">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#d2bbff" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <span className="font-label" style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Халал</span>
              </div>
              <div className="plate plate-center ghost-border" style={{ border: '1px solid rgba(210, 187, 255, 0.2)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d2bbff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                <span className="font-label" style={{ fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Умный анализ</span>
              </div>
              <div className="plate plate-right ghost-border">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffb784" stroke="none"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>
                <span className="font-label" style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Без глютена</span>
              </div>
            </div>

            <h1 className="hero-title font-headline">
              Узнайте <span className="gradient-text">правду</span> о<br/>том, что вы едите
            </h1>
            <p className="font-label" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 1.6, maxWidth: 460, marginBottom: 40, fontWeight: 500 }}>
              Körset за секунду расшифрует состав продукта, найдет скрытые Е-добавки и предупредит об аллергенах. Выбирайте еду осознанно.
            </p>

            <div className="hero-btns">
              <button className="cta-btn-main" onClick={() => navigate('/stores')}>
                Выбрать магазин
              </button>
              <button className="cta-btn-sec" onClick={() => document.getElementById('b2b-section')?.scrollIntoView({ behavior: 'smooth' })}>
                О проекте
              </button>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="b2b-section" className="section-padding" style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 className="font-headline" style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, marginBottom: 16 }}>Как это работает</h2>
            <div style={{ width: 80, height: 4, background: 'var(--primary)', margin: '0 auto', borderRadius: 99 }}></div>
          </div>

          <div className="grid-3">
            {/* Step 1 */}
            <div
              className={`step-card group ${pressedStep === 1 ? 'is-pressed' : ''}`}
              data-pressable="true"
              onPointerDown={() => setPressedStep(1)}
              onPointerUp={() => setPressedStep(null)}
              onPointerLeave={() => setPressedStep(null)}
              onPointerCancel={() => setPressedStep(null)}
            >
              <div className="step-num">01</div>
              <div style={{ marginBottom: 32 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--primary)' }}>barcode_scanner</span>
              </div>
              <h3 className="font-headline" style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Сканируйте штрихкод</h3>
              <p className="font-label" style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6, fontSize: 15 }}>Просто наведите камеру на штрихкод продукта, чтобы мгновенно получить его данные прямо в магазине.</p>
            </div>
            
            {/* Step 2 */}
            <div
              className={`step-card group ${pressedStep === 2 ? 'is-pressed' : ''}`}
              data-pressable="true"
              onPointerDown={() => setPressedStep(2)}
              onPointerUp={() => setPressedStep(null)}
              onPointerLeave={() => setPressedStep(null)}
              onPointerCancel={() => setPressedStep(null)}
            >
              <div className="step-num">02</div>
              <div style={{ marginBottom: 32 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--primary)' }}>psychology</span>
              </div>
              <h3 className="font-headline" style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Анализ нейросетью</h3>
              <p className="font-label" style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6, fontSize: 15 }}>Наши алгоритмы Körset AI расшифруют состав, найдут добавки, консерванты и скрытые аллергены.</p>
            </div>

            {/* Step 3 */}
            <div
              className={`step-card group ${pressedStep === 3 ? 'is-pressed' : ''}`}
              data-pressable="true"
              onPointerDown={() => setPressedStep(3)}
              onPointerUp={() => setPressedStep(null)}
              onPointerLeave={() => setPressedStep(null)}
              onPointerCancel={() => setPressedStep(null)}
            >
              <div className="step-num">03</div>
              <div style={{ marginBottom: 32 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--primary)' }}>fact_check</span>
              </div>
              <h3 className="font-headline" style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Умный вердикт</h3>
              <p className="font-label" style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6, fontSize: 15 }}>Получите строгую оценку качества продукта и его соответствия вашим предпочтениям.</p>
            </div>
          </div>
        </section>

        {/* Features Vertical Stack (Mobile First) */}
        <section className="section-padding" style={{ background: 'rgba(27, 27, 31, 0.3)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Карточка 1: E-добавки */}
            <div className="glass" style={{ padding: '32px', borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 24, borderLeft: '2px solid rgba(210, 187, 255, 0.5)' }}>
               <div>
                  <span className="font-label" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)' }}>Распознавание</span>
                  <div className="font-headline" style={{ fontSize: 44, fontWeight: 700, color: '#fff', marginTop: 8 }}>E-Добавки</div>
               </div>
               <p className="font-label" style={{ fontSize: 14, color: 'var(--on-surface-variant)', lineHeight: 1.5, opacity: 0.9 }}>
                  Körset выявляет все скрытые красители, консерванты и эмульгаторы, разбивая сложный химический состав на понятные компоненты.
               </p>
            </div>

            {/* Карточка 2: Умный сканер */}
            <div className="glass" style={{ padding: '32px', borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 24, borderLeft: '2px solid rgba(255, 183, 132, 0.5)' }}>
               <div>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--tertiary)' }}>center_focus_strong</span>
               </div>
               <div>
                  <h4 className="font-headline" style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Умный сканер</h4>
                  <p className="font-label" style={{ fontSize: 14, color: 'var(--on-surface-variant)', lineHeight: 1.5, opacity: 0.9 }}>
                    Наведите камеру смартфона на штрихкод товара, и вы за долю секунды получите подробный Fit-Check прямо у полки магазина.
                  </p>
               </div>
            </div>

            {/* Карточка 3: Персональные фильтры (Халал/Веган) */}
            <div className="glass" style={{ padding: '32px', borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
               <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(210, 187, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--primary)' }}>person_search</span>
                  </div>
                  <h3 className="font-headline" style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>Ваш профиль</h3>
               </div>
               <p className="font-label" style={{ color: 'var(--on-surface-variant)', fontSize: 15, lineHeight: 1.6 }}>
                 Настройте фильтры: Халал, Веган или диетические программы. Приложение заранее предупредит вас, если продукт вам не подходит.
               </p>
            </div>

            {/* Карточка 4: Защита аллергиков */}
            <div className="glass" style={{ padding: '32px', borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 24, borderLeft: '2px solid rgba(16, 185, 129, 0.5)' }}>
               <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#10B981' }}>health_and_safety</span>
                  </div>
                  <h3 className="font-headline" style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>Детектор аллергий</h3>
               </div>
               <p className="font-label" style={{ color: 'var(--on-surface-variant)', fontSize: 15, lineHeight: 1.6 }}>
                 Мгновенное выявление критичных аллергенов (орехи, лактоза, глютен и др.). Сохраняйте проверенные безопасные продукты в историю.
               </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ padding: '60px 24px', background: '#0e0e12', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 40, justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="font-headline" style={{ fontSize: 28, fontWeight: 700 }}>Körset</div>
            <div style={{ display: 'flex', gap: 48 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span className="font-label" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Продукт</span>
                <a href="#" className="font-label" style={{ color: '#fff', textDecoration: 'none', fontSize: 14 }}>Каталог</a>
                <a href="#" className="font-label" style={{ color: '#fff', textDecoration: 'none', fontSize: 14 }}>О нас</a>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--surface-variant)', borderRadius: 99, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }}></div>
                <span className="font-label" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Made in KZ 🇰🇿</span>
              </div>
              <div className="font-label" style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© 2024 Körset. All rights reserved.</div>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}



function QuickCard({ title, sub, color, border, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: '16px', borderRadius: 18, cursor: 'pointer', background: color, border: `1px solid ${border}`, textAlign: 'left' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>{title}</div>
      <div style={{ fontSize: 11, color: 'rgba(167,139,250,0.6)', marginTop: 4 }}>{sub}</div>
    </button>
  )
}
