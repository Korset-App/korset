import { useI18n } from '../../i18n/index.js'
import {
  PhoneCallIcon,
  WhatsAppIcon,
  InstagramIcon,
  TwoGisIcon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
} from '../icons/index.js'

export const MAX_CONTACTS_PER_TYPE = 4

export const DEFAULT_CONTACT_ROLES = [
  { id: 'main', labelRu: 'Основной', labelKz: 'Негізгі' },
  { id: 'admin', labelRu: 'Администратор', labelKz: 'Әкімші' },
  { id: 'sales', labelRu: 'Отдел продаж / Менеджер', labelKz: 'Сату бөлімі / Менеджер' },
  { id: 'delivery', labelRu: 'Доставка / Заказы', labelKz: 'Жеткізу / Тапсырыстар' },
  { id: 'custom', labelRu: 'Свой вариант...', labelKz: 'Басқа...' },
]

function formatKzPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  const local =
    digits.length > 10 && (digits.startsWith('7') || digits.startsWith('8'))
      ? digits.slice(1, 11)
      : digits.startsWith('7')
        ? digits.slice(1, 11)
        : digits.slice(0, 10)

  if (!local) return ''
  let res = '+7'
  if (local.length > 0) res += ` (${local.slice(0, 3)}`
  if (local.length >= 3) res += `) ${local.slice(3, 6)}`
  if (local.length >= 6) res += `-${local.slice(6, 8)}`
  if (local.length >= 8) res += `-${local.slice(8, 10)}`
  return res
}

function parseKzDigits(value, prevStored) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''

  const prevDigits = String(prevStored || '').replace(/\D/g, '')
  // If user hit backspace down to only country code:
  if (digits.length < prevDigits.length && (digits === '7' || digits === '8')) {
    return ''
  }

  let local = digits
  if (local.length > 10 && (local.startsWith('7') || local.startsWith('8'))) {
    local = local.slice(1)
  } else if (local.startsWith('7') && local.length > 1) {
    local = local.slice(1)
  }

  return local ? `7${local.slice(0, 10)}` : ''
}

export default function StoreContactsEditor({
  phones = [],
  whatsapps = [],
  instagramUrl = '',
  twogisUrl = '',
  onPhonesChange,
  onWhatsappsChange,
  onInstagramChange,
  onTwogisChange,
  disabled = false,
}) {
  const { lang } = useI18n()
  const isKz = lang === 'kz'

  // Normalize phone list so there is at least 1 entry
  const normalizedPhones =
    phones.length > 0 ? phones : [{ id: 'p_1', number: '', role: 'main', customLabel: '' }]

  // Normalize whatsapp list so there is at least 1 entry
  const normalizedWhatsapps =
    whatsapps.length > 0 ? whatsapps : [{ id: 'w_1', number: '', role: 'main', customLabel: '' }]

  // Handlers for Phone
  const handlePhoneChange = (index, field, value) => {
    const next = [...normalizedPhones]
    if (field === 'number') {
      next[index] = { ...next[index], number: parseKzDigits(value, next[index]?.number) }
    } else {
      next[index] = { ...next[index], [field]: value }
    }
    onPhonesChange?.(next)
  }

  const handleAddPhone = () => {
    if (normalizedPhones.length >= MAX_CONTACTS_PER_TYPE) return
    const next = [
      ...normalizedPhones,
      {
        id: `phone_${Date.now()}`,
        number: '',
        role: normalizedPhones.length === 1 ? 'admin' : 'sales',
        customLabel: '',
      },
    ]
    onPhonesChange?.(next)
  }

  const handleRemovePhone = (index) => {
    if (normalizedPhones.length <= 1) return
    const next = normalizedPhones.filter((_, idx) => idx !== index)
    onPhonesChange?.(next)
  }

  // Handlers for WhatsApp
  const handleWhatsappChange = (index, field, value) => {
    const next = [...normalizedWhatsapps]
    if (field === 'number') {
      next[index] = { ...next[index], number: parseKzDigits(value, next[index]?.number) }
    } else {
      next[index] = { ...next[index], [field]: value }
    }
    onWhatsappsChange?.(next)
  }

  const handleAddWhatsapp = () => {
    if (normalizedWhatsapps.length >= MAX_CONTACTS_PER_TYPE) return
    const next = [
      ...normalizedWhatsapps,
      {
        id: `wa_${Date.now()}`,
        number: '',
        role: normalizedWhatsapps.length === 1 ? 'delivery' : 'sales',
        customLabel: '',
      },
    ]
    onWhatsappsChange?.(next)
  }

  const handleRemoveWhatsapp = (index) => {
    if (normalizedWhatsapps.length <= 1) return
    const next = normalizedWhatsapps.filter((_, idx) => idx !== index)
    onWhatsappsChange?.(next)
  }

  const INPUT_STYLE = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  }

  const SELECT_STYLE = {
    padding: '7px 24px 7px 10px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--surface-sunken, rgba(255,255,255,0.04))',
    color: 'var(--text)',
    fontSize: 12,
    fontWeight: 600,
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
    position: 'relative',
    maxWidth: '100%',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── 1. ТЕЛЕФОНЫ МАГАЗИНА (ЗВОНКИ) ── */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--retail-accent, #38BDF8)',
                flexShrink: 0,
              }}
            >
              <PhoneCallIcon size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                {isKz ? 'Дүкен телефондары' : 'Телефоны магазина'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                {isKz
                  ? 'Қоңыраулар үшін (негізгі, әкімші, жеткізу)'
                  : 'Для звонков покупателей (основной, админ, доставка)'}
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-dim)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '2px 8px',
              borderRadius: 8,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {normalizedPhones.length} / {MAX_CONTACTS_PER_TYPE}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {normalizedPhones.map((phone, idx) => (
            <div
              key={phone.id || idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: 10,
                borderRadius: 12,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                {/* Role select */}
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <select
                    value={phone.role || 'main'}
                    onChange={(e) => handlePhoneChange(idx, 'role', e.target.value)}
                    disabled={disabled}
                    style={SELECT_STYLE}
                  >
                    {DEFAULT_CONTACT_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {isKz ? r.labelKz : r.labelRu}
                      </option>
                    ))}
                  </select>
                  <div
                    style={{
                      position: 'absolute',
                      right: 6,
                      pointerEvents: 'none',
                      color: 'var(--text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronDownIcon size={14} />
                  </div>
                </div>

                {normalizedPhones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhone(idx)}
                    disabled={disabled}
                    title={isKz ? 'Нөмірді өшіру' : 'Удалить номер'}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#EF4444',
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <TrashIcon size={14} />
                  </button>
                )}
              </div>

              {/* Custom role input if custom selected */}
              {phone.role === 'custom' && (
                <input
                  type="text"
                  value={phone.customLabel || ''}
                  onChange={(e) => handlePhoneChange(idx, 'customLabel', e.target.value)}
                  placeholder={
                    isKz
                      ? 'Бөлім атауын жазыңыз (мысалы: Қойма)'
                      : 'Название отдела (например: Склад, Бухгалтерия)'
                  }
                  maxLength={40}
                  disabled={disabled}
                  style={{ ...INPUT_STYLE, padding: '7px 10px', fontSize: 12 }}
                />
              )}

              {/* Phone number input */}
              <input
                type="tel"
                value={formatKzPhone(phone.number)}
                onChange={(e) => handlePhoneChange(idx, 'number', e.target.value)}
                placeholder="+7 (700) 000-00-00"
                disabled={disabled}
                style={INPUT_STYLE}
              />
            </div>
          ))}
        </div>

        {normalizedPhones.length < MAX_CONTACTS_PER_TYPE && (
          <button
            type="button"
            onClick={handleAddPhone}
            disabled={disabled}
            style={{
              padding: '9px 12px',
              borderRadius: 10,
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px dashed rgba(56, 189, 248, 0.3)',
              color: 'var(--retail-accent, #38BDF8)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <PlusIcon size={14} />
            <span>{isKz ? 'Тағы телефон нөмірін қосу' : 'Добавить ещё номер телефона'}</span>
          </button>
        )}
      </div>

      {/* ── 2. WHATSAPP МАГАЗИНА ── */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(37, 211, 102, 0.12)',
                border: '1px solid rgba(37, 211, 102, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#25D366',
                flexShrink: 0,
              }}
            >
              <WhatsAppIcon size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                {isKz ? 'WhatsApp нөмірлері' : 'WhatsApp магазина'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                {isKz ? 'Тапсырыстар мен чат үшін' : 'Для быстрых заказов и консультаций'}
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-dim)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '2px 8px',
              borderRadius: 8,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {normalizedWhatsapps.length} / {MAX_CONTACTS_PER_TYPE}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {normalizedWhatsapps.map((wa, idx) => (
            <div
              key={wa.id || idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: 10,
                borderRadius: 12,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                {/* Role select */}
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <select
                    value={wa.role || 'main'}
                    onChange={(e) => handleWhatsappChange(idx, 'role', e.target.value)}
                    disabled={disabled}
                    style={SELECT_STYLE}
                  >
                    {DEFAULT_CONTACT_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {isKz ? r.labelKz : r.labelRu}
                      </option>
                    ))}
                  </select>
                  <div
                    style={{
                      position: 'absolute',
                      right: 6,
                      pointerEvents: 'none',
                      color: 'var(--text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronDownIcon size={14} />
                  </div>
                </div>

                {normalizedWhatsapps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveWhatsapp(idx)}
                    disabled={disabled}
                    title={isKz ? 'WhatsApp өшіру' : 'Удалить WhatsApp'}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#EF4444',
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <TrashIcon size={14} />
                  </button>
                )}
              </div>

              {/* Custom role input if custom selected */}
              {wa.role === 'custom' && (
                <input
                  type="text"
                  value={wa.customLabel || ''}
                  onChange={(e) => handleWhatsappChange(idx, 'customLabel', e.target.value)}
                  placeholder={
                    isKz
                      ? 'Бөлім атауын жазыңыз (мысалы: Тапсырыс қабылдау)'
                      : 'Название отдела (например: Стол заказов)'
                  }
                  maxLength={40}
                  disabled={disabled}
                  style={{ ...INPUT_STYLE, padding: '7px 10px', fontSize: 12 }}
                />
              )}

              {/* WhatsApp number input */}
              <input
                type="tel"
                value={formatKzPhone(wa.number)}
                onChange={(e) => handleWhatsappChange(idx, 'number', e.target.value)}
                placeholder="+7 (700) 000-00-00"
                disabled={disabled}
                style={INPUT_STYLE}
              />
            </div>
          ))}
        </div>

        {normalizedWhatsapps.length < MAX_CONTACTS_PER_TYPE && (
          <button
            type="button"
            onClick={handleAddWhatsapp}
            disabled={disabled}
            style={{
              padding: '9px 12px',
              borderRadius: 10,
              background: 'rgba(37, 211, 102, 0.08)',
              border: '1px dashed rgba(37, 211, 102, 0.3)',
              color: '#25D366',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <PlusIcon size={14} />
            <span>{isKz ? 'Тағы WhatsApp нөмірін қосу' : 'Добавить ещё WhatsApp'}</span>
          </button>
        )}
      </div>

      {/* ── 3. СОЦСЕТИ И КАРТЫ (INSTAGRAM & 2GIS) ── */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* Instagram */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(225, 48, 108, 0.1)',
              border: '1px solid rgba(225, 48, 108, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E1306C',
              flexShrink: 0,
            }}
          >
            <InstagramIcon size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>Instagram</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {isKz ? 'Дүкен аккаунты' : 'Официальный аккаунт'}
              </span>
            </div>
            <input
              type="text"
              value={instagramUrl || ''}
              onChange={(e) => onInstagramChange?.(e.target.value)}
              placeholder="https://instagram.com/store или @store"
              disabled={disabled}
              style={{ ...INPUT_STYLE, padding: '7px 10px', fontSize: 13 }}
            />
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--line-soft)', margin: '0 16px' }} />

        {/* 2GIS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--retail-accent, #38BDF8)',
              flexShrink: 0,
            }}
          >
            <TwoGisIcon size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>2GIS</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {isKz ? '2GIS филиал сілтемесі' : 'Ссылка на филиал'}
              </span>
            </div>
            <input
              type="url"
              value={twogisUrl || ''}
              onChange={(e) => onTwogisChange?.(e.target.value)}
              placeholder="https://2gis.kz/astana/firm/..."
              disabled={disabled}
              style={{ ...INPUT_STYLE, padding: '7px 10px', fontSize: 13 }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
