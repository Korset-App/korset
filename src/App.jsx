import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import ProfileScreen from './screens/ProfileScreen.jsx'
import CatalogScreen from './screens/CatalogScreen.jsx'
import ScanScreen from './screens/ScanScreen.jsx'
import ProductScreen from './screens/ProductScreen.jsx'
import ExternalProductScreen from './screens/ExternalProductScreen.jsx'
import AlternativesScreen from './screens/AlternativesScreen.jsx'
import AIScreen from './screens/AIScreen.jsx'
import QRPrintScreen from './screens/QRPrintScreen.jsx'
import BottomNav from './components/BottomNav.jsx'

export default function App() {
  const { pathname } = useLocation()
  const hideNav = pathname.endsWith('/ai') || pathname === '/qr-print'

  return (
    <div className="app-frame">
      <Routes>
        <Route path="/" element={<ProfileScreen />} />
        <Route path="/catalog" element={<CatalogScreen />} />
        <Route path="/scan" element={<ScanScreen />} />
        <Route path="/qr-print" element={<QRPrintScreen />} />
        <Route path="/product/ext/:ean" element={<ExternalProductScreen />} />
        <Route path="/product/:id" element={<ProductScreen />} />
        <Route path="/product/:id/alternatives" element={<AlternativesScreen />} />
        <Route path="/product/:id/ai" element={<AIScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </div>
  )
}
