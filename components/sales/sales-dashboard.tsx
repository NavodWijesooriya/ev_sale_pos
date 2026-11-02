"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BadgeDollarSign,
  ShoppingCart,
  Receipt,
  CarFront,
  Zap,
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

  const handleSaleComplete = () => {
    router.refresh()
    setActiveTab("history")
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Stat Highlights */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Sales, POS & Vehicle Finance
            </h1>
            <Badge variant="outline" className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              POS Terminal
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Process new EV purchases, cash settlements, and bank lease agreements for{" "}
            <span className="font-semibold text-foreground">{dealershipName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total EV Revenue
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1">
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

        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Vehicles Sold
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1">
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

        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Available In-Stock
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1">
                {inStockUnits}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                Ready for checkout
              </p>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <CarFront className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Lease & Finance Deals
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1">
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

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 max-w-md h-11 bg-muted/80 p-1">
          <TabsTrigger value="pos" className="gap-2 text-xs font-bold">
            <ShoppingCart className="h-4 w-4" />
            New Sale (POS)
            <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 h-4">
              {inStockUnits} Stock
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 text-xs font-bold">
            <Receipt className="h-4 w-4" />
            Sales History
            <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 h-4">
              {totalUnitsSold}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: New Sale (POS) Form */}
        <TabsContent value="pos" className="m-0 focus-visible:outline-none">
          <NewSaleForm
            vehicles={initialVehicles}
            customers={initialCustomers}
            branches={branches}
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
