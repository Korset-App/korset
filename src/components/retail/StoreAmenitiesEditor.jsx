import { useState, useCallback, useMemo } from 'react'
import { useI18n } from '../../i18n/index.js'
import {
  KaspiQrIcon,
  KaspiAlaqanIcon,
  HalykIcon,
  FreedomIcon,
  BankCardIcon,
  CashPaymentIcon,
  HalalBadgeIcon,
  BakeryTandyrIcon,
  CookeryIcon,
  CoffeeToGoIcon,
  SelfCheckoutIcon,
  AtmTerminalIcon,
  ParkingIcon,
  CartIcon,
  AccessibleRampIcon,
  PharmacyPointIcon,
  MeatCuttingIcon,
  FreshBarIcon,
  ScalesIcon,
  MicrowaveIcon,
  KidsCartIcon,
  LockerIcon,
  WifiIcon,
  OrderPickupIcon,
  CheckCircleIcon,
  ChevronDownIcon,
} from '../icons/index.js'

const PAYMENT_ITEMS = [
  { id: 'kaspi_qr', labelRu: 'Kaspi QR', labelKz: 'Kaspi QR', icon: KaspiQrIcon },
  { id: 'kaspi_alaqan', labelRu: 'Kaspi Alaqan', labelKz: 'Kaspi Alaqan', icon: KaspiAlaqanIcon },
  { id: 'halyk', labelRu: 'Halyk QR', labelKz: 'Halyk QR', icon: HalykIcon },
  { id: 'freedom', labelRu: 'Freedom QR', labelKz: 'Freedom QR', icon: FreedomIcon },
  { id: 'card', labelRu: 'Банковские карты', labelKz: 'Банк карталары', icon: BankCardIcon },
  { id: 'cash', labelRu: 'Наличный расчет', labelKz: 'Қолма-қол ақша', icon: CashPaymentIcon },
]

const AMENITY_ITEMS = [
  { id: 'halal', labelRu: 'Халал-отдел', labelKz: 'Халал бөлімі', icon: HalalBadgeIcon },
  {
    id: 'bakery',
    labelRu: 'Свежая выпечка (тандыр / пекарня)',
    labelKz: 'Жаңа піскен нан / наубайхана',
    icon: BakeryTandyrIcon,
  },
  {
    id: 'cookery',
    labelRu: 'Кулинария и готовая еда',
    labelKz: 'Кулинария және дайын тағам',
    icon: CookeryIcon,
  },
  { id: 'coffee', labelRu: 'Кофе с собой', labelKz: 'Өзімен бірге кофе', icon: CoffeeToGoIcon },
  {
    id: 'self_checkout',
    labelRu: 'Кассы самообслуживания',
    labelKz: 'Өзіне-өзі қызмет көрсету кассалары',
    icon: SelfCheckoutIcon,
  },
  {
    id: 'atm',
    labelRu: 'Терминалы и банкоматы',
    labelKz: 'Терминалдар мен банкоматтар',
    icon: AtmTerminalIcon,
  },
  { id: 'parking', labelRu: 'Удобная парковка', labelKz: 'Ыңғайлы автотұрақ', icon: ParkingIcon },
  { id: 'carts', labelRu: 'Корзины и тележки', labelKz: 'Себеттер мен арбалар', icon: CartIcon },
  {
    id: 'ramp',
    labelRu: 'Пандус и доступная среда',
    labelKz: 'Пандус және қолжетімді орта',
    icon: AccessibleRampIcon,
  },
  {
    id: 'pharmacy',
    labelRu: 'Аптечный пункт',
    labelKz: 'Дәріхана пункті',
    icon: PharmacyPointIcon,
  },
  {
    id: 'meat_cutting',
    labelRu: 'Мясной цех и разделка',
    labelKz: 'Ет бөлімі және мүшелеу',
    icon: MeatCuttingIcon,
  },
  {
    id: 'fresh_bar',
    labelRu: 'Фреш и свежие соки',
    labelKz: 'Фреш және жаңа шырындар',
    icon: FreshBarIcon,
  },
  { id: 'scales', labelRu: 'Контрольные весы', labelKz: 'Бақылау таразысы', icon: ScalesIcon },
  {
    id: 'microwave',
    labelRu: 'Зона разогрева еды',
    labelKz: 'Тамақ жылыту аймағы',
    icon: MicrowaveIcon,
  },
  { id: 'kids_carts', labelRu: 'Детские тележки', labelKz: 'Балалар арбалары', icon: KidsCartIcon },
  { id: 'lockers', labelRu: 'Камеры хранения', labelKz: 'Жүк сақтау камералары', icon: LockerIcon },
  { id: 'wifi', labelRu: 'Гостевой Wi-Fi', labelKz: 'Қонақтарға арналған Wi-Fi', icon: WifiIcon },
  {
    id: 'pickup',
    labelRu: 'Самовывоз заказов',
    labelKz: 'Тапсырыстарды алып кету',
    icon: OrderPickupIcon,
  },
]

export default function StoreAmenitiesEditor({ selectedFeatures = [], onChange }) {
  const { lang, t } = useI18n()
  const isKz = lang === 'kz'

  const selectedSet = useMemo(() => {
    return new Set(Array.isArray(selectedFeatures) ? selectedFeatures : [])
  }, [selectedFeatures])

  const toggleFeature = useCallback(
    (featureId) => {
      const next = new Set(selectedSet)
      if (next.has(featureId)) {
        next.delete(featureId)
      } else {
        next.add(featureId)
      }
      onChange?.(Array.from(next))
    },
    [selectedSet, onChange]
  )

  const selectedPaymentsCount = useMemo(() => {
    return PAYMENT_ITEMS.filter((item) => selectedSet.has(item.id)).length
  }, [selectedSet])

  const selectedAmenitiesCount = useMemo(() => {
    return AMENITY_ITEMS.filter((item) => selectedSet.has(item.id)).length
  }, [selectedSet])

  const selectAll = useCallback(
    (items) => {
      const next = new Set(selectedSet)
      items.forEach((item) => next.add(item.id))
      onChange?.(Array.from(next))
    },
    [selectedSet, onChange]
  )

  const [showAllAmenities, setShowAllAmenities] = useState(false)

  const clearGroup = useCallback(
    (items) => {
      const next = new Set(selectedSet)
      items.forEach((item) => next.delete(item.id))
      onChange?.(Array.from(next))
    },
    [selectedSet, onChange]
  )

  const displayedAmenities = useMemo(() => {
    if (showAllAmenities) return AMENITY_ITEMS
    // Show selected items first, or top 6 if fewer
    const selected = AMENITY_ITEMS.filter((i) => selectedSet.has(i.id))
    if (selected.length >= 6) return selected
    const remaining = AMENITY_ITEMS.filter((i) => !selectedSet.has(i.id))
    return [...selected, ...remaining.slice(0, 6 - selected.length)]
  }, [showAllAmenities, selectedSet])

  const renderItem = (item) => {
    const isSelected = selectedSet.has(item.id)
    const IconComponent = item.icon
    const label = isKz ? item.labelKz : item.labelRu

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => toggleFeature(item.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '8px 10px',
          minHeight: 40,
          boxSizing: 'border-box',
          width: '100%',
          borderRadius: 10,
          border: isSelected
            ? '1.5px solid var(--retail-accent, #38BDF8)'
            : '1px solid var(--border)',
          background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'var(--surface)',
          color: isSelected ? 'var(--text)' : 'var(--text-sub)',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: 12,
          fontWeight: isSelected ? 600 : 500,
          transition: 'all 0.15s ease',
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
          <IconComponent
            size={16}
            color={isSelected ? 'var(--retail-accent, #38BDF8)' : 'var(--text-dim)'}
            style={{ flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: 12,
              lineHeight: 1.25,
              wordBreak: 'break-word',
            }}
          >
            {label}
          </span>
        </div>
        {isSelected && (
          <CheckCircleIcon
            size={14}
            color="var(--retail-accent, #38BDF8)"
            style={{ flexShrink: 0, marginLeft: 4 }}
          />
        )}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* ── Payments Section ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {t('retail.settings.paymentsTitle') || 'Способы оплаты'}
            </span>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 20,
                background: 'rgba(56, 189, 248, 0.12)',
                color: 'var(--retail-accent, #38bdf8)',
                fontWeight: 600,
              }}
            >
              {selectedPaymentsCount} / {PAYMENT_ITEMS.length}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => selectAll(PAYMENT_ITEMS)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--retail-accent, #38bdf8)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              {t('retail.settings.selectAll') || 'Все'}
            </button>
            <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>•</span>
            <button
              type="button"
              onClick={() => clearGroup(PAYMENT_ITEMS)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              {t('retail.settings.clearAll') || 'Сбросить'}
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(136px, 1fr))',
            gap: 8,
          }}
        >
          {PAYMENT_ITEMS.map(renderItem)}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--line-soft)' }} />

      {/* ── Amenities Section ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {t('retail.settings.amenitiesTitle') || 'Сервис и удобства'}
            </span>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 20,
                background: 'rgba(56, 189, 248, 0.12)',
                color: 'var(--retail-accent, #38bdf8)',
                fontWeight: 600,
              }}
            >
              {selectedAmenitiesCount} / {AMENITY_ITEMS.length}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => selectAll(AMENITY_ITEMS)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--retail-accent, #38bdf8)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              {t('retail.settings.selectAll') || 'Все'}
            </button>
            <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>•</span>
            <button
              type="button"
              onClick={() => clearGroup(AMENITY_ITEMS)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              {t('retail.settings.clearAll') || 'Сбросить'}
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(136px, 1fr))',
            gap: 8,
          }}
        >
          {displayedAmenities.map(renderItem)}
        </div>

        <button
          type="button"
          onClick={() => setShowAllAmenities(!showAllAmenities)}
          style={{
            alignSelf: 'flex-start',
            marginTop: 4,
            padding: '4px 8px',
            borderRadius: 8,
            background: 'none',
            border: 'none',
            color: 'var(--retail-accent, #38bdf8)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>
            {showAllAmenities
              ? t('retail.settings.collapseAmenities') || 'Свернуть'
              : `${t('retail.settings.showAllAmenities') || 'Все удобства'} (${AMENITY_ITEMS.length})`}
          </span>
          <ChevronDownIcon
            size={14}
            style={{
              transform: showAllAmenities ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          />
        </button>
      </div>
    </div>
  )
}
