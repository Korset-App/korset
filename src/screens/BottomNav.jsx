import { useNavigate, useLocation } from 'react-router-dom'

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const getActive = () => {
    if (pathname === '/') return 'home'
    if (pathname === '/profile') return 'profile'
    if (pathname === '/catalog' || pathname.startsWith('/product')) return 'catalog'
    if (pathname === '/ai') return 'ai'
    return 'home'
  }
  const active = getActive()

  const c = (on) => on ? '#A78BFA' : 'rgba(140,140,180,0.45)'
  const f = (on) => on ? 'rgba(167,139,250,0.2)' : 'none'

  const TABS = [
    {
      id: 'home', label: 'Главная', path: '/',
      icon: (on) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 11L12 3l9 8v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9z"
            stroke={c(on)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            fill={f(on)}/>
          <path d="M9 21V13h6v8"
            stroke={c(on)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: 'catalog', label: 'Каталог', path: '/catalog',
      icon: (on) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7"
            stroke={c(on)} strokeWidth="1.8" fill={f(on)}/>
          <path d="M16.5 16.5L21 21"
            stroke={c(on)} strokeWidth="2" strokeLinecap="round"/>
          {on && <circle cx="11" cy="11" r="3" fill="rgba(167,139,250,0.35)"/>}
        </svg>
      ),
    },
    {
      id: 'scan', label: 'Скан', path: '/scan', isScan: true,
      icon: () => (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <path d="M3 7V4a1 1 0 0 1 1-1h3"/>
          <path d="M17 3h3a1 1 0 0 1 1 1v3"/>
          <path d="M21 17v3a1 1 0 0 1-1 1h-3"/>
          <path d="M7 21H4a1 1 0 0 1-1-1v-3"/>
          <line x1="7" y1="12" x2="17" y2="12" strokeWidth="2.2"/>
        </svg>
      ),
    },
    {
      id: 'ai', label: 'AI', path: '/ai',
      icon: (on) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2.5l1.6 4.9 4.9 1.6-4.9 1.6-1.6 4.9-1.6-4.9-4.9-1.6 4.9-1.6L12 2.5z"
            stroke={c(on)} strokeWidth="1.6" strokeLinejoin="round"
            fill={f(on)}/>
          <path d="M5 17l.7 2 2 .7-2 .7L5 22.4l-.7-2-2-.7 2-.7L5 17z"
            stroke={c(on)} strokeWidth="1.4" strokeLinejoin="round"
            fill={on ? 'rgba(167,139,250,0.25)' : 'none'} opacity="0.7"/>
        </svg>
      ),
    },
    {
      id: 'profile', label: 'Профиль', path: '/profile',
      icon: (on) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4"
            stroke={c(on)} strokeWidth="1.8" fill={f(on)}/>
          <path d="M4 20c0-3.9 3.6-7 8-7s8 3.1 8 7"
            stroke={c(on)} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
    },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '10px 4px 30px',
      background: 'rgba(8,8,20,0.97)',
      backdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
    }}>
      {TABS.map(tab => {
        const on = active === tab.id

        if (tab.isScan) {
          return (
            <button key={tab.id} onClick={() => navigate('/scan')} style={{
              width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(145deg, #7C3AED, #5B21B6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 4px rgba(124,58,237,0.2), 0 4px 20px rgba(124,58,237,0.5)',
              flexShrink: 0,
              transform: 'translateY(-10px)',
            }}>
              {tab.icon()}
            </button>
          )
        }

        return (
          <button key={tab.id} onClick={() => navigate(tab.path)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 4,
            padding: '6px 12px', borderRadius: 14,
            border: 'none', cursor: 'pointer',
            background: 'transparent',
            minWidth: 52,
            transition: 'transform 0.2s ease',
            transform: on ? 'translateY(-1px)' : 'translateY(0)',
          }}>
            {tab.icon(on)}
            <span style={{
              fontSize: 10.5, fontWeight: on ? 700 : 400,
              color: c(on),
              fontFamily: 'var(--font-body)',
              transition: 'color 0.2s ease, font-weight 0.2s',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
