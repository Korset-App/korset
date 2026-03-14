import { useNavigate, useLocation } from 'react-router-dom'

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const getActive = () => {
    if (pathname === '/') return 'home'
    if (pathname === '/profile') return 'profile'
    if (pathname === '/scan') return 'scan'
    if (pathname === '/catalog' || pathname.startsWith('/product')) return 'catalog'
    if (pathname === '/ai' || pathname.endsWith('/ai')) return 'ai'
    return 'home'
  }
  const active = getActive()

  const col = (on) => on ? '#A78BFA' : 'rgba(140,140,180,0.45)'

  const TABS = [
    {
      id: 'home', label: 'Главная', path: '/',
      icon: (on) => on ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={col(true)}><path d="M21 20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.48907C3 9.18048 3.14247 8.88917 3.38606 8.69972L11.3861 2.47749C11.7472 2.19663 12.2528 2.19663 12.6139 2.47749L20.6139 8.69972C20.8575 8.88917 21 9.18048 21 9.48907V20ZM11 13V19H13V13H11Z"/></svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={col(false)}><path d="M13 19H19V9.97815L12 4.53371L5 9.97815V19H11V13H13V19ZM21 20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.48907C3 9.18048 3.14247 8.88917 3.38606 8.69972L11.3861 2.47749C11.7472 2.19663 12.2528 2.19663 12.6139 2.47749L20.6139 8.69972C20.8575 8.88917 21 9.18048 21 9.48907V20Z"/></svg>
      ),
    },
    {
      id: 'catalog', label: 'Каталог', path: '/catalog',
      icon: (on) => on ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={col(true)}>
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M9 3a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2v-4a2 2 0 0 1 2 -2z"/>
          <path d="M19 3a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2v-4a2 2 0 0 1 2 -2z"/>
          <path d="M9 13a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2v-4a2 2 0 0 1 2 -2z"/>
          <path d="M19 13a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2v-4a2 2 0 0 1 2 -2z"/>
        </svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={col(false)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M4 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4"/>
          <path d="M14 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4"/>
          <path d="M4 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4"/>
          <path d="M14 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4"/>
        </svg>
      ),
    },
    {
      id: 'scan', label: 'Скан', path: '/scan', isScan: true,
      icon: () => (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8V6a2 2 0 0 1 2-2h2"/>
          <path d="M16 4h2a2 2 0 0 1 2 2v2"/>
          <path d="M20 16v2a2 2 0 0 1-2 2h-2"/>
          <path d="M8 20H6a2 2 0 0 1-2-2v-2"/>
          <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2.2"/>
        </svg>
      ),
    },
    {
      id: 'ai', label: 'AI', path: '/ai',
      icon: (on) => on ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={col(true)}><path d="M12 1.99996C12.9057 1.99996 13.7829 2.12194 14.6172 2.34762C14.2223 3.14741 14 4.04768 14 4.99997C14 8.31368 16.6863 11 20 11C20.6685 11 21.3106 10.8882 21.9111 10.6865C21.9676 11.1165 22 11.5546 22 12C22 17.5228 17.5228 22 12 22C10.2975 22 8.69425 21.5746 7.29102 20.8242L2 22L3.17578 16.709C2.42542 15.3057 2 13.7025 2 12C2.00002 6.47714 6.47717 1.99996 12 1.99996ZM19.5293 1.3193C19.7058 0.893513 20.2942 0.8935 20.4707 1.3193L20.7236 1.93063C21.1555 2.97343 21.9615 3.80614 22.9746 4.2568L23.6914 4.57614C24.1022 4.75882 24.1022 5.35635 23.6914 5.53903L22.9326 5.87692C21.945 6.3162 21.1534 7.11943 20.7139 8.1279L20.4668 8.69333C20.2863 9.10747 19.7136 9.10747 19.5332 8.69333L19.2861 8.1279C18.8466 7.11942 18.0551 6.3162 17.0674 5.87692L16.3076 5.53903C15.8974 5.35618 15.8974 4.75895 16.3076 4.57614L17.0254 4.2568C18.0384 3.80614 18.8445 2.97343 19.2764 1.93063L19.5293 1.3193Z"/></svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={col(false)}><path d="M12 1.99996C12.8632 1.99996 13.701 2.10973 14.5 2.31539L14 4.25192C13.3608 4.0874 12.6906 3.99997 12 3.99997C7.58174 3.99997 4.00002 7.58172 4 12C4 13.3344 4.3255 14.6174 4.93945 15.7656L5.28906 16.4189L4.63379 19.3662L7.58105 18.7109L8.23438 19.0605C9.38255 19.6745 10.6656 20 12 20C16.4183 20 20 16.4183 20 12C20 11.6771 19.9805 11.3587 19.9434 11.0459L21.9297 10.8095C21.976 11.1999 22 11.5972 22 12C22 17.5228 17.5228 22 12 22C10.2975 22 8.69425 21.5746 7.29102 20.8242L2 22L3.17578 16.709C2.42541 15.3057 2 13.7025 2 12C2.00002 6.47714 6.47717 1.99996 12 1.99996ZM19.5293 1.3193C19.7058 0.893513 20.2942 0.8935 20.4707 1.3193L20.7236 1.93063C21.1555 2.97343 21.9615 3.80614 22.9746 4.2568L23.6914 4.57614C24.1022 4.75882 24.1022 5.35635 23.6914 5.53903L22.9326 5.87692C21.945 6.3162 21.1534 7.11943 20.7139 8.1279L20.4668 8.69333C20.2863 9.10747 19.7136 9.10747 19.5332 8.69333L19.2861 8.1279C18.8466 7.11942 18.0551 6.3162 17.0674 5.87692L16.3076 5.53903C15.8974 5.35618 15.8974 4.75895 16.3076 4.57614L17.0254 4.2568C18.0384 3.80614 18.8445 2.97343 19.2764 1.93063L19.5293 1.3193Z"/></svg>
      ),
    },
    {
      id: 'profile', label: 'Профиль', path: '/profile',
      icon: (on) => on ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={col(true)}><path d="M4 22C4 17.5817 7.58172 14 12 14C16.4183 14 20 17.5817 20 22H4ZM12 13C8.685 13 6 10.315 6 7C6 3.685 8.685 1 12 1C15.315 1 18 3.685 18 7C18 10.315 15.315 13 12 13Z"/></svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={col(false)}><path d="M4 22C4 17.5817 7.58172 14 12 14C16.4183 14 20 17.5817 20 22H18C18 18.6863 15.3137 16 12 16C8.68629 16 6 18.6863 6 22H4ZM12 13C8.685 13 6 10.315 6 7C6 3.685 8.685 1 12 1C15.315 1 18 3.685 18 7C18 10.315 15.315 13 12 13ZM12 11C14.21 11 16 9.21 16 7C16 4.79 14.21 3 12 3C9.79 3 8 4.79 8 7C8 9.21 9.79 11 12 11Z"/></svg>
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
              boxShadow: on ? '0 0 0 6px rgba(124,58,237,0.24), 0 8px 28px rgba(124,58,237,0.62)' : '0 0 0 4px rgba(124,58,237,0.2), 0 4px 20px rgba(124,58,237,0.5)',
              flexShrink: 0,
              transform: on ? 'translateY(-14px) scale(1.04)' : 'translateY(-10px)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}>
              {tab.icon()}
            </button>
          )
        }

        return (
          <button key={tab.id} onClick={() => navigate(tab.path)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 4,
            padding: '6px 10px', borderRadius: 12,
            border: 'none', cursor: 'pointer',
            background: 'transparent',
            minWidth: 52,
          }}>
            {tab.icon(on)}
            <span style={{
              fontSize: 10.5, fontWeight: on ? 700 : 400,
              color: col(on),
              fontFamily: 'var(--font-body)',
              transition: 'color 0.2s',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
