import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { loadProfile } from '../utils/profile.js'
import { useI18n } from '../utils/i18n.js'

const ALLERGEN_MAP = {
  'en:milk': 'milk', 'en:gluten': 'gluten', 'en:nuts': 'nuts',
  'en:peanuts': 'peanuts', 'en:soybeans': 'soy', 'en:eggs': 'eggs',
  'en:fish': 'fish', 'en:crustaceans': 'shellfish', 'en:wheat': 'gluten',
  'en:sesame-seeds': 'sesame', 'en:celery': 'celery', 'en:mustard': 'mustard',
}

export const ALLERGEN_NAMES = {
  milk: 'Молоко', gluten: 'Глютен', nuts: 'Орехи', peanuts: 'Арахис',
  soy: 'Соя', eggs: 'Яйца', fish: 'Рыба', shellfish: 'Моллюски',
  sesame: 'Кунжут', celery: 'Сельдерей', mustard: 'Горчица',
}

const NUTRISCORE_COLORS = {
  a: { bg: 'rgba(3,129,65,0.15)', border: 'rgba(3,129,65,0.4)', text: '#22c55e' },
  b: { bg: 'rgba(133,187,47,0.15)', border: 'rgba(133,187,47,0.4)', text: '#84cc16' },
  c: { bg: 'rgba(254,203,2,0.15)', border: 'rgba(254,203,2,0.4)', text: '#eab308' },
  d: { bg: 'rgba(238,129,0,0.15)', border: 'rgba(238,129,0,0.4)', text: '#f97316' },
  e: { bg: 'rgba(230,62,17,0.15)', border: 'rgba(230,62,17,0.4)', text: '#ef4444' },
}

function parseAllergens(product) {
  const raw = product.allergens_tags || product.allergens_hierarchy || []
  return [...new Set(raw.map(a => ALLERGEN_MAP[a]).filter(Boolean))]
}

function detectHalal(labelsTag = []) {
  if (labelsTag.some(t => t.includes('halal'))) return true
  if (labelsTag.some(t => t.includes('pork') || t.includes('alcohol'))) return false
  return null
}

function checkFit(product, profile) {
  const reasons = []
  const halalOn = profile.halal || profile.halalOnly || profile.religion?.includes('halal')
  const ingredients = (product.ingredients || '').toLowerCase()
  const allergens = product.allergens || []

  if (halalOn) {
    if (product.isHalal === true) {
      // позитив добавим ниже
    } else if (product.isHalal === false) {
      reasons.push({ type: 'fail', text: lang === 'kz' ? 'Халал емес' : 'Не является халал' })
    } else {
      reasons.push({ type: 'warn', text: lang === 'kz' ? 'Халал мәртебесі белгісіз — қаптамадан тексеріңіз' : 'Халал-статус неизвестен — уточните по упаковке' })
    }
  }

  const profileAllergens = profile.allergens || []
  const found = allergens.filter(a => profileAllergens.includes(a))
  found.forEach(a => reasons.push({ type: 'fail', text: lang === 'kz' ? `Құрамында аллерген бар: ${ALLERGEN_NAMES[a] || a}` : `Содержит аллерген: ${ALLERGEN_NAMES[a] || a}` }))

  const customAllergens = profile.customAllergens || []
  customAllergens.forEach(ca => {
    if (ingredients.includes(ca.toLowerCase()))
      reasons.push({ type: 'fail', text: lang === 'kz' ? `Құрамында бар: ${ca}` : `Содержит: ${ca}` })
  })

  const goals = profile.dietGoals || []

  if (goals.includes('sugar_free') || profile.sugarFree) {
    const sw = ['сахар', 'sugar', 'sucre', 'zucker', 'глюкоз', 'фруктоз', 'сироп']
    if (sw.some(w => ingredients.includes(w)))
      reasons.push({ type: 'fail', text: lang === 'kz' ? 'Қант бар' : 'Содержит сахар' })
  }

  if (goals.includes('dairy_free')) {
    const dw = ['молок', 'сливк', 'масло слив', 'сметан', 'сыр', 'milk', 'cream', 'butter', 'cheese', 'whey', 'casein', 'лактоз']
    if (allergens.includes('milk') || dw.some(w => ingredients.includes(w)))
      reasons.push({ type: 'fail', text: lang === 'kz' ? 'Сүт өнімдері бар' : 'Содержит молочные продукты' })
  }

  if (goals.includes('gluten_free')) {
    if (allergens.includes('gluten') || allergens.includes('wheat') ||
        ['пшениц', 'wheat', 'gluten', 'ячмен', 'рожь'].some(w => ingredients.includes(w)))
      reasons.push({ type: 'fail', text: lang === 'kz' ? 'Глютен бар' : 'Содержит глютен' })
  }

  if (goals.includes('vegan')) {
    const mw = ['говядин', 'свинин', 'курин', 'мясо', 'beef', 'pork', 'chicken', 'meat']
    if (allergens.includes('milk') || allergens.includes('eggs') || mw.some(w => ingredients.includes(w)))
      reasons.push({ type: 'fail', text: lang === 'kz' ? 'Вегандарға сай емес' : 'Не подходит для веганов' })
  }

  const fits = !reasons.some(r => r.type === 'fail')

  if (fits) {
    const pos = []
    if (halalOn && product.isHalal === true) pos.push({ type: 'pass', text: lang === 'kz' ? 'Халал екені расталды ✓' : 'Подтверждено как халал ✓' })
    if (profileAllergens.length > 0 && allergens.length === 0) pos.push({ type: 'pass', text: lang === 'kz' ? 'Сіздің аллергендеріңіз жоқ ✓' : 'Не содержит ваших аллергенов ✓' })
    if (pos.length === 0) pos.push({ type: 'pass', text: lang === 'kz' ? 'Таңдауыңызға сәйкес келеді' : 'Соответствует вашим предпочтениям' })
    return { fits, reasons: [...reasons, ...pos].slice(0, 3) }
  }

  return { fits, reasons: reasons.slice(0, 3) }
}

function formatNutri(val) {
  if (val == null) return null
  const n = Number(val)
  if (isNaN(n)) return null
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function NutriGrid({ nutrition }) {
  const items = [
    [lang === 'kz' ? 'Ақуыз' : 'Белки', nutrition.protein, 'г'],
    [lang === 'kz' ? 'Май' : 'Жиры', nutrition.fat, 'г'],
    [lang === 'kz' ? 'Көмірсу' : 'Углеводы', nutrition.carbs, 'г'],
    ['Ккал', nutrition.kcal, 'ккал'],
  ]
  if (!items.some(([, v]) => v != null)) return null
  return (
    <div className="nutri-grid" style={{ marginBottom: 10 }}>
      {items.map(([label, val, unit]) => (
        <div key={label} className="nutri-item">
          <div className="nutri-label">{label}</div>
          <div className="nutri-value">
            {val == null
              ? <span className="nutri-num">—</span>
              : <><span className="nutri-num">{formatNutri(val)}</span><span className="nutri-unit">{unit}</span></>
            }
          </div>
        </div>
      ))}
    </div>
  )
}

function NutriscoreBadge({ grade }) {
  if (!grade) return null
  const g = grade.toLowerCase()
  const c = NUTRISCORE_COLORS[g]
  if (!c) return null
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 999,
      background: c.bg, border: `1px solid ${c.border}`,
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600 }}>Nutri-Score</span>
      <span style={{ fontSize: 16, fontWeight: 900, fontFamily: 'var(--font-display)', color: c.text }}>
        {g.toUpperCase()}
      </span>
    </div>
  )
}

function ProductHeroImage({ src, name }) {
  const [ok, setOk] = useState(true)
  if (!src || !ok) {
    return (
      <div className="product-hero-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
        📦
      </div>
    )
  }
  return (
    <img src={src} alt={name} className="product-hero-img" loading="lazy" onError={() => setOk(false)} />
  )
}

export default function ExternalProductScreen() {
  const { ean } = useParams()
  const navigate = useNavigate()
  const { state: navState } = useLocation()
  const profile = loadProfile()
  const { lang } = useI18n()

  const [status, setStatus] = useState('loading')
  const [product, setProduct] = useState(null)
  const [fitResult, setFitResult] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    if (navState?.product) {
      const p = navState.product
      setProduct(p)
      setFitResult(checkFit(p, profile))
      setStatus('found')
      return
    }

    async function fetchProduct() {
      try {
        const res = await fetch(
          `https://world.openfoodfacts.org/api/v2/product/${ean}?fields=product_name,brands,image_front_url,nutriments,allergens_tags,allergens_hierarchy,ingredients_text_ru,ingredients_text,quantity,labels_tags,nutriscore_grade`,
          { signal: AbortSignal.timeout(10000) }
        )
        const data = await res.json()
        if (data.status === 0 || !data.product?.product_name) { setStatus('notfound'); return }

        const p = data.product
        const allergens = parseAllergens(p)
        const nutr = p.nutriments || {}
        const parsed = {
          ean,
          name: p.product_name || lang === 'kz' ? 'Белгісіз тауар' : 'Неизвестный товар',
          brand: p.brands || '',
          image: p.image_front_url || null,
          quantity: p.quantity || '',
          ingredients: p.ingredients_text_ru || p.ingredients_text || '',
          allergens,
          isHalal: detectHalal(p.labels_tags || []),
          nutriscore: p.nutriscore_grade || null,
          nutrition: {
            kcal:    nutr['energy-kcal_100g'] ?? null,
            protein: nutr.proteins_100g ?? null,
            fat:     nutr.fat_100g ?? null,
            carbs:   nutr.carbohydrates_100g ?? null,
            sugar:   nutr.sugars_100g ?? null,
            fiber:   nutr.fiber_100g ?? null,
          },
        }
        setProduct(parsed)
        setFitResult(checkFit(parsed, profile))
        setStatus('found')
      } catch {
        setStatus('error')
      }
    }
    fetchProduct()
  }, [ean])

  if (status === 'loading') {
    return (
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--primary-dim)', borderTopColor: 'var(--primary)', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>{lang === 'kz' ? 'Тауарды дерекқордан іздеп жатырмын...' : 'Ищу товар в базе данных...'}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (status === 'notfound' || status === 'error') {
    return (
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 56 }}>🔍</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{lang === 'kz' ? 'Тауар табылмады' : 'Товар не найден'}</div>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.6 }}>
          {status === 'error'
            ? lang === 'kz' ? 'Интернетке қосылу жоқ немесе сервер уақытша қолжетімсіз.' : 'Нет подключения к интернету или сервер временно недоступен.'
            : lang === 'kz' ? 'Бұл штрихкод біздің каталогта да, Open Food Facts базасында да табылмады.' : 'Этот штрихкод не найден в нашем каталоге и в мировой базе Open Food Facts.'}
        </p>
        <p style={{ color: 'var(--text-dim)', fontSize: 12, fontFamily: 'monospace', opacity: 0.6 }}>EAN: {ean}</p>
        <button className="btn btn-primary btn-full" style={{ marginTop: 8 }} onClick={() => navigate('/scan')}>
          Сканировать ещё раз
        </button>
        <button className="btn btn-secondary btn-full" onClick={() => navigate(-1)}>{lang === 'kz' ? '← Артқа' : '← Назад'}</button>
      </div>
    )
  }

  const { fits, reasons } = fitResult
  const nutr = product.nutrition
  const hasNutr = Object.values(nutr).some(v => v != null)
  const showMore = Boolean(product.ingredients || nutr.sugar != null || nutr.fiber != null)

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
          <div className="screen-title">{lang === 'kz' ? 'Тауар картасы' : 'Карточка товара'}</div>
        </div>
      </div>

      {/* Карточка товара */}
      <div className="section">
        <div className="card" style={{ marginBottom: 0 }}>

          {/* Строка: категория + Nutriscore */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.02em', color: 'var(--text)', opacity: 0.9 }}>
              Продукты питания
            </span>
            <NutriscoreBadge grade={product.nutriscore} />
          </div>

          {/* Фото */}
          <div className="product-hero" style={{ marginBottom: 12 }}>
            <ProductHeroImage src={product.image} name={product.name} />
          </div>

          {/* Название */}
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, lineHeight: 1.25, marginBottom: 6, color: 'var(--text)' }}>
            {product.name}
          </h2>

          {/* Бренд + объём */}
          {(product.brand || product.quantity) && (
            <div style={{ fontSize: 14, color: 'var(--text-sub)', marginBottom: 10 }}>
              {[product.brand, product.quantity].filter(Boolean).join(' · ')}
            </div>
          )}

          {/* КБЖУ */}
          {hasNutr && (
            <div style={{ marginTop: 8 }}>
              <div className="section-title" style={{ marginBottom: 8 }}>
                Характеристики
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-dim)', fontWeight: 500 }}>
                  КБЖУ (на 100 г/мл)
                </span>
              </div>
              <NutriGrid nutrition={nutr} />
            </div>
          )}

          {showMore && (
            <button onClick={() => setMoreOpen(s => !s)} className="more-btn" type="button">
              {moreOpen ? (lang === 'kz' ? 'Жасыру' : 'Скрыть') : (lang === 'kz' ? 'Қосымша' : 'Дополнительно')}
              <span style={{ marginLeft: 8, opacity: 0.9 }}>{moreOpen ? '▴' : '▾'}</span>
            </button>
          )}

          {moreOpen && (
            <div style={{ marginTop: 10 }}>
              {(nutr.sugar != null || nutr.fiber != null) && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>{lang === 'kz' ? 'Қосымша' : 'Дополнительно'}</div>
                  {nutr.sugar != null && <div className="info-row"><span className="info-label">{lang === 'kz' ? 'Соның ішінде қант' : 'Из них сахар'}</span><span className="info-value">{formatNutri(nutr.sugar)} г</span></div>}
                  {nutr.fiber != null && <div className="info-row"><span className="info-label">{lang === 'kz' ? 'Жасұнық' : 'Клетчатка'}</span><span className="info-value">{formatNutri(nutr.fiber)} г</span></div>}
                </div>
              )}
              {product.ingredients && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>{lang === 'kz' ? 'Құрамы' : 'Состав'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.55 }}>{product.ingredients}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Подходит / Не подходит */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div className={`status-badge ${fits ? 'fit' : 'no-fit'}`}>
          <span className="status-icon">{fits ? '✅' : '❌'}</span>
          <div>
            <div className="status-text">{fits ? (lang === 'kz' ? 'Сәйкес келеді' : 'Подходит') : (lang === 'kz' ? 'Сәйкес емес' : 'Не подходит')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
              {fits ? (lang === 'kz' ? 'Профиліңізге сәйкес келеді' : 'Соответствует вашему профилю') : (lang === 'kz' ? 'Профиліңіз бойынша шектеулер бар' : 'Есть ограничения по вашему профилю')}
            </div>
          </div>
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>{lang === 'kz' ? 'Себептері' : 'Причины'}</div>
          {reasons.map((r, i) => (
            <div key={i} className="reason-item" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
              <div className={`reason-dot ${r.type}`} />
              <span className="reason-text">{r.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Аллергены */}
      {product.allergens.length > 0 && (
        <div className="section" style={{ paddingTop: 0 }}>
          <div className="section-title" style={{ marginBottom: 10 }}>{lang === 'kz' ? 'Аллергендер' : 'Аллергены'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {product.allergens.map(a => (
              <span key={a} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 13, background: 'rgba(220,38,38,0.1)', color: 'var(--error-bright)', border: '1px solid rgba(220,38,38,0.2)' }}>
                ⚠️ {ALLERGEN_NAMES[a] || a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          className="btn btn-secondary btn-full"
          onClick={() => navigate(`/product/ext/${ean}/ai`, { state: { product } })}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
            <path d="M4 14l1.2 3.2L8 18.4l-3.2 1.2L4 22l-1.2-2.4L0.6 18.4l2.2-1.2L4 14z" opacity="0.75" />
          </svg>
          Спросить AI
        </button>
      </div>

      <div style={{ padding: '0 20px 32px', fontSize: 11, color: 'var(--text-dim)', opacity: 0.45, textAlign: 'center' }}>
        {lang === 'kz' ? 'Дереккөз: Open Food Facts · EAN:' : 'Данные: Open Food Facts · EAN:'} {ean}
      </div>
    </div>
  )
}
