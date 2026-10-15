import { Virtuoso } from 'react-virtuoso'
import {
  LockIcon,
  HalalBadgeIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  EditIcon,
  InventoryIcon,
} from '../../icons/index.js'
import { getCategoryLabel } from '../../../domain/product/categoryMap.js'
import { displayName, displayBrand, displayImage } from './productHelpers.js'
import Highlight from './Highlight.jsx'
import StockBadge from './StockBadge.jsx'
import SkeletonRow from './SkeletonRow.jsx'

const GRID_COLUMNS = 'minmax(220px, 1.6fr) 150px 90px 105px 100px 125px 85px'

export default function RetailProductsTable({
  products,
  search,
  totalCount,
  scrollParent,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onInspectProduct,
  tr,
  lang = 'ru',
}) {
  return (
    <div
      style={{
        border: '1px solid var(--rc-line)',
        borderRadius: 16,
        background: 'var(--rc-surface)',
        overflow: 'hidden',
        boxShadow: 'var(--rc-shadow)',
      }}
    >
      {/* ── Table Header ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: GRID_COLUMNS,
          gap: 10,
          padding: '10px 14px',
          background: 'var(--rc-surface-2)',
          borderBottom: '1px solid var(--rc-line)',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--rc-ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          userSelect: 'none',
        }}
      >
        <div>{tr.colProduct || 'Товар / Штрихкод'}</div>
        <div>{tr.colCategory || 'Категория'}</div>
        <div>{tr.colSource || 'Источник'}</div>
        <div>{tr.colPrice || 'Цена'}</div>
        <div>{tr.colStock || 'Наличие'}</div>
        <div>{tr.colFitCheck || 'Fit-Check'}</div>
        <div style={{ textAlign: 'right' }}>{tr.colActions || 'Действия'}</div>
      </div>

      {/* ── Virtualized Rows ── */}
      <Virtuoso
        customScrollParent={scrollParent}
        data={products}
        increaseViewportBy={{ top: 600, bottom: 600 }}
        endReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage()
        }}
        itemContent={(_, product) => {
          const name = displayName(product)
          const brand = displayBrand(product)
          const img = displayImage(product)
          const isManaged = Boolean(product.sync_integration_id)
          const currentPrice = Number(product.price_kzt) || 0
          const oldPrice = Number(product.old_price_kzt) || 0
          const hasDiscount = Boolean(product.discount_percent && oldPrice > currentPrice)
          const catKey = product.global_products?.category
          const catLabel = catKey ? getCategoryLabel(catKey, lang) : null
          const hasHalal = Boolean(product.global_products?.halal_status === 'halal' || product.is_halal)
          const hasComposition = Boolean(
            product.global_products?.ingredients_raw || product.global_products?.ingredients_kz
          )
          const hasMissingData = !product.global_products || !product.global_products.name || currentPrice <= 0

          return (
            <div
              key={product.id}
              onClick={() => onInspectProduct(product)}
              style={{
                display: 'grid',
                gridTemplateColumns: GRID_COLUMNS,
                gap: 10,
                padding: '10px 14px',
                alignItems: 'center',
                borderBottom: '1px solid var(--rc-line)',
                cursor: 'pointer',
                transition: 'background-color 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--rc-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {/* Product Column (Thumbnail + Name + Brand + EAN + Shelf) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: 'var(--rc-surface-2)',
                    border: '1px solid var(--rc-line)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {img ? (
                    <img
                      src={img}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      loading="lazy"
                    />
                  ) : (
                    <InventoryIcon size={20} color="var(--rc-ink-3)" />
                  )}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: 'var(--rc-ink)',
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={name}
                  >
                    <Highlight text={name} query={search} />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 3,
                      fontSize: 11,
                      color: 'var(--rc-ink-2)',
                    }}
                  >
                    {brand && (
                      <span style={{ fontWeight: 600, color: 'var(--rc-ink)' }}>
                        <Highlight text={brand} query={search} />
                      </span>
                    )}

                    <span
                      className="rc-num"
                      style={{
                        padding: '1px 5px',
                        background: 'var(--rc-surface-2)',
                        borderRadius: 4,
                        border: '1px solid var(--rc-line)',
                        color: 'var(--rc-ink-3)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      <Highlight text={product.ean} query={search} />
                    </span>

                    {(product.shelf_zone || product.shelf_position) && (
                      <span
                        style={{
                          padding: '1px 5px',
                          background: 'color-mix(in srgb, var(--rc-accent) 10%, transparent)',
                          borderRadius: 4,
                          color: 'var(--rc-accent)',
                          fontWeight: 500,
                        }}
                      >
                        {[product.shelf_zone, product.shelf_position].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Column */}
              <div style={{ minWidth: 0 }}>
                {catLabel ? (
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: 12,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: 'var(--rc-surface-2)',
                      color: 'var(--rc-ink-2)',
                      border: '1px solid var(--rc-line)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                    }}
                    title={catLabel}
                  >
                    {catLabel}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--rc-ink-3)' }}>—</span>
                )}
              </div>

              {/* Source Column */}
              <div>
                {isManaged ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: 'color-mix(in srgb, #38BDF8 14%, transparent)',
                      color: '#0284C7',
                      border: '1px solid color-mix(in srgb, #38BDF8 30%, transparent)',
                    }}
                  >
                    <LockIcon size={12} />
                    <span>{tr.sourcePos || 'Касса'}</span>
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: 11.5,
                      fontWeight: 500,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: 'var(--rc-surface-2)',
                      color: 'var(--rc-ink-3)',
                      border: '1px solid var(--rc-line)',
                    }}
                  >
                    {tr.sourceManual || 'Körset'}
                  </span>
                )}
              </div>

              {/* Price Column */}
              <div>
                {currentPrice > 0 ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span className="rc-num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--rc-ink)' }}>
                        {currentPrice.toLocaleString('ru-RU')} ₸
                      </span>
                      {hasDiscount && (
                        <span
                          className="rc-num"
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '1px 4px',
                            borderRadius: 4,
                            background: 'var(--rc-accent-soft)',
                            color: 'var(--rc-ink)',
                          }}
                        >
                          -{product.discount_percent}%
                        </span>
                      )}
                    </div>
                    {hasDiscount && (
                      <div
                        className="rc-num"
                        style={{
                          fontSize: 11,
                          color: 'var(--rc-ink-3)',
                          textDecoration: 'line-through',
                          marginTop: 1,
                        }}
                      >
                        {oldPrice.toLocaleString('ru-RU')} ₸
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--rc-warn)', fontWeight: 500 }}>
                    {tr.noPrice || 'Без цены'}
                  </span>
                )}
              </div>

              {/* Stock Column */}
              <div>
                <StockBadge status={product.stock_status} tr={tr} />
              </div>

              {/* Fit-Check Readiness Column */}
              <div>
                {hasMissingData ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11.5,
                      fontWeight: 500,
                      padding: '3px 7px',
                      borderRadius: 6,
                      background: 'color-mix(in srgb, var(--rc-warn) 12%, transparent)',
                      color: 'var(--rc-warn)',
                    }}
                  >
                    <AlertTriangleIcon size={13} />
                    <span>{tr.fitCheckMissing || 'Нет данных'}</span>
                  </span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {hasHalal && (
                      <span
                        title="Халал подтверждён"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: 'color-mix(in srgb, var(--rc-pos) 14%, transparent)',
                          color: 'var(--rc-pos)',
                        }}
                      >
                        <HalalBadgeIcon size={12} />
                        <span>Халал</span>
                      </span>
                    )}

                    {hasComposition ? (
                      <span
                        title="Состав оцифрован"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: 'var(--rc-surface-2)',
                          color: 'var(--rc-ink-2)',
                          border: '1px solid var(--rc-line)',
                        }}
                      >
                        <CheckCircleIcon size={12} color="var(--rc-pos)" />
                        <span>KZ / RU</span>
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--rc-ink-3)',
                        }}
                      >
                        {tr.fitCheckPartial || 'Базовый'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions Column */}
              <div style={{ textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onInspectProduct(product)
                  }}
                  title={tr.editProduct || 'Редактировать товар'}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--rc-line)',
                    background: 'var(--rc-surface-2)',
                    color: 'var(--rc-ink-2)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--rc-accent)'
                    e.currentTarget.style.color = 'var(--rc-ink)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--rc-line)'
                    e.currentTarget.style.color = 'var(--rc-ink-2)'
                  }}
                >
                  <EditIcon size={13} />
                  <span>{tr.edit || 'Свойства'}</span>
                </button>
              </div>
            </div>
          )
        }}
        components={{
          Footer: () => (
            <div style={{ padding: '8px 18px 16px' }}>
              {isFetchingNextPage && <SkeletonRow />}
              {!hasNextPage && products.length > 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: 12,
                    color: 'var(--rc-ink-3)',
                    padding: '12px 0',
                  }}
                >
                  {tr.allLoaded ? tr.allLoaded(totalCount) : `Все ${totalCount} товаров загружены`}
                </div>
              )}
            </div>
          ),
        }}
      />
    </div>
  )
}
