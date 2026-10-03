import { useState, useEffect, useSyncExternalStore } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import RetailBottomNav from '../components/RetailBottomNav.jsx'
import RetailDesktopSidebar from '../components/retail/RetailDesktopSidebar.jsx'
import RetailDesktopTopbar from '../components/retail/RetailDesktopTopbar.jsx'
import { LockIcon, EyeIcon } from '../components/icons/index.js'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import { buildAuthNavigateState } from '../utils/authFlow.js'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import './retail-tokens.css'
import './RetailShell.css'
import './RetailLayout.css'

const spinnerStyle = {
  width: 32,
  height: 32,
  border: '3px solid var(--rc-line-strong)',
  borderTop: '3px solid var(--rc-accent)',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
}
const spinKeyframes = `@keyframes spin { to { transform: rotate(360deg) } }`

function RetailLoader() {
  return (
    <div
      className="app-frame"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={spinnerStyle} />
      <style>{spinKeyframes}</style>
    </div>
  )
}

function NoAccessScreen({ storeName }) {
  return (
    <div
      className="app-frame"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        gap: 16,
        textAlign: 'center',
      }}
    >
      <LockIcon size={52} color="var(--error-bright)" />
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 800,
          color: 'var(--text)',
        }}
      >
        Нет доступа
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.6, maxWidth: 280 }}>
        Retail Cabinet магазина{' '}
        <b style={{ color: 'var(--primary-bright)' }}>{storeName || 'этого магазина'}</b> доступен
        только его владельцу.
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
        Если вы владелец — обратитесь в поддержку Körset для привязки аккаунта.
      </div>
    </div>
  )
}

function subscribeDesktop(callback) {
  const mql = window.matchMedia('(min-width: 1024px)')
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getDesktopSnapshot() {
  return typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false
}

function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, () => false)
}

export default function RetailLayout() {
  const { user, isAdmin, isSuperadmin, loading: authLoading } = useAuth()
  const location = useLocation()
  const { t } = useI18n()
  const { currentStore, isStoreLoading } = useStore()
  const isDesktop = useIsDesktop()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('korset_retail_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('korset_retail_sidebar_collapsed', String(next))
      } catch {
        /* noop */
      }
      return next
    })
  }

  // Activate desktop unconstrain class on root
  useEffect(() => {
    document.documentElement.classList.add('retail-root-active')
    return () => {
      document.documentElement.classList.remove('retail-root-active')
    }
  }, [])

  if (authLoading || isStoreLoading) return <RetailLoader />

  const isDevPreview = Boolean(
    import.meta.env.DEV &&
    (new URLSearchParams(location.search).has('preview') ||
      new URLSearchParams(location.search).has('dev'))
  )

  const effectiveUser =
    user ||
    (isDevPreview
      ? {
          id: currentStore?.owner_id || 'dev-owner',
          email: 'admin@korset.app',
          user_metadata: { name: 'Управляющий магазином' },
        }
      : null)

  if (!effectiveUser) {
    return (
      <Navigate
        to="/retail/login"
        state={buildAuthNavigateState(location, {
          reason: 'retail_required',
          message: t('retail.authRequiredSub'),
        })}
        replace
      />
    )
  }

  const ownerId = currentStore?.owner_id
  const isOwner = isDevPreview || (ownerId != null && effectiveUser.id === ownerId)
  if (currentStore && !isOwner && !isAdmin && !isSuperadmin) {
    return <NoAccessScreen storeName={currentStore?.name} />
  }

  const isSettings = location.pathname.endsWith('/settings')

  if (isDesktop) {
    return (
      <div className="retail-desktop-shell">
        <RetailDesktopSidebar
          currentStore={currentStore}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
        <div className="retail-desktop-main">
          <RetailDesktopTopbar currentStore={currentStore} />
          <div className="retail-desktop-content">
            <Outlet />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="retail-mobile-shell app-frame" style={{ background: 'var(--retail-bg)' }}>
      {!isSettings && (
        <div className="rc-mhead">
          <div className="rc-mhead__store">
            <div className="rc-avatar">
              <ProfileAvatar
                avatarId={currentStore?.logo_url}
                name={currentStore?.name || 'K'}
                rounded="circle"
              />
            </div>
            <div className="rc-mhead__copy">
              <span className="rc-mhead__name">{currentStore?.name || 'Körset'}</span>
              <span
                className={`rc-status ${currentStore?.is_published === false ? 'rc-status--draft' : ''}`}
              >
                {currentStore?.is_published === false
                  ? t('retail.desktop.storeOffline') || 'Черновик'
                  : t('retail.desktop.storeOnline') || 'В сети'}
              </span>
            </div>
          </div>

          {currentStore?.slug && (
            <a
              href={`/s/${currentStore.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rc-btn"
              title={t('retail.viewStoreFront') || 'Открыть витрину покупателя'}
            >
              <EyeIcon size={15} color="currentColor" />
              <span>{t('retail.viewStoreFrontShort') || 'Витрина'}</span>
            </a>
          )}
        </div>
      )}

      <div className="screen" style={{ paddingBottom: '100px' }}>
        <Outlet />
      </div>

      <RetailBottomNav />
    </div>
  )
}
