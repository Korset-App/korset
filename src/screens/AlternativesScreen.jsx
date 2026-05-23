import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useI18n } from '../i18n/index.js'
import { useLocalName, getLocalName } from '../utils/localName.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { useOffline } from '../contexts/OfflineContext.jsx'
import { checkProductFit, formatPrice } from '../utils/fitCheck.js'
import { supabase } from '../utils/supabase.js'
import {
  findProductAlternatives,
  findProductInCatalog,
  mapProductAlternativeRpcRows,
  rankAlternativesForProfile,
} from '../domain/product/alternatives.js'
import {
  ALTERNATIVE_SCENARIOS,
  DEFAULT_ALTERNATIVE_SCENARIO,
  getAlternativeEmptyStateKeys,
  getAlternativeReasonKey,
  getAlternativeScenarioLabelKey,
  normalizeAlternativeScenario,
} from '../domain/product/alternativeScenarios.js'
import { buildComparePath, buildProductAIPath, buildProductPath } from '../utils/routes.js'
import { getDisplayQuantity } from '../utils/parseQuantity.js'
import { trackAlternativeEvent } from '../utils/alternativeAnalytics.js'

const RPC_LIMIT = 24
const DISPLAY_LIMIT = 12

export default function AlternativesScreen() {
  const { ean, storeSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useProfile()
  const { lang, t } = useI18n()
  const { currentStore, storeId, catalogProducts = [], isCatalogReady } = useStore()
  const { isOnline } = useOffline()
  const activeStoreSlug = storeSlug || currentStore?.slug || null
  const [scenario, setScenario] = useState(() =>
    normalizeAlternativeScenario(location.state?.preferredScenario || DEFAULT_ALTERNATIVE_SCENARIO)
  )
  const scenarioRef = useRef(scenario)

  useEffect(() => {
    scenarioRef.current = scenario
  }, [scenario])

  useEffect(() => {
    const handlePopState = () => {
      setScenario(DEFAULT_ALTERNATIVE_SCENARIO)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  const [rpcState, setRpcState] = useState({
    status: 'idle',
    products: [],
    error: null,
  })
  const [retryKey, setRetryKey] = useState(0)

  const product = useMemo(() => {
    const stateProduct = location.state?.product || null
    if (stateProduct?.ean && String(stateProduct.ean) === String(ean)) return stateProduct
    return findProductInCatalog(catalogProducts, ean)
  }, [catalogProducts, ean, location.state])

  const localName = useLocalName(product)

  const localAlternatives = useMemo(() => {
    const localCandidates = findProductAlternatives({
      product,
      catalogProducts,
      profile,
      limit: RPC_LIMIT,
    })
    return rankAlternativesForProfile({
      product,
      candidates: localCandidates,
      profile,
      scenario,
      limit: DISPLAY_LIMIT,
    })
  }, [catalogProducts, product, profile, scenario])

  useEffect(() => {
    if (!product?.ean) return
    if (!storeId || !isOnline) return

    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) setRpcState((state) => ({ ...state, status: 'loading', error: null }))
    })

    supabase
      .rpc('fn_get_product_alternatives', {
        p_store_id: storeId,
        p_ean: String(product.ean),
        p_scenario: normalizeAlternativeScenario(scenario),
        p_limit: RPC_LIMIT,
      })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) throw error
        const mapped = mapProductAlternativeRpcRows(data || [])
        const ranked = rankAlternativesForProfile({
          product,
          candidates: mapped,
          profile,
          scenario,
          limit: DISPLAY_LIMIT,
        })
        setRpcState({ status: 'success', products: ranked, error: null })
      })
      .catch((error) => {
        if (cancelled) return
        setRpcState({
          status: 'error',
          products: [],
          error: error?.message || t('alternatives.errorBody'),
        })
      })

    return () => {
      cancelled = true
    }
  }, [isOnline, product, profile, scenario, storeId, retryKey, t])

  const useLocalMode = !storeId || !isOnline
  const alternatives =
    rpcState.status === 'success' && !useLocalMode
      ? rpcState.products
      : useLocalMode
        ? localAlternatives
        : []
  const isLoading = rpcState.status === 'loading' && !useLocalMode
  const isLocalMode = useLocalMode
  const isError = rpcState.status === 'error' && !useLocalMode
  const emptyKeys = getAlternativeEmptyStateKeys(scenario)

  if (!product) {
    return (
      <div
        className="screen"
        style={{ display: 'grid', placeItems: 'center', color: 'var(--text-dim)' }}
      >
        {!isCatalogReady ? t('common.loading') : t('common.notFound')}
      </div>
    )
  }

  return (
    <div className="screen alternatives-screen">
      <div className="alternatives-header">
        <button
          type="button"
          className="alternatives-back"
          aria-label={t('common.back')}
          onClick={() => navigate(-1)}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back
          </span>
        </button>
        <div>
          <div className="screen-title alternatives-title">{t('common.alternatives')}</div>
          <div className="alternatives-subtitle">{t('alternatives.screenSubtitle')}</div>
        </div>
      </div>

      <div className="alternatives-content">
        <SourceProductCard
          product={product}
          localName={localName}
          profile={profile}
          lang={lang}
          t={t}
        />

        <div className="alternatives-scenarios" aria-label={t('alternatives.scenarioLabel')}>
          {ALTERNATIVE_SCENARIOS.map((id) => (
            <button
              type="button"
              key={id}
              className={`alternatives-scenario${scenario === id ? ' active' : ''}`}
              onClick={() => {
                if (id !== 'fits_me') window.history.pushState(null, '')
                setScenario(id)
                trackAlternativeEvent('alternatives_scenario_selected', {
                  storeId,
                  storeSlug: activeStoreSlug,
                  sourceEan: product.ean,
                  scenario: id,
                })
              }}
              aria-pressed={scenario === id}
            >
              {t(getAlternativeScenarioLabelKey(id))}
            </button>
          ))}
        </div>

        {isLocalMode && (
          <StatusNotice
            tone="info"
            title={t('alternatives.offlineTitle')}
            body={t('alternatives.offlineBody')}
          />
        )}

        {isError && (
          <StatusNotice
            tone="warning"
            title={t('alternatives.errorTitle')}
            body={rpcState.error || t('alternatives.errorBody')}
            actionLabel={t('common.retry')}
            onAction={() => setRetryKey((value) => value + 1)}
          />
        )}

        {isLoading && <AlternativesSkeleton />}

        {!isLoading && !isError && alternatives.length === 0 && (
          <EmptyState title={t(emptyKeys.titleKey)} body={t(emptyKeys.bodyKey)} />
        )}

        {!isLoading && !isError && alternatives.length > 0 && (
          <div className="alternatives-list">
            {alternatives.map((alt) => (
              <AlternativeCard
                key={alt.ean}
                product={product}
                alternative={alt}
                scenario={scenario}
                lang={lang}
                t={t}
                onOpen={() => {
                  trackAlternativeEvent('alternatives_product_opened', {
                    storeId,
                    storeSlug: activeStoreSlug,
                    sourceEan: product.ean,
                    alternativeEan: alt.ean,
                    scenario,
                  })
                  navigate(buildProductPath(activeStoreSlug, alt.ean), {
                    state: { product: alt },
                  })
                }}
                onCompare={() => {
                  trackAlternativeEvent('alternatives_compare_clicked', {
                    storeId,
                    storeSlug: activeStoreSlug,
                    sourceEan: product.ean,
                    alternativeEan: alt.ean,
                    scenario,
                  })
                  navigate(buildComparePath(activeStoreSlug, product.ean, alt.ean), {
                    state: { productA: product, productB: alt },
                  })
                }}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          className="btn btn-secondary btn-full alternatives-help-btn"
          onClick={() => {
            trackAlternativeEvent('alternatives_ai_help_clicked', {
              storeId,
              storeSlug: activeStoreSlug,
              sourceEan: product.ean,
              scenario,
              alternativesCount: alternatives.length,
            })
            navigate(buildProductAIPath(activeStoreSlug, product.ean), {
              state: {
                product,
                alternatives: alternatives.slice(0, 5),
                alternativeScenario: scenario,
              },
            })
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            neurology
          </span>
          {t('alternatives.helpChoose')}
        </button>
      </div>
    </div>
  )
}

function SourceProductCard({ product, localName, profile, lang, t }) {
  const fit = checkProductFit(product, profile)
  const quantity = getDisplayQuantity(product, lang)
  return (
    <div className="alternatives-source">
      <AltThumb product={product} size={58} />
      <div className="alternatives-source-body">
        <div className="alternatives-source-kicker">{t('alternatives.sourceLabel')}</div>
        <div className="alternatives-source-name">{localName}</div>
        <div className="alternatives-source-meta">
          {[product.brand, quantity, formatPrice(product.priceKzt)].filter(Boolean).join(' · ')}
        </div>
      </div>
      <span className={`alternatives-fit-badge ${fit.verdict || 'safe'}`}>
        {fit.fits ? t('alternatives.sourceFits') : t('alternatives.sourceRisk')}
      </span>
    </div>
  )
}

function AlternativeCard({ alternative, scenario, lang, t, onOpen, onCompare }) {
  const quantity = getDisplayQuantity(alternative, lang)
  const name = getLocalName(alternative)
  const meta = [alternative.brand || t('alternatives.noBrand'), quantity]
    .filter(Boolean)
    .join(' · ')
  const reasonKey = getAlternativeReasonKey({ alternative, scenario })
  const priceDelta = Math.abs(Number(alternative.alternativeMeta?.priceDeltaKzt || 0))
  const hasIncompleteComposition = alternative.alternativeMeta?.compositionIncomplete
  const stockKey = getStockKey(alternative.stockStatus)

  return (
    <article className="alternatives-card" onClick={onOpen}>
      <button
        type="button"
        className="alternatives-card-open-hitbox"
        aria-label={`${t('alternatives.open')}: ${name}`}
      />
      <div className="alternatives-card-main">
        <AltThumb product={alternative} size={58} />
        <div className="alternatives-card-body">
          <div className="alternatives-card-name">{name}</div>
          <div className="alternatives-card-meta">{meta}</div>
          <div className="alternatives-reason">
            <span className="material-symbols-outlined" aria-hidden="true">
              verified
            </span>
            {t(reasonKey, { amount: formatPrice(priceDelta) })}
          </div>
          <div className="alternatives-card-flags">
            <span className={`alternatives-stock ${alternative.stockStatus || 'unknown'}`}>
              {t(stockKey)}
            </span>
            {hasIncompleteComposition && (
              <span className="alternatives-data-note">
                {t('alternatives.compositionIncomplete')}
              </span>
            )}
          </div>
        </div>
        <div className="alternatives-card-side">
          <div className="alternatives-price">{formatPrice(alternative.priceKzt)}</div>
          <button
            type="button"
            className="alternatives-compare-btn"
            onClick={(event) => {
              event.stopPropagation()
              onCompare()
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              compare_arrows
            </span>
            {t('compare.btnLabel')}
          </button>
        </div>
      </div>
    </article>
  )
}

function StatusNotice({ tone = 'info', title, body, actionLabel, onAction }) {
  return (
    <div className={`alternatives-notice ${tone}`}>
      <div>
        <div className="alternatives-notice-title">{title}</div>
        <div className="alternatives-notice-body">{body}</div>
      </div>
      {actionLabel && (
        <button type="button" className="alternatives-notice-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

function EmptyState({ title, body }) {
  return (
    <div className="alternatives-empty">
      <span className="material-symbols-outlined" aria-hidden="true">
        travel_explore
      </span>
      <div className="alternatives-empty-title">{title}</div>
      <div className="alternatives-empty-body">{body}</div>
    </div>
  )
}

function AlternativesSkeleton() {
  return (
    <div className="alternatives-list">
      {[0, 1, 2].map((item) => (
        <div className="alternatives-card alternatives-card-skeleton" key={item}>
          <div className="alternatives-skeleton-thumb" />
          <div className="alternatives-skeleton-lines">
            <span />
            <span />
            <span />
          </div>
        </div>
      ))}
    </div>
  )
}

function getStockKey(stockStatus) {
  if (stockStatus === 'in_stock') return 'alternatives.stock.inStock'
  if (stockStatus === 'low_stock') return 'alternatives.stock.lowStock'
  if (stockStatus === 'out_of_stock') return 'alternatives.stock.outOfStock'
  return 'alternatives.stock.unknown'
}

function getPrimaryImage(product) {
  if (!product) return null
  if (product.image) return product.image
  if (product.imageUrl) return product.imageUrl
  if (product.images?.[0]) return product.images[0]
  return null
}

function AltThumb({ product, size = 56 }) {
  const src = getPrimaryImage(product)
  const [ok, setOk] = useState(true)
  return (
    <div
      className="product-thumb catalog-img-box alternatives-thumb"
      style={{
        width: size,
        height: size,
      }}
    >
      {src && ok ? (
        <img
          src={src}
          alt={product.name}
          className="product-img-blend"
          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 7 }}
          onError={() => setOk(false)}
        />
      ) : (
        <span className="alternatives-thumb-fallback">{product.name?.[0] || 'K'}</span>
      )}
    </div>
  )
}
