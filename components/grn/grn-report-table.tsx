"use client"

import { useMemo, useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { matchesBatch } from "@/lib/batch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface GRNReportRow {
  id: string
  grnNumber: string
  date: Date | string
  branch: { name: string }
  orderNumber: string | null
  transportCost: number | null
  transportRefNumber: string | null
  _count: { vehicles: number; items: number }
}

interface GRNReportTableProps {
  grns: GRNReportRow[]
}

function escapeCsvValue(value: string) {
  const safeValue = /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safeValue.replaceAll('"', '""')}"`
}

export function GRNReportTable({ grns: allGrns }: GRNReportTableProps) {
  const [search, setSearch] = useState("")
  // The export below uses exactly the rows shown on screen.
  const grns = useMemo(
    () => allGrns.filter((grn) => matchesBatch(search, grn.grnNumber, grn.orderNumber, grn.transportRefNumber, grn.branch.name)),
    [allGrns, search],
  )

  function exportToCsv() {
    const rows = [
      ["GRN Number", "Date", "Showroom", "Order Number", "Transport Cost"],
      ...grns.map((grn) => [
        grn.grnNumber,
        new Date(grn.date).toISOString().slice(0, 10),
        grn.branch.name,
        grn.orderNumber ?? "",
        grn.transportCost == null ? "" : String(grn.transportCost),
      ]),
    ]
    const csv = `\uFEFF${rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n")}`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `grn-report-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search round / batch (e.g. JM 01), order or showroom..."
          aria-label="Search GRNs by round or batch number"
          className="max-w-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={exportToCsv} disabled={grns.length === 0}>
          <Download />
          Export to Excel
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>GRN Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Showroom</TableHead>
              <TableHead>Transport Ref.</TableHead>
              <TableHead>Order Number</TableHead>
              <TableHead className="text-right">Transport Cost</TableHead>
              <TableHead className="text-right">Bikes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                  {search.trim() ? "No GRNs match this search." : "No GRNs have been created yet."}
                </TableCell>
              </TableRow>
            ) : grns.map((grn) => (
              <TableRow key={grn.id}>
                <TableCell className="font-mono font-semibold">{grn.grnNumber}</TableCell>
                <TableCell>{new Date(grn.date).toLocaleDateString()}</TableCell>
                <TableCell>{grn.branch.name}</TableCell>
                <TableCell>{grn.transportRefNumber || "—"}</TableCell>
                <TableCell>{grn.orderNumber || "—"}</TableCell>
                <TableCell className="text-right">
                  {grn.transportCost == null ? "—" : grn.transportCost.toLocaleString("en-LK", { style: "currency", currency: "LKR" })}
                </TableCell>
                <TableCell className="text-right">{Math.max(grn._count.vehicles, grn._count.items)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
