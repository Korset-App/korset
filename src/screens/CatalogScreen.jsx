import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import products from '../data/products.json'
import { checkProductFit, formatPrice, CATEGORY_LABELS } from '../utils/fitCheck.js'
import { loadProfile } from '../utils/profile.js'

const CATEGORIES = [
  { id: 'grocery',     label: 'Продукты',     emoji: '🛒' },
  { id: 'electronics', label: 'Электроника',   emoji: '🔌' },
  { id: 'diy',         label: 'Стройматериалы',emoji: '🔨' },
]

function ProductThumb({ product }) {
  const [imgOk, setImgOk] = useState(true)
  const src = product.images?.[0]
  if (src && imgOk) {
    return (
      <img src={src} alt={product.name} onError={() => setImgOk(false)}
        style={{ width:'100%', height:'100%', objectFit:'contain', padding:4 }} />
    )
  }
  const colors = {
    grocery:     { bg:'rgba(16,185,129,0.12)', color:'#10B981' },
    electronics: { bg:'rgba(59,130,246,0.12)', color:'#60A5FA' },
    diy:         { bg:'rgba(245,158,11,0.12)', color:'#FCD34D' },
  }
  const c = colors[product.category] || colors.grocery
  return (
    <div style={{ width:'100%', height:'100%', background:c.bg, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10, fontSize:20, fontWeight:800, color:c.color, fontFamily:'var(--font-display)' }}>
      {product.name[0]}
    </div>
  )
}

export default function CatalogScreen() {
  const navigate = useNavigate()
  const profile = loadProfile()

  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')     // 'all' | 'fit' | category id
  const [catOpen, setCatOpen] = useState(false)   // category picker open

  const hasProfile = Boolean(
    profile?.halal || profile?.halalOnly ||
    profile?.allergens?.length || profile?.dietGoals?.length
  )

  const activeCat = CATEGORIES.find(c => c.id === filter)

  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    let arr = products.slice()

    if (filter === 'fit' && hasProfile) {
      arr = arr.filter(p => checkProductFit(p, profile).fits)
    } else if (activeCat) {
      arr = arr.filter(p => p.category === filter)
    }

    if (query) {
      arr = arr.filter(p =>
        `${p.name} ${(p.tags||[]).join(' ')}`.toLowerCase().includes(query)
      )
    }

    // Sort: fit first, then by quality
    if (hasProfile) {
      arr.sort((a, b) => {
        const af = checkProductFit(a, profile).fits ? 0 : 1
        const bf = checkProductFit(b, profile).fits ? 0 : 1
        if (af !== bf) return af - bf
        return (b.qualityScore||0) - (a.qualityScore||0)
      })
    } else {
      arr.sort((a, b) => (b.qualityScore||0) - (a.qualityScore||0))
    }

    return arr
  }, [q, filter, hasProfile])

  const fitCount = hasProfile ? products.filter(p => checkProductFit(p, profile).fits).length : 0

  return (
    <div className="screen">
      <div className="header">
        <div className="screen-title" style={{ textAlign:'center' }}>Товары</div>
      </div>

      <div className="section" style={{ paddingTop:12 }}>

        {/* Search */}
        <div className="card" style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 14px', marginBottom:12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color:'var(--text-dim)', flexShrink:0 }}>
            <path d="M21 21l-4.3-4.3"/><circle cx="11" cy="11" r="7"/>
          </svg>
          <input
            style={{ background:'transparent', border:'none', outline:'none', color:'var(--text)', fontSize:14, fontFamily:'var(--font-body)', flex:1 }}
            placeholder="Поиск по товарам..."
            value={q} onChange={e => setQ(e.target.value)}
          />
          {q && <button onClick={() => setQ('')} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>}
        </div>

        {/* Filter pills */}
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {/* ALL */}
          <button
            onClick={() => { setFilter('all'); setCatOpen(false) }}
            style={{
              padding:'9px 16px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer', border:'1.5px solid', fontFamily:'var(--font-body)', transition:'all 0.15s',
              borderColor: filter==='all' ? 'var(--primary-mid)' : 'var(--border)',
              background:  filter==='all' ? 'var(--primary-dim)' : 'var(--card)',
              color:       filter==='all' ? 'var(--primary-bright)' : 'var(--text-sub)',
            }}
          >Все</button>

          {/* FIT — only if profile set */}
          {hasProfile && (
            <button
              onClick={() => { setFilter('fit'); setCatOpen(false) }}
              style={{
                padding:'9px 16px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer', border:'1.5px solid', fontFamily:'var(--font-body)', transition:'all 0.15s',
                borderColor: filter==='fit' ? 'rgba(16,185,129,0.5)' : 'var(--border)',
                background:  filter==='fit' ? 'rgba(16,185,129,0.12)' : 'var(--card)',
                color:       filter==='fit' ? 'var(--success-bright)' : 'var(--text-sub)',
              }}
            >
              ✓ Подходящие
              <span style={{ marginLeft:6, fontSize:11, background:'rgba(16,185,129,0.2)', padding:'1px 7px', borderRadius:20 }}>{fitCount}</span>
            </button>
          )}

          {/* CATEGORIES dropdown trigger */}
          <button
            onClick={() => setCatOpen(o => !o)}
            style={{
              padding:'9px 14px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer', border:'1.5px solid', fontFamily:'var(--font-body)', transition:'all 0.15s', display:'flex', alignItems:'center', gap:6,
              borderColor: activeCat ? 'var(--primary-mid)' : 'var(--border)',
              background:  activeCat ? 'var(--primary-dim)' : 'var(--card)',
              color:       activeCat ? 'var(--primary-bright)' : 'var(--text-sub)',
            }}
          >
            {activeCat ? `${activeCat.emoji} ${activeCat.label}` : 'Категория'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: catOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
        </div>

        {/* Category dropdown */}
        {catOpen && (
          <div style={{
            background:'var(--card)', border:'1px solid var(--border)',
            borderRadius:'var(--radius)', overflow:'hidden', marginBottom:12,
            boxShadow:'0 8px 24px rgba(0,0,0,0.3)',
          }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => { setFilter(cat.id); setCatOpen(false) }}
                style={{
                  width:'100%', padding:'13px 16px', background: filter===cat.id ? 'var(--primary-dim)' : 'transparent',
                  border:'none', borderBottom:'1px solid var(--border)', cursor:'pointer', textAlign:'left',
                  display:'flex', alignItems:'center', gap:12, fontFamily:'var(--font-body)',
                  color: filter===cat.id ? 'var(--primary-bright)' : 'var(--text)',
                  fontSize:14, fontWeight: filter===cat.id ? 600 : 400,
                }}
              >
                <span style={{ fontSize:20 }}>{cat.emoji}</span>
                <div>
                  <div>{cat.label}</div>
                  <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:1 }}>
                    {products.filter(p => p.category === cat.id).length} товаров
                  </div>
                </div>
                {filter===cat.id && <span style={{ marginLeft:'auto', color:'var(--primary-bright)' }}>✓</span>}
              </button>
            ))}
            <button onClick={() => { setFilter('all'); setCatOpen(false) }}
              style={{ width:'100%', padding:'11px 16px', background:'transparent', border:'none', cursor:'pointer', textAlign:'center', fontFamily:'var(--font-body)', color:'var(--text-dim)', fontSize:13 }}>
              Показать все категории
            </button>
          </div>
        )}

        {/* Active filter label */}
        {(filter !== 'all') && (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <span style={{ fontSize:12, color:'var(--text-dim)' }}>
              {filter==='fit' ? `Подходящих: ${list.length}` : `${activeCat?.label}: ${list.length}`}
            </span>
            <button onClick={() => setFilter('all')} style={{ background:'none', border:'none', color:'var(--text-dim)', fontSize:12, cursor:'pointer', fontFamily:'var(--font-body)', textDecoration:'underline' }}>
              сбросить
            </button>
          </div>
        )}

        {/* Product list */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {list.map((product, i) => {
            const fitResult = hasProfile ? checkProductFit(product, profile) : null
            const fits = fitResult?.fits ?? null
            return (
              <div key={product.id} onClick={() => navigate(`/product/${product.id}`)}
                style={{
                  display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                  background:'var(--card)', border:'1px solid',
                  borderColor: fits===true ? 'rgba(16,185,129,0.2)' : fits===false ? 'rgba(220,38,38,0.12)' : 'var(--border)',
                  borderRadius:'var(--radius)', cursor:'pointer', transition:'all 0.15s',
                  animationDelay:`${i*0.02}s`,
                }}
              >
                <div style={{ width:56, height:56, flexShrink:0, borderRadius:10, overflow:'hidden', background:'var(--surface)', border:'1px solid var(--border)' }}>
                  <ProductThumb product={product} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3 }}>
                    {product.name}
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:5, alignItems:'center' }}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, color:'var(--primary-bright)' }}>
                      {formatPrice(product.priceKzt)}
                    </span>
                    <span style={{ fontSize:11, color:'var(--text-dim)', background:'var(--border)', padding:'2px 8px', borderRadius:20 }}>
                      {product.shelf}
                    </span>
                  </div>
                </div>
                {fits !== null && (
                  <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:fits?'rgba(16,185,129,0.15)':'rgba(220,38,38,0.12)', border:`1.5px solid ${fits?'rgba(16,185,129,0.4)':'rgba(220,38,38,0.3)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>
                      {fits ? '✓' : '✕'}
                    </div>
                    <span style={{ fontSize:10, fontWeight:600, color:fits?'var(--success-bright)':'var(--error-bright)' }}>
                      {fits?'Ок':'Нет'}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
          {list.length === 0 && (
            <div style={{ padding:'40px 0', textAlign:'center', color:'var(--text-dim)' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🔍</div>
              <p style={{ fontSize:14 }}>Ничего не найдено</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
