import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import ProfileScreen from './screens/ProfileScreen.jsx'
import CatalogScreen from './screens/CatalogScreen.jsx'
import ScanScreen from './screens/ScanScreen.jsx'
import ProductScreen from './screens/ProductScreen.jsx'
import AlternativesScreen from './screens/AlternativesScreen.jsx'
import AIScreen from './screens/AIScreen.jsx'
import BottomNav from './components/BottomNav.jsx'

export default function App() {
  const { pathname } = useLocation()

  // Hide bottom nav on AI screen (it has its own sticky input)
  const hideNav = pathname.endsWith('/ai')

  return (
    <div className="app-frame">
      <Routes>
        <Route path="/" element={<ProfileScreen />} />
        <Route path="/catalog" element={<CatalogScreen />} />
        <Route path="/scan" element={<ScanScreen />} />
        <Route path="/product/:id" element={<ProductScreen />} />
        <Route path="/product/:id/alternatives" element={<AlternativesScreen />} />
        <Route path="/product/:id/ai" element={<AIScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </div>
  )
}
