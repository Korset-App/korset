import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { loadProfile } from '../utils/profile.js'

const ALLERGEN_MAP = {
  'en:milk': 'milk', 'en:gluten': 'gluten', 'en:nuts': 'nuts',
  'en:peanuts': 'peanuts', 'en:soybeans': 'soy', 'en:eggs': 'eggs',
  'en:fish': 'fish', 'en:crustaceans': 'shellfish', 'en:wheat': 'gluten',
}
const ALLERGEN_NAMES = {
  milk: 'Молоко', gluten: 'Глютен', nuts: 'Орехи', peanuts: 'Арахис',
  soy: 'Соя', eggs: 'Яйца', fish: 'Рыба', shellfish: 'Моллюски',
}

function parseAllergens(product) {
  const raw = product.allergens_tags || product.allergens_hierarchy || []
  return raw.map(a => ALLERGEN_MAP[a]).filter(Boolean)
}

function checkFit(allergensList, profile) {
  const reasons = []
  const halalOn = profile.halal || profile.halalOnly

  if (halalOn) {
    // OFF doesn't reliably have halal info, so we flag as unknown
    reasons.push({ type: 'warn', text: 'Халал-статус неизвестен — уточните по упаковке' })
  }

  const profileAllergens = profile.allergens || []
  const found = allergensList.filter(a => profileAllergens.includes(a))
  found.forEach(a => reasons.push({ type: 'fail', text: `Содержит аллерген: ${ALLERGEN_NAMES[a] || a}` }))

  const goals = profile.dietGoals || []
  // check sugar
  if (goals.includes('sugar_free')) {
    reasons.push({ type: 'warn', text: 'Содержание сахара — смотрите КБЖУ' })
  }

  const hasFails = reasons.some(r => r.type === 'fail')
  return { fits: !hasFails, reasons }
}

function NutrRow({ label, value, unit }) {
  if (value == null || value === '') return null
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 14, color: 'var(--text-sub)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
        {typeof value === 'number' ? value.toFixed(1) : value}{unit && <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 3 }}>{unit}</span>}
      </span>
    </div>
  )
}

export default function ExternalProductScreen() {
  const { ean } = useParams()
  const navigate = useNavigate()
  const { state: navState } = useLocation()
  const profile = loadProfile()
  const [state, setState] = useState('loading')
  const [product, setProduct] = useState(null)
  const [fitResult, setFitResult] = useState(null)

  useEffect(() => {
    // Данные уже переданы через navigation state от сканера
    if (navState?.product) {
      const p = navState.product
      const allergens = p.allergens || []
      setProduct(p)
      setFitResult(checkFit(allergens, profile))
      setState('found')
      return
    }
    // Иначе фетчим напрямую из Open Food Facts
    async function fetchProduct() {
      try {
        const res = await fetch(
          `https://world.openfoodfacts.org/api/v2/product/${ean}?fields=product_name,brands,image_front_url,nutriments,allergens_tags,allergens_hierarchy,ingredients_text_ru,ingredients_text,quantity,labels_tags`,
          { signal: AbortSignal.timeout(8000) }
        )
        const data = await res.json()
        if (data.status === 0 || !data.product?.product_name) {
          setState('notfound')
          return
        }
        const p = data.product
        const allergens = parseAllergens(p)
        const nutr = p.nutriments || {}
        const parsed = {
          ean,
          name: p.product_name || 'Неизвестный товар',
          brand: p.brands || '',
          image: p.image_front_url || null,
          quantity: p.quantity || '',
          ingredients: p.ingredients_text_ru || p.ingredients_text || '',
          allergens,
          nutrition: {
            kcal:    nutr['energy-kcal_100g'] ?? null,
            protein: nutr.proteins_100g ?? null,
            fat:     nutr.fat_100g ?? null,
            carbs:   nutr.carbohydrates_100g ?? null,
            sugar:   nutr.sugars_100g ?? null,
            fiber:   nutr.fiber_100g ?? null,
          }
        }
        setProduct(parsed)
        setFitResult(checkFit(allergens, profile))
        setState('found')
      } catch {
        setState('error')
      }
    }
    fetchProduct()
  }, [ean])

  // ── Loading ──────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid var(--primary-dim)', borderTopColor: 'var(--primary)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Ищу товар в базе данных...</p>
        <p style={{ color: 'var(--text-dim)', fontSize: 12, opacity: 0.6 }}>EAN: {ean}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Not found ────────────────────────────────────────────────────────────
  if (state === 'notfound' || state === 'error') {
    return (
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 56 }}>🔍</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
          Товар не найден
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.6 }}>
          {state === 'error'
            ? 'Нет подключения к интернету или сервер недоступен.'
            : 'Этот штрихкод пока не зарегистрирован ни в нашем каталоге, ни в мировой базе Open Food Facts.'}
        </p>
        <p style={{ color: 'var(--text-dim)', fontSize: 12, fontFamily: 'monospace', opacity: 0.7 }}>EAN: {ean}</p>
        <button className="btn btn-primary btn-full" style={{ marginTop: 8 }} onClick={() => navigate(-1)}>
          ← Назад
        </button>
      </div>
    )
  }

  // ── Found ────────────────────────────────────────────────────────────────
  const fits = fitResult?.fits
  const reasons = fitResult?.reasons || []

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      {/* Header */}
      <div style={{
        padding: '52px 20px 20px',
        background: fits
          ? 'linear-gradient(180deg, rgba(16,185,129,0.1) 0%, transparent 100%)'
          : 'linear-gradient(180deg, rgba(220,38,38,0.08) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)',
      }}>
        <button onClick={() => navigate(-1)} style={{
          background: 'none', border: 'none', color: 'var(--text-dim)',
          fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)',
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: 0,
        }}>
          ← Назад
        </button>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* Image */}
          {product.image ? (
            <img src={product.image} alt={product.name} style={{
              width: 88, height: 88, objectFit: 'contain',
              borderRadius: 12, background: 'white', padding: 6, flexShrink: 0,
            }} />
          ) : (
            <div style={{
              width: 88, height: 88, borderRadius: 12, flexShrink: 0,
              background: 'var(--card)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, color: 'var(--text-dim)',
            }}>📦</div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
              {product.name}
            </div>
            {product.brand && (
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
                {product.brand}{product.quantity ? ` · ${product.quantity}` : ''}
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'monospace', opacity: 0.6 }}>
              EAN: {ean}
            </div>
          </div>
        </div>

        {/* Fit badge */}
        <div style={{
          marginTop: 16,
          padding: '12px 16px',
          borderRadius: 'var(--radius)',
          background: fits ? 'rgba(16,185,129,0.12)' : 'rgba(220,38,38,0.1)',
          border: `1px solid ${fits ? 'rgba(16,185,129,0.3)' : 'rgba(220,38,38,0.25)'}`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700,
            color: fits ? 'var(--success-bright)' : 'var(--error-bright)',
            marginBottom: reasons.length ? 8 : 0,
          }}>
            <span style={{ fontSize: 20 }}>{fits ? '✅' : '❌'}</span>
            {fits ? 'Подходит вам' : 'Не подходит вам'}
          </div>
          {reasons.map((r, i) => (
            <div key={i} style={{
              fontSize: 13, lineHeight: 1.5,
              color: r.type === 'fail' ? 'var(--error-bright)' : r.type === 'warn' ? '#FCD34D' : 'var(--success-bright)',
              paddingLeft: 30,
            }}>
              {r.type === 'fail' ? '⚠️ ' : r.type === 'warn' ? '⚡ ' : '✓ '}{r.text}
            </div>
          ))}
        </div>

        {/* Off-label */}
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-dim)', opacity: 0.6, textAlign: 'right' }}>
          Данные: Open Food Facts · Не в нашем каталоге
        </div>
      </div>

      {/* Allergens */}
      {product.allergens.length > 0 && (
        <div style={{ padding: '16px 20px 4px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
            Аллергены
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {product.allergens.map(a => (
              <span key={a} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 13,
                background: 'rgba(220,38,38,0.1)', color: 'var(--error-bright)',
                border: '1px solid rgba(220,38,38,0.2)',
              }}>⚠️ {ALLERGEN_NAMES[a] || a}</span>
            ))}
          </div>
        </div>
      )}

      {/* Nutrition */}
      {Object.values(product.nutrition).some(v => v != null) && (
        <div style={{ padding: '16px 20px 4px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
            КБЖУ (на 100 г/мл)
          </div>
          <div className="card" style={{ padding: '0 16px' }}>
            <NutrRow label="Калории" value={product.nutrition.kcal} unit="ккал" />
            <NutrRow label="Белки" value={product.nutrition.protein} unit="г" />
            <NutrRow label="Жиры" value={product.nutrition.fat} unit="г" />
            <NutrRow label="Углеводы" value={product.nutrition.carbs} unit="г" />
            <NutrRow label="Из них сахар" value={product.nutrition.sugar} unit="г" />
            <NutrRow label="Клетчатка" value={product.nutrition.fiber} unit="г" />
          </div>
        </div>
      )}

      {/* Ingredients */}
      {product.ingredients && (
        <div style={{ padding: '16px 20px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
            Состав
          </div>
          <div className="card" style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.7 }}>
            {product.ingredients}
          </div>
        </div>
      )}
    </div>
  )
}
