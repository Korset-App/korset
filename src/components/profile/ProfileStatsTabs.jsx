import { useNavigate } from 'react-router-dom'
import { useStore } from '../../contexts/StoreContext.jsx'
import ProductMiniCard from '../ProductMiniCard.jsx'
import './ProfileStatsTabs.css'

/**
 * Tabbed stats block for the profile screen.
 *
 * THREE separate visual blocks per the mock-ups:
 *   1. Row of three pressable cards (Favorites / Preferences / History).
 *   2. Visible gap (~12px).
 *   3. Single expandable panel beneath, rounded all four corners, content
 *      morphs based on the active tab.
 */
export default function ProfileStatsTabs({
  activeTab,
  onTabChange,
  favoritesCount,
  favoriteSummary,
  scanCount,
  preferencesCount,
  topFavorites,
  favoritesLoadError,
  onRetryFavorites,
  topHistory,
  historyLoadError,
  onRetryHistory,
  loadingTab,
  preferencesContent,
  onViewAllFavorites,
  onViewAllHistory,
  onAuthPrompt,
  onRemoveFavorite,
  t,
  isGuest,
}) {
  const { currentStore } = useStore()
  const navigate = useNavigate()
  const toggleTab = (tab) => onTabChange(activeTab === tab ? null : tab)

  const handleOpenCatalog = () => {
    navigate(currentStore?.slug ? `/s/${currentStore.slug}/catalog` : '/catalog')
  }

  const tabs = [
    {
      id: 'favorites',
      tone: 'favorites',
      value: favoritesLoadError ? '—' : favoritesCount,
      label: t('profile.favorites'),
      iconBg: 'rgba(245,158,11,0.18)',
      iconBorder: 'rgba(251,191,36,0.55)',
      iconShadow: '0 4px 22px rgba(245,158,11,0.36)',
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--warning)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4.5 8.5h15l-1 12h-13l-1-12ZM8.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" />
          <path d="m9.5 14.5 1.8 1.8 3.5-3.6" />
        </svg>
      ),
    },
    {
      id: 'preferences',
      tone: 'preferences',
      value: preferencesCount,
      label: t('profile.preferencesTitle'),
      iconBg: 'rgba(124,58,237,0.18)',
      iconBorder: 'rgba(167,139,250,0.55)',
      iconShadow: '0 4px 22px rgba(124,58,237,0.36)',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#A78BFA"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      ),
    },
    {
      id: 'history',
      tone: 'history',
      value: scanCount,
      label: t('profile.scans'),
      iconBg: 'rgba(16,185,129,0.18)',
      iconBorder: 'rgba(52,211,153,0.55)',
      iconShadow: '0 4px 22px rgba(16,185,129,0.32)',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#34D399"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 8v4l2.5 2.5" />
          <path d="M5.6 5.6 4.34 6.87l2.54.01M4.32 4.33l.02 2.54M3 12a9 9 0 0 0 13.5 7.79M19.8 16.5A9 9 0 0 0 5.67 5.6" />
        </svg>
      ),
    },
  ]

  const renderTabBody = () => {
    if (activeTab === 'preferences') return preferencesContent

    if (activeTab === 'favorites') {
      if (favoritesLoadError) {
        return (
          <div className="stats-tabs__load-error" role="alert">
            <span>{t('shopping.loadFailed')}</span>
            <button type="button" onClick={onRetryFavorites}>
              {t('shopping.retry')}
            </button>
          </div>
        )
      }
      if (loadingTab === 'favorites' && topFavorites === null) {
        return <TabSpinner text={t('profile.favoritesLoading') || t('common.loading')} />
      }
      if (topFavorites && topFavorites.length > 0) {
        const displayItems = topFavorites.slice(0, 6)

        return (
          <>
            <div className="stats-tabs__store-bar">
              <div className="stats-tabs__store-info">
                <span className="stats-tabs__store-name">
                  {currentStore?.name || t('profile.inStore') || 'В магазине'}
                </span>
              </div>
            </div>

            <div className="stats-tabs__grid">
              {displayItems.map((p) => (
                <ProductMiniCard
                  key={p.ean || p.id}
                  product={p}
                  onRemove={onRemoveFavorite ? () => onRemoveFavorite(p) : undefined}
                />
              ))}
            </div>

            <div className="stats-tabs__footer-bar">
              <div className="stats-tabs__footer-total">
                <span className="stats-tabs__footer-total-label">
                  {favoriteSummary?.missingPriceCount
                    ? t('shopping.partialTotal')
                    : t('shopping.total')}
                </span>
                <span className="stats-tabs__footer-total-sum">
                  {favoriteSummary?.pricedCount > 0
                    ? `${favoriteSummary.knownSubtotalKzt.toLocaleString('ru-RU')} ₸`
                    : t('shopping.priceUnknown')}
                </span>
              </div>
              <button
                type="button"
                className="stats-tabs__footer-view-all"
                onClick={onViewAllFavorites}
              >
                <span>{t('profile.viewAll') || 'Посмотреть все'}</span>
                <ChevronRightIcon />
              </button>
            </div>
          </>
        )
      }
      return (
        <ShoppingListEmptyState
          title={t('profile.favoritesEmpty')}
          hint={t('profile.favoritesEmptyHint')}
          onOpenCatalog={handleOpenCatalog}
          t={t}
        />
      )
    }

    if (activeTab === 'history') {
      if (historyLoadError) {
        return (
          <div className="stats-tabs__load-error" role="alert">
            <span>{t('history.loadFailed')}</span>
            <button type="button" onClick={onRetryHistory}>
              {t('shopping.retry')}
            </button>
          </div>
        )
      }
      if (loadingTab === 'history' && topHistory === null) {
        return <TabSpinner text={t('profile.historyLoading') || t('common.loading')} />
      }
      if (topHistory && topHistory.length > 0) {
        const displayItems = topHistory.slice(0, 6)

        return (
          <>
            <div className="stats-tabs__grid">
              {displayItems.map((p) => (
                <ProductMiniCard key={`${p.ean || p.id}-${p.scanDate || ''}`} product={p} />
              ))}
            </div>
            <div className="stats-tabs__footer-bar" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="stats-tabs__footer-view-all"
                onClick={onViewAllHistory}
              >
                <span>{t('profile.viewAll') || 'Вся история'}</span>
                <ChevronRightIcon />
              </button>
            </div>
          </>
        )
      }
      return (
        <TabEmptyState
          tone="history"
          title={isGuest ? t('profile.historyEmptyGuest') : t('profile.historyEmpty')}
          hint={isGuest ? t('profile.historyEmptyGuestHint') : t('profile.historyEmptyHint')}
          onClick={isGuest ? onAuthPrompt : undefined}
        />
      )
    }

    return null
  }

  const tone = activeTab || 'none'

  return (
    <div className={`stats-tabs ${activeTab ? `stats-tabs--open tone-${activeTab}` : ''}`}>
      {/* Row of three cards. Each is a fully rounded button with its own
          subtle border. The active card lights up via tone-coloured border
          + a faint background tint (per the mock-ups). */}
      <div className="stats-tabs__row">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className={`stat-card ${isActive ? `is-active is-${tab.tone}` : ''}`}
              onClick={() => toggleTab(tab.id)}
              aria-expanded={isActive}
              aria-controls="profile-stats-panel"
            >
              <span
                className="stat-card__icon-wrap"
                style={{
                  background: tab.iconBg,
                  borderColor: tab.iconBorder,
                  boxShadow: tab.iconShadow,
                }}
              >
                {tab.icon}
              </span>
              <span className="stat-card__value">{tab.value}</span>
              <span className="stat-card__label">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/*
        Expandable panel.

        Why a plain <div> instead of motion.div with height:'auto'?
        Because that combo collapses to height=0 in Firefox on initial
        render and on tab switching for some users — the exact symptom
        reported ("в Firefox нет блоков, иногда даже избранного нет").
        We use a CSS grid-template-rows transition (0fr ↔ 1fr) which is
        rock-solid across all engines.

        We always render the inner panel even when no tab is active so the
        CSS transition can animate from a real DOM tree (transitioning
        from `display: none` doesn't animate). The panel is hidden via
        grid-rows + opacity in `.stats-tabs__panel-wrap` below.
      */}
      <div
        id="profile-stats-panel"
        className={`stats-tabs__panel-wrap ${activeTab ? 'is-open' : 'is-closed'}`}
        aria-hidden={!activeTab}
      >
        <div className="stats-tabs__panel-clip">
          <div className={`stats-tabs__panel tone-${tone}`}>
            {/*
              Key on activeTab so a fresh element mounts whenever the tab
              changes. CSS animation `panel-content-enter` plays once on
              mount → smooth fade-in without framer-motion's
              AnimatePresence (which had compat issues in Firefox).
            */}
            {activeTab ? (
              <div key={activeTab} className="stats-tabs__panel-content">
                {renderTabBody()}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

const TONE_STYLES = {
  favorites: {
    bg: 'rgba(245,158,11,0.18)',
    border: 'rgba(251,191,36,0.45)',
    color: '#F59E0B',
    icon: (
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 6h11M9 12h11M9 18h11" />
        <polyline points="4 6 5.5 7.5 7.5 4.5" />
        <polyline points="4 12 5.5 13.5 7.5 10.5" />
        <polyline points="4 18 5.5 19.5 7.5 16.5" />
      </svg>
    ),
  },
  history: {
    bg: 'rgba(16,185,129,0.18)',
    border: 'rgba(52,211,153,0.45)',
    color: '#34D399',
    icon: (
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#34D399"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 8v4l2.5 2.5" />
        <path d="M5.6 5.6 4.34 6.87l2.54.01M4.32 4.33l.02 2.54M3 12a9 9 0 0 0 13.5 7.79M19.8 16.5A9 9 0 0 0 5.67 5.6" />
      </svg>
    ),
  },
}

function ShoppingListEmptyIllustration() {
  return (
    <div className="stats-tabs__empty-mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="14" width="30" height="25" rx="5" />
        <path d="M17 17V11a7 7 0 0 1 14 0v6M18 27h12M24 21v12" />
      </svg>
    </div>
  )
}
function ShoppingListEmptyState({ title, hint, onOpenCatalog, t }) {
  return (
    <div className="stats-tabs__empty stats-tabs__empty--craft">
      <ShoppingListEmptyIllustration />
      <div className="stats-tabs__empty-title">{title}</div>
      <div className="stats-tabs__empty-hint">{hint}</div>
      <button type="button" className="stats-tabs__empty-catalog-btn" onClick={onOpenCatalog}>
        {t('profile.openCatalogBtn') || 'Открыть каталог →'}
      </button>
    </div>
  )
}

function TabEmptyState({ tone, title, hint, onClick }) {
  const cfg = TONE_STYLES[tone] || TONE_STYLES.history
  return (
    <div
      className="stats-tabs__empty"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? title : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div
        className="stats-tabs__empty-icon"
        style={{
          background: cfg.bg,
          border: `2px solid ${cfg.border}`,
          boxShadow: `0 6px 20px ${cfg.bg}`,
        }}
      >
        {cfg.icon}
      </div>
      <div className="stats-tabs__empty-title">{title}</div>
      <div className="stats-tabs__empty-hint">{hint}</div>
    </div>
  )
}

/**
 * In-tab loading indicator. Uses a rotating arc (CSS-driven so it's smooth
 * even when the main thread is busy hydrating product rows) and a short
 * localized label so users immediately understand the panel is working.
 * The arc colour is inherited from the parent panel's `--tone-color-strong`,
 * so it always matches the active tab.
 */
function TabSpinner({ text }) {
  return (
    <div className="stats-tabs__spinner" role="status" aria-live="polite">
      <svg viewBox="0 0 50 50" aria-hidden="true">
        <circle cx="25" cy="25" r="20" />
      </svg>
      <span className="stats-tabs__spinner-text">{text}</span>
    </div>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}
