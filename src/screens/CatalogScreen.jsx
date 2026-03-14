import { useMemo, useState } from 'react'
import { useI18n } from '../utils/i18n.js'
import { useNavigate } from 'react-router-dom'
import products from '../data/products.json'
import { checkProductFit, formatPrice } from '../utils/fitCheck.js'
import { loadProfile } from '../utils/profile.js'

const CATEGORY_ORDER = ['grocery', 'electronics', 'diy']

const FILTERS = [
  { id: 'all',         label: 'Все' },
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
        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 10 }} />
    )
  }
  const colors = { grocery: '#10B981', electronics: '#60A5FA', diy: '#FCD34D' }
  const cat = product.category
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 36, fontWeight: 800,
      color: colors[cat] || '#A78BFA',
    }}>
      {product.name[0]}
    </div>
  )
}

export default function CatalogScreen() {
  const navigate = useNavigate()
  const { lang } = useI18n()
  const profile  = loadProfile()
  const [q, setQ] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [sortOpen, setSortOpen] = useState(false)
  const [sort, setSort] = useState('fit')

  const hasProfile = Boolean(
    profile?.halal || profile?.halalOnly ||
    profile?.allergens?.length || profile?.dietGoals?.length
  )

  const list = useMemo(() => {
    let arr = products.slice()

    if (activeFilter === 'fit') {
      if (hasProfile) arr = arr.filter(p => checkProductFit(p, profile).fits)
    } else if (activeFilter !== 'all') {
      arr = arr.filter(p => p.category === activeFilter)
    }

    const query = q.trim().toLowerCase()
    if (query) arr = arr.filter(p =>
      `${p.name} ${(p.tags || []).join(' ')}`.toLowerCase().includes(query)
    )

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

      {/* ── Хедер ── */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          {/* Заголовок */}
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900,
              color: '#fff', letterSpacing: '-0.5px', lineHeight: 1,
            }}>
              {lang === 'kz' ? 'Каталог' : 'Каталог'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(167,139,250,0.7)', marginTop: 3, fontWeight: 500 }}>
              {lang === 'kz' ? `${products.length} тауар базада` : `${products.length} товаров в базе`}
            </div>
          </div>

          {/* Сортировка */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSortOpen(o => !o)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 12,
              background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.35)',
              color: '#C4B5FD', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
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
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 190,
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

        {/* Поиск */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 14, padding: '11px 14px', marginBottom: 14,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(160,160,200,0.6)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#fff', fontSize: 14, fontFamily: 'var(--font-body)', flex: 1,
            }}
            placeholder={lang === 'kz' ? 'Тауарды іздеу...' : 'Поиск продуктов...'} value={q} onChange={e => setQ(e.target.value)}
          />
          {q && (
            <button onClick={() => setQ('')} style={{
              background: 'none', border: 'none',
              color: 'rgba(160,160,200,0.6)', cursor: 'pointer', fontSize: 18, lineHeight: 1,
            }}>×</button>
          )}
        </div>

        {/* Фильтры */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 18 }}>
          {filterOptions.map(f => {
            if (f.id === 'fit' && !hasProfile) return null
            const active = activeFilter === f.id
            return (
              <button key={f.id} onClick={() => setActiveFilter(f.id)} style={{
                flexShrink: 0, padding: '8px 18px', borderRadius: 24,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                background: active ? '#7C3AED' : 'rgba(255,255,255,0.06)',
                border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                color: active ? '#fff' : 'rgba(200,200,240,0.75)',
                boxShadow: active ? '0 2px 14px rgba(124,58,237,0.45)' : 'none',
                transition: 'all 0.18s ease',
              }}>
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Сетка ── */}
      <div style={{ padding: '0 16px 100px' }}>
        {list.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'rgba(160,160,200,0.6)' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
            <p style={{ fontSize: 14 }}>{lang === 'kz' ? 'Ештеңе табылмады' : 'Ничего не найдено'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {list.map(product => {
              const fitResult = hasProfile ? checkProductFit(product, profile) : null
              const fits = fitResult?.fits ?? null
              const nutriscore = product.nutriscore || product.nutriScore
              const brand = typeof product.manufacturer === 'object'
                ? product.manufacturer?.name
                : product.manufacturer

              return (
                <div key={product.id} onClick={() => navigate(`/product/${product.id}`)}
                  style={{
                    borderRadius: 18,
                    background: 'linear-gradient(160deg, #13132a 0%, #0d0d1f 100%)',
                    border: `1px solid ${fits === true ? 'rgba(16,185,129,0.25)' : fits === false ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer', overflow: 'hidden',
                    boxShadow: fits === true ? '0 4px 20px rgba(16,185,129,0.08)' : '0 4px 16px rgba(0,0,0,0.2)',
                  }}>

                  {/* Фото */}
                  <div style={{ position: 'relative', padding: '10px 10px 0' }}>
                    <div style={{
                      height: 120, borderRadius: 12,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <ProductThumb product={product} />
                    </div>

                    {/* Бейдж fit — правый верхний угол внутри паддинга */}
                    {fits !== null && (
                      <div style={{
                        position: 'absolute', top: 18, right: 18,
                        width: 36, height: 36, borderRadius: 11,
                        background: fits ? '#10B981' : '#EF4444',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: fits ? '0 2px 8px rgba(16,185,129,0.5)' : '0 2px 8px rgba(239,68,68,0.4)',
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                          {fits
                            ? <polyline points="20 6 9 17 4 12"/>
                            : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                          }
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Инфо */}
                  <div style={{ padding: '10px 12px 14px' }}>
                    {brand && (
                      <div style={{ fontSize: 11, color: 'rgba(167,139,250,0.6)', marginBottom: 3, fontWeight: 600, letterSpacing: '0.3px' }}>
                        {brand}
                      </div>
                    )}
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: 'rgba(235,235,255,0.92)',
                      lineHeight: 1.35, marginBottom: 10,
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {product.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: 15,
                        fontWeight: 800, color: '#A78BFA',
                      }}>
                        {formatPrice(product.priceKzt)}
                      </span>
                      {nutriscore && (
                        <div style={{
                          padding: '3px 8px', borderRadius: 7,
                          background: NUTRISCORE_COLORS[nutriscore.toUpperCase()] || '#555',
                          fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '0.3px',
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
