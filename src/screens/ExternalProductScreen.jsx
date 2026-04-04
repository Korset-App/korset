import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { buildProductAIPath, buildScanPath } from '../utils/routes.js'
import { useI18n } from '../utils/i18n.js'
import { ALLERGEN_NAMES, OFF_ALLERGEN_MAP } from '../data/allergens.js'
import { coerceProductEntity } from '../domain/product/normalizers.js'

const ALLERGEN_MAP = OFF_ALLERGEN_MAP

const NUTRISCORE_COLORS = {
  a: { bg: 'rgba(3,129,65,0.15)', border: 'rgba(3,129,65,0.4)', text: '#22c55e' },
  b: { bg: 'rgba(133,187,47,0.15)', border: 'rgba(133,187,47,0.4)', text: '#84cc16' },
  c: { bg: 'rgba(254,203,2,0.15)', border: 'rgba(254,203,2,0.4)', text: '#eab308' },
  d: { bg: 'rgba(238,129,0,0.15)', border: 'rgba(238,129,0,0.4)', text: '#f97316' },
  e: { bg: 'rgba(230,62,17,0.15)', border: 'rgba(230,62,17,0.4)', text: '#ef4444' },
}

function parseAllergens(product) {
  const raw = product.allergens_tags || product.allergens_hierarchy || []
  return [...new Set(raw.map((item) => ALLERGEN_MAP[item]).filter(Boolean))]
}

function detectHalal(labelsTag = []) {
  if (labelsTag.some((tag) => tag.includes('halal'))) return true
  if (labelsTag.some((tag) => tag.includes('pork') || tag.includes('alcohol'))) return false
  return null
}

function toExternalProductShape(raw, lang) {
  if (!raw) return null

  // Already normalized canonical product from lookup/cache.
  if (raw.nutritionPer100 || raw.halalStatus || raw.sourceMeta) {
    const canonical = coerceProductEntity(raw)
    return {
      ean: canonical.ean,
      name: canonical.name || (lang === 'kz' ? 'Белгісіз тауар' : 'Неизвестный товар'),
      brand: canonical.brand || '',
      image: canonical.image || canonical.images?.[0] || null,
      quantity: canonical.quantity || '',
      ingredients: canonical.ingredients || '',
      allergens: canonical.allergens || [],
      isHalal: canonical.halalStatus === 'yes' ? true : canonical.halalStatus === 'no' ? false : null,
      nutriscore: canonical.nutriscore || null,
      nutrition: canonical.nutritionPer100 || {},
      source: canonical.source,
    }
  }

  // Raw OFF shape from direct fetch.
  const nutr = raw.nutriments || {}
  return {
    ean: raw.ean,
    name: raw.product_name || (lang === 'kz' ? 'Белгісіз тауар' : 'Неизвестный товар'),
    brand: raw.brands || '',
    image: raw.image_front_url || null,
    quantity: raw.quantity || '',
    ingredients: raw.ingredients_text_ru || raw.ingredients_text || '',
    allergens: parseAllergens(raw),
    isHalal: detectHalal(raw.labels_tags || []),
    nutriscore: raw.nutriscore_grade || null,
    nutrition: {
      kcal: nutr['energy-kcal_100g'] ?? null,
      protein: nutr.proteins_100g ?? null,
      fat: nutr.fat_100g ?? null,
      carbs: nutr.carbohydrates_100g ?? null,
      sugar: nutr.sugars_100g ?? null,
      fiber: nutr.fiber_100g ?? null,
    },
    source: 'openfoodfacts',
  }
}

function checkFit(product, profile, t) {
  const reasons = []
  const halalOn = profile.halal || profile.halalOnly || profile.religion?.includes('halal')
  const ingredients = (product.ingredients || '').toLowerCase()
  const allergens = product.allergens || []

  if (halalOn) {
    if (product.isHalal === false) reasons.push({ type: 'fail', text: t.product.halalNot })
    else if (product.isHalal == null) reasons.push({ type: 'warn', text: t.product.halalUnknown })
  }

  const profileAllergens = profile.allergens || []
  const found = allergens.filter((item) => profileAllergens.includes(item))
  found.forEach((item) => reasons.push({ type: 'fail', text: `${t.product.containsAllergen} ${ALLERGEN_NAMES[item] || item}` }))

  const customAllergens = profile.customAllergens || []
  customAllergens.forEach((item) => {
    if (ingredients.includes(item.toLowerCase())) reasons.push({ type: 'fail', text: `${t.product.contains} ${item}` })
  })

  const goals = profile.dietGoals || []
  if (goals.includes('sugar_free') || profile.sugarFree) {
    const sugarWords = ['сахар', 'sugar', 'sucre', 'zucker', 'глюкоз', 'фруктоз', 'сироп']
    if (sugarWords.some((word) => ingredients.includes(word))) reasons.push({ type: 'fail', text: t.product.containsSugar })
  }

  if (goals.includes('dairy_free')) {
    const dairyWords = ['молок', 'сливк', 'масло слив', 'сметан', 'сыр', 'milk', 'cream', 'butter', 'cheese', 'whey', 'casein', 'лактоз']
    if (allergens.includes('milk') || dairyWords.some((word) => ingredients.includes(word))) reasons.push({ type: 'fail', text: t.product.containsDairy })
  }

  if (goals.includes('gluten_free')) {
    if (allergens.includes('gluten') || allergens.includes('wheat') || ['пшениц', 'wheat', 'gluten', 'ячмен', 'рожь'].some((word) => ingredients.includes(word))) {
      reasons.push({ type: 'fail', text: t.product.containsGluten })
    }
  }

  if (goals.includes('vegan')) {
    const meatWords = ['говядин', 'свинин', 'курин', 'мясо', 'beef', 'pork', 'chicken', 'meat']
    if (allergens.includes('milk') || allergens.includes('eggs') || meatWords.some((word) => ingredients.includes(word))) {
      reasons.push({ type: 'fail', text: t.product.notForVegans })
    }
  }

  const fits = !reasons.some((reason) => reason.type === 'fail')

  if (fits) {
    const positive = []
    if (halalOn && product.isHalal === true) positive.push({ type: 'pass', text: t.product.halalConfirmed })
    if (profileAllergens.length > 0 && allergens.length === 0) positive.push({ type: 'pass', text: t.product.noAllergens })
    if (positive.length === 0) positive.push({ type: 'pass', text: t.product.matchesPrefs })
    return { fits, reasons: [...reasons, ...positive].slice(0, 3) }
  }

  return { fits, reasons: reasons.slice(0, 3) }
}

function formatNutri(val) {
  if (val == null) return null
  const n = Number(val)
  if (Number.isNaN(n)) return null
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function NutriGrid({ nutrition, t }) {
  const items = [
    [t.product.protein, nutrition.protein, 'г'],
    [t.product.fat, nutrition.fat, 'г'],
    [t.product.carbs, nutrition.carbs, 'г'],
    [t.product.kcal, nutrition.kcal, 'ккал'],
  ]
  if (!items.some(([, value]) => value != null)) return null
  return (
    <div className="nutri-grid" style={{ marginBottom: 10 }}>
      {items.map(([label, value, unit]) => (
        <div key={label} className="nutri-item">
          <div className="nutri-label">{label}</div>
          <div className="nutri-value">
            {value == null ? <span className="nutri-num">—</span> : <><span className="nutri-num">{formatNutri(value)}</span><span className="nutri-unit">{unit}</span></>}
          </div>
        </div>
      ))}
    </div>
  )
}

function NutriscoreBadge({ grade }) {
  if (!grade) return null
  const g = String(grade).toLowerCase()
  const c = NUTRISCORE_COLORS[g]
  if (!c) return null
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: c.bg, border: `1px solid ${c.border}` }}>
      <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600 }}>Nutri-Score</span>
      <span style={{ fontSize: 16, fontWeight: 900, fontFamily: 'var(--font-display)', color: c.text }}>{g.toUpperCase()}</span>
    </div>
  )
}

function ProductHeroImage({ src, name }) {
  const [ok, setOk] = useState(true)
  if (!src || !ok) {
    return <div className="product-hero-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>📦</div>
  }
  return <img src={src} alt={name} className="product-hero-img" loading="lazy" onError={() => setOk(false)} />
}

export default function ExternalProductScreen() {
  const { ean, storeSlug } = useParams()
  const navigate = useNavigate()
  const { state: navState } = useLocation()
  const { profile } = useProfile()
  const { currentStore } = useStore()
  const activeStoreSlug = storeSlug || currentStore?.slug || null
  const { lang, t } = useI18n()

  const [status, setStatus] = useState('loading')
  const [product, setProduct] = useState(null)
  const [fitResult, setFitResult] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (navState?.product) {
      const parsed = toExternalProductShape(navState.product, lang)
      setProduct(parsed)
      setFitResult(checkFit(parsed, profile, t))
      setStatus('found')
      return () => {}
    }

    async function fetchProduct() {
      try {
        const res = await fetch(`/api/off?ean=${encodeURIComponent(ean)}`, { signal: AbortSignal.timeout(10000) })
        if (!res.ok) {
          if (!cancelled) setStatus('error')
          return
        }
        const data = await res.json()
        if (!data?.product) {
          if (!cancelled) setStatus('notfound')
          return
        }

        const parsed = toExternalProductShape({ ...data.product, ean }, lang)
        if (!parsed?.name) {
          if (!cancelled) setStatus('notfound')
          return
        }

        if (!cancelled) {
          setProduct(parsed)
          setFitResult(checkFit(parsed, profile, t))
          setStatus('found')
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    fetchProduct()
    return () => {
      cancelled = true
    }
  }, [ean, navState, lang, profile, t])

  const nutr = useMemo(() => product?.nutrition || product?.nutritionPer100 || {}, [product])

  if (status === 'loading') {
    return (
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--primary-dim)', borderTopColor: 'var(--primary)', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>{t.product.searchingDb}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (status === 'notfound' || status === 'error' || !product || !fitResult) {
    return (
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 56 }}>🔍</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{t.scan.notFoundTitle}</div>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.6 }}>
          {status === 'error' ? t.product.noConnection : t.product.notFoundInDb}
        </p>
        <p style={{ color: 'var(--text-dim)', fontSize: 12, fontFamily: 'monospace', opacity: 0.6 }}>EAN: {ean}</p>
        <button className="btn btn-primary btn-full" style={{ marginTop: 8 }} onClick={() => navigate(buildScanPath(activeStoreSlug))}>{t.common.scanAgain}</button>
        <button className="btn btn-secondary btn-full" onClick={() => navigate(-1)}>{t.common.back}</button>
      </div>
    )
  }

  const { fits, reasons } = fitResult
  const hasNutr = Object.values(nutr || {}).some((value) => value != null)
  const showMore = Boolean(product.ingredients || nutr?.sugar != null || nutr?.fiber != null)

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          {t.common.back}
        </button>
        <div className="header-row"><div className="screen-title">{t.product.title}</div></div>
      </div>

      <div className="section">
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.02em', color: 'var(--text)', opacity: 0.9 }}>{t.product.foodCategory}</span>
            <NutriscoreBadge grade={product.nutriscore} />
          </div>

          <div className="product-hero" style={{ marginBottom: 12 }}>
            <ProductHeroImage src={product.image} name={product.name} />
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, lineHeight: 1.25, marginBottom: 6, color: 'var(--text)' }}>{product.name}</h2>
          {(product.brand || product.quantity) && <div style={{ fontSize: 14, color: 'var(--text-sub)', marginBottom: 10 }}>{[product.brand, product.quantity].filter(Boolean).join(' · ')}</div>}

          <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-sub)', fontSize: 12, lineHeight: 1.5 }}>
            Глобальная карточка товара. Цена и полка магазина пока недоступны.
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <button className="btn btn-primary btn-full" onClick={() => navigate(buildProductAIPath(activeStoreSlug, ean, true), { state: { product } })}>{t.common.askAI}</button>
          </div>

          <div style={{
            borderRadius: 18,
            padding: '18px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
            background: fits ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1.5px solid ${fits ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
            marginBottom: 16,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: fits ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {fits ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: fits ? '#10B981' : '#EF4444', fontFamily: 'var(--font-display)' }}>{fits ? t.product.fits : t.product.notFits}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{fits ? t.product.fitsDesc : t.product.notFitsDesc}</div>
            </div>
          </div>

          {reasons.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {reasons.map((reason, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: reason.type === 'pass' ? '#10B981' : reason.type === 'warn' ? '#F59E0B' : '#EF4444' }} />
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{reason.text}</span>
                </div>
              ))}
            </div>
          )}

          {hasNutr && (
            <>
              <div className="section-title" style={{ marginBottom: 8 }}>{t.product.nutrition} <span style={{ color: 'var(--text-dim)', fontSize: 12, fontWeight: 500 }}>{t.product.nutritionPer100}</span></div>
              <NutriGrid nutrition={nutr} t={t} />
            </>
          )}

          {showMore && (
            <div style={{ marginTop: 14 }}>
              <button className="more-btn" type="button" onClick={() => setMoreOpen((prev) => !prev)}>
                {moreOpen ? t.product.hide : t.product.more}
                <span style={{ marginLeft: 8, opacity: 0.9 }} aria-hidden="true">{moreOpen ? '▴' : '▾'}</span>
              </button>
              {moreOpen && (
                <div style={{ marginTop: 10 }}>
                  {product.ingredients && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>{t.product.ingredients}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.55 }}>{product.ingredients}</div>
                    </div>
                  )}
                  {product.allergens?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>{t.product.allergens}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.55 }}>{product.allergens.map((item) => ALLERGEN_NAMES[item] || item).join(', ')}</div>
                    </div>
                  )}
                  {nutr?.sugar != null && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>{t.product.sugarOf}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>{formatNutri(nutr.sugar)} г</div>
                    </div>
                  )}
                  {nutr?.fiber != null && (
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>{t.product.fiber}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>{formatNutri(nutr.fiber)} г</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
