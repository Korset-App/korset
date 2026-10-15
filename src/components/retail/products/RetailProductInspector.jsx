import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { buildProductPath } from '../../../utils/routes.js'
import {
  InventoryIcon,
  CloseIcon,
  ArrowForwardIcon,
  TrashIcon,
  LockIcon,
  CheckCircleIcon,
  HalalBadgeIcon,
} from '../../icons/index.js'
import PriceField from './PriceField.jsx'
import StockToggle from './StockToggle.jsx'
import ShoppingRecommendationToggle from './ShoppingRecommendationToggle.jsx'
import PromotionSection from './PromotionSection.jsx'
import { displayName, displayBrand, displayImage } from './productHelpers.js'

export default function RetailProductInspector({
  product,
  tr,
  storeSlug,
  priceMutation,
  stockMutation,
  recommendationMutation,
  promotionMutation,
  isDesktop = false,
  onClose,
  onDeleteRequest,
}) {
  const [activeTab, setActiveTab] = useState('storefront')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!product) return null
  if (typeof document === 'undefined') return null

  const imgUrl = displayImage(product)
  const name = displayName(product)
  const brand = displayBrand(product)
  const isManaged = Boolean(product.sync_integration_id)
  const hasHalal = Boolean(product.global_products?.halal_status === 'halal' || product.is_halal)
  const ingredientsRu = product.global_products?.ingredients_raw
  const ingredientsKz = product.global_products?.ingredients_kz

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9990,
        background: 'color-mix(in srgb, var(--rc-ink) 40%, transparent)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: isDesktop ? 'stretch' : 'flex-end',
        justifyContent: isDesktop ? 'flex-end' : 'center',
        transition: 'opacity 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isDesktop ? 'clamp(440px, 32vw, 540px)' : '100%',
          maxWidth: isDesktop ? 'none' : 560,
          height: isDesktop ? '100dvh' : 'auto',
          maxHeight: isDesktop ? '100dvh' : '88vh',
          background: 'var(--rc-surface)',
          borderRadius: isDesktop ? '20px 0 0 20px' : '24px 24px 0 0',
          borderLeft: isDesktop ? '1px solid var(--rc-line)' : 'none',
          borderTop: isDesktop ? 'none' : '1px solid var(--rc-line)',
          overflowY: 'auto',
          boxShadow: 'var(--rc-shadow)',
          display: 'flex',
          flexDirection: 'column',
          color: 'var(--rc-ink)',
        }}
      >
        {/* Mobile handle */}
        {!isDesktop && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <div style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--rc-line-strong)' }} />
          </div>
        )}

        {/* ── Header ── */}
        <div
          style={{
            padding: isDesktop ? '20px 24px 16px' : '12px 20px 14px',
            borderBottom: '1px solid var(--rc-line)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              overflow: 'hidden',
              background: 'var(--rc-surface-2)',
              border: '1px solid var(--rc-line)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {imgUrl ? (
              <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <InventoryIcon size={26} color="var(--rc-ink-3)" />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--rc-ink)',
                lineHeight: 1.3,
                wordBreak: 'break-word',
              }}
            >
              {name}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 4,
                fontSize: 12,
                color: 'var(--rc-ink-2)',
                flexWrap: 'wrap',
              }}
            >
              {brand && <span style={{ fontWeight: 600, color: 'var(--rc-ink)' }}>{brand}</span>}
              <span
                className="rc-num"
                style={{
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: 'var(--rc-surface-2)',
                  border: '1px solid var(--rc-line)',
                  color: 'var(--rc-ink-3)',
                }}
              >
                {product.ean}
              </span>
              {isManaged ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'color-mix(in srgb, #38BDF8 14%, transparent)',
                    color: '#0284C7',
                  }}
                >
                  <LockIcon size={11} />
                  <span>{tr.sourcePos}</span>
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'var(--rc-surface-2)',
                    color: 'var(--rc-ink-3)',
                  }}
                >
                  {tr.sourceManual}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={tr.closeInspector || 'Закрыть'}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              background: 'var(--rc-surface-2)',
              color: 'var(--rc-ink-2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* ── Segmented Navigation Tabs ── */}
        <div
          style={{
            display: 'flex',
            padding: '10px 20px',
            gap: 6,
            background: 'var(--rc-surface-2)',
            borderBottom: '1px solid var(--rc-line)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('storefront')}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: activeTab === 'storefront' ? 600 : 500,
              border: activeTab === 'storefront' ? '1px solid var(--rc-line)' : '1px solid transparent',
              background: activeTab === 'storefront' ? 'var(--rc-surface)' : 'transparent',
              color: activeTab === 'storefront' ? 'var(--rc-ink)' : 'var(--rc-ink-2)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tr.storefrontSection || 'Витрина'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: activeTab === 'pos' ? 600 : 500,
              border: activeTab === 'pos' ? '1px solid var(--rc-line)' : '1px solid transparent',
              background: activeTab === 'pos' ? 'var(--rc-surface)' : 'transparent',
              color: activeTab === 'pos' ? 'var(--rc-ink)' : 'var(--rc-ink-2)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tr.posDataSection || 'Касса'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fitcheck')}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: activeTab === 'fitcheck' ? 600 : 500,
              border: activeTab === 'fitcheck' ? '1px solid var(--rc-line)' : '1px solid transparent',
              background: activeTab === 'fitcheck' ? 'var(--rc-surface)' : 'transparent',
              color: activeTab === 'fitcheck' ? 'var(--rc-ink)' : 'var(--rc-ink-2)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tr.fitCheckSection || 'Fit-Check'}
          </button>
        </div>

        {/* ── Tab Content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* TAB 1: STOREFRONT */}
          {activeTab === 'storefront' && (
            <>
              {isManaged ? (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: 'var(--rc-surface-2)',
                    border: '1px solid var(--rc-line)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--rc-ink-3)', fontWeight: 500 }}>
                      {tr.priceLabel}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 11,
                        color: '#0284C7',
                        fontWeight: 600,
                      }}
                    >
                      <LockIcon size={12} />
                      <span>{tr.sourcePos || 'Касса'}</span>
                    </span>
                  </div>
                  <div className="rc-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--rc-ink)' }}>
                    {product.price_kzt != null
                      ? `${Number(product.price_kzt).toLocaleString('ru-RU')} ₸`
                      : tr.noPrice}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--rc-ink-2)', marginTop: 4 }}>
                    {tr.sourceManagedNote || 'Цена управляется кассовой системой'}
                  </div>
                </div>
              ) : (
                <PriceField
                  product={product}
                  p={tr}
                  priceMutation={priceMutation}
                  promotionMutation={promotionMutation}
                  managed={false}
                />
              )}

              <StockToggle
                product={product}
                label={tr.stockLabel}
                stockMutation={stockMutation}
                managed={isManaged}
              />

              <PromotionSection
                product={product}
                p={tr}
                promotionMutation={promotionMutation}
                priceMutation={priceMutation}
                managed={isManaged}
              />

              <ShoppingRecommendationToggle
                product={product}
                label={tr.shoppingRecommendationLabel}
                recommendationMutation={recommendationMutation}
              />
            </>
          )}

          {/* TAB 2: POS / ACCOUNTING */}
          {activeTab === 'pos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: isManaged
                    ? 'color-mix(in srgb, #38BDF8 10%, var(--rc-surface-2))'
                    : 'var(--rc-surface-2)',
                  border: isManaged
                    ? '1px solid color-mix(in srgb, #38BDF8 25%, transparent)'
                    : '1px solid var(--rc-line)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {isManaged ? <LockIcon size={16} color="#0284C7" /> : <CheckCircleIcon size={16} color="var(--rc-pos)" />}
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--rc-ink)' }}>
                    {isManaged ? 'Управление через учётную систему (UMAG)' : 'Ручное управление в Körset'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: 'var(--rc-ink-2)' }}>
                  {isManaged
                    ? (tr.posDataHint || 'Цена и остаток синхронизируются из учётной системы. Прямое изменение в Körset заблокировано для предотвращения расхождений на кассе.')
                    : 'Этот товар заведён напрямую в Körset. Вы можете свободно редактировать его розничную цену, акционные скидки и статус наличия.'}
                </p>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: 'var(--rc-surface-2)',
                  border: '1px solid var(--rc-line)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontSize: 12.5,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--rc-ink-3)' }}>Название в кассе:</span>
                  <span style={{ fontWeight: 500, color: 'var(--rc-ink)', textAlign: 'right', maxWidth: '65%' }}>
                    {product.local_name || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--rc-ink-3)' }}>Розничная цена кассы:</span>
                  <span className="rc-num" style={{ fontWeight: 600, color: 'var(--rc-ink)' }}>
                    {product.price_kzt ? `${Number(product.price_kzt).toLocaleString('ru-RU')} ₸` : 'Не указана'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--rc-ink-3)' }}>Статус наличия кассы:</span>
                  <span style={{ fontWeight: 500, color: 'var(--rc-ink)' }}>
                    {product.stock_status === 'in_stock'
                      ? 'В наличии'
                      : product.stock_status === 'low_stock'
                      ? 'Мало'
                      : 'Нет на остатках'}
                  </span>
                </div>
                {product.updated_at && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--rc-ink-3)' }}>Последнее обновление:</span>
                    <span className="rc-num" style={{ color: 'var(--rc-ink-2)' }}>
                      {new Date(product.updated_at).toLocaleString('ru-RU')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FIT-CHECK PASSPORT */}
          {activeTab === 'fitcheck' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: 'var(--rc-surface-2)',
                  border: '1px solid var(--rc-line)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {hasHalal ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'color-mix(in srgb, var(--rc-pos) 14%, transparent)',
                        color: 'var(--rc-pos)',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <HalalBadgeIcon size={14} />
                      <span>Халал подтверждён</span>
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 12,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'var(--rc-line)',
                        color: 'var(--rc-ink-3)',
                      }}
                    >
                      Халал-статус не подтверждён
                    </span>
                  )}
                </div>

                {/* Composition RU */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--rc-ink-3)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Состав (Русский)
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--rc-ink-2)' }}>
                    {ingredientsRu || 'Состав на русском языке отсутствует в базе'}
                  </div>
                </div>

                {/* Composition KZ */}
                {ingredientsKz && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--rc-ink-3)', textTransform: 'uppercase', marginBottom: 4 }}>
                      Құрамы (Қазақша)
                    </div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--rc-ink-2)' }}>
                      {ingredientsKz}
                    </div>
                  </div>
                )}
              </div>

              {/* Link to public store card */}
              {storeSlug && product.ean && (
                <a
                  href={buildProductPath(storeSlug, product.ean)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'var(--rc-surface-2)',
                    border: '1px solid var(--rc-line)',
                    color: 'var(--rc-accent)',
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <span>{tr.openCard || 'Открыть карточку покупателя'}</span>
                  <ArrowForwardIcon size={16} />
                </a>
              )}
            </div>
          )}
        </div>

        {/* ── Footer / Delete Action ── */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--rc-line)',
            background: 'var(--rc-surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            onClick={() => {
              onClose()
              onDeleteRequest(product.id)
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--rc-neg) 30%, transparent)',
              background: 'color-mix(in srgb, var(--rc-neg) 10%, transparent)',
              color: 'var(--rc-neg)',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <TrashIcon size={14} />
            <span>{tr.deleteProduct || 'Убрать из каталога'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--rc-line)',
              background: 'var(--rc-surface)',
              color: 'var(--rc-ink)',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {tr.closeInspector || 'Закрыть'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
