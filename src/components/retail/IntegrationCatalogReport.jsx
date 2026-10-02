import { useI18n } from '../../i18n/index.js'
import { getCoverage } from '../../domain/retail/integrationReport.js'

const FACETS = [
  'published',
  'needs_enrichment',
  'price_missing',
  'stock_unknown',
  'in_stock',
  'out_of_stock',
  'weighted',
  'own_production',
  'conflicts',
  'invalid_data',
]

export default function IntegrationCatalogReport({ integration }) {
  const { t, lang } = useI18n()
  const report = integration?.report
  if (!report) return null
  const coverage = getCoverage(report)
  const numbers = new Intl.NumberFormat(lang === 'kz' ? 'kk-KZ' : 'ru-KZ', {
    maximumFractionDigits: 1,
  })
  const snapshot = integration.last_snapshot
  return (
    <section className="retail-integration__card">
      <h2>{t('integration.report.title')}</h2>
      <p>
        {t('integration.report.coverage', {
          total: numbers.format(coverage.total),
          matched: numbers.format(coverage.matched),
          percent: numbers.format(coverage.percent),
          remaining: numbers.format(coverage.remaining),
        })}
      </p>
      <progress
        className="retail-integration__progress"
        value={coverage.matched}
        max={coverage.total || 1}
        aria-label={t('integration.report.matched')}
      />
      <dl className="retail-integration__counters">
        {FACETS.map((key) => (
          <div key={key}>
            <dt>{t(`integration.report.${key}`)}</dt>
            <dd>{numbers.format(report[key] || 0)}</dd>
          </div>
        ))}
      </dl>
      <p className="retail-integration__hint">{t('integration.report.facetsNote')}</p>
      {snapshot && (
        <p className="retail-integration__hint">
          {t(
            snapshot.status === 'complete'
              ? 'integration.report.complete'
              : 'integration.report.inProgress',
            { expected: numbers.format(snapshot.expected_count || 0) }
          )}
        </p>
      )}
    </section>
  )
}
