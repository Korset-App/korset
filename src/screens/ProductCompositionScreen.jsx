import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/index.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useStore, fetchFullProduct } from '../contexts/StoreContext.jsx'
import { useOffline } from '../contexts/OfflineContext.jsx'
import { useLocalName } from '../utils/localName.js'
import { coerceProductEntity } from '../domain/product/normalizers.js'
import { findProductInCatalog } from '../domain/product/alternatives.js'
import {
  getProductScreenBaseProduct,
  getProductScreenProduct,
  shouldFetchFullProductForProductScreen,
} from '../domain/product/productScreenData.js'
import { buildProductAIPath } from '../utils/routes.js'
import IngredientsPreview from '../components/product/IngredientsPreview.jsx'
import './ProductCompositionScreen.css'

export default function ProductCompositionScreen() {
  const { ean, storeSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const { profile } = useProfile()
  const { currentStore, storeId, catalogProducts = [] } = useStore()
  const { isOnline } = useOffline()
  const activeStoreSlug = storeSlug || currentStore?.slug || null

  const baseProduct = useMemo(() => {
    const known = findProductInCatalog(catalogProducts, ean)
    const stateProduct = coerceProductEntity(location.state?.product)
    return getProductScreenBaseProduct({ catalogProduct: known, stateProduct, ean })
  }, [catalogProducts, ean, location.state])

  const [fullProduct, setFullProduct] = useState(null)
  const [fetchingFull, setFetchingFull] = useState(false)
  const needsFullFetch = shouldFetchFullProductForProductScreen({
    baseProduct,
    fullProduct,
    ean,
    storeId,
    isOnline: isOnline && (typeof navigator === 'undefined' || navigator.onLine),
    needsResolve: false,
  })

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

  const product = getProductScreenProduct({ baseProduct, fullProduct, ean })
  const localName = useLocalName(product)

  const askAI = (item = null) => {
    const initialPrompt = item
      ? t(item.aiQuestionKey, { ingredient: item.label, name: localName || product.name })
      : t('product.ingredients.aiQuestion.composition', { name: localName || product.name })
    navigate(buildProductAIPath(activeStoreSlug, product.ean), {
      state: { product, initialPrompt },
    })
  }

  return (
    <div className="screen product-composition-screen">
      <header className="product-composition-header">
        <button
          type="button"
          className="product-composition-header__back"
          onClick={() => navigate(-1)}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back
          </span>
        </button>
        <div className="product-composition-header__copy">
          <span>{t('product.ingredients.fullTitle')}</span>
          {product && <strong>{localName}</strong>}
        </div>
        <button
          type="button"
          className="product-composition-header__info"
          aria-label={t('product.ingredients.legendTitle')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            info
          </span>
        </button>
      </header>

      <main className="product-composition-content">
        {fetchingFull && !product && (
          <div className="product-composition-empty">{t('common.loading')}</div>
        )}

        {!fetchingFull && !product && (
          <div className="product-composition-empty">{t('common.notFound')}</div>
        )}

        {product && (
          <>
            <section className="product-composition-summary">
              <span className="material-symbols-outlined" aria-hidden="true">
                fact_check
              </span>
              <div>
                <h1>{t('product.ingredients.summaryTitle')}</h1>
                <p>{t('product.ingredients.summaryBody')}</p>
              </div>
            </section>

            <section className="product-composition-legend">
              <h2>{t('product.ingredients.legendTitle')}</h2>
              <div className="product-composition-legend__grid">
                {['danger', 'warning', 'additive', 'info'].map((tone) => (
                  <div key={tone} className={`product-composition-legend__item ${tone}`}>
                    <span />
                    <p>{t(`product.ingredients.legend.${tone}`)}</p>
                  </div>
                ))}
              </div>
            </section>

            <IngredientsPreview
              product={product}
              profile={profile}
              variant="full"
              onAskAI={askAI}
            />

            <button type="button" className="product-composition-ai" onClick={() => askAI()}>
              <span className="material-symbols-outlined" aria-hidden="true">
                auto_awesome
              </span>
              {t('product.ingredients.askAiComposition')}
            </button>
          </>
        )}
      </main>
    </div>
  )
}
