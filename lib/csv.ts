/**
 * CSV export helpers shared by every report.
 *
 * - RFC 4180 quoting (commas, quotes and line breaks inside values stay in their cell)
 * - UTF-8 BOM so Excel opens Sinhala / Tamil text and the Rs. sign correctly
 * - spreadsheet formula-injection guard for text cells (=, +, -, @ at the start)
 * - downloads through a Blob, not a data: URL, so a "#" in a value cannot truncate the file
 */

export type CsvCell = string | number | boolean | null | undefined

function cellToText(value: CsvCell): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : ""
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE"
  // Text starting with a formula character would be executed by Excel / Sheets: defuse it.
  const guarded = /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value
  return `"${guarded.replaceAll('"', '""')}"`
}

/** Builds CSV text (with BOM and CRLF line endings) from rows of cells. */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<CsvCell>>): string {
  return `﻿${rows.map((row) => row.map(cellToText).join(",")).join("\r\n")}`
}

/** Triggers a browser download of the rows as a .csv file. */
export function downloadCsv(filename: string, rows: ReadonlyArray<ReadonlyArray<CsvCell>>) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
