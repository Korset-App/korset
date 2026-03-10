import { useParams, useNavigate } from 'react-router-dom'
import products from '../data/products.json'
import { getAlternatives, formatPrice, CATEGORY_LABELS } from '../utils/fitCheck.js'
import { loadProfile } from '../utils/profile.js'

export default function AlternativesScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const profile = loadProfile()

  const product = products.find((p) => p.id === id)
  const alternatives = product ? getAlternatives(product, profile) : []

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => navigate(`/product/${id}`)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          К товару
        </button>
        <div className="screen-title">Альтернативы</div>
        <div className="screen-subtitle">Подходят под ваш профиль</div>
      </div>

      <div className="section">
        {alternatives.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 0',
            color: 'var(--text-dim)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--text-dim)' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h.01" />
                <path d="M8 8a4 4 0 1 1 8 0c0 3-4 3-4 6" />
              </svg>
            </div>
            <p>Подходящих альтернатив не найдено</p>
            <p style={{ fontSize: 13, marginTop: 8, color: 'var(--text-dim)' }}>
              Попробуйте изменить профиль
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {alternatives.map((alt, i) => (
              <div
                key={alt.id}
                className="alt-card"
                style={{ animationDelay: `${i * 0.1}s` }}
                onClick={() => navigate(`/product/${alt.id}`)}
              >
                <div className="alt-card-header">
                  <div className="product-emoji" style={{ width: 44, height: 44, display: 'grid', placeItems: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-bright)' }}>
                      <path d="M6 8h12l-1 12H7L6 8Z" />
                      <path d="M9 8a3 3 0 0 1 6 0" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: 500,
                      fontSize: 14,
                      color: 'var(--text)',
                      lineHeight: 1.35,
                    }}>
                      {alt.name}
                    </div>
                    <span className={`category-badge ${alt.category}`} style={{ marginTop: 4, display: 'inline-block' }}>
                      {CATEGORY_LABELS[alt.category]}
                    </span>
                  </div>
                </div>

                {/* Why it fits */}
                <div className="alt-why">✓ {alt.whyFits}</div>

                <div className="alt-footer">
                  <div style={{ display: 'flex', align: 'center', gap: 10 }}>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 18,
                      fontWeight: 700,
                      color: 'var(--primary-bright)',
                    }}>
                      {formatPrice(alt.priceKzt)}
                    </span>
                    <span className="product-shelf">{alt.shelf}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      {alt.qualityScore}/100
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </div>

                {/* Map hint */}
                <div className="map-mock" style={{ marginTop: 10 }}>
                  <span style={{ display: 'inline-flex', color: 'var(--text-dim)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
                      <path d="M9 3v15" />
                      <path d="M15 6v15" />
                    </svg>
                  </span>
                  <span>Найти в магазине · {alt.shelf}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.6 }}>Карта</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '0 20px 24px' }}>
        <button
          className="btn btn-ghost btn-full"
          onClick={() => navigate(`/product/${id}/ai`)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          </svg>
          Спросить AI о выборе
        </button>
      </div>
    </div>
  )
}
