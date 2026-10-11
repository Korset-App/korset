import { useI18n } from '../../../i18n/index.js'
import { CatalogGlyph, StoreGlyph } from '../RetailGlyphs.jsx'
import { BarcodeScannerIcon } from '../../icons/BarcodeScannerIcon.jsx'

export default function OverviewLaunch({ products, published, onCatalog, onStorefront, onQr }) {
  const { t, format } = useI18n()
  const o = (key, values) => t(`retail.overview.${key}`, values)
  return (
    <section className="ov-launch" aria-labelledby="ov-launch-title">
      <div className="ov-launch__intro">
        <span className="ov-eyebrow">{o('firstSteps')}</span>
        <h2 id="ov-launch-title">{o('launchTitle')}</h2>
        <p>{o('launchHint')}</p>
      </div>
      <div className="ov-launch__steps">
        <button type="button" onClick={onCatalog}>
          <span className="ov-launch__icon">
            <CatalogGlyph size={23} />
          </span>
          <span>
            <strong>{o('launchCatalog')}</strong>
            <small>
              {products > 0
                ? o('launchCatalogCount', { count: format.number(products) })
                : o('launchCatalogEmpty')}
            </small>
          </span>
          <span aria-hidden="true">↗</span>
        </button>
        <button type="button" onClick={onStorefront}>
          <span className="ov-launch__icon">
            <StoreGlyph size={23} />
          </span>
          <span>
            <strong>{o('launchStorefront')}</strong>
            <small>{o(published ? 'launchPublished' : 'launchDraft')}</small>
          </span>
          <span aria-hidden="true">↗</span>
        </button>
        <button type="button" onClick={onQr}>
          <span className="ov-launch__icon">
            <BarcodeScannerIcon size={23} />
          </span>
          <span>
            <strong>{o('launchQr')}</strong>
            <small>{o('launchQrHint')}</small>
          </span>
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
  )
}
