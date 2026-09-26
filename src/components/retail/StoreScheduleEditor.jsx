import { useState, useEffect, useMemo } from 'react'
import { useI18n } from '../../i18n/index.js'
import { DAY_DEFS } from '../../domain/stores/schedule.js'
import { ClockIcon, AlertTriangleIcon } from '../icons/index.js'

const TIME_OPTIONS = [
  '06:00',
  '06:30',
  '07:00',
  '07:30',
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '19:00',
  '20:00',
  '20:30',
  '21:00',
  '21:30',
  '22:00',
  '22:30',
  '23:00',
  '23:30',
  '00:00',
  '01:00',
  '02:00',
]

const QUICK_REASONS = [
  { ru: 'Ревизия / переучёт', kz: 'Ревизия / қайта есептеу' },
  { ru: 'Санитарный день', kz: 'Санитарлық күн' },
  { ru: 'Технические работы', kz: 'Техникалық жұмыстар' },
  { ru: 'Праздничный день', kz: 'Мерекелік күн' },
]

export default function StoreScheduleEditor({
  openingHours = '',
  temporaryClosure = null,
  onChange,
}) {
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'

  // Parse initial state from openingHours string
  const initialMode = useMemo(() => {
    const raw = String(openingHours || '').toLowerCase()
    if (raw.includes('24/7') || raw.includes('круглосуточно') || raw.includes('тәулік')) {
      return '24_7'
    }
    if (raw.includes('пн-пт') || raw.includes('будни')) {
      return 'weekdays'
    }
    if (raw.includes('пн') && raw.includes('вт')) {
      return 'custom'
    }
    return 'daily'
  }, [openingHours])

  const initialTimes = useMemo(() => {
    const match = String(openingHours || '').match(/(\d{1,2}:\d{2})\s*[-—–]\s*(\d{1,2}:\d{2})/)
    return {
      open: match?.[1] || '09:00',
      close: match?.[2] || '23:00',
    }
  }, [openingHours])

  const [mode, setMode] = useState(initialMode)
  const [dailyOpen, setDailyOpen] = useState(initialTimes.open)
  const [dailyClose, setDailyClose] = useState(initialTimes.close)

  // Sunday day-off flag for daily mode
  const [sundayOff, setSundayOff] = useState(() => {
    const raw = String(openingHours || '').toLowerCase()
    return raw.includes('вс: выходной') || raw.includes('вс - выходной')
  })

  // Weekday + weekend mode
  const [weekdaysOpen, setWeekdaysOpen] = useState(initialTimes.open)
  const [weekdaysClose, setWeekdaysClose] = useState(initialTimes.close)
  const [weekendOpen, setWeekendOpen] = useState('10:00')
  const [weekendClose, setWeekendClose] = useState('22:00')
  const [weekendOff, setWeekendOff] = useState(false)

  // Individual days state
  const [daySchedule, setDaySchedule] = useState(() => {
    return DAY_DEFS.map((d, idx) => ({
      dayKey: d.dayKey,
      dayRu: d.dayRu,
      dayKz: d.dayKz,
      shortRu: d.shortRu,
      shortKz: d.shortKz,
      isDayOff: idx === 6 && String(openingHours).toLowerCase().includes('вс: выходной'),
      open: initialTimes.open,
      close: initialTimes.close,
    }))
  })

  // Planned temporary closure state
  const [hasPlannedClosure, setHasPlannedClosure] = useState(() => Boolean(temporaryClosure?.date))
  const [closureDate, setClosureDate] = useState(() => temporaryClosure?.date || '')
  const [closureReason, setClosureReason] = useState(
    () => temporaryClosure?.reason || 'Ревизия / переучёт'
  )

  // Emit serialized schedule on changes
  useEffect(() => {
    let formattedHours = ''
    if (mode === '24_7') {
      formattedHours = 'Круглосуточно (24/7)'
    } else if (mode === 'daily') {
      formattedHours = `${dailyOpen} - ${dailyClose}`
      if (sundayOff) {
        formattedHours += '; Вс: выходной'
      }
    } else if (mode === 'weekdays') {
      formattedHours = `Пн-Пт: ${weekdaysOpen}-${weekdaysClose}`
      if (weekendOff) {
        formattedHours += '; Сб-Вс: выходной'
      } else {
        formattedHours += `; Сб-Вс: ${weekendOpen}-${weekendClose}`
      }
    } else if (mode === 'custom') {
      const parts = daySchedule.map((d) => {
        const name = isKz ? d.shortKz : d.shortRu
        return d.isDayOff ? `${name}: выходной` : `${name}: ${d.open}-${d.close}`
      })
      formattedHours = parts.join('; ')
    }

    const closurePayload =
      hasPlannedClosure && closureDate
        ? {
            date: closureDate,
            reason: closureReason.trim() || 'Ревизия',
            is_active: true,
          }
        : null

    onChange?.({
      opening_hours: formattedHours,
      temporary_closure: closurePayload,
    })
  }, [
    mode,
    dailyOpen,
    dailyClose,
    sundayOff,
    weekdaysOpen,
    weekdaysClose,
    weekendOpen,
    weekendClose,
    weekendOff,
    daySchedule,
    hasPlannedClosure,
    closureDate,
    closureReason,
    isKz,
    onChange,
  ])

  const toggleDayOff = (dayKey) => {
    setDaySchedule((prev) =>
      prev.map((d) => (d.dayKey === dayKey ? { ...d, isDayOff: !d.isDayOff } : d))
    )
  }

  const updateDayTime = (dayKey, field, val) => {
    setDaySchedule((prev) => prev.map((d) => (d.dayKey === dayKey ? { ...d, [field]: val } : d)))
  }

  const todayYmd = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Mode Selector Tabs ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 6,
          background: 'var(--input-bg)',
          padding: 4,
          borderRadius: 12,
          border: '1px solid var(--input-border)',
        }}
      >
        {[
          { id: 'daily', label: t('retail.settings.scheduleDaily') || 'Ежедневно' },
          { id: '24_7', label: t('retail.settings.schedule247') || '24/7 Круглосуточно' },
          { id: 'weekdays', label: t('retail.settings.scheduleWeekdays') || 'Будни / Выходные' },
          { id: 'custom', label: t('retail.settings.scheduleByDays') || 'По дням недели' },
        ].map((tab) => {
          const active = mode === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              style={{
                padding: '8px 10px',
                borderRadius: 9,
                border: 'none',
                background: active ? 'var(--retail-accent, #38BDF8)' : 'transparent',
                color: active ? '#07070F' : 'var(--text-sub)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Mode 1: Daily ── */}
      {mode === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
                {t('retail.settings.opensAt') || 'Открытие'}
              </div>
              <select
                value={dailyOpen}
                onChange={(e) => setDailyOpen(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text)',
                  padding: '10px 12px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ padding: '20px 4px 0', color: 'var(--text-dim)', fontWeight: 700 }}>
              —
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
                {t('retail.settings.closesAt') || 'Закрытие'}
              </div>
              <select
                value={dailyClose}
                onChange={(e) => setDailyClose(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text)',
                  padding: '10px 12px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--text)',
              padding: '6px 0',
            }}
          >
            <input
              type="checkbox"
              checked={sundayOff}
              onChange={(e) => setSundayOff(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--retail-accent, #38BDF8)' }}
            />
            <span>{t('retail.settings.sundayDayOff') || 'Воскресенье — выходной'}</span>
          </label>
        </div>
      )}

      {/* ── Mode 2: 24/7 ── */}
      {mode === '24_7' && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 12,
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <ClockIcon size={20} color="#38BDF8" />
          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
            {t('retail.settings.alwaysOpenNote') ||
              'Магазин открыт круглосуточно без выходных (24/7)'}
          </div>
        </div>
      )}

      {/* ── Mode 3: Weekdays vs Weekend ── */}
      {mode === 'weekdays' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Weekdays */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              {t('retail.settings.weekdaysMonFri') || 'Будние дни (Понедельник — Пятница)'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select
                value={weekdaysOpen}
                onChange={(e) => setWeekdaysOpen(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text)',
                  padding: '9px 12px',
                  borderRadius: 10,
                  fontSize: 13,
                }}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <span style={{ color: 'var(--text-dim)' }}>—</span>
              <select
                value={weekdaysClose}
                onChange={(e) => setWeekdaysClose(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text)',
                  padding: '9px 12px',
                  borderRadius: 10,
                  fontSize: 13,
                }}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Weekend */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                {t('retail.settings.weekendSatSun') || 'Выходные (Суббота — Воскресенье)'}
              </span>
              <button
                type="button"
                onClick={() => setWeekendOff(!weekendOff)}
                style={{
                  background: weekendOff ? 'rgba(239,68,68,0.1)' : 'transparent',
                  border: `1px solid ${weekendOff ? 'rgba(239,68,68,0.3)' : 'var(--glass-border)'}`,
                  color: weekendOff ? '#EF4444' : 'var(--text-dim)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {weekendOff ? 'Выходные' : 'Рабочие дни'}
              </button>
            </div>

            {!weekendOff && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <select
                  value={weekendOpen}
                  onChange={(e) => setWeekendOpen(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text)',
                    padding: '9px 12px',
                    borderRadius: 10,
                    fontSize: 13,
                  }}
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <span style={{ color: 'var(--text-dim)' }}>—</span>
                <select
                  value={weekendClose}
                  onChange={(e) => setWeekendClose(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text)',
                    padding: '9px 12px',
                    borderRadius: 10,
                    fontSize: 13,
                  }}
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mode 4: Individual Days ── */}
      {mode === 'custom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {daySchedule.map((day) => {
            const dayLabel = isKz ? day.dayKz : day.dayRu
            return (
              <div
                key={day.dayKey}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 10,
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', width: 105 }}>
                  {dayLabel}
                </span>

                {day.isDayOff ? (
                  <span
                    style={{
                      fontSize: 12,
                      color: '#EF4444',
                      fontStyle: 'italic',
                      flex: 1,
                      textAlign: 'center',
                    }}
                  >
                    {t('retail.settings.dayOff') || 'Выходной'}
                  </span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    <select
                      value={day.open}
                      onChange={(e) => updateDayTime(day.dayKey, 'open', e.target.value)}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text)',
                        padding: '4px 6px',
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>
                    <select
                      value={day.close}
                      onChange={(e) => updateDayTime(day.dayKey, 'close', e.target.value)}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text)',
                        padding: '4px 6px',
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => toggleDayOff(day.dayKey)}
                  style={{
                    background: day.isDayOff ? 'rgba(239,68,68,0.1)' : 'rgba(124,58,237,0.1)',
                    border: `1px solid ${day.isDayOff ? 'rgba(239,68,68,0.25)' : 'rgba(124,58,237,0.25)'}`,
                    color: day.isDayOff ? '#EF4444' : '#A78BFA',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 8px',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  {day.isDayOff ? 'Открыть' : 'Выходной'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── PLANNED SPECIAL CLOSURE (Ревизия / Санитарный день) ── */}
      <div
        style={{
          marginTop: 6,
          padding: 14,
          borderRadius: 14,
          border: hasPlannedClosure
            ? '1px solid rgba(245, 158, 11, 0.3)'
            : '1px dashed var(--glass-strong-border)',
          background: hasPlannedClosure ? 'rgba(245, 158, 11, 0.05)' : 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangleIcon
              size={18}
              color={hasPlannedClosure ? '#F59E0B' : 'var(--text-dim)'}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {t('retail.settings.plannedClosureTitle') || 'Плановое закрытие (ревизия / учёт)'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {t('retail.settings.plannedClosureHint') ||
                  'Покупатели на витрине заранее увидят объявление о закрытии магазина'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setHasPlannedClosure(!hasPlannedClosure)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              background: hasPlannedClosure ? 'rgba(239,68,68,0.15)' : 'rgba(56,189,248,0.12)',
              color: hasPlannedClosure ? '#EF4444' : 'var(--retail-accent, #38BDF8)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {hasPlannedClosure ? 'Снять закрытие' : '+ Запланировать'}
          </button>
        </div>

        {hasPlannedClosure && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 6 }}>
            {/* Date input */}
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: 'var(--text-sub)',
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                {t('retail.settings.closureDateLabel') || 'Дата закрытия магазина:'}
              </label>
              <input
                type="date"
                min={todayYmd}
                value={closureDate}
                onChange={(e) => setClosureDate(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text)',
                  padding: '8px 12px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              />
            </div>

            {/* Quick Reason Chips */}
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: 'var(--text-sub)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                {t('retail.settings.closureReasonLabel') || 'Причина закрытия:'}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {QUICK_REASONS.map((r) => {
                  const text = isKz ? r.kz : r.ru
                  const selected = closureReason === text
                  return (
                    <button
                      key={r.ru}
                      type="button"
                      onClick={() => setClosureReason(text)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 600,
                        border: selected ? '1px solid #F59E0B' : '1px solid var(--glass-border)',
                        background: selected ? 'rgba(245,158,11,0.15)' : 'var(--glass-subtle)',
                        color: selected ? '#F59E0B' : 'var(--text-sub)',
                        cursor: 'pointer',
                      }}
                    >
                      {text}
                    </button>
                  )
                })}
              </div>

              <input
                type="text"
                placeholder={
                  t('retail.settings.closureCustomReason') || 'Или введите свою причину...'
                }
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                maxLength={80}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text)',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </div>

            {/* Preview of customer warning */}
            {closureDate && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  fontSize: 12,
                  color: '#F59E0B',
                  lineHeight: 1.4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertTriangleIcon size={16} color="#F59E0B" />
                <span>
                  <b>{t('retail.settings.previewNotice') || 'На витрине покупателя:'}</b> «Обратите
                  внимание: {closureDate} магазин будет закрыт ({closureReason})»
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
