"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DollarSign,
  Bike,
  Warehouse,
  Wrench,
  Download,
  Calendar as CalendarIcon,
  Filter,
  RefreshCw,
  ArrowUpRight,
  Receipt,
  CreditCard,
  Banknote,
  Building,
  TrendingUp,
  Sparkles,
} from "lucide-react"
import { getAnalyticsData, AnalyticsData } from "@/app/actions/reports"
import { RevenueChart } from "./revenue-chart"
import { ModelPieChart } from "./model-pie-chart"

interface ReportsDashboardProps {
  initialData: AnalyticsData
  organizationName?: string
}

export function ReportsDashboard({
  initialData,
  organizationName = "EV Dealership",
}: ReportsDashboardProps) {
  const router = useRouter()
  const [data, setData] = React.useState<AnalyticsData>(initialData)
  const [isPending, startTransition] = React.useTransition()

  // Filter states
  const [activePreset, setActivePreset] = React.useState<string>(
    initialData.dateRange.preset || "30d"
  )
  const [isCustomDateOpen, setIsCustomDateOpen] = React.useState(false)

  // Start & End date input values (YYYY-MM-DD)
  const [customStart, setCustomStart] = React.useState<string>(
    initialData.dateRange.startDate.split("T")[0]
  )
  const [customEnd, setCustomEnd] = React.useState<string>(
    initialData.dateRange.endDate.split("T")[0]
  )

  // Fetch updated analytics when preset changes
  const applyPreset = (preset: string) => {
    setActivePreset(preset)
    setIsCustomDateOpen(false)

    startTransition(async () => {
      try {
        const res = await getAnalyticsData({ preset })
        setData(res)
        setCustomStart(res.dateRange.startDate.split("T")[0])
        setCustomEnd(res.dateRange.endDate.split("T")[0])
        toast.success(`Loaded analytics for ${getPresetLabel(preset)}`)
      } catch (err: any) {
        toast.error(err.message || "Failed to update analytics")
      }
    })
  }

  // Apply custom date range
  const applyCustomRange = () => {
    if (!customStart || !customEnd) {
      toast.error("Please specify both start and end dates")
      return
    }
    if (new Date(customStart) > new Date(customEnd)) {
      toast.error("Start date cannot be after end date")
      return
    }

    setActivePreset("custom")
    startTransition(async () => {
      try {
        const res = await getAnalyticsData({
          startDate: customStart,
          endDate: customEnd,
          preset: "custom",
        })
        setData(res)
        toast.success("Applied custom date range")
      } catch (err: any) {
        toast.error(err.message || "Failed to update analytics")
      }
    })
  }

  // Refresh current filter
  const refreshData = () => {
    startTransition(async () => {
      try {
        const res = await getAnalyticsData({
          preset: activePreset === "custom" ? undefined : activePreset,
          startDate: activePreset === "custom" ? customStart : undefined,
          endDate: activePreset === "custom" ? customEnd : undefined,
        })
        setData(res)
        toast.success("Analytics refreshed")
      } catch (err: any) {
        toast.error("Failed to refresh analytics")
      }
    })
  }

  // Export filtered sales report to CSV
  const handleExportCSV = () => {
    if (!data.exportableSales || data.exportableSales.length === 0) {
      toast.error("No sales records available to export for this period")
      return
    }

    const headers = [
      "Sale ID",
      "Sale Date",
      "Customer Name",
      "Customer Phone",
      "Customer NIC",
      "Vehicle Models",
      "Chassis / VIN Numbers",
      "Branch",
      "Sold By",
      "Payment Method",
      "Status",
      "Additional Charges ($)",
      "Discount ($)",
      "Total Amount ($)",
    ]

    const csvRows = [
      headers.join(","),
      ...data.exportableSales.map((row) =>
        [
          `"${row.saleId}"`,
          `"${row.date}"`,
          `"${row.customerName}"`,
          `"${row.customerPhone}"`,
          `"${row.customerNic}"`,
          `"${row.vehicleModels.replace(/"/g, '""')}"`,
          `"${row.chassisNumbers.replace(/"/g, '""')}"`,
          `"${row.branch}"`,
          `"${row.soldBy}"`,
          `"${row.paymentMethod}"`,
          `"${row.status}"`,
          row.additionalCharges,
          row.discount,
          row.totalAmount,
        ].join(",")
      ),
    ]

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `${organizationName.replace(/\s+/g, "_")}_Sales_Report_${
        new Date().toISOString().split("T")[0]
      }.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Sales report CSV exported successfully")
  }

  const formattedStartDate = new Date(data.dateRange.startDate).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  )
  const formattedEndDate = new Date(data.dateRange.endDate).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Reports & Executive Analytics
            </h1>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium"
            >
              Live Telemetry
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive financial performance, fleet sales volume, inventory turnover, and after-sales service metrics.
          </p>
        </div>

        {/* Global Export Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isPending}
            className="h-9 gap-1.5"
            title="Refresh Data"
          >
            <RefreshCw
              className={`h-4 w-4 ${isPending ? "animate-spin text-primary" : "text-muted-foreground"}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            onClick={handleExportCSV}
            className="h-9 gap-2 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            <span>Export Sales Report (CSV)</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <Card className="bg-card/50 backdrop-blur-xs border-border/80 shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Date Range:</span>
              <Badge variant="secondary" className="font-mono text-xs font-normal">
                {formattedStartDate} — {formattedEndDate}
              </Badge>
              {isPending && (
                <span className="text-xs text-primary animate-pulse flex items-center gap-1 font-medium">
                  <Sparkles className="h-3 w-3 animate-spin" /> Updating...
                </span>
              )}
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "7d", label: "Last 7 Days" },
                { id: "30d", label: "Last 30 Days" },
                { id: "month", label: "This Month" },
                { id: "ytd", label: "Year to Date" },
                { id: "all", label: "All Time" },
              ].map((preset) => (
                <Button
                  key={preset.id}
                  size="sm"
                  variant={activePreset === preset.id ? "default" : "outline"}
                  className={`h-8 px-3 text-xs font-medium ${
                    activePreset === preset.id
                      ? "shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  disabled={isPending}
                  onClick={() => applyPreset(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}

              <Button
                size="sm"
                variant={isCustomDateOpen || activePreset === "custom" ? "default" : "outline"}
                className="h-8 px-3 text-xs gap-1.5"
                onClick={() => setIsCustomDateOpen(!isCustomDateOpen)}
              >
                <Filter className="h-3.5 w-3.5" />
                Custom Range
              </Button>
            </div>
          </div>

          {/* Collapsible Custom Date Range Picker */}
          {isCustomDateOpen && (
            <div className="pt-3 border-t flex flex-wrap items-center gap-3 bg-muted/30 p-3 rounded-lg animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium">From:</span>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-8 text-xs w-38 bg-background"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium">To:</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-8 text-xs w-38 bg-background"
                />
              </div>

              <Button
                size="sm"
                className="h-8 px-4 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={applyCustomRange}
                disabled={isPending}
              >
                Apply Range
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Summary Cards (Top Row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Revenue */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              ${data.kpis.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span>Gross sales in selected window</span>
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Total EV Bikes Sold */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-blue-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              EV Bikes Sold
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Bike className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {data.kpis.totalVehiclesSold}{" "}
              <span className="text-sm font-normal text-muted-foreground">bikes</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Avg Deal:{" "}
              <strong className="text-foreground">
                ${data.kpis.averageDealSize.toLocaleString()}
              </strong>
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Current Available Stock */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-amber-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Available Stock
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Warehouse className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {data.kpis.currentAvailableStock}{" "}
              <span className="text-sm font-normal text-muted-foreground">in stock</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for immediate customer handover
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Total Services Completed */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-purple-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Services Done
            </span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Wrench className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {data.kpis.totalServicesCompleted}{" "}
              <span className="text-sm font-normal text-muted-foreground">jobs</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Service Rev:{" "}
              <strong className="text-foreground">
                ${data.kpis.totalServiceRevenue.toLocaleString()}
              </strong>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={data.revenueOverTime} />
        </div>
        <div className="lg:col-span-1">
          <ModelPieChart data={data.salesByModel} />
        </div>
      </div>

      {/* Payment Method Distribution Breakdown */}
      {data.paymentMethodDistribution.length > 0 && (
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Payment Channels & Financing Breakdown
            </CardTitle>
            <CardDescription>
              Volume and liquidity distribution by payment method across the filtered date range
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {data.paymentMethodDistribution.map((pm) => (
                <div
                  key={pm.method}
                  className="p-3 rounded-lg border bg-muted/20 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {pm.method}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {pm.count} {pm.count === 1 ? "order" : "orders"}
                    </Badge>
                  </div>
                  <div className="text-lg font-bold text-foreground">
                    ${pm.revenue.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions Table */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-500" />
              Recent Sales Transactions
            </CardTitle>
            <CardDescription>
              The 5 most recent sales orders recorded in your dealership
            </CardDescription>
          </div>
          <Link href="/dashboard/sales">
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
              View All Sales
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          {data.recentSales.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No transactions have been recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-semibold text-xs">Date</TableHead>
                  <TableHead className="font-semibold text-xs">Customer</TableHead>
                  <TableHead className="font-semibold text-xs">EV Bike Model</TableHead>
                  <TableHead className="font-semibold text-xs">Branch</TableHead>
                  <TableHead className="font-semibold text-xs">Payment</TableHead>
                  <TableHead className="font-semibold text-xs">Status</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Amount</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSales.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(sale.saleDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground">{sale.customerName}</div>
                      <div className="text-[11px] text-muted-foreground">{sale.customerPhone}</div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground">
                      {sale.vehicleSummary}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sale.branchName}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[11px] font-normal">
                        {sale.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-medium ${
                          sale.status === "Completed"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }`}
                      >
                        {sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ${sale.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-center">
                      <Link href={`/dashboard/sales/${sale.id}/invoice`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-primary hover:text-primary gap-1"
                          title="View Printable Invoice"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>Invoice</span>
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function getPresetLabel(preset: string): string {
  switch (preset) {
    case "7d":
      return "Last 7 Days"
    case "30d":
      return "Last 30 Days"
    case "month":
      return "This Month"
    case "ytd":
      return "Year to Date"
    case "all":
      return "All Time"
    default:
      return "Selected Range"
  }
}
