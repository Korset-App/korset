import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/index.js'
import { collectIntegrationIssues } from '../../domain/retail/integrationReport.js'

const CODES = [
  'UNKNOWN_PRODUCT',
  'OWNERSHIP_CONFLICT',
  'BARCODE_CONFLICT',
  'PRICE_MISSING',
  'STOCK_UNKNOWN',
  'INVALID_BARCODE',
  'INVALID_PRICE',
  'INVALID_CURRENCY',
  'INVALID_OBSERVED_AT',
  'SALE_UNIT_UNSUPPORTED',
]

export default function IntegrationIssueQueue({
  storeId,
  revision,
  requestPage,
  onResolve,
  canResolve,
}) {
  const { t, lang } = useI18n()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [cursor, setCursor] = useState(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const controllerRef = useRef(null)
  const formatPrice = new Intl.NumberFormat(lang === 'kz' ? 'kk-KZ' : 'ru-KZ', {
    maximumFractionDigits: 2,
  })
  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    requestPage(storeId, controller.signal, { code })
      .then((page) => {
        if (controller.signal.aborted) return
        setItems(page.items)
        setTotal(page.total)
        setCursor(page.next_cursor)
        setError(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true)
      })
    return () => controller.abort()
  }, [storeId, revision, code, requestPage])

  async function more() {
    setBusy(true)
    setError(false)
    try {
      const signal = controllerRef.current.signal
      const page = await requestPage(storeId, signal, { code, after_id: cursor })
      if (signal.aborted) return
      setItems((previous) => [
        ...new Map([...previous, ...page.items].map((item) => [item.source_id, item])).values(),
      ])
      setTotal(page.total)
      setCursor(page.next_cursor)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  async function exportQueue() {
    setBusy(true)
    setError(false)
    try {
      const signal = controllerRef.current.signal
      const rows = await collectIntegrationIssues((after_id) =>
        requestPage(storeId, signal, { after_id, limit: 100 })
      )
      if (signal.aborted) return
      const url = URL.createObjectURL(
        new window.Blob(
          [
            JSON.stringify(
              { store_id: storeId, exported_at: new Date().toISOString(), items: rows },
              null,
              2
            ),
          ],
          { type: 'application/json' }
        )
      )
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `korset-unresolved-${storeId}.json`
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="retail-integration__card">
      <h2>
        {t('integration.issuesTitle')} · {total}
      </h2>
      <p>{t('integration.issuesHelp')}</p>
      <div className="retail-integration__actions">
        <label>
          {t('integration.queue.filter')}{' '}
          <select value={code} disabled={busy} onChange={(event) => setCode(event.target.value)}>
            <option value="">{t('integration.queue.all')}</option>
            {CODES.map((value) => (
              <option value={value} key={value}>
                {t(`integration.issue.${value}`)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" disabled={busy} onClick={exportQueue}>
          {t('integration.queue.export')}
        </button>
      </div>
      {error && <p role="alert">{t('integration.errorRequest')}</p>}
      {!error && items.length === 0 && <p>{t('integration.queue.empty')}</p>}
      {items.length > 0 && (
        <ul className="retail-integration__issues">
          {items.map((issue) => (
            <li key={issue.source_id}>
              <strong>{issue.name || issue.external_id}</strong>
              <p>{t(`integration.issue.${CODES.includes(issue.code) ? issue.code : 'other'}`)}</p>
              <p className="retail-integration__hint">
                {t('integration.sourcePrice')}:{' '}
                {issue.source_regular_minor == null
                  ? '—'
                  : `${formatPrice.format(issue.source_regular_minor / 100)} ₸`}{' '}
                · {t('integration.queue.quantity')}: {issue.source_stock_quantity ?? '—'}{' '}
                {issue.sale_unit ? t(`integration.unit.${issue.sale_unit}`) : ''}
              </p>
              <button type="button" disabled={!canResolve || busy} onClick={() => onResolve(issue)}>
                {t(
                  issue.code === 'OWNERSHIP_CONFLICT' ? 'integration.adopt' : 'integration.resolve'
                )}
              </button>
              <details>
                <summary>{t('integration.technicalDetails')}</summary>
                <pre>
                  {JSON.stringify(
                    {
                      external_id: issue.external_id,
                      barcodes: issue.barcodes,
                      issues: issue.issues,
                      observed_at: issue.observed_at,
                    },
                    null,
                    2
                  )}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      )}
      {cursor && (
        <button type="button" disabled={busy} onClick={more}>
          {t('integration.queue.more')}
        </button>
      )}
      <p className="retail-integration__hint">{t('integration.queue.exportNote')}</p>
    </section>
  )
}
