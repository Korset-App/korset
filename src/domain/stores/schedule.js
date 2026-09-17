/**
 * Parses store opening hours string and evaluates current status against Kazakhstan timezone (UTC+5).
 * Formats supported: "09:00-23:00", "09:00 - 23:00", "24/7", "круглосуточно"
 */
export function parseStoreSchedule(hoursStr, now = new Date()) {
  if (!hoursStr || typeof hoursStr !== 'string') {
    return { isConfigured: false, raw: '' }
  }

  const clean = hoursStr.trim()
  if (!clean) {
    return { isConfigured: false, raw: '' }
  }

  if (/(24\/7|круглосуточно|тәулік бойы)/i.test(clean)) {
    return {
      isConfigured: true,
      isAlwaysOpen: true,
      isOpen: true,
      raw: clean,
    }
  }

  const match = clean.match(/(\d{1,2}:\d{2})\s*[-—–]\s*(\d{1,2}:\d{2})/)
  if (!match) {
    return {
      isConfigured: true,
      isOpen: null,
      raw: clean,
    }
  }

  const [, openStr, closeStr] = match
  const parseMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  const openMinutes = parseMinutes(openStr)
  let closeMinutes = parseMinutes(closeStr)
  if (closeMinutes === 0) closeMinutes = 24 * 60 // 00:00 midnight

  // Determine current Kazakhstan local time (UTC+5)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const kzTime = new Date(utc + 5 * 3600000)
  const currentMinutes = kzTime.getHours() * 60 + kzTime.getMinutes()

  const isOpen =
    closeMinutes > openMinutes
      ? currentMinutes >= openMinutes && currentMinutes < closeMinutes
      : currentMinutes >= openMinutes || currentMinutes < closeMinutes

  return {
    isConfigured: true,
    isOpen,
    opens: openStr,
    closes: closeStr,
    raw: clean,
  }
}
