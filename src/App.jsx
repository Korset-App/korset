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
import StoresScreen from './screens/StoresScreen.jsx'
import StorePublicScreen from './screens/StorePublicScreen.jsx'
import BottomNav from './components/BottomNav.jsx'
import OnboardingScreen from './screens/OnboardingScreen.jsx'
import AuthScreen from './screens/AuthScreen.jsx'
import SetupProfileScreen from './screens/SetupProfileScreen.jsx'
import HistoryScreen from './screens/HistoryScreen.jsx'
import NotificationSettingsScreen from './screens/NotificationSettingsScreen.jsx'
import PrivacySettingsScreen from './screens/PrivacySettingsScreen.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { ProfileProvider } from './contexts/ProfileContext.jsx'
import { StoreProvider } from './contexts/StoreContext.jsx'

function isPublicShellPath(pathname) {
  if (pathname === '/' || pathname === '/stores' || pathname === '/auth' || pathname === '/setup-profile') return true
  if (/^\/stores\/[^/]+$/.test(pathname)) return true
  return false
}

function AppInner() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const isPublicShell = isPublicShellPath(pathname)
  const hideNav = isPublicShell || pathname === '/qr-print'
  const [showOnboarding, setShowOnboarding] = useState(
    !localStorage.getItem('korset_onboarding_done') || !localStorage.getItem('korset_lang')
  )

  useEffect(() => {
    document.body.dataset.shell = isPublicShell ? 'public' : 'app'
    return () => {
      delete document.body.dataset.shell
    }
  }, [isPublicShell])

  useEffect(() => {
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
        <Route path="/notifications"            element={<NotificationSettingsScreen />} />
        <Route path="/stores"                   element={<StoresScreen />} />
        <Route path="/privacy"                  element={<PrivacySettingsScreen />} />
        <Route path="/stores/:storeSlug"        element={<StorePublicScreen />} />
        <Route path="/s/:storeSlug"             element={<HomeScreen />} />
        <Route path="/s/:storeSlug/catalog"     element={<CatalogScreen />} />
        <Route path="/s/:storeSlug/scan"        element={<ScanScreen />} />
        <Route path="/s/:storeSlug/ai"          element={<AIAssistantScreen />} />
        <Route path="/s/:storeSlug/history"     element={<HistoryScreen />} />
        <Route path="/s/:storeSlug/profile"     element={<ProfileScreen />} />
        <Route path="/s/:storeSlug/notifications" element={<NotificationSettingsScreen />} />
        <Route path="/s/:storeSlug/privacy"    element={<PrivacySettingsScreen />} />
        <Route path="/s/:storeSlug/product/ext/:ean" element={<ExternalProductScreen />} />
        <Route path="/s/:storeSlug/product/ext/:ean/ai" element={<AIScreen />} />
        <Route path="/s/:storeSlug/product/:ean" element={<ProductScreen />} />
        <Route path="/s/:storeSlug/product/:ean/alternatives" element={<AlternativesScreen />} />
        <Route path="/s/:storeSlug/product/:ean/ai" element={<AIScreen />} />

        <Route path="/auth"                     element={<AuthScreen />} />
        <Route path="/setup-profile"            element={<SetupProfileScreen />} />
        <Route path="/qr-print"                 element={<QRPrintScreen />} />
        <Route path="/product/ext/:ean"         element={<ExternalProductScreen />} />
        <Route path="/product/ext/:ean/ai"      element={<AIScreen />} />
        <Route path="/product/:ean"             element={<ProductScreen />} />
        <Route path="/product/:ean/alternatives" element={<AlternativesScreen />} />
        <Route path="/product/:ean/ai"          element={<AIScreen />} />
        <Route path="*"                         element={<Navigate to="/" replace />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </div>
  )
}

import { UserDataProvider } from './contexts/UserDataContext.jsx'

export default function App() {
  return (
    <AuthProvider>
      <UserDataProvider>
        <StoreProvider>
          <ProfileProvider>
            <ErrorBoundary>
              <AppInner />
            </ErrorBoundary>
          </ProfileProvider>
        </StoreProvider>
      </UserDataProvider>
    </AuthProvider>
  )
}
