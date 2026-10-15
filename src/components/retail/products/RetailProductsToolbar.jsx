import { useMemo } from 'react'
import {
  ExploreIcon,
  CloseIcon,
  BarcodeScannerIcon,
  ResetArrowIcon,
} from '../../icons/index.js'
import { getAllCategoryKeys, getCategoryLabel } from '../../../domain/product/categoryMap.js'
import SegmentedToggle from '../../SegmentedToggle.jsx'

export default function RetailProductsToolbar({
  search,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  activeFilter,
  onSelectFilter,
  filterCounts = {},
  viewMode,
  onViewModeChange,
  isDesktop = false,
  onOpenScanner,
  onResetFilters,
  tr,
  lang = 'ru',
}) {
  const categoryKeys = useMemo(() => getAllCategoryKeys(), [])

  const filterChips = useMemo(
    () => [
      { key: 'all', label: tr.filterAll || 'Все', count: filterCounts.all },
      { key: 'in_stock', label: tr.filterInStock || 'В наличии', count: filterCounts.in_stock },
      { key: 'low_stock', label: tr.filterLowStock || 'Мало', count: filterCounts.low_stock },
      { key: 'out_of_stock', label: tr.filterOutOfStock || 'Нет', count: filterCounts.out_of_stock },
      { key: 'pos', label: tr.filterPos || 'Касса (UMAG)', count: filterCounts.pos },
      { key: 'manual', label: tr.filterManual || 'Ручные', count: filterCounts.manual },
      { key: 'attention', label: tr.filterAttention || 'Внимание', count: filterCounts.attention, isWarning: true },
    ],
    [tr, filterCounts]
  )

  const viewOptions = useMemo(() => {
    if (isDesktop) {
      return [
        {
          key: 'table',
          render: (active) => (
            <span style={{ fontSize: 13, fontWeight: active ? 600 : 400 }}>
              {tr.viewTable || 'Таблица'}
            </span>
          ),
        },
        {
          key: 'list',
          render: (active) => (
            <span style={{ fontSize: 13, fontWeight: active ? 600 : 400 }}>
              {tr.viewList || 'Список'}
            </span>
          ),
        },
        {
          key: 'grid',
          render: (active) => (
            <span style={{ fontSize: 13, fontWeight: active ? 600 : 400 }}>
              {tr.viewGrid || 'Сетка'}
            </span>
          ),
        },
      ]
    }
    return [
      {
        key: 'list',
        render: (active) => (
          <span style={{ fontSize: 13, fontWeight: active ? 600 : 400 }}>
            {tr.viewList || 'Список'}
          </span>
        ),
      },
      {
        key: 'grid',
        render: (active) => (
          <span style={{ fontSize: 13, fontWeight: active ? 600 : 400 }}>
            {tr.viewGrid || 'Сетка'}
          </span>
        ),
      },
    ]
  }, [isDesktop, tr])

  const hasActiveFilters = Boolean(
    (activeFilter && activeFilter !== 'all') ||
    (selectedCategory && selectedCategory !== 'all') ||
    search
  )

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'var(--rc-surface)',
        borderBottom: '1px solid var(--rc-line)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: isDesktop ? '14px 24px 12px' : '10px 16px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'background-color 0.2s ease',
      }}
    >
      {/* ── Main Controls ── */}
      {isDesktop ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {/* Search Input */}
          <div
            style={{
              flex: '1 1 360px',
              display: 'flex',
              alignItems: 'center',
              background: 'var(--rc-surface-2)',
              borderRadius: 12,
              padding: '8px 12px',
              border: '1px solid var(--rc-line)',
              gap: 8,
            }}
          >
            <ExploreIcon size={18} color="var(--rc-ink-3)" style={{ flexShrink: 0 }} />
            <input
              type="search"
              placeholder={tr.searchPlaceholder || 'Поиск по названию, бренду или EAN…'}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--rc-ink)',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'var(--font-body)',
                minWidth: 0,
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Очистить поиск"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2,
                  color: 'var(--rc-ink-3)',
                }}
              >
                <CloseIcon size={16} />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div style={{ position: 'relative', width: 220, flexShrink: 0 }}>
            <select
              value={selectedCategory}
              onChange={(e) => onSelectCategory(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--rc-surface-2)',
                color: 'var(--rc-ink)',
                border: '1px solid var(--rc-line)',
                borderRadius: 12,
                padding: '9px 12px',
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
            >
              <option value="all">{tr.allCategories || 'Все категории'}</option>
              {categoryKeys.map((catKey) => (
                <option key={catKey} value={catKey}>
                  {getCategoryLabel(catKey, lang)}
                </option>
              ))}
            </select>
            <div
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                fontSize: 10,
                color: 'var(--rc-ink-3)',
              }}
            >
              ▼
            </div>
          </div>

          {/* View Mode Toggle */}
          <div style={{ flexShrink: 0 }}>
            <SegmentedToggle
              options={viewOptions}
              activeKey={viewMode}
              onChange={onViewModeChange}
              ariaLabel="Режим отображения каталога"
            />
          </div>

          {/* Scanner Action */}
          <button
            type="button"
            onClick={onOpenScanner}
            title={tr.scan || 'Сканировать штрихкод'}
            style={{
              height: 38,
              width: 38,
              borderRadius: 12,
              border: '1px solid var(--rc-line)',
              background: 'var(--rc-surface-2)',
              color: 'var(--rc-accent)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <BarcodeScannerIcon size={20} />
          </button>
        </div>
      ) : (
        /* Mobile Layout: 2 Clean Rows */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Mobile Row 1: Search + Scanner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                background: 'var(--rc-surface-2)',
                borderRadius: 12,
                padding: '8px 12px',
                border: '1px solid var(--rc-line)',
                gap: 8,
              }}
            >
              <ExploreIcon size={18} color="var(--rc-ink-3)" style={{ flexShrink: 0 }} />
              <input
                type="search"
                placeholder={tr.searchPlaceholder || 'Поиск по названию или штрихкоду'}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--rc-ink)',
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                  minWidth: 0,
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Очистить поиск"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 2,
                    color: 'var(--rc-ink-3)',
                  }}
                >
                  <CloseIcon size={16} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onOpenScanner}
              title={tr.scan || 'Сканировать штрихкод'}
              style={{
                height: 38,
                width: 38,
                borderRadius: 12,
                border: '1px solid var(--rc-line)',
                background: 'var(--rc-surface-2)',
                color: 'var(--rc-accent)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <BarcodeScannerIcon size={20} />
            </button>
          </div>

          {/* Mobile Row 2: Category Dropdown + View Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <select
                value={selectedCategory}
                onChange={(e) => onSelectCategory(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--rc-surface-2)',
                  color: 'var(--rc-ink)',
                  border: '1px solid var(--rc-line)',
                  borderRadius: 12,
                  padding: '8px 10px',
                  fontSize: 12.5,
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <option value="all">{tr.allCategories || 'Все категории'}</option>
                {categoryKeys.map((catKey) => (
                  <option key={catKey} value={catKey}>
                    {getCategoryLabel(catKey, lang)}
                  </option>
                ))}
              </select>
              <div
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  fontSize: 9,
                  color: 'var(--rc-ink-3)',
                }}
              >
                ▼
              </div>
            </div>

            <div style={{ flexShrink: 0 }}>
              <SegmentedToggle
                options={viewOptions}
                activeKey={viewMode}
                onChange={onViewModeChange}
                ariaLabel="Режим отображения каталога"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Chips Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          paddingBottom: 2,
        }}
      >
        {filterChips.map((chip) => {
          const isSelected = activeFilter === chip.key
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => onSelectFilter(chip.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 11px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: isSelected ? 600 : 500,
                fontFamily: 'var(--font-body)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: isSelected
                  ? '1px solid var(--rc-accent)'
                  : '1px solid var(--rc-line)',
                background: isSelected
                  ? 'var(--rc-accent-soft)'
                  : 'var(--rc-surface-2)',
                color: isSelected ? 'var(--rc-ink)' : 'var(--rc-ink-2)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{chip.label}</span>
              {typeof chip.count === 'number' && chip.count >= 0 && (
                <span
                  className="rc-num"
                  style={{
                    fontSize: 11,
                    padding: '1px 5px',
                    borderRadius: 10,
                    background: isSelected
                      ? 'color-mix(in srgb, var(--rc-accent) 25%, transparent)'
                      : 'var(--rc-line)',
                    color: chip.isWarning && chip.count > 0 ? 'var(--rc-warn)' : 'inherit',
                  }}
                >
                  {chip.count}
                </span>
              )}
            </button>
          )
        })}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 9px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              border: '1px dashed var(--rc-line-strong)',
              background: 'transparent',
              color: 'var(--rc-ink-3)',
              whiteSpace: 'nowrap',
            }}
          >
            <ResetArrowIcon size={12} />
            <span>{tr.resetFilters || 'Сбросить'}</span>
          </button>
        )}
      </div>
    </div>
  )
}
