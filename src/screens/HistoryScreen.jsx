import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { useI18n } from '../i18n/index.js'
import { getLocalName } from '../utils/localName.js'
import {
  buildCatalogPath,
  buildProductPath,
  buildProfilePath,
  buildShoppingListPath,
} from '../utils/routes.js'
import { hydrateProductsFromScanRows } from '../domain/product/resolver.js'
import {
  buildHistoryOwnerKey,
  dedupeLocalScanHistory,
  filterLocalScanHistoryByStore,
  readLocalScanHistory,
  SCAN_HISTORY_STORAGE_KEY,
} from '../utils/localHistory.js'
import './ShoppingExperience.css'

export default function HistoryScreen() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { user, internalUserId } = useAuth()
  const { currentStore } = useStore()
  const { t, lang } = useI18n()
  const scope = params.get('scope') === 'all' ? 'all' : 'current'
  const [result, setResult] = useState({ key: null, rows: null, error: false })
  const [storesById, setStoresById] = useState({})
  const [query, setQuery] = useState('')
  const [revision, setRevision] = useState(0)
  const [historyLimit, setHistoryLimit] = useState(100)
  const requestKey = `${scope}:${currentStore?.id || ''}:${internalUserId || ''}:${revision}:${historyLimit}`
  const rows = result.key === requestKey ? result.rows : null

  useEffect(() => {
    if (params.get('tab') === 'favorites' && currentStore?.slug)
      navigate(buildShoppingListPath(currentStore.slug), { replace: true })
  }, [params, navigate, currentStore?.slug])

  useEffect(() => {
    const refresh = (event) => {
      if (event?.key && event.key !== SCAN_HISTORY_STORAGE_KEY) return
      setRevision((value) => value + 1)
    }
    window.addEventListener('storage', refresh)
    window.addEventListener('korset:scan_added', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('korset:scan_added', refresh)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const localRows = readLocalScanHistory(buildHistoryOwnerKey(user))
    const scopedLocal =
      scope === 'all' ? localRows : filterLocalScanHistoryByStore(localRows, currentStore?.id)

    async function load() {
      let remoteRows = []
      let hasMore = false
      if (internalUserId && (scope === 'all' || currentStore?.id)) {
        for (let from = 0; from <= historyLimit; from += 500) {
          const to = Math.min(from + 499, historyLimit)
          let request = supabase
            .from('scan_events')
            .select('ean, global_product_id, scanned_at, store_id')
            .eq('user_id', internalUserId)
            .order('scanned_at', { ascending: false })
            .order('id')
            .range(from, to)
          if (scope === 'current') request = request.eq('store_id', currentStore?.id)
          const { data, error } = await request
          if (error) throw error
          remoteRows.push(...(data || []))
          if (!data || data.length < to - from + 1) break
        }
        hasMore = remoteRows.length > historyLimit
        remoteRows = remoteRows.slice(0, historyLimit)
      }

      const hydrated = await hydrateProductsFromScanRows(remoteRows)
      const hydratedByEan = new Map(hydrated.map((product) => [product.ean, product]))
      const remoteProducts = remoteRows.map((row) => ({
        ...hydratedByEan.get(row.ean),
        ean: row.ean,
        storeId: row.store_id || null,
        scanDate: row.scanned_at || null,
      }))
      const merged = dedupeLocalScanHistory([...scopedLocal, ...remoteProducts])
      const storeIds = [...new Set(merged.map((item) => item.storeId).filter(Boolean))]
      let storeMap = {}
      if (scope === 'all' && storeIds.length) {
        const { data } = await supabase.from('stores').select('id,name,slug').in('id', storeIds)
        storeMap = Object.fromEntries((data || []).map((store) => [store.id, store]))
      }
      if (currentStore?.id) storeMap[currentStore.id] = currentStore
      if (!cancelled) {
        setStoresById(storeMap)
        setResult({ key: requestKey, rows: merged, error: false, hasMore })
      }
    }

    load().catch((error) => {
      console.error('History load failed', error)
      if (!cancelled)
        setResult({
          key: requestKey,
          rows: dedupeLocalScanHistory(scopedLocal),
          error: true,
          hasMore: false,
        })
    })
    return () => {
      cancelled = true
    }
  }, [user, internalUserId, currentStore, scope, revision, requestKey, historyLimit])

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(lang === 'kz' ? 'kk' : 'ru')
    if (!needle) return rows || []
    return (rows || []).filter((item) =>
      `${getLocalName(item)} ${item.brand || ''}`
        .toLocaleLowerCase(lang === 'kz' ? 'kk' : 'ru')
        .includes(needle)
    )
  }, [rows, query, lang])

  return (
    <main className="shopping-page">
      <header className="shopping-page__header">
        <button
          className="shopping-page__back"
          type="button"
          onClick={() => navigate(buildProfilePath(currentStore?.slug))}
          aria-label={t('common.back')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="shopping-page__heading">
          <span className="shopping-page__eyebrow">Körset</span>
          <h1>{t('history.tabHistory')}</h1>
        </div>
      </header>
      <div className="shopping-page__body">
        <div className="shopping-page__segmented" role="group" aria-label={t('history.tabHistory')}>
          <button
            type="button"
            className={scope === 'current' ? 'is-active' : ''}
            onClick={() => setParams({ scope: 'current' }, { replace: true })}
          >
            {t('history.scopeCurrent')}
          </button>
          <button
            type="button"
            className={scope === 'all' ? 'is-active' : ''}
            onClick={() => setParams({ scope: 'all' }, { replace: true })}
          >
            {t('history.scopeAll')}
          </button>
        </div>
        <label className="shopping-page__search">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('history.searchPlaceholder')}
          />
        </label>
        {result.error && rows?.length > 0 && (
          <div className="shopping-page__feedback" role="status">
            {t('history.partialLoad')}
          </div>
        )}
        {rows === null ? (
          <div className="shopping-page__loading" aria-live="polite">
            {t('history.loading')}
          </div>
        ) : result.error && rows.length === 0 ? (
          <div className="shopping-page__error" role="alert">
            <p>{t('history.loadFailed')}</p>
            <button
              type="button"
              className="shopping-page__primary"
              onClick={() => setRevision((value) => value + 1)}
            >
              {t('shopping.retry')}
            </button>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="shopping-page__empty">
            <div className="shopping-page__empty-mark" aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="24" cy="24" r="17" />
                <path d="M24 14v11l7 5" />
              </svg>
            </div>
            <h2>
              {t(
                query.trim()
                  ? 'history.noResults'
                  : scope === 'all'
                    ? 'history.noHistoryAnywhere'
                    : 'history.noHistoryHere'
              )}
            </h2>
            <button
              type="button"
              className="shopping-page__primary"
              onClick={() => navigate(buildCatalogPath(currentStore?.slug))}
            >
              {t('history.openCatalog')}
            </button>
          </div>
        ) : (
          <>
            <div className="shopping-page__history-list">
              {visibleRows.map((product) => {
                const store = storesById[product.storeId]
                const date = product.scanDate ? new Date(product.scanDate) : null
                const canOpen = Boolean(store?.slug && product.ean)
                return (
                  <button
                    type="button"
                    key={`${product.storeId || 'global'}:${product.ean}`}
                    className="shopping-page__history-item"
                    disabled={!canOpen}
                    onClick={() =>
                      navigate(buildProductPath(store.slug, product.ean), { state: { product } })
                    }
                  >
                    <div className="shopping-page__history-image">
                      {product.image ? (
                        <img src={product.image} alt="" loading="lazy" />
                      ) : (
                        <span aria-hidden="true">{getLocalName(product)?.[0] || '•'}</span>
                      )}
                    </div>
                    <div className="shopping-page__history-copy">
                      <strong>{getLocalName(product)}</strong>
                      <span>
                        {scope === 'all'
                          ? store?.name || t('history.otherStore')
                          : product.brand || currentStore?.name}
                      </span>
                    </div>
                    {date && !Number.isNaN(date.getTime()) && (
                      <time dateTime={date.toISOString()}>
                        {date.toLocaleDateString(lang === 'kz' ? 'kk-KZ' : 'ru-RU', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </time>
                    )}
                  </button>
                )
              })}
            </div>
            {result.hasMore && (
              <button
                type="button"
                className="shopping-page__more"
                onClick={() => setHistoryLimit((value) => value + 100)}
              >
                {t('history.showMore')}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  )
}
