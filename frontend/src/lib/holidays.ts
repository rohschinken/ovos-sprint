// Austrian federal holidays
export function getAustrianHolidays(year: number): Date[] {
  const holidays: Date[] = []

  // Fixed holidays
  holidays.push(new Date(year, 0, 1))   // New Year's Day
  holidays.push(new Date(year, 0, 6))   // Epiphany
  holidays.push(new Date(year, 4, 1))   // Labour Day
  holidays.push(new Date(year, 7, 15))  // Assumption Day
  holidays.push(new Date(year, 9, 26))  // National Day
  holidays.push(new Date(year, 10, 1))  // All Saints' Day
  holidays.push(new Date(year, 11, 8))  // Immaculate Conception
  holidays.push(new Date(year, 11, 25)) // Christmas Day
  holidays.push(new Date(year, 11, 26)) // St. Stephen's Day

  // Easter-dependent holidays
  const easter = calculateEaster(year)
  holidays.push(new Date(easter.getTime() + 1 * 24 * 60 * 60 * 1000))  // Easter Monday
  holidays.push(new Date(easter.getTime() + 39 * 24 * 60 * 60 * 1000)) // Ascension Day
  holidays.push(new Date(easter.getTime() + 50 * 24 * 60 * 60 * 1000)) // Whit Monday
  holidays.push(new Date(easter.getTime() + 60 * 24 * 60 * 60 * 1000)) // Corpus Christi

  return holidays
}

// Calculate Easter Sunday using Meeus/Jones/Butcher algorithm
function calculateEaster(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month - 1, day)
}

export function isHoliday(date: Date): boolean {
  const year = date.getFullYear()
  const holidays = getAustrianHolidays(year)

  return holidays.some(holiday =>
    holiday.getFullYear() === date.getFullYear() &&
    holiday.getMonth() === date.getMonth() &&
    holiday.getDate() === date.getDate()
  )
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // Sunday or Saturday
}

export function getHolidayName(date: Date): string | null {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  const dateKey = `${month}-${day}`
  const fixedHolidays: Record<string, string> = {
    '0-1': 'Neujahr',
    '0-6': 'Heilige Drei Könige',
    '4-1': 'Staatsfeiertag',
    '7-15': 'Mariä Himmelfahrt',
    '9-26': 'Nationalfeiertag',
    '10-1': 'Allerheiligen',
    '11-8': 'Mariä Empfängnis',
    '11-25': 'Weihnachten',
    '11-26': 'Stefanitag',
  }

  if (fixedHolidays[dateKey]) {
    return fixedHolidays[dateKey]
  }

  // Check Easter-dependent holidays
  const easter = calculateEaster(year)
  const currentDate = new Date(year, month, day)
  const diff = Math.floor((currentDate.getTime() - easter.getTime()) / (24 * 60 * 60 * 1000))

  const easterHolidays: Record<number, string> = {
    1: 'Ostermontag',
    39: 'Christi Himmelfahrt',
    50: 'Pfingstmontag',
    60: 'Fronleichnam',
  }

  return easterHolidays[diff] || null
}
