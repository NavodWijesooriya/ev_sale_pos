"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FileCheck2,
  Search,
  Filter,
  FileText,
  Car,
  ShieldCheck,
  Bike,
  User,
  Phone,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VehicleDocumentTracker } from "@/components/customers/vehicle-document-tracker"
import { DMTStatus } from "@prisma/client"

export interface RMVSaleItem {
  id: string
  saleDate: Date | string
  customer: {
    id: string
    name: string
    phone: string
    nic?: string | null
    address?: string | null
  }
  branch: {
    id: string
    name: string
  }
  items: Array<{
    id: string
    vehicle: {
      id: string
      chassisNumber: string
      unitGrnNumber?: string | null
      registrationNumber?: string | null
      color?: string | null
      vehicleModel: {
        brand: string
        modelName: string
      }
    }
  }>
  dmtRegistration?: {
    id: string
    status: DMTStatus
    registeredNumber?: string | null
    registrationNumber?: string | null
    isBookOk: boolean
    isNumberPlateOk: boolean
    isInsuranceOk: boolean
    lastNotifiedAt?: Date | string | null
  } | null
}

interface RMVRegistryTableProps {
  sales: RMVSaleItem[]
  dealershipName: string
}

export function RMVRegistryTable({ sales, dealershipName }: RMVRegistryTableProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "book-pending" | "plate-pending" | "insurance-pending" | "all-ready">("all")

  // Statistics calculation
  const stats = useMemo(() => {
    let totalVehicles = 0
    let booksOk = 0
    let platesOk = 0
    let insurancesOk = 0
    let allReady = 0

    sales.forEach((s) => {
      totalVehicles += 1
      const isBook = s.dmtRegistration?.isBookOk ?? false
      const isPlate = s.dmtRegistration?.isNumberPlateOk ?? false
      const isIns = s.dmtRegistration?.isInsuranceOk ?? false

      if (isBook) booksOk += 1
      if (isPlate) platesOk += 1
      if (isIns) insurancesOk += 1
      if (isBook && isPlate && isIns) allReady += 1
    })

    return {
      totalVehicles,
      booksOk,
      platesOk,
      insurancesOk,
      allReady,
    }
  }, [sales])

  // Filtering
  const filteredSales = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    return sales.filter((s) => {
      const v = s.items[0]?.vehicle
      const m = v?.vehicleModel
      const dmt = s.dmtRegistration

      // Status filter
      if (filterStatus === "book-pending" && dmt?.isBookOk) return false
      if (filterStatus === "plate-pending" && dmt?.isNumberPlateOk) return false
      if (filterStatus === "insurance-pending" && dmt?.isInsuranceOk) return false
      if (filterStatus === "all-ready" && (!dmt?.isBookOk || !dmt?.isNumberPlateOk || !dmt?.isInsuranceOk)) return false

      // Text search
      if (!q) return true

      const nameMatch = s.customer?.name?.toLowerCase().includes(q)
      const phoneMatch = s.customer?.phone?.toLowerCase().includes(q)
      const nicMatch = s.customer?.nic?.toLowerCase().includes(q)
      const chassisMatch = v?.chassisNumber?.toLowerCase().includes(q)
      const grnMatch = v?.unitGrnNumber?.toLowerCase().includes(q)
      const plateMatch = (dmt?.registrationNumber || dmt?.registeredNumber || v?.registrationNumber)?.toLowerCase().includes(q)
      const modelMatch = m ? `${m.brand} ${m.modelName}`.toLowerCase().includes(q) : false

      return nameMatch || phoneMatch || nicMatch || chassisMatch || grnMatch || plateMatch || modelMatch
    })
  }, [sales, searchQuery, filterStatus])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileCheck2 className="size-5" />
            </div>
            RMV & Vehicle Document Registry
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Department of Motor Traffic (RMV / Werahera) document tracking and instant customer notification portal
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sold */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sold Vehicles
            </CardTitle>
            <Bike className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black">{stats.totalVehicles}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Total registered EV purchases
            </p>
          </CardContent>
        </Card>

        {/* Books Ready */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Books (පොත්) Ready
            </CardTitle>
            <FileText className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-emerald-600">
              {stats.booksOk}{" "}
              <span className="text-xs font-medium text-muted-foreground">
                / {stats.totalVehicles}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {stats.totalVehicles - stats.booksOk} pending from RMV
            </p>
          </CardContent>
        </Card>

        {/* Number Plates Ready */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Number Plates Ready
            </CardTitle>
            <Car className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-blue-600">
              {stats.platesOk}{" "}
              <span className="text-xs font-medium text-muted-foreground">
                / {stats.totalVehicles}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {stats.totalVehicles - stats.platesOk} plates pending
            </p>
          </CardContent>
        </Card>

        {/* Insurance Cards Ready */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Insurance Ready
            </CardTitle>
            <ShieldCheck className="size-4 text-violet-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-violet-600">
              {stats.insurancesOk}{" "}
              <span className="text-xs font-medium text-muted-foreground">
                / {stats.totalVehicles}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {stats.totalVehicles - stats.insurancesOk} cards pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Filter & Search Bar */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, phone, chassis, plate #, or Unit GRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Tabs
              value={filterStatus}
              onValueChange={(val) => setFilterStatus(val as any)}
              className="w-full md:w-auto"
            >
              <TabsList className="grid grid-cols-3 sm:grid-cols-5 h-9 bg-muted/80 p-0.5 text-xs">
                <TabsTrigger value="all" className="text-xs px-2.5 py-1">
                  All ({sales.length})
                </TabsTrigger>
                <TabsTrigger value="book-pending" className="text-xs px-2.5 py-1">
                  Book Pending
                </TabsTrigger>
                <TabsTrigger value="plate-pending" className="text-xs px-2.5 py-1">
                  Plate Pending
                </TabsTrigger>
                <TabsTrigger value="insurance-pending" className="text-xs px-2.5 py-1">
                  Ins. Pending
                </TabsTrigger>
                <TabsTrigger value="all-ready" className="text-xs px-2.5 py-1">
                  All Ready ({stats.allReady})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {filteredSales.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              No vehicle records match the selected filter or search criteria.
            </div>
          ) : (
            filteredSales.map((sale) => {
              const item = sale.items[0]
              const v = item?.vehicle
              const m = v?.vehicleModel
              const dmt = sale.dmtRegistration

              return (
                <div
                  key={sale.id}
                  className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-3 hover:border-primary/40 transition-colors"
                >
                  {/* Top Customer & Sale Overview */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                        {sale.customer?.name?.[0]?.toUpperCase() || "C"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/dashboard/customers/${sale.customer.id}`}
                            className="font-bold text-sm text-foreground hover:underline flex items-center gap-1"
                          >
                            {sale.customer?.name}
                            <ArrowRight className="size-3 text-muted-foreground" />
                          </Link>
                          {sale.customer?.nic && (
                            <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 h-4">
                              NIC: {sale.customer.nic}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono flex items-center gap-1">
                            <Phone className="size-3 text-muted-foreground" />
                            {sale.customer?.phone}
                          </span>
                          <span>•</span>
                          <span>Branch: {sale.branch.name}</span>
                          <span>•</span>
                          <span>
                            Sold: {new Date(sale.saleDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/sales/${sale.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs font-semibold gap-1 hover:bg-primary hover:text-white"
                        >
                          <FileText className="size-3" />
                          Sale Dossier
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Vehicle Document Tracker Component */}
                  <VehicleDocumentTracker
                    saleId={sale.id}
                    customerName={sale.customer.name}
                    customerPhone={sale.customer.phone}
                    dealershipName={dealershipName}
                    modelName={m ? `${m.brand} ${m.modelName}` : "EV Motorcycle"}
                    chassisNumber={v?.chassisNumber || "—"}
                    unitGrnNumber={v?.unitGrnNumber}
                    initialRegistrationNumber={
                      dmt?.registrationNumber || dmt?.registeredNumber || v?.registrationNumber
                    }
                    initialIsBookOk={dmt?.isBookOk ?? false}
                    initialIsNumberPlateOk={dmt?.isNumberPlateOk ?? false}
                    initialIsInsuranceOk={dmt?.isInsuranceOk ?? false}
                    initialLastNotifiedAt={dmt?.lastNotifiedAt}
                    onUpdated={() => router.refresh()}
                  />
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
