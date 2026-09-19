import { useMemo, useState } from 'react'
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
  const { t: dict } = useI18n()
  const { storeId } = useStore()
  const t = dict.retail.import
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState([])
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  const canApply = storeId && rows.length > 0 && status !== 'applying'
  const previewRows = useMemo(() => rows.slice(0, 8), [rows])
  const unknownRows = result?.unknownRows || result?.skipped || []
  const failedRows = result?.failed || []

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      setMessage(t.fileTooLarge)
      return
    }

    setStatus('parsing')
    setMessage('')
    setResult(null)
    setFileName(file.name)

    try {
      const parsed = await parseRetailImportFile(file)
      setRows(parsed.rows)
      setErrors(parsed.errors)
      setStatus('ready')
      if (parsed.rows.length === 0) setMessage(t.empty)
    } catch {
      setRows([])
      setErrors([])
      setStatus('idle')
      setMessage(t.parseError)
    }
  }

  const handleApply = async () => {
    if (!canApply) return
    setStatus('applying')
    setMessage('')
    try {
      const nextResult = await applyRetailImport(storeId, rows)
      setResult(nextResult)
      setStatus('done')
    } catch (error) {
      setStatus('ready')
      setMessage(error.message || t.parseError)
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
    setFileName('')
    setRows([])
    setErrors([])
    setResult(null)
    setStatus('idle')
    setMessage('')
  }

  const statCards = result
    ? [
        { label: t.updated, value: result.updated, color: '#34D399' },
        { label: t.autoResolved, value: result.autoResolved || 0, color: '#38BDF8' },
        { label: t.staged, value: result.staged || 0, color: '#FBBF24' },
        { label: t.failedRows, value: failedRows.length, color: '#F87171' },
      ]
    : [
        { label: t.validRows, value: rows.length, color: '#34D399' },
        { label: t.errors, value: errors.length, color: '#FBBF24' },
        { label: t.readyToApply, value: rows.length > 0 ? 'OK' : '—', color: '#38BDF8' },
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
          {fileName || t.choose}
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

      {(rows.length > 0 || errors.length > 0 || result) && (
        <div style={{ display: 'flex', gap: 10 }}>
          {statCards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} color={card.color} />
          ))}
        </div>
      )}

      {rows.length > 0 && (
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
              {result ? t.report : t.preview}
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

      {errors.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: 14 }}>{t.parseErrors}</div>
          {errors.slice(0, 5).map((error, index) => (
            <div key={`${error.row}-${index}`} style={{ fontSize: 12, color: '#FBBF24' }}>
              {error.row ? `${t.rowLabel} ${error.row}: ` : ''}
              {error.ean ? `${error.ean} — ` : ''}
              {error.message}
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
                {t.unknownHint}
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
          : status === 'applying'
            ? t.applying
            : result
              ? `${t.updated}: ${result.updated} / ${t.autoResolved}: ${result.autoResolved || 0}`
              : t.apply}
      </button>
    </div>
  )
}
