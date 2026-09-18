import { useOffline } from '../contexts/OfflineContext.jsx'
import { useI18n } from '../i18n/index.js'
import { getOfflineBannerModel } from '../domain/offline/offlineStatus.js'
import './OfflineBanner.css'

export default function OfflineBanner() {
  const { isOnline, justRestored, cacheAge, cacheStale, isChecking, checkConnection } = useOffline()
  const { t } = useI18n()

  const model = getOfflineBannerModel({
    isOnline,
    justRestored,
    cacheAge,
    cacheStale,
    t,
  })

  if (!model.type) return null

  if (model.type === 'restored') {
    return (
      <div className="offline-banner offline-banner-restored" role="status" aria-live="polite">
        <span className="offline-banner-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <span className="offline-banner-text">{model.message}</span>
      </div>
    )
  }

  return (
    <div className="offline-banner offline-banner-warning" role="status" aria-live="polite">
      <span className="offline-banner-icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          width="15"
          height="15"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </span>
      <span className="offline-banner-text">{model.message}</span>
      <button
        type="button"
        className="offline-banner-retry"
        onClick={() => checkConnection()}
        disabled={isChecking}
        aria-label={t('scan.offlineRetry')}
      >
        {isChecking ? t('scan.offlineChecking') : t('scan.offlineRetry')}
      </button>
    </div>
  )
}
