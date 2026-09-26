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
  scanCount,
  preferencesCount,
  topFavorites,
  topHistory,
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

  const handleShareList = async () => {
    if (!topFavorites || topFavorites.length === 0) return
    const storeName = currentStore?.name || 'Körset'
    const itemsText = topFavorites
      .map((p, idx) => {
        const name = p.nameRu || p.name || `Товар ${p.ean || ''}`
        const priceStr = p.priceKzt ? ` — ${p.priceKzt.toLocaleString('ru-RU')} ₸` : ''
        return `${idx + 1}. ${name}${priceStr}`
      })
      .join('\n')
    const pricedProducts = topFavorites.filter(
      (p) => p && typeof p.priceKzt === 'number' && p.priceKzt > 0
    )
    const totalSum = pricedProducts.reduce((sum, p) => sum + p.priceKzt, 0)
    const totalStr = totalSum > 0 ? `\n\nИтого: ~${totalSum.toLocaleString('ru-RU')} ₸` : ''
    const shareText = `🛒 Список покупок (${storeName}):\n${itemsText}${totalStr}\n\nСоставлено в Körset`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Список покупок (${storeName})`,
          text: shareText,
        })
        return
      } catch (err) {
        if (err.name === 'AbortError') return
      }
    }
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
    window.open(whatsappUrl, '_blank')
  }

  const tabs = [
    {
      id: 'favorites',
      tone: 'favorites',
      value: favoritesCount,
      label: t('profile.favorites'),
      iconBg: 'rgba(245,158,11,0.18)',
      iconBorder: 'rgba(251,191,36,0.55)',
      iconShadow: '0 4px 22px rgba(245,158,11,0.36)',
      icon: (
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 22,
            color: '#F59E0B',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden="true"
        >
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
      if (loadingTab === 'favorites' && topFavorites === null) {
        return <TabSpinner text={t('profile.favoritesLoading') || t('common.loading')} />
      }
      if (topFavorites && topFavorites.length > 0) {
        const pricedProducts = topFavorites.filter(
          (p) => p && typeof p.priceKzt === 'number' && p.priceKzt > 0
        )
        const totalSum = pricedProducts.reduce((sum, p) => sum + p.priceKzt, 0)
        const displayItems = topFavorites.slice(0, 6)

        return (
          <>
            <div className="stats-tabs__store-bar">
              <div className="stats-tabs__store-info">
                <span className="stats-tabs__store-pin" aria-hidden="true">📍</span>
                <span className="stats-tabs__store-name">
                  {currentStore?.name || t('profile.inStore') || 'В магазине'}
                </span>
                <span className="stats-tabs__store-status">
                  <span className="stats-tabs__store-dot" />
                  {t('profile.storePricesLive') || 'Цены актуальны'}
                </span>
              </div>
              <button
                type="button"
                className="stats-tabs__share-btn"
                onClick={handleShareList}
                aria-label={t('profile.shareList') || 'Поделиться'}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>{t('profile.shareList') || 'Поделиться'}</span>
              </button>
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
                  {t('profile.totalInStore') || 'Итого в магазине:'}
                </span>
                <span className="stats-tabs__footer-total-sum">
                  {totalSum > 0
                    ? `~${totalSum.toLocaleString('ru-RU')} ₸`
                    : `${favoritesCount || topFavorites.length} тов.`}
                </span>
              </div>
              <button
                type="button"
                className="stats-tabs__footer-view-all"
                onClick={onViewAllFavorites}
              >
                <span>{t('profile.viewAll') || 'Посмотреть все'}</span>
                {favoritesCount > 0 && (
                  <span className="stats-tabs__footer-count">({favoritesCount})</span>
                )}
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
                {scanCount > 0 && (
                  <span className="stats-tabs__footer-count">({scanCount})</span>
                )}
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

function CraftPaperBagIllustration() {
  return (
    <div className="craft-bag-scene" aria-hidden="true">
      <div className="craft-bag-floating">
        <svg
          width="96"
          height="96"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="craft-bag-svg"
        >
          <defs>
            <linearGradient id="craftGrad" x1="20" y1="35" x2="100" y2="105" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            <linearGradient id="craftSideGrad" x1="24" y1="40" x2="45" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>
            <linearGradient id="leafGrad" x1="65" y1="15" x2="90" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="cordGrad" x1="40" y1="12" x2="80" y2="35" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>

          {/* Sparkles */}
          <path
            d="M22 28L24 22L30 20L24 18L22 12L20 18L14 20L20 22L22 28Z"
            fill="#FBBF24"
            className="craft-bag-sparkle craft-bag-sparkle--1"
          />
          <path
            d="M102 42L103.5 37.5L108 36L103.5 34.5L102 30L100.5 34.5L96 36L100.5 37.5L102 42Z"
            fill="#FCD34D"
            className="craft-bag-sparkle craft-bag-sparkle--2"
          />

          {/* Green Eco Leaf */}
          <path
            d="M68 36C68 36 67 18 84 16C87 28 78 37 70 38"
            fill="url(#leafGrad)"
          />
          <path
            d="M69 35C74 27 81 22 84 16"
            stroke="#A7F3D0"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Back Handle */}
          <path
            d="M48 42V25C48 18 53 14 60 14C67 14 72 18 72 25V42"
            stroke="url(#cordGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Bag Body */}
          <path
            d="M28 42L34 102C34.5 105.5 37.5 108 41 108H79C82.5 108 85.5 105.5 86 102L92 42H28Z"
            fill="url(#craftGrad)"
          />

          {/* Bag Side Fold */}
          <path
            d="M28 42L34 102C34.5 105.5 37.5 108 41 108L47 108L41 42H28Z"
            fill="url(#craftSideGrad)"
            opacity="0.45"
          />

          {/* Folded Top Rim */}
          <path
            d="M26 40C26 38.5 27 37 28.5 37H91.5C93 37 94 38.5 94 40L92 44C91.5 45 90.5 45.5 89.5 45.5H30.5C29.5 45.5 28.5 45 28 44L26 40Z"
            fill="#FBBF24"
          />
          <path
            d="M28.5 37H91.5"
            stroke="#D97706"
            strokeWidth="1.5"
          />

          {/* Front Handle */}
          <path
            d="M44 45V27C44 20 49 16 56 16C63 16 68 20 68 27V45"
            stroke="url(#cordGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <rect x="41.5" y="43" width="5" height="7" rx="1.5" fill="#B45309" />
          <rect x="65.5" y="43" width="5" height="7" rx="1.5" fill="#B45309" />

          {/* Small Check Badge */}
          <circle cx="60" cy="74" r="9" fill="rgba(255, 255, 255, 0.22)" />
          <path
            d="M56 74L58.5 76.5L64 71"
            stroke="#FFFBEB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="craft-bag-shadow" />
    </div>
  )
}

function ShoppingListEmptyState({ title, hint, onOpenCatalog, t }) {
  return (
    <div className="stats-tabs__empty stats-tabs__empty--craft">
      <CraftPaperBagIllustration />
      <div className="stats-tabs__empty-title">{title}</div>
      <div className="stats-tabs__empty-hint">{hint}</div>
      <button
        type="button"
        className="stats-tabs__empty-catalog-btn"
        onClick={onOpenCatalog}
      >
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
