import { useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { checkProductFit, formatPrice, CATEGORY_LABELS } from '../utils/fitCheck.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../utils/supabase.js'
import { useI18n } from '../utils/i18n.js'
import { useUserData } from '../contexts/UserDataContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { getAnyKnownProductByRef } from '../utils/storeCatalog.js'
import { coerceProductEntity } from '../domain/product/normalizers.js'
import { buildCatalogPath, buildProductAIPath, buildProductAlternativesPath } from '../utils/routes.js'

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

function ratingFromQuality(qualityScore) {
  const raw = (Number(qualityScore || 0) / 100) * 5
  // step 0.5
  return Math.round(raw * 2) / 2
}

function getPrimaryImage(product) {
  // Prefer explicit images, fallback to a convention by EAN.
  if (!product) return null
  if (product.images?.[0]) return product.images[0]
  if (product.ean) return `/products/${product.ean}.png`
  return null
}

function StarIcon({ variant = 'empty' }) {
  // variant: empty | half | full
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ flex: '0 0 auto' }}>
      <defs>
        <linearGradient id="half" x1="0" y1="0" x2="1" y2="0">
          <stop offset="50%" stopColor="currentColor" />
          <stop offset="50%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5l2.9 6.1 6.7.9-4.9 4.7 1.2 6.7L12 18.8 6.1 20.9 7.3 14.2 2.4 9.5l6.7-.9L12 2.5z"
        fill={variant === 'full' ? 'currentColor' : variant === 'half' ? 'url(#half)' : 'transparent'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Stars({ value }) {
  const v = clamp(Number(value || 0), 0, 5)
  const full = Math.floor(v)
  const half = v - full >= 0.5
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const variant = i < full ? 'full' : i === full && half ? 'half' : 'empty'
        return (
          <span key={i} style={{ color: 'var(--primary-bright)' }}>
            <StarIcon variant={variant} />
          </span>
        )
      })}
    </div>
  )
}

function getManufacturerText(product) {
  // Supports: manufacturer: {name, country} OR string
  if (!product) return ''
  if (product.manufacturer && typeof product.manufacturer === 'object') {
    const name = product.manufacturer.name || ''
    const country = product.manufacturer.country || ''
    return [name, country].filter(Boolean).join(' · ')
  }
  if (typeof product.manufacturer === 'string') {
    // Strip "— демо" etc.
    return product.manufacturer.replace(/\s*—\s*демо\s*$/i, '').trim()
  }
  return ''
}

function formatShelfLine(product, lang, t) {
  const cat = CATEGORY_LABELS[product.category] || (lang === 'kz' ? 'Тауарлар' : 'Товары')
  const shelf = product.shelf ? String(product.shelf).replace(/^Полка\s*/i, '').trim() : ''
  return shelf ? `${cat} · ${lang === 'kz' ? 'Сөре' : 'Полка'} ${shelf}` : cat
}

export default function ProductScreen() {
  const { ean, storeSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useProfile()
  const { user } = useAuth()
  const { lang, t } = useI18n()
  const { currentStore } = useStore()
  const [moreOpen, setMoreOpen] = useState(false)
  const { checkIsFavorite, toggleFavorite } = useUserData()

  const activeStoreSlug = storeSlug || currentStore?.slug || null
  const product = useMemo(() => {
    const known = getAnyKnownProductByRef(ean, activeStoreSlug)
    const stateProduct = coerceProductEntity(location.state?.product)

    if (known) return known
    if (stateProduct && stateProduct.ean === ean) return stateProduct
    return stateProduct || null
  }, [ean, activeStoreSlug, location.state])
  const isFavorite = checkIsFavorite(product?.ean)

  const handleToggleFavorite = async () => {
    if (!user) {
      navigate('/auth')
      return
    }
    await toggleFavorite(product)
  }

  if (!product) {
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p>{t.common.notFound}</p>
          <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate(buildCatalogPath(activeStoreSlug))}>
            {t.product.backToList}
          </button>
        </div>
      </div>
    )
  }

  const { fits, reasons } = checkProductFit(product, profile)
  const rating = ratingFromQuality(product.qualityScore)

  const manufacturerText = getManufacturerText(product)
  const nutrition = product.nutritionPer100
  const isFood = product.category === 'grocery'
  const hasStoreOverlay = Boolean(product.isStoreProduct || activeStoreSlug) && (product.priceKzt != null || product.shelf || product.stockStatus)

  const keySpecs = useMemo(() => {
    const entries = Object.entries(product.specs || {})
    // Keep stable ordering: most important first for MVP
    return entries.slice(0, 6)
  }, [product])

  const showMoreAvailable = Boolean(
    product.ingredients ||
      product.storage ||
      product.expiry ||
      manufacturerText ||
      (product.images && product.images.length > 1) ||
      (product.fullSpecs && Object.keys(product.fullSpecs).length > 0)
  )

  return (
    <div className="screen">
      {/* Header */}
      <div className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{
            width: 38, height: 38, borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div className="screen-title" style={{ margin: 0 }}>{t.product.title}</div>
        </div>
        <button onClick={handleToggleFavorite} style={{
            width: 38, height: 38, borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.1)',
            background: isFavorite ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            transition: 'all 0.2s ease',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? '#EF4444' : 'none'} stroke={isFavorite ? '#EF4444' : 'rgba(255,255,255,0.8)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
        </button>
      </div>

      {/* Product Card */}
      <div className="section">
        <div className="card" style={{ marginBottom: 0 }}>
          {/* Category + shelf */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  color: 'var(--text)',
                  opacity: 0.92,
                }}
              >
                {formatShelfLine(product, lang, t)}
              </span>
              {product.demoData ? (
                <span
                  style={{
                    fontSize: 11,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: 'var(--text-dim)',
                  }}
                >
                  демо
                </span>
              ) : null}
            </div>

            {/* Rating */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <Stars value={rating} />
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{rating.toFixed(1)} / 5</div>
            </div>
          </div>

          {/* Image on top */}
          <div className="product-hero" style={{ marginBottom: 12 }}>
            <HeroImage product={product} t={t} />
          </div>

          {/* Name */}
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1.25,
              marginBottom: 6,
              color: 'var(--text)',
            }}
          >
            {product.name}
          </h2>

          {/* Price + Manufacturer */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 26,
                fontWeight: 900,
                color: 'var(--primary-bright)',
              }}
            >
              {formatPrice(product.priceKzt)}
            </span>
            {manufacturerText ? (
              <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{manufacturerText}</span>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{t.product.noManufacturer}</span>
            )}
          </div>

          {!hasStoreOverlay ? (
            <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-sub)', fontSize: 12, lineHeight: 1.5 }}>
              Глобальная карточка товара. Цена и полка магазина пока недоступны.
            </div>
          ) : null}

          {/* Characteristics */}
          <div style={{ marginTop: 8 }}>
            <div className="section-title" style={{ marginBottom: 8 }}>
              {t.product.characteristics}
              <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-dim)', fontWeight: 500 }}>
                {isFood ? `${t.product.nutrition} (${product.nutritionBase || t.product.nutritionPer100})` : t.product.mainParams}
              </span>
            </div>

            {isFood && nutrition ? (
              <div className="nutri-grid" style={{ marginBottom: 10 }}>
                {[
                  [t.product.protein, nutrition.protein, 'г'],
                  [t.product.fat, nutrition.fat, 'г'],
                  [t.product.carbs, nutrition.carbs, 'г'],
                  [t.product.kcal, nutrition.kcal, 'ккал'],
                ].map(([label, val, unit]) => (
                  <div key={label} className="nutri-item">
                    <div className="nutri-label">{label}</div>
                    <div className="nutri-value">
                      {val == null ? (
                        <span className="nutri-num">—</span>
                      ) : (
                        <>
                          <span className="nutri-num">{formatNutriNumber(val)}</span>
                          <span className="nutri-unit">{unit}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="spec-list" style={{ marginBottom: 10 }}>
                {keySpecs.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{t.product.specsLater}</div>
                ) : (
                  keySpecs.map(([k, v]) => (
                    <div key={k} className="info-row">
                      <span className="info-label">{humanizeSpecKey(k, lang)}</span>
                      <span className="info-value">{String(v)}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {showMoreAvailable && (
              <button
                onClick={() => setMoreOpen((s) => !s)}
                className="more-btn"
                type="button"
              >
                {moreOpen ? t.product.hide : t.product.more}
                <span style={{ marginLeft: 8, opacity: 0.9 }} aria-hidden="true">
                  {moreOpen ? '▴' : '▾'}
                </span>
              </button>
            )}

            {moreOpen && (
              <div style={{ marginTop: 10 }}>
                {product.ingredients ? (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>{t.product.ingredients}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.55 }}>{product.ingredients}</div>
                  </div>
                ) : null}

                {product.storage ? (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>{t.product.storage}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.55 }}>{product.storage}</div>
                  </div>
                ) : null}

                {product.expiry ? (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>{t.product.expiry}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>{product.expiry}</div>
                  </div>
                ) : null}

                {product.fullSpecs && Object.keys(product.fullSpecs).length > 0 ? (
                  <div style={{ marginBottom: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>{t.product.additionalSpecs}</div>
                    {Object.entries(product.fullSpecs).map(([k, v]) => (
                      <div key={k} className="info-row">
                        <span className="info-label">{humanizeSpecKey(k, lang)}</span>
                        <span className="info-value">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FIT / NOT FIT */}
      <div className="section" style={{ paddingTop: 0 }}>
        {/* Большой статус блок */}
        <div style={{
          borderRadius: 18,
          padding: '18px 20px',
          display: 'flex', alignItems: 'center', gap: 16,
          background: fits ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1.5px solid ${fits ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: fits ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {fits
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            }
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: fits ? '#10B981' : '#EF4444', fontFamily: 'var(--font-display)' }}>
              {fits ? t.product.fits : t.product.notFits}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              {fits ? t.product.fitsDesc : t.product.notFitsDesc}
            </div>
          </div>
        </div>

        {/* Причины */}
        {reasons.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reasons.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 14,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: r.type === 'good' ? '#10B981' : r.type === 'warn' ? '#F59E0B' : '#EF4444',
                }}/>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{r.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Buttons */}
      <div style={{ padding: '0 20px 28px', display: 'flex', gap: 10 }}>
        <button onClick={() => navigate(buildProductAlternativesPath(activeStoreSlug, product.ean))} style={{
          flex: 1, padding: '14px 10px', borderRadius: 16, cursor: 'pointer',
          background: 'rgba(124,58,237,0.12)', border: '1.5px solid rgba(124,58,237,0.4)',
          color: '#C4B5FD', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-display)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
          </svg>
          {t.common.alternatives}
        </button>
        <button onClick={() => navigate(buildProductAIPath(activeStoreSlug, product.ean))} style={{
          flex: 1, padding: '14px 10px', borderRadius: 16, cursor: 'pointer',
          background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
          border: 'none',
          color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-display)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
        }}>
          ✦ {t.common.askAI}
        </button>
      </div>
    </div>
  )
}

function HeroImage({ product, t }) {
  const [ok, setOk] = useState(true)
  const src = getPrimaryImage(product)
  if (!src || !ok) return <div className="product-hero-placeholder">{t.product.photoLater}</div>
  return (
    <img
      src={src}
      alt={product?.name || ''}
      className="product-hero-img"
      loading="lazy"
      onError={() => setOk(false)}
    />
  )
}

function formatNutriNumber(val) {
  const n = Number(val)
  if (Number.isNaN(n)) return String(val)
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function humanizeSpecKey(key, lang) {
  return (
    {
      volume: lang === 'kz' ? 'Көлемі' : 'Объём',
      weight: lang === 'kz' ? 'Салмағы' : 'Вес',
      fat: lang === 'kz' ? 'Майлылығы' : 'Жирность',
      protein: lang === 'kz' ? 'Ақуыз' : 'Белки',
      sugar: lang === 'kz' ? 'Қант' : 'Сахар',
      calories: lang === 'kz' ? 'Калория' : 'Калории',
      length: lang === 'kz' ? 'Ұзындығы' : 'Длина',
      maxPower: lang === 'kz' ? 'Қуаты' : 'Мощность',
      standard: 'Стандарт',
      power: lang === 'kz' ? 'Қуаты' : 'Мощность',
      type: lang === 'kz' ? 'Түрі' : 'Тип',
      anc: lang === 'kz' ? 'Шуды басу' : 'Шумоподавление',
      battery: 'Батарея',
      waterproof: lang === 'kz' ? 'Қорғаныс' : 'Защита',
      coverage: lang === 'kz' ? 'Шығын' : 'Расход',
      dryTime: lang === 'kz' ? 'Кебеді' : 'Сохнет',
      moisture: lang === 'kz' ? 'Ылғалға төзімді' : 'Влагостойкость',
      brand: 'Бренд',
      model: 'Модель',
      material: 'Материал',
      size: lang === 'kz' ? 'Өлшем' : 'Размер',
    }[key] || key
  )
}
