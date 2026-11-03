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
  Wrench,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  PlusCircle,
  RefreshCw,
  Clock,
  Car,
  History,
  TrendingUp,
} from "lucide-react"
import {
  NewServiceForm,
  SoldVehicleItem,
  BranchOption,
  CustomerOption,
} from "@/components/services/new-service-form"
import {
  ServiceHistoryTable,
  ServiceRecordRow,
} from "@/components/services/service-history-table"
import { ServiceType } from "@prisma/client"

interface ServiceDashboardProps {
  initialVehicles: SoldVehicleItem[]
  branches: BranchOption[]
  customers: CustomerOption[]
  initialRecords: ServiceRecordRow[]
  dealershipName: string
}

export function ServiceDashboard({
  initialVehicles,
  branches,
  customers,
  initialRecords,
  dealershipName,
}: ServiceDashboardProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>("new-service")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // KPI Calculations
  const totalServices = initialRecords.length
  const freeServicesCount = initialRecords.filter(
    (r) => r.serviceType === ServiceType.Free
  ).length
  const warrantyClaimsCount = initialRecords.filter(
    (r) => r.serviceType === ServiceType.Warranty
  ).length
  const totalServiceRevenue = initialRecords.reduce(
    (sum, r) => sum + r.totalCost,
    0
  )

  const handleRefresh = async () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 600)
  }

  const handleServiceSuccess = () => {
    router.refresh()
    setActiveTab("history")
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              After-Sales Service & Maintenance
            </h1>
            <Badge variant="outline" className="text-xs font-semibold bg-blue-500/10 text-blue-600 border-blue-500/20">
              Workshop Portal
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Log periodic inspections, battery diagnostics, and warranty service jobs for{" "}
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
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Services Logged
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1">
                {totalServices}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                All maintenance jobs
              </p>
            </div>
            <div className="size-10 sm:size-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Wrench className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Free Inspections
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1">
                {freeServicesCount}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="size-3" />
                Complimentary checks
              </p>
            </div>
            <div className="size-10 sm:size-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Warranty Claims
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1">
                {warrantyClaimsCount}
              </h3>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                Battery & component claims
              </p>
            </div>
            <div className="size-10 sm:size-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Service Revenue
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1">
                ${totalServiceRevenue.toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Paid repairs & parts
              </p>
            </div>
            <div className="size-10 sm:size-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <DollarSign className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 max-w-md h-11 bg-muted/80 p-1">
          <TabsTrigger value="new-service" className="gap-2 text-xs font-bold">
            <PlusCircle className="size-4" />
            New Service Job
            <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 h-4">
              {initialVehicles.length} Sold
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 text-xs font-bold">
            <History className="size-4" />
            Service History
            <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 h-4">
              {totalServices}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: New Service Job Form */}
        <TabsContent value="new-service" className="m-0 focus-visible:outline-none">
          <NewServiceForm
            vehicles={initialVehicles}
            branches={branches}
            customers={customers}
            onSuccess={handleServiceSuccess}
          />
        </TabsContent>

        {/* Tab 2: Service History Table */}
        <TabsContent value="history" className="m-0 focus-visible:outline-none">
          <ServiceHistoryTable records={initialRecords} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
