"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModelsTab, VehicleModelRecord } from "@/components/inventory/models-tab"
import { SuppliersTab, SupplierRecord } from "@/components/inventory/suppliers-tab"
import { StockTab, StockVehicleRecord } from "@/components/inventory/stock-tab"
import { GRNTab, GRNRecord } from "@/components/inventory/grn-tab"
import { CreateGRNDialog } from "@/components/inventory/create-grn-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Boxes,
  Bike,
  Truck,
  FileText,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Building2,
} from "lucide-react"
import { useRouter } from "next/navigation"

interface InventoryDashboardProps {
  initialModels: VehicleModelRecord[]
  initialSuppliers: SupplierRecord[]
  initialVehicles: StockVehicleRecord[]
  initialGRNs: GRNRecord[]
  branches: { id: string; name: string }[]
  dealershipName: string
}

export function InventoryDashboard({
  initialModels,
  initialSuppliers,
  initialVehicles,
  initialGRNs,
  branches,
  dealershipName,
}: InventoryDashboardProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState("stock")
  const [isCreateGRNOpen, setIsCreateGRNOpen] = React.useState(false)

  const stats = [
    {
      title: "EV Bikes In Stock",
      value: initialVehicles.length.toString(),
      subtext: "Ready for sale / POS",
      icon: Boxes,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "EV Bike Models",
      value: initialModels.length.toString(),
      subtext: "Active configurations",
      icon: Bike,
      color: "text-blue-500",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Registered Suppliers",
      value: initialSuppliers.length.toString(),
      subtext: "Logistics & manufacturers",
      icon: Truck,
      color: "text-purple-500",
      bg: "bg-purple-500/10 border-purple-500/20",
    },
    {
      title: "GRN Shipments Received",
      value: initialGRNs.length.toString(),
      subtext: "Procurement vouchers",
      icon: FileText,
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Inventory & GRN Management
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Tenant Isolated
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage EV bike models, supplier channels, physical showroom bike stock, and Goods Received Notes for{" "}
            <strong className="text-foreground">{dealershipName}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setIsCreateGRNOpen(true)}
            size="sm"
            className="text-xs h-9 bg-primary text-primary-foreground font-medium shadow-xs"
          >
            <Plus className="mr-1.5 size-3.5" />
            Create GRN (Intake Stock)
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <Card key={i} className="border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.title}</p>
                  <p className="text-2xl font-bold tracking-tight text-foreground mt-1 font-mono">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.subtext}</p>
                </div>
                <div className={`p-2.5 rounded-xl border ${s.bg}`}>
                  <Icon className={`size-5 ${s.color}`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabs Navigation (Requirement 3: shadcn Tabs for top-level page navigation) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <TabsTrigger
            value="stock"
            className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs px-3.5 py-1.5 flex items-center gap-2 rounded-lg font-semibold"
          >
            <Boxes className="size-3.5" />
            <span>Stock ({initialVehicles.length})</span>
          </TabsTrigger>

          <TabsTrigger
            value="models"
            className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs px-3.5 py-1.5 flex items-center gap-2 rounded-lg font-semibold"
          >
            <Bike className="size-3.5" />
            <span>EV Bike Models ({initialModels.length})</span>
          </TabsTrigger>

          <TabsTrigger
            value="suppliers"
            className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs px-3.5 py-1.5 flex items-center gap-2 rounded-lg font-semibold"
          >
            <Truck className="size-3.5" />
            <span>Suppliers ({initialSuppliers.length})</span>
          </TabsTrigger>

          <TabsTrigger
            value="grns"
            className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs px-3.5 py-1.5 flex items-center gap-2 rounded-lg font-semibold"
          >
            <FileText className="size-3.5" />
            <span>GRNs ({initialGRNs.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="outline-none">
          <StockTab vehicles={initialVehicles} />
        </TabsContent>

        <TabsContent value="models" className="outline-none">
          <ModelsTab initialModels={initialModels} />
        </TabsContent>

        <TabsContent value="suppliers" className="outline-none">
          <SuppliersTab initialSuppliers={initialSuppliers} />
        </TabsContent>

        <TabsContent value="grns" className="outline-none">
          <GRNTab
            grns={initialGRNs}
            suppliers={initialSuppliers}
            branches={branches}
            models={initialModels}
          />
        </TabsContent>
      </Tabs>

      {/* Global Create GRN Dialog */}
      <CreateGRNDialog
        open={isCreateGRNOpen}
        onOpenChange={setIsCreateGRNOpen}
        suppliers={initialSuppliers}
        branches={branches}
        models={initialModels}
        onSuccess={() => {
          setActiveTab("stock")
          router.refresh()
        }}
      />
    </div>
  )
}
