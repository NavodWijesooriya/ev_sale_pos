"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Boxes,
  Search,
  Building2,
  Palette,
  CheckCircle2,
  Bike,
  BatteryCharging,
  Gauge,
  Clock,
  AlertTriangle,
  Zap,
  Download,
} from "lucide-react"
import { toast } from "sonner"
import { formatLKR } from "@/lib/currency"

export interface StockVehicleRecord {
  id: string
  chassisNumber: string
  motorNumber: string | null
  batterySerialNumber?: string | null
  warrantyPeriod?: string | null
  color: string | null
  purchasePrice: number
  status: string
  createdAt?: Date | string
  vehicleModel: {
    id: string
    brand: string
    modelName: string
    batteryCapacity: string | null
    range: string | null
    defaultPrice: number
  }
  branch: {
    id: string
    name: string
    location: string | null
  }
  grnItems?: {
    grn?: {
      grnNumber: string
      receivedDate: Date | string
    } | null
  }[]
}

interface StockTabProps {
  vehicles: StockVehicleRecord[]
}

export function StockTab({ vehicles }: StockTabProps) {
  const [search, setSearch] = React.useState("")
  const [selectedBranch, setSelectedBranch] = React.useState<string>("all")

  // Extract unique branches
  const branches = React.useMemo(() => {
    const map = new Map<string, string>()
    vehicles.forEach((v) => {
      if (v.branch) map.set(v.branch.id, v.branch.name)
    })
    return Array.from(map.entries())
  }, [vehicles])

  const filtered = React.useMemo(() => {
    return vehicles.filter((v) => {
      const q = search.toLowerCase()
      const matchesSearch =
        search === "" ||
        v.chassisNumber.toLowerCase().includes(q) ||
        (v.motorNumber && v.motorNumber.toLowerCase().includes(q)) ||
        v.vehicleModel.modelName.toLowerCase().includes(q) ||
        v.vehicleModel.brand.toLowerCase().includes(q) ||
        (v.color && v.color.toLowerCase().includes(q)) ||
        v.branch.name.toLowerCase().includes(q)

      const matchesBranch = selectedBranch === "all" || v.branch.id === selectedBranch

      return matchesSearch && matchesBranch
    })
  }, [vehicles, search, selectedBranch])

  const totalValuation = React.useMemo(() => {
    return filtered.reduce((sum, v) => sum + v.purchasePrice, 0)
  }, [filtered])

  const formatCurrency = (val: number) => {
    return formatLKR(val)
  }

  // Calculate Days in Stock from GRN received date or vehicle creation date
  const getDaysInStock = (vehicle: StockVehicleRecord) => {
    const intakeDate =
      vehicle.grnItems?.[0]?.grn?.receivedDate || vehicle.createdAt || new Date()

    const start = new Date(intakeDate).getTime()
    const now = Date.now()
    const days = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)))
    const formattedDate = new Date(intakeDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

    return { days, formattedDate }
  }

  const renderDaysBadge = (days: number, formattedDate: string) => {
    if (days <= 7) {
      return (
        <span
          title={`Intake date: ${formattedDate}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
        >
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {days === 0 ? "Today" : `${days}d in stock`} (Fresh)
        </span>
      )
    }
    if (days <= 30) {
      return (
        <span
          title={`Intake date: ${formattedDate}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30"
        >
          <Clock className="size-3" />
          {days}d in stock
        </span>
      )
    }
    if (days <= 60) {
      return (
        <span
          title={`Intake date: ${formattedDate}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
        >
          <AlertTriangle className="size-3" />
          {days}d in stock (Aging)
        </span>
      )
    }
    return (
      <span
        title={`Intake date: ${formattedDate}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30"
      >
        <AlertTriangle className="size-3" />
        {days}d in stock (&gt;60d)
      </span>
    )
  }

  // Client-side CSV Download function
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error("No stock records found to export.")
      return
    }

    const headers = [
      "Chassis Number (VIN)",
      "Motor Number",
      "Brand",
      "Model Name",
      "Battery Capacity",
      "Range",
      "Branch Name",
      "Color",
      "Purchase Cost (LKR)",
      "Days in Stock",
      "Intake Date",
      "Status",
    ]

    const csvRows = filtered.map((v) => {
      const { days, formattedDate } = getDaysInStock(v)
      return [
        `"${v.chassisNumber.replace(/"/g, '""')}"`,
        `"${(v.motorNumber || "Unassigned").replace(/"/g, '""')}"`,
        `"${v.vehicleModel.brand.replace(/"/g, '""')}"`,
        `"${v.vehicleModel.modelName.replace(/"/g, '""')}"`,
        `"${(v.vehicleModel.batteryCapacity || "N/A").replace(/"/g, '""')}"`,
        `"${(v.vehicleModel.range || "N/A").replace(/"/g, '""')}"`,
        `"${v.branch.name.replace(/"/g, '""')}"`,
        `"${(v.color || "Standard").replace(/"/g, '""')}"`,
        `"${formatLKR(v.purchasePrice)}"`,
        days,
        `"${formattedDate}"`,
        `"${v.status}"`,
      ].join(",")
    })

    const csvString = [headers.join(","), ...csvRows].join("\r\n")
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const today = new Date().toISOString().split("T")[0]

    link.setAttribute("href", url)
    link.setAttribute("download", `ev_stock_inventory_${today}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`Exported ${filtered.length} stock vehicles to CSV!`)
  }

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Boxes className="size-4 text-emerald-500" />
                Live In-Stock EV Bikes
              </CardTitle>
              <Badge
                variant="outline"
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
              >
                {filtered.length} Bikes In Stock
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Physical bike units with verified chassis numbers, motor IDs, battery specifications, and stock aging metrics.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Branch Filter */}
            {branches.length > 1 && (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none focus:ring-1 focus:ring-ring dark:bg-input/30"
              >
                <option value="all" className="bg-popover text-popover-foreground">
                  All Showrooms
                </option>
                {branches.map(([id, name]) => (
                  <option key={id} value={id} className="bg-popover text-popover-foreground">
                    {name}
                  </option>
                ))}
              </select>
            )}

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search VIN, Motor #, Model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-input bg-muted/30 placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Export to Excel / CSV Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 text-xs font-medium border-input hover:bg-muted"
            >
              <Download className="mr-1.5 size-3.5 text-blue-500" />
              Export to Excel / CSV
            </Button>
          </div>
        </div>

        {/* Inventory Summary Pill */}
        <div className="mt-3 flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border text-xs">
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>
              Total Units: <strong className="text-foreground">{filtered.length}</strong>
            </span>
            <span>
              Total Procurement Cost:{" "}
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(totalValuation)}
              </strong>
            </span>
          </div>

          <span className="text-[11px] text-muted-foreground hidden sm:inline-flex items-center gap-1">
            <CheckCircle2 className="size-3 text-emerald-500" />
            Verified GRN Stock
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                <TableHead className="py-2.5 pl-4">Chassis (VIN)</TableHead>
                <TableHead className="py-2.5">Motor Number</TableHead>
                <TableHead className="py-2.5">Model & Brand</TableHead>
                <TableHead className="py-2.5">Battery Capacity & Range</TableHead>
                <TableHead className="py-2.5">Branch Name</TableHead>
                <TableHead className="py-2.5">Color</TableHead>
                <TableHead className="py-2.5">Cost</TableHead>
                <TableHead className="py-2.5 text-center">Days in Stock</TableHead>
                <TableHead className="py-2.5 pr-4 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-28 text-center text-xs text-muted-foreground">
                    No in-stock EV bikes found matching your criteria. Use "Create GRN" to intake new bike stock.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((v) => {
                  const { days, formattedDate } = getDaysInStock(v)

                  return (
                    <TableRow key={v.id} className="hover:bg-muted/30 transition-colors">
                      {/* 1. Chassis Number (VIN) */}
                      <TableCell className="py-3 pl-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-mono font-bold text-foreground tracking-wide">
                            {v.chassisNumber}
                          </span>
                          {v.batterySerialNumber && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5" title="Battery Serial Number">
                              Bat: {v.batterySerialNumber}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* 2. Motor Number */}
                      <TableCell className="py-3">
                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                          <Zap className="size-3 text-amber-500 shrink-0" />
                          {v.motorNumber || "Unassigned"}
                        </span>
                      </TableCell>

                      {/* 3. Model & Brand */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Bike className="size-3.5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-foreground">
                              {v.vehicleModel.modelName}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">
                              {v.vehicleModel.brand}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* 4. Battery Capacity & Range */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <BatteryCharging className="size-3 shrink-0" />
                            {v.vehicleModel.batteryCapacity || "N/A"}
                          </span>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-medium">
                            <Gauge className="size-3 shrink-0" />
                            {v.vehicleModel.range || "N/A"}
                          </span>
                        </div>
                      </TableCell>

                      {/* 5. Branch Name */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5 text-xs text-foreground">
                          <Building2 className="size-3.5 text-blue-500 shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground leading-tight">
                              {v.branch.name}
                            </span>
                            {v.branch.location && (
                              <span className="text-[10px] text-muted-foreground leading-tight">
                                {v.branch.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* 6. Color */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5 text-xs text-foreground">
                          <Palette className="size-3 text-muted-foreground shrink-0" />
                          <span>{v.color || "Standard"}</span>
                        </div>
                      </TableCell>

                      {/* 7. Purchase Cost */}
                      <TableCell className="py-3 text-xs font-semibold text-foreground font-mono">
                        {formatCurrency(v.purchasePrice)}
                      </TableCell>

                      {/* 8. Days in Stock Badge */}
                      <TableCell className="py-3 text-center">
                        {renderDaysBadge(days, formattedDate)}
                      </TableCell>

                      {/* 9. Status */}
                      <TableCell className="py-3 pr-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          InStock
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
