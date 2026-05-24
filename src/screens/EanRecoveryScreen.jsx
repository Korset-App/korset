import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/index.js'
import { supabase } from '../utils/supabase.js'
import { getImageUrl } from '../utils/imageUrl.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { buildProductPath } from '../utils/routes.js'
import RetailScannerModal from '../components/RetailScannerModal.jsx'

const PAGE_SIZE = 50

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

export default function EanRecoveryScreen() {
  const { t } = useI18n()
  const { currentStore } = useStore()
  const storeSlug = currentStore?.slug || currentStore?.code

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

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

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
