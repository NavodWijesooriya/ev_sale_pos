"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  Warehouse,
  FileCheck2,
  Wrench,
  Printer,
  RefreshCw,
  Coins,
  Wallet,
  Calendar,
  ClipboardList,
  BarChart3,
} from "lucide-react"
import {
  type UnifiedReportsData,
  getUnifiedReportsData,
} from "@/app/actions/reports"
import { FinancialTab } from "./financial-tab"
import { InventoryAgingTab } from "./inventory-aging-tab"
import { PendingDMTTab } from "./pending-dmt-tab"
import { AfterSalesTab } from "./after-sales-tab"
import { PrintableMonthlyReport } from "./printable-monthly-report"
import { DailyMonthlySalesTab } from "./daily-monthly-sales-tab"
import { CommissionsTab } from "./commissions-tab"
import { AdvancesReportTab } from "./advances-report-tab"
import { ServicePartsReportTab } from "./service-parts-report-tab"
import { GRNBatchReportTab } from "./grn-batch-report-tab"

interface AdvancedReportsDashboardProps {
  initialData: UnifiedReportsData
}

export function AdvancedReportsDashboard({ initialData }: AdvancedReportsDashboardProps) {
  const router = useRouter()
  const [data, setData] = React.useState<UnifiedReportsData>(initialData)
  const [activeTab, setActiveTab] = React.useState<string>("overview")
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const refreshed = await getUnifiedReportsData()
      setData(refreshed)
      toast.success("All reports updated with latest dealership data")
    } catch (err: any) {
      toast.error(err.message || "Failed to refresh reports")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handlePrintPDF = () => {
    toast.info("Preparing Executive Report for print...")
    setTimeout(() => {
      window.print()
    }, 250)
  }

  return (
    <>
      {/* Printable Report (Hidden on Screen, Visible on Print) */}
      <PrintableMonthlyReport data={data.advancedData} />

      {/* Interactive Screen Dashboard (Hidden during Print) */}
      <div className="space-y-6 print:hidden">
        {/* Top Header & Executive Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BarChart3 className="size-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Reports &amp; Analytics
              </h1>
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold py-0.5"
              >
                Unified Dashboard
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {data.advancedData.organization.businessName} • Real-time operational intelligence covering sales revenue, finance commissions, advance ledger, workshop jobs, and GRN stock depletion.
            </p>
          </div>

          {/* Top Actions: Refresh & PDF Export */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 gap-1.5 text-xs font-medium"
              title="Refresh Data"
            >
              <RefreshCw
                className={`size-3.5 ${
                  isRefreshing ? "animate-spin text-primary" : "text-muted-foreground"
                }`}
              />
              <span className="hidden sm:inline">Refresh All</span>
            </Button>

            <Button
              onClick={handlePrintPDF}
              className="h-9 gap-2 text-xs font-semibold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
            >
              <Printer className="size-4" />
              <span>Export PDF</span>
            </Button>
          </div>
        </div>

        {/* Unified 6-Tab Interface (Requirement 5) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 w-full h-auto bg-muted/70 border rounded-2xl p-1 gap-1">
            {/* Tab 1: Overview */}
            <TabsTrigger
              value="overview"
              className="gap-1.5 text-xs font-bold rounded-xl py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <TrendingUp className="size-3.5 text-primary" />
              <span>Overview</span>
            </TabsTrigger>

            {/* Tab 2: Daily & Monthly Sales */}
            <TabsTrigger
              value="sales"
              className="gap-1.5 text-xs font-bold rounded-xl py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Calendar className="size-3.5 text-blue-600" />
              <span>Daily/Monthly Sales</span>
            </TabsTrigger>

            {/* Tab 3: Commissions */}
            <TabsTrigger
              value="commissions"
              className="gap-1.5 text-xs font-bold rounded-xl py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Coins className="size-3.5 text-amber-600" />
              <span>Commissions</span>
              {data.commissionsData.sales.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 font-mono font-bold">
                  {data.commissionsData.sales.length}
                </Badge>
              )}
            </TabsTrigger>

            {/* Tab 4: Advances */}
            <TabsTrigger
              value="advances"
              className="gap-1.5 text-xs font-bold rounded-xl py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Wallet className="size-3.5 text-emerald-600" />
              <span>Advances</span>
              {data.advancesReport.kpis.pendingCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 font-mono font-bold">
                  {data.advancesReport.kpis.pendingCount}
                </Badge>
              )}
            </TabsTrigger>

            {/* Tab 5: Service & Parts */}
            <TabsTrigger
              value="services"
              className="gap-1.5 text-xs font-bold rounded-xl py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Wrench className="size-3.5 text-purple-600" />
              <span>Service &amp; Parts</span>
              {data.serviceAndParts.kpis.lowStockPartsCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 font-mono font-bold">
                  {data.serviceAndParts.kpis.lowStockPartsCount}
                </Badge>
              )}
            </TabsTrigger>

            {/* Tab 6: GRN Stock */}
            <TabsTrigger
              value="grn"
              className="gap-1.5 text-xs font-bold rounded-xl py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <ClipboardList className="size-3.5 text-cyan-600" />
              <span>GRN Stock</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 font-mono font-bold">
                {data.grnBatches.kpis.totalBatchesCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* ============================================================== */}
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {/* ============================================================== */}
          <TabsContent value="overview" className="space-y-6 m-0 focus-visible:outline-none">
            <FinancialTab data={data.advancedData.financial} />
            <div className="grid gap-6 lg:grid-cols-2">
              <InventoryAgingTab data={data.advancedData.inventoryAging} />
              <PendingDMTTab data={data.advancedData.pendingDMT} />
            </div>
          </TabsContent>

          {/* ============================================================== */}
          {/* TAB 2: DAILY & MONTHLY SALES (Requirement 2) */}
          {/* ============================================================== */}
          <TabsContent value="sales" className="m-0 focus-visible:outline-none">
            <DailyMonthlySalesTab
              initialDaily={data.dailySales}
              initialMonthly={data.monthlySales}
            />
          </TabsContent>

          {/* ============================================================== */}
          {/* TAB 3: COMMISSIONS REPORT (Requirement 1) */}
          {/* ============================================================== */}
          <TabsContent value="commissions" className="m-0 focus-visible:outline-none">
            <CommissionsTab initialData={data.commissionsData} />
          </TabsContent>

          {/* ============================================================== */}
          {/* TAB 4: ADVANCES REPORT (Requirement 3) */}
          {/* ============================================================== */}
          <TabsContent value="advances" className="m-0 focus-visible:outline-none">
            <AdvancesReportTab data={data.advancesReport} />
          </TabsContent>

          {/* ============================================================== */}
          {/* TAB 5: SERVICE & SPARE PARTS REPORT (Requirement 4 Part A) */}
          {/* ============================================================== */}
          <TabsContent value="services" className="m-0 focus-visible:outline-none">
            <ServicePartsReportTab data={data.serviceAndParts} />
          </TabsContent>

          {/* ============================================================== */}
          {/* TAB 6: GRN BATCH STOCK SUMMARY (Requirement 4 Part B) */}
          {/* ============================================================== */}
          <TabsContent value="grn" className="m-0 focus-visible:outline-none">
            <GRNBatchReportTab data={data.grnBatches} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
