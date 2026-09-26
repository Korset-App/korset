/**
 * Day definitions (Monday = 0 ... Sunday = 6 in Kazakhstan ISO standard)
 */
export const DAY_DEFS = [
  { dayKey: 'mon', dayRu: 'Понедельник', shortRu: 'Пн', dayKz: 'Дүйсенбі', shortKz: 'Дс' },
  { dayKey: 'tue', dayRu: 'Вторник', shortRu: 'Вт', dayKz: 'Сейсенбі', shortKz: 'Сс' },
  { dayKey: 'wed', dayRu: 'Среда', shortRu: 'Ср', dayKz: 'Сәрсенбі', shortKz: 'Ср' },
  { dayKey: 'thu', dayRu: 'Четверг', shortRu: 'Чт', dayKz: 'Бейсенбі', shortKz: 'Бс' },
  { dayKey: 'fri', dayRu: 'Пятница', shortRu: 'Пт', dayKz: 'Жұма', shortKz: 'Жм' },
  { dayKey: 'sat', dayRu: 'Суббота', shortRu: 'Сб', dayKz: 'Сенбі', shortKz: 'Сб' },
  { dayKey: 'sun', dayRu: 'Воскресенье', shortRu: 'Вс', dayKz: 'Жексенбі', shortKz: 'Жс' },
]

/**
 * Parses store opening hours string or store object and evaluates current status against Kazakhstan timezone (UTC+5).
 * Formats supported:
 *  - "09:00-23:00"
 *  - "09:00 - 23:00"
 *  - "24/7", "круглосуточно", "тәулік бойы"
 *  - "Пн-Сб: 08:30-23:00; Вс: выходной"
 *  - "09:00-23:00 | 28 сентября — санитарный день (с 14:00)"
 *  - Store object: { opening_hours: "...", temporary_closure: { date: "2026-09-28", reason: "Ревизия", is_active: true } }
 */
export function parseStoreSchedule(storeOrHours, now = new Date()) {
  let hoursStr = ''
  let closureObj = null

  if (typeof storeOrHours === 'string') {
    hoursStr = storeOrHours
  } else if (storeOrHours && typeof storeOrHours === 'object') {
    hoursStr = storeOrHours.opening_hours || ''
    closureObj = storeOrHours.temporary_closure || storeOrHours.temporaryClosure || null
  }

  const clean = String(hoursStr || '').trim()

  if (!clean && !closureObj) {
    return { isConfigured: false, raw: '' }
  }

  // Determine current Kazakhstan local time (UTC+5)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const kzTime = new Date(utc + 5 * 3600000)
  const currentMinutes = kzTime.getHours() * 60 + kzTime.getMinutes()
  // JS getDay(): 0 is Sunday, 1 is Monday ... convert to 0 = Monday ... 6 = Sunday
  const currentDayIndex = (kzTime.getDay() + 6) % 7
  const todayYmd = kzTime.toISOString().slice(0, 10)

  // 1. Check for special notice or temporary closure delimiter ('|')
  let mainHoursPart = clean
  let specialNotice = null
  let isTemporarilyClosed = false
  let temporaryClosureReason = null
  let upcomingClosure = null

  if (clean.includes('|')) {
    const parts = clean.split('|').map((s) => s.trim())
    mainHoursPart = parts[0] || ''
    specialNotice = parts.slice(1).join('; ')
  }

  // Handle structured temporary_closure
  if (closureObj && closureObj.is_active !== false && closureObj.date) {
    const closureYmd = String(closureObj.date).slice(0, 10)
    const closureReason = closureObj.reason || 'Ревизия / Санитарный день'

    // Compare dates (YYYY-MM-DD)
    const msDiff = new Date(closureYmd).getTime() - new Date(todayYmd).getTime()
    const daysLeft = Math.round(msDiff / (1000 * 60 * 60 * 24))

    if (daysLeft === 0) {
      isTemporarilyClosed = true
      temporaryClosureReason = closureReason
    } else if (daysLeft > 0 && daysLeft <= 7) {
      upcomingClosure = {
        date: closureYmd,
        reason: closureReason,
        daysLeft,
      }
    }
  }

  if (specialNotice && /(сегодня закрыт|санитарный день|ревизия|жабық|учёт)/i.test(specialNotice)) {
    // If notice states today is closed
    if (/(сегодня|бүгін)/i.test(specialNotice)) {
      isTemporarilyClosed = true
      temporaryClosureReason = specialNotice
    }
  }

  if (!specialNotice && isTemporarilyClosed) {
    specialNotice = `Сегодня магазин закрыт (${temporaryClosureReason || 'санитарный день / ревизия'})`
  } else if (!specialNotice && upcomingClosure) {
    specialNotice = `Внимание: ${upcomingClosure.date} магазин закрыт (${upcomingClosure.reason})`
  }

  // 2. 24/7 store case
  if (/(24\/7|круглосуточно|тәулік бойы)/i.test(mainHoursPart)) {
    const weeklySchedule = DAY_DEFS.map((day, idx) => ({
      ...day,
      hours: 'Круглосуточно',
      isDayOff: false,
      isToday: idx === currentDayIndex,
    }))

    return {
      isConfigured: true,
      isAlwaysOpen: true,
      isOpen: !isTemporarilyClosed,
      isTemporarilyClosed,
      temporaryClosureReason,
      upcomingClosure,
      specialNotice,
      todayHours: 'Круглосуточно',
      isTodayDayOff: false,
      weeklySchedule,
      raw: clean,
    }
  }

  // 3. Multi-day or single time range extraction
  const timeMatch = mainHoursPart.match(/(\d{1,2}:\d{2})\s*[-—–]\s*(\d{1,2}:\d{2})/)
  if (!timeMatch) {
    return {
      isConfigured: true,
      isOpen: null,
      specialNotice,
      isTemporarilyClosed,
      temporaryClosureReason,
      upcomingClosure,
      raw: clean,
    }
  }

  const [, openStr, closeStr] = timeMatch
  const parseMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  const openMinutes = parseMinutes(openStr)
  let closeMinutes = parseMinutes(closeStr)
  if (closeMinutes === 0) closeMinutes = 24 * 60 // 00:00 midnight

  const isTimeWithin =
    closeMinutes > openMinutes
      ? currentMinutes >= openMinutes && currentMinutes < closeMinutes
      : currentMinutes >= openMinutes || currentMinutes < closeMinutes

  // 4. Build 7-day schedule with day-off detection
  // Checks if Sunday (Вс) or other day is explicitly designated as "выходной" / "демалыс"
  const isSundayDayOff = /(вс|жек)\s*[:—–-]?\s*(выходной|демалыс|жабық|closed)/i.test(mainHoursPart)

  const weeklySchedule = DAY_DEFS.map((day, idx) => {
    const isSun = idx === 6
    const isDayOff = isSun && isSundayDayOff
    const hours = isDayOff ? 'Выходной' : `${openStr} — ${closeStr}`

    return {
      ...day,
      hours,
      isDayOff,
      isToday: idx === currentDayIndex,
    }
  })

  const todayItem = weeklySchedule[currentDayIndex]
  const isTodayDayOff = Boolean(todayItem?.isDayOff)
  const todayHours = todayItem?.hours || `${openStr} — ${closeStr}`
  const isOpen = !isTemporarilyClosed && !isTodayDayOff && isTimeWithin

  return {
    isConfigured: true,
    isOpen,
    isTemporarilyClosed,
    temporaryClosureReason,
    upcomingClosure,
    specialNotice,
    opens: openStr,
    closes: closeStr,
    todayHours,
    isTodayDayOff,
    weeklySchedule,
    raw: clean,
  }
}
