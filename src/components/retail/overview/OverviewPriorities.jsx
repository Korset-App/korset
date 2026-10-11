import { useI18n } from '../../../i18n/index.js'
import { getCategoryLabel } from '../../../domain/product/categoryMap.js'
import { formatPrice } from '../../../utils/formatPrice.js'
import { Card, QueryError, InsightRow, EmptyState } from './OverviewParts.jsx'

export default function OverviewPriorities({
  insights,
  loading,
  error,
  retry,
  onAction,
  partialDemand,
}) {
  const { t, exists, lang } = useI18n()
  const d = (key) => t(`retail.dashboard.${key}`)
  const o = (key, values) => t(`retail.overview.${key}`, values)
  const noSignal = d('alternativesNoSignal')
  return (
    <Card title={o('insightsTitle')} className="ov-advice">
      <p className="ov-section-note">{o('insightsNote')}</p>
      {error ? (
        <QueryError label={o('insightsUnavailable')} retryLabel={d('retry')} onRetry={retry} />
      ) : loading ? (
        Array.from({ length: 3 }).map((_, i) => <InsightRow key={i} loading />)
      ) : insights.length === 0 ? (
        <EmptyState icon="insights" label={d('aiInsightsEmpty')} sub={d('aiInsightsEmptySub')} />
      ) : (
        insights.map((insight) => {
          const values = {
            ...insight.values,
            category: insight.values?.category
              ? getCategoryLabel(insight.values.category, lang)
              : undefined,
            scenario:
              insight.values?.scenario &&
              exists(`retail.dashboard.alternatives.scenario.${insight.values.scenario}`)
                ? t(`retail.dashboard.alternatives.scenario.${insight.values.scenario}`)
                : noSignal,
            ean:
              insight.values?.ean && insight.values.ean !== 'EAN'
                ? insight.values.ean
                : o('noProductCode'),
            amountText:
              insight.values?.amount != null
                ? formatPrice(Number(insight.values.amount) || 0)
                : undefined,
          }
          if (partialDemand && ['unknown_ean_demand', 'out_of_stock_demand'].includes(insight.id)) {
            values.count = `${values.count}+`
            values.scans = `${values.scans}+`
          }
          return (
            <InsightRow
              key={insight.id}
              insight={insight}
              title={t(insight.titleKey, values)}
              body={t(insight.bodyKey, values)}
              action={o(
                insight.id === 'activate_scans'
                  ? 'showQr'
                  : insight.id === 'unknown_ean_demand'
                    ? 'checkUnknown'
                    : 'attentionAction'
              )}
              onAction={(event) => onAction(insight.id, event.currentTarget)}
            />
          )
        })
      )}
    </Card>
  )
}
