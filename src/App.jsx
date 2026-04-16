import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom'
import HomeScreen from './screens/HomeScreen.jsx'
import ProfileScreen from './screens/ProfileScreen.jsx'
import CatalogScreen from './screens/CatalogScreen.jsx'
import ScanScreen from './screens/ScanScreen.jsx'
import ProductScreen from './screens/ProductScreen.jsx'
import ProductDetailsScreen from './screens/ProductDetailsScreen.jsx'
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
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import RetailLayout from './layouts/RetailLayout.jsx'
import RetailDashboardScreen from './screens/RetailDashboardScreen.jsx'
import RetailEntryScreen from './screens/RetailEntryScreen.jsx'
import RetailProductsScreen from './screens/RetailProductsScreen.jsx'
import RetailImportScreen from './screens/RetailImportScreen.jsx'
import RetailSettingsScreen from './screens/RetailSettingsScreen.jsx'
import CompareScreen from './screens/CompareScreen.jsx'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { ProfileProvider } from './contexts/ProfileContext.jsx'
import { StoreProvider, useStore } from './contexts/StoreContext.jsx'

function AppInner() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isStoreApp } = useStore()

  const hideNav =
    pathname === '/' ||
    pathname === '/stores' ||
    pathname === '/qr-print' ||
    pathname === '/auth' ||
    pathname === '/setup-profile' ||
    pathname.startsWith('/retail')
  const [showOnboarding, setShowOnboarding] = useState(
    !localStorage.getItem('korset_onboarding_done') || !localStorage.getItem('korset_lang')
  )

  useEffect(() => {
    // Если пользователь авторизован, но ещё не завершил настройку профиля
    if (user && user.user_metadata?.profile_setup_done !== true) {
      if (pathname !== '/setup-profile' && !pathname.startsWith('/retail')) {
        navigate('/setup-profile', { replace: true })
      }
    }
  }, [user, pathname, navigate])

  const shouldShowOnboarding =
    showOnboarding && isStoreApp && pathname !== '/auth' && pathname !== '/setup-profile'

  return (
    <div className="app-frame">
      {shouldShowOnboarding && <OnboardingScreen onDone={() => setShowOnboarding(false)} />}
      <Routes>
        {/* Premium Product Details Screen — standalone showcase */}
        <Route path="/product-details-demo" element={<ProductDetailsScreen />} />
        <Route path="/" element={<ProductDetailsScreen />} />
        <Route path="/stores" element={<StoresScreen />} />
        <Route path="/stores/:storeSlug" element={<StorePublicScreen />} />
        <Route path="/s/:storeSlug" element={<HomeScreen />} />
        <Route path="/s/:storeSlug/catalog" element={<CatalogScreen />} />
        <Route path="/s/:storeSlug/scan" element={<ScanScreen />} />
        <Route path="/s/:storeSlug/ai" element={<AIAssistantScreen />} />
        <Route path="/s/:storeSlug/history" element={<HistoryScreen />} />
        <Route path="/s/:storeSlug/profile" element={<ProfileScreen />} />
        <Route path="/s/:storeSlug/notifications" element={<NotificationSettingsScreen />} />
        <Route path="/s/:storeSlug/privacy" element={<PrivacySettingsScreen />} />
        <Route path="/s/:storeSlug/product/ext/:ean" element={<ExternalProductScreen />} />
        <Route path="/s/:storeSlug/product/ext/:ean/ai" element={<AIScreen />} />
        <Route path="/s/:storeSlug/product/:ean" element={<ProductScreen />} />
        <Route path="/s/:storeSlug/product/:ean/alternatives" element={<AlternativesScreen />} />
        <Route path="/s/:storeSlug/product/:ean/ai" element={<AIScreen />} />
        <Route path="/s/:storeSlug/product/:ean/compare/:ean2" element={<CompareScreen />} />

        <Route path="/auth" element={<AuthScreen />} />
        <Route path="/setup-profile" element={<SetupProfileScreen />} />
        <Route path="/qr-print" element={<QRPrintScreen />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyScreen />} />

        {/* Retail Cabinet Entry — finds store by owner_id */}
        <Route path="/retail" element={<RetailEntryScreen />} />

        {/* Retail Cabinet B2B Routes */}
        <Route path="/retail/:storeSlug" element={<RetailLayout />}>
          <Route path="dashboard" element={<RetailDashboardScreen />} />
          <Route path="products" element={<RetailProductsScreen />} />
          <Route path="import" element={<RetailImportScreen />} />
          <Route path="settings" element={<RetailSettingsScreen />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Legacy Global Routes -> Redirect to Store Selection */}
        <Route path="/profile" element={<Navigate to="/stores" replace />} />
        <Route path="/catalog" element={<Navigate to="/stores" replace />} />
        <Route path="/scan" element={<Navigate to="/stores" replace />} />
        <Route path="/ai" element={<Navigate to="/stores" replace />} />
        <Route path="/history" element={<Navigate to="/stores" replace />} />
        <Route path="/notifications" element={<Navigate to="/stores" replace />} />
        <Route path="/privacy" element={<Navigate to="/stores" replace />} />
        <Route path="/product/*" element={<Navigate to="/stores" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </div>
  )
}

import { UserDataProvider } from './contexts/UserDataContext.jsx'

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <UserDataProvider>
          <StoreProvider>
            <ProfileProvider>
              <AppInner />
            </ProfileProvider>
          </StoreProvider>
        </UserDataProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
