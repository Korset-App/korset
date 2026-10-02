import { useState, useEffect, useSyncExternalStore } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import RetailBottomNav from '../components/RetailBottomNav.jsx'
import RetailDesktopSidebar from '../components/retail/RetailDesktopSidebar.jsx'
import RetailDesktopTopbar from '../components/retail/RetailDesktopTopbar.jsx'
import { LockIcon, StorefrontIcon, EyeIcon } from '../components/icons/index.js'
import { buildAuthNavigateState } from '../utils/authFlow.js'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import './RetailLayout.css'

const spinnerStyle = {
  width: 32,
  height: 32,
  border: '3px solid rgba(56,189,248,0.15)',
  borderTop: '3px solid var(--retail-accent)',
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
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'var(--retail-header-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--retail-border)',
            padding: '16px 20px',
            paddingTop: 'max(16px, env(safe-area-inset-top))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                fontFamily: 'var(--font-display)',
                color: 'var(--retail-accent)',
                letterSpacing: '-0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <StorefrontIcon size={20} />
              {t('retail.cabinetTitle') || 'Кабинет магазина'}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-sub)',
                marginTop: 2,
                fontFamily: 'var(--font-body)',
              }}
            >
              {currentStore?.name || 'Körset'}
            </div>
          </div>

          {currentStore?.slug && (
            <a
              href={`/s/${currentStore.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              title={t('retail.viewStoreFront') || 'Открыть витрину покупателя'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 10,
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                color: 'var(--retail-accent, #38BDF8)',
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <EyeIcon size={14} />
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
