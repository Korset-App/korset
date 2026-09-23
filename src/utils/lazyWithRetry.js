import { lazy } from 'react'
import { isChunkLoadError, canAutoReloadNow, markAutoReload } from './chunkRecovery.js'

/**
 * Wraps React.lazy() with retry logic and stale chunk recovery.
 * Recovers from deploy-time hashed asset mismatches by reloading once safely.
 */
export function lazyWithRetry(importer, { maxRetries = 2, retryDelayMs = 600 } = {}) {
  return lazy(async () => {
    let attempt = 0
    while (attempt <= maxRetries) {
      try {
        return await importer()
      } catch (error) {
        attempt++
        const isChunkError = isChunkLoadError(error)
        const hasSessionStorage = typeof window !== 'undefined' && window.sessionStorage

        if (
          isChunkError &&
          hasSessionStorage &&
          canAutoReloadNow(window.sessionStorage, Date.now())
        ) {
          markAutoReload(window.sessionStorage, Date.now())
          window.location.reload()
          // Return a pending promise while the window reloads
          return new Promise(() => {})
        }

        if (attempt > maxRetries) {
          throw error
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt))
      }
    }
  })
}
