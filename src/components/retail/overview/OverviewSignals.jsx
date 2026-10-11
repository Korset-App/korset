import { useI18n } from '../../../i18n/index.js'
import { Card, QueryError, StatList, FactLine, Skel } from './OverviewParts.jsx'

export default function OverviewSignals({ alternativesQ, compareQ }) {
  const { t, exists } = useI18n()
  const d = (key) => t(`retail.dashboard.${key}`)
  const o = (key) => t(`retail.overview.${key}`)
  const altSummary = alternativesQ.data
  const cmpSummary = compareQ.data
  const topScenario =
    altSummary?.topScenario?.scenario &&
    exists(`retail.dashboard.alternatives.scenario.${altSummary.topScenario.scenario}`)
      ? t(`retail.dashboard.alternatives.scenario.${altSummary.topScenario.scenario}`)
      : null
  const topSource = altSummary?.topSource?.ean ? `EAN ${altSummary.topSource.ean}` : null
  const topPair = cmpSummary?.topPair
    ? `${cmpSummary.topPair.eanA} ↔ ${cmpSummary.topPair.eanB}`
    : null
  const noSignal = d('alternativesNoSignal')

  return (
    <Card title={o('signalsTitle')}>
      <div className="ov-signal">
        <div className="ov-signal__head">
          <span className="ov-signal__name">{d('alternativesTitle')}</span>
          <span className="ov-signal__total rc-num">
            {alternativesQ.isLoading ? (
              <Skel w={24} h={24} />
            ) : alternativesQ.isError ? (
              '—'
            ) : (
              (altSummary?.total ?? 0)
            )}
          </span>
        </div>
        {alternativesQ.isError ? (
          <QueryError
            label={d('loadError')}
            retryLabel={d('retry')}
            onRetry={() => alternativesQ.refetch()}
          />
        ) : alternativesQ.isSuccess && altSummary?.total === 0 ? (
          <p className="ov-signal__hint ov-signal__hint--empty">{o('alternativesEmpty')}</p>
        ) : (
          <>
            <p className="ov-signal__hint">{d('alternativesSub')}</p>
            <StatList
              loading={alternativesQ.isLoading}
              items={[
                { label: d('alternativesCompare'), value: altSummary?.compareCount ?? 0 },
                { label: d('alternativesAI'), value: altSummary?.aiHelpCount ?? 0 },
              ]}
            />
            <FactLine label={d('alternativesTopScenario')} value={topScenario || noSignal} />
            <FactLine label={d('alternativesTopSource')} value={topSource || noSignal} />
          </>
        )}
      </div>

      <div className="ov-signal">
        <div className="ov-signal__head">
          <span className="ov-signal__name">{d('compareTitle')}</span>
          <span className="ov-signal__total rc-num">
            {compareQ.isLoading ? (
              <Skel w={24} h={24} />
            ) : compareQ.isError ? (
              '—'
            ) : (
              (cmpSummary?.total ?? 0)
            )}
          </span>
        </div>
        {compareQ.isError ? (
          <QueryError
            label={d('loadError')}
            retryLabel={d('retry')}
            onRetry={() => compareQ.refetch()}
          />
        ) : compareQ.isSuccess && cmpSummary?.total === 0 ? (
          <p className="ov-signal__hint ov-signal__hint--empty">{o('comparisonsEmpty')}</p>
        ) : (
          <>
            <p className="ov-signal__hint">{d('compareSub')}</p>
            <StatList
              loading={compareQ.isLoading}
              items={[
                { label: d('compareWinner'), value: cmpSummary?.winnerCount ?? 0 },
                { label: d('compareDraw'), value: cmpSummary?.drawCount ?? 0 },
                { label: d('compareBlocked'), value: cmpSummary?.blockedCount ?? 0 },
              ]}
            />
            <FactLine label={d('compareTopPair')} value={topPair || d('compareNoPair')} />
          </>
        )}
      </div>
    </Card>
  )
}
