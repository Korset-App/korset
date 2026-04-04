import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { useI18n } from '../utils/i18n.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { getStoreCatalogProducts } from '../utils/storeCatalog.js'
import { buildProductPath } from '../utils/routes.js'

export default function QRPrintScreen() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { currentStore } = useStore()

  const products = useMemo(() => getStoreCatalogProducts(currentStore?.slug || 'store-one'), [currentStore])
  const storeSlug = currentStore?.slug || 'store-one'

  return (
    <div className="screen">
      <div className="header">
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 14 }}
        >
          {t.qr.back}
        </button>
        <div className="screen-title">{t.qr.title}</div>

        <div
          style={{
            marginTop: 14,
            padding: '14px 16px',
            background: 'var(--primary-dim)',
            border: '1px solid rgba(139,92,246,0.25)',
            borderRadius: 'var(--radius)',
            lineHeight: 1.7,
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--primary-bright)', marginBottom: 8 }}>
            {currentStore?.name || 'Магазин 1'}
          </div>
          {t.qr.howSteps.map((step, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--text-sub)' }}>{step}</div>
          ))}
        </div>

        <button onClick={() => window.print()} className="btn btn-primary btn-full" style={{ marginTop: 14 }}>
          🖨️ {t.qr.printAll} {products.length} {t.qr.qrCodes}
        </button>
      </div>

      <div style={{ padding: '8px 16px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {products.map((product) => {
            const url = typeof window !== 'undefined' ? `${window.location.origin}${buildProductPath(storeSlug, product.ean)}` : buildProductPath(storeSlug, product.ean)
            return (
              <div
                key={product.ean}
                className="qr-card"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '14px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{ background: '#fff', padding: 10, borderRadius: 8 }}>
                  <QRCode value={url} size={100} level="M" fgColor="#000000" bgColor="#FFFFFF" />
                </div>

                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--text)',
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {product.name}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary-bright)', marginTop: 5, fontFamily: 'var(--font-display)' }}>
                    {product.priceKzt?.toLocaleString('ru-RU')} ₸
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3, opacity: 0.5 }}>{product.shelf || 'Полка уточняется'}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 10mm; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
          .bottom-nav { display: none !important; }
          .header { display: none !important; }
          .screen { padding-top: 8px !important; }
          .qr-card {
            background: white !important;
            border: 1px solid #ddd !important;
            break-inside: avoid;
          }
          * { color: black !important; }
          .product-price, [style*="primary-bright"] { color: #5B21B6 !important; }
        }
      `}</style>
    </div>
  )
}
