"use client"

import { CancelledBadge, ShowCancelledToggle } from "@/components/sales/cancelled-badge"
import * as React from "react"
import { batchOfUnit, matchesBatch } from "@/lib/batch"
import { Download, Eye, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatLKR } from "@/lib/currency"
import { downloadCsv } from "@/lib/csv"
import { colomboDateKey } from "@/lib/dates"
import { emptyDateFilter, isDateFilterActive, matchesDateFilter, type DateFilter } from "@/lib/date-filter"
import { DateFilterFields } from "@/components/shared/date-filter-fields"
import {

  InvoiceDialog,
  type SalesHistoryInvoice,
} from "@/components/sales/history/invoice-dialog"

interface SalesHistoryTableProps {
  sales: SalesHistoryInvoice[]
}

const modelOf = (sale: SalesHistoryInvoice) =>
  sale.items.map(({ vehicle }) => `${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.modelName}`).join(", ")

export function SalesHistoryTable({ sales }: SalesHistoryTableProps) {
  const [query, setQuery] = React.useState("")
  const [dates, setDates] = React.useState<DateFilter>(emptyDateFilter)
  const [showCancelled, setShowCancelled] = React.useState(true)
  const [selectedSale, setSelectedSale] = React.useState<SalesHistoryInvoice | null>(null)

  const filteredSales = React.useMemo(() => {
    const search = query.trim().toLocaleLowerCase()
    return sales.filter((sale) => {
      if (!showCancelled && sale.status === "CANCELLED") return false
      if (!matchesDateFilter(sale.saleDate, dates)) return false
      if (!search) return true
      const vehicleText = sale.items
        .map(({ vehicle }) => `${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.modelName} ${vehicle.chassisNumber}`)
        .join(" ")
        .toLocaleLowerCase()
      return (
        sale.invoiceNumber.toLocaleLowerCase().includes(search) ||
        sale.customer.name.toLocaleLowerCase().includes(search) ||
        vehicleText.includes(search) ||
        // round / batch or unit number: "JM 01", "jm01", "JM0102"
        sale.items.some(({ vehicle }) => matchesBatch(search, vehicle.unitGrnNumber, batchOfUnit(vehicle.unitGrnNumber)))
      )
    })
  }, [query, dates, sales, showCancelled])
  const cancelledCount = sales.filter((sale) => sale.status === "CANCELLED").length

  // The export is exactly what the table shows: same search, same dates.
  function exportCsv() {
    const rows = [
      ["Invoice No", "Status", "Date", "Customer", "Bike Model", "Chassis No", "Total (Rs.)", "Advance Deducted (Rs.)", "Payment Method"],
      ...filteredSales.map((sale) => [
        sale.invoiceNumber,
        sale.status === "CANCELLED" ? "CANCELLED" : "Completed",
        colomboDateKey(new Date(sale.saleDate)),
        sale.customer.name,
        modelOf(sale),
        sale.items.map(({ vehicle }) => vehicle.chassisNumber).join(", "),
        sale.totalAmount,
        sale.advancePayment?.amount ?? 0,
        sale.paymentMethod ?? "",
      ]),
    ]
    const range = dates.date || [dates.from, dates.to].filter(Boolean).join("_to_")
    downloadCsv(`sales-history${range ? `_${range}` : ""}`, rows)
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search sales history"
                className="pl-9"
                placeholder="Search invoice, customer, or vehicle..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <DateFilterFields value={dates} onChange={setDates} idPrefix="sales-history" />
            <ShowCancelledToggle checked={showCancelled} onChange={setShowCancelled} count={cancelledCount} />
          </div>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={exportCsv}
            disabled={filteredSales.length === 0}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Invoice No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Bike Model</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Advance Deducted</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length ? (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id} className={sale.status === "CANCELLED" ? "bg-red-500/5" : undefined}>
                    <TableCell className="font-medium">
                      {sale.invoiceNumber}
                      {sale.status === "CANCELLED" && (
                        <CancelledBadge type={sale.cancelType} reason={sale.cancelReason} className="mt-1 block" />
                      )}
                    </TableCell>
                    <TableCell data-testid="sale-date">{colomboDateKey(new Date(sale.saleDate))}</TableCell>
                    <TableCell>{sale.customer.name}</TableCell>
                    <TableCell className="max-w-56">
                      {sale.items.map(({ vehicle }) => (
                        <div key={vehicle.chassisNumber} className="truncate">
                          <span data-testid="sale-model">
                            {vehicle.vehicleModel.brand} {vehicle.vehicleModel.modelName}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">{vehicle.chassisNumber}</span>
                        </div>
                      ))}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatLKR(sale.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {sale.advancePayment?.amount
                        ? `− ${formatLKR(sale.advancePayment.amount)}`
                        : "—"}
                    </TableCell>
                    <TableCell>{sale.paymentMethod || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => setSelectedSale(sale)}
                      >
                        <Eye className="size-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                    {sales.length
                      ? isDateFilterActive(dates) || query.trim()
                        ? "No sales match your search or dates."
                        : "No sales match your search."
                      : "No sales have been recorded yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <InvoiceDialog
        sale={selectedSale}
        open={Boolean(selectedSale)}
        onOpenChange={(open) => {
          if (!open) setSelectedSale(null)
        }}
      />
    </>
  )
}
