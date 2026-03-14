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

  const TABS = [
    {
      id: 'home', label: 'Главная', path: '/',
      icon: (on) => (
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={on ? '#A78BFA' : 'rgba(140,140,180,0.5)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5z" fill={on ? 'rgba(167,139,250,0.18)' : 'none'}/>
          <path d="M9 21V13h6v8" stroke={on ? '#A78BFA' : 'rgba(140,140,180,0.5)'}/>
        </svg>
      ),
    },
    {
      id: 'catalog', label: 'Каталог', path: '/catalog',
      icon: (on) => (
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={on ? '#A78BFA' : 'rgba(140,140,180,0.5)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" fill={on ? 'rgba(167,139,250,0.18)' : 'none'}/>
          <rect x="14" y="3" width="7" height="7" rx="1.5" fill={on ? 'rgba(167,139,250,0.18)' : 'none'}/>
          <rect x="3" y="14" width="7" height="7" rx="1.5" fill={on ? 'rgba(167,139,250,0.18)' : 'none'}/>
          <rect x="14" y="14" width="7" height="7" rx="1.5" fill={on ? 'rgba(167,139,250,0.18)' : 'none'}/>
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
          <rect x="7" y="7" width="10" height="10" rx="2" fill="rgba(255,255,255,0.15)" stroke="#fff" strokeWidth="1.8"/>
          <line x1="12" y1="9.5" x2="12" y2="14.5" strokeWidth="2"/>
          <line x1="9.5" y1="12" x2="14.5" y2="12" strokeWidth="2"/>
        </svg>
      ),
    },
    {
      id: 'ai', label: 'AI', path: '/ai',
      icon: (on) => (
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={on ? '#A78BFA' : 'rgba(140,140,180,0.5)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" fill={on ? 'rgba(167,139,250,0.15)' : 'none'}/>
          <path d="M12 8v4l3 3" stroke={on ? '#A78BFA' : 'rgba(140,140,180,0.5)'} strokeWidth="2"/>
          <circle cx="12" cy="12" r="1.5" fill={on ? '#A78BFA' : 'rgba(140,140,180,0.5)'}/>
          <path d="M9 3.5C9 3.5 10.5 5 12 5s3-1.5 3-1.5" strokeWidth="1.5"/>
        </svg>
      ),
    },
    {
      id: 'profile', label: 'Профиль', path: '/profile',
      icon: (on) => (
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={on ? '#A78BFA' : 'rgba(140,140,180,0.5)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" fill={on ? 'rgba(167,139,250,0.18)' : 'none'}/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill={on ? 'rgba(167,139,250,0.1)' : 'none'}/>
        </svg>
      ),
    },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '10px 4px 28px',
      background: 'rgba(8,8,18,0.97)',
      backdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
    }}>
      {TABS.map(tab => {
        const on = active === tab.id

        if (tab.isScan) {
          return (
            <button key={tab.id} onClick={() => navigate('/scan')} style={{
              width: 52, height: 52, borderRadius: 16, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(124,58,237,0.55)',
              flexShrink: 0,
              transform: 'translateY(-8px)',
            }}>
              {tab.icon()}
            </button>
          )
        }

        return (
          <button key={tab.id} onClick={() => navigate(tab.path)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 4,
            padding: '6px 10px', borderRadius: 14,
            border: 'none', cursor: 'pointer',
            background: on ? 'rgba(124,58,237,0.15)' : 'transparent',
            transition: 'background 0.25s ease, transform 0.25s ease',
            transform: on ? 'translateY(-2px)' : 'translateY(0)',
            minWidth: 52,
          }}>
            <div style={{ transition: 'transform 0.25s ease', transform: on ? 'scale(1.12)' : 'scale(1)' }}>
              {tab.icon(on)}
            </div>
            <span style={{
              fontSize: 10, fontWeight: on ? 700 : 500,
              color: on ? '#A78BFA' : 'rgba(140,140,180,0.5)',
              fontFamily: 'var(--font-body)',
              transition: 'color 0.25s ease',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
