/**
 * Round / batch number helpers.
 *
 * A GRN is a batch ("round") named like "JM 01"; its bikes get unit numbers "JM0101", "JM0102" ...
 * People type these in many ways ("jm01", "JM 01", "jm0102"), so searches compare a normalised form.
 */

/** "jm 01" / "JM-01" / "jm01" -> "JM01" */
export function normalizeBatchText(value: string): string {
  return value.replace(/[\s-]+/g, "").toUpperCase()
}

/** True when `query` is empty or matches any of the labels (batch, unit number, ...), ignoring spaces and case. */
export function matchesBatch(query: string, ...labels: Array<string | null | undefined>): boolean {
  const q = normalizeBatchText(query)
  if (!q) return true
  return labels.some((label) => (label ? normalizeBatchText(label).includes(q) : false))
}

/** Batch label of a unit number: "JM0102" -> "JM 01" (null when it does not look like a unit number). */
export function batchOfUnit(unitGrnNumber: string | null | undefined): string | null {
  const match = /^([A-Za-z]+)(\d{2})\d{2}$/.exec(unitGrnNumber ?? "")
  return match ? `${match[1].toUpperCase()} ${match[2]}` : null
}

/** Prisma `where` for vehicles in a batch: matches the batch label ("JM 01") or a unit number prefix ("JM0102"). */
export function batchVehicleWhere(query: string | null | undefined) {
  const q = normalizeBatchText(query ?? "")
  if (!q) return {}
  const label = /^([A-Z]+)(\d{2})$/.exec(q)
  return {
    OR: [
      { unitGrnNumber: { startsWith: q, mode: "insensitive" as const } },
      ...(label ? [{ grn: { grnNumber: { equals: `${label[1]} ${label[2]}`, mode: "insensitive" as const } } }] : []),
      { grn: { grnNumber: { contains: q, mode: "insensitive" as const } } },
    ],
  }
}
