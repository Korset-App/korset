import { useState, useEffect, useRef } from 'react'
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

export function parseScheduleState(openingHours = '', temporaryClosure = null) {
  const raw = String(openingHours || '').trim()
  const lower = raw.toLowerCase()

  let mode = 'daily'
  if (lower.includes('24/7') || lower.includes('круглосуточно') || lower.includes('тәулік')) {
    mode = '24_7'
  } else if (lower.includes('пн-пт') || lower.includes('будни') || lower.includes('дс-жм')) {
    mode = 'weekdays'
  } else if (
    (lower.includes('пн:') || lower.includes('дс:')) &&
    (lower.includes('вт:') || lower.includes('сс:'))
  ) {
    mode = 'custom'
  }

  const timeMatch = raw.match(/(\d{1,2}:\d{2})\s*[-—–]\s*(\d{1,2}:\d{2})/)
  const defaultOpen = timeMatch?.[1] || '09:00'
  const defaultClose = timeMatch?.[2] || '23:00'

  const sundayOff =
    lower.includes('вс: выходной') ||
    lower.includes('вс - выходной') ||
    lower.includes('жс: демалыс') ||
    lower.includes('вс: демалыс')

  let weekdaysOpen = defaultOpen
  let weekdaysClose = defaultClose
  let weekendOpen = '10:00'
  let weekendClose = '22:00'
  let weekendOff =
    lower.includes('сб-вс: выходной') ||
    lower.includes('сб-вс: демалыс') ||
    lower.includes('сб-жс: демалыс')

  const weekdaysMatch = raw.match(
    /(?:пн-пт|будни|дс-жм)[^\d]*(\d{1,2}:\d{2})\s*[-—–]\s*(\d{1,2}:\d{2})/i
  )
  if (weekdaysMatch) {
    weekdaysOpen = weekdaysMatch[1]
    weekdaysClose = weekdaysMatch[2]
  }

  const weekendMatch = raw.match(
    /(?:сб-вс|выходные|сб-жс)[^\d]*(\d{1,2}:\d{2})\s*[-—–]\s*(\d{1,2}:\d{2})/i
  )
  if (weekendMatch) {
    weekendOpen = weekendMatch[1]
    weekendClose = weekendMatch[2]
  }

  const daySchedule = DAY_DEFS.map((d, idx) => {
    const dayRegex = new RegExp(
      `(?:${d.shortRu}|${d.shortKz}|${d.dayRu}|${d.dayKz})[:\\s]+([^;]+)`,
      'i'
    )
    const match = raw.match(dayRegex)
    let isDayOff = idx === 6 && sundayOff
    let open = defaultOpen
    let close = defaultClose

    if (match && match[1]) {
      const part = match[1].toLowerCase()
      if (part.includes('выходной') || part.includes('демалыс') || part.includes('жабық')) {
        isDayOff = true
      } else {
        isDayOff = false
        const tMatch = part.match(/(\d{1,2}:\d{2})\s*[-—–]\s*(\d{1,2}:\d{2})/)
        if (tMatch) {
          open = tMatch[1]
          close = tMatch[2]
        }
      }
    }

    return {
      dayKey: d.dayKey,
      dayRu: d.dayRu,
      dayKz: d.dayKz,
      shortRu: d.shortRu,
      shortKz: d.shortKz,
      isDayOff,
      open,
      close,
    }
  })

  const hasPlannedClosure = Boolean(temporaryClosure?.date && temporaryClosure?.is_active !== false)
  const closureDate = temporaryClosure?.date ? String(temporaryClosure.date).slice(0, 10) : ''
  const closureReason = temporaryClosure?.reason || 'Ревизия / переучёт'

  return {
    mode,
    dailyOpen: defaultOpen,
    dailyClose: defaultClose,
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
  }
}

export default function StoreScheduleEditor({
  openingHours = '',
  temporaryClosure = null,
  onChange,
}) {
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'

  const parsed = parseScheduleState(openingHours, temporaryClosure)

  const [mode, setMode] = useState(parsed.mode)
  const [dailyOpen, setDailyOpen] = useState(parsed.dailyOpen)
  const [dailyClose, setDailyClose] = useState(parsed.dailyClose)
  const [sundayOff, setSundayOff] = useState(parsed.sundayOff)

  const [weekdaysOpen, setWeekdaysOpen] = useState(parsed.weekdaysOpen)
  const [weekdaysClose, setWeekdaysClose] = useState(parsed.weekdaysClose)
  const [weekendOpen, setWeekendOpen] = useState(parsed.weekendOpen)
  const [weekendClose, setWeekendClose] = useState(parsed.weekendClose)
  const [weekendOff, setWeekendOff] = useState(parsed.weekendOff)

  const [daySchedule, setDaySchedule] = useState(parsed.daySchedule)

  const [hasPlannedClosure, setHasPlannedClosure] = useState(parsed.hasPlannedClosure)
  const [closureDate, setClosureDate] = useState(parsed.closureDate)
  const [closureReason, setClosureReason] = useState(parsed.closureReason)

  const isInternalChangeRef = useRef(false)
  const prevPropsRef = useRef({ openingHours, temporaryClosure })

  // Re-sync if props changed externally
  useEffect(() => {
    if (
      prevPropsRef.current.openingHours !== openingHours ||
      prevPropsRef.current.temporaryClosure !== temporaryClosure
    ) {
      prevPropsRef.current = { openingHours, temporaryClosure }
      if (isInternalChangeRef.current) {
        isInternalChangeRef.current = false
        return
      }
      const next = parseScheduleState(openingHours, temporaryClosure)
      setMode(next.mode)
      setDailyOpen(next.dailyOpen)
      setDailyClose(next.dailyClose)
      setSundayOff(next.sundayOff)
      setWeekdaysOpen(next.weekdaysOpen)
      setWeekdaysClose(next.weekdaysClose)
      setWeekendOpen(next.weekendOpen)
      setWeekendClose(next.weekendClose)
      setWeekendOff(next.weekendOff)
      setDaySchedule(next.daySchedule)
      setHasPlannedClosure(next.hasPlannedClosure)
      setClosureDate(next.closureDate)
      setClosureReason(next.closureReason)
    }
  }, [openingHours, temporaryClosure])

  const notifyChange = (nextState) => {
    isInternalChangeRef.current = true
    let formattedHours = ''
    if (nextState.mode === '24_7') {
      formattedHours = 'Круглосуточно (24/7)'
    } else if (nextState.mode === 'daily') {
      formattedHours = `${nextState.dailyOpen} - ${nextState.dailyClose}`
      if (nextState.sundayOff) {
        formattedHours += '; Вс: выходной'
      }
    } else if (nextState.mode === 'weekdays') {
      formattedHours = `Пн-Пт: ${nextState.weekdaysOpen}-${nextState.weekdaysClose}`
      if (nextState.weekendOff) {
        formattedHours += '; Сб-Вс: выходной'
      } else {
        formattedHours += `; Сб-Вс: ${nextState.weekendOpen}-${nextState.weekendClose}`
      }
    } else if (nextState.mode === 'custom') {
      const parts = (nextState.daySchedule || []).map((d) => {
        const name = isKz ? d.shortKz : d.shortRu
        return d.isDayOff ? `${name}: выходной` : `${name}: ${d.open}-${d.close}`
      })
      formattedHours = parts.join('; ')
    }

    const closurePayload =
      nextState.hasPlannedClosure && nextState.closureDate
        ? {
            date: nextState.closureDate,
            reason: nextState.closureReason.trim() || 'Ревизия',
            is_active: true,
          }
        : null

    onChange?.({
      opening_hours: formattedHours,
      temporary_closure: closurePayload,
    })
  }

  const getCurrentSnapshot = () => ({
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
  })

  const handleModeChange = (newMode) => {
    setMode(newMode)
    notifyChange({ ...getCurrentSnapshot(), mode: newMode })
  }

  const handleDailyOpenChange = (val) => {
    setDailyOpen(val)
    notifyChange({ ...getCurrentSnapshot(), dailyOpen: val })
  }

  const handleDailyCloseChange = (val) => {
    setDailyClose(val)
    notifyChange({ ...getCurrentSnapshot(), dailyClose: val })
  }

  const handleSundayOffChange = (checked) => {
    setSundayOff(checked)
    notifyChange({ ...getCurrentSnapshot(), sundayOff: checked })
  }

  const handleWeekdaysOpenChange = (val) => {
    setWeekdaysOpen(val)
    notifyChange({ ...getCurrentSnapshot(), weekdaysOpen: val })
  }

  const handleWeekdaysCloseChange = (val) => {
    setWeekdaysClose(val)
    notifyChange({ ...getCurrentSnapshot(), weekdaysClose: val })
  }

  const handleWeekendOpenChange = (val) => {
    setWeekendOpen(val)
    notifyChange({ ...getCurrentSnapshot(), weekendOpen: val })
  }

  const handleWeekendCloseChange = (val) => {
    setWeekendClose(val)
    notifyChange({ ...getCurrentSnapshot(), weekendClose: val })
  }

  const handleWeekendOffToggle = () => {
    const nextVal = !weekendOff
    setWeekendOff(nextVal)
    notifyChange({ ...getCurrentSnapshot(), weekendOff: nextVal })
  }

  const toggleDayOff = (dayKey) => {
    const next = daySchedule.map((d) => (d.dayKey === dayKey ? { ...d, isDayOff: !d.isDayOff } : d))
    setDaySchedule(next)
    notifyChange({ ...getCurrentSnapshot(), daySchedule: next })
  }

  const updateDayTime = (dayKey, field, val) => {
    const next = daySchedule.map((d) => (d.dayKey === dayKey ? { ...d, [field]: val } : d))
    setDaySchedule(next)
    notifyChange({ ...getCurrentSnapshot(), daySchedule: next })
  }

  const handlePlannedClosureToggle = () => {
    const nextVal = !hasPlannedClosure
    setHasPlannedClosure(nextVal)
    notifyChange({ ...getCurrentSnapshot(), hasPlannedClosure: nextVal })
  }

  const handleClosureDateChange = (val) => {
    setClosureDate(val)
    notifyChange({ ...getCurrentSnapshot(), closureDate: val })
  }

  const handleClosureReasonChange = (val) => {
    setClosureReason(val)
    notifyChange({ ...getCurrentSnapshot(), closureReason: val })
  }

  const todayYmd = new Date().toISOString().slice(0, 10)

  const SELECT_STYLE = {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    padding: '9px 12px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-body)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Mode Selector Tabs ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 6,
          background: 'var(--surface)',
          padding: 4,
          borderRadius: 12,
          border: '1px solid var(--border)',
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
              onClick={() => handleModeChange(tab.id)}
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
                fontFamily: 'var(--font-display)',
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
                onChange={(e) => handleDailyOpenChange(e.target.value)}
                style={SELECT_STYLE}
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
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
                onChange={(e) => handleDailyCloseChange(e.target.value)}
                style={SELECT_STYLE}
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
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
              onChange={(e) => handleSundayOffChange(e.target.checked)}
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
                onChange={(e) => handleWeekdaysOpenChange(e.target.value)}
                style={SELECT_STYLE}
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              <span style={{ color: 'var(--text-dim)' }}>—</span>
              <select
                value={weekdaysClose}
                onChange={(e) => handleWeekdaysCloseChange(e.target.value)}
                style={SELECT_STYLE}
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
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
                onClick={handleWeekendOffToggle}
                style={{
                  background: weekendOff ? 'rgba(239,68,68,0.1)' : 'var(--surface)',
                  border: `1px solid ${weekendOff ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                  color: weekendOff ? '#EF4444' : 'var(--text-dim)',
                  padding: '3px 9px',
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                }}
              >
                {weekendOff
                  ? t('retail.settings.dayOff') || 'Выходной'
                  : t('retail.settings.workingDays') || 'Рабочие дни'}
              </button>
            </div>

            {!weekendOff && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <select
                  value={weekendOpen}
                  onChange={(e) => handleWeekendOpenChange(e.target.value)}
                  style={SELECT_STYLE}
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                <span style={{ color: 'var(--text-dim)' }}>—</span>
                <select
                  value={weekendClose}
                  onChange={(e) => handleWeekendCloseChange(e.target.value)}
                  style={SELECT_STYLE}
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {daySchedule.map((day) => {
            const shortName = isKz ? day.shortKz : day.shortRu
            const fullName = isKz ? day.dayKz : day.dayRu

            return (
              <div
                key={day.dayKey}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '72px 1fr 72px',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 10,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  minHeight: 44,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    minWidth: 0,
                  }}
                  title={fullName}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: day.isDayOff
                        ? 'rgba(239, 68, 68, 0.12)'
                        : 'rgba(56, 189, 248, 0.12)',
                      color: day.isDayOff ? '#EF4444' : 'var(--retail-accent, #38BDF8)',
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {shortName}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text)',
                      fontFamily: 'var(--font-display)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {fullName.slice(0, 3)}
                  </span>
                </div>

                {day.isDayOff ? (
                  <span
                    style={{
                      fontSize: 12,
                      color: '#EF4444',
                      fontWeight: 600,
                      textAlign: 'center',
                      lineHeight: '32px',
                    }}
                  >
                    {t('retail.settings.dayOff') || 'Выходной'}
                  </span>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <select
                      value={day.open}
                      onChange={(e) => updateDayTime(day.dayKey, 'open', e.target.value)}
                      style={{
                        ...SELECT_STYLE,
                        height: 32,
                        padding: '4px 6px',
                        fontSize: 12,
                      }}
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                    <span style={{ color: 'var(--text-dim)', fontSize: 11, textAlign: 'center' }}>
                      —
                    </span>
                    <select
                      value={day.close}
                      onChange={(e) => updateDayTime(day.dayKey, 'close', e.target.value)}
                      style={{
                        ...SELECT_STYLE,
                        height: 32,
                        padding: '4px 6px',
                        fontSize: 12,
                      }}
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => toggleDayOff(day.dayKey)}
                  style={{
                    width: '100%',
                    height: 30,
                    padding: 0,
                    borderRadius: 8,
                    background: day.isDayOff ? 'rgba(239,68,68,0.1)' : 'rgba(56,189,248,0.1)',
                    border: `1px solid ${
                      day.isDayOff ? 'rgba(239,68,68,0.25)' : 'rgba(56,189,248,0.25)'
                    }`,
                    color: day.isDayOff ? '#EF4444' : 'var(--retail-accent, #38BDF8)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-display)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {day.isDayOff
                    ? t('retail.settings.openDay') || 'Открыть'
                    : t('retail.settings.dayOff') || 'Выходной'}
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
            : '1px dashed var(--border-bright)',
          background: hasPlannedClosure ? 'rgba(245, 158, 11, 0.05)' : 'var(--surface)',
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
            onClick={handlePlannedClosureToggle}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              background: hasPlannedClosure ? 'rgba(239,68,68,0.15)' : 'rgba(56,189,248,0.12)',
              color: hasPlannedClosure ? '#EF4444' : 'var(--retail-accent, #38BDF8)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
            }}
          >
            {hasPlannedClosure
              ? t('retail.settings.removeClosure') || 'Снять закрытие'
              : t('retail.settings.planClosure') || '+ Запланировать'}
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
                onChange={(e) => handleClosureDateChange(e.target.value)}
                style={SELECT_STYLE}
              ></input>
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
                      onClick={() => handleClosureReasonChange(text)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 600,
                        border: selected ? '1px solid #F59E0B' : '1px solid var(--border)',
                        background: selected ? 'rgba(245,158,11,0.15)' : 'var(--surface)',
                        color: selected ? '#F59E0B' : 'var(--text-sub)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-display)',
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
                onChange={(e) => handleClosureReasonChange(e.target.value)}
                maxLength={80}
                style={SELECT_STYLE}
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
