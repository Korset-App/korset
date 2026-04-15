import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '../utils/i18n.js'
import { checkProductFit, formatPrice } from '../utils/fitCheck.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import {
  getGlobalDemoProducts,
  getStoreCatalogProducts,
  getStoreCatalogProductsFromDB,
} from '../utils/storeCatalog.js'
import { buildProductPath } from '../utils/routes.js'

function ProductThumb({ product }) {
  const [imgOk, setImgOk] = useState(true)
  const src = product.image || product.imageUrl || product.images?.[0]
  if (src && imgOk) {
    return (
      <img
        src={src}
        alt={product.name}
        onError={() => setImgOk(false)}
        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
      />
    )
  }
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        fontSize: 28,
        fontWeight: 800,
        color: '#A78BFA',
      }}
    >
      {product.name?.[0] || '•'}
    </div>
  )
}

export default function CatalogScreen() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { profile } = useProfile()
  const { storeId, currentStore } = useStore()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('fit')
  const [viewMode, setViewMode] = useState('list')

  const { data: dbProducts = [], isLoading } = useQuery({
    queryKey: ['store-catalog', storeId],
    queryFn: () => getStoreCatalogProductsFromDB(storeId),
    enabled: Boolean(storeId),
  })

  const baseProducts = useMemo(() => {
    if (storeId && dbProducts.length > 0) return dbProducts
    if (currentStore?.slug) return getStoreCatalogProducts(currentStore.slug)
    return getGlobalDemoProducts()
  }, [storeId, dbProducts, currentStore])

  const hasProfile = Boolean(
    profile?.halal || profile?.halalOnly || profile?.allergens?.length || profile?.dietGoals?.length
  )
  const categoryOptions = useMemo(() => {
    const dynamic = [...new Set(baseProducts.map((product) => product.category).filter(Boolean))]
    return ['all', ...(hasProfile ? ['fit'] : []), ...dynamic]
  }, [baseProducts, hasProfile])

  const list = useMemo(() => {
    let arr = [...baseProducts]
    if (filter === 'fit') {
      arr = arr.filter((product) => checkProductFit(product, profile).fits)
    } else if (filter !== 'all') {
      arr = arr.filter((product) => product.category === filter)
    }

    const query = q.trim().toLowerCase()
    if (query) {
      arr = arr.filter((product) =>
        `${product.name} ${product.brand || ''} ${(product.tags || []).join(' ')}`
          .toLowerCase()
          .includes(query)
      )
    }

    arr.sort((a, b) => {
      if (sort === 'cheap') return (a.priceKzt || 0) - (b.priceKzt || 0)
      if (sort === 'pricey') return (b.priceKzt || 0) - (a.priceKzt || 0)
      if (sort === 'rating') return (b.qualityScore || 0) - (a.qualityScore || 0)
      const aFit = checkProductFit(a, profile).fits ? 0 : 1
      const bFit = checkProductFit(b, profile).fits ? 0 : 1
      if (aFit !== bFit) return aFit - bFit
      return (b.qualityScore || 0) - (a.qualityScore || 0)
    })

    return arr
  }, [baseProducts, filter, profile, q, sort])

  const storeTitle = currentStore ? currentStore.name : 'Каталог Körset'

  return (
    <div className="screen">
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1,
            }}
          >
            {t.catalog.title}
          </div>
          <div
            style={{ fontSize: 12, color: 'rgba(167,139,250,0.7)', marginTop: 6, fontWeight: 600 }}
          >
            {storeTitle} · {isLoading ? 'Загрузка...' : `${list.length} товаров`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: 16,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.catalog.searchPlaceholder}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: 14,
              }}
            />
          </div>
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(220,220,240,0.8)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {viewMode === 'list' ? 'grid_view' : 'view_list'}
            </span>
          </button>
        </div>

        <div
          style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 10 }}
        >
          {categoryOptions.map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                background: filter === option ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${filter === option ? 'rgba(124,58,237,0.42)' : 'rgba(255,255,255,0.08)'}`,
                color: filter === option ? '#C4B5FD' : 'rgba(220,220,240,0.7)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {option === 'all'
                ? t.catalog.filters.all
                : option === 'fit'
                  ? t.catalog.filters.fit
                  : option}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { id: 'fit', label: t.catalog.sort.fit },
            { id: 'cheap', label: t.catalog.sort.cheap },
            { id: 'pricey', label: t.catalog.sort.pricey },
            { id: 'rating', label: t.catalog.sort.rating },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => setSort(option.id)}
              style={{
                padding: '7px 10px',
                borderRadius: 12,
                cursor: 'pointer',
                background: sort === option.id ? 'rgba(96,165,250,0.14)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${sort === option.id ? 'rgba(96,165,250,0.32)' : 'rgba(255,255,255,0.08)'}`,
                color: sort === option.id ? '#93C5FD' : 'rgba(220,220,240,0.7)',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: '0 20px 100px',
          display: 'grid',
          gap: 10,
          gridTemplateColumns:
            viewMode === 'grid' ? 'repeat(auto-fill, minmax(140px, 1fr))' : '1fr',
        }}
      >
        {list.map((product) => {
          const fit = checkProductFit(product, profile)

          if (viewMode === 'grid') {
            return (
              <div
                key={product.ean}
                onClick={() =>
                  navigate(buildProductPath(currentStore?.slug || null, product.ean), {
                    state: { product },
                  })
                }
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 18,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: fit.fits ? '#34D399' : '#F87171',
                      boxShadow: `0 0 10px ${fit.fits ? '#34D399' : '#F87171'}`,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1/1',
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.03)',
                    overflow: 'hidden',
                    marginBottom: 10,
                  }}
                >
                  <ProductThumb product={product} />
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#fff',
                    lineHeight: 1.3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: 6,
                    flex: 1,
                  }}
                >
                  {product.name}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    marginTop: 'auto',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 16,
                      fontWeight: 900,
                      color: '#A78BFA',
                    }}
                  >
                    {formatPrice(product.priceKzt)}
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div
              key={product.ean}
              onClick={() =>
                navigate(buildProductPath(currentStore?.slug || null, product.ean), {
                  state: { product },
                })
              }
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 18,
                padding: 12,
                display: 'grid',
                gridTemplateColumns: '92px 1fr',
                gap: 12,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.03)',
                  overflow: 'hidden',
                }}
              >
                <ProductThumb product={product} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    gap: 12,
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#fff',
                      lineHeight: 1.35,
                    }}
                  >
                    {product.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      padding: '4px 8px',
                      borderRadius: 999,
                      background: fit.fits ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)',
                      color: fit.fits ? '#34D399' : '#F87171',
                      flexShrink: 0,
                    }}
                  >
                    {fit.fits ? 'Подходит' : 'Проверить'}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(200,200,240,0.62)', marginBottom: 10 }}>
                  {product.brand || 'Без бренда'} · {product.ean}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'end',
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 22,
                        fontWeight: 900,
                        color: '#A78BFA',
                      }}
                    >
                      {formatPrice(product.priceKzt)}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(180,180,210,0.6)' }}>
                      {product.shelf || 'Полка уточняется'}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(220,220,240,0.65)' }}>
                    Score {product.qualityScore || 0}/100
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
