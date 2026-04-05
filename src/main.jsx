import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

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
  syncViewportVars()
  window.addEventListener('resize', syncViewportVars, { passive: true })
  window.addEventListener('orientationchange', syncViewportVars, { passive: true })
  window.addEventListener('pageshow', syncViewportVars, { passive: true })
  window.visualViewport?.addEventListener('resize', syncViewportVars, { passive: true })

  const touchCapable = window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window
  document.documentElement.classList.toggle('touch-ui', !!touchCapable)
  document.documentElement.classList.toggle('fine-pointer-ui', !touchCapable)
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed', error)
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
