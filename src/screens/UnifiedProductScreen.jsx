
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useUserData } from '../contexts/UserDataContext.jsx'
import { useStoreId } from '../contexts/StoreContext.jsx'
import { useI18n } from '../utils/i18n.js'
import { checkProductFit, formatPrice, CATEGORY_LABELS } from '../utils/fitCheck.js'
import { resolveProductByRef, getDemoProductForEntity } from '../domain/product/resolver.js'
import { coerceProductEntity } from '../domain/product/normalizers.js'

function getPrimaryImage(product) {
  if (!product) return null
  if (product.image) return product.image
  if (product.images?.[0]) return product.images[0]
  if (product.ean) return `/products/${product.ean}.png`
  return null
}

function ratingFromQuality(qualityScore) {
  const raw = (Number(qualityScore || 0) / 100) * 5
  return Math.max(0, Math.min(5, Math.round(raw * 2) / 2))
}

function Star({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5l2.9 6.1 6.7.9-4.9 4.7 1.2 6.7L12 18.8 6.1 20.9 7.3 14.2 2.4 9.5l6.7-.9L12 2.5z"/>
    </svg>
  )
}

function StatusCard({ fits, reasons, t }) {
  const title = fits ? t.product.fits : t.product.notFits
  const subtitle = fits ? t.product.fitsDesc : t.product.notFitsDesc
  return (
    <div style={{
      background: fits ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
      border: `1px solid ${fits ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: reasons.length ? 12 : 0 }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          display: 'grid',
          placeItems: 'center',
          background: fits ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)',
          color: fits ? '#4ADE80' : '#F87171',
          fontWeight: 800,
        }}>
          {fits ? '✓' : '!'}
        </div>
        <div>
          <div style={{ fontWeight: 800, color: '#fff', fontSize: 15 }}>{title}</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>{subtitle}</div>
        </div>
      </div>
      {reasons.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reasons.map((reason, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ marginTop: 1, color: reason.type === 'fail' ? '#F87171' : '#4ADE80' }}>{reason.type === 'fail' ? '•' : '✓'}</span>
              <span style={{ color: '#E8E8FF', fontSize: 13, lineHeight: 1.45 }}>{reason.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NutritionGrid({ nutrition, t }) {
  const items = [
    [t.product.kcal, nutrition?.kcal, 'ккал'],
    [t.product.protein, nutrition?.protein, 'г'],
    [t.product.fat, nutrition?.fat, 'г'],
    [t.product.carbs, nutrition?.carbs, 'г'],
  ]
  if (!items.some(([, value]) => value != null)) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
      {items.map(([label, value, unit]) => (
        <div key={label} style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: 14,
        }}>
          <div style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 6 }}>{label}</div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>
            {value == null ? '—' : value}
            {value == null ? '' : <span style={{ color: 'var(--text-dim)', fontWeight: 600, fontSize: 12, marginLeft: 4 }}>{unit}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function UnifiedProductScreen({ mode = 'canonical' }) {
  const { id, ean } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useProfile()
  const { user } = useAuth()
  const { lang, t } = useI18n()
  const storeId = useStoreId()
  const { checkIsFavorite, toggleFavorite } = useUserData()

  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState(null)
  const [error, setError] = useState(null)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadProduct() {
      setLoading(true)
      setError(null)
      try {
        let nextProduct = location.state?.product ? coerceProductEntity(location.state.product) : null
        if (!nextProduct) {
          const ref = mode === 'external'
            ? { ean }
            : { canonicalId: id }
          nextProduct = await resolveProductByRef(ref, storeId)
        }
        if (!cancelled) {
          setProduct(nextProduct)
          setLoading(false)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Failed to load product')
          setLoading(false)
        }
      }
    }

    loadProduct()
    return () => { cancelled = true }
  }, [id, ean, mode, location.state, storeId])

  const demoProduct = useMemo(() => getDemoProductForEntity(product), [product])
  const fitResult = useMemo(() => (product ? checkProductFit(product, profile) : { fits: true, reasons: [] }), [product, profile])
  const isFavorite = checkIsFavorite(product?.ean)
  const productImage = getPrimaryImage(product)
  const manufacturerText = [product?.manufacturer?.name, product?.manufacturer?.country].filter(Boolean).join(' · ')
  const specsEntries = Object.entries(product?.specs || {}).filter(([, value]) => value)
  const rating = ratingFromQuality(product?.qualityScore)

  const goBack = () => navigate(-1)
  const goToAI = () => {
    if (!product) return
    navigate(`/product/${encodeURIComponent(product.canonicalId)}/ai`, { state: { product } })
  }
  const goToAlternatives = () => {
    if (!product) return
    navigate(`/product/${encodeURIComponent(product.canonicalId)}/alternatives`, { state: { product } })
  }

  const handleToggleFavorite = async () => {
    if (!user) {
      navigate('/auth')
      return
    }
    if (!product) return
    await toggleFavorite(product)
  }

  if (loading) {
    return (
      <div className="screen" style={{ display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid rgba(124,58,237,0.15)', borderTopColor: '#7C3AED', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <div>{t.common.loading}</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="screen" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>{t.common.notFound}</div>
          <div style={{ fontSize: 13 }}>{error || t.product.notFoundInDb}</div>
          <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/scan')}>{t.common.scanAgain}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(7,7,18,0.92)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px', paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={goBack}>{t.common.back}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>{product.brand || CATEGORY_LABELS[product.category] || t.product.foodCategory}</div>
          </div>
          <button onClick={handleToggleFavorite} style={{ width: 40, height: 40, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: isFavorite ? '#F87171' : '#fff', display: 'grid', placeItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
      </div>

      <div style={{ padding: '18px 20px 100px' }}>
        <div style={{
          background: 'linear-gradient(180deg, rgba(124,58,237,0.08), rgba(124,58,237,0.02))',
          border: '1px solid rgba(124,58,237,0.16)',
          borderRadius: 22,
          padding: 18,
          marginBottom: 18,
        }}>
          <div style={{ display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18, height: 210, marginBottom: 16, overflow: 'hidden' }}>
            {productImage ? (
              <img src={productImage} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 18 }} />
            ) : (
              <div style={{ fontSize: 56, opacity: 0.4 }}>📦</div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 22, lineHeight: 1.15 }}>{product.name}</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>{[product.brand, product.quantity].filter(Boolean).join(' · ') || '—'}</div>
            </div>
            {product.qualityScore != null && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{product.qualityScore}/100</div>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', marginTop: 4, color: 'var(--primary-bright)' }}>
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} filled={i < Math.round(rating)} />)}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {product.priceKzt != null && <span className="category-badge grocery" style={{ background: 'rgba(124,58,237,0.16)', color: '#D8B4FE' }}>{formatPrice(product.priceKzt)}</span>}
            {product.shelf && <span className="category-badge grocery">{product.shelf}</span>}
            {product.nutriscore && <span className="category-badge grocery">Nutri-Score {product.nutriscore}</span>}
            {product.source === 'demo' && <span className="category-badge grocery">{t.common.demo}</span>}
            {product.source === 'off' && <span className="category-badge grocery">Open Food Facts</span>}
          </div>

          <StatusCard fits={fitResult.fits} reasons={fitResult.reasons} t={t} />

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary btn-full" onClick={goToAI}>{t.common.askAI}</button>
            <button className="btn btn-secondary btn-full" disabled={!demoProduct} onClick={goToAlternatives} style={{ opacity: demoProduct ? 1 : 0.5 }}>
              {t.common.alternatives}
            </button>
          </div>
        </div>

        <div className="section" style={{ marginBottom: 16 }}>
          <div className="section-title">{t.product.characteristics}</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <InfoCard label={lang === 'kz' ? 'Санат' : 'Категория'} value={CATEGORY_LABELS[product.category] || product.category || '—'} />
              <InfoCard label={lang === 'kz' ? 'Халал' : 'Халал'} value={product.halalStatus === 'yes' ? 'Да' : product.halalStatus === 'no' ? 'Нет' : 'Неизвестно'} />
            </div>
            <InfoCard label={lang === 'kz' ? 'Өндіруші' : 'Производитель'} value={manufacturerText || t.product.noManufacturer} />
            {product.description && <InfoCard label={lang === 'kz' ? 'Сипаттама' : 'Описание'} value={product.description} multiline />}
          </div>
        </div>

        <div className="section" style={{ marginBottom: 16 }}>
          <div className="section-title">{t.product.nutrition} <span style={{ color: 'var(--text-dim)', fontSize: 12, fontWeight: 500 }}>{t.product.nutritionPer100}</span></div>
          <NutritionGrid nutrition={product.nutritionPer100} t={t} />
          {(product.nutritionPer100?.sugar != null || product.nutritionPer100?.fiber != null || product.nutritionPer100?.salt != null) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {product.nutritionPer100?.sugar != null && <InfoChip label={t.product.sugarOf} value={`${product.nutritionPer100.sugar} г`} />}
              {product.nutritionPer100?.fiber != null && <InfoChip label={t.product.fiber} value={`${product.nutritionPer100.fiber} г`} />}
              {product.nutritionPer100?.salt != null && <InfoChip label={lang === 'kz' ? 'Тұз' : 'Соль'} value={`${product.nutritionPer100.salt} г`} />}
            </div>
          )}
        </div>

        {(product.ingredients || product.allergens?.length || specsEntries.length > 0) && (
          <div className="section">
            <div className="section-title">{t.product.more}</div>
            {product.ingredients && <InfoCard label={t.product.ingredients} value={product.ingredients} multiline />}
            {product.allergens?.length > 0 && <InfoCard label={t.product.allergens} value={product.allergens.join(', ')} multiline />}
            {specsEntries.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setShowMore((value) => !value)}>{showMore ? t.product.hide : t.product.more}</button>
                {showMore && (
                  <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                    {specsEntries.map(([key, value]) => (
                      <InfoCard key={key} label={humanizeSpecKey(key, lang)} value={String(value)} multiline />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoCard({ label, value, multiline = false }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 14 }}>
      <div style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 6 }}>{label}</div>
      <div style={{ color: '#fff', fontSize: 13, lineHeight: multiline ? 1.55 : 1.35, whiteSpace: multiline ? 'normal' : 'nowrap', overflow: multiline ? 'visible' : 'hidden', textOverflow: multiline ? 'clip' : 'ellipsis' }}>{value || '—'}</div>
    </div>
  )
}

function InfoChip({ label, value }) {
  return (
    <span style={{ padding: '8px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#E8E8FF', fontSize: 12 }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}: </span>{value}
    </span>
  )
}

function humanizeSpecKey(key, lang) {
  const map = {
    weight: lang === 'kz' ? 'Салмақ' : 'Вес',
    storage: lang === 'kz' ? 'Сақтау' : 'Хранение',
    bestBefore: lang === 'kz' ? 'Жарамдылық мерзімі' : 'Срок хранения',
    caloriesPerUnit: lang === 'kz' ? '1 данаға ккал' : 'Ккал на штуку',
  }
  return map[key] || key
}
