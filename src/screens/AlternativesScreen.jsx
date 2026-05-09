import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useI18n } from '../i18n/index.js'
import { useLocalName, getLocalName } from '../utils/localName.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { checkProductFit, formatPrice } from '../utils/fitCheck.js'
import { findProductAlternatives, findProductInCatalog } from '../domain/product/alternatives.js'
import { buildProductAIPath, buildProductPath } from '../utils/routes.js'

export default function AlternativesScreen() {
  const { ean, storeSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useProfile()
  const { t } = useI18n()
  const { currentStore, catalogProducts = [], isCatalogReady } = useStore()
  const activeStoreSlug = storeSlug || currentStore?.slug || null

  const product = useMemo(() => {
    const stateProduct = location.state?.product || null
    if (stateProduct?.ean && String(stateProduct.ean) === String(ean)) return stateProduct
    return findProductInCatalog(catalogProducts, ean)
  }, [catalogProducts, ean, location.state])

  const localName = useLocalName(product)

  const alternatives = useMemo(() => {
    return findProductAlternatives({ product, catalogProducts, profile })
  }, [catalogProducts, product, profile])

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
    <div className="screen">
      <div className="header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          aria-label={t('common.back')}
          onClick={() => navigate(-1)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            border: '1px solid var(--glass-border)',
            background: 'var(--glass-bg)',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          <span aria-hidden="true">&larr;</span>
        </button>
        <div className="screen-title" style={{ margin: 0 }}>
          {t('common.alternatives')}
        </div>
      </div>

      <div
        style={{
          padding: '0 20px 24px',
          color: 'var(--text-soft)',
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        {t('alternatives.subtitle')}{' '}
        <span style={{ color: 'var(--text)', fontWeight: 700 }}>{localName}</span>
        {activeStoreSlug ? ` ${t('alternatives.inStore')}` : '.'}
      </div>

      <div style={{ padding: '0 20px 100px', display: 'grid', gap: 10 }}>
        {isCatalogReady && alternatives.length === 0 && (
          <div
            style={{
              padding: 18,
              borderRadius: 18,
              background: 'var(--glass-muted)',
              border: '1px solid var(--glass-soft-border)',
              color: 'var(--text-soft)',
              lineHeight: 1.5,
            }}
          >
            <div style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 4 }}>
              {t('alternatives.empty')}
            </div>
            <div style={{ fontSize: 13 }}>{t('alternatives.emptyHint')}</div>
          </div>
        )}

        {alternatives.map((alt) => {
          const fit = checkProductFit(alt, profile)
          return (
            <button
              type="button"
              key={alt.ean}
              onClick={() =>
                navigate(buildProductPath(activeStoreSlug, alt.ean), {
                  state: { product: alt },
                })
              }
              style={{
                padding: 12,
                borderRadius: 18,
                cursor: 'pointer',
                textAlign: 'left',
                background: 'var(--glass-muted)',
                border: '1px solid var(--glass-soft-border)',
                display: 'grid',
                gridTemplateColumns: '56px 1fr auto',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <AltThumb product={alt} />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: 4,
                  }}
                >
                  {getLocalName(alt)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
                  {alt.brand || t('alternatives.noBrand')} &middot;{' '}
                  {alt.shelf || t('alternatives.shelfPending')}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: fit.fits ? 'var(--success-bright)' : 'var(--warning)',
                  }}
                >
                  {fit.fits ? t('alternatives.fitsProfile') : t('alternatives.checkIngredients')}
                </div>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 800,
                  color: 'var(--primary-bright)',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatPrice(alt.priceKzt)}
              </div>
            </button>
          )
        })}

        <button
          type="button"
          className="btn btn-secondary btn-full"
          onClick={() =>
            navigate(buildProductAIPath(activeStoreSlug, product.ean), {
              state: { product },
            })
          }
        >
          {t('alternatives.askAI')}
        </button>
      </div>
    </div>
  )
}

function getPrimaryImage(product) {
  if (!product) return null
  if (product.image) return product.image
  if (product.imageUrl) return product.imageUrl
  if (product.images?.[0]) return product.images[0]
  return null
}

function AltThumb({ product }) {
  const src = getPrimaryImage(product)
  const [ok, setOk] = useState(true)
  return (
    <div
      className="product-thumb"
      style={{
        width: 56,
        height: 56,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--image-bg)',
        borderRadius: 14,
      }}
    >
      {src && ok ? (
        <img
          src={src}
          alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }}
          onError={() => setOk(false)}
        />
      ) : (
        <span style={{ color: 'var(--primary-bright)', fontSize: 18, fontWeight: 800 }}>
          {product.name?.[0] || 'K'}
        </span>
      )}
    </div>
  )
}
