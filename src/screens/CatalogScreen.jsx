import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import products from '../data/products.json'
import { checkProductFit, formatPrice, CATEGORY_LABELS } from '../utils/fitCheck.js'
import { loadProfile } from '../utils/profile.js'

function CategoryIcon({ category }) {
  // Simple mono icons: no emoji "stickers".
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (category === 'electronics') {
    return (
      <svg {...common}>
        <rect x="7" y="2.5" width="10" height="19" rx="2" />
        <path d="M10 19h4" />
      </svg>
    )
  }
  if (category === 'diy') {
    return (
      <svg {...common}>
        <path d="M14 7l3 3" />
        <path d="M9 12l3 3" />
        <path d="M3 21l6-6" />
        <path d="M7 17l-2 2" />
        <path d="M12 12l7-7 2 2-7 7" />
      </svg>
    )
  }
  // grocery
  return (
    <svg {...common}>
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </svg>
  )
}

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'grocery', label: 'Продукты' },
  { id: 'electronics', label: 'Электроника' },
  { id: 'diy', label: 'Стройка' },
]

const SORTS = [
  { id: 'cheap', label: 'Сначала дешевле' },
  { id: 'expensive', label: 'Сначала дороже' },
  { id: 'quality', label: 'По качеству' },
]

export default function CatalogScreen() {
  const navigate = useNavigate()
  const profile = loadProfile()

  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('cheap')

  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    let arr = products.slice()

    if (cat !== 'all') arr = arr.filter((p) => p.category === cat)
    if (query) {
      arr = arr.filter((p) => {
        const hay = `${p.name} ${p.tags?.join(' ') || ''}`.toLowerCase()
        return hay.includes(query)
      })
    }

    if (sort === 'cheap') arr.sort((a, b) => a.priceKzt - b.priceKzt)
    if (sort === 'expensive') arr.sort((a, b) => b.priceKzt - a.priceKzt)
    if (sort === 'quality') arr.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))

    return arr
  }, [q, cat, sort])

  const hasProfile = Boolean(profile?.presetId || profile?.halalOnly || profile?.allergens?.length || profile?.sugarFree || profile?.dietGoals?.length)

  return (
    <div className="screen">
      <div className="header">
        <div className="header-row" style={{ justifyContent: 'center' }}>
          <div className="screen-title">Товары</div>
        </div>
        <div className="screen-subtitle" style={{ textAlign: 'center' }}>
          Поиск, фильтры и сортировка. Никаких лишних вкладок.
        </div>
      </div>

      <div className="section" style={{ paddingTop: 16 }}>
        <button className="btn btn-secondary btn-full" onClick={() => navigate('/scan')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="5" height="5" rx="1" />
            <rect x="16" y="3" width="5" height="5" rx="1" />
            <rect x="3" y="16" width="5" height="5" rx="1" />
            <path d="M16 16h5v5M16 16v5" />
          </svg>
          Найти товар по скану
        </button>

        <div style={{ marginTop: 12 }} className="card">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-dim)' }}>
              <path d="M21 21l-4.3-4.3" />
              <circle cx="11" cy="11" r="7" />
            </svg>
            <input
              className="ai-input"
              style={{ border: 'none', background: 'transparent', padding: 0 }}
              placeholder="Поиск по товарам..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {CATEGORY_FILTERS.map((c) => (
            <button
              key={c.id}
              className={`chip ${cat === c.id ? 'active' : ''}`}
              onClick={() => setCat(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {SORTS.map((s) => (
            <button
              key={s.id}
              className={`chip ${sort === s.id ? 'active' : ''}`}
              onClick={() => setSort(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((product, i) => {
            const fits = hasProfile ? checkProductFit(product, profile).fits : null
            return (
              <div
                key={product.id}
                className="product-item"
                style={{ animationDelay: `${i * 0.02}s` }}
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="product-emoji" style={{ display: 'grid', placeItems: 'center' }}>
                  <CategoryIcon category={product.category} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="product-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {product.name}
                  </div>
                  <div className="product-meta">
                    <span className="product-price">{formatPrice(product.priceKzt)}</span>
                    <span className="product-shelf">{product.shelf}</span>
                    <span className={`category-badge ${product.category}`}>{CATEGORY_LABELS[product.category]}</span>
                  </div>
                </div>
                {fits !== null && (
                  <span style={{ fontSize: 16, flexShrink: 0, color: fits ? 'var(--success-bright)' : 'var(--error-bright)' }}>
                    {fits ? '✓' : '×'}
                  </span>
                )}
              </div>
            )
          })}

          {list.length === 0 && (
            <div style={{ padding: '18px 4px', textAlign: 'center', color: 'var(--text-dim)' }}>
              Ничего не найдено. Попробуйте другое слово.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
