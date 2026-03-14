import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import products from '../data/products.json'
import { checkProductFit, formatPrice } from '../utils/fitCheck.js'
import { loadProfile } from '../utils/profile.js'

const CATEGORY_ORDER = ['grocery', 'electronics', 'diy']

const FILTERS = [
  { id: 'fit',         label: 'Для вас' },
  { id: 'grocery',     label: 'Продукты' },
  { id: 'electronics', label: 'Электроника' },
  { id: 'diy',         label: 'Стройка' },
]

const SORT_OPTIONS = [
  { id: 'fit',    label: 'Подходящие мне' },
  { id: 'cheap',  label: 'Сначала дешевле' },
  { id: 'pricey', label: 'Сначала дороже' },
  { id: 'rating', label: 'По рейтингу' },
]

const NUTRISCORE_COLORS = {
  A: '#1a7c1a', B: '#4a9a1a', C: '#d4b800', D: '#e07000', E: '#c0392b'
}

function ProductThumb({ product }) {
  const [imgOk, setImgOk] = useState(true)
  const src = product.images?.[0]
  if (src && imgOk) {
    return (
      <img src={src} alt={product.name} onError={() => setImgOk(false)}
        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 12 }} />
    )
  }
  const colors = { grocery: '#10B981', electronics: '#60A5FA', diy: '#FCD34D' }
  const bgs    = { grocery: 'rgba(16,185,129,0.1)', electronics: 'rgba(96,165,250,0.1)', diy: 'rgba(252,211,77,0.1)' }
  const cat = product.category
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: bgs[cat] || 'rgba(167,139,250,0.08)',
      fontSize: 32, fontWeight: 800,
      color: colors[cat] || '#A78BFA', fontFamily: 'var(--font-display)',
    }}>
      {product.name[0]}
    </div>
  )
}

export default function CatalogScreen() {
  const navigate  = useNavigate()
  const profile   = loadProfile()
  const [q, setQ] = useState('')
  const [activeFilter, setActiveFilter] = useState('fit')
  const [sortOpen, setSortOpen] = useState(false)
  const [sort, setSort] = useState('fit')

  const hasProfile = Boolean(
    profile?.halal || profile?.halalOnly ||
    profile?.allergens?.length || profile?.dietGoals?.length
  )

  const list = useMemo(() => {
    let arr = products.slice()

    // Фильтр
    if (activeFilter === 'fit') {
      if (hasProfile) arr = arr.filter(p => checkProductFit(p, profile).fits)
    } else {
      arr = arr.filter(p => p.category === activeFilter)
    }

    // Поиск
    const query = q.trim().toLowerCase()
    if (query) arr = arr.filter(p =>
      `${p.name} ${(p.tags || []).join(' ')}`.toLowerCase().includes(query)
    )

    // Сортировка
    arr.sort((a, b) => {
      if (sort === 'cheap')  return a.priceKzt - b.priceKzt
      if (sort === 'pricey') return b.priceKzt - a.priceKzt
      if (sort === 'rating') return (b.qualityScore || 0) - (a.qualityScore || 0)
      if (hasProfile) {
        const af = checkProductFit(a, profile).fits ? 0 : 1
        const bf = checkProductFit(b, profile).fits ? 0 : 1
        if (af !== bf) return af - bf
      }
      const ao = CATEGORY_ORDER.indexOf(a.category)
      const bo = CATEGORY_ORDER.indexOf(b.category)
      if (ao !== bo) return ao - bo
      return (b.qualityScore || 0) - (a.qualityScore || 0)
    })

    return arr
  }, [q, activeFilter, sort, hasProfile])

  const activeSort = SORT_OPTIONS.find(s => s.id === sort)

  return (
    <div className="screen" onClick={() => setSortOpen(false)}>
      <div className="header" style={{ paddingTop: 52, paddingBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
            Каталог <span style={{ color: 'rgba(167,139,250,0.6)', fontSize: 20 }}>•</span>
          </div>
          {/* Сортировка */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSortOpen(o => !o)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 12,
              background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)',
              color: '#C4B5FD', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M7 12h10M11 18h2"/>
              </svg>
              {activeSort?.label}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ transform: sortOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {sortOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 180,
                background: '#151525', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, overflow: 'hidden',
                boxShadow: '0 12px 32px rgba(0,0,0,0.5)', zIndex: 200,
              }}>
                {SORT_OPTIONS.map((opt, i) => {
                  if (opt.id === 'fit' && !hasProfile) return null
                  const active = sort === opt.id
                  return (
                    <button key={opt.id} onClick={() => { setSort(opt.id); setSortOpen(false) }}
                      style={{
                        width: '100%', padding: '11px 14px',
                        background: active ? 'rgba(124,58,237,0.15)' : 'transparent',
                        border: 'none',
                        borderBottom: i < SORT_OPTIONS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        cursor: 'pointer', textAlign: 'left',
                        fontSize: 13, fontFamily: 'var(--font-body)',
                        color: active ? '#C4B5FD' : 'rgba(220,220,250,0.85)',
                        fontWeight: active ? 700 : 400,
                      }}>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px 24px' }}>

        {/* Поиск */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 14, padding: '11px 14px', marginBottom: 14,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(160,160,200,0.7)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#fff', fontSize: 14, fontFamily: 'var(--font-body)', flex: 1,
            }}
            placeholder="Поиск продуктов..." value={q} onChange={e => setQ(e.target.value)}
          />
          {q && (
            <button onClick={() => setQ('')} style={{
              background: 'none', border: 'none', color: 'rgba(160,160,200,0.7)',
              cursor: 'pointer', fontSize: 18, lineHeight: 1,
            }}>×</button>
          )}
        </div>

        {/* Фильтры — горизонтальные чипсы */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 16 }}>
          {FILTERS.map(f => {
            const active = activeFilter === f.id
            if (f.id === 'fit' && !hasProfile) return null
            return (
              <button key={f.id} onClick={() => setActiveFilter(f.id)} style={{
                flexShrink: 0, padding: '8px 16px', borderRadius: 24,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                background: active ? '#7C3AED' : 'rgba(255,255,255,0.06)',
                border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                color: active ? '#fff' : 'rgba(200,200,240,0.8)',
                boxShadow: active ? '0 2px 12px rgba(124,58,237,0.4)' : 'none',
                transition: 'all 0.18s ease',
              }}>
                {f.label}
              </button>
            )
          })}
        </div>

        {/* Сетка 2 колонки */}
        {list.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(160,160,200,0.7)' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
            <p style={{ fontSize: 14 }}>Ничего не найдено</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {list.map(product => {
              const fitResult = hasProfile ? checkProductFit(product, profile) : null
              const fits = fitResult?.fits ?? null
              const nutriscore = product.nutriscore || product.nutriScore

              return (
                <div key={product.id} onClick={() => navigate(`/product/${product.id}`)}
                  style={{
                    borderRadius: 18,
                    background: '#0F0F1A',
                    border: `1px solid ${fits === true ? 'rgba(16,185,129,0.2)' : fits === false ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)'}`,
                    cursor: 'pointer', overflow: 'hidden',
                    transition: 'transform 0.15s ease',
                  }}>

                  {/* Фото с бейджем */}
                  <div style={{ position: 'relative', padding: 10, background: 'rgba(255,255,255,0.02)' }}>
                    {/* Внутренний квадрат с фото */}
                    <div style={{
                      height: 110, borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      overflow: 'hidden',
                    }}>
                      <ProductThumb product={product} />
                    </div>

                    {/* Бейдж — только иконка, не закрывает фото */}
                    {fits !== null && (
                      <div style={{
                        position: 'absolute', top: 16, right: 16,
                        width: 26, height: 26, borderRadius: 8,
                        background: fits ? 'rgba(16,185,129,0.92)' : 'rgba(239,68,68,0.88)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                          {fits
                            ? <polyline points="20 6 9 17 4 12"/>
                            : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                          }
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Инфо */}
                  <div style={{ padding: '10px 12px 12px' }}>
                    {/* Бренд */}
                    {product.manufacturer && (
                      <div style={{ fontSize: 11, color: 'rgba(160,160,200,0.6)', marginBottom: 3, fontWeight: 500 }}>
                        {typeof product.manufacturer === 'object'
                          ? product.manufacturer.name
                          : product.manufacturer}
                      </div>
                    )}

                    {/* Название */}
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: 'rgba(235,235,255,0.95)',
                      lineHeight: 1.35, marginBottom: 8,
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {product.name}
                    </div>

                    {/* Цена + Nutriscore */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: 15,
                        fontWeight: 800, color: '#A78BFA',
                      }}>
                        {formatPrice(product.priceKzt)}
                      </span>

                      {nutriscore && (
                        <div style={{
                          padding: '3px 8px', borderRadius: 8,
                          background: NUTRISCORE_COLORS[nutriscore.toUpperCase()] || '#555',
                          fontSize: 11, fontWeight: 800, color: '#fff',
                          letterSpacing: '0.3px',
                        }}>
                          {nutriscore.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
" " 
