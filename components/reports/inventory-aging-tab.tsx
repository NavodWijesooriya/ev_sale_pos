"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Warehouse,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Search,
  DollarSign,
  Bike,
  Filter,
} from "lucide-react"
import { AdvancedReportsData, InStockVehicleAgingItem } from "@/app/actions/reports"

interface InventoryAgingTabProps {
  data: AdvancedReportsData["inventoryAging"]
}

export function InventoryAgingTab({ data }: InventoryAgingTabProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedTier, setSelectedTier] = React.useState<string>("all")

  // Filter vehicles by search term and aging tier
  const filteredVehicles = React.useMemo(() => {
    return data.vehicles.filter((v) => {
      const matchesSearch =
        v.chassisNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.color && v.color.toLowerCase().includes(searchTerm.toLowerCase()))

      if (!matchesSearch) return false

      if (selectedTier === "all") return true
      if (selectedTier === "critical") return v.daysInStock > 90
      if (selectedTier === "warning") return v.daysInStock > 60 && v.daysInStock <= 90
      if (selectedTier === "aging") return v.daysInStock > 30 && v.daysInStock <= 60
      if (selectedTier === "fresh") return v.daysInStock <= 30
      return true
    })
  }, [data.vehicles, searchTerm, selectedTier])

  const renderAgingBadge = (days: number) => {
    if (days > 90) {
      return (
        <Badge
          variant="outline"
          className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 font-bold text-xs gap-1 py-0.5"
        >
          <AlertOctagon className="h-3 w-3 shrink-0" />
          {days} Days (Critical)
        </Badge>
      )
    }
    if (days > 60) {
      return (
        <Badge
          variant="outline"
          className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 font-bold text-xs gap-1 py-0.5"
        >
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {days} Days (Warning)
        </Badge>
      )
    }
    if (days > 30) {
      return (
        <Badge
          variant="outline"
          className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium text-xs gap-1 py-0.5"
        >
          <Clock className="h-3 w-3 shrink-0" />
          {days} Days (Aging)
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium text-xs gap-1 py-0.5"
      >
        <CheckCircle2 className="h-3 w-3 shrink-0" />
        {days} Days (Fresh)
      </Badge>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* KPI Cards: Inventory Aging & Capital Allocation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Stock */}
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total In Stock
            </span>
            <div className="text-2xl font-black text-foreground font-mono">
              {data.summary.totalInStock}{" "}
              <span className="text-xs font-normal text-muted-foreground">EVs</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              ${data.summary.totalTiedCapital.toLocaleString()} tied capital
            </p>
          </CardContent>
        </Card>

        {/* Critical (>90 Days) */}
        <Card className="border-red-500/30 bg-red-500/5 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                Critical (&gt;90d)
              </span>
              <AlertOctagon className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">
              {data.summary.criticalOver90Count}{" "}
              <span className="text-xs font-normal text-muted-foreground">units</span>
            </div>
            <p className="text-[11px] text-red-600/80 dark:text-red-400/80 font-mono">
              ${data.summary.criticalOver90Capital.toLocaleString()} at risk
            </p>
          </CardContent>
        </Card>

        {/* Warning (60-90 Days) */}
        <Card className="border-orange-500/30 bg-orange-500/5 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                Warning (60-90d)
              </span>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono">
              {data.summary.warningOver60Count}{" "}
              <span className="text-xs font-normal text-muted-foreground">units</span>
            </div>
            <p className="text-[11px] text-orange-600/80 dark:text-orange-400/80 font-mono">
              ${data.summary.warningOver60Capital.toLocaleString()} locked
            </p>
          </CardContent>
        </Card>

        {/* Aging (30-60 Days) */}
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Aging (30-60d)
              </span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {data.summary.agingOver30Count}{" "}
              <span className="text-xs font-normal text-muted-foreground">units</span>
            </div>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-mono">
              ${data.summary.agingOver30Capital.toLocaleString()} monitoring
            </p>
          </CardContent>
        </Card>

        {/* Fresh (<30 Days) */}
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Fresh (&lt;30d)
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {data.summary.freshCount}{" "}
              <span className="text-xs font-normal text-muted-foreground">units</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Avg Aging: <strong className="font-mono text-foreground">{data.summary.averageDaysInStock} days</strong>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar & Search */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-amber-500" />
                Dead Stock & EV Bike Inventory Aging Analysis
              </CardTitle>
              <CardDescription className="text-xs">
                Monitor unsold floor bike inventory to prevent capital stagnation and discount depreciation
              </CardDescription>
            </div>

            {/* Aging Tier Filter Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "All Stock", count: data.vehicles.length },
                { id: "critical", label: ">90d Critical", count: data.summary.criticalOver90Count },
                { id: "warning", label: "60-90d Warning", count: data.summary.warningOver60Count },
                { id: "aging", label: "30-60d Aging", count: data.summary.agingOver30Count },
                { id: "fresh", label: "<30d Fresh", count: data.summary.freshCount },
              ].map((tier) => (
                <Button
                  key={tier.id}
                  size="sm"
                  variant={selectedTier === tier.id ? "default" : "outline"}
                  className="h-7 px-2.5 text-xs gap-1"
                  onClick={() => setSelectedTier(tier.id)}
                >
                  <span>{tier.label}</span>
                  <span className="opacity-70 font-mono text-[10px]">({tier.count})</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="pt-2">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by Chassis #, Model, Brand, Branch, or Color..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredVehicles.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No EV bikes match the selected aging filter or search term.
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Chassis #</TableHead>
                  <TableHead className="text-xs font-semibold">EV Bike Model</TableHead>
                  <TableHead className="text-xs font-semibold">Color</TableHead>
                  <TableHead className="text-xs font-semibold">Showroom Branch</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Acquisition Cost</TableHead>
                  <TableHead className="text-xs font-semibold">In Stock Since</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Days in Stock</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="text-xs font-mono font-bold text-foreground">
                      {vehicle.chassisNumber}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-semibold text-foreground">
                        {vehicle.brand} {vehicle.modelName}
                      </div>
                      {vehicle.motorNumber && (
                        <div className="text-[11px] text-muted-foreground font-mono">
                          Motor: {vehicle.motorNumber}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {vehicle.color || "Standard"}
                    </TableCell>
                    <TableCell className="text-xs text-foreground">
                      {vehicle.branchName}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold text-foreground">
                      ${vehicle.purchasePrice.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {new Date(vehicle.inStockSince).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-xs text-center">
                      {renderAgingBadge(vehicle.daysInStock)}
                    </TableCell>
                    <TableCell className="text-xs text-center">
                      <Badge variant="outline" className="text-[11px] bg-primary/5 text-primary border-primary/20">
                        {vehicle.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      </Card>
    </div>
  )
}

