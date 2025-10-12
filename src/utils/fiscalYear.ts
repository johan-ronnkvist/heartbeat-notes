/**
 * Fiscal year utility functions
 *
 * These functions handle the conversion between calendar year/week and fiscal year/week.
 * Storage remains in calendar year/week format, but display can show fiscal year context.
 */

/**
 * Get the fiscal year for a given calendar date
 *
 * @param date - The calendar date
 * @param offsetMonths - Number of months offset from calendar year (e.g., 6 for July start)
 * @returns The fiscal year number
 *
 * @example
 * // If offsetMonths = 6 (fiscal year starts July 1):
 * // June 2024 -> FY 2024
 * // July 2024 -> FY 2025
 */
export function getFiscalYear(date: Date, offsetMonths: number): number {
  const calendarYear = date.getFullYear()
  const month = date.getMonth() // 0-11

  // If we're past the offset month, we're in the next fiscal year
  if (month >= offsetMonths) {
    return calendarYear + 1
  }

  return calendarYear
}

/**
 * Get the fiscal year for a given calendar year and week
 *
 * @param calendarYear - The calendar year
 * @param calendarWeek - The week number (1-52)
 * @param offsetMonths - Number of months offset from calendar year
 * @returns The fiscal year
 */
export function getFiscalYearFromWeek(
  calendarYear: number,
  calendarWeek: number,
  offsetMonths: number,
): number {
  // Approximate the date from the week number
  const firstDayOfYear = new Date(calendarYear, 0, 1)
  const daysOffset = (calendarWeek - 1) * 7
  const approximateDate = new Date(firstDayOfYear)
  approximateDate.setDate(firstDayOfYear.getDate() + daysOffset)

  return getFiscalYear(approximateDate, offsetMonths)
}

/**
 * Get the fiscal quarter (1-4) for a given calendar week
 *
 * @param calendarWeek - The calendar week number (1-52)
 * @param offsetMonths - Number of months offset from calendar year
 * @returns The fiscal quarter (1-4)
 *
 * @example
 * // If offsetMonths = 0 (calendar year):
 * // Week 1-13 -> Q1, Week 14-26 -> Q2, Week 27-39 -> Q3, Week 40-52 -> Q4
 *
 * // If offsetMonths = 6 (fiscal year starts July):
 * // Week 27-39 -> Q1, Week 40-52 -> Q2, Week 1-13 -> Q3, Week 14-26 -> Q4
 */
export function getFiscalQuarter(calendarWeek: number, offsetMonths: number): number {
  // Calculate offset in weeks (approximately)
  const offsetWeeks = Math.floor((offsetMonths * 52) / 12)

  // Shift the week number by the offset
  let adjustedWeek = calendarWeek - offsetWeeks

  // Wrap around if necessary (weeks are 1-52)
  if (adjustedWeek <= 0) {
    adjustedWeek += 52
  }

  // Determine quarter from adjusted week
  if (adjustedWeek <= 13) return 1
  if (adjustedWeek <= 26) return 2
  if (adjustedWeek <= 39) return 3
  return 4
}

/**
 * Get the calendar week range for a fiscal quarter
 *
 * @param fiscalQuarter - The fiscal quarter (1-4)
 * @param offsetMonths - Number of months offset from calendar year
 * @returns Array of calendar week numbers in that fiscal quarter
 *
 * @example
 * // If offsetMonths = 0 (calendar year):
 * // Q1 -> [1-13], Q2 -> [14-26], Q3 -> [27-39], Q4 -> [40-52]
 *
 * // If offsetMonths = 6 (fiscal year starts July):
 * // Q1 -> [27-39], Q2 -> [40-52], Q3 -> [1-13], Q4 -> [14-26]
 */
export function getCalendarWeeksForFiscalQuarter(
  fiscalQuarter: number,
  offsetMonths: number,
): number[] {
  // Calculate offset in weeks (approximately)
  const offsetWeeks = Math.floor((offsetMonths * 52) / 12)

  // Base weeks for each quarter (calendar year)
  const baseQuarters = [
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], // Q1
    [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26], // Q2
    [27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39], // Q3
    [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52], // Q4
  ]

  // Rotate quarters based on fiscal year offset
  const quarterRotation = Math.floor(offsetWeeks / 13) % 4
  const rotatedQuarterIndex = (fiscalQuarter - 1 + quarterRotation) % 4

  return baseQuarters[rotatedQuarterIndex]
}

/**
 * Get all calendar weeks for a fiscal year
 *
 * @param fiscalYear - The fiscal year
 * @param offsetMonths - Number of months offset from calendar year
 * @returns Object with calendar year ranges and their week numbers
 *
 * @example
 * // If offsetMonths = 6, fiscalYear = 2025:
 * // Returns: { 2024: [27-52], 2025: [1-26] }
 */
export function getCalendarWeeksForFiscalYear(
  fiscalYear: number,
  offsetMonths: number,
): Record<number, number[]> {
  const offsetWeeks = Math.floor((offsetMonths * 52) / 12)

  if (offsetWeeks === 0) {
    // No offset - fiscal year = calendar year
    return {
      [fiscalYear]: Array.from({ length: 52 }, (_, i) => i + 1),
    }
  }

  // Fiscal year spans two calendar years
  const prevCalendarYear = fiscalYear - 1
  const currentCalendarYear = fiscalYear

  // First part: weeks from previous calendar year (from offsetWeek to 52)
  const prevYearWeeks = Array.from({ length: 52 - offsetWeeks + 1 }, (_, i) => offsetWeeks + i)

  // Second part: weeks from current calendar year (from 1 to offsetWeek - 1)
  const currentYearWeeks = Array.from({ length: offsetWeeks - 1 }, (_, i) => i + 1)

  return {
    [prevCalendarYear]: prevYearWeeks,
    [currentCalendarYear]: currentYearWeeks,
  }
}

/**
 * Format a fiscal year for display
 *
 * @param fiscalYear - The fiscal year number
 * @param useFYPrefix - Whether to use "FY" prefix (default: true)
 * @returns Formatted fiscal year string
 *
 * @example
 * formatFiscalYear(2025, true) -> "FY 2025"
 * formatFiscalYear(2025, false) -> "2025"
 */
export function formatFiscalYear(fiscalYear: number, useFYPrefix = true): string {
  return useFYPrefix ? `FY ${fiscalYear}` : `${fiscalYear}`
}

/**
 * Get the current fiscal year and week
 *
 * @param offsetMonths - Number of months offset from calendar year
 * @returns Object with fiscal year and calendar week info
 */
export function getCurrentFiscalYearAndWeek(offsetMonths: number): {
  fiscalYear: number
  calendarYear: number
  calendarWeek: number
} {
  const now = new Date()
  const calendarYear = now.getFullYear()
  const start = new Date(calendarYear, 0, 1)
  const diff = now.getTime() - start.getTime()
  const oneWeek = 1000 * 60 * 60 * 24 * 7
  const calendarWeek = Math.ceil(diff / oneWeek)

  const fiscalYear = getFiscalYear(now, offsetMonths)

  return {
    fiscalYear,
    calendarYear,
    calendarWeek,
  }
}
