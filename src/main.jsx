import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import { initializeTheme } from './utils/theme.js'

// Sentry — error monitoring (enabled only in production when VITE_SENTRY_DSN is set).
// DSN is NOT a secret; it is safe to expose in client bundle.
if (import.meta.env.VITE_SENTRY_DSN && import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENV || 'production',
    release:
      import.meta.env.VITE_SENTRY_RELEASE ||
      import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA ||
      'unknown',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, maskAllInputs: false }),
    ],
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    replaysSessionSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAYS_SAMPLE_RATE || '0'),
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Strip user PII from events (emails, auth tokens from URL)
      if (event.request?.url) {
        try {
          const u = new URL(event.request.url)
          if (u.searchParams.has('code')) u.searchParams.delete('code')
          event.request.url = u.toString()
        } catch {
          /* invalid URL — ignore */
        }
      }
      return event
    },
  })
  window.Sentry = Sentry
  console.log('[Sentry] Initialized for production')
} else if (!import.meta.env.PROD) {
  console.log('[Sentry] Skipped (not production build)')
} else {
  console.warn('[Sentry] DSN not configured — add VITE_SENTRY_DSN env var')
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
})

function syncViewportVars() {
  const doc = document.documentElement
  const viewport = window.visualViewport
  const height = viewport?.height || window.innerHeight
  doc.style.setProperty('--app-vh', `${height}px`)
  doc.style.setProperty('--app-safe-top', 'env(safe-area-inset-top, 0px)')
  doc.style.setProperty('--app-safe-bottom', 'env(safe-area-inset-bottom, 0px)')
  doc.style.setProperty('--app-safe-left', 'env(safe-area-inset-left, 0px)')
  doc.style.setProperty('--app-safe-right', 'env(safe-area-inset-right, 0px)')
}

if (typeof window !== 'undefined') {
  initializeTheme()
  syncViewportVars()
  window.addEventListener('resize', syncViewportVars, { passive: true })
  window.addEventListener('orientationchange', syncViewportVars, { passive: true })
  window.addEventListener('pageshow', syncViewportVars, { passive: true })
  window.visualViewport?.addEventListener('resize', syncViewportVars, { passive: true })

  const touchCapable = window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window
  document.documentElement.classList.toggle('touch-ui', !!touchCapable)
  document.documentElement.classList.toggle('fine-pointer-ui', !touchCapable)
}

// Register the PWA service worker in production only, after first paint so it never
// competes with initial rendering.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[SW] registration failed:', err)
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
