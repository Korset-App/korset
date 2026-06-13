import { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { checkProductFit, formatPrice, getCategoryLabel } from '../utils/fitCheck.js'
import { getDisplayQuantity } from '../utils/parseQuantity.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useI18n } from '../i18n/index.js'
import { useLocalName } from '../utils/localName.js'
import { useUserData } from '../contexts/UserDataContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { useOffline } from '../contexts/OfflineContext.jsx'
import { supabase } from '../utils/supabase.js'
import { fetchFullProduct } from '../contexts/StoreContext.jsx'
import { coerceProductEntity } from '../domain/product/normalizers.js'
import { findProductInCatalog } from '../domain/product/alternatives.js'
import {
  getProductScreenBaseProduct,
  getProductScreenProduct,
  shouldFetchFullProductForProductScreen,
} from '../domain/product/productScreenData.js'
import { resolveProductByEan, enrichmentEvents } from '../domain/product/resolver.js'
import {
  canRequestUnknownProduct,
  requestUnknownProductCheck,
} from '../domain/product/unknownEanRequest.js'
import {
  buildCatalogPath,
  buildProductAIPath,
  buildProductAlternativesPath,
  buildProductCompositionPath,
} from '../utils/routes.js'
import { buildProductUnitPrice } from '../domain/product/unitPrice.js'
import { hasProductScreenCharacteristics } from '../domain/product/productScreenSections.js'
import { resolveFitSeverityKey } from '../domain/product/fitVerdict.js'
import { buildAuthNavigateState } from '../utils/authFlow.js'
import ImageCarousel from '../components/product/ImageCarousel.jsx'
import CollapsibleFitCheck from '../components/product/CollapsibleFitCheck.jsx'
import DietBadges from '../components/product/DietBadges.jsx'
import NutritionUnified from '../components/product/NutritionUnified.jsx'
import IngredientsPreview from '../components/product/IngredientsPreview.jsx'
import SpecsGrid from '../components/product/SpecsGrid.jsx'
import SectionLabel from '../components/product/SectionLabel.jsx'

function getManufacturerText(product) {
  if (!product) return ''
  if (product.manufacturer && typeof product.manufacturer === 'object') {
    const name = product.manufacturer.name || ''
    const country = product.manufacturer.country || ''
    return [name, country].filter(Boolean).join(' В· ')
  }
  if (typeof product.manufacturer === 'string') {
    return product.manufacturer.replace(/\s*вЂ”\s*РґРµРјРѕ\s*$/i, '').trim()
  }
  return product.brand || ''
}

function getCountry(product) {
  if (product.manufacturer && typeof product.manufacturer === 'object') {
    return product.manufacturer.country || null
  }
  return product.country || null
}

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
export default function ProductScreen() {
  const { ean, storeSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useProfile()
  const { user } = useAuth()
  const { lang, t } = useI18n()
  const { currentStore, storeId, catalogProducts = [] } = useStore()
  const { checkIsFavorite, toggleFavorite } = useUserData()
  const { isOnline, formatCacheAge } = useOffline()

  const activeStoreSlug = storeSlug || currentStore?.slug || null
  const fromScan = location.state?.fromScan === true
  const baseProduct = useMemo(() => {
    const known = findProductInCatalog(catalogProducts, ean, { allowAlternate: !fromScan })
    const stateProduct = coerceProductEntity(location.state?.product)
    return getProductScreenBaseProduct({ catalogProduct: known, stateProduct, ean })
  }, [catalogProducts, ean, fromScan, location.state])

  const [fullProduct, setFullProduct] = useState(null)
  const [fetchingFull, setFetchingFull] = useState(false)
  const [unknownRequestStatus, setUnknownRequestStatus] = useState('idle')

  // Optimistic scan path: arrived from ScanScreen without pre-loaded product
  const needsResolve = fromScan && !location.state?.product && !baseProduct

  const needsFullFetch = shouldFetchFullProductForProductScreen({
    baseProduct,
    fullProduct,
    ean,
    storeId,
    isOnline: isOnline && (typeof navigator === 'undefined' || navigator.onLine),
    needsResolve,
  })

  useEffect(() => {
    if (!needsResolve || !ean) return
    let aborted = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFetchingFull(true)
    resolveProductByEan(ean, storeId, { logScan: false })
      .then((p) => {
        if (!aborted) {
          setFetchingFull(false)
          if (p) setFullProduct(p)
        }
      })
      .catch(() => {
        if (!aborted) setFetchingFull(false)
      })
    return () => {
      aborted = true
    }
  }, [needsResolve, ean, storeId])

  useEffect(() => {
    if (!needsFullFetch) return
    let aborted = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFetchingFull(true)
    fetchFullProduct(storeId, ean).then((fp) => {
      if (!aborted) {
        setFetchingFull(false)
        if (fp) setFullProduct(fp)
      }
    })
    return () => {
      aborted = true
    }
  }, [needsFullFetch, storeId, ean])

  useEffect(() => {
    if (!ean) return
    const handler = (e) => {
      if (e.detail?.ean === ean) setFullProduct(e.detail.product)
    }
    enrichmentEvents.addEventListener('enriched', handler)
    return () => enrichmentEvents.removeEventListener('enriched', handler)
  }, [ean])

  const product = getProductScreenProduct({ baseProduct, fullProduct, ean })
  const localName = useLocalName(product)
  const canRequestUnknown = canRequestUnknownProduct({ ean, storeId })

  const isFavorite = checkIsFavorite(product?.ean)

  const handleUnknownProductRequest = async () => {
    if (!canRequestUnknown || unknownRequestStatus === 'sending') return
    setUnknownRequestStatus('sending')
    const result = await requestUnknownProductCheck({ ean, storeId, client: supabase })
    setUnknownRequestStatus(result.ok ? 'sent' : 'error')
  }

  const handleToggleFavorite = async () => {
    if (!user) {
      navigate('/auth', {
        state: buildAuthNavigateState(location, {
          reason: 'favorites_requires_auth',
          message: t('product.loginForFavorites'),
        }),
      })
      return
    }
    await toggleFavorite(product)
  }

  if (!product && fetchingFull) {
    return (
      <div className="screen" style={{ padding: '0 20px 120px', overflowY: 'auto' }}>
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <style>{`
          @keyframes _shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
          ._skel{background:linear-gradient(90deg,var(--skel-base) 25%,var(--skel-hi) 50%,var(--skel-base) 75%);background-size:200% 100%;animation:_shimmer 1.4s ease-in-out infinite;border-radius:8px;}
        `}</style>

        {/* Back button skeleton */}
        <div
          style={{ height: 52, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}
        >
          <div className="_skel" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <div className="_skel" style={{ width: 110, height: 14 }} />
        </div>

        {/* Product image */}
        <div
          className="_skel"
          style={{ width: '100%', height: 260, borderRadius: 20, marginBottom: 20 }}
        />

        {/* Name + subtitle */}
        <div className="_skel" style={{ width: '72%', height: 22, marginBottom: 10 }} />
        <div className="_skel" style={{ width: '48%', height: 13, marginBottom: 24 }} />

        {/* FitCheck badge */}
        <div
          className="_skel"
          style={{ width: '100%', height: 64, borderRadius: 16, marginBottom: 20 }}
        />

        {/* Nutrition row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="_skel" style={{ flex: 1, height: 70, borderRadius: 12 }} />
          ))}
        </div>

        {/* Ingredients lines */}
        {[100, 88, 72].map((w, i) => (
          <div
            key={i}
            className="_skel"
            style={{ width: `${w}%`, height: 13, borderRadius: 6, marginBottom: 8 }}
          />
        ))}
      </div>
    )
  }

  if (!product) {
    return (
      <div
        className="screen"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          padding: '28px 20px',
        }}
      >
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            textAlign: 'center',
            color: 'var(--text-dim)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--glass-subtle)',
              border: '1px solid var(--glass-soft-border)',
              color: 'var(--text-sub)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 34 }}>
              barcode
            </span>
          </div>
          <div>
            <p style={{ color: 'var(--text)', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
              {t('product.unknownEan.title')}
            </p>
            <p style={{ color: 'var(--text-sub)', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
              {t('product.unknownEan.body')}
            </p>
          </div>
          {ean && (
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: 'var(--text-disabled)',
                background: 'var(--glass-subtle)',
                border: '1px solid var(--glass-soft-border)',
                borderRadius: 10,
                padding: '7px 10px',
              }}
            >
              {ean}
            </div>
          )}
          {canRequestUnknown && (
            <button
              className="btn btn-primary"
              style={{ marginTop: 2, minWidth: 190 }}
              onClick={handleUnknownProductRequest}
              disabled={unknownRequestStatus === 'sending' || unknownRequestStatus === 'sent'}
            >
              {unknownRequestStatus === 'sent'
                ? t('product.unknownEan.requested')
                : t('product.unknownEan.requestButton')}
            </button>
          )}
          {unknownRequestStatus === 'error' && (
            <p style={{ color: 'var(--red)', fontSize: 12, margin: 0 }}>
              {t('product.unknownEan.requestFailed')}
            </p>
          )}
          <button
            className="btn btn-secondary"
            style={{ marginTop: canRequestUnknown ? 0 : 8 }}
            onClick={() => navigate(buildCatalogPath(activeStoreSlug))}
          >
            {canRequestUnknown ? t('product.unknownEan.scanAnother') : t('product.backToList')}
          </button>
        </div>
      </div>
    )
  }

  const fit = checkProductFit(product, profile)
  const { reasons } = fit
  const severityKey = resolveFitSeverityKey(fit)
  const showAlternativeNudge = severityKey !== 'safe'

  const manufacturerText = getManufacturerText(product)
  const country = getCountry(product)
  const quantityDisplay = getDisplayQuantity(product, lang)
  const perUnit = buildProductUnitPrice(product)
  const showCharacteristics = hasProductScreenCharacteristics(product, { lang })

  const subtitleParts = [
    product.brand,
    country && (typeof country === 'string' ? country : null),
    quantityDisplay,
  ].filter(Boolean)
  // Fallback: РµСЃР»Рё РЅРµС‚ brand, РёСЃРїРѕР»СЊР·СѓРµРј manufacturer name
  const subtitleText =
    subtitleParts.length > 0 ? subtitleParts.join(' В· ') : manufacturerText || ''

  const handleAskIngredientAI = (item) => {
    navigate(buildProductAIPath(activeStoreSlug, product.ean), {
      state: {
        product,
        initialPrompt: t(item.aiQuestionKey, {
          ingredient: item.label,
          name: localName || product.name,
        }),
      },
    })
  }

  return (
    <div
      className="screen"
      style={{
        paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <Helmet>
        <title>{`${localName || product.name} | Körset`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {/* HEADER вЂ” Р±РµР· "Р”РµС‚Р°Р»Рё" */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--header-bg)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--line-soft)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            border: '1px solid var(--glass-border)',
            background: 'var(--glass-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text)"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {getCategoryLabel(product.category, lang) ||
            getCategoryLabel(product.subcategory, lang) ||
            ''}
        </div>
        <button
          onClick={handleToggleFavorite}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            border: '1px solid var(--glass-border)',
            background: isFavorite ? 'var(--glass-muted)' : 'var(--glass-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background 0.15s, border-color 0.15s',
            color: 'var(--text)',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 20, fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
          >
            checklist
          </span>
        </button>
      </div>

      {/* CONTENT */}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 1. Р¤РѕС‚Рѕ-РєР°СЂСѓСЃРµР»СЊ (РѕСЃС‚Р°РІР»СЏРµРј РєР°Рє Р±С‹Р»Р° вЂ” swipe animation) */}
        <ImageCarousel
          images={product.images}
          fallbackEan={product.ean}
          singleImage={product.image}
        />

        {/* 2. Title + Price РІ РѕРґРЅСѓ СЃС‚СЂРѕРєСѓ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <h1
            style={{
              flex: 1,
              fontSize: 20,
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              lineHeight: 1.22,
              color: 'var(--text)',
              margin: 0,
              minWidth: 0,
              wordBreak: 'break-word',
            }}
          >
            {localName}
          </h1>
          {product.priceKzt != null && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 2,
                flexShrink: 0,
                paddingTop: 2,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: 'var(--text)',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}
              >
                {formatPrice(product.priceKzt)}
              </div>
              {perUnit && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--text-dim)',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.02em',
                  }}
                >
                  {formatPrice(perUnit.value)} / {perUnit.suffix}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Brand В· Country В· Quantity */}
        {subtitleText && (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: -8 }}>
            {subtitleText}
          </div>
        )}

        {/* 4. Collapsible Fit-Check */}
        <CollapsibleFitCheck severityKey={severityKey} reasons={reasons} />

        {showAlternativeNudge && (
          <button
            type="button"
            className={`product-alternative-nudge ${severityKey}`}
            onClick={() =>
              navigate(buildProductAlternativesPath(activeStoreSlug, product.ean), {
                state: { product, preferredScenario: 'fits_me' },
              })
            }
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              travel_explore
            </span>
            <span className="product-alternative-nudge-copy">
              <span className="product-alternative-nudge-title">
                {t('product.alternativesNudge.title')}
              </span>
              <span className="product-alternative-nudge-body">
                {t('product.alternativesNudge.body')}
              </span>
            </span>
            <span
              className="material-symbols-outlined product-alternative-nudge-arrow"
              aria-hidden="true"
            >
              arrow_forward
            </span>
          </button>
        )}

        {/* Offline indicator */}
        {!isOnline && formatCacheAge() && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-faint)',
              textAlign: 'center',
              marginTop: -8,
            }}
          >
            {t('scan.offlineCacheLabel')} ({formatCacheAge()})
          </div>
        )}

        {/* 5. Diet Badges */}
        <DietBadges product={product} lang={lang} />

        {/* 6. Nutrition (5 СЏС‡РµРµРє + sugar/salt bars) */}
        <NutritionUnified nutrition={product.nutritionPer100} />

        {/* 7. Ingredients */}
        {product.ingredients && (
          <IngredientsPreview
            product={product}
            profile={profile}
            onOpenFull={() =>
              navigate(buildProductCompositionPath(activeStoreSlug, product.ean), {
                state: { product },
              })
            }
            onAskAI={handleAskIngredientAI}
          />
        )}

        {/* 8. Characteristics */}
        {showCharacteristics && (
          <div>
            <SectionLabel>{t('product.characteristics')}</SectionLabel>
            <SpecsGrid product={product} />
          </div>
        )}

        {/* 9. Description */}
        {product.description && (
          <div>
            <SectionLabel>{t('product.description')}</SectionLabel>
            <div
              style={{
                background: 'var(--glass-subtle)',
                border: '1px solid var(--line-soft)',
                borderRadius: 14,
                padding: 14,
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--text-soft)',
              }}
            >
              {product.description}
            </div>
          </div>
        )}

        {/* 10. Bottom action buttons вЂ” Р’ РџРћРўРћРљР• (РЅРµ fixed) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() =>
                navigate(buildProductAlternativesPath(activeStoreSlug, product.ean), {
                  state: { product },
                })
              }
              style={{
                flex: 1,
                padding: '14px 10px',
                borderRadius: 14,
                cursor: 'pointer',
                background: 'var(--glass-muted)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text)',
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
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
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
              {t('common.alternatives')}
            </button>
            <button
              onClick={() =>
                navigate(buildProductAIPath(activeStoreSlug, product.ean), {
                  state: { product },
                })
              }
              style={{
                flex: 1,
                padding: '14px 10px',
                borderRadius: 14,
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                border: 'none',
                color: 'var(--text-inverse)',
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 6px 18px rgba(124,58,237,0.35)',
              }}
            >
              {/* AI РёРєРѕРЅРєР° вЂ” С‚Р° Р¶Рµ С‡С‚Рѕ РІ BottomNav */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                <path d="M12 1.99996C12.9057 1.99996 13.7829 2.12194 14.6172 2.34762C14.2223 3.14741 14 4.04768 14 4.99997C14 8.31368 16.6863 11 20 11C20.6685 11 21.3106 10.8882 21.9111 10.6865C21.9676 11.1165 22 11.5546 22 12C22 17.5228 17.5228 22 12 22C10.2975 22 8.69425 21.5746 7.29102 20.8242L2 22L3.17578 16.709C2.42542 15.3057 2 13.7025 2 12C2.00002 6.47714 6.47717 1.99996 12 1.99996ZM19.5293 1.3193C19.7058 0.893513 20.2942 0.8935 20.4707 1.3193L20.7236 1.93063C21.1555 2.97343 21.9615 3.80614 22.9746 4.2568L23.6914 4.57614C24.1022 4.75882 24.1022 5.35635 23.6914 5.53903L22.9326 5.87692C21.945 6.3162 21.1534 7.11943 20.7139 8.1279L20.4668 8.69333C20.2863 9.10747 19.7136 9.10747 19.5332 8.69333L19.2861 8.1279C18.8466 7.11942 18.0551 6.3162 17.0674 5.87692L16.3076 5.53903C15.8974 5.35618 15.8974 4.75895 16.3076 4.57614L17.0254 4.2568C18.0384 3.80614 18.8445 2.97343 19.2764 1.93063L19.5293 1.3193Z" />
              </svg>
              {t('common.askAI')}
            </button>
          </div>
          <button
            onClick={() => {
              sessionStorage.setItem('korset_compare_a', JSON.stringify(product))
              navigate(buildCatalogPath(activeStoreSlug))
            }}
            style={{
              width: '100%',
              padding: '13px 16px',
              borderRadius: 14,
              cursor: 'pointer',
              background: 'var(--glass-subtle)',
              border: '1px solid var(--glass-soft-border)',
              color: 'var(--text-sub)',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            {t('compare.btnLabel') || t('product.addToCompare')}
          </button>
        </div>
      </div>
    </div>
  )
}
