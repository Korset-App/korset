import { useNavigate, useLocation } from 'react-router-dom'

const NavIcon = ({ name }) => {
  if (name === 'profile') return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  )
  if (name === 'catalog') return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
      <path d="M6 5v14" />
      <path d="M18 5v14" />
    </svg>
  )
  if (name === 'scan') return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="5" rx="1"/>
      <rect x="16" y="3" width="5" height="5" rx="1"/>
      <rect x="3" y="16" width="5" height="5" rx="1"/>
      <path d="M16 16h5v5M16 16v5"/>
      <path d="M3 12h4M10 3v4M12 3h2M12 10h2M10 12h4M14 12v4M16 12h2"/>
    </svg>
  )
  if (name === 'ai') return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12"/>
      <path d="M8 12h.01M12 12h.01M16 12h.01"/>
    </svg>
  )
  return null
}

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isProfile = pathname === '/'
  const isCatalog = pathname === '/catalog' || pathname.startsWith('/product')
  const isScan = pathname === '/scan'
  const isAI = false // AI is accessed from product, not standalone nav

  return (
    <nav className="bottom-nav">
      <div
        className={`nav-item ${isProfile ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        <NavIcon name="profile" />
        <span className="nav-label">Профиль</span>
      </div>
      <div
        className={`nav-item ${isCatalog ? 'active' : ''}`}
        onClick={() => navigate('/catalog')}
      >
        <NavIcon name="catalog" />
        <span className="nav-label">Товары</span>
      </div>
      <div
        className={`nav-item ${isScan ? 'active' : ''}`}
        onClick={() => navigate('/scan')}
      >
        <NavIcon name="scan" />
        <span className="nav-label">Скан</span>
      </div>
    </nav>
  )
}
