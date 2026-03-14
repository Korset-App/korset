import { useState } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import HomeScreen from './screens/HomeScreen.jsx'
import ProfileScreen from './screens/ProfileScreen.jsx'
import CatalogScreen from './screens/CatalogScreen.jsx'
import ScanScreen from './screens/ScanScreen.jsx'
import ProductScreen from './screens/ProductScreen.jsx'
import ExternalProductScreen from './screens/ExternalProductScreen.jsx'
import AlternativesScreen from './screens/AlternativesScreen.jsx'
import AIScreen from './screens/AIScreen.jsx'
import AIAssistantScreen from './screens/AIAssistantScreen.jsx'
import QRPrintScreen from './screens/QRPrintScreen.jsx'
import BottomNav from './components/BottomNav.jsx'
import OnboardingScreen from './screens/OnboardingScreen.jsx'

export default function App() {
  const { pathname } = useLocation()
  const hideNav = pathname === '/qr-print'
  const [showOnboarding, setShowOnboarding] = useState(
    !localStorage.getItem('korset_onboarding_done') || !localStorage.getItem('korset_lang')
  )

  return (
    <div className="app-frame">
      {showOnboarding && <OnboardingScreen onDone={() => setShowOnboarding(false)} />}
      <Routes>
        <Route path="/"                         element={<HomeScreen />} />
        <Route path="/profile"                  element={<ProfileScreen />} />
        <Route path="/catalog"                  element={<CatalogScreen />} />
        <Route path="/scan"                     element={<ScanScreen />} />
        <Route path="/ai"                       element={<AIAssistantScreen />} />
        <Route path="/qr-print"                 element={<QRPrintScreen />} />
        <Route path="/product/ext/:ean"         element={<ExternalProductScreen />} />
        <Route path="/product/ext/:ean/ai"      element={<AIScreen />} />
        <Route path="/product/:id"              element={<ProductScreen />} />
        <Route path="/product/:id/alternatives" element={<AlternativesScreen />} />
        <Route path="/product/:id/ai"           element={<AIScreen />} />
        <Route path="*"                         element={<Navigate to="/" replace />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </div>
  )
}
