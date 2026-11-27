"use client"

import { downloadCsv } from "@/lib/csv"
import { colomboDateKey, colomboMonthKey, colomboParts } from "@/lib/dates"
import * as React from "react"
import {
  Calendar as CalendarIcon,
  Download,
  Printer,
  Receipt,
  Bike,
  Coins,
  Banknote,
  Landmark,
  Wallet,
  CheckCircle2,
  Filter,
  RotateCw,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatLKR } from "@/lib/currency"
import {
  getDailySalesReport,
  getMonthlySalesReport,
  type DailySalesReportData,
  type MonthlySalesReportData,
  type SalesReportItem,
} from "@/app/actions/reports"
import { toast } from "sonner"

interface DailyMonthlySalesTabProps {
  initialDaily: DailySalesReportData
  initialMonthly: MonthlySalesReportData
}

export function DailyMonthlySalesTab({
  initialDaily,
  initialMonthly,
}: DailyMonthlySalesTabProps) {
  const [subTab, setSubTab] = React.useState<"daily" | "monthly">("daily")

  // Daily State
  const [dailyData, setDailyData] = React.useState<DailySalesReportData>(initialDaily)
  const [selectedDate, setSelectedDate] = React.useState<string>(initialDaily.selectedDate)
  const [isDailyLoading, setIsDailyLoading] = React.useState(false)

  // Monthly State
  const [monthlyData, setMonthlyData] = React.useState<MonthlySalesReportData>(initialMonthly)
  const [selectedMonth, setSelectedMonth] = React.useState<string>(initialMonthly.selectedYearMonth)
  const [isMonthlyLoading, setIsMonthlyLoading] = React.useState(false)

  // Round / batch filter (e.g. "JM 01"): applied on the server so the totals match the list
  const [batch, setBatch] = React.useState("")

  // Handler for changing daily date
  const handleDateChange = async (newDate: string, batchFilter: string = batch) => {
    setSelectedDate(newDate)
    setIsDailyLoading(true)
    try {
      const res = await getDailySalesReport(newDate, batchFilter)
      setDailyData(res)
    } catch (err: any) {
      toast.error(err.message || "Failed to load sales for date")
    } finally {
      setIsDailyLoading(false)
    }
  }

  // Quick Daily Presets
  const setToday = () => {
    handleDateChange(colomboDateKey(new Date()))
  }

  const setYesterday = () => {
    handleDateChange(colomboDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000)))
  }

  // Handler for changing monthly date
  const handleMonthChange = async (newMonth: string, batchFilter: string = batch) => {
    setSelectedMonth(newMonth)
    setIsMonthlyLoading(true)
    try {
      const res = await getMonthlySalesReport(newMonth, batchFilter)
      setMonthlyData(res)
    } catch (err: any) {
      toast.error(err.message || "Failed to load sales for month")
    } finally {
      setIsMonthlyLoading(false)
    }
  }

  // Quick Monthly Presets
  const setThisMonth = () => {
    handleMonthChange(colomboMonthKey(new Date()))
  }

  const setLastMonth = () => {
    const { year, month } = colomboParts(new Date())
    const last = new Date(Date.UTC(year, month - 1, 1))
    handleMonthChange(`${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, "0")}`)
  }

  // CSV Export for Sales
  const exportSalesCSV = (sales: SalesReportItem[], title: string) => {
    const headers = [
      "Date",
      "Invoice Number",
      "Customer Name",
      "Phone",
      "NIC",
      "Vehicle Model",
      "Unit GRN",
      "Chassis Number",
      "Color",
      "Payment Type",
      "Payment Method",
      "Finance Company",
      "Advance Deducted (Rs.)",
      "Net Invoice Amount (Rs.)",
      "Gross Total Revenue (Rs.)",
      "Status",
      "Rep Name",
      "Branch",
    ]

    const rows = sales.map((s) => [
      colomboDateKey(new Date(s.saleDate)),
      s.invoiceNumber,
      s.customerName,
      s.customerPhone,
      s.customerNic,
      s.vehicleModel,
      s.unitGrnNumber || "N/A",
      s.chassisNumber,
      s.color || "N/A",
      s.paymentType,
      s.paymentMethod,
      s.financeCompany || "N/A",
      s.advanceDeducted,
      s.totalAmount,
      s.grossPrice,
      s.status,
      s.soldByName,
      s.branchName,
    ])

    downloadCsv(`${title.toLowerCase().replace(/\s+/g, "_")}.csv`, [headers, ...rows])
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Sub-Tabs: Daily vs Monthly */}
      <Tabs value={subTab} onValueChange={(val) => setSubTab(val as "daily" | "monthly")}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
          <TabsList className="bg-muted/80 p-1 rounded-xl h-11 w-full sm:w-auto">
            <TabsTrigger value="daily" className="text-xs font-bold px-4">
              Daily Sales Report
            </TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs font-bold px-4">
              Monthly Sales Report
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Input
              value={batch}
              onChange={(event) => setBatch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleDateChange(selectedDate, batch)
                  handleMonthChange(selectedMonth, batch)
                }
              }}
              onBlur={() => {
                handleDateChange(selectedDate, batch)
                handleMonthChange(selectedMonth, batch)
              }}
              placeholder="Round / batch (e.g. JM 01)"
              aria-label="Filter sales by round or batch number"
              className="h-9 w-48 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-9 text-xs font-semibold gap-1.5"
            >
              <Printer className="size-3.5" />
              <span>Print Report</span>
            </Button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: DAILY SALES REPORT */}
        {/* ============================================================== */}
        <TabsContent value="daily" className="space-y-6 mt-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl border bg-card/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <CalendarIcon className="size-4 text-primary" />
                Select Date:
              </span>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="h-8 w-38 text-xs bg-background"
                disabled={isDailyLoading}
              />
              {isDailyLoading && <RotateCw className="size-3.5 animate-spin text-primary" />}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={setToday}
                className="h-8 text-xs"
                disabled={isDailyLoading}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={setYesterday}
                className="h-8 text-xs"
                disabled={isDailyLoading}
              >
                Yesterday
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportSalesCSV(dailyData.sales, `daily_sales_${selectedDate}`)}
                className="h-8 text-xs gap-1.5"
                disabled={dailyData.sales.length === 0}
              >
                <Download className="size-3.5" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Daily KPI Summary Cards (Requirement 2) */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
            {/* 1. Total Revenue */}
            <Card className="rounded-xl border-border/70 shadow-xs">
              <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground">
                  Total Revenue
                </CardTitle>
                <Coins className="size-4 text-primary" />
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="text-xl font-bold tracking-tight text-primary">
                  {formatLKR(dailyData.kpis.totalRevenue)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {dailyData.kpis.totalSalesCount} units sold today
                </p>
              </CardContent>
            </Card>

            {/* 2. Cash Sales Total */}
            <Card className="rounded-xl border-border/70 shadow-xs">
              <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground">
                  Cash Sales Total
                </CardTitle>
                <Banknote className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="text-xl font-bold tracking-tight text-emerald-600">
                  {formatLKR(dailyData.kpis.cashSalesTotal)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Direct cash vehicle sales
                </p>
              </CardContent>
            </Card>

            {/* 3. Finance Sales Total */}
            <Card className="rounded-xl border-border/70 shadow-xs">
              <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground">
                  Finance Sales Total
                </CardTitle>
                <Landmark className="size-4 text-blue-600" />
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="text-xl font-bold tracking-tight text-blue-600">
                  {formatLKR(dailyData.kpis.financeSalesTotal)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Financed by leasing partners
                </p>
              </CardContent>
            </Card>

            {/* 4. Total Advances Deducted */}
            <Card className="rounded-xl border-border/70 shadow-xs">
              <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground">
                  Advances Deducted
                </CardTitle>
                <Wallet className="size-4 text-amber-600" />
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="text-xl font-bold tracking-tight text-amber-600">
                  {formatLKR(dailyData.kpis.totalAdvancesDeducted)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Settled from previous customer deposits
                </p>
              </CardContent>
            </Card>

            {/* 5. Net Cash Collected */}
            <Card className="rounded-xl border-border/70 shadow-xs col-span-2 lg:col-span-1 bg-primary/5">
              <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-foreground">
                  Net Cash Collected
                </CardTitle>
                <CheckCircle2 className="size-4 text-primary" />
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="text-xl font-bold tracking-tight text-foreground">
                  {formatLKR(dailyData.kpis.netCashCollected)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Physical cash collected today
                  {(dailyData.kpis.additionalDownPayments ?? 0) > 0 && (
                    <span data-testid="topup-note"> · includes {formatLKR(dailyData.kpis.additionalDownPayments ?? 0)} additional down payments</span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Sales Table */}
          <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/20 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Sales Breakdown for {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {dailyData.sales.length} {dailyData.sales.length === 1 ? "sale record" : "sales records"} found
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  Date: {selectedDate}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-24">Time</TableHead>
                      <TableHead className="w-32">Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Vehicle &amp; Unit GRN</TableHead>
                      <TableHead>Payment Type</TableHead>
                      <TableHead className="text-right">Advance Deducted</TableHead>
                      <TableHead className="text-right">Invoice Net</TableHead>
                      <TableHead className="text-right font-bold">Gross Total</TableHead>
                      <TableHead>Sold By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyData.sales.map((sale) => {
                      const timeStr = new Date(sale.saleDate).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })

                      return (
                        <TableRow key={sale.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {timeStr}
                          </TableCell>
                          <TableCell className="font-semibold text-xs text-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Receipt className="size-3.5 text-muted-foreground shrink-0" />
                              <span>{sale.invoiceNumber}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-xs text-foreground">{sale.customerName}</div>
                            <div className="text-[11px] text-muted-foreground">{sale.customerPhone}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-xs text-foreground flex items-center gap-1">
                              <Bike className="size-3 text-muted-foreground" />
                              {sale.vehicleModel}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {sale.unitGrnNumber && (
                                <Badge variant="outline" className="font-mono text-[10px] font-bold bg-muted/40">
                                  {sale.unitGrnNumber}
                                </Badge>
                              )}
                              <span className="font-mono text-[10px] text-muted-foreground">
                                VIN: {sale.chassisNumber}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                sale.paymentType === "FINANCE"
                                  ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-semibold"
                                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold"
                              }
                            >
                              {sale.paymentType}
                              {sale.financeCompany ? ` (${sale.financeCompany})` : ""}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs font-medium text-amber-600">
                            {sale.advanceDeducted > 0 ? formatLKR(sale.advanceDeducted) : "-"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs">
                            {formatLKR(sale.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs font-bold text-foreground">
                            {formatLKR(sale.grossPrice)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {sale.soldByName}
                          </TableCell>
                        </TableRow>
                      )
                    })}

                    {dailyData.sales.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-sm text-muted-foreground">
                          No sales recorded for this date.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 2: MONTHLY SALES REPORT */}
        {/* ============================================================== */}
        <TabsContent value="monthly" className="space-y-6 mt-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl border bg-card/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <CalendarIcon className="size-4 text-primary" />
                Select Month:
              </span>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="h-8 w-40 text-xs bg-background"
                disabled={isMonthlyLoading}
              />
              {isMonthlyLoading && <RotateCw className="size-3.5 animate-spin text-primary" />}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={setThisMonth}
                className="h-8 text-xs"
                disabled={isMonthlyLoading}
              >
                This Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={setLastMonth}
                className="h-8 text-xs"
                disabled={isMonthlyLoading}
              >
                Last Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportSalesCSV(monthlyData.sales, `monthly_sales_${selectedMonth}`)}
                className="h-8 text-xs gap-1.5"
                disabled={monthlyData.sales.length === 0}
              >
                <Download className="size-3.5" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Monthly KPI Summary Cards (Requirement 2) */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
            {/* 1. Total Revenue */}
            <Card className="rounded-xl border-border/70 shadow-xs">
              <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground">
                  Monthly Revenue
                </CardTitle>
                <Coins className="size-4 text-primary" />
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="text-xl font-bold tracking-tight text-primary">
                  {formatLKR(monthlyData.kpis.totalRevenue)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {monthlyData.kpis.totalSalesCount} units sold in {monthlyData.selectedYearMonthLabel}
                </p>
              </CardContent>
            </Card>

            {/* 2. Cash Sales Total */}
            <Card className="rounded-xl border-border/70 shadow-xs">
              <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground">
                  Cash Sales Total
                </CardTitle>
                <Banknote className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="text-xl font-bold tracking-tight text-emerald-600">
                  {formatLKR(monthlyData.kpis.cashSalesTotal)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Direct cash vehicle sales
                </p>
              </CardContent>
            </Card>

            {/* 3. Finance Sales Total */}
            <Card className="rounded-xl border-border/70 shadow-xs">
              <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground">
                  Finance Sales Total
                </CardTitle>
                <Landmark className="size-4 text-blue-600" />
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="text-xl font-bold tracking-tight text-blue-600">
                  {formatLKR(monthlyData.kpis.financeSalesTotal)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Financed by leasing partners
                </p>
              </CardContent>
            </Card>

            {/* 4. Total Advances Deducted */}
            <Card className="rounded-xl border-border/70 shadow-xs">
              <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground">
                  Advances Deducted
                </CardTitle>
                <Wallet className="size-4 text-amber-600" />
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="text-xl font-bold tracking-tight text-amber-600">
                  {formatLKR(monthlyData.kpis.totalAdvancesDeducted)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Settled customer advances
                </p>
              </CardContent>
            </Card>

            {/* 5. Net Cash Collected */}
            <Card className="rounded-xl border-border/70 shadow-xs col-span-2 lg:col-span-1 bg-primary/5">
              <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-foreground">
                  Net Cash Collected
                </CardTitle>
                <CheckCircle2 className="size-4 text-primary" />
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="text-xl font-bold tracking-tight text-foreground">
                  {formatLKR(monthlyData.kpis.netCashCollected)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Cash collected in {monthlyData.selectedYearMonthLabel}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Sales Breakdown Table */}
          <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/20 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Monthly Sales Log for {monthlyData.selectedYearMonthLabel}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {monthlyData.sales.length} vehicle transactions completed
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  Period: {monthlyData.selectedYearMonth}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-28">Date</TableHead>
                      <TableHead className="w-32">Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Vehicle &amp; Unit GRN</TableHead>
                      <TableHead>Payment Type</TableHead>
                      <TableHead className="text-right">Advance Deducted</TableHead>
                      <TableHead className="text-right">Invoice Net</TableHead>
                      <TableHead className="text-right font-bold">Gross Total</TableHead>
                      <TableHead>Rep</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.sales.map((sale) => {
                      const dateStr = new Date(sale.saleDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })

                      return (
                        <TableRow key={sale.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {dateStr}
                          </TableCell>
                          <TableCell className="font-semibold text-xs text-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Receipt className="size-3.5 text-muted-foreground shrink-0" />
                              <span>{sale.invoiceNumber}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-xs text-foreground">{sale.customerName}</div>
                            <div className="text-[11px] text-muted-foreground">{sale.customerPhone}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-xs text-foreground flex items-center gap-1">
                              <Bike className="size-3 text-muted-foreground" />
                              {sale.vehicleModel}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {sale.unitGrnNumber && (
                                <Badge variant="outline" className="font-mono text-[10px] font-bold bg-muted/40">
                                  {sale.unitGrnNumber}
                                </Badge>
                              )}
                              <span className="font-mono text-[10px] text-muted-foreground">
                                VIN: {sale.chassisNumber}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                sale.paymentType === "FINANCE"
                                  ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-semibold"
                                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold"
                              }
                            >
                              {sale.paymentType}
                              {sale.financeCompany ? ` (${sale.financeCompany})` : ""}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs font-medium text-amber-600">
                            {sale.advanceDeducted > 0 ? formatLKR(sale.advanceDeducted) : "-"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs">
                            {formatLKR(sale.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs font-bold text-foreground">
                            {formatLKR(sale.grossPrice)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {sale.soldByName}
                          </TableCell>
                        </TableRow>
                      )
                    })}

                    {monthlyData.sales.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-sm text-muted-foreground">
                          No sales recorded for this month.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
