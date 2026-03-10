import { useParams, useNavigate } from 'react-router-dom'
import products from '../data/products.json'
import { checkProductFit, formatPrice, CATEGORY_LABELS } from '../utils/fitCheck.js'
import { loadProfile } from '../utils/profile.js'

export default function ProductScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const profile = loadProfile()

  const product = products.find((p) => p.id === id)

  if (!product) {
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p>Товар не найден</p>
          <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/catalog')}>
            Назад к списку
          </button>
        </div>
      </div>
    )
  }

  const { fits, reasons } = checkProductFit(product, profile)

  const specEntries = Object.entries(product.specs || {}).slice(0, 4)

  return (
    <div className="screen">
      {/* Back */}
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/catalog')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Назад
        </button>
        <div className="header-row">
          <div className="screen-title">Карточка товара</div>
          <span style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'var(--primary-dim)',
            border: '1px solid rgba(139, 92, 246, 0.18)',
            display: 'grid', placeItems: 'center',
            color: 'var(--primary-bright)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8h12l-1 12H7L6 8Z" />
              <path d="M9 8a3 3 0 0 1 6 0" />
            </svg>
          </span>
        </div>
      </div>

      {/* Product info */}
      <div className="section">
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span className={`category-badge ${product.category === 'grocery' ? 'grocery' : product.category === 'electronics' ? 'electronics' : 'diy'}`}>
              {CATEGORY_LABELS[product.category]}
            </span>
            <span style={{
              fontSize: 11,
              padding: '3px 9px',
              borderRadius: 20,
              background: 'var(--border)',
              color: 'var(--text-dim)',
              fontWeight: 500,
            }}>
              {product.shelf}
            </span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 17,
            fontWeight: 700,
            lineHeight: 1.35,
            marginBottom: 8,
            color: 'var(--text)',
          }}>
            {product.name}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 12, lineHeight: 1.5 }}>
            {product.description}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--primary-bright)',
            }}>
              {formatPrice(product.priceKzt)}
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'var(--border)',
              borderRadius: 20,
              padding: '4px 10px',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Качество</span>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: product.qualityScore >= 80 ? 'var(--success-bright)' : product.qualityScore >= 60 ? '#FCD34D' : 'var(--error-bright)',
              }}>
                {product.qualityScore}/100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FIT STATUS — the wow moment */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div className={`status-badge ${fits ? 'fit' : 'no-fit'}`}>
          <span className="status-icon">{fits ? '✅' : '❌'}</span>
          <div>
            <div className="status-text">
              {fits ? 'Подходит вам' : 'Не подходит'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
              {fits ? 'Соответствует вашему профилю' : 'Есть ограничения по вашему профилю'}
            </div>
          </div>
        </div>

        {/* Reasons */}
        <div className="card" style={{ marginTop: 12 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>Причины</div>
          {reasons.map((r, i) => (
            <div key={i} className="reason-item" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
              <div className={`reason-dot ${r.type}`} />
              <span className="reason-text">{r.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Specs */}
      {specEntries.length > 0 && (
        <div className="section" style={{ paddingTop: 0 }}>
          <div className="card">
            <div className="section-title" style={{ marginBottom: 4 }}>Характеристики</div>
            {specEntries.map(([key, val]) => (
              <div key={key} className="info-row">
                <span className="info-label">
                  {key === 'volume' ? 'Объём' :
                   key === 'weight' ? 'Вес' :
                   key === 'fat' ? 'Жирность' :
                   key === 'protein' ? 'Белки' :
                   key === 'sugar' ? 'Сахар' :
                   key === 'calories' ? 'Калории' :
                   key === 'length' ? 'Длина' :
                   key === 'maxPower' ? 'Мощность' :
                   key === 'standard' ? 'Стандарт' :
                   key === 'power' ? 'Мощность' :
                   key === 'type' ? 'Тип' :
                   key === 'anc' ? 'Шумоподавление' :
                   key === 'battery' ? 'Батарея' :
                   key === 'waterproof' ? 'Защита' :
                   key === 'coverage' ? 'Расход' :
                   key === 'dryTime' ? 'Сохнет' :
                   key === 'moisture' ? 'Влагостойкость' :
                   key}
                </span>
                <span className="info-value">{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA Buttons */}
      <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          className="btn btn-primary btn-full"
          onClick={() => navigate(`/product/${id}/alternatives`)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
          </svg>
          Показать альтернативы
        </button>
        <button
          className="btn btn-secondary btn-full"
          onClick={() => navigate(`/product/${id}/ai`)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12M8 12h.01M12 12h.01M16 12h.01"/>
          </svg>
          Спросить AI
        </button>
      </div>
    </div>
  )
}
