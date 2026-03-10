import { useNavigate } from 'react-router-dom'
import QRCode from 'react-qr-code'
import products from '../data/products.json'

const QR_PREFIX = 'korset:'

export default function QRPrintScreen() {
  const navigate = useNavigate()

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 12 }}>
          ← Назад
        </button>
        <div className="screen-title">QR-коды товаров</div>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.6 }}>
          Распечатайте и наклейте на полку рядом с товаром. Скан QR → мгновенно открывается карточка.
        </p>
        <button
          onClick={() => window.print()}
          className="btn btn-primary btn-full"
          style={{ marginTop: 14 }}
        >
          🖨️ Распечатать все
        </button>
      </div>

      <div style={{ padding: '8px 16px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {products.map(product => (
            <div key={product.id} style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 14,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              {/* White background for QR visibility */}
              <div style={{ background: 'white', padding: 10, borderRadius: 8 }}>
                <QRCode
                  value={QR_PREFIX + product.id}
                  size={110}
                  level="M"
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4 }}>
                  {product.name}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bright)', marginTop: 4 }}>
                  {product.priceKzt?.toLocaleString('ru-RU')} ₸
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, fontFamily: 'monospace', opacity: 0.6 }}>
                  {product.id}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .bottom-nav, .header button { display: none !important; }
          .screen { padding-top: 0 !important; }
          * { color: black !important; border-color: #ccc !important; background: white !important; }
        }
      `}</style>
    </div>
  )
}
