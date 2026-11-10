"use client"

import * as React from "react"
import { Search } from "lucide-react"
import type {
  AdvancePaymentRecord,
  AdvanceRefundRecord,
} from "@/app/actions/advances"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatLKR } from "@/lib/currency"

type AdvanceStatusFilter = "ALL" | AdvancePaymentRecord["status"]

function getStatusStyle(status: AdvancePaymentRecord["status"]) {
  switch (status) {
    case "PENDING":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400"
    case "USED":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    case "REFUNDED":
    case "TRANSFERRED":
      return "border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-300"
  }
}

export function AdvanceReportsTable({ advances }: { advances: AdvancePaymentRecord[] }) {
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<AdvanceStatusFilter>("ALL")

  const filteredAdvances = React.useMemo(() => {
    const search = query.trim().toLocaleLowerCase()
    return advances.filter((advance) => {
      const matchesStatus = status === "ALL" || advance.status === status
      const matchesSearch =
        !search ||
        advance.customerName.toLocaleLowerCase().includes(search) ||
        advance.nicNumber.toLocaleLowerCase().includes(search) ||
        advance.bikeModel.toLocaleLowerCase().includes(search) ||
        advance.paymentDetails.toLocaleLowerCase().includes(search)
      return matchesStatus && matchesSearch
    })
  }, [advances, query, status])

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search advance report"
            className="pl-9"
            placeholder="Search customer, NIC, model, or note..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            if (value === "ALL" || value === "PENDING" || value === "USED" || value === "REFUNDED" || value === "TRANSFERRED") {
              setStatus(value)
            }
          }}
        >
          <SelectTrigger aria-label="Filter advance reports by status" className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="USED">Used</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
            <SelectItem value="TRANSFERRED">Transferred</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAdvances.length ? (
              filteredAdvances.map((advance) => (
                <TableRow key={advance.id}>
                  <TableCell>
                    {new Date(advance.advanceDate).toLocaleDateString("en-LK", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{advance.customerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {advance.nicNumber} · {advance.bikeModel}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatLKR(advance.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusStyle(advance.status)}>
                      {advance.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-sm whitespace-normal text-muted-foreground">
                    {advance.paymentDetails || "—"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                  {advances.length
                    ? "No advance payments match these filters."
                    : "No advance payments have been recorded yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

export function AdvanceRefundsTable({ refunds }: { refunds: AdvanceRefundRecord[] }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Customer Name</TableHead>
            <TableHead>NIC</TableHead>
            <TableHead className="text-right">Refunded Amount</TableHead>
            <TableHead>Original Date</TableHead>
            <TableHead>Last Updated (Refund Date)</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {refunds.length ? (
            refunds.map((refund) => (
              <TableRow key={refund.id}>
                <TableCell className="font-medium">{refund.customerName}</TableCell>
                <TableCell>{refund.nicNumber}</TableCell>
                <TableCell className="text-right font-medium tabular-nums text-destructive">
                  {formatLKR(refund.amount)}
                </TableCell>
                <TableCell>
                  {new Date(refund.advanceDate).toLocaleDateString("en-LK", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </TableCell>
                <TableCell>
                  {refund.refundDate
                    ? new Date(refund.refundDate).toLocaleDateString("en-LK", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })
                    : "—"}
                </TableCell>
                <TableCell className="max-w-sm whitespace-normal text-muted-foreground">
                  {refund.notes || "—"}
                  {refund.paymentMethod && (
                    <span className="mt-1 block text-xs">
                      Refund method: {refund.paymentMethod}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                No refunded advance payments have been recorded.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
