import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  {
    id: 'home',
    label: 'Главная',
    path: '/',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    id: 'catalog',
    label: 'Каталог',
    path: '/catalog',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    id: 'scan',
    label: 'Скан',
    path: '/scan',
    isScan: true,
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7V4a1 1 0 0 1 1-1h3"/>
        <path d="M17 3h3a1 1 0 0 1 1 1v3"/>
        <path d="M21 17v3a1 1 0 0 1-1 1h-3"/>
        <path d="M7 21H4a1 1 0 0 1-1-1v-3"/>
        <line x1="7" y1="12" x2="17" y2="12" strokeWidth="2.5"/>
      </svg>
    ),
  },
  {
    id: 'ai',
    label: 'AI',
    path: '/ai',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z"/>
        <path d="M5 19l.8 2.2L8 22l-2.2.8L5 25l-.8-2.2L2 22l2.2-.8L5 19z" opacity="0.6"/>
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Профиль',
    path: '/profile',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const navigate  = useNavigate()
  const { pathname } = useLocation()
  const [activeId, setActiveId] = useState('home')

  // Определяем активную вкладку по pathname
  useEffect(() => {
    if (pathname === '/' || pathname === '/profile') setActiveId('profile')
    else if (pathname === '/catalog' || pathname.startsWith('/product')) setActiveId('catalog')
    else if (pathname === '/scan')    setActiveId('scan')
    else if (pathname === '/ai')      setActiveId('ai')
    else setActiveId('home')
  }, [pathname])

  const handleTab = (tab) => {
    if (tab.id === 'scan') { navigate('/scan'); return }
    if (tab.id === 'ai')   { navigate('/catalog'); return } // AI пока открывает каталог, потом отдельный экран
    if (tab.id === 'home' || tab.id === 'profile') { navigate('/'); return }
    navigate(tab.path)
  }

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '10px 8px 28px',
      background: 'rgba(9,9,20,0.96)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
    }}>
      {TABS.map(tab => {
        const active = activeId === tab.id

        // Скан — центральная кнопка, особый стиль
        if (tab.isScan) {
          return (
            <button
              key={tab.id}
              onClick={() => handleTab(tab)}
              style={{
                width: 56, height: 56, borderRadius: 18,
                background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(124,58,237,0.5)',
                color: '#fff',
                flexShrink: 0,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(0.93)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {tab.icon}
            </button>
          )
        }

        return (
          <button
            key={tab.id}
            onClick={() => handleTab(tab)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: active ? '7px 14px' : '7px 10px',
              borderRadius: 16,
              border: 'none', cursor: 'pointer',
              background: active ? 'rgba(124,58,237,0.18)' : 'transparent',
              color: active ? '#A78BFA' : 'rgba(160,160,200,0.5)',
              transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
              minWidth: active ? 72 : 44,
              flexShrink: 0,
            }}
          >
            <div style={{ transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)',
              transform: active ? 'scale(1.1)' : 'scale(1)' }}>
              {tab.icon}
            </div>
            <span style={{
              fontSize: 10, fontWeight: active ? 700 : 500,
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.2px',
              maxWidth: active ? 80 : 0,
              overflow: 'hidden',
              opacity: active ? 1 : 0,
              transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
              whiteSpace: 'nowrap',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
