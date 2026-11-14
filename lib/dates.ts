/**
 * Business-day helpers for Sri Lanka (Asia/Colombo, UTC+05:30, no DST).
 *
 * Servers (e.g. Vercel) run in UTC, so `new Date(y, m, d)` / `getDate()` put a
 * sale made at 02:00 Colombo time on the previous day. Reports must bucket by
 * the Colombo calendar day instead.
 */

const COLOMBO_OFFSET_MS = 5.5 * 60 * 60 * 1000

export interface CalendarParts {
  year: number
  month: number // 0-11
  day: number // 1-31
}

/** Calendar date of an instant, as seen in Colombo. */
export function colomboParts(date: Date): CalendarParts {
  const shifted = new Date(date.getTime() + COLOMBO_OFFSET_MS)
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate() }
}

/** "YYYY-MM-DD" in Colombo. */
export function colomboDateKey(date: Date): string {
  const { year, month, day } = colomboParts(date)
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** "YYYY-MM" in Colombo. */
export function colomboMonthKey(date: Date): string {
  return colomboDateKey(date).slice(0, 7)
}

/** Inclusive instant range covering one Colombo calendar day. `day` may overflow (day 0 = last of previous month). */
export function colomboDayRange(year: number, month: number, day: number) {
  const start = new Date(Date.UTC(year, month, day) - COLOMBO_OFFSET_MS)
  const end = new Date(Date.UTC(year, month, day + 1) - COLOMBO_OFFSET_MS - 1)
  return { start, end }
}

/** Parses "YYYY-MM-DD"; returns null when malformed or not a real date. */
export function parseDateKey(value: string | undefined | null): CalendarParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "")
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])]
  const check = new Date(Date.UTC(year, month, day))
  return check.getUTCFullYear() === year && check.getUTCMonth() === month && check.getUTCDate() === day
    ? { year, month, day }
    : null
}

/** Parses "YYYY-MM"; returns null when malformed. */
export function parseMonthKey(value: string | undefined | null): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "")
  if (!match) return null
  const month = Number(match[2]) - 1
  return month >= 0 && month <= 11 ? { year: Number(match[1]), month } : null
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

/** Short month label such as "Nov 2026" for a year/month pair. */
export function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}
