"use client"

import { Fragment, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Download } from "lucide-react"
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
  vehicles: Array<{
    id: string
    chassisNumber: string
    motorNumber: string | null
    batterySerialNumber: string | null
    unitGrnNumber: string | null
  }>
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
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  // The export below uses exactly the rows shown on screen.
  const grns = useMemo(
    () => allGrns.filter((grn) => matchesBatch(search, grn.grnNumber, grn.orderNumber, grn.transportRefNumber, grn.branch.name)),
    [allGrns, search],
  )

  function exportToCsv() {
    const rows = [
      ["GRN Number", "Date", "Showroom", "Order Number", "Transport Cost", "Chassis Numbers", "Battery Serial Numbers"],
      ...grns.map((grn) => [
        grn.grnNumber,
        new Date(grn.date).toISOString().slice(0, 10),
        grn.branch.name,
        grn.orderNumber ?? "",
        grn.transportCost == null ? "" : String(grn.transportCost),
        grn.vehicles.map((vehicle) => vehicle.chassisNumber).join("; "),
        grn.vehicles.map((vehicle) => vehicle.batterySerialNumber ?? "").join("; "),
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
              <Fragment key={grn.id}>
              <TableRow>
                <TableCell className="font-mono font-semibold">{grn.grnNumber}</TableCell>
                <TableCell>{new Date(grn.date).toLocaleDateString()}</TableCell>
                <TableCell>{grn.branch.name}</TableCell>
                <TableCell>{grn.transportRefNumber || "—"}</TableCell>
                <TableCell>{grn.orderNumber || "—"}</TableCell>
                <TableCell className="text-right">
                  {grn.transportCost == null ? "—" : grn.transportCost.toLocaleString("en-LK", { style: "currency", currency: "LKR" })}
                </TableCell>
                <TableCell className="text-right">
                  <button
                    type="button"
                    onClick={() => toggle(grn.id)}
                    aria-expanded={open.has(grn.id)}
                    aria-label={`Show bikes in ${grn.grnNumber}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {Math.max(grn._count.vehicles, grn._count.items)}
                    {open.has(grn.id) ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </button>
                </TableCell>
              </TableRow>
              {open.has(grn.id) && (
                <TableRow>
                  <TableCell colSpan={7} className="bg-muted/30">
                    <table className="w-full text-xs" aria-label={`Bikes in ${grn.grnNumber}`}>
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="py-1 pr-4 font-medium">Unit</th>
                          <th className="py-1 pr-4 font-medium">Chassis number</th>
                          <th className="py-1 pr-4 font-medium">Motor number</th>
                          <th className="py-1 font-medium">Battery serial</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grn.vehicles.map((vehicle) => (
                          <tr key={vehicle.id} className="font-mono">
                            <td className="py-1 pr-4">{vehicle.unitGrnNumber || "—"}</td>
                            <td className="py-1 pr-4">{vehicle.chassisNumber}</td>
                            <td className="py-1 pr-4">{vehicle.motorNumber || "—"}</td>
                            <td className="py-1">{vehicle.batterySerialNumber || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableCell>
                </TableRow>
              )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
