import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import products from '../data/products.json'
import { checkProductFit, formatPrice, CATEGORY_LABELS } from '../utils/fitCheck.js'
import { loadProfile } from '../utils/profile.js'

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'grocery', label: 'Продукты' },
  { id: 'electronics', label: 'Электроника' },
  { id: 'diy', label: 'Стройка' },
]
const SORTS = [
  { id: 'fit', label: 'Подходящие' },
  { id: 'cheap', label: 'Дешевле' },
  { id: 'quality', label: 'По качеству' },
]

// Smart product thumbnail — handles any aspect ratio nicely
function ProductThumb({ product }) {
  const [imgOk, setImgOk] = useState(true)
  const src = product.images?.[0]

  if (src && imgOk) {
    return (
      <img
        src={src}
        alt={product.name}
        onError={() => setImgOk(false)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          padding: 4,
        }}
      />
    )
  }

  // Fallback: category icon + first letter
  const letter = product.name[0]
  const colors = {
    grocery: { bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
    electronics: { bg: 'rgba(59,130,246,0.12)', color: '#60A5FA' },
    diy: { bg: 'rgba(245,158,11,0.12)', color: '#FCD34D' },
  }
  const c = colors[product.category] || colors.grocery

  return (
    <div style={{
      width: '100%', height: '100%',
      background: c.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 10,
      fontFamily: 'var(--font-display)',
      fontSize: 22, fontWeight: 800,
      color: c.color,
    }}>
      {letter}
    </div>
  )
}

export default function CatalogScreen() {
  const navigate = useNavigate()
  const profile = loadProfile()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('fit')

  const hasProfile = Boolean(
    profile?.halal || profile?.halalOnly ||
    profile?.allergens?.length ||
    profile?.sugarFree ||
    profile?.dietGoals?.length
  )

  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    let arr = products.slice()
    if (cat !== 'all') arr = arr.filter(p => p.category === cat)
    if (query) arr = arr.filter(p => `${p.name} ${p.tags?.join(' ') || ''}`.toLowerCase().includes(query))

    if (sort === 'cheap') arr.sort((a, b) => a.priceKzt - b.priceKzt)
    else if (sort === 'quality') arr.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))
    else if (sort === 'fit' && hasProfile) {
      arr.sort((a, b) => {
        const af = checkProductFit(a, profile).fits ? 0 : 1
        const bf = checkProductFit(b, profile).fits ? 0 : 1
        return af - bf
      })
    }

    return arr
  }, [q, cat, sort])

  return (
    <div className="screen">
      <div className="header">
        <div className="header-row" style={{ justifyContent: 'center' }}>
          <div className="screen-title">Товары</div>
        </div>
      </div>

      <div className="section" style={{ paddingTop: 14 }}>
        {/* Search */}
        <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
            <path d="M21 21l-4.3-4.3"/><circle cx="11" cy="11" r="7"/>
          </svg>
          <input
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', flex: 1,
            }}
            placeholder="Поиск по товарам..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {q && (
            <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* Category filters */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 2 }}>
          {CATEGORY_FILTERS.map(c => (
            <button key={c.id} className={`chip ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>{c.label}</button>
          ))}
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {SORTS.map(s => (
            <button key={s.id} className={`chip ${sort === s.id ? 'active' : ''}`} onClick={() => setSort(s.id)}>{s.label}</button>
          ))}
        </div>

        {/* Product list */}
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((product, i) => {
            const fitResult = hasProfile ? checkProductFit(product, profile) : null
            const fits = fitResult?.fits ?? null

            return (
              <div
                key={product.id}
                onClick={() => navigate(`/product/${product.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  background: 'var(--card)',
                  border: '1px solid',
                  borderColor: fits === true ? 'rgba(16,185,129,0.2)' : fits === false ? 'rgba(220,38,38,0.15)' : 'var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  animationDelay: `${i * 0.02}s`,
                }}
              >
                {/* Thumbnail — fixed square, smart fill */}
                <div style={{
                  width: 56, height: 56, flexShrink: 0,
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}>
                  <ProductThumb product={product} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 500, color: 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    lineHeight: 1.3,
                  }}>
                    {product.name}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: 15,
                      fontWeight: 700, color: 'var(--primary-bright)',
                    }}>
                      {formatPrice(product.priceKzt)}
                    </span>
                    <span style={{
                      fontSize: 11, color: 'var(--text-dim)',
                      background: 'var(--border)', padding: '2px 8px', borderRadius: 20,
                    }}>
                      {product.shelf}
                    </span>
                  </div>
                </div>

                {/* Fit indicator — bigger and clearer */}
                {fits !== null && (
                  <div style={{
                    flexShrink: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 2, minWidth: 44,
                  }}>
                    <div style={{
                      width: 36, height: 36,
                      borderRadius: '50%',
                      background: fits ? 'rgba(16,185,129,0.15)' : 'rgba(220,38,38,0.12)',
                      border: `1.5px solid ${fits ? 'rgba(16,185,129,0.4)' : 'rgba(220,38,38,0.3)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18,
                    }}>
                      {fits ? '✓' : '✕'}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: fits ? 'var(--success-bright)' : 'var(--error-bright)',
                    }}>
                      {fits ? 'Ок' : 'Нет'}
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          {list.length === 0 && (
            <div style={{ padding: '32px 4px', textAlign: 'center', color: 'var(--text-dim)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
              <p>Ничего не найдено</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
