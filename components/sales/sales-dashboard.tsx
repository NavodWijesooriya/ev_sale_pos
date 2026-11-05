"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BadgeDollarSign,
  ShoppingCart,
  Receipt,
  Bike,
  TrendingUp,
  Sparkles,
  Building2,
  RefreshCw,
} from "lucide-react"
import {
  NewSaleForm,
  InStockVehicle,
  CustomerData,
} from "@/components/sales/new-sale-form"
import {
  SalesHistoryTable,
  SaleRecordItem,
} from "@/components/sales/sales-history-table"

interface BranchItem {
  id: string
  name: string
  location?: string | null
}

interface SalesDashboardProps {
  initialVehicles: InStockVehicle[]
  initialCustomers: CustomerData[]
  initialSales: SaleRecordItem[]
  branches: BranchItem[]
  dealershipName: string
}

export function SalesDashboard({
  initialVehicles,
  initialCustomers,
  initialSales,
  branches,
  dealershipName,
}: SalesDashboardProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>("pos")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Calculations for KPI Cards
  const totalRevenue = initialSales.reduce((acc, s) => acc + s.totalAmount, 0)
  const totalUnitsSold = initialSales.length
  const inStockUnits = initialVehicles.length
  const financeDealsCount = initialSales.filter((s) => !!s.financeDetail).length

  const handleRefresh = async () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 600)
  }

  const handleSaleComplete = (saleId?: string) => {
    router.refresh()
    if (saleId) {
      router.push(`/dashboard/sales/${saleId}/invoice`)
    } else {
      setActiveTab("history")
    }
  }

  // Prepared recent completed transactions for persistent right summary panel
  const recentSales = initialSales.slice(0, 3).map((s) => ({
    id: s.id,
    customerName: s.customer.name,
    vehicleName: s.items[0]?.vehicle
      ? `${s.items[0].vehicle.vehicleModel.brand} ${s.items[0].vehicle.vehicleModel.modelName}`
      : "EV Vehicle",
    chassisNumber: s.items[0]?.vehicle?.chassisNumber || "N/A",
    totalAmount: s.totalAmount,
    date: new Date(s.saleDate).toLocaleDateString(),
  }))

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              EV Sales & POS Management
            </h1>
            <Badge
              variant="outline"
              className="text-xs font-semibold bg-blue-500/10 text-blue-600 border-blue-500/20"
            >
              Live Point of Sale
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-primary" />
            <span>Showroom: <strong>{dealershipName}</strong> • Real-time lease calculations & DMT tracking</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 gap-1.5 text-xs font-medium border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards: Premium White Cards with Subtle Borders */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total EV Revenue
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1 font-mono">
                ${totalRevenue.toLocaleString()}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" />
                Gross Sales Value
              </p>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BadgeDollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Vehicles Sold
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1 font-mono">
                {totalUnitsSold}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                Completed transactions
              </p>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Receipt className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Available In-Stock
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1 font-mono">
                {inStockUnits}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                Ready for checkout
              </p>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Bike className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Lease & Finance Deals
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1 font-mono">
                {financeDealsCount}
              </h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                Bank partnerships
              </p>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation (Requirement 3: shadcn Tabs for top-level page navigation) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 max-w-md h-12 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-1 shadow-xs">
          <TabsTrigger value="pos" className="gap-2 text-xs font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs">
            <ShoppingCart className="h-4 w-4" />
            New Sale (POS)
            <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 h-4">
              {inStockUnits} Stock
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 text-xs font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs">
            <Receipt className="h-4 w-4" />
            Sales History
            <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 h-4">
              {totalUnitsSold}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: New Sale (POS) Form with Numbered Steps and Persistent Right Panel */}
        <TabsContent value="pos" className="m-0 focus-visible:outline-none">
          <NewSaleForm
            vehicles={initialVehicles}
            customers={initialCustomers}
            branches={branches}
            recentSales={recentSales}
            onSaleComplete={handleSaleComplete}
          />
        </TabsContent>

        {/* Tab 2: Sales History Table */}
        <TabsContent value="history" className="m-0 focus-visible:outline-none">
          <SalesHistoryTable sales={initialSales} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
