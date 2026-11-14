"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  Calendar as CalendarIcon,
  Filter,
  Landmark,
  ShieldCheck,
  Coins,
  Receipt,
  RotateCcw,
  User,
  Bike,
  Download,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import type { CommissionReportData } from "@/app/actions/finance-reports"

interface CommissionReportsViewProps {
  initialData: CommissionReportData
  initialFrom?: string
  initialTo?: string
  initialStaff?: string
}

export function CommissionReportsView({
  initialData,
  initialFrom = "",
  initialTo = "",
  initialStaff = "",
}: CommissionReportsViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [from, setFrom] = React.useState(initialFrom)
  const [to, setTo] = React.useState(initialTo)
  const [staff, setStaff] = React.useState(initialStaff || "ALL")
  const [isPending, startTransition] = React.useTransition()

  // Sync state if URL search parameters change externally
  React.useEffect(() => {
    setFrom(searchParams.get("from") || "")
    setTo(searchParams.get("to") || "")
    setStaff(searchParams.get("staff") || "ALL")
  }, [searchParams])

  function updateFilters(newFrom: string, newTo: string, newStaff: string) {
    const params = new URLSearchParams()
    if (newFrom) params.set("from", newFrom)
    if (newTo) params.set("to", newTo)
    if (newStaff && newStaff !== "ALL") params.set("staff", newStaff)

    startTransition(() => {
      const query = params.toString()
      router.push(query ? `${pathname}?${query}` : pathname)
    })
  }

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateFilters(from, to, staff)
  }

  function handleReset() {
    setFrom("")
    setTo("")
    setStaff("ALL")
    updateFilters("", "", "ALL")
  }

  function setPreset(days: number) {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)

    const fromStr = start.toISOString().split("T")[0]
    const toStr = end.toISOString().split("T")[0]

    setFrom(fromStr)
    setTo(toStr)
    updateFilters(fromStr, toStr, staff)
  }

  function setThisMonth() {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const fromStr = start.toISOString().split("T")[0]
    const toStr = end.toISOString().split("T")[0]

    setFrom(fromStr)
    setTo(toStr)
    updateFilters(fromStr, toStr, staff)
  }

  function exportCSV() {
    const headers = [
      "Date",
      "Invoice Number",
      "Customer Name",
      "Customer Phone",
      "Vehicle Model",
      "Unit GRN / Chassis",
      "Finance Company",
      "Finance Amount (Rs.)",
      "Commission Basis",
      "Commission Rate",
      "Commission Recipient",
      "Finance Commission (Rs.)",
      "Insurance Company",
      "Insurance Commission (Rs.)",
      "Total Commission (Rs.)",
    ]

    const rows = sales.map((sale) => {
      const saleDateFormatted = new Date(sale.saleDate).toISOString().split("T")[0]
      const vehicleDesc = sale.vehicle
        ? `${sale.vehicle.brand} ${sale.vehicle.modelName}`
        : "N/A"
      const unitGrnOrChassis = sale.vehicle
        ? sale.vehicle.unitGrnNumber || sale.vehicle.chassisNumber
        : "N/A"
      const recipient = sale.commissionRecipient?.name || sale.soldBy?.name || "Unassigned"
      const fComm = sale.financeCommission || 0
      const iComm = sale.insuranceCommission || 0
      const totalComm = fComm + iComm
      const basisLabel =
        sale.commissionBasis === "VEHICLE_PRICE"
          ? "% of Vehicle Price"
          : sale.commissionBasis === "FIXED"
          ? "Fixed Amount"
          : "% of Finance Amount"

      return [
        saleDateFormatted,
        `"${sale.invoiceNumber}"`,
        `"${sale.customer.name}"`,
        `"${sale.customer.phone}"`,
        `"${vehicleDesc}"`,
        `"${unitGrnOrChassis}"`,
        `"${sale.financeCompany?.name || "N/A"}"`,
        sale.financeAmount || 0,
        `"${basisLabel}"`,
        sale.commissionRate || 0,
        `"${recipient}"`,
        fComm,
        `"${sale.insuranceCompany?.name || "N/A"}"`,
        iComm,
        totalComm,
      ].join(",")
    })

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `commissions_report_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const {
    totalFinanceAmount = 0,
    totalFinanceCommission,
    totalInsuranceCommission,
    overallTotal,
    totalSalesCount,
    staffOptions = [],
    sales = [],
  } = initialData

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Finance & Insurance
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Commission Reports</h1>
          <p className="text-sm text-muted-foreground">
            Track and reconcile all dealership commissions earned from vehicle financing and insurance policies.
          </p>
        </div>

        {/* Date & Staff Filter */}
        <form
          onSubmit={handleFilterSubmit}
          className="flex flex-wrap items-center gap-2 rounded-xl border bg-card/60 p-2 shadow-xs backdrop-blur-xs"
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarIcon className="size-3.5 text-primary ml-1" />
            <span className="font-medium">From:</span>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 w-34 text-xs bg-background"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium">To:</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 w-34 text-xs bg-background"
            />
          </div>

          {/* Staff Filter Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="size-3.5 text-primary ml-1" />
            <Select value={staff} onValueChange={(val) => setStaff(val || "ALL")}>
              <SelectTrigger className="h-8 w-36 text-xs bg-background">
                <SelectValue placeholder="All Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Staff / Owners</SelectItem>
                {staffOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.name} ({opt.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" size="sm" variant="default" className="h-8 text-xs gap-1.5" disabled={isPending}>
            <Filter className="size-3.5" />
            {isPending ? "Filtering..." : "Apply"}
          </Button>

          {(from || to || staff !== "ALL") && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
              onClick={handleReset}
              disabled={isPending}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={exportCSV}
            disabled={sales.length === 0}
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </form>
      </div>

      {/* Quick Filter Presets */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground mr-1">Quick presets:</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs"
          onClick={() => setPreset(7)}
          disabled={isPending}
        >
          Last 7 Days
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs"
          onClick={() => setPreset(30)}
          disabled={isPending}
        >
          Last 30 Days
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs"
          onClick={setThisMonth}
          disabled={isPending}
        >
          This Month
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2.5 text-xs text-muted-foreground"
          onClick={handleReset}
          disabled={isPending}
        >
          Clear Filter
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Finance Volume */}
        <Card className="rounded-2xl border-blue-500/20 bg-blue-500/5 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Finance Loan Volume
            </CardTitle>
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Landmark className="size-4.5" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatLKR(totalFinanceAmount)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Total vehicle finance loan principal
            </p>
          </CardContent>
        </Card>

        {/* Total Finance Commissions */}
        <Card className="rounded-2xl border-border/70 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Finance Commissions
            </CardTitle>
            <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Coins className="size-4.5" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatLKR(totalFinanceCommission)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              From partner financing institutions
            </p>
          </CardContent>
        </Card>

        {/* Total Insurance Commissions */}
        <Card className="rounded-2xl border-border/70 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Insurance Commissions
            </CardTitle>
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-4.5" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatLKR(totalInsuranceCommission)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              From vehicle insurance issuances
            </p>
          </CardContent>
        </Card>

        {/* Total Commission Summary */}
        <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              Total Commission Value
            </CardTitle>
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Coins className="size-4.5" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-primary">
              {formatLKR(overallTotal)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Total commission value earned
            </p>
          </CardContent>
        </Card>

        {/* Total Sales with Commission */}
        <Card className="rounded-2xl border-border/70 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Commission Deals
            </CardTitle>
            <span className="flex size-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Receipt className="size-4.5" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {totalSalesCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Qualifying vehicle sales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Breakdown DataTable */}
      <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold">Commission Records Breakdown</CardTitle>
              <CardDescription>
                {sales.length} {sales.length === 1 ? "record" : "records"} found with commission value
              </CardDescription>
            </div>
            {(from || to || (staff && staff !== "ALL")) && (
              <div className="flex items-center gap-2">
                {staff && staff !== "ALL" && (
                  <Badge variant="outline" className="text-xs">
                    Staff: {staffOptions.find((s) => s.id === staff)?.name || "Filtered"}
                  </Badge>
                )}
                {(from || to) && (
                  <Badge variant="secondary" className="text-xs font-mono">
                    {from || "Start"} → {to || "Today"}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-24">Date</TableHead>
                  <TableHead className="w-28">Invoice #</TableHead>
                  <TableHead>Vehicle &amp; Unit GRN</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Finance Co.</TableHead>
                  <TableHead className="text-right">Finance Amount</TableHead>
                  <TableHead>Basis &amp; Rate</TableHead>
                  <TableHead>Recipient (Staff/Owner)</TableHead>
                  <TableHead className="text-right">Finance Comm.</TableHead>
                  <TableHead className="text-right">Ins. Comm.</TableHead>
                  <TableHead className="text-right font-bold text-foreground">Total Comm. (Rs.)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => {
                  const saleDateFormatted = new Date(sale.saleDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })

                  const fComm = sale.financeCommission || 0
                  const iComm = sale.insuranceCommission || 0
                  const totalComm = fComm + iComm
                  const recipient = sale.commissionRecipient?.name || sale.soldBy?.name || "Unassigned"

                  return (
                    <TableRow key={sale.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {saleDateFormatted}
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Receipt className="size-3.5 text-muted-foreground shrink-0" />
                          <span>{sale.invoiceNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {sale.vehicle ? (
                          <div>
                            <div className="font-medium text-xs text-foreground flex items-center gap-1">
                              <Bike className="size-3 text-muted-foreground" />
                              {sale.vehicle.brand} {sale.vehicle.modelName}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {sale.vehicle.unitGrnNumber ? (
                                <Badge variant="outline" className="font-mono text-[10px] font-bold bg-muted/40">
                                  {sale.vehicle.unitGrnNumber}
                                </Badge>
                              ) : null}
                              <span className="font-mono text-[10px] text-muted-foreground">
                                VIN: {sale.vehicle.chassisNumber}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">General Sale</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs text-foreground">{sale.customer.name}</div>
                        <div className="text-[11px] text-muted-foreground">{sale.customer.phone}</div>
                      </TableCell>
                      <TableCell>
                        {sale.financeCompany ? (
                          <Badge variant="outline" className="text-xs font-medium">
                            {sale.financeCompany.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs font-medium">
                        {sale.financeAmount > 0 ? (
                          <span className="font-semibold text-foreground">
                            {formatLKR(sale.financeAmount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sale.financeCompany || sale.financeAmount > 0 || fComm > 0 ? (
                          <div className="space-y-0.5">
                            <Badge variant="outline" className="text-[10px] font-semibold bg-muted/40 whitespace-nowrap">
                              {sale.commissionBasis === "VEHICLE_PRICE"
                                ? "% of Vehicle"
                                : sale.commissionBasis === "FIXED"
                                ? "Fixed Amount"
                                : "% of Finance"}
                            </Badge>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {sale.commissionBasis === "FIXED"
                                ? formatLKR(sale.commissionRate || 0)
                                : `${sale.commissionRate || 0}%`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                          <User className="size-3 text-primary shrink-0" />
                          <span>{recipient}</span>
                        </div>
                        {sale.commissionRecipient?.role ? (
                          <span className="text-[10px] text-muted-foreground">
                            ({sale.commissionRecipient.role})
                          </span>
                        ) : sale.soldBy ? (
                          <span className="text-[10px] text-muted-foreground">
                            (Sold by)
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {fComm > 0 ? (
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {formatLKR(fComm)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {iComm > 0 ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatLKR(iComm)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs font-bold text-primary">
                        {totalComm > 0 ? formatLKR(totalComm) : "-"}
                      </TableCell>
                    </TableRow>
                  )
                })}

                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="h-32 text-center text-sm text-muted-foreground">
                      No commission records found matching the selected filters.
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
