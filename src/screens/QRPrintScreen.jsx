import { useNavigate } from 'react-router-dom'
import QRCode from 'react-qr-code'
import products from '../data/products.json'

const QR_PREFIX = 'korset:'

export default function QRPrintScreen() {
  const navigate = useNavigate()

  return (
    <div className="screen">
      {/* Header */}
      <div className="header">
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 14 }}
        >
          ← Назад
        </button>
        <div className="screen-title">QR-коды для ценников</div>

        {/* Instruction card */}
        <div style={{
          marginTop: 14, padding: '14px 16px',
          background: 'var(--primary-dim)', border: '1px solid rgba(139,92,246,0.25)',
          borderRadius: 'var(--radius)', lineHeight: 1.7,
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--primary-bright)', marginBottom: 8 }}>
            Как использовать:
          </div>
          {[
            '1. Нажмите "Распечатать" — откроется диалог принтера',
            '2. Распечатайте лист на обычной бумаге',
            '3. Разрежьте по карточкам и положите рядом с товарами',
            '4. Покупатель сканирует QR → мгновенно открывается карточка с ✅/❌',
          ].map((t, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--text-sub)' }}>{t}</div>
          ))}
        </div>

        <button
          onClick={() => window.print()}
          className="btn btn-primary btn-full"
          style={{ marginTop: 14 }}
        >
          🖨️ Распечатать все {products.length} QR-кодов
        </button>
      </div>

      {/* QR grid */}
      <div style={{ padding: '8px 16px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {products.map(product => (
            <div
              key={product.id}
              className="qr-card"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '14px 12px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              }}
            >
              {/* QR code — white bg for contrast */}
              <div style={{ background: '#fff', padding: 10, borderRadius: 8 }}>
                <QRCode
                  value={QR_PREFIX + product.id}
                  size={100}
                  level="M"
                  fgColor="#000000"
                  bgColor="#FFFFFF"
                />
              </div>

              {/* Product info */}
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
                  color: 'var(--text)', lineHeight: 1.4,
                  overflow: 'hidden',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {product.name}
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 800,
                  color: 'var(--primary-bright)',
                  marginTop: 5, fontFamily: 'var(--font-display)',
                }}>
                  {product.priceKzt?.toLocaleString('ru-RU')} ₸
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3, opacity: 0.5 }}>
                  {product.shelf}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Print-specific styles */}
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
