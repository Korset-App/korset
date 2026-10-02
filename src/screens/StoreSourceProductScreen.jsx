import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../contexts/StoreContext.jsx'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useUserData } from '../contexts/UserDataContext.jsx'
import { useI18n } from '../i18n/index.js'
import { supabase } from '../utils/supabase.js'
import { normalizeSourceCard, getProductRef } from '../domain/product/storeSourceProduct.js'
import {
  applySyncedConditions,
  applySyncedRegularFallback,
} from '../domain/product/syncedConditions.js'
import { checkProductFit, formatPrice } from '../utils/fitCheck.js'
import { buildCatalogPath } from '../utils/routes.js'
import CollapsibleFitCheck from '../components/product/CollapsibleFitCheck.jsx'
import DietBadges from '../components/product/DietBadges.jsx'
import NutritionUnified from '../components/product/NutritionUnified.jsx'
import ShoppingListButton from '../components/ShoppingListButton.jsx'
import './StoreSourceProductScreen.css'

export default function StoreSourceProductScreen() {
  const { ean, storeSlug } = useParams()
  const { storeId, catalogProducts } = useStore()
  const { profile } = useProfile()
  const { checkIsFavorite, toggleFavorite } = useUserData()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [failed, setFailed] = useState(false)
  const [observedAt, setObservedAt] = useState(Date.now)
  const local = catalogProducts.find(
    (item) => item.storeId === storeId && getProductRef(item) === ean
  )
  const current = result?.storeId === storeId && result.ref === ean ? result : null
  const base = current ? current.product : local
  const product = current?.networkError
    ? applySyncedRegularFallback(base)
    : applySyncedConditions(base, undefined, observedAt)
  useEffect(() => {
    const timer = setInterval(() => setObservedAt(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!storeId) return
    const controller = new AbortController()
    const refresh = () =>
      supabase
        .rpc('korset_get_store_source_cards', {
          p_store_id: storeId,
          p_source_id: ean.slice(3),
          p_include_out_of_stock: true,
          p_limit: 1,
        })
        .abortSignal(controller.signal)
        .then(({ data, error }) => {
          if (controller.signal.aborted) return
          setResult({
            storeId,
            ref: ean,
            networkError: Boolean(error),
            product: error ? local : data?.length === 1 ? normalizeSourceCard(data[0]) : null,
          })
          setFailed(Boolean(error || !data?.length))
        })
    refresh()
    const timer = setInterval(refresh, 60000)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [storeId, ean, local])
  const fit = product && !product.needsEnrichment ? checkProductFit(product, profile) : null
  return (
    <main className="store-source-product">
      <button
        className="store-source-product__back"
        type="button"
        onClick={() => navigate(buildCatalogPath(storeSlug))}
      >
        {t('integration.consumer.back')}
      </button>
      {!product ? (
        <p role="status">
          {t(failed ? 'integration.consumer.unavailable' : 'integration.loading')}
        </p>
      ) : (
        <>
          {product.image && (
            <img className="store-source-product__image" src={product.image} alt={product.name} />
          )}
          <h1>{lang === 'kz' && product.nameKz ? product.nameKz : product.name}</h1>
          <ShoppingListButton
            active={checkIsFavorite(getProductRef(product))}
            onClick={() => toggleFavorite(product)}
          />
          <p className="store-source-product__price">
            {product.priceKzt == null ? t('shopping.priceUnknown') : formatPrice(product.priceKzt)}{' '}
            / {t(`integration.unit.${product.saleUnit}`)}
          </p>
          <p>{t(`integration.consumer.stock.${product.stockStatus || 'unknown'}`)}</p>
          {product.conditionsStale && (
            <p className="store-source-product__notice">{t('integration.consumer.stale')}</p>
          )}
          {product.needsEnrichment ? (
            <section className="store-source-product__notice">
              <h2>{t('integration.consumer.pending')}</h2>
              <p>{t('integration.consumer.pendingBody')}</p>
            </section>
          ) : (
            <>
              <CollapsibleFitCheck severityKey={fit.verdict} reasons={fit.reasons} />
              <DietBadges product={product} lang={lang} />
              <NutritionUnified nutrition={product.nutritionPer100} product={product} />
              {product.ingredients && (
                <section>
                  <h2>{t('integration.consumer.ingredients')}</h2>
                  <p>{product.ingredients}</p>
                </section>
              )}
            </>
          )}
          {product.ean && (
            <p className="store-source-product__barcode">
              {t('integration.consumer.barcode')}: {product.ean}
            </p>
          )}
        </>
      )}
    </main>
  )
}
