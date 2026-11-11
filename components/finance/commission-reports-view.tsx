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
import { formatLKR } from "@/lib/currency"
import type { CommissionReportData } from "@/app/actions/finance-reports"

interface CommissionReportsViewProps {
  initialData: CommissionReportData
  initialFrom?: string
  initialTo?: string
}

export function CommissionReportsView({
  initialData,
  initialFrom = "",
  initialTo = "",
}: CommissionReportsViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [from, setFrom] = React.useState(initialFrom)
  const [to, setTo] = React.useState(initialTo)
  const [isPending, startTransition] = React.useTransition()

  // Sync state if URL search parameters change externally
  React.useEffect(() => {
    setFrom(searchParams.get("from") || "")
    setTo(searchParams.get("to") || "")
  }, [searchParams])

  function updateDateParams(newFrom: string, newTo: string) {
    const params = new URLSearchParams()
    if (newFrom) params.set("from", newFrom)
    if (newTo) params.set("to", newTo)

    startTransition(() => {
      const query = params.toString()
      router.push(query ? `${pathname}?${query}` : pathname)
    })
  }

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateDateParams(from, to)
  }

  function handleReset() {
    setFrom("")
    setTo("")
    updateDateParams("", "")
  }

  function setPreset(days: number) {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)

    const fromStr = start.toISOString().split("T")[0]
    const toStr = end.toISOString().split("T")[0]

    setFrom(fromStr)
    setTo(toStr)
    updateDateParams(fromStr, toStr)
  }

  function setThisMonth() {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const fromStr = start.toISOString().split("T")[0]
    const toStr = end.toISOString().split("T")[0]

    setFrom(fromStr)
    setTo(toStr)
    updateDateParams(fromStr, toStr)
  }

  const { totalFinanceCommission, totalInsuranceCommission, overallTotal, sales } = initialData

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

        {/* Date Filter */}
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

          <Button type="submit" size="sm" variant="default" className="h-8 text-xs gap-1.5" disabled={isPending}>
            <Filter className="size-3.5" />
            {isPending ? "Filtering..." : "Apply"}
          </Button>

          {(from || to) && (
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Finance Commissions */}
        <Card className="rounded-2xl border-border/70 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Finance Commissions
            </CardTitle>
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Landmark className="size-4.5" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatLKR(totalFinanceCommission)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Total fees from partner financing lenders
            </p>
          </CardContent>
        </Card>

        {/* Total Insurance Commissions */}
        <Card className="rounded-2xl border-border/70 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Insurance Commissions
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
              Total fees from vehicle insurance policy issuances
            </p>
          </CardContent>
        </Card>

        {/* Overall Total Commissions */}
        <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-sm transition-all hover:shadow-md sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              Overall Total Commissions
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
              Combined revenue earned across all sales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Breakdown DataTable */}
      <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold">Commission Records</CardTitle>
              <CardDescription>
                {sales.length} {sales.length === 1 ? "sale record" : "sale records"} found with commissions
              </CardDescription>
            </div>
            {(from || to) && (
              <Badge variant="secondary" className="text-xs font-mono">
                {from || "Start"} → {to || "Today"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-32">Sale Date</TableHead>
                  <TableHead className="w-36">Invoice Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Finance Company</TableHead>
                  <TableHead className="text-right">Finance Commission</TableHead>
                  <TableHead>Insurance Company</TableHead>
                  <TableHead className="text-right">Insurance Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => {
                  const saleDateFormatted = new Date(sale.saleDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })

                  return (
                    <TableRow key={sale.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {saleDateFormatted}
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-foreground">
                        <div className="flex items-center gap-1.5">
                          <Receipt className="size-3.5 text-muted-foreground shrink-0" />
                          <span>{sale.invoiceNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm text-foreground">{sale.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{sale.customer.phone}</div>
                      </TableCell>
                      <TableCell>
                        {sale.financeCompany ? (
                          <span className="font-medium text-xs text-foreground">
                            {sale.financeCompany.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {sale.financeCommission && sale.financeCommission > 0 ? (
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {formatLKR(sale.financeCommission)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sale.insuranceCompany ? (
                          <span className="font-medium text-xs text-foreground">
                            {sale.insuranceCompany.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {sale.insuranceCommission && sale.insuranceCommission > 0 ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatLKR(sale.insuranceCommission)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}

                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                      No commission records found for the selected time period.
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
