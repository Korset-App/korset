import { useNavigate } from 'react-router-dom'

export default function HomeScreen() {
  const navigate = useNavigate()

  return (
    <div className="screen" style={{ paddingBottom: 100 }}>
      <div style={{ padding: '20px 24px 0' }}>

        {/* Лого + заголовок */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: 'rgba(167,139,250,0.7)', fontWeight: 600, marginBottom: 8, letterSpacing: '0.3px' }}>
            {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900,
            color: '#fff', lineHeight: 1.15, letterSpacing: '-0.5px', marginBottom: 8,
          }}>
            Добро пожаловать<br/>
            в <span style={{ color: '#A78BFA' }}>Körset</span>
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(180,180,210,0.65)', lineHeight: 1.55 }}>
            Сканируй товары и узнай — подходят ли они именно тебе
          </p>
        </div>

        {/* Главная кнопка */}
        <button onClick={() => navigate('/scan')} style={{
          width: '100%', padding: '24px 20px', borderRadius: 22, cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.22), rgba(109,40,217,0.1))',
          border: '1.5px solid rgba(124,58,237,0.4)',
          display: 'flex', alignItems: 'center', gap: 18,
          boxShadow: '0 8px 32px rgba(124,58,237,0.12)',
          marginBottom: 16,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(124,58,237,0.45)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <path d="M3 7V4a1 1 0 0 1 1-1h3"/>
              <path d="M17 3h3a1 1 0 0 1 1 1v3"/>
              <path d="M21 17v3a1 1 0 0 1-1 1h-3"/>
              <path d="M7 21H4a1 1 0 0 1-1-1v-3"/>
              <line x1="7" y1="12" x2="17" y2="12" strokeWidth="2.5"/>
            </svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: '#E9D5FF', marginBottom: 3 }}>
              Сканировать штрихкод
            </div>
            <div style={{ fontSize: 12, color: 'rgba(167,139,250,0.6)' }}>
              Наведи на любой товар в магазине
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.5)" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        {/* Быстрые действия */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          <button onClick={() => navigate('/catalog')} style={{
            padding: '16px', borderRadius: 18, cursor: 'pointer',
            background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)',
            textAlign: 'left',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" style={{ marginBottom: 10 }}>
              <rect x="3" y="3" width="7" height="7" rx="1.5" fill="rgba(96,165,250,0.15)"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5" fill="rgba(96,165,250,0.15)"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5" fill="rgba(96,165,250,0.15)"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5" fill="rgba(96,165,250,0.15)"/>
            </svg>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>Каталог</div>
            <div style={{ fontSize: 11, color: 'rgba(96,165,250,0.6)', marginTop: 2 }}>Все товары</div>
          </button>

          <button onClick={() => navigate('/ai')} style={{
            padding: '16px', borderRadius: 18, cursor: 'pointer',
            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
            textAlign: 'left',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" style={{ marginBottom: 10 }}>
              <circle cx="12" cy="12" r="9" fill="rgba(167,139,250,0.1)"/>
              <path d="M8 12h.01M12 12h.01M16 12h.01" strokeWidth="2.5"/>
            </svg>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>AI помощник</div>
            <div style={{ fontSize: 11, color: 'rgba(167,139,250,0.6)', marginTop: 2 }}>Спроси что угодно</div>
          </button>
        </div>

        {/* Как работает */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(160,160,200,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
          Как это работает
        </div>
        {[
          { n: '1', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', text: 'Сканируй штрихкод любого товара в магазине' },
          { n: '2', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  text: 'Körset найдёт состав, аллергены и КБЖУ' },
          { n: '3', color: '#34D399', bg: 'rgba(52,211,153,0.1)',  text: 'AI мгновенно проверит — подходит ли товар тебе' },
        ].map(s => (
          <div key={s.n} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '13px 14px', borderRadius: 14, marginBottom: 8,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9, flexShrink: 0,
              background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: s.color,
            }}>{s.n}</div>
            <p style={{ fontSize: 13, color: 'rgba(200,200,240,0.75)', lineHeight: 1.5, margin: 0 }}>{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
