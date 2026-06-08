import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import BottomNav from './components/BottomNav.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'
import RouteLoader from './components/RouteLoader.jsx'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { ProfileProvider } from './contexts/ProfileContext.jsx'
import { StoreProvider } from './contexts/StoreContext.jsx'
import { OfflineProvider, useOffline } from './contexts/OfflineContext.jsx'

const HomeScreen = lazy(() => import('./screens/HomeScreen.jsx'))
const ProfileScreen = lazy(() => import('./screens/ProfileScreen.jsx'))
const ProfileEditScreen = lazy(() => import('./screens/ProfileEditScreen.jsx'))
const AccountScreen = lazy(() => import('./screens/AccountScreen.jsx'))
const CatalogScreen = lazy(() => import('./screens/CatalogScreen.jsx'))
const ScanScreen = lazy(() => import('./screens/ScanScreen.jsx'))
const ProductScreen = lazy(() => import('./screens/ProductScreen.jsx'))
const ProductCompositionScreen = lazy(() => import('./screens/ProductCompositionScreen.jsx'))
const AlternativesScreen = lazy(() => import('./screens/AlternativesScreen.jsx'))
const AIScreen = lazy(() => import('./screens/AIScreen.jsx'))
const AIAssistantScreen = lazy(() => import('./screens/AIAssistantScreen.jsx'))
const QRPrintScreen = lazy(() => import('./screens/QRPrintScreen.jsx'))
const StoresScreen = lazy(() => import('./screens/StoresScreen.jsx'))
const StorePublicScreen = lazy(() => import('./screens/StorePublicScreen.jsx'))
const AuthScreen = lazy(() => import('./screens/AuthScreen.jsx'))
const UpdatePasswordScreen = lazy(() => import('./screens/UpdatePasswordScreen.jsx'))
const SetupProfileScreen = lazy(() => import('./screens/SetupProfileScreen.jsx'))
const HistoryScreen = lazy(() => import('./screens/HistoryScreen.jsx'))
const PrivacySettingsScreen = lazy(() => import('./screens/PrivacySettingsScreen.jsx'))
const PrivacyPolicyScreen = lazy(() => import('./screens/PrivacyPolicyScreen.jsx'))
const SoundSettingsScreen = lazy(() => import('./screens/SoundSettingsScreen.jsx'))
const FaqScreen = lazy(() => import('./screens/FaqScreen.jsx'))
const AboutScreen = lazy(() => import('./screens/AboutScreen.jsx'))
const TermsScreen = lazy(() => import('./screens/TermsScreen.jsx'))
const RetailLayout = lazy(() => import('./layouts/RetailLayout.jsx'))
const RetailDashboardScreen = lazy(() => import('./screens/RetailDashboardScreen.jsx'))
const RetailEntryScreen = lazy(() => import('./screens/RetailEntryScreen.jsx'))
const RetailProductsScreen = lazy(() => import('./screens/RetailProductsScreen.jsx'))
const RetailImportScreen = lazy(() => import('./screens/RetailImportScreen.jsx'))
const RetailSettingsScreen = lazy(() => import('./screens/RetailSettingsScreen.jsx'))
const EanRecoveryScreen = lazy(() => import('./screens/EanRecoveryScreen.jsx'))
const CompareScreen = lazy(() => import('./screens/CompareScreen.jsx'))
const ProductMockScreen = lazy(() => import('./screens/_mock/ProductMockScreen.jsx'))

function AppInner() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { refreshPendingCount } = useOffline()

  const hideNav =
    pathname === '/' ||
    pathname === '/stores' ||
    pathname === '/qr-print' ||
    pathname === '/auth' ||
    pathname === '/setup-profile' ||
    pathname.startsWith('/retail') ||
    pathname.startsWith('/_mock')
  useEffect(() => {
    if (!user) return
    if (new URLSearchParams(window.location.search).has('dev')) return
    const meta = user.user_metadata || {}
    const hasSetup = meta.profile_setup_done === true
    if (!hasSetup && pathname !== '/setup-profile' && !pathname.startsWith('/retail')) {
      navigate('/setup-profile', { replace: true })
    }
  }, [user, pathname, navigate])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event) => {
        if (event.data?.type === 'FLUSH_PENDING_SCANS') {
          import('./utils/offlineDB.js').then(({ flushPendingScans }) => {
            import('./utils/supabase.js').then(({ supabase }) => {
              flushPendingScans(supabase).then(() => refreshPendingCount())
            })
          })
        }
      }
      navigator.serviceWorker.addEventListener('message', handleMessage)
      return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [refreshPendingCount])

  return (
    <div className="app-frame">
      <OfflineBanner />
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/stores" element={<StoresScreen />} />
          <Route path="/stores/:storeSlug" element={<StorePublicScreen />} />
          <Route path="/s/:storeSlug" element={<HomeScreen />} />
          <Route path="/s/:storeSlug/catalog" element={<CatalogScreen />} />
          <Route path="/s/:storeSlug/scan" element={<ScanScreen />} />
          <Route path="/s/:storeSlug/ai" element={<AIAssistantScreen />} />
          <Route path="/s/:storeSlug/history" element={<HistoryScreen />} />
          <Route path="/s/:storeSlug/profile" element={<ProfileScreen />} />
          <Route path="/s/:storeSlug/profile/edit" element={<ProfileEditScreen />} />
          <Route path="/s/:storeSlug/account" element={<AccountScreen />} />
          <Route path="/s/:storeSlug/privacy" element={<PrivacySettingsScreen />} />
          <Route path="/s/:storeSlug/sound-settings" element={<SoundSettingsScreen />} />
          <Route path="/s/:storeSlug/faq" element={<FaqScreen />} />
          <Route path="/s/:storeSlug/about" element={<AboutScreen />} />
          <Route path="/s/:storeSlug/terms" element={<TermsScreen />} />
          <Route path="/s/:storeSlug/product/:ean" element={<ProductScreen />} />
          <Route
            path="/s/:storeSlug/product/:ean/composition"
            element={<ProductCompositionScreen />}
          />
          <Route path="/s/:storeSlug/product/:ean/alternatives" element={<AlternativesScreen />} />
          <Route path="/s/:storeSlug/product/:ean/ai" element={<AIScreen />} />
          <Route path="/s/:storeSlug/product/:ean/compare/:ean2" element={<CompareScreen />} />

          <Route path="/auth" element={<AuthScreen />} />
          <Route path="/update-password" element={<UpdatePasswordScreen />} />
          <Route path="/setup-profile" element={<SetupProfileScreen />} />
          <Route path="/qr-print" element={<QRPrintScreen />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyScreen />} />

          {/* Mock screens (dev preview, not in production nav) */}
          <Route path="/_mock/product" element={<ProductMockScreen />} />

          {/* Retail Cabinet Entry — finds store by owner_id */}
          <Route path="/retail" element={<RetailEntryScreen />} />

          {/* Retail Cabinet B2B Routes */}
          <Route path="/retail/:storeSlug" element={<RetailLayout />}>
            <Route path="dashboard" element={<RetailDashboardScreen />} />
            <Route path="products" element={<RetailProductsScreen />} />
            <Route path="import" element={<RetailImportScreen />} />
            <Route path="ean-recovery" element={<EanRecoveryScreen />} />
            <Route path="settings" element={<RetailSettingsScreen />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Legacy Global Routes -> Redirect to Store Selection */}
          <Route path="/profile" element={<Navigate to="/stores" replace />} />
          <Route path="/account" element={<Navigate to="/stores" replace />} />
          <Route path="/catalog" element={<Navigate to="/stores" replace />} />
          <Route path="/scan" element={<Navigate to="/stores" replace />} />
          <Route path="/ai" element={<Navigate to="/stores" replace />} />
          <Route path="/history" element={<Navigate to="/stores" replace />} />
          <Route path="/notifications" element={<Navigate to="/stores" replace />} />
          <Route path="/privacy" element={<Navigate to="/stores" replace />} />
          <Route path="/product/*" element={<Navigate to="/stores" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {!hideNav && <BottomNav />}
    </div>
  )
}

import { UserDataProvider } from './contexts/UserDataContext.jsx'

export default function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
          <UserDataProvider>
            <OfflineProvider>
              <StoreProvider>
                <ProfileProvider>
                  <AppInner />
                  <SpeedInsights />
                </ProfileProvider>
              </StoreProvider>
            </OfflineProvider>
          </UserDataProvider>
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  )
}
