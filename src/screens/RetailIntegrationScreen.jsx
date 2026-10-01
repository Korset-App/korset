import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { supabase } from '../utils/supabase.js'
import { getIntegrationHealth } from '../domain/retail/integrationStatus.js'
import { AlertTriangleIcon, CheckCircleIcon, SyncIcon } from '../components/icons/index.js'
import './RetailIntegrationScreen.css'

async function requestIntegration(storeId, action, signal, details = {}) {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data?.session?.access_token) throw new Error('auth')
  if (signal.aborted) throw new Error('aborted')
  const response = await fetch(
    action ? '/api/integration' : `/api/integration?store_id=${encodeURIComponent(storeId)}`,
    {
      method: action ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        ...(action ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(action ? { body: JSON.stringify({ action, store_id: storeId, ...details }) } : {}),
      signal,
    }
  )
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const code = body.code || body.error?.code || body.error
    if (
      response.status === 404 ||
      response.status === 501 ||
      ['NOT_INSTALLED', 'SCHEMA_NOT_READY', 'INTEGRATION_NOT_INSTALLED'].includes(code)
    ) {
      throw new Error('notInstalled')
    }
    if (response.status === 401 || response.status === 403) throw new Error('forbidden')
    if (
      response.status === 409 &&
      ['REVISION_CONFLICT', 'OWNERSHIP_CONFLICT', 'RESOLUTION_UNSAFE'].includes(code)
    )
      throw new Error('reviewChanged')
    throw new Error('request')
  }
  if (!Object.hasOwn(body, 'integration')) throw new Error('request')
  return body
}

function formatDate(value, lang) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—'
  return new Intl.DateTimeFormat(lang === 'kz' ? 'kk-KZ' : 'ru-KZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const COUNTER_KEYS = new Set(['applied', 'unresolved', 'conflicts', 'stale', 'deactivated'])

function IntegrationContent({ storeId, currentStore }) {
  const { t, lang } = useI18n()
  const [view, setView] = useState('loading')
  const [integration, setIntegration] = useState(null)
  const [issues, setIssues] = useState([])
  const [observedAt, setObservedAt] = useState(Date.now)
  const [token, setToken] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [compatible, setCompatible] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [resolveTarget, setResolveTarget] = useState(null)
  const controllerRef = useRef(null)
  const busyRef = useRef(false)
  const resolutionRef = useRef(null)

  useEffect(() => {
    if (!resolveTarget) return
    resolutionRef.current?.scrollIntoView({ block: 'center' })
    resolutionRef.current?.focus({ preventScroll: true })
  }, [resolveTarget])

  const refresh = useCallback(
    async (signal) => {
      if (!storeId) {
        setView('noStore')
        return
      }
      try {
        const result = await requestIntegration(storeId, null, signal)
        if (signal.aborted) return
        setIntegration(result.integration)
        setIssues(result.issues ?? [])
        setView('ready')
      } catch (caught) {
        if (!signal.aborted) {
          setView(
            caught.message === 'notInstalled'
              ? 'notInstalled'
              : caught.message === 'forbidden' || caught.message === 'auth'
                ? 'forbidden'
                : 'error'
          )
        }
      }
    },
    [storeId]
  )

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    Promise.resolve().then(() => {
      if (!controller.signal.aborted) refresh(controller.signal)
    })
    const timer = setInterval(() => {
      setObservedAt(Date.now())
      if (busyRef.current) return
      controllerRef.current?.abort()
      const poll = new AbortController()
      controllerRef.current = poll
      refresh(poll.signal)
    }, 60000)
    return () => {
      clearInterval(timer)
      controller.abort()
      controllerRef.current?.abort()
    }
  }, [refresh])

  const runAction = async (action, details = {}) => {
    if (!storeId || busy) return
    busyRef.current = true
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setBusy(true)
    setError(null)
    setToken(null)
    setConfirmAction(null)
    setResolveTarget(null)
    try {
      const result = await requestIntegration(storeId, action, controller.signal, details)
      if (controller.signal.aborted) return
      setIntegration(result.integration)
      setIssues(result.issues ?? [])
      setObservedAt(Date.now())
      if (result.token) setToken(result.token)
      setView('ready')
      setCompatible(false)
    } catch (caught) {
      if (!controller.signal.aborted) {
        if (caught.message === 'notInstalled') setView('notInstalled')
        else setError(caught.message)
        if (caught.message === 'reviewChanged') await refresh(controller.signal)
      }
    } finally {
      busyRef.current = false
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  const health = getIntegrationHealth(integration, observedAt)
  const errorText =
    error === 'reviewChanged'
      ? t('integration.errorReviewChanged')
      : error === 'auth' || error === 'forbidden'
        ? t('integration.errorAuth')
        : t('integration.errorRequest')
  const stateText = t(`integration.state.${health.state}`)
  const canManage = view === 'ready' && integration && health.state !== 'revoked'

  return (
    <main className="retail-integration retail-screen-canvas">
      <header className="retail-integration__header">
        <span className="retail-integration__eyebrow">{t('integration.eyebrow')}</span>
        <h1>{t('integration.title')}</h1>
        <p>{t('integration.intro')}</p>
        {currentStore?.name && (
          <span className="retail-integration__store">{currentStore.name}</span>
        )}
      </header>

      {view === 'loading' && (
        <section className="retail-integration__card" role="status">
          {t('integration.loading')}
        </section>
      )}
      {view === 'noStore' && (
        <section className="retail-integration__card" role="status">
          {t('integration.noStore')}
        </section>
      )}
      {view === 'notInstalled' && (
        <section className="retail-integration__card retail-integration__notice" role="status">
          <AlertTriangleIcon size={24} />
          <div>
            <h2>{t('integration.notInstalledTitle')}</h2>
            <p>{t('integration.notInstalledBody')}</p>
          </div>
        </section>
      )}
      {view === 'forbidden' && (
        <section className="retail-integration__card retail-integration__notice" role="alert">
          <AlertTriangleIcon size={24} />
          <div>
            <h2>{t('integration.accessTitle')}</h2>
            <p>{t('integration.errorAuth')}</p>
          </div>
        </section>
      )}
      {view === 'error' && (
        <section className="retail-integration__card" role="alert">
          <p>{t('integration.errorRequest')}</p>
          <button
            type="button"
            onClick={() => {
              controllerRef.current?.abort()
              const controller = new AbortController()
              controllerRef.current = controller
              setView('loading')
              setError(null)
              refresh(controller.signal)
            }}
          >
            {t('integration.retry')}
          </button>
        </section>
      )}

      {view === 'ready' && (
        <>
          <section
            className="retail-integration__card retail-integration__status"
            aria-labelledby="integration-status-heading"
          >
            <div className="retail-integration__section-title">
              <SyncIcon size={22} />
              <h2 id="integration-status-heading">{t('integration.statusTitle')}</h2>
            </div>
            <strong
              className={`retail-integration__badge retail-integration__badge--${health.state}`}
            >
              {stateText}
            </strong>
            {!integration && <p>{t('integration.unconfiguredBody')}</p>}
            {health.state === 'revoked' && <p>{t('integration.revokedBody')}</p>}
            {integration && (
              <div className="retail-integration__facts">
                <div>
                  <span>{t('integration.source')}</span>
                  <strong>
                    {(integration.source_kind === '1c' ? '1С' : integration.source_kind) || '—'}
                  </strong>
                </div>
                <div>
                  <span>{t('integration.version')}</span>
                  <strong>{integration.connector_version || '—'}</strong>
                </div>
                <div>
                  <span>{t('integration.lastSeen')}</span>
                  <strong>{formatDate(integration.last_seen_at, lang)}</strong>
                  <small>{t(`integration.connection.${health.connection}`)}</small>
                </div>
                <div>
                  <span>{t('integration.lastApplied')}</span>
                  <strong>{formatDate(integration.last_applied_at, lang)}</strong>
                  <small>{t(`integration.data.${health.data}`)}</small>
                </div>
              </div>
            )}
            {integration && (
              <p className="retail-integration__hint">{t('integration.freshnessNote')}</p>
            )}
            {health.state === 'active' && !health.healthy && (
              <p className="retail-integration__error" role="status">
                {t('integration.needsReview')}
              </p>
            )}
            {health.state === 'active' && (
              <p className="retail-integration__hint">{t('integration.sourceManagedNote')}</p>
            )}
            {integration?.last_error_code && (
              <div className="retail-integration__error" role="status">
                <p>
                  {t('integration.lastError')}:{' '}
                  {t(
                    integration.last_error_code === 'ITEMS_REQUIRE_REVIEW'
                      ? 'integration.error.itemsRequireReview'
                      : 'integration.error.checkRequired'
                  )}
                </p>
                <details>
                  <summary>{t('integration.technicalDetails')}</summary>
                  <code>{integration.last_error_code}</code>
                </details>
              </div>
            )}
          </section>

          {integration?.counters && (
            <section className="retail-integration__card">
              <h2>{t('integration.diagnostics')}</h2>
              <dl className="retail-integration__counters">
                {Object.entries(integration.counters).map(([key, value]) => (
                  <div key={key}>
                    <dt>
                      {t(
                        COUNTER_KEYS.has(key)
                          ? `integration.counter.${key}`
                          : 'integration.counter.other'
                      )}
                    </dt>
                    <dd>
                      {typeof value === 'number'
                        ? new Intl.NumberFormat(lang === 'kz' ? 'kk-KZ' : 'ru-KZ').format(value)
                        : '—'}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {issues.length > 0 && (
            <section className="retail-integration__card">
              <h2>{t('integration.issuesTitle')}</h2>
              <p>{t('integration.issuesHelp')}</p>
              <ul className="retail-integration__issues">
                {issues.map((issue) => (
                  <li key={JSON.stringify([issue.external_id, issue.variant_id, issue.unit_id])}>
                    <strong>{issue.name || issue.external_id}</strong>
                    <p>
                      {t(
                        `integration.issue.${['UNKNOWN_PRODUCT', 'OWNERSHIP_CONFLICT', 'BARCODE_CONFLICT', 'PRICE_MISSING', 'PRICE_PRECISION_UNSUPPORTED', 'STOCK_UNKNOWN', 'SALE_UNIT_UNSUPPORTED'].includes(issue.code) ? issue.code : 'other'}`
                      )}
                    </p>
                    {issue.source_id && (
                      <button
                        type="button"
                        disabled={busy || health.state !== 'active'}
                        onClick={() => setResolveTarget(issue)}
                      >
                        {t(
                          issue.code === 'OWNERSHIP_CONFLICT'
                            ? 'integration.adopt'
                            : 'integration.resolve'
                        )}
                      </button>
                    )}
                    <details>
                      <summary>{t('integration.technicalDetails')}</summary>
                      <code>
                        {issue.code} · {issue.external_id}
                      </code>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {resolveTarget && (
            <section
              ref={resolutionRef}
              tabIndex={-1}
              className="retail-integration__card retail-integration__confirm"
              role="group"
              aria-label={t('integration.confirmTitle')}
            >
              <h2>{resolveTarget.name || resolveTarget.external_id}</h2>
              <p>
                {t(
                  resolveTarget.code === 'OWNERSHIP_CONFLICT'
                    ? 'integration.confirm.adopt'
                    : 'integration.confirm.resolve'
                )}
              </p>
              {resolveTarget.code === 'OWNERSHIP_CONFLICT' && (
                <dl className="retail-integration__facts">
                  <div>
                    <dt>{t('integration.targetPrice')}</dt>
                    <dd>{resolveTarget.target_price_kzt ?? '—'} ₸</dd>
                  </div>
                  <div>
                    <dt>{t('integration.sourcePrice')}</dt>
                    <dd>
                      {resolveTarget.source_regular_minor == null
                        ? '—'
                        : resolveTarget.source_regular_minor / 100}{' '}
                      ₸
                    </dd>
                  </div>
                  <div>
                    <dt>{t('integration.sourceQuantity')}</dt>
                    <dd>{resolveTarget.source_stock_quantity ?? '—'}</dd>
                  </div>
                </dl>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  runAction('resolve', {
                    source_id: resolveTarget.source_id,
                    expected_revision: resolveTarget.revision,
                    adopt: resolveTarget.code === 'OWNERSHIP_CONFLICT',
                    expected_manual_price:
                      resolveTarget.code === 'OWNERSHIP_CONFLICT'
                        ? (resolveTarget.target_price_kzt ?? null)
                        : null,
                    expected_manual_updated_at:
                      resolveTarget.code === 'OWNERSHIP_CONFLICT'
                        ? (resolveTarget.target_updated_at ?? null)
                        : null,
                  })
                }
              >
                {t('integration.confirmAction')}
              </button>
              <button type="button" onClick={() => setResolveTarget(null)}>
                {t('integration.cancel')}
              </button>
            </section>
          )}

          <section className="retail-integration__card">
            <h2>{t('integration.manageTitle')}</h2>
            {(!integration || health.state === 'revoked') && (
              <>
                <p>{t('integration.compatibilityHelp')}</p>
                <label className="retail-integration__checkbox">
                  <input
                    type="checkbox"
                    checked={compatible}
                    onChange={(event) => setCompatible(event.target.checked)}
                  />
                  {t('integration.compatibilityConfirm')}
                </label>
                <button
                  className="retail-integration__button"
                  type="button"
                  disabled={!compatible || busy}
                  onClick={() => runAction('create')}
                >
                  {t('integration.create')}
                </button>
              </>
            )}
            {canManage && (
              <div className="retail-integration__actions">
                <button type="button" disabled={busy} onClick={() => setConfirmAction('rotate')}>
                  {t('integration.rotate')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAction(health.state === 'paused' ? 'resume' : 'pause')}
                >
                  {t(health.state === 'paused' ? 'integration.resume' : 'integration.pause')}
                </button>
                <button type="button" disabled={busy} onClick={() => setConfirmAction('revoke')}>
                  {t('integration.revoke')}
                </button>
              </div>
            )}
            {confirmAction && (
              <div
                className="retail-integration__confirm"
                role="group"
                aria-label={t('integration.confirmTitle')}
              >
                <p>{t(`integration.confirm.${confirmAction}`)}</p>
                <button type="button" disabled={busy} onClick={() => runAction(confirmAction)}>
                  {t('integration.confirmAction')}
                </button>
                <button type="button" onClick={() => setConfirmAction(null)}>
                  {t('integration.cancel')}
                </button>
              </div>
            )}
            {token && (
              <div className="retail-integration__secret" role="status">
                <CheckCircleIcon size={22} />
                <div>
                  <strong>{t('integration.tokenTitle')}</strong>
                  <p>{t('integration.tokenHelp')}</p>
                  <code>{token}</code>
                  <button type="button" onClick={() => setToken(null)}>
                    {t('integration.hideToken')}
                  </button>
                </div>
              </div>
            )}
            {error && (
              <p className="retail-integration__error" role="alert">
                {errorText}
              </p>
            )}
          </section>
        </>
      )}

      <section className="retail-integration__footnote">
        <h2>{t('integration.nextTitle')}</h2>
        <p>{t('integration.nextBody')}</p>
      </section>
    </main>
  )
}

export default function RetailIntegrationScreen() {
  const { storeId, currentStore } = useStore()
  return (
    <IntegrationContent key={storeId || 'none'} storeId={storeId} currentStore={currentStore} />
  )
}
