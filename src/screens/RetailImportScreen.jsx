import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  applyRetailImport,
  downloadRetailImportTemplate,
  downloadUnknownEansReport,
  parseRetailImportFile,
} from '../utils/retailImport.js'
import { useI18n } from '../i18n/index.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { UploadFileIcon } from '../components/icons/index.js'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const IMPORT_ERROR_KEYS = {
  invalid_stock_status: 'invalidStockStatus',
  missing_stock_status: 'missingStockStatus',
  non_text_ean: 'nonTextEan',
  invalid_price: 'invalidPrice',
  invalid_ean: 'invalidEan',
  duplicate_ean: 'duplicateEan',
  missing_ean_column: 'missingEanColumn',
  missing_price_column: 'missingPriceColumn',
}
let applyInProgress = false
const applyListeners = new Set()

function setApplyInProgress(value) {
  applyInProgress = value
  applyListeners.forEach((listener) => listener())
}

function subscribeToApply(listener) {
  applyListeners.add(listener)
  return () => applyListeners.delete(listener)
}

function getApplySnapshot() {
  return applyInProgress
}

function StatCard({ label, value, color = '#38BDF8' }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: 14,
        borderRadius: 14,
        background: 'var(--glass-subtle)',
        border: '1px solid var(--glass-soft-border)',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color, fontFamily: 'var(--font-display)' }}>
        {value}
      </div>
    </div>
  )
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 0,
        padding: '12px 14px',
        borderRadius: 14,
        border: '1px solid rgba(56,189,248,0.22)',
        background: 'rgba(56,189,248,0.08)',
        color: '#93C5FD',
        fontSize: 13,
        fontWeight: 800,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function RowCard({ row, accent = '#A7F3D0', reason }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 10,
        padding: 12,
        borderRadius: 14,
        background: 'var(--glass-subtle)',
        border: '1px solid var(--glass-soft-border)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: 13 }}>{row.ean}</div>
        <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 3 }}>
          {row.localName || row.shelfZone || row.stockStatus}
        </div>
        {reason && <div style={{ color: '#FCA5A5', fontSize: 12, marginTop: 6 }}>{reason}</div>}
      </div>
      <div style={{ color: accent, fontWeight: 900, whiteSpace: 'nowrap' }}>{row.priceKzt} ₸</div>
    </div>
  )
}

export default function RetailImportScreen() {
  const { storeId } = useStore()
  return <RetailImportContent key={storeId || 'no-store'} storeId={storeId} />
}

function RetailImportContent({ storeId }) {
  const { t: translate } = useI18n()
  const t = useMemo(
    () => new Proxy({}, { get: (_, prop) => translate(`retail.import.${String(prop)}`) }),
    [translate]
  )
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState([])
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [rowsStoreId, setRowsStoreId] = useState(null)
  const isApplying = useSyncExternalStore(subscribeToApply, getApplySnapshot)
  const generation = useRef(0)

  const visible = rowsStoreId === storeId
  const visibleRows = useMemo(() => visible ? rows : [], [visible, rows])
  const visibleErrors = visible ? errors : []
  const visibleResult = visible ? result : null
  const canApply = storeId && visibleRows.length > 0 && status === 'ready' && !isApplying
  const previewRows = useMemo(() => visibleRows.slice(0, 8), [visibleRows])
  const unknownRows = visibleResult?.unknownRows || visibleResult?.skipped || []
  const failedRows = visibleResult?.failed || []

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || applyInProgress || status === 'applying') return
    const request = ++generation.current
    const requestedStoreId = storeId
    setRows([])
    setErrors([])
    setResult(null)
    setRowsStoreId(requestedStoreId)
    setFileName(file.name)
    if (file.size > MAX_FILE_SIZE) {
      setStatus('idle')
      setMessage(t.fileTooLarge)
      return
    }

    setStatus('parsing')
    setMessage('')
    try {
      const parsed = await parseRetailImportFile(file)
      if (request !== generation.current) return
      setRows(parsed.rows)
      setErrors(parsed.errors)
      setStatus('ready')
      if (parsed.rows.length === 0) setMessage(t.empty)
    } catch {
      if (request !== generation.current) return
      setRows([])
      setErrors([])
      setStatus('idle')
      setMessage(t.parseError)
    }
  }

  const handleApply = async () => {
    if (!canApply || applyInProgress) return
    setApplyInProgress(true)
    const request = ++generation.current
    const requestedStoreId = storeId
    const requestedRows = rows
    setStatus('applying')
    setMessage('')
    try {
      const nextResult = await applyRetailImport(requestedStoreId, requestedRows)
      if (request !== generation.current) return
      setResult(nextResult)
      setStatus('done')
    } catch (error) {
      if (request !== generation.current) return
      setStatus('ready')
      setMessage(error.message || t.parseError)
    } finally {
      setApplyInProgress(false)
    }
  }

  const handleTemplateDownload = async (format) => {
    setMessage('')
    try {
      await downloadRetailImportTemplate(format)
    } catch {
      setMessage(t.templateError)
    }
  }

  const handleUnknownExport = () => {
    try {
      downloadUnknownEansReport(unknownRows)
    } catch {
      setMessage(t.templateError)
    }
  }

  const reset = () => {
    if (applyInProgress) return
    generation.current += 1
    setFileName('')
    setRows([])
    setErrors([])
    setResult(null)
    setRowsStoreId(null)
    setStatus('idle')
    setMessage('')
  }

  const statCards = visibleResult
    ? [
        { label: t.updated, value: visibleResult.updated, color: '#34D399' },
        { label: t.autoResolved, value: visibleResult.autoResolved || 0, color: '#38BDF8' },
        { label: t.staged, value: visibleResult.staged || 0, color: '#FBBF24' },
        { label: t.failedRows, value: failedRows.length, color: '#F87171' },
      ]
    : [
        { label: t.validRows, value: visibleRows.length, color: '#34D399' },
        { label: t.errors, value: visibleErrors.length, color: '#FBBF24' },
        { label: t.readyToApply, value: visibleRows.length > 0 ? 'OK' : '—', color: '#38BDF8' },
      ]

  return (
    <div style={{ padding: '20px 16px 80px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            color: 'var(--text)',
            margin: '0 0 8px',
          }}
        >
          {t.title}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-sub)', margin: 0, lineHeight: 1.45 }}>
          {t.subtitle}
        </p>
      </div>

      <div
        style={{
          padding: 14,
          borderRadius: 18,
          background: 'rgba(56,189,248,0.06)',
          border: '1px solid rgba(56,189,248,0.14)',
        }}
      >
        <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: 14 }}>{t.templateTitle}</div>
        <div
          style={{
            color: 'var(--text-dim)',
            fontSize: 12,
            lineHeight: 1.45,
            marginTop: 6,
            marginBottom: 12,
          }}
        >
          {t.template}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <SecondaryButton onClick={() => handleTemplateDownload('csv')}>
            {t.downloadCsv}
          </SecondaryButton>
          <SecondaryButton onClick={() => handleTemplateDownload('xlsx')}>
            {t.downloadXlsx}
          </SecondaryButton>
        </div>
      </div>

      <label
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 176,
          padding: '28px 20px',
          borderRadius: 20,
          cursor: 'pointer',
          background: 'rgba(56,189,248,0.055)',
          border: '1.5px dashed rgba(56,189,248,0.46)',
        }}
      >
        <UploadFileIcon size={38} color="#38BDF8" />
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 12 }}>
          {(visible && fileName) || t.choose}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', marginTop: 6 }}>
          {t.formats}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 10 }}>
          {t.template}
        </div>
        <input
          type="file"
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          onChange={handleFile}
          disabled={isApplying}
          style={{ display: 'none' }}
        />
      </label>

      {message && (
        <div
          style={{
            padding: 13,
            borderRadius: 14,
            color: '#FBBF24',
            background: 'rgba(251,191,36,0.09)',
            border: '1px solid rgba(251,191,36,0.2)',
            fontSize: 13,
          }}
        >
          {message}
        </div>
      )}

      {(visibleRows.length > 0 || visibleErrors.length > 0 || visibleResult) && (
        <div style={{ display: 'flex', gap: 10 }}>
          {statCards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} color={card.color} />
          ))}
        </div>
      )}

      {visibleRows.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                color: 'var(--text)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {visibleResult ? t.report : t.preview}
            </h3>
            <button
              onClick={reset}
              style={{
                background: 'none',
                border: 'none',
                color: '#93C5FD',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t.reset}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {previewRows.map((row) => (
              <RowCard key={row.ean} row={row} />
            ))}
          </div>
        </div>
      )}

      {visibleErrors.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: 14 }}>{t.parseErrors}</div>
          {visibleErrors.slice(0, 5).map((error, index) => (
            <div key={`${error.row}-${index}`} style={{ fontSize: 12, color: '#FBBF24' }}>
              {error.row ? `${t.rowLabel} ${error.row}: ` : ''}
              {error.ean ? `${error.ean} — ` : ''}
              {IMPORT_ERROR_KEYS[error.code] ? t[IMPORT_ERROR_KEYS[error.code]] : error.message}
            </div>
          ))}
        </div>
      )}

      {unknownRows.length > 0 && (
        <div
          style={{
            padding: 13,
            borderRadius: 14,
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.18)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div>
              <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: 14 }}>
                {t.unknownTitle}
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 4 }}>
                {visibleResult.resolutionError
                  ? t.unknownProcessingFailedHint
                  : visibleResult.staged > 0 || visibleResult.autoResolved > 0
                    ? t.unknownHint
                    : t.unknownUnconfirmedHint}
              </div>
            </div>
            <button
              onClick={handleUnknownExport}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(251,191,36,0.24)',
                background: 'rgba(251,191,36,0.1)',
                color: '#FCD34D',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {t.downloadUnknown}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unknownRows.slice(0, 5).map((row) => (
              <RowCard key={`unknown-${row.ean}`} row={row} accent="#FCD34D" reason={row.reason} />
            ))}
          </div>
        </div>
      )}

      {failedRows.length > 0 && (
        <div
          style={{
            padding: 13,
            borderRadius: 14,
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.18)',
          }}
        >
          <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: 14, marginBottom: 10 }}>
            {t.failedTitle}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {failedRows.slice(0, 5).map((row, index) => (
              <RowCard
                key={`failed-${row.ean}-${index}`}
                row={row}
                accent="#FCA5A5"
                reason={row.reason}
              />
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleApply}
        disabled={!canApply}
        style={{
          padding: '15px 18px',
          borderRadius: 16,
          border: 'none',
          background: canApply
            ? 'linear-gradient(135deg, #0EA5E9, #2563EB)'
            : 'var(--glass-soft-border)',
          color: canApply ? '#fff' : 'var(--text-disabled)',
          fontSize: 15,
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          cursor: canApply ? 'pointer' : 'not-allowed',
          boxShadow: canApply ? '0 12px 26px rgba(14,165,233,0.22)' : 'none',
        }}
      >
        {!storeId
          ? t.noStore
          : visible && status === 'applying'
            ? t.applying
            : visibleResult
              ? `${t.updated}: ${visibleResult.updated} / ${t.autoResolved}: ${visibleResult.autoResolved || 0}`
              : t.apply}
      </button>
    </div>
  )
}
