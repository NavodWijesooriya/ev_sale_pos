import { colomboDateKey, parseDateKey } from "@/lib/dates"

/**
 * Date filter shared by the sales history and the advance reports: either one day (`date`)
 * or an inclusive range (`from` and/or `to`). All values are "YYYY-MM-DD" or "".
 */
export interface DateFilter {
  date: string
  from: string
  to: string
}

export const emptyDateFilter: DateFilter = { date: "", from: "", to: "" }

export function isDateFilterActive(filter: DateFilter): boolean {
  return Boolean(filter.date || filter.from || filter.to)
}

/** A message when the range is back to front; null when the filter can be applied. */
export function dateFilterError(filter: DateFilter): string | null {
  if (!filter.date && filter.from && filter.to && filter.from > filter.to) {
    return "The From date must be on or before the To date."
  }
  return null
}

/**
 * True when `value` falls on the selected day / inside the range.
 * Sale times are bucketed by the Colombo calendar day; advance dates are plain dates stored at UTC
 * midnight, so they are compared as that stored date (`zone: "utc"`).
 */
export function matchesDateFilter(
  value: Date | string,
  filter: DateFilter,
  zone: "colombo" | "utc" = "colombo",
): boolean {
  if (!isDateFilterActive(filter)) return true
  if (dateFilterError(filter)) return false
  const instant = new Date(value)
  if (Number.isNaN(instant.getTime())) return false
  const key = zone === "utc" ? instant.toISOString().slice(0, 10) : colomboDateKey(instant)
  if (filter.date) return parseDateKey(filter.date) ? key === filter.date : true
  if (filter.from && key < filter.from) return false
  if (filter.to && key > filter.to) return false
  return true
}
