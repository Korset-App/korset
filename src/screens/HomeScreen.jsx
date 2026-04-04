import { useNavigate } from 'react-router-dom'
import { useI18n } from '../utils/i18n.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { getStores } from '../data/stores.js'
import { buildStorePublicPath } from '../utils/routes.js'

export default function HomeScreen() {
  const navigate = useNavigate()
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
        .landing-bg {
          background: #07070F;
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          overflow-y: auto;
          font-family: 'Advent Pro', sans-serif;
        }
        .glow-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          z-index: 0;
          opacity: 0.6;
          pointer-events: none;
        }
        .orb-1 { width: 300px; height: 300px; background: rgba(124,58,237,0.3); top: -100px; left: -50px; }
        .orb-2 { width: 250px; height: 250px; background: rgba(16,185,129,0.2); bottom: 100px; right: -50px; }
        .orb-3 { width: 400px; height: 400px; background: rgba(239,68,68,0.15); top: 40%; left: 50%; transform: translateX(-50%); }
        
        .content-wrap {
          position: relative;
          z-index: 1;
        }
        
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        
        .floating-card {
          animation: float 4s ease-in-out infinite;
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 12px 16px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.2);
          position: absolute;
        }

        .glass-panel {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.2);
        }

        .cta-btn {
          background: linear-gradient(135deg, #7C3AED, #6D28D9);
          border: none;
          color: white;
          font-family: 'Advent Pro', sans-serif;
          font-weight: 700;
          font-size: 16px;
          padding: 16px 24px;
          border-radius: 16px;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(124,58,237,0.3);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .cta-btn:active {
          transform: scale(0.98);
          box-shadow: 0 4px 12px rgba(124,58,237,0.2);
        }
      `}</style>
      
      <div className="landing-bg">
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
        <div className="glow-orb orb-3"></div>

        <div className="content-wrap" style={{ padding: '0 24px', maxWidth: 600, margin: '0 auto' }}>
          
          {/* Header */}
          <header style={{ padding: '24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/icon_logo.svg" alt="logo" style={{ width: 32, height: 32, borderRadius: 8 }} />
              <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>KÖRSET</span>
            </div>
            <button onClick={() => navigate('/auth')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Advent Pro', sans-serif" }}>
              Войти
            </button>
          </header>

          {/* Hero */}
          <div style={{ textAlign: 'center', marginTop: 40, marginBottom: 60, position: 'relative' }}>
            <h1 style={{ fontSize: 48, fontWeight: 800, color: '#fff', lineHeight: 1.1, margin: '0 0 16px', background: '-webkit-linear-gradient(135deg, #FFF, #C4B5FD)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Узнайте правду<br />о том, что вы едите.
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, margin: '0 auto 32px', maxWidth: 320 }}>
              Сканируйте штрихкоды. AI проверит состав на аллергены, Е-добавки и Халал за 1 секунду.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
               <button className="cta-btn" style={{ width: '100%', maxWidth: 280 }} onClick={() => navigate('/stores')}>
                 Выбрать магазин и начать
               </button>
               {continueStore ? (
                  <button onClick={() => navigate(`/s/${continueStore.slug}`)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#E9D5FF', fontWeight: 600, fontSize: 14, padding: '12px 24px', borderRadius: 14, cursor: 'pointer', fontFamily: "'Advent Pro', sans-serif" }}>
                    Продолжить в {continueStore.name}
                  </button>
               ) : null}
               <button onClick={() => document.getElementById('b2b-section')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: 'transparent', border: 'none', color: '#C4B5FD', fontWeight: 600, fontSize: 14, padding: '10px', cursor: 'pointer', fontFamily: "'Advent Pro', sans-serif", marginTop: continueStore ? 0 : 8 }}>
                 Для бизнеса (ритейл)
               </button>
            </div>

            {/* Floating Cards (Visuals) */}
            <div style={{ position: 'relative', height: 160, marginTop: 40 }}>
               <div className="floating-card" style={{ top: 10, left: 0, animationDelay: '0s' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>✓</div>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Халал одобрен</span>
               </div>
               <div className="floating-card" style={{ top: 70, right: 0, animationDelay: '1s' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</div>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>AI Анализ</span>
               </div>
               <div className="floating-card" style={{ top: 110, left: 30, animationDelay: '2s' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🌾</div>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Без Глютена</span>
               </div>
            </div>
          </div>

          {/* How it Works */}
          <div style={{ marginBottom: 60 }}>
             <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', textAlign: 'center', marginBottom: 24, letterSpacing: -0.5 }}>Как это работает</h2>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               {[
                 { num: 1, text: 'Выберите свой магазин или супермаркет из каталога', icon: '🛒' },
                 { num: 2, text: 'Отсканируйте продукт прямо с полки с помощью камеры', icon: '📷' },
                 { num: 3, text: 'Получите точный вердикт: подходит ли вам продукт', icon: '✨' },
               ].map((step) => (
                 <div key={step.num} className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      {step.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                       <div style={{ fontSize: 12, color: '#A78BFA', fontWeight: 700, marginBottom: 4, letterSpacing: 1 }}>ШАГ {step.num}</div>
                       <div style={{ fontSize: 15, color: '#fff', fontWeight: 500, lineHeight: 1.4 }}>{step.text}</div>
                    </div>
                 </div>
               ))}
             </div>
          </div>

          {/* Features Bento */}
          <div style={{ marginBottom: 60 }}>
             <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', textAlign: 'center', marginBottom: 24, letterSpacing: -0.5 }}>Возможности</h2>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '24px', background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(124,58,237,0.03))' }}>
                   <div style={{ fontSize: 32, marginBottom: 12 }}>🧠</div>
                   <h3 style={{ fontSize: 18, color: '#fff', fontWeight: 700, margin: '0 0 8px' }}>Умный AI-алгоритм</h3>
                   <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>Нейросеть переведет сложный химический состав на понятный язык.</p>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                   <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.15)', color: '#F87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                   </div>
                   <div>
                     <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Аллергены</div>
                     <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.4 }}>Мгновенное предупреждение.</div>
                   </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                   <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                   </div>
                   <div>
                     <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Диеты</div>
                     <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.4 }}>Халал, веганство и др.</div>
                   </div>
                </div>
             </div>
          </div>

          {/* B2B Section */}
          <div id="b2b-section" className="glass-panel" style={{ marginBottom: 60, textAlign: 'center', padding: '32px 24px', border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.05)' }}>
             <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 12, letterSpacing: -0.5 }}>Владельцам магазинов</h2>
             <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 24 }}>
               Интегрируйте ваш каталог в Körset. Ваши покупатели скажут вам спасибо за честность и заботу о их здоровье. Мы поможем выбирать продукты быстрее и безопаснее.
             </p>
             <button style={{ background: '#fff', color: '#07070F', border: 'none', padding: '14px 24px', borderRadius: 14, fontWeight: 700, fontSize: 15, fontFamily: "'Advent Pro', sans-serif", cursor: 'pointer' }}>
               Подключить магазин
             </button>
          </div>

          {/* Footer */}
          <footer style={{ padding: '32px 0 60px', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
             <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: 1, marginBottom: 8 }}>KÖRSET</div>
             <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>AI-ассистент для умных покупок</div>
             
             <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
               <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
               <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</a>
               <span style={{ color: 'inherit' }}>Made in KZ 🇰🇿</span>
             </div>
          </footer>

        </div>
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
