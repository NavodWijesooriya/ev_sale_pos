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
  Sparkles,
  Download,
  FileText,
} from "lucide-react"
import { AdvancedReportsData, getAdvancedReportsData } from "@/app/actions/reports"
import { FinancialTab } from "./financial-tab"
import { InventoryAgingTab } from "./inventory-aging-tab"
import { PendingDMTTab } from "./pending-dmt-tab"
import { AfterSalesTab } from "./after-sales-tab"
import { PrintableMonthlyReport } from "./printable-monthly-report"

interface AdvancedReportsDashboardProps {
  initialData: AdvancedReportsData
}

export function AdvancedReportsDashboard({ initialData }: AdvancedReportsDashboardProps) {
  const router = useRouter()
  const [data, setData] = React.useState<AdvancedReportsData>(initialData)
  const [activeTab, setActiveTab] = React.useState<string>("financial")
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const refreshed = await getAdvancedReportsData()
      setData(refreshed)
      toast.success("Executive reports updated with latest telemetry")
    } catch (err: any) {
      toast.error(err.message || "Failed to refresh reports")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handlePrintPDF = () => {
    toast.info("Preparing Executive Monthly PDF report for print...")
    setTimeout(() => {
      window.print()
    }, 250)
  }

  return (
    <>
      {/* Printable Report (Hidden on Screen, Visible on Print) */}
      <PrintableMonthlyReport data={data} />

      {/* Interactive Screen Dashboard (Hidden during Print) */}
      <div className="space-y-6 print:hidden">
        {/* Top Header & Executive Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Reports & Executive Intelligence
              </h1>
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold py-0.5"
              >
                Owner Portal
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {data.organization.businessName} • Comprehensive analytics spanning gross margin profitability, dead stock, DMT compliance, and workshop revenue.
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
              title="Refresh Telemetry"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  isRefreshing ? "animate-spin text-primary" : "text-muted-foreground"
                }`}
              />
              <span className="hidden sm:inline">Refresh Data</span>
            </Button>

            <Button
              onClick={handlePrintPDF}
              className="h-9 gap-2 text-xs font-semibold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Printer className="h-4 w-4" />
              <span>Export Monthly Report (PDF)</span>
            </Button>
          </div>
        </div>

        {/* Shadcn Tabs Component with 4 Core Sections (Requirement 3) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="grid grid-cols-2 lg:grid-cols-4 max-w-3xl h-12 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-1 shadow-xs">
            {/* Tab 1 Trigger */}
            <TabsTrigger
              value="financial"
              className="gap-2 text-xs font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Financial Performance</span>
            </TabsTrigger>

            {/* Tab 2 Trigger */}
            <TabsTrigger
              value="aging"
              className="gap-2 text-xs font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
            >
              <Warehouse className="h-4 w-4" />
              <span>Inventory Aging</span>
              {data.inventoryAging.summary.criticalOver90Count > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 text-[10px] px-1.5 py-0 h-4 font-mono font-bold"
                >
                  {data.inventoryAging.summary.criticalOver90Count}
                </Badge>
              )}
            </TabsTrigger>

            {/* Tab 3 Trigger */}
            <TabsTrigger
              value="dmt"
              className="gap-2 text-xs font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Pending DMT</span>
              {data.pendingDMT.summary.totalPending > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] px-1.5 py-0 h-4 font-mono font-bold"
                >
                  {data.pendingDMT.summary.totalPending}
                </Badge>
              )}
            </TabsTrigger>

            {/* Tab 4 Trigger */}
            <TabsTrigger
              value="service"
              className="gap-2 text-xs font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
            >
              <Wrench className="h-4 w-4" />
              <span>After-Sales Service</span>
              <Badge
                variant="secondary"
                className="ml-1 text-[10px] px-1.5 py-0 h-4 font-mono font-bold"
              >
                {data.afterSales.summary.totalServiceOrders}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: FINANCIAL PERFORMANCE */}
          <TabsContent value="financial" className="m-0 focus-visible:outline-none">
            <FinancialTab data={data.financial} />
          </TabsContent>

          {/* TAB 2: INVENTORY AGING (DEAD STOCK) */}
          <TabsContent value="aging" className="m-0 focus-visible:outline-none">
            <InventoryAgingTab data={data.inventoryAging} />
          </TabsContent>

          {/* TAB 3: PENDING DMT TRACKER */}
          <TabsContent value="dmt" className="m-0 focus-visible:outline-none">
            <PendingDMTTab data={data.pendingDMT} />
          </TabsContent>

          {/* TAB 4: AFTER-SALES & SERVICE REVENUE */}
          <TabsContent value="service" className="m-0 focus-visible:outline-none">
            <AfterSalesTab data={data.afterSales} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

