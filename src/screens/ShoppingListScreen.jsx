import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { useUserData } from '../contexts/UserDataContext.jsx'
import { useI18n } from '../i18n/index.js'
import { getLocalName } from '../utils/localName.js'
import { buildCatalogPath, buildProfilePath } from '../utils/routes.js'
import { hydrateProductsFromFavoriteRows } from '../domain/product/resolver.js'
import { summarizeShoppingList } from '../domain/shopping/shoppingListSummary.js'
import { selectShoppingRecommendations } from '../domain/shopping/recommendations.js'
import {
  getCopyableStoreProducts,
  getStoreShoppingList,
  readGuestShoppingLists,
} from '../utils/shoppingLists.js'
import ProductMiniCard from '../components/ProductMiniCard.jsx'
import './ShoppingExperience.css'

export default function ShoppingListScreen() {
  const navigate = useNavigate()
  const { internalUserId } = useAuth()
  const { profile } = useProfile()
  const { currentStore, catalogProducts } = useStore()
  const {
    favoriteEans,
    toggleFavorite,
    userDataLoaded,
    shoppingListLoadError,
    reloadShoppingList,
  } = useUserData()
  const { t, lang } = useI18n()
  const [result, setResult] = useState({ storeId: null, products: null, error: false })
  const [retryVersion, setRetryVersion] = useState(0)
  const [promotedEans, setPromotedEans] = useState([])
  const [query, setQuery] = useState('')
  const [feedback, setFeedback] = useState('')
  const [otherLists, setOtherLists] = useState(null)
  const [otherListsStoreId, setOtherListsStoreId] = useState(null)
  const [otherListsLoading, setOtherListsLoading] = useState(false)
  const [copyBusy, setCopyBusy] = useState(false)
  const products = result.storeId === currentStore?.id ? result.products : null

  useEffect(() => {
    if (!currentStore?.id || !userDataLoaded) return
    let cancelled = false
    async function load() {
      let rows = [...favoriteEans].map((ean) => ({ ean }))
      if (internalUserId) {
        const { data, error } = await supabase
          .from('store_shopping_items')
          .select('ean, global_product_id, added_at')
          .eq('user_id', internalUserId)
          .eq('store_id', currentStore.id)
          .order('added_at', { ascending: false })
        if (error) throw error
        rows = data || []
      }
      const hydrated = await hydrateProductsFromFavoriteRows(rows)
      const catalogByEan = new Map((catalogProducts || []).map((item) => [item.ean, item]))
      const list = hydrated.map((item) => {
        const local = catalogByEan.get(item.ean)
        return local
          ? { ...item, ...local, storeOutOfStock: local.stockStatus === 'out_of_stock' }
          : { ...item, priceKzt: null, storeUnavailable: true }
      })
      if (!cancelled) setResult({ storeId: currentStore.id, products: list, error: false })
    }
    load().catch((error) => {
      console.error('Shopping list load failed', error)
      if (!cancelled) setResult({ storeId: currentStore.id, products: null, error: true })
    })
    return () => {
      cancelled = true
    }
  }, [
    currentStore?.id,
    internalUserId,
    favoriteEans,
    userDataLoaded,
    catalogProducts,
    retryVersion,
  ])

  useEffect(() => {
    if (!currentStore?.id) return
    let cancelled = false
    supabase
      .from('store_products')
      .select('ean')
      .eq('store_id', currentStore.id)
      .eq('is_shopping_recommended', true)
      .limit(10)
      .then(({ data, error }) => {
        if (error) console.warn('Shopping recommendation candidates unavailable', error)
        if (!cancelled) setPromotedEans((data || []).map((row) => row.ean))
      })
    return () => {
      cancelled = true
    }
  }, [currentStore?.id])

  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(lang === 'kz' ? 'kk' : 'ru')
    return needle
      ? (products || []).filter((product) =>
          `${getLocalName(product)} ${product.brand || ''}`
            .toLocaleLowerCase(lang === 'kz' ? 'kk' : 'ru')
            .includes(needle)
        )
      : products || []
  }, [products, query, lang])

  const summary = useMemo(() => summarizeShoppingList(products || []), [products])
  const recommendations = useMemo(
    () =>
      selectShoppingRecommendations({
        items: products || [],
        catalog: catalogProducts || [],
        promotedEans,
        profile,
        limit: 5,
      }),
    [products, catalogProducts, promotedEans, profile]
  )

  const handleShare = async () => {
    if (!products?.length) return
    const lines = products.map((product, index) => {
      const price =
        Number.isFinite(product.priceKzt) && product.priceKzt > 0
          ? ` — ${product.priceKzt.toLocaleString('ru-RU')} ₸`
          : ''
      return `${index + 1}. ${product.source === 'unknown' ? t('shopping.unknownProduct') : getLocalName(product)}${price}`
    })
    const total =
      summary.missingPriceCount === 0
        ? `${t('shopping.total')}: ${summary.pricedTotalKzt.toLocaleString('ru-RU')} ₸`
        : `${t('shopping.partialTotal')}: ${summary.knownSubtotalKzt.toLocaleString('ru-RU')} ₸`
    const text = `${t('shopping.title')} · ${currentStore.name}\n${lines.join('\n')}\n${total}`
    if (navigator.share) {
      try {
        await navigator.share({ title: t('shopping.title'), text })
        return
      } catch (error) {
        if (error?.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setFeedback(t('shopping.copied'))
    } catch {
      setFeedback(t('shopping.copyFailed'))
    }
  }

  const loadOtherLists = async () => {
    if (!currentStore?.id || otherListsLoading) return
    setOtherListsLoading(true)
    try {
      let rows
      if (internalUserId) {
        const { data, error } = await supabase
          .from('store_shopping_items')
          .select('store_id, ean')
          .eq('user_id', internalUserId)
          .neq('store_id', currentStore.id)
        if (error) throw error
        rows = data || []
      } else {
        const guestLists = readGuestShoppingLists()
        rows = Object.keys(guestLists).flatMap((storeId) =>
          storeId === currentStore.id
            ? []
            : getStoreShoppingList(guestLists, storeId).map((ean) => ({ store_id: storeId, ean }))
        )
      }
      const byStore = new Map()
      for (const row of rows) {
        if (!byStore.has(row.store_id)) byStore.set(row.store_id, new Set())
        byStore.get(row.store_id).add(row.ean)
      }
      const ids = [...byStore.keys()]
      let names = new Map()
      if (ids.length) {
        const { data, error } = await supabase.from('stores').select('id,name').in('id', ids)
        if (!error) names = new Map((data || []).map((store) => [store.id, store.name]))
      }
      setOtherLists(
        ids
          .map((storeId) => ({
            storeId,
            name: names.get(storeId) || t('shopping.unknownStore'),
            total: byStore.get(storeId).size,
            products: getCopyableStoreProducts([...byStore.get(storeId)], catalogProducts),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, lang === 'kz' ? 'kk' : 'ru'))
      )
      setOtherListsStoreId(currentStore.id)
    } catch (error) {
      console.error('Other shopping lists load failed', error)
      setFeedback(t('shopping.loadFailed'))
    } finally {
      setOtherListsLoading(false)
    }
  }

  const copyFromStore = async (source) => {
    if (copyBusy) return
    setCopyBusy(true)
    let copied = 0
    for (const product of source.products) {
      if (favoriteEans.has(product.ean)) continue
      if (await toggleFavorite(product)) copied += 1
    }
    setFeedback(copied ? t('shopping.copiedItems', { count: copied }) : t('shopping.copyFailed'))
    setCopyBusy(false)
  }

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
          <span className="shopping-page__eyebrow">{currentStore?.name || 'Körset'}</span>
          <h1>{t('shopping.title')}</h1>
        </div>
        {summary.itemCount > 0 && (
          <button
            type="button"
            className="shopping-page__share"
            onClick={handleShare}
            aria-label={t('shopping.share')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="18" cy="5" r="2.5" />
              <circle cx="6" cy="12" r="2.5" />
              <circle cx="18" cy="19" r="2.5" />
              <path d="m8.3 10.8 7.4-4.5M8.3 13.2l7.4 4.5" />
            </svg>
          </button>
        )}
      </header>
      <div className="shopping-page__body">
        {feedback && (
          <div className="shopping-page__feedback" role="status">
            {feedback}
          </div>
        )}
        {result.storeId === currentStore?.id && (result.error || shoppingListLoadError) ? (
          <div className="shopping-page__error" role="alert">
            <p>{t('shopping.loadFailed')}</p>
            <button
              type="button"
              className="shopping-page__primary"
              onClick={() => {
                setResult({ storeId: currentStore.id, products: null, error: false })
                reloadShoppingList()
                setRetryVersion((value) => value + 1)
              }}
            >
              {t('shopping.retry')}
            </button>
          </div>
        ) : !currentStore?.id || products === null ? (
          <div className="shopping-page__loading">{t('history.loading')}</div>
        ) : summary.itemCount === 0 ? (
          <div className="shopping-page__empty">
            <div className="shopping-page__empty-mark" aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="14" width="30" height="25" rx="5" />
                <path d="M17 17V11a7 7 0 0 1 14 0v6M18 27h12M24 21v12" />
              </svg>
            </div>
            <h2>{t('shopping.emptyTitle')}</h2>
            <p>{t('shopping.emptyHint')}</p>
            <button
              type="button"
              className="shopping-page__primary"
              onClick={() => navigate(buildCatalogPath(currentStore.slug))}
            >
              {t('shopping.openCatalog')}
            </button>
            <button
              type="button"
              className="shopping-page__secondary"
              onClick={loadOtherLists}
              disabled={otherListsLoading}
            >
              {otherListsLoading ? t('history.loading') : t('shopping.copyFromOtherStore')}
            </button>
            {otherLists && otherListsStoreId === currentStore.id && (
              <div className="shopping-page__other-lists">
                {otherLists.length === 0 ? (
                  <p>{t('shopping.noOtherLists')}</p>
                ) : (
                  otherLists.map((source) => (
                    <button
                      key={source.storeId}
                      type="button"
                      disabled={copyBusy || source.products.length === 0}
                      onClick={() => copyFromStore(source)}
                    >
                      <strong>{source.name}</strong>
                      <span>
                        {t('shopping.availableToCopy', {
                          available: source.products.length,
                          total: source.total,
                        })}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <section className="shopping-page__summary" aria-label={t('shopping.total')}>
              <div>
                <span>
                  {summary.missingPriceCount ? t('shopping.partialTotal') : t('shopping.total')}
                </span>
                <strong>
                  {summary.pricedCount > 0
                    ? `${summary.knownSubtotalKzt.toLocaleString('ru-RU')} ₸`
                    : t('shopping.priceUnknown')}
                </strong>
              </div>
              <span className="shopping-page__item-count">
                {t('shopping.itemsCount', { count: summary.itemCount })}
              </span>
              {summary.missingPriceCount > 0 && (
                <small>
                  {t('shopping.priceUnknown')} · {summary.missingPriceCount}
                </small>
              )}
            </section>
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
                placeholder={t('shopping.searchPlaceholder')}
              />
            </label>
            {visibleProducts.length > 0 ? (
              <div className="shopping-page__grid">
                {visibleProducts.map((product) => (
                  <ProductMiniCard
                    key={product.ean}
                    product={product}
                    onRemove={() => toggleFavorite(product)}
                  />
                ))}
              </div>
            ) : (
              <p className="shopping-page__no-results">{t('shopping.noResults')}</p>
            )}
            {recommendations.length > 0 && (
              <section className="shopping-page__recommendations">
                <div className="shopping-page__section-head">
                  <h2>{t('shopping.recommendations')}</h2>
                  <p>{t('shopping.recommendationsHint')}</p>
                </div>
                <div className="shopping-page__grid">
                  {recommendations.map((product) => (
                    <ProductMiniCard
                      key={product.ean}
                      product={product}
                      onAdd={() => toggleFavorite(product)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}
