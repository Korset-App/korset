import { useOffline } from '../contexts/OfflineContext.jsx'
import { useI18n } from '../i18n/index.js'

export default function OfflineBanner() {
  const { isOnline, cacheStale, formatCacheAge } = useOffline()
  const { t } = useI18n()

  if (isOnline) return null

  const label = cacheStale
    ? `${t('scan.offlineBannerStale')} ${formatCacheAge() || t('scan.longAgo')}.`
    : `${t('scan.offlineBanner')}${formatCacheAge() ? ` (${formatCacheAge()})` : ''}.`

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        background: 'rgba(251, 191, 36, 0.92)',
        color: '#000',
        textAlign: 'center',
        padding: '5px 12px',
        fontSize: '12px',
        fontWeight: 500,
        fontFamily: 'var(--font-body)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        letterSpacing: '0.01em',
      }}
    >
      {label}
    </div>
  )
}
