import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/index.js'
import { supabase } from '../utils/supabase.js'
import { getImageUrl } from '../utils/imageUrl.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { buildProductPath } from '../utils/routes.js'
import {
  buildProductCorrectionReviewSummary,
  normalizeProductCorrectionReviewEvent,
} from '../domain/product/correctionReview.js'
import {
  buildManualAliasCandidateRequest,
  buildTrustedAliasTypedConfirmation,
  normalizeTrustedAliasReviewCandidate,
} from '../domain/product/eanAliases.js'
import RetailScannerModal from '../components/RetailScannerModal.jsx'

const PAGE_SIZE = 50
const CORRECTION_REPORT_LIMIT = 30
const TRUSTED_ALIAS_CANDIDATE_LIMIT = 20

function isValidEan(code) {
  if (!code || typeof code !== 'string') return false
  const clean = code.replace(/\s/g, '')
  if (!/^\d+$/.test(clean)) return false
  const pre = clean.substring(0, 3)
  if (pre >= '020' && pre <= '029') return false
  if (pre >= '040' && pre <= '049') return false
  if (clean.length === 12) return true
  if (clean.length !== 13) return false
  const sum = clean
    .slice(0, 12)
    .split('')
    .reduce((s, d, i) => s + parseInt(d) * (i % 2 === 0 ? 1 : 3), 0)
  const check = (10 - (sum % 10)) % 10
  return parseInt(clean[12]) === check
}

async function eanApi(action, payload) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Не авторизован')

  const res = await fetch('/api/ean-recovery', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  })

  const json = await res.json()
  if (!res.ok) {
    if (json.error === 'duplicate') throw new Error('DUPLICATE')
    throw new Error(json.error || 'Server error')
  }
  return json
}

function formatReportTime(value) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return '—'
  }
}

export default function EanRecoveryScreen() {
  const { t } = useI18n()
  const { isAdmin } = useAuth()
  const { currentStore } = useStore()
  const storeSlug = currentStore?.slug || currentStore?.code
  const storeId = currentStore?.id || null

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editEan, setEditEan] = useState('')
  const [editingNameId, setEditingNameId] = useState(null)
  const [editName, setEditName] = useState('')
  const [scannerForId, setScannerForId] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [initialTotal, setInitialTotal] = useState(0)
  const [correctionReports, setCorrectionReports] = useState([])
  const [correctionReportsLoading, setCorrectionReportsLoading] = useState(false)
  const [correctionReportsError, setCorrectionReportsError] = useState(null)
  const [savingCorrectionId, setSavingCorrectionId] = useState(null)
  const [trustedAliasCandidates, setTrustedAliasCandidates] = useState([])
  const [trustedAliasCandidatesLoading, setTrustedAliasCandidatesLoading] = useState(false)
  const [trustedAliasCandidatesError, setTrustedAliasCandidatesError] = useState(null)
  const [trustedAliasPromotionCandidate, setTrustedAliasPromotionCandidate] = useState(null)
  const [trustedAliasPromotionInput, setTrustedAliasPromotionInput] = useState('')
  const [trustedAliasPromotionError, setTrustedAliasPromotionError] = useState(null)
  const [trustedAliasPromotionSuccess, setTrustedAliasPromotionSuccess] = useState(null)
  const [promotingTrustedAliasId, setPromotingTrustedAliasId] = useState(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const all = []
      for (let page = 0; page < 20; page++) {
        const { data, error: fetchError } = await supabase
          .from('global_products')
          .select(
            'id, ean, name, name_kz, brand, category, image_url, ingredients_raw, source_primary'
          )
          .eq('is_active', true)
          .or('ean.like.arbuz_%,ean.like.kaspi_%,ean.like.korzinavdom_%')
          .order('brand')
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        if (fetchError) throw fetchError
        if (!data || data.length === 0) break
        all.push(...data)
        if (data.length < PAGE_SIZE) break
      }
      setProducts(all)
      setInitialTotal(all.length)
    } catch (e) {
      setError(e?.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCorrectionReports = useCallback(async () => {
    if (!storeId) return
    setCorrectionReportsLoading(true)
    setCorrectionReportsError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('product_correction_events')
        .select('id, ean, shown_ean, reason, context, status, comment, metadata_json, created_at')
        .eq('store_id', storeId)
        .in('status', ['new', 'reviewing'])
        .order('created_at', { ascending: false })
        .limit(CORRECTION_REPORT_LIMIT)
      if (fetchError) throw fetchError
      setCorrectionReports((data || []).map(normalizeProductCorrectionReviewEvent))
    } catch (e) {
      setCorrectionReportsError(e?.message || 'Failed to load correction reports')
    } finally {
      setCorrectionReportsLoading(false)
    }
  }, [storeId])

  const loadTrustedAliasCandidates = useCallback(async () => {
    if (!isAdmin) return
    setTrustedAliasCandidatesLoading(true)
    setTrustedAliasCandidatesError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('product_ean_aliases')
        .select(
          'id, ean, global_product_id, status, source, confidence, evidence_json, is_active, updated_at, global_products!product_ean_aliases_global_product_id_fkey(id, name, brand, ean)'
        )
        .eq('status', 'review')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(TRUSTED_ALIAS_CANDIDATE_LIMIT)
      if (fetchError) throw fetchError
      setTrustedAliasCandidates((data || []).map(normalizeTrustedAliasReviewCandidate))
    } catch (e) {
      setTrustedAliasCandidatesError(e?.message || 'Failed to load trusted alias candidates')
    } finally {
      setTrustedAliasCandidatesLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    loadCorrectionReports()
  }, [loadCorrectionReports])

  useEffect(() => {
    loadTrustedAliasCandidates()
  }, [loadTrustedAliasCandidates])

  const handleSaveEan = async (product) => {
    const code = editEan.trim()
    if (!code) return
    if (!isValidEan(code)) {
      setError(t('retail.products.invalidEan'))
      return
    }

    setSaving(product.id)
    setError(null)

    try {
      await eanApi('update-ean', { id: product.id, ean: code })
      setProducts((prev) => prev.filter((pr) => pr.id !== product.id))
      setEditingId(null)
      setEditEan('')
      setSaving(null)
      setSuccess(product.brand + ' ' + (product.name || '').substring(0, 25))
      setTimeout(() => setSuccess(null), 2500)
    } catch (e) {
      if (e.message === 'DUPLICATE') {
        setError(t('retail.products.duplicateEan'))
      } else {
        setError(e.message)
      }
      setSaving(null)
    }
  }

  const handleCreateManualAliasCandidate = async (product) => {
    const request = buildManualAliasCandidateRequest({ productId: product?.id, ean: editEan })
    if (!request.ok) {
      const key =
        request.reason === 'ean_not_scannable'
          ? 'retail.eanRecovery.aliasCandidateInvalidEan'
          : 'retail.eanRecovery.aliasCandidateFailed'
      setError(t(key))
      return
    }

    setSaving(product.id)
    setError(null)
    try {
      await eanApi(request.payload.action, { id: request.payload.id, ean: request.payload.ean })
      setEditingId(null)
      setEditEan('')
      setSuccess(t('retail.eanRecovery.aliasCandidateSuccess', { ean: request.payload.ean }))
      setTimeout(() => setSuccess(null), 2500)
      await loadTrustedAliasCandidates()
    } catch (e) {
      const key =
        e.message === 'DUPLICATE'
          ? 'retail.eanRecovery.aliasCandidateDuplicate'
          : 'retail.eanRecovery.aliasCandidateFailed'
      setError(t(key))
    } finally {
      setSaving(null)
    }
  }

  const handleSaveName = async (product) => {
    const name = editName.trim()
    if (!name || name === product.name) {
      setEditingNameId(null)
      return
    }

    setSaving(product.id)
    setError(null)

    try {
      await eanApi('update-name', { id: product.id, name })
      setProducts((prev) => prev.map((pr) => (pr.id === product.id ? { ...pr, name } : pr)))
      setEditingNameId(null)
      setEditName('')
      setSaving(null)
    } catch (e) {
      setError(e.message)
      setSaving(null)
    }
  }

  const handleFullDelete = async (product) => {
    setSaving(product.id)
    setError(null)

    try {
      await eanApi('delete', { id: product.id })
      setProducts((prev) => prev.filter((pr) => pr.id !== product.id))
      setSaving(null)
      setConfirmDeleteId(null)
    } catch (e) {
      setError(t('retail.products.deleteError') + e.message)
      setSaving(null)
      setConfirmDeleteId(null)
    }
  }

  const handleScanEan = (ean) => {
    const targetId = scannerForId
    setScannerForId(null)
    if (!ean) return
    setEditingId(targetId)
    setEditEan(ean)
    setError(null)
  }

  const handleCorrectionStatus = async (report, status) => {
    if (!report?.id || savingCorrectionId) return
    setSavingCorrectionId(report.id)
    setCorrectionReportsError(null)
    try {
      await eanApi('update-correction-status', { id: report.id, status })
      await loadCorrectionReports()
    } catch (e) {
      setCorrectionReportsError(e?.message || 'Failed to update correction report')
    } finally {
      setSavingCorrectionId(null)
    }
  }

  const openTrustedAliasPromotion = (candidate) => {
    if (!isAdmin || !candidate?.canRequestPromotion) return
    setTrustedAliasPromotionCandidate(candidate)
    setTrustedAliasPromotionInput('')
    setTrustedAliasPromotionError(null)
    setTrustedAliasPromotionSuccess(null)
  }

  const closeTrustedAliasPromotion = () => {
    if (promotingTrustedAliasId) return
    setTrustedAliasPromotionCandidate(null)
    setTrustedAliasPromotionInput('')
    setTrustedAliasPromotionError(null)
  }

  const handleTrustedAliasPromotion = async () => {
    const candidate = trustedAliasPromotionCandidate
    const confirmation = buildTrustedAliasTypedConfirmation({
      ean: candidate?.ean,
      input: trustedAliasPromotionInput,
    })
    if (!isAdmin || !candidate?.canRequestPromotion || !confirmation.isConfirmed) {
      setTrustedAliasPromotionError(t('retail.eanRecovery.aliasPromotionConfirmError'))
      return
    }

    setPromotingTrustedAliasId(candidate.id)
    setTrustedAliasPromotionError(null)
    try {
      await eanApi('promote-ean-alias-trusted', { id: candidate.id })
      setTrustedAliasPromotionSuccess(candidate.ean)
      setTrustedAliasPromotionCandidate(null)
      setTrustedAliasPromotionInput('')
      await loadTrustedAliasCandidates()
    } catch (e) {
      const key =
        e?.message === 'promotion_blocked'
          ? 'retail.eanRecovery.aliasPromotionBlocked'
          : 'retail.eanRecovery.aliasPromotionFailed'
      setTrustedAliasPromotionError(t(key))
    } finally {
      setPromotingTrustedAliasId(null)
    }
  }

  const filtered = products.filter((pr) => {
    if (filter === 'branded' && (!pr.brand || pr.brand.length <= 1)) return false
    if (filter === 'nobrand' && pr.brand && pr.brand.length > 1) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        (pr.name || '').toLowerCase().includes(q) ||
        (pr.brand || '').toLowerCase().includes(q) ||
        (pr.ean || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const resolved = initialTotal - products.length
  const confirmProduct = products.find((pr) => pr.id === confirmDeleteId)
  const correctionSummary = buildProductCorrectionReviewSummary(correctionReports)
  const trustedAliasConfirmation = buildTrustedAliasTypedConfirmation({
    ean: trustedAliasPromotionCandidate?.ean,
    input: trustedAliasPromotionInput,
  })

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--retail-bg)', paddingBottom: 90 }}>
      {scannerForId && (
        <RetailScannerModal onScan={handleScanEan} onClose={() => setScannerForId(null)} />
      )}

      {confirmProduct &&
        createPortal(
          <div
            onClick={() => setConfirmDeleteId(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9995,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 360,
                background: 'var(--glass-bg)',
                borderRadius: 20,
                padding: '24px 20px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'rgba(239,68,68,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 22, color: '#F87171' }}
                  >
                    delete_forever
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                    {t('retail.products.fullDelete')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                    {t('retail.products.fullDeleteDesc')}
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-sub)',
                  background: 'var(--glass-subtle)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginBottom: 20,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {confirmProduct.name}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    borderRadius: 12,
                    border: '1px solid var(--glass-border)',
                    background: 'var(--glass-bg)',
                    color: 'var(--text-sub)',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {t('retail.products.cancel')}
                </button>
                <button
                  onClick={() => handleFullDelete(confirmProduct)}
                  disabled={saving === confirmProduct.id}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    borderRadius: 12,
                    border: 'none',
                    background:
                      saving === confirmProduct.id ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.85)',
                    color: 'var(--text-inverse)',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: saving === confirmProduct.id ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {saving === confirmProduct.id ? '...' : t('retail.products.deleteForever')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {isAdmin &&
        trustedAliasPromotionCandidate &&
        createPortal(
          <div
            onClick={closeTrustedAliasPromotion}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9995,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 390,
                background: 'var(--glass-bg)',
                borderRadius: 20,
                padding: '24px 20px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                border: '1px solid rgba(16,185,129,0.22)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'rgba(16,185,129,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 22, color: '#10B981' }}
                  >
                    verified
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                    {t('retail.eanRecovery.aliasPromotionTitle')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                    {t('retail.eanRecovery.aliasPromotionSubtitle')}
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-sub)',
                  background: 'var(--glass-subtle)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  lineHeight: 1.45,
                  marginBottom: 12,
                }}
              >
                <div style={{ fontWeight: 750, color: 'var(--text)', marginBottom: 4 }}>
                  {trustedAliasPromotionCandidate.productBrand
                    ? `${trustedAliasPromotionCandidate.productBrand} · `
                    : ''}
                  {trustedAliasPromotionCandidate.productName ||
                    t('retail.eanRecovery.aliasUnknownProduct')}
                </div>
                <div style={{ fontFamily: 'monospace' }}>{trustedAliasPromotionCandidate.ean}</div>
              </div>

              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  color: 'var(--text-sub)',
                  lineHeight: 1.45,
                }}
              >
                {t('retail.eanRecovery.aliasPromotionInputLabel', {
                  code: trustedAliasConfirmation.expectedText,
                })}
                <input
                  type="text"
                  inputMode="numeric"
                  value={trustedAliasPromotionInput}
                  onChange={(e) => setTrustedAliasPromotionInput(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    marginTop: 8,
                    padding: '11px 12px',
                    fontSize: 16,
                    letterSpacing: 2,
                    fontFamily: 'monospace',
                    background: 'var(--input-bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--input-border)',
                    borderRadius: 12,
                    outline: 'none',
                  }}
                />
              </label>

              {trustedAliasPromotionError && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: 'var(--error-bright)',
                    lineHeight: 1.4,
                  }}
                >
                  {trustedAliasPromotionError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button
                  onClick={closeTrustedAliasPromotion}
                  disabled={!!promotingTrustedAliasId}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    borderRadius: 12,
                    border: '1px solid var(--glass-border)',
                    background: 'var(--glass-bg)',
                    color: 'var(--text-sub)',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: promotingTrustedAliasId ? 'wait' : 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {t('retail.products.cancel')}
                </button>
                <button
                  onClick={handleTrustedAliasPromotion}
                  disabled={!trustedAliasConfirmation.isConfirmed || !!promotingTrustedAliasId}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    borderRadius: 12,
                    border: 'none',
                    background: trustedAliasConfirmation.isConfirmed
                      ? 'var(--retail-accent)'
                      : 'var(--glass-subtle)',
                    color: trustedAliasConfirmation.isConfirmed
                      ? 'var(--text-inverse)'
                      : 'var(--text-disabled)',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor:
                      trustedAliasConfirmation.isConfirmed && !promotingTrustedAliasId
                        ? 'pointer'
                        : 'not-allowed',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {promotingTrustedAliasId
                    ? t('retail.eanRecovery.aliasPromotionSaving')
                    : t('retail.eanRecovery.aliasPromotionConfirm')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'var(--retail-header-bg)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--retail-border)',
          padding: '16px 16px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span className="material-symbols-outlined" style={{ color: '#FB923C', fontSize: 24 }}>
            qr_code_scanner
          </span>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {t('retail.products.eanRecovery')}
          </h1>
          {products.length === 0 && !loading ? (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 12,
                fontWeight: 600,
                color: '#10B981',
                background: 'rgba(16,185,129,0.12)',
                padding: '3px 10px',
                borderRadius: 20,
              }}
            >
              {t('retail.products.allResolved')}
            </span>
          ) : (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 12,
                fontWeight: 600,
                color: '#FB923C',
                background: 'rgba(251,146,60,0.12)',
                padding: '3px 10px',
                borderRadius: 20,
              }}
            >
              {products.length} {t('retail.products.withoutBarcode')}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 12 }}>
          {t('retail.products.eanRecoveryDesc')}
          {resolved > 0 && (
            <span style={{ color: '#10B981', marginLeft: 8 }}>
              {t('retail.products.resolved')} {resolved}
            </span>
          )}
        </div>

        <input
          type="text"
          placeholder={t('retail.products.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            fontSize: 14,
            background: 'var(--input-bg)',
            color: 'var(--text)',
            border: '1px solid var(--input-border)',
            borderRadius: 12,
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'var(--font-body)',
          }}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {[
            { id: 'all', label: `${t('retail.products.filterAll')} (${products.length})` },
            { id: 'branded', label: t('retail.products.filterBranded') },
            { id: 'nobrand', label: t('retail.products.filterNoBrand') },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                background: filter === f.id ? 'var(--retail-accent)' : 'var(--glass-bg)',
                color: filter === f.id ? '#fff' : 'var(--text-sub)',
                outline: filter === f.id ? 'none' : '1px solid var(--glass-border)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {success && (
        <div
          style={{
            margin: '12px 16px',
            padding: '10px 16px',
            borderRadius: 12,
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.3)',
            color: '#10B981',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {t('retail.products.saved')} {success}
        </div>
      )}

      {error && (
        <div
          style={{
            margin: '12px 16px',
            padding: '10px 16px',
            borderRadius: 12,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#F87171',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      <section
        style={{
          margin: '12px 16px 10px',
          padding: 14,
          borderRadius: 18,
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-soft-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'var(--glass-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: 'var(--retail-accent)' }}
            >
              report
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: 2,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                {t('retail.eanRecovery.reportsTitle')}
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-sub)',
                  background: 'var(--glass-subtle)',
                  borderRadius: 999,
                  padding: '3px 8px',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('retail.eanRecovery.readOnly')}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.45 }}>
              {t('retail.eanRecovery.reportsSubtitle')}
            </div>
          </div>
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}
        >
          {[
            { label: t('retail.eanRecovery.openReports'), value: correctionSummary.open },
            {
              label: t('retail.eanRecovery.identityReports'),
              value: correctionSummary.identityCount,
            },
            {
              label: t('retail.eanRecovery.dataReports'),
              value: correctionSummary.dataQualityCount,
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                borderRadius: 12,
                background: 'var(--glass-subtle)',
                border: '1px solid var(--glass-border)',
                padding: '9px 8px',
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
                {item.value}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {correctionReportsLoading ? (
          <div style={{ padding: '14px 0 2px', fontSize: 12, color: 'var(--text-dim)' }}>
            {t('retail.eanRecovery.reportsLoading')}
          </div>
        ) : correctionReportsError ? (
          <div style={{ padding: '14px 0 2px', fontSize: 12, color: 'var(--error-bright)' }}>
            {t('retail.eanRecovery.reportsError')}: {correctionReportsError}
          </div>
        ) : correctionReports.length === 0 ? (
          <div style={{ padding: '14px 0 2px', fontSize: 12, color: 'var(--text-dim)' }}>
            {t('retail.eanRecovery.noReports')}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {correctionReports.slice(0, 5).map((report) => (
              <div
                key={report.id}
                style={{
                  borderRadius: 13,
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  padding: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--text)' }}>
                      {t(`retail.eanRecovery.reason.${report.reason}`)}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-dim)',
                        marginTop: 2,
                        fontFamily: 'monospace',
                      }}
                    >
                      {report.ean}
                      {report.shownEan && report.shownEan !== report.ean
                        ? ` → ${report.shownEan}`
                        : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                    {formatReportTime(report.createdAt)}
                  </div>
                </div>
                {report.shownProductName && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: 'var(--text-sub)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {report.shownProductName}
                  </div>
                )}
                {report.comment && (
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 12,
                      color: 'var(--text-sub)',
                      lineHeight: 1.35,
                    }}
                  >
                    {report.comment}
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
                  {report.status === 'new' && (
                    <button
                      onClick={() => handleCorrectionStatus(report, 'reviewing')}
                      disabled={savingCorrectionId === report.id}
                      style={{
                        border: '1px solid var(--glass-border)',
                        background: 'var(--glass-subtle)',
                        color: 'var(--text-sub)',
                        borderRadius: 9,
                        padding: '6px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: savingCorrectionId === report.id ? 'wait' : 'pointer',
                      }}
                    >
                      {t('retail.eanRecovery.action.reviewing')}
                    </button>
                  )}
                  {['fixed', 'rejected', 'duplicate'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleCorrectionStatus(report, status)}
                      disabled={savingCorrectionId === report.id}
                      style={{
                        border: '1px solid var(--glass-border)',
                        background:
                          status === 'fixed' ? 'rgba(16,185,129,0.12)' : 'var(--glass-subtle)',
                        color: status === 'fixed' ? '#10B981' : 'var(--text-sub)',
                        borderRadius: 9,
                        padding: '6px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: savingCorrectionId === report.id ? 'wait' : 'pointer',
                      }}
                    >
                      {t(`retail.eanRecovery.action.${status}`)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isAdmin && (
        <section
          style={{
            margin: '12px 16px 10px',
            padding: 14,
            borderRadius: 18,
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-soft-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'var(--glass-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20, color: 'var(--retail-accent)' }}
              >
                verified
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 2,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                  {t('retail.eanRecovery.aliasTitle')}
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-sub)',
                    background: 'var(--glass-subtle)',
                    borderRadius: 999,
                    padding: '3px 8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('retail.eanRecovery.adminOnly')}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.45 }}>
                {t('retail.eanRecovery.aliasSubtitle')}
              </div>
            </div>
          </div>

          {trustedAliasCandidatesLoading ? (
            <div style={{ padding: '14px 0 2px', fontSize: 12, color: 'var(--text-dim)' }}>
              {t('retail.eanRecovery.aliasLoading')}
            </div>
          ) : trustedAliasCandidatesError ? (
            <div style={{ padding: '14px 0 2px', fontSize: 12, color: 'var(--error-bright)' }}>
              {t('retail.eanRecovery.aliasError')}: {trustedAliasCandidatesError}
            </div>
          ) : trustedAliasCandidates.length === 0 ? (
            <div style={{ padding: '14px 0 2px', fontSize: 12, color: 'var(--text-dim)' }}>
              {t('retail.eanRecovery.aliasEmpty')}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {trustedAliasPromotionSuccess && (
                <div style={{ fontSize: 12, color: '#10B981', lineHeight: 1.45 }}>
                  {t('retail.eanRecovery.aliasPromotionSuccess', {
                    ean: trustedAliasPromotionSuccess,
                  })}
                </div>
              )}
              {trustedAliasCandidates.slice(0, 6).map((candidate) => {
                const blocked = candidate.localEligibility === 'blocked'
                return (
                  <div
                    key={candidate.id}
                    style={{
                      borderRadius: 13,
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      padding: 10,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--text)' }}>
                          {candidate.productBrand ? `${candidate.productBrand} · ` : ''}
                          {candidate.productName || t('retail.eanRecovery.aliasUnknownProduct')}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-dim)',
                            marginTop: 2,
                            fontFamily: 'monospace',
                          }}
                        >
                          {candidate.ean} → {candidate.globalProductId}
                        </div>
                      </div>
                      <span
                        style={{
                          alignSelf: 'flex-start',
                          borderRadius: 999,
                          padding: '3px 8px',
                          fontSize: 10,
                          fontWeight: 800,
                          color: blocked ? 'var(--error-bright)' : '#10B981',
                          background: blocked ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.12)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {blocked
                          ? t('retail.eanRecovery.aliasBlocked')
                          : t('retail.eanRecovery.aliasNeedsServerCheck')}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 6,
                        marginTop: 8,
                        fontSize: 11,
                        color: 'var(--text-sub)',
                      }}
                    >
                      <span>{candidate.source}</span>
                      <span>·</span>
                      <span>
                        {t('retail.eanRecovery.aliasConfidence')}: {candidate.confidence}
                      </span>
                    </div>
                    {candidate.reasons.length > 0 && (
                      <div
                        style={{
                          marginTop: 7,
                          fontSize: 11,
                          color: 'var(--text-dim)',
                          lineHeight: 1.45,
                        }}
                      >
                        {candidate.reasons
                          .map((reason) => t(`retail.eanRecovery.aliasReason.${reason}`))
                          .join(' · ')}
                      </div>
                    )}
                    {candidate.canRequestPromotion && (
                      <button
                        onClick={() => openTrustedAliasPromotion(candidate)}
                        disabled={promotingTrustedAliasId === candidate.id}
                        style={{
                          marginTop: 10,
                          width: '100%',
                          border: '1px solid rgba(16,185,129,0.25)',
                          background: 'rgba(16,185,129,0.1)',
                          color: '#10B981',
                          borderRadius: 10,
                          padding: '8px 10px',
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: promotingTrustedAliasId === candidate.id ? 'wait' : 'pointer',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {t('retail.eanRecovery.aliasPromotionOpen')}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
          {t('retail.products.loading')}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
          {products.length === 0
            ? t('retail.products.allHaveBarcode')
            : t('retail.products.nothingFound')}
        </div>
      ) : (
        <div style={{ padding: '8px 12px' }}>
          {filtered.map((pr) => (
            <div
              key={pr.id}
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-soft-border)',
                borderRadius: 16,
                padding: 14,
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', gap: 12 }}>
                <a
                  href={buildProductPath(storeSlug, pr.ean)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="catalog-img-box"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    flexShrink: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                  }}
                >
                  {pr.image_url ? (
                    <img
                      src={getImageUrl(pr.image_url)}
                      alt=""
                      className="product-img-blend"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                    />
                  ) : (
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 22, color: 'var(--text-disabled)' }}
                    >
                      image_not_supported
                    </span>
                  )}
                </a>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingNameId === pr.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName(pr)
                          if (e.key === 'Escape') setEditingNameId(null)
                        }}
                        autoFocus
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--text)',
                          background: 'var(--input-bg)',
                          border: '2px solid var(--retail-accent)',
                          borderRadius: 8,
                          padding: '4px 8px',
                          outline: 'none',
                          fontFamily: 'var(--font-body)',
                        }}
                      />
                      <button
                        onClick={() => handleSaveName(pr)}
                        disabled={saving === pr.id}
                        style={{
                          padding: '4px 10px',
                          fontSize: 12,
                          fontWeight: 700,
                          background: 'var(--retail-accent)',
                          color: 'var(--text-inverse)',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setEditingNameId(null)}
                        style={{
                          padding: '4px 8px',
                          fontSize: 12,
                          background: 'var(--glass-bg)',
                          color: 'var(--text-sub)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <a
                        href={buildProductPath(storeSlug, pr.ean)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--text)',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          textDecoration: 'none',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {pr.name || '—'}
                      </a>
                      <button
                        onClick={() => {
                          setEditingNameId(pr.id)
                          setEditName(pr.name || '')
                        }}
                        title={t('retail.products.editName')}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 2,
                          display: 'flex',
                          alignItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 16, color: 'var(--text-dim)' }}
                        >
                          edit
                        </span>
                      </button>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
                    {pr.brand || (
                      <span style={{ color: 'var(--text-disabled)' }}>
                        {t('retail.products.noBrand')}
                      </span>
                    )}
                    <span style={{ color: 'var(--text-disabled)', marginLeft: 8 }}>
                      {pr.source_primary}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-disabled)',
                      marginTop: 2,
                      fontFamily: 'monospace',
                    }}
                  >
                    {pr.ean}
                  </div>
                </div>

                <button
                  onClick={() => setConfirmDeleteId(pr.id)}
                  disabled={saving === pr.id}
                  title={t('retail.products.deleteFromDb')}
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 10,
                    width: 34,
                    height: 34,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18, color: '#F87171' }}
                  >
                    delete_forever
                  </span>
                </button>
              </div>

              {editingId === pr.id ? (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <input
                    type="text"
                    placeholder={t('retail.products.enterEan')}
                    value={editEan}
                    onChange={(e) => setEditEan(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEan(pr)
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      fontSize: 15,
                      fontFamily: 'monospace',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      border: '2px solid var(--retail-accent)',
                      borderRadius: 12,
                      outline: 'none',
                      letterSpacing: 1,
                    }}
                  />
                  <button
                    onClick={() => handleSaveEan(pr)}
                    disabled={saving === pr.id || !editEan.trim()}
                    style={{
                      padding: '10px 18px',
                      fontSize: 13,
                      fontWeight: 700,
                      background: 'var(--retail-accent)',
                      color: 'var(--text-inverse)',
                      border: 'none',
                      borderRadius: 12,
                      cursor: 'pointer',
                      opacity: !editEan.trim() ? 0.5 : 1,
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {saving === pr.id ? '...' : t('retail.products.saveBarcode')}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleCreateManualAliasCandidate(pr)}
                      disabled={saving === pr.id || !editEan.trim()}
                      style={{
                        padding: '10px 12px',
                        fontSize: 12,
                        fontWeight: 800,
                        background: 'rgba(16,185,129,0.1)',
                        color: '#10B981',
                        border: '1px solid rgba(16,185,129,0.25)',
                        borderRadius: 12,
                        cursor: saving === pr.id || !editEan.trim() ? 'not-allowed' : 'pointer',
                        opacity: !editEan.trim() ? 0.5 : 1,
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {t('retail.eanRecovery.aliasCandidateCreate')}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingId(null)
                      setEditEan('')
                      setError(null)
                    }}
                    style={{
                      padding: '10px 14px',
                      fontSize: 13,
                      background: 'var(--glass-bg)',
                      color: 'var(--text-sub)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    X
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => {
                      setEditingId(pr.id)
                      setEditEan('')
                      setError(null)
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      fontSize: 13,
                      fontWeight: 600,
                      background: 'rgba(56,189,248,0.08)',
                      color: '#38BDF8',
                      border: '1px solid rgba(56,189,248,0.2)',
                      borderRadius: 10,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 16, verticalAlign: -3, marginRight: 4 }}
                    >
                      edit
                    </span>
                    {t('retail.products.enterBarcode')}
                  </button>
                  <button
                    onClick={() => setScannerForId(pr.id)}
                    style={{
                      padding: '8px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      background: 'rgba(251,146,60,0.1)',
                      color: '#FB923C',
                      border: '1px solid rgba(251,146,60,0.25)',
                      borderRadius: 10,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      barcode_scanner
                    </span>
                    {t('retail.products.scan')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
