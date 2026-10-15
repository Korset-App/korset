import QRCode from 'react-qr-code'
import { useI18n } from '../../i18n/index.js'
import { getRetailPath } from '../../domain/retail/navigation.js'
import RetailDialog from './RetailDialog.jsx'

export default function RetailQrDialog({ type, store, onClose, returnFocusRef }) {
  const { t } = useI18n()
  const customer = type === 'cashier'
  const value = `${window.location.origin}${customer ? `/s/${store.slug}` : getRetailPath(store.slug)}`
  return (
    <RetailDialog
      title={t(customer ? 'retail.shell.customerQr' : 'retail.desktop.mobileQr')}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      className="rc-qr-dialog"
    >
      <div className="rc-qr-sheet">
        <span className="rc-qr-sheet__brand">Körset</span>
        <h3>{store.name}</h3>
        <p>{t(customer ? 'retail.shell.qrCustomerHint' : 'retail.shell.qrRetailHint')}</p>
        <div className="rc-qr-code">
          <QRCode value={value} size={220} />
        </div>
        <span className="rc-qr-sheet__url">{value}</span>
      </div>
      <footer className="rc-dialog__foot">
        <button type="button" className="rc-btn" onClick={onClose}>
          {t('retail.shell.close')}
        </button>
        <button type="button" className="rc-btn rc-btn--primary" onClick={() => window.print()}>
          {t('retail.shell.print')}
        </button>
      </footer>
    </RetailDialog>
  )
}
