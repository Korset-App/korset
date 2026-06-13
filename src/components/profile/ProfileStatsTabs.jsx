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
 *
 * Notable cross-browser concerns (and how we handle them):
 *
 * - FRAMER-MOTION + height:'auto' has a long-standing Firefox bug where
 *   the wrapper occasionally collapses to height=0 on first render, hiding
 *   tab content entirely (this is exactly what you observed). We avoid it
 *   by using a CSS grid-template-rows transition (`0fr ↔ 1fr`) which works
 *   identically in Chromium, Firefox, WebKit, and the iOS WebView.
 * - AnimatePresence with mode="popLayout" requires layout measurements that
 *   sometimes fail in Firefox under certain transform parents. We use a
 *   plain key-based crossfade with regular CSS animation here.
 * - backdrop-filter: blur() has a graceful fallback applied via @supports
 *   in the .css file; older Firefox falls back to a slightly more opaque
 *   solid background so the cards remain readable.
 *
 * Accepts pre-rendered `preferencesContent` so the parent owns its complex
 * Diet/Allergens form state.
 */
export default function ProfileStatsTabs({
  activeTab,
  onTabChange,
  favoritesCount,
  scanCount,
  preferencesCount,
  topFavorites,
  topHistory,
  loadingTab,
  preferencesContent,
  onViewAllFavorites,
  onViewAllHistory,
  onAuthPrompt,
  t,
  isGuest,
}) {
  const toggleTab = (tab) => onTabChange(activeTab === tab ? null : tab)

  const tabs = [
    {
      id: 'favorites',
      tone: 'favorites',
      value: favoritesCount,
      label: t('profile.favorites'),
      iconBg: 'var(--glass-muted)',
      iconBorder: 'var(--glass-border)',
      iconShadow: '0 4px 22px rgba(0,0,0,0.1)',
      icon: (
        <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--text)' }}>
          checklist
        </span>
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
          width="22"
          height="22"
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
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#34D399"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 8V6a2 2 0 012-2h2" />
          <path d="M16 4h2a2 2 0 012 2v2" />
          <path d="M20 16v2a2 2 0 01-2 2h-2" />
          <path d="M8 20H6a2 2 0 01-2-2v-2" />
          <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2.5" />
        </svg>
      ),
    },
  ]

  const renderTabBody = () => {
    if (activeTab === 'preferences') return preferencesContent

    if (activeTab === 'favorites') {
      if (loadingTab === 'favorites' && topFavorites === null) {
        return <TabSpinner text={t('profile.favoritesLoading') || t('common.loading')} />
      }
      if (topFavorites && topFavorites.length > 0) {
        return (
          <>
            <div className="stats-tabs__grid">
              {topFavorites.map((p) => (
                <ProductMiniCard key={p.ean || p.id} product={p} />
              ))}
            </div>
            {favoritesCount > topFavorites.length && (
              <button type="button" className="stats-tabs__view-all" onClick={onViewAllFavorites}>
                {t('profile.viewAll')}
                <ChevronRightIcon />
              </button>
            )}
          </>
        )
      }
      return (
        <TabEmptyState
          tone="favorites"
          title={isGuest ? t('profile.favoritesEmptyGuest') : t('profile.favoritesEmpty')}
          hint={isGuest ? t('profile.favoritesEmptyGuestHint') : t('profile.favoritesEmptyHint')}
          onClick={isGuest ? onAuthPrompt : undefined}
        />
      )
    }

    if (activeTab === 'history') {
      if (loadingTab === 'history' && topHistory === null) {
        return <TabSpinner text={t('profile.historyLoading') || t('common.loading')} />
      }
      if (topHistory && topHistory.length > 0) {
        return (
          <>
            <div className="stats-tabs__grid">
              {topHistory.map((p) => (
                <ProductMiniCard key={`${p.ean || p.id}-${p.scanDate || ''}`} product={p} />
              ))}
            </div>
            {scanCount > topHistory.length && (
              <button type="button" className="stats-tabs__view-all" onClick={onViewAllHistory}>
                {t('profile.viewAll')}
                <ChevronRightIcon />
              </button>
            )}
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
    bg: 'var(--glass-muted)',
    border: 'var(--glass-border)',
    color: 'var(--text)',
    icon: (
      <span className="material-symbols-outlined" style={{ fontSize: 26, color: 'var(--text)' }}>
        checklist
      </span>
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
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 8V6a2 2 0 012-2h2" />
        <path d="M16 4h2a2 2 0 012 2v2" />
        <path d="M20 16v2a2 2 0 01-2 2h-2" />
        <path d="M8 20H6a2 2 0 01-2-2v-2" />
        <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2.5" />
      </svg>
    ),
  },
}

function TabEmptyState({ tone, title, hint, onClick }) {
  const cfg = TONE_STYLES[tone] || TONE_STYLES.favorites
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
