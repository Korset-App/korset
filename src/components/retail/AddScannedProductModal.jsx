import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/index.js'
import { findGlobalProductByEan, addStoreProduct } from '../../utils/retailAnalytics.js'
import {
  validateManualProductPayload,
  buildStoreProductUpsertPayload,
} from '../../domain/retail/catalogManagement.js'
import { getImageUrl } from '../../utils/imageUrl.js'

export default function AddScannedProductModal({ ean, storeId, onClose, onAdded }) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [globalProduct, setGlobalProduct] = useState(null)
  const [price, setPrice] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const priceInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    findGlobalProductByEan(ean)
      .then((gp) => {
        if (cancelled) return
        setGlobalProduct(gp)
        if (gp?.name) setName(gp.name)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [ean])

  useEffect(() => {
    if (!loading) {
      priceInputRef.current?.focus()
    }
  }, [loading])

  const handleSave = async (e) => {
    e?.preventDefault()
    setError('')

    const validation = validateManualProductPayload({
      ean,
      priceKzt: price,
      localName: name,
    })

    if (!validation.ok) {
      if (validation.error === 'invalid_price') {
        setError('Укажите корректную розничную цену')
      } else {
        setError('Проверьте штрихкод или данные')
      }
      return
    }

    try {
      setSaving(true)
      const payload = buildStoreProductUpsertPayload({
        storeId,
        ean,
        priceKzt: validation.value.priceKzt,
        globalProductId: globalProduct?.id || null,
        localName: validation.value.localName,
      })

      const added = await addStoreProduct(payload)
      onAdded?.(added || payload)
      onClose()
    } catch (err) {
      setError(err?.message || 'Не удалось сохранить товар')
    } finally {
      setSaving(false)
    }
  }

  const imgUrl = globalProduct ? getImageUrl(globalProduct.image_url) : null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 24,
          background: 'color-mix(in srgb, var(--bg-card) 96%, var(--bg-app))',
          border: '1px solid color-mix(in srgb, var(--primary-bright) 35%, var(--home-line))',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          padding: 24,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className="material-symbols-outlined"
              style={{ color: 'var(--primary-bright)', fontSize: 24 }}
            >
              {globalProduct ? 'verified' : 'add_circle'}
            </span>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--text)',
                margin: 0,
              }}
            >
              {globalProduct
                ? t('retail.products.addFromGlobalTitle')
                : t('retail.products.addCustomTitle')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              padding: 4,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              close
            </span>
          </button>
        </div>

        {/* EAN badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 8,
            background: 'color-mix(in srgb, var(--primary-bright) 12%, var(--bg-card))',
            color: 'var(--primary-bright)',
            fontSize: 12,
            fontFamily: 'monospace',
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
            barcode
          </span>
          <span>{ean}</span>
        </div>

        {loading ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
            Поиск товара в базе...
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Global product preview card */}
            {globalProduct ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  borderRadius: 16,
                  background: 'color-mix(in srgb, var(--bg-card) 90%, var(--bg-app))',
                  border: '1px solid var(--home-line)',
                }}
              >
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt=""
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 10,
                      objectFit: 'contain',
                      background: '#fff',
                      padding: 2,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 10,
                      background: 'var(--bg-app)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--text-dim)',
                    }}
                  >
                    <span className="material-symbols-outlined">inventory_2</span>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {globalProduct.name}
                  </div>
                  {globalProduct.brand && (
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                      {globalProduct.brand}
                      {globalProduct.quantity ? ` · ${globalProduct.quantity}` : ''}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-dim)',
                    marginBottom: 6,
                  }}
                >
                  Название товара
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('retail.products.namePlaceholder')}
                  required
                  style={{
                    width: '100%',
                    minHeight: 44,
                    padding: '0 14px',
                    borderRadius: 12,
                    border: '1px solid var(--home-line)',
                    background: 'var(--bg-app)',
                    color: 'var(--text)',
                    font: 'inherit',
                    fontSize: 14,
                  }}
                />
              </div>
            )}

            {/* Price field */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-dim)',
                  marginBottom: 6,
                }}
              >
                {t('retail.products.priceLabel')}
              </label>
              <input
                ref={priceInputRef}
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="450"
                required
                style={{
                  width: '100%',
                  minHeight: 46,
                  padding: '0 14px',
                  borderRadius: 12,
                  border: '1px solid var(--home-line)',
                  background: 'var(--bg-app)',
                  color: 'var(--text)',
                  font: 'inherit',
                  fontSize: 16,
                  fontWeight: 700,
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  fontSize: 12,
                  color: '#ef4444',
                  background: 'rgba(239, 68, 68, 0.1)',
                  padding: '8px 12px',
                  borderRadius: 10,
                }}
              >
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  minHeight: 46,
                  borderRadius: 14,
                  border: '1px solid var(--home-line)',
                  background: 'transparent',
                  color: 'var(--text)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('retail.products.cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 2,
                  minHeight: 46,
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--primary-bright), #0d9488)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: saving ? 'wait' : 'pointer',
                  boxShadow:
                    '0 4px 16px color-mix(in srgb, var(--primary-bright) 30%, transparent)',
                }}
              >
                {saving ? 'Сохранение...' : t('retail.products.addToStoreBtn')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
