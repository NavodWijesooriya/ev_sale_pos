"use client"

import * as React from "react"
import {
  Wallet,
  Clock3,
  CheckCircle2,
  ArrowRightLeft,
  RotateCcw,
  Search,
  Download,
  Receipt,
  Bike,
  User,
  ShieldAlert,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatLKR } from "@/lib/currency"
import type { AdvancesReportData, AdvancesReportItem } from "@/app/actions/reports"

interface AdvancesReportTabProps {
  data: AdvancesReportData
}

export function AdvancesReportTab({ data }: AdvancesReportTabProps) {
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL")

  const { kpis, advances } = data

  const filteredAdvances = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return advances.filter((adv) => {
      const matchesStatus = statusFilter === "ALL" || adv.status === statusFilter
      if (!matchesStatus) return false

      if (!q) return true
      return (
        adv.customerName.toLowerCase().includes(q) ||
        adv.customerPhone.toLowerCase().includes(q) ||
        adv.customerNic.toLowerCase().includes(q) ||
        adv.allocatedVehicle.toLowerCase().includes(q) ||
        (adv.chassisNumber && adv.chassisNumber.toLowerCase().includes(q)) ||
        (adv.unitGrnNumber && adv.unitGrnNumber.toLowerCase().includes(q)) ||
        (adv.saleInvoiceNumber && adv.saleInvoiceNumber.toLowerCase().includes(q))
      )
    })
  }, [advances, search, statusFilter])

  const exportCSV = () => {
    const headers = [
      "Date",
      "Customer Name",
      "Phone",
      "NIC",
      "Allocated Vehicle",
      "Unit GRN",
      "Chassis Number",
      "Payment Method",
      "Status",
      "Amount (Rs.)",
      "Branch",
      "Staff",
      "Settled Invoice #",
      "Transferred To Customer",
      "Transfer Note",
    ]

    const rows = filteredAdvances.map((a) => {
      const dateStr = new Date(a.advanceDate).toLocaleDateString()
      return [
        `"${dateStr}"`,
        `"${a.customerName}"`,
        `"${a.customerPhone}"`,
        `"${a.customerNic}"`,
        `"${a.allocatedVehicle}"`,
        `"${a.unitGrnNumber || "N/A"}"`,
        `"${a.chassisNumber || "N/A"}"`,
        `"${a.paymentMethod}"`,
        `"${a.status}"`,
        a.amount,
        `"${a.branchName}"`,
        `"${a.staffName}"`,
        `"${a.saleInvoiceNumber || "N/A"}"`,
        `"${a.transferredToCustomer || "N/A"}"`,
        `"${(a.transferredNote || a.notes || "").replace(/"/g, '""')}"`,
      ].join(",")
    })

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `advances_report_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards (Requirement 3) */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {/* 1. Pending / Active */}
        <Card className="rounded-xl border-amber-500/20 bg-amber-500/5 shadow-xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Active / Pending Advances
            </CardTitle>
            <Clock3 className="size-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
              {formatLKR(kpis.totalPendingAmount)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {kpis.pendingCount} active customer bookings
            </p>
          </CardContent>
        </Card>

        {/* 2. Settled in Sales */}
        <Card className="rounded-xl border-emerald-500/20 bg-emerald-500/5 shadow-xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Settled in Sales (Used)
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
              {formatLKR(kpis.totalUsedAmount)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {kpis.usedCount} deposits deducted at checkout
            </p>
          </CardContent>
        </Card>

        {/* 3. Transferred */}
        <Card className="rounded-xl border-blue-500/20 bg-blue-500/5 shadow-xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              Transferred Advances
            </CardTitle>
            <ArrowRightLeft className="size-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold tracking-tight text-blue-700 dark:text-blue-400">
              {formatLKR(kpis.totalTransferredAmount)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {kpis.transferredCount} reallocated to other bikes/buyers
            </p>
          </CardContent>
        </Card>

        {/* 4. Refunded */}
        <Card className="rounded-xl border-slate-500/20 bg-slate-500/5 shadow-xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Refunded Deposits
            </CardTitle>
            <RotateCcw className="size-4 text-slate-600 dark:text-slate-400" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold tracking-tight text-slate-700 dark:text-slate-300">
              {formatLKR(kpis.totalRefundedAmount)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {kpis.refundedCount} canceled &amp; returned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border bg-card/60">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search customer, NIC, vehicle, unit GRN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="bg-muted/80 p-0.5 rounded-lg h-8 text-xs">
              <TabsTrigger value="ALL" className="text-xs px-2.5 py-1">
                All ({advances.length})
              </TabsTrigger>
              <TabsTrigger value="PENDING" className="text-xs px-2.5 py-1">
                Pending ({kpis.pendingCount})
              </TabsTrigger>
              <TabsTrigger value="USED" className="text-xs px-2.5 py-1">
                Used ({kpis.usedCount})
              </TabsTrigger>
              <TabsTrigger value="TRANSFERRED" className="text-xs px-2.5 py-1">
                Transferred ({kpis.transferredCount})
              </TabsTrigger>
              <TabsTrigger value="REFUNDED" className="text-xs px-2.5 py-1">
                Refunded ({kpis.refundedCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="h-8 text-xs gap-1.5"
            disabled={filteredAdvances.length === 0}
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Detailed Advances DataTable */}
      <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/20 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Advance Payment Ledger</CardTitle>
            <Badge variant="secondary" className="font-mono text-xs">
              Showing {filteredAdvances.length} records
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-24">Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Allocated Vehicle / Unit GRN</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount (Rs.)</TableHead>
                  <TableHead>Audit / Transfer Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdvances.map((adv) => {
                  const dateStr = new Date(adv.advanceDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })

                  return (
                    <TableRow key={adv.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {dateStr}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs text-foreground">{adv.customerName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {adv.customerPhone} {adv.customerNic ? `• NIC: ${adv.customerNic}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs text-foreground flex items-center gap-1">
                          <Bike className="size-3 text-muted-foreground shrink-0" />
                          <span>{adv.allocatedVehicle}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {adv.unitGrnNumber && (
                            <Badge variant="outline" className="font-mono text-[10px] font-bold bg-muted/40">
                              {adv.unitGrnNumber}
                            </Badge>
                          )}
                          {adv.chassisNumber && (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              VIN: {adv.chassisNumber}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {adv.paymentMethod}
                      </TableCell>
                      <TableCell>
                        {adv.status === "PENDING" && (
                          <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10 text-xs font-semibold">
                            Pending
                          </Badge>
                        )}
                        {adv.status === "USED" && (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-xs font-semibold">
                            Settled in Sale
                          </Badge>
                        )}
                        {adv.status === "TRANSFERRED" && (
                          <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-500/10 text-xs font-semibold">
                            Transferred
                          </Badge>
                        )}
                        {adv.status === "REFUNDED" && (
                          <Badge variant="secondary" className="text-xs font-semibold">
                            Refunded
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm tabular-nums text-foreground">
                        {formatLKR(adv.amount)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {adv.status === "USED" && adv.saleInvoiceNumber && (
                          <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                            <Receipt className="size-3 shrink-0" />
                            <span>Invoice #{adv.saleInvoiceNumber}</span>
                          </div>
                        )}
                        {adv.status === "TRANSFERRED" && (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-blue-700 dark:text-blue-400 font-medium">
                              <ArrowRightLeft className="size-3 shrink-0" />
                              <span>To: {adv.transferredToCustomer || "Reallocated"}</span>
                            </div>
                            {adv.transferredNote && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                                &quot;{adv.transferredNote}&quot;
                              </p>
                            )}
                          </div>
                        )}
                        {adv.status === "PENDING" && (
                          <span className="text-muted-foreground text-[11px]">
                            {adv.notes || "Available for checkout or transfer"}
                          </span>
                        )}
                        {adv.status === "REFUNDED" && (
                          <span className="text-muted-foreground text-[11px]">
                            {adv.notes || "Refund processed"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}

                {filteredAdvances.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                      No advance records found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
