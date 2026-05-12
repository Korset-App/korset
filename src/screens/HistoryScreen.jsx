import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useUserData } from '../contexts/UserDataContext.jsx'
import { useI18n } from '../i18n/index.js'
import { getLocalName } from '../utils/localName.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { buildProductPath } from '../utils/routes.js'
import { HeartIcon } from '../components/icons/HeartIcon.jsx'
import {
  hydrateProductsFromFavoriteRows,
  hydrateProductsFromScanRows,
} from '../domain/product/resolver.js'
import {
  buildHistoryOwnerKey,
  readLocalScanHistory,
  SCAN_HISTORY_STORAGE_KEY,
} from '../utils/localHistory.js'
import { PRIVACY_EVENT } from '../utils/privacySettings.js'
import { buildAuthNavigateState } from '../utils/authFlow.js'

function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getItemTime(item) {
  const date = toDate(
    item?.scanDate || item?.favDate || item?.scanned_at || item?.scannedAt || item?.added_at
  )
  return date ? date.getTime() : 0
}

function formatDate(value, lang) {
  const date = toDate(value)
  if (!date) return ''
  try {
    return date.toLocaleDateString(lang === 'kz' ? 'kk' : 'ru')
  } catch {
    return date.toLocaleDateString()
  }
}

function withTimeout(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

function mergeHistoryItems(primary = [], secondary = []) {
  const map = new Map()
  for (const item of [...primary, ...secondary]) {
    if (!item?.ean) continue
    const existing = map.get(item.ean)
    if (!existing || getItemTime(item) >= getItemTime(existing)) {
      map.set(item.ean, item)
    }
  }
  return Array.from(map.values()).sort((a, b) => getItemTime(b) - getItemTime(a))
}

export default function HistoryScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, internalUserId } = useAuth()
  const { t, lang } = useI18n()
  const { currentStore } = useStore()
  const { toggleFavorite, favoriteEans } = useUserData()

  const [history, setHistory] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(searchParams.get('tab') || 'history')

  useEffect(() => {
    const nextTab = searchParams.get('tab') || 'history'
    if (nextTab !== tab) setTab(nextTab)
  }, [searchParams, tab])

  useEffect(() => {
    const ownerKey = buildHistoryOwnerKey(user)
    const scopedLocalHistory = readLocalScanHistory(ownerKey)

    if (!user || !internalUserId) {
      setHistory(scopedLocalHistory)
      setFavorites([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function loadData() {
      const [histRes, favRes] = await Promise.allSettled([
        withTimeout(
          supabase
            .from('scan_events')
            .select('ean, global_product_id, scanned_at')
            .eq('user_id', internalUserId)
            .order('scanned_at', { ascending: false })
            .limit(50),
          5000
        ),
        withTimeout(
          supabase
            .from('user_favorites')
            .select('ean, global_product_id, added_at')
            .eq('user_id', internalUserId)
            .order('added_at', { ascending: false }),
          5000
        ),
      ])

      const historyRows =
        histRes.status === 'fulfilled' && !histRes.value?.error ? histRes.value?.data || [] : []
      const favoriteRows =
        favRes.status === 'fulfilled' && !favRes.value?.error
          ? favRes.value?.data || []
          : [...favoriteEans].map((ean) => ({ ean, added_at: null }))

      const [hydratedHistoryRes, hydratedFavoritesRes] = await Promise.allSettled([
        withTimeout(hydrateProductsFromScanRows(historyRows), 5000),
        withTimeout(hydrateProductsFromFavoriteRows(favoriteRows), 5000),
      ])

      if (cancelled) return

      const hydratedHistory =
        hydratedHistoryRes.status === 'fulfilled' ? hydratedHistoryRes.value : []
      const hydratedFavorites =
        hydratedFavoritesRes.status === 'fulfilled'
          ? hydratedFavoritesRes.value
          : favoriteRows.map((row) => ({ ean: row.ean, name: `Товар ${row.ean}` }))

      setHistory(mergeHistoryItems(hydratedHistory, scopedLocalHistory))
      setFavorites(hydratedFavorites)
      setLoading(false)
    }

    loadData().catch((error) => {
      console.error('HistoryScreen loadData failed', error)
      if (!cancelled) {
        setHistory(mergeHistoryItems([], scopedLocalHistory))
        setFavorites([...favoriteEans].map((ean) => ({ ean, name: `Товар ${ean}` })))
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user, internalUserId, favoriteEans])

  useEffect(() => {
    setFavorites((prev) => prev.filter((item) => !item.ean || favoriteEans.has(item.ean)))
  }, [favoriteEans])

  useEffect(() => {
    const syncLocalHistory = () => {
      const scopedLocalHistory = readLocalScanHistory(buildHistoryOwnerKey(user))
      setHistory((prev) => mergeHistoryItems(prev, scopedLocalHistory))
    }

    const handleStorage = (event) => {
      if (!event || event.key === SCAN_HISTORY_STORAGE_KEY) syncLocalHistory()
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('korset:scan_added', syncLocalHistory)
    window.addEventListener(PRIVACY_EVENT, syncLocalHistory)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('korset:scan_added', syncLocalHistory)
      window.removeEventListener(PRIVACY_EVENT, syncLocalHistory)
    }
  }, [user])

  const removeFavorite = async (product, event) => {
    event.stopPropagation()
    if (!user || !internalUserId || !product?.ean) return
    try {
      await toggleFavorite(product)
      setFavorites((prev) => prev.filter((item) => item.ean !== product.ean))
    } catch {
      // Context already logs and rolls back.
    }
  }

  const goToProduct = (product) => {
    if (!product?.ean) return
    navigate(buildProductPath(currentStore?.slug || null, product.ean), {
      state: { product },
    })
  }

  const setActiveTab = (nextTab) => {
    setTab(nextTab)
    setSearchParams(nextTab === 'history' ? {} : { tab: nextTab }, { replace: true })
  }

  const list = useMemo(() => (tab === 'history' ? history : favorites), [tab, history, favorites])

  if (!user) {
    return (
      <div
        className="screen"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-soft-border)',
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(124,58,237,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#A78BFA"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2
          style={{
            fontSize: 20,
            fontFamily: 'var(--font-display)',
            color: 'var(--text)',
            marginBottom: 8,
          }}
        >
          {t('history.authRequiredTitle')}
        </h2>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-dim)',
            marginBottom: 24,
            lineHeight: 1.5,
            fontFamily: 'var(--font-display)',
          }}
        >
          {t('history.authRequiredDesc')}
        </p>
        <button
          onClick={() =>
            navigate('/auth', {
              state: buildAuthNavigateState(location, {
                reason: 'history_required',
                message: t('history.authNavigateMsg'),
              }),
            })
          }
          style={{
            background: '#7C3AED',
            color: 'var(--text)',
            border: 'none',
            padding: '14px 28px',
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
            cursor: 'pointer',
          }}
        >
          {t('history.loginBtn')}
        </button>
      </div>
    )
  }

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--header-bg)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--line-soft)',
          padding: '16px 20px',
          paddingTop: 'max(16px, env(safe-area-inset-top))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-soft-border)',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--text)',
            }}
          >
            {t('history.title')}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: 4,
            borderRadius: 14,
            background: 'var(--glass-muted)',
            border: '1px solid var(--glass-soft-border)',
          }}
        >
          <button
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              border: 'none',
              background: tab === 'history' ? 'rgba(124,58,237,0.16)' : 'transparent',
              color: tab === 'history' ? '#C4B5FD' : 'var(--text-dim)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {t('history.tabHistory')}
            {history.length > 0 && (
              <span
                style={{
                  fontSize: 10,
                  background: 'rgba(124,58,237,0.3)',
                  padding: '1px 6px',
                  borderRadius: 8,
                  color: '#C4B5FD',
                }}
              >
                {history.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              border: 'none',
              background: tab === 'favorites' ? 'rgba(239,68,68,0.15)' : 'transparent',
              color: tab === 'favorites' ? '#FCA5A5' : 'var(--text-dim)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <HeartIcon
              filled={tab === 'favorites'}
              size={14}
              color={tab === 'favorites' ? 'currentColor' : 'currentColor'}
            />
            {t('history.tabFavorites')}
            {favorites.length > 0 && (
              <span
                style={{
                  fontSize: 10,
                  background: 'rgba(239,68,68,0.2)',
                  padding: '1px 6px',
                  borderRadius: 8,
                  color: '#FCA5A5',
                }}
              >
                {favorites.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 20px', paddingBottom: 100 }}>
        {loading ? (
          <div
            style={{
              textAlign: 'center',
              marginTop: 40,
              color: 'var(--text-dim)',
              fontFamily: 'var(--font-display)',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: '3px solid rgba(124,58,237,0.2)',
                borderTop: '3px solid #7C3AED',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }}
            />
            {t('history.loading')}
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--text-dim)' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--glass-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              {tab === 'history' ? (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--icon-muted)"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              ) : (
                <HeartIcon filled={false} size={28} color="var(--icon-muted)" />
              )}
            </div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                color: 'var(--text-disabled)',
              }}
            >
              {tab === 'history' ? t('history.emptyHistory') : t('history.emptyFavorites')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map((product, index) => (
              <div
                key={`${product.canonicalId || product.id || product.ean || index}-${index}`}
                onClick={() => goToProduct(product)}
                style={{
                  background: 'var(--glass-subtle)',
                  border: '1px solid var(--glass-soft-border)',
                  borderRadius: 16,
                  padding: 12,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <div
                  className="catalog-img-box"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {product.image || product.images?.[0] ? (
                    <img
                      src={product.image || product.images?.[0]}
                      alt={product.name}
                      className="product-img-blend"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                        if (event.currentTarget.nextSibling)
                          event.currentTarget.nextSibling.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <span
                    style={{
                      fontSize: 22,
                      opacity: 0.3,
                      display: product.image || product.images?.[0] ? 'none' : 'flex',
                    }}
                  >
                    📦
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily: 'var(--font-display)',
                      color: 'var(--text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: 3,
                    }}
                  >
                    {getLocalName(product)}
                  </div>
                  {product.brand && (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text-dim)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {product.brand}
                    </div>
                  )}
                  {tab === 'history' &&
                    (product.scanDate || product.scanned_at || product.scannedAt) && (
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--text-disabled)',
                          marginTop: 3,
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {formatDate(
                          product.scanDate || product.scanned_at || product.scannedAt,
                          lang
                        )}
                      </div>
                    )}
                  {tab === 'favorites' && (product.favDate || product.added_at) && (
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--text-disabled)',
                        marginTop: 3,
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {formatDate(product.favDate || product.added_at, lang)}
                    </div>
                  )}
                </div>

                {tab === 'favorites' ? (
                  <button
                    onClick={(event) => removeFavorite(product, event)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'rgba(239,68,68,0.1)',
                      border: 'none',
                      color: '#F87171',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <HeartIcon filled={true} size={16} color="#F87171" />
                  </button>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--icon-muted)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    style={{ flexShrink: 0 }}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
