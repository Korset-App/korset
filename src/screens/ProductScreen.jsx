import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import products from '../data/products.json'
import { checkProductFit, formatPrice, CATEGORY_LABELS } from '../utils/fitCheck.js'
import { loadProfile } from '../utils/profile.js'

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

function ratingFromQuality(qualityScore) {
  const raw = (Number(qualityScore || 0) / 100) * 5
  // step 0.5
  return Math.round(raw * 2) / 2
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

function formatShelfLine(product) {
  const cat = CATEGORY_LABELS[product.category] || 'Товары'
  const shelf = product.shelf ? String(product.shelf).replace(/^Полка\s*/i, '').trim() : ''
  return shelf ? `${cat} · Полка ${shelf}` : cat
}

export default function ProductScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const profile = loadProfile()
  const [moreOpen, setMoreOpen] = useState(false)

  const product = useMemo(() => products.find((p) => p.id === id), [id])

  if (!product) {
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p>Товар не найден</p>
          <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/catalog')}>
            Назад к списку
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
      <div className="header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Назад
        </button>
        <div className="header-row">
          <div className="screen-title">Карточка товара</div>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: 'var(--primary-dim)',
              border: '1px solid rgba(139, 92, 246, 0.18)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--primary-bright)',
            }}
            aria-hidden="true"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8h12l-1 12H7L6 8Z" />
              <path d="M9 8a3 3 0 0 1 6 0" />
            </svg>
          </span>
        </div>
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
                {formatShelfLine(product)}
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
            {product.images?.[0] ? (
              <img src={product.images[0]} alt={product.name} className="product-hero-img" loading="lazy" />
            ) : (
              <div className="product-hero-placeholder">Фото добавим позже</div>
            )}
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
              <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Производитель не указан</span>
            )}
          </div>

          {/* Characteristics */}
          <div style={{ marginTop: 8 }}>
            <div className="section-title" style={{ marginBottom: 8 }}>
              Характеристики
              <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-dim)', fontWeight: 500 }}>
                {isFood ? `КБЖУ (${product.nutritionBase || 'на 100 г'})` : 'Основные параметры'}
              </span>
            </div>

            {isFood && nutrition ? (
              <div className="nutri-grid" style={{ marginBottom: 10 }}>
                {[
                  ['Белки', nutrition.protein, 'г'],
                  ['Жиры', nutrition.fat, 'г'],
                  ['Углеводы', nutrition.carbs, 'г'],
                  ['Ккал', nutrition.kcal, 'ккал'],
                ].map(([label, val, unit]) => (
                  <div key={label} className="nutri-item">
                    <div className="nutri-label">{label}</div>
                    <div className="nutri-value">
                      {val ?? '—'} {val != null ? unit : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="spec-list" style={{ marginBottom: 10 }}>
                {keySpecs.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Характеристики будут добавлены</div>
                ) : (
                  keySpecs.map(([k, v]) => (
                    <div key={k} className="info-row">
                      <span className="info-label">{humanizeSpecKey(k)}</span>
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
                {moreOpen ? 'Скрыть' : 'Дополнительно'}
                <span style={{ marginLeft: 8, opacity: 0.9 }} aria-hidden="true">
                  {moreOpen ? '▴' : '▾'}
                </span>
              </button>
            )}

            {moreOpen && (
              <div style={{ marginTop: 10 }}>
                {product.ingredients ? (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Состав</div>
                    <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.55 }}>{product.ingredients}</div>
                  </div>
                ) : null}

                {product.storage ? (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Условия хранения</div>
                    <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.55 }}>{product.storage}</div>
                  </div>
                ) : null}

                {product.expiry ? (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Срок хранения</div>
                    <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>{product.expiry}</div>
                  </div>
                ) : null}

                {product.fullSpecs && Object.keys(product.fullSpecs).length > 0 ? (
                  <div style={{ marginBottom: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Доп. характеристики</div>
                    {Object.entries(product.fullSpecs).map(([k, v]) => (
                      <div key={k} className="info-row">
                        <span className="info-label">{humanizeSpecKey(k)}</span>
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
        <div className={`status-badge ${fits ? 'fit' : 'no-fit'}`}>
          <span className="status-icon">{fits ? '✅' : '❌'}</span>
          <div>
            <div className="status-text">{fits ? 'Подходит' : 'Не подходит'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
              {fits ? 'Соответствует вашему профилю' : 'Есть ограничения по вашему профилю'}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>Причины</div>
          {reasons.map((r, i) => (
            <div key={i} className="reason-item" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
              <div className={`reason-dot ${r.type}`} />
              <span className="reason-text">{r.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Buttons */}
      <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-primary btn-full" onClick={() => navigate(`/product/${id}/alternatives`)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
          Показать альтернативы
        </button>
        <button className="btn btn-secondary btn-full" onClick={() => navigate(`/product/${id}/ai`)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
            <path d="M4 14l1.2 3.2L8 18.4l-3.2 1.2L4 22l-1.2-2.4L0.6 18.4l2.2-1.2L4 14z" opacity="0.75" />
          </svg>
          Спросить AI
        </button>
      </div>
    </div>
  )
}

function humanizeSpecKey(key) {
  return (
    {
      volume: 'Объём',
      weight: 'Вес',
      fat: 'Жирность',
      protein: 'Белки',
      sugar: 'Сахар',
      calories: 'Калории',
      length: 'Длина',
      maxPower: 'Мощность',
      standard: 'Стандарт',
      power: 'Мощность',
      type: 'Тип',
      anc: 'Шумоподавление',
      battery: 'Батарея',
      waterproof: 'Защита',
      coverage: 'Расход',
      dryTime: 'Сохнет',
      moisture: 'Влагостойкость',
      brand: 'Бренд',
      model: 'Модель',
      material: 'Материал',
      size: 'Размер',
    }[key] || key
  )
}
