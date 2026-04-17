import { useMemo, useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { checkProductFit, formatPrice, CATEGORY_LABELS } from '../utils/fitCheck.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useI18n } from '../utils/i18n.js'
import { useUserData } from '../contexts/UserDataContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { useOffline } from '../contexts/OfflineContext.jsx'
import { getAnyKnownProductByRef } from '../utils/storeCatalog.js'
import { coerceProductEntity } from '../domain/product/normalizers.js'
import {
  buildCatalogPath,
  buildProductAIPath,
  buildProductAlternativesPath,
} from '../utils/routes.js'
import { buildAuthNavigateState } from '../utils/authFlow.js'

function formatNutriNumber(val) {
  const n = Number(val)
  if (Number.isNaN(n)) return String(val)
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function getHighestSeverity(reasons, fits) {
  if (reasons.some((r) => r.type === 'danger'))
    return {
      type: 'danger',
      color: '#EF4444',
      bg: 'rgba(239,68,68,0.12)',
      border: 'rgba(239,68,68,0.3)',
      title: 'Не подходит',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
    }

  if (reasons.some((r) => r.type === 'warning'))
    return {
      type: 'warning',
      color: '#F97316',
      bg: 'rgba(249,115,22,0.12)',
      border: 'rgba(249,115,22,0.3)',
      title: 'Не рекомендуется',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
    }

  if (reasons.some((r) => r.type === 'caution'))
    return {
      type: 'caution',
      color: '#FBBF24',
      bg: 'rgba(251,191,36,0.12)',
      border: 'rgba(251,191,36,0.3)',
      title: 'С осторожностью',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    }

  if (fits === false)
    return {
      type: 'danger',
      color: '#EF4444',
      bg: 'rgba(239,68,68,0.12)',
      border: 'rgba(239,68,68,0.3)',
      title: 'Не подходит',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    }

  return {
    type: 'good',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.3)',
    title: 'Подходит',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  }
}

function ImageCarousel({ images, fallbackEan }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollRef = useRef(null)

  const finalImages =
    images && images.length > 0 ? images : fallbackEan ? [`/products/${fallbackEan}.png`] : []

  if (finalImages.length === 0) {
    return (
      <div
        style={{
          height: 320,
          borderRadius: 24,
          background: 'rgba(255,255,255,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-dim)',
          fontSize: 14,
        }}
      >
        Нет фото
      </div>
    )
  }

  const handleScroll = () => {
    if (!scrollRef.current) return
    const scrollLeft = scrollRef.current.scrollLeft
    const width = scrollRef.current.offsetWidth
    const newIndex = Math.round(scrollLeft / width)
    setCurrentIndex(newIndex)
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 320,
        borderRadius: 24,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          width: '100%',
          height: '100%',
        }}
      >
        {finalImages.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              scrollSnapAlign: 'start',
              flexShrink: 0,
            }}
            onError={(e) => {
              // Скрываем битые картинки
              e.target.style.display = 'none'
            }}
          />
        ))}
      </div>
      {finalImages.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {finalImages.map((_, i) => (
            <div
              key={i}
              style={{
                width: currentIndex === i ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: currentIndex === i ? '#fff' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TrafficLight({ label, value, unit, thresholds }) {
  const numValue = Number(value)
  let color = '#10B981'
  let text = 'Низкое'

  if (!Number.isNaN(numValue) && value != null) {
    if (numValue > thresholds[1]) {
      color = '#EF4444' // Red
      text = 'Высокое'
    } else if (numValue > thresholds[0]) {
      color = '#F59E0B' // Amber
      text = 'Среднее'
    }
  } else {
    color = 'none'
    text = ''
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 14,
        marginBottom: 8,
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
          {value == null ? '—' : `${formatNutriNumber(value)} ${unit}`}
        </span>
        {color !== 'none' && (
          <div style={{ display: 'flex', gap: 3 }}>
            <div
              style={{
                width: 14,
                height: 6,
                borderRadius: 3,
                background: color === '#10B981' ? color : 'rgba(255,255,255,0.1)',
                boxShadow: color === '#10B981' ? `0 0 8px ${color}80` : 'none',
              }}
            />
            <div
              style={{
                width: 14,
                height: 6,
                borderRadius: 3,
                background: color === '#F59E0B' ? color : 'rgba(255,255,255,0.1)',
                boxShadow: color === '#F59E0B' ? `0 0 8px ${color}80` : 'none',
              }}
            />
            <div
              style={{
                width: 14,
                height: 6,
                borderRadius: 3,
                background: color === '#EF4444' ? color : 'rgba(255,255,255,0.1)',
                boxShadow: color === '#EF4444' ? `0 0 8px ${color}80` : 'none',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function HighlightedIngredients({ text, allergens = [] }) {
  if (!text) return null

  // Добавляем частые аллергены + те, что пришли из базы
  const dangerWords = [
    ...new Set([
      ...allergens.map((a) => a.toLowerCase()),
      'молок',
      'соя',
      'сои',
      'арахис',
      'орех',
      'пшениц',
      'яйц',
      'глютен',
      'е-',
      'e-',
      'диоксид',
      'консервант',
    ]),
  ]

  if (dangerWords.length === 0) return <span>{text}</span>

  const regex = new RegExp(`(${dangerWords.join('|')})`, 'gi')
  const parts = text.split(regex)

  return (
    <span style={{ lineHeight: 1.6 }}>
      {parts.map((part, i) =>
        dangerWords.some((w) => part.toLowerCase().includes(w)) ? (
          <strong key={i} style={{ color: '#EF4444', fontWeight: 600 }}>
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  )
}

function getManufacturerText(product) {
  if (!product) return ''
  if (product.manufacturer && typeof product.manufacturer === 'object') {
    const name = product.manufacturer.name || ''
    const country = product.manufacturer.country || ''
    return [name, country].filter(Boolean).join(' · ')
  }
  if (typeof product.manufacturer === 'string') {
    return product.manufacturer.replace(/\s*—\s*демо\s*$/i, '').trim()
  }
  return product.brand || ''
}

export default function ProductScreen() {
  const { ean, storeSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useProfile()
  const { user } = useAuth()
  const { lang, t } = useI18n()
  const { currentStore } = useStore()
  const { checkIsFavorite, toggleFavorite } = useUserData()
  const { isOnline, formatCacheAge } = useOffline()

  const [ingredientsExpanded, setIngredientsExpanded] = useState(false)

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
      navigate('/auth', {
        state: buildAuthNavigateState(location, {
          reason: 'favorites_requires_auth',
          message:
            lang === 'kz'
              ? 'Таңдаулыларға қосу үшін аккаунтқа кіріңіз.'
              : 'Войдите, чтобы добавлять товары в избранное.',
        }),
      })
      return
    }
    await toggleFavorite(product)
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
        }}
      >
        <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p>{t.common.notFound}</p>
          <button
            className="btn btn-secondary"
            style={{ marginTop: 16 }}
            onClick={() => navigate(buildCatalogPath(activeStoreSlug))}
          >
            {t.product.backToList}
          </button>
        </div>
      </div>
    )
  }

  const { fits, reasons } = checkProductFit(product, profile)
  const severity = getHighestSeverity(reasons, fits)

  const manufacturerText = getManufacturerText(product)
  const nutrition = product.nutritionPer100 || {}
  const hasStoreOverlay = Boolean(product.isStoreProduct) || Boolean(activeStoreSlug)

  // Collect Tags
  const tags = []
  if (product.halalStatus === 'halal')
    tags.push({ label: 'Халяль', icon: '✅', color: '#10B981', bg: 'rgba(16,185,129,0.15)' })
  if (product.dietTags?.includes('vegan'))
    tags.push({ label: 'Веган', icon: '🌱', color: '#10B981', bg: 'rgba(16,185,129,0.15)' })
  if (product.dietTags?.includes('gluten_free'))
    tags.push({ label: 'Без глютена', icon: '🌾', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' })
  if (product.dietTags?.includes('sugar_free'))
    tags.push({ label: 'Без сахара', icon: '🍬', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' })

  return (
    <div className="screen" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(12,12,14,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span
          style={{
            fontSize: 17,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.01em',
          }}
        >
          Детали
        </span>
        <button
          onClick={handleToggleFavorite}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.1)',
            background: isFavorite ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={isFavorite ? '#EF4444' : 'none'}
            stroke={isFavorite ? '#EF4444' : 'rgba(255,255,255,0.9)'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Gallery */}
        <ImageCarousel images={product.images} fallbackEan={product.ean} />

        {/* 4-Level Fit-Check Status overlapping or right below image */}
        <div
          style={{
            marginTop: 16,
            background: severity.bg,
            border: `1.5px solid ${severity.border}`,
            borderRadius: 20,
            padding: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: severity.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
              boxShadow: `0 4px 12px ${severity.color}60`,
            }}
          >
            <div style={{ width: 24, height: 24 }}>{severity.icon}</div>
          </div>
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: severity.color,
                fontFamily: 'var(--font-display)',
                marginBottom: 4,
              }}
            >
              {severity.title}
            </div>
            {reasons.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {reasons.map((r, i) => (
                  <div
                    key={i}
                    style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}
                  >
                    • {r.text}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                Идеально подходит под ваш профиль
              </div>
            )}
          </div>
          {!isOnline && formatCacheAge() && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
              {t.scan.offlineCacheLabel} ({formatCacheAge()})
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ marginTop: 20 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              lineHeight: 1.2,
              color: 'var(--text)',
              marginBottom: 6,
            }}
          >
            {product.name}
          </h1>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 16 }}>
            {manufacturerText}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              flexWrap: 'wrap',
              marginBottom: 16,
            }}
          >
            {product.priceKzt != null ? (
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: '#fff',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {formatPrice(product.priceKzt)}
              </span>
            ) : null}
            {!hasStoreOverlay && (
              <span
                style={{
                  fontSize: 12,
                  padding: '4px 10px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: 'var(--text-sub)',
                }}
              >
                Глобальная карточка
              </span>
            )}
            {product.shelf && (
              <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                • Полка {product.shelf}
              </span>
            )}
          </div>

          {/* Elegant Dietary Tags row */}
          {tags.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                scrollbarWidth: 'none',
                paddingBottom: 4,
                marginBottom: 20,
              }}
            >
              {tags.map((t) => (
                <div
                  key={t.label}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '6px 14px',
                    borderRadius: 100,
                    background: t.bg,
                    color: t.color,
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    border: `1px solid ${t.color}30`,
                  }}
                >
                  <span>{t.icon}</span> {t.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compact KBZHU (Macros Grid) */}
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
            Пищевая ценность (на 100г)
          </h3>
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: 4,
            }}
          >
            {[
              ['Ккал', nutrition.kcal || nutrition.energy_kcal_100g, ''],
              ['Белки', nutrition.protein || nutrition.proteins_100g, 'г'],
              ['Жиры', nutrition.fat || nutrition.fat_100g, 'г'],
              ['Углеводы', nutrition.carbs || nutrition.carbohydrates_100g, 'г'],
            ].map(([l, v, u]) => (
              <div
                key={l}
                style={{
                  flex: 1,
                  minWidth: 75,
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  padding: '12px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                  {v == null ? '—' : formatNutriNumber(v)}
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-dim)',
                      marginLeft: 2,
                      fontWeight: 500,
                    }}
                  >
                    {u}
                  </span>
                </div>
                <div
                  style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 4, fontWeight: 500 }}
                >
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sugar & Salt Traffic Lights */}
        <div style={{ marginTop: 20 }}>
          <TrafficLight
            label="Сахар"
            value={nutrition.sugars_100g || nutrition.sugars}
            unit="г"
            thresholds={[5, 22.5]}
          />
          <TrafficLight
            label="Соль"
            value={nutrition.salt_100g || nutrition.salt}
            unit="г"
            thresholds={[0.3, 1.5]}
          />
        </div>

        {/* Expandable Ingredients */}
        {product.ingredients && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
              Состав
            </h3>
            <div
              style={{
                background: 'rgba(255,255,255,0.02)',
                padding: '16px',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.05)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: ingredientsExpanded ? 'unset' : 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  fontSize: 13,
                  color: 'var(--text-sub)',
                }}
              >
                <HighlightedIngredients
                  text={product.ingredients}
                  allergens={product.allergens || []}
                />
              </div>

              {/* Elegant expand button */}
              <button
                onClick={() => setIngredientsExpanded(!ingredientsExpanded)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  paddingTop: 12,
                  marginTop: ingredientsExpanded ? 10 : 4,
                  background: 'none',
                  border: 'none',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  color: 'var(--primary-bright)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {ingredientsExpanded ? (
                  <>
                    Свернуть{' '}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ marginLeft: 4 }}
                    >
                      <path d="M18 15l-6-6-6 6" />
                    </svg>
                  </>
                ) : (
                  <>
                    Весь состав{' '}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ marginLeft: 4 }}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(12,12,14,0.95)',
          backdropFilter: 'blur(20px)',
          padding: '16px 20px 32px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate(buildProductAlternativesPath(activeStoreSlug, product.ean))}
            style={{
              flex: 1,
              padding: '15px 10px',
              borderRadius: 16,
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: 15,
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
            Альтернативы
          </button>
          <button
            onClick={() => navigate(buildProductAIPath(activeStoreSlug, product.ean))}
            style={{
              flex: 1,
              padding: '15px 10px',
              borderRadius: 16,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
              border: 'none',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 8px 24px rgba(124,58,237,0.3)',
            }}
          >
            ✦ Спросить AI
          </button>
        </div>
        <button
          onClick={() => {
            sessionStorage.setItem('korset_compare_a', JSON.stringify(product))
            navigate(buildCatalogPath(activeStoreSlug))
          }}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 16,
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            color: 'var(--text-sub)',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            compare_arrows
          </span>
          {t.compare?.btnLabel || 'Добавить к сравнению'}
        </button>
      </div>
    </div>
  )
}
