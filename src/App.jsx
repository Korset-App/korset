import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom'
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
import AuthScreen from './screens/AuthScreen.jsx'
import SetupProfileScreen from './screens/SetupProfileScreen.jsx'
import HistoryScreen from './screens/HistoryScreen.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { ProfileProvider } from './contexts/ProfileContext.jsx'
import { StoreProvider } from './contexts/StoreContext.jsx'

function AppInner() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const hideNav = pathname === '/qr-print' || pathname === '/auth' || pathname === '/setup-profile'
  const [showOnboarding, setShowOnboarding] = useState(
    !localStorage.getItem('korset_onboarding_done') || !localStorage.getItem('korset_lang')
  )

  useEffect(() => {
    // Если пользователь авторизован, но ещё не завершил настройку профиля
    if (user && user.user_metadata?.profile_setup_done !== true) {
      if (pathname !== '/setup-profile') {
        navigate('/setup-profile', { replace: true })
      }
    }
  }, [user, pathname, navigate])

  return (
    <div className="app-frame">
      {showOnboarding && <OnboardingScreen onDone={() => setShowOnboarding(false)} />}
      <Routes>
        <Route path="/"                         element={<HomeScreen />} />
        <Route path="/profile"                  element={<ProfileScreen />} />
        <Route path="/catalog"                  element={<CatalogScreen />} />
        <Route path="/scan"                     element={<ScanScreen />} />
        <Route path="/ai"                       element={<AIAssistantScreen />} />
        <Route path="/history"                  element={<HistoryScreen />} />
        <Route path="/auth"                     element={<AuthScreen />} />
        <Route path="/setup-profile"            element={<SetupProfileScreen />} />
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

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <ProfileProvider>
          <ErrorBoundary>
            <AppInner />
          </ErrorBoundary>
        </ProfileProvider>
      </StoreProvider>
    </AuthProvider>
  )
}
