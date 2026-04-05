import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

const setViewportVars = () => {
  const root = document.documentElement
  const visualHeight = window.visualViewport?.height || window.innerHeight
  const visualWidth = window.visualViewport?.width || window.innerWidth

  root.style.setProperty('--app-height', `${window.innerHeight}px`)
  root.style.setProperty('--app-safe-height', `${visualHeight}px`)
  root.style.setProperty('--viewport-width', `${visualWidth}px`)
}

setViewportVars()
window.addEventListener('resize', setViewportVars, { passive: true })
window.addEventListener('orientationchange', setViewportVars, { passive: true })
window.visualViewport?.addEventListener('resize', setViewportVars, { passive: true })
window.visualViewport?.addEventListener('scroll', setViewportVars, { passive: true })

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
