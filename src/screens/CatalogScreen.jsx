import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import products from '../data/products.json'
import { checkProductFit, formatPrice } from '../utils/fitCheck.js'
import { loadProfile } from '../utils/profile.js'

const CATEGORY_ORDER = ['grocery', 'electronics', 'diy']
const CATEGORIES = [
  { id: 'grocery',     label: 'Продукты',       count: () => products.filter(p=>p.category==='grocery').length },
  { id: 'electronics', label: 'Электроника',     count: () => products.filter(p=>p.category==='electronics').length },
  { id: 'diy',         label: 'Стройматериалы',  count: () => products.filter(p=>p.category==='diy').length },
]
const SORT_OPTIONS = [
  { id: 'fit',    label: 'Подходящие мне', icon: 'M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { id: 'cheap',  label: 'Сначала дешевле',icon: 'M3 6l9-4 9 4v6c0 5-4 9-9 10C7 21 3 17 3 12V6z' },
  { id: 'pricey', label: 'Сначала дороже', icon: 'M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z' },
  { id: 'rating', label: 'По рейтингу',    icon: 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z' },
]

function ProductThumb({ product }) {
  const [imgOk, setImgOk] = useState(true)
  const src = product.images?.[0]
  if (src && imgOk) {
    return <img src={src} alt={product.name} onError={() => setImgOk(false)}
      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
  }
  const colors = { grocery: '#10B981', electronics: '#60A5FA', diy: '#FCD34D' }
  const bgs   = { grocery: 'rgba(16,185,129,0.08)', electronics: 'rgba(96,165,250,0.08)', diy: 'rgba(252,211,77,0.08)' }
  const cat = product.category
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: bgs[cat] || 'rgba(167,139,250,0.08)',
      fontSize: 22, fontWeight: 800,
      color: colors[cat] || '#A78BFA', fontFamily: 'var(--font-display)' }}>
      {product.name[0]}
    </div>
  )
}

// 2:1 wide badge on the right
function FitBadge({ fits }) {
  if (fits === null) return null
  return (
    <div style={{
      flexShrink: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 3,
      width: 52, minHeight: 52, borderRadius: 12,
      background: fits ? 'rgba(16,185,129,0.13)' : 'rgba(239,68,68,0.1)',
      border: `1.5px solid ${fits ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.35)'}`,
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke={fits ? '#10B981' : '#F87171'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {fits
          ? <polyline points="20 6 9 17 4 12"/>
          : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
      </svg>
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.3,
        color: fits ? '#10B981' : '#F87171' }}>
        {fits ? 'OK' : 'НЕТ'}
      </span>
    </div>
  )
}

export default function CatalogScreen() {
  const navigate = useNavigate()
  const profile = loadProfile()
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [sort, setSort] = useState('fit')
  const [catOpen, setCatOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  const hasProfile = Boolean(
    profile?.halal || profile?.halalOnly ||
    profile?.allergens?.length || profile?.dietGoals?.length
  )

  const list = useMemo(() => {
    let arr = products.slice()
    if (catFilter !== 'all') arr = arr.filter(p => p.category === catFilter)
    const query = q.trim().toLowerCase()
    if (query) arr = arr.filter(p => `${p.name} ${(p.tags||[]).join(' ')}`.toLowerCase().includes(query))

    arr.sort((a, b) => {
      if (sort === 'cheap')  return a.priceKzt - b.priceKzt
      if (sort === 'pricey') return b.priceKzt - a.priceKzt
      if (sort === 'rating') return (b.qualityScore||0) - (a.qualityScore||0)
      // 'fit' — подходящие наверх, затем по категориям, затем рейтинг
      if (hasProfile) {
        const af = checkProductFit(a, profile).fits ? 0 : 1
        const bf = checkProductFit(b, profile).fits ? 0 : 1
        if (af !== bf) return af - bf
      }
      const ao = CATEGORY_ORDER.indexOf(a.category)
      const bo = CATEGORY_ORDER.indexOf(b.category)
      if (ao !== bo) return ao - bo
      return (b.qualityScore||0) - (a.qualityScore||0)
    })
    return arr
  }, [q, catFilter, sort, hasProfile])

  const fitCount = hasProfile ? products.filter(p => checkProductFit(p, profile).fits).length : 0
  const activeCat  = CATEGORIES.find(c => c.id === catFilter)
  const activeSort = SORT_OPTIONS.find(s => s.id === sort)

  const closeAll = () => { setCatOpen(false); setSortOpen(false) }

  return (
    <div className="screen" onClick={e => {
      // close dropdowns if clicking outside
      if (!e.target.closest('[data-dropdown]')) closeAll()
    }}>
      <div className="header">
        <div className="screen-title" style={{ textAlign: 'center' }}>Товары</div>
      </div>

      <div style={{ padding: '0 16px 12px' }}>

        {/* Search */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '10px 14px', marginBottom: 12 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(160,160,200,0.8)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input style={{ background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', flex: 1 }}
            placeholder="Поиск товаров..." value={q} onChange={e => setQ(e.target.value)} />
          {q && <button onClick={() => setQ('')} style={{ background: 'none', border: 'none',
            color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>}
        </div>

        {/* Controls row: Sort + Category */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, position: 'relative' }}>

          {/* SORT dropdown */}
          <div style={{ position: 'relative', flex: 1 }} data-dropdown="sort">
            <button
              onClick={e => { e.stopPropagation(); setSortOpen(o => !o); setCatOpen(false) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 8, padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: '1.5px solid', fontFamily: 'var(--font-body)',
                borderColor: 'var(--primary-mid)',
                background: 'var(--primary-dim)',
                color: 'var(--primary-bright)',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M7 12h10M11 18h2"/>
                </svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeSort?.label}
                </span>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ flexShrink: 0, transform: sortOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {sortOpen && (
              <div data-dropdown="sort" style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 14, overflow: 'hidden',
                boxShadow: '0 12px 32px rgba(0,0,0,0.4)', zIndex: 100,
              }}>
                {SORT_OPTIONS.map((opt, i) => {
                  if (opt.id === 'fit' && !hasProfile) return null
                  const active = sort === opt.id
                  return (
                    <button key={opt.id} onClick={e => { e.stopPropagation(); setSort(opt.id); setSortOpen(false) }}
                      style={{
                        width: '100%', padding: '12px 14px',
                        background: active ? 'var(--primary-dim)' : 'transparent',
                        border: 'none', borderBottom: i < SORT_OPTIONS.length-1 ? '1px solid var(--border)' : 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                        fontFamily: 'var(--font-body)', fontSize: 13,
                        color: active ? 'var(--primary-bright)' : 'rgba(220,220,250,0.9)',
                        fontWeight: active ? 700 : 400,
                      }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke={active ? 'var(--primary-bright)' : 'rgba(180,180,220,0.8)'}
                        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d={opt.icon}/>
                      </svg>
                      <span style={{ flex: 1, textAlign: 'left' }}>{opt.label}</span>
                      {opt.id === 'fit' && fitCount > 0 && (
                        <span style={{ fontSize: 11, background: active ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)',
                          padding: '2px 7px', borderRadius: 10, color: active ? 'var(--primary-bright)' : 'var(--text-dim)' }}>
                          {fitCount}
                        </span>
                      )}
                      {active && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="var(--primary-bright)" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* CATEGORY dropdown */}
          <div style={{ position: 'relative', flex: 1 }} data-dropdown="cat">
            <button
              onClick={e => { e.stopPropagation(); setCatOpen(o => !o); setSortOpen(false) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 8, padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: '1.5px solid', fontFamily: 'var(--font-body)',
                borderColor: activeCat ? 'var(--primary-mid)' : 'var(--border)',
                background: activeCat ? 'var(--primary-dim)' : 'var(--card)',
                color: activeCat ? 'var(--primary-bright)' : 'rgba(200,200,240,0.9)',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeCat ? activeCat.label : 'Категория'}
                </span>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ flexShrink: 0, transform: catOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {catOpen && (
              <div data-dropdown="cat" style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 14, overflow: 'hidden',
                boxShadow: '0 12px 32px rgba(0,0,0,0.4)', zIndex: 100,
              }}>
                {[{ id: 'all', label: 'Все товары', cnt: products.length }, ...CATEGORIES.map(c => ({ ...c, cnt: c.count() }))].map((cat, i, arr) => {
                  const active = catFilter === cat.id
                  return (
                    <button key={cat.id} onClick={e => { e.stopPropagation(); setCatFilter(cat.id); setCatOpen(false) }}
                      style={{
                        width: '100%', padding: '12px 14px',
                        background: active ? 'var(--primary-dim)' : 'transparent',
                        border: 'none', borderBottom: i < arr.length-1 ? '1px solid var(--border)' : 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                        fontFamily: 'var(--font-body)', fontSize: 13,
                        color: active ? 'var(--primary-bright)' : 'rgba(220,220,250,0.9)',
                        fontWeight: active ? 700 : 400,
                      }}>
                      <span style={{ flex: 1, textAlign: 'left' }}>{cat.label}</span>
                      <span style={{ fontSize: 11, background: active ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.07)',
                        padding: '2px 7px', borderRadius: 10, color: active ? 'var(--primary-bright)' : 'var(--text-dim)' }}>
                        {cat.cnt}
                      </span>
                      {active && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="var(--primary-bright)" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Results count */}
        <div style={{ fontSize: 11, color: 'rgba(160,160,200,0.8)', marginBottom: 10, paddingLeft: 2 }}>
          {list.length} {list.length === 1 ? 'товар' : list.length < 5 ? 'товара' : 'товаров'}
          {activeCat ? ` · ${activeCat.label}` : ''}
          {(catFilter !== 'all' || sort !== 'fit') && (
            <button onClick={() => { setCatFilter('all'); setSort('fit') }}
              style={{ marginLeft: 8, background: 'none', border: 'none',
                color: 'rgba(139,92,246,0.8)', fontSize: 11, cursor: 'pointer',
                fontFamily: 'var(--font-body)', textDecoration: 'underline' }}>
              сбросить
            </button>
          )}
        </div>

        {/* Product list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(product => {
            const fitResult = hasProfile ? checkProductFit(product, profile) : null
            const fits = fitResult?.fits ?? null
            return (
              <div key={product.id} onClick={() => navigate(`/product/${product.id}`)}
                style={{
                  display: 'flex', alignItems: 'stretch',
                  background: 'var(--card)',
                  border: `1px solid ${fits===true ? 'rgba(16,185,129,0.25)' : fits===false ? 'rgba(239,68,68,0.18)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)', cursor: 'pointer', overflow: 'hidden',
                }}>

                {/* Thumbnail — flush, no border, no margin */}
                <div style={{ width: 68, flexShrink: 0, minHeight: 68,
                  background: 'rgba(255,255,255,0.03)' }}>
                  <ProductThumb product={product} />
                </div>

                {/* Info — tight, no extra space */}
                <div style={{ flex: 1, minWidth: 0, padding: '11px 8px 11px 10px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'rgba(235,235,255,0.95)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {product.name}
                  </div>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--primary-bright)', lineHeight: 1 }}>
                      {formatPrice(product.priceKzt)}
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(130,130,175,0.9)',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
                      padding: '1px 6px', borderRadius: 20, lineHeight: '16px' }}>
                      {product.shelf}
                    </span>
                  </div>
                  {fitResult && !fitResult.fits && fitResult.reasons[0] && (
                    <div style={{ fontSize: 10.5, color: '#F87171',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fitResult.reasons[0].text}
                    </div>
                  )}
                </div>

                {/* Fit badge — wide horizontal pill */}
                {fits !== null && (
                  <div style={{ flexShrink: 0, alignSelf: 'center', marginRight: 10,
                    width: 70, height: 32, borderRadius: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: fits ? 'rgba(16,185,129,0.13)' : 'rgba(239,68,68,0.1)',
                    border: `1.5px solid ${fits ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.35)'}`,
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke={fits ? '#10B981' : '#F87171'} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      {fits
                        ? <polyline points="20 6 9 17 4 12"/>
                        : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                    </svg>
                    <span style={{ fontSize: 11, fontWeight: 800, color: fits ? '#10B981' : '#F87171', letterSpacing: 0.4 }}>
                      {fits ? 'OK' : 'НЕТ'}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
          {list.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
              <p style={{ fontSize: 14 }}>Ничего не найдено</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
