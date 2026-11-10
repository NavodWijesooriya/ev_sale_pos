"use client"

import * as React from "react"
import { Eye, Search } from "lucide-react"
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
import {
  InvoiceDialog,
  type SalesHistoryInvoice,
} from "@/components/sales/history/invoice-dialog"

interface SalesHistoryTableProps {
  sales: SalesHistoryInvoice[]
}

export function SalesHistoryTable({ sales }: SalesHistoryTableProps) {
  const [query, setQuery] = React.useState("")
  const [selectedSale, setSelectedSale] = React.useState<SalesHistoryInvoice | null>(null)

  const filteredSales = React.useMemo(() => {
    const search = query.trim().toLocaleLowerCase()
    if (!search) return sales
    return sales.filter((sale) => {
      const vehicleText = sale.items
        .map(({ vehicle }) => `${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.modelName} ${vehicle.chassisNumber}`)
        .join(" ")
        .toLocaleLowerCase()
      return (
        sale.invoiceNumber.toLocaleLowerCase().includes(search) ||
        sale.customer.name.toLocaleLowerCase().includes(search) ||
        vehicleText.includes(search)
      )
    })
  }, [query, sales])

  return (
    <>
      <div className="space-y-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search sales history"
            className="pl-9"
            placeholder="Search invoice, customer, or vehicle..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Invoice No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Advance Deducted</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length ? (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                    <TableCell>
                      {new Date(sale.saleDate).toLocaleDateString("en-LK")}
                    </TableCell>
                    <TableCell>{sale.customer.name}</TableCell>
                    <TableCell className="max-w-56">
                      {sale.items.map(({ vehicle }) => (
                        <div key={vehicle.chassisNumber} className="truncate">
                          {vehicle.vehicleModel.brand} {vehicle.vehicleModel.modelName}
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
                    {sales.length ? "No sales match your search." : "No sales have been recorded yet."}
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
