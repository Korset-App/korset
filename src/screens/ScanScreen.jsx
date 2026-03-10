import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import products from '../data/products.json'
import { formatPrice, CATEGORY_LABELS } from '../utils/fitCheck.js'
import { loadProfile } from '../utils/profile.js'
import { checkProductFit } from '../utils/fitCheck.js'

const DEMO_IDS = ['p001', 'p004', 'p008', 'p009', 'p018', 'p022', 'p026', 'p029']

export default function ScanScreen() {
  const navigate = useNavigate()
  const [scanning, setScanning] = useState(false)
  const profile = loadProfile()

  const demoProducts = DEMO_IDS.map((id) => products.find((p) => p.id === id)).filter(Boolean)

  const handleScan = () => {
    setScanning(true)
    setTimeout(() => {
      setScanning(false)
      // Demo: after "scan" open the first demo item
      navigate(`/product/${DEMO_IDS[0]}`)
    }, 1800)
  }

  const getCategoryClass = (cat) => {
    if (cat === 'grocery') return 'grocery'
    if (cat === 'electronics') return 'electronics'
    return 'diy'
  }

  const getFitDot = (product) => {
    const { fits } = checkProductFit(product, profile)
    return fits
  }

  return (
    <div className="screen">
      {/* Scan button area */}
      <div className="scan-btn-container">
        <button
          className={`scan-btn ${scanning ? 'scanning' : ''}`}
          onClick={handleScan}
        >
          {scanning ? (
            <>
              <div style={{ width: 42, height: 42, color: 'var(--primary-bright)', display: 'grid', placeItems: 'center' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <span style={{ fontSize: 12, opacity: 0.8 }}>Сканирование...</span>
            </>
          ) : (
            <>
              <div className="scan-icon">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="5" height="5" rx="1"/>
                  <rect x="16" y="3" width="5" height="5" rx="1"/>
                  <rect x="3" y="16" width="5" height="5" rx="1"/>
                  <path d="M16 16h5v5M16 16v5M3 12h5M10 3v5M12 10h7M10 16v5M14 12v3M21 12v5"/>
                </svg>
              </div>
              <span>Сканировать QR</span>
            </>
          )}
        </button>
        <p className="scan-hint">
          В MVP — демо-режим. В реальном внедрении считывается EAN штрихкод товара.
        </p>
      </div>

      <div className="divider" />

      {/* Demo scan list */}
      <div className="section">
        <div className="section-title" style={{ marginBottom: 12 }}>Демо-скан</div>
        <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 10, lineHeight: 1.5 }}>
          Выберите товар, чтобы имитировать скан QR. В реальном магазине будет штрихкод EAN.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {demoProducts.map((product, i) => {
            const fits = profile.presetId ? getFitDot(product) : null
            return (
              <div
                key={product.id}
                className="product-item"
                style={{ animationDelay: `${i * 0.04}s` }}
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="product-emoji" style={{ display: 'grid', placeItems: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-bright)' }}>
                    <rect x="4" y="4" width="7" height="7" rx="1" />
                    <rect x="13" y="4" width="7" height="7" rx="1" />
                    <rect x="4" y="13" width="7" height="7" rx="1" />
                    <path d="M13 13h7v7" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="product-name" style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {product.name}
                  </div>
                  <div className="product-meta">
                    <span className="product-price">{formatPrice(product.priceKzt)}</span>
                    <span className="product-shelf">{product.shelf}</span>
                    <span className={`category-badge ${getCategoryClass(product.category)}`}>
                      {CATEGORY_LABELS[product.category]}
                    </span>
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
        </div>
      </div>
    </div>
  )
}
