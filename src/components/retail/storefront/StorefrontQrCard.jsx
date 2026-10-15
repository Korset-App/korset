import QRCode from 'react-qr-code'
import { useI18n } from '../../../i18n/index.js'
import { QrCodeIcon } from '../../icons/index.js'

const CARD_STYLE = {
  background: 'var(--bg-card)',
  border: '1px solid var(--retail-border)',
  borderRadius: 20,
  padding: '24px',
  boxShadow: 'var(--shadow-card)',
}

export default function StorefrontQrCard({
  storeName,
  publicStoreUrl,
  onOpenPrintDialog,
}) {
  const { lang } = useI18n()
  const isKz = lang === 'kz'

  return (
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'rgba(56, 189, 248, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <QrCodeIcon size={22} color="var(--retail-accent, #38BDF8)" />
        </div>
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--text)',
            }}
          >
            {isKz ? '3. Касса мен сөрелерге арналған QR' : '3. Печать QR-материалов для зала'}
          </h3>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {isKz
              ? 'Сатып алушыларға арналған ресми баспа макеті'
              : 'Фирменный комплект формата А4 для кассы и входной группы'}
          </span>
        </div>
      </div>

      <p
        style={{
          margin: '0 0 16px',
          fontSize: 13,
          color: 'var(--text-sub)',
          lineHeight: 1.5,
        }}
      >
        {isKz
          ? 'Бұл QR-кодты басып шығарып, кассаның қасына немесе кіреберіске орнатыңыз. Сатып алушылар телефонмен сканерлеп, дүкеннің витринасын бірден ашады.'
          : 'Покупатели сканируют этот QR-код камерой смартфона при входе в магазин или на кассе, чтобы открыть мобильную витрину и проверить товары.'}
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '14px 16px',
          borderRadius: 14,
          background: 'var(--glass-subtle, rgba(255,255,255,0.03))',
          border: '1px solid var(--line-soft, var(--retail-border))',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            padding: 8,
            borderRadius: 10,
            background: '#ffffff',
            display: 'inline-flex',
            flexShrink: 0,
          }}
        >
          <QRCode value={publicStoreUrl || 'https://korset.kz'} size={64} />
        </div>

        <div style={{ flex: 1, minWidth: 160 }}>
          <div
            style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}
          >
            {storeName || 'Körset Store'}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: 'var(--text-dim)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {publicStoreUrl}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenPrintDialog}
          style={{
            padding: '9px 18px',
            borderRadius: 10,
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.28)',
            color: 'var(--retail-accent, #38BDF8)',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
        >
          {isKz ? 'Печать А4 (Ашу)' : 'Печать плаката А4 ↗'}
        </button>
      </div>
    </div>
  )
}
