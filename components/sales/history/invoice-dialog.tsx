"use client"

import * as React from "react"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatLKR } from "@/lib/currency"

export interface SalesHistoryInvoice {
  id: string
  invoiceNumber: string
  saleDate: Date | string
  totalAmount: number
  paymentMethod: string | null
  customer: { name: string }
  advancePayment: { amount: number } | null
  items: Array<{
    vehicle: {
      chassisNumber: string
      unitGrnNumber?: string | null
      vehicleModel: { brand: string; modelName: string }
    }
  }>
}

interface InvoiceDialogProps {
  sale: SalesHistoryInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvoiceDialog({ sale, open, onOpenChange }: InvoiceDialogProps) {
  const vehicles = sale?.items.map(({ vehicle }) =>
    `${vehicle.unitGrnNumber ? `[${vehicle.unitGrnNumber}] ` : ""}${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.modelName} · ${vehicle.chassisNumber}`,
  ) ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invoice details</DialogTitle>
          <DialogDescription>
            {sale?.invoiceNumber ?? "Review the selected sale before opening its printable invoice."}
          </DialogDescription>
        </DialogHeader>
        {sale && (
          <div className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Date</dt>
                <dd className="font-medium">
                  {new Date(sale.saleDate).toLocaleDateString("en-LK")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Customer</dt>
                <dd className="font-medium">{sale.customer.name}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Vehicle</dt>
                <dd className="space-y-1 font-medium">
                  {vehicles.length
                    ? vehicles.map((vehicle) => <div key={vehicle}>{vehicle}</div>)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Payment method</dt>
                <dd className="font-medium">{sale.paymentMethod || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Advance deducted</dt>
                <dd className="font-medium text-muted-foreground">
                  {sale.advancePayment?.amount
                    ? `− ${formatLKR(sale.advancePayment.amount)}`
                    : "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Final total</dt>
                <dd className="text-xl font-bold">{formatLKR(sale.totalAmount)}</dd>
              </div>
            </dl>
            <div className="flex justify-end">
              <Button
                render={<a href={`/dashboard/sales/${sale.id}/invoice`} />}
                className="gap-2"
              >
                Open printable invoice
                <ExternalLink className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
