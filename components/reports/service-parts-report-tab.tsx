"use client"

import * as React from "react"
import {
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Coins,
  Package,
  Bike,
  Search,
  Download,
  ExternalLink,
  ShieldAlert,
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatLKR } from "@/lib/currency"
import type { ServiceAndPartsReportData } from "@/app/actions/reports"

interface ServicePartsReportTabProps {
  data: ServiceAndPartsReportData
}

export function ServicePartsReportTab({ data }: ServicePartsReportTabProps) {
  const [search, setSearch] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL")

  const { kpis, serviceJobs, lowStockParts } = data

  const filteredJobs = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return serviceJobs.filter((job) => {
      const matchesType = typeFilter === "ALL" || job.serviceType === typeFilter
      if (!matchesType) return false

      if (!q) return true
      return (
        job.customerName.toLowerCase().includes(q) ||
        job.customerPhone.toLowerCase().includes(q) ||
        job.vehicleSummary.toLowerCase().includes(q) ||
        job.chassisNumber.toLowerCase().includes(q) ||
        (job.registrationNumber && job.registrationNumber.toLowerCase().includes(q)) ||
        (job.technicianName && job.technicianName.toLowerCase().includes(q))
      )
    })
  }, [serviceJobs, search, typeFilter])

  const exportJobsCSV = () => {
    const headers = [
      "In Date",
      "Out Date",
      "Duration (Days)",
      "In Mileage",
      "Next Service Mileage",
      "Customer Name",
      "Phone",
      "Vehicle Model",
      "Chassis Number",
      "Registration Number",
      "Service Type",
      "Technician",
      "Parts Used",
      "Labor Charge (Rs.)",
      "Parts Cost (Rs.)",
      "Total Cost (Rs.)",
      "Status",
    ]

    const rows = filteredJobs.map((j) => {
      const inDateFormatted = new Date(j.inDate).toLocaleDateString()
      const outDateFormatted = j.outDate ? new Date(j.outDate).toLocaleDateString() : "In Workshop"
      const partsDesc = j.partsUsed.map((p) => `${p.partName} x${p.quantity}`).join("; ")

      return [
        `"${inDateFormatted}"`,
        `"${outDateFormatted}"`,
        j.durationDays,
        `"${j.inMileage || "N/A"}"`,
        `"${j.nextServiceMileage || "N/A"}"`,
        `"${j.customerName}"`,
        `"${j.customerPhone}"`,
        `"${j.vehicleSummary}"`,
        `"${j.chassisNumber}"`,
        `"${j.registrationNumber || "N/A"}"`,
        `"${j.serviceType}"`,
        `"${j.technicianName || "N/A"}"`,
        `"${partsDesc || "None"}"`,
        j.laborCost,
        j.partsCost,
        j.totalCost,
        `"${j.status}"`,
      ].join(",")
    })

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `service_jobs_report_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards (Requirement 4 Part A) */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {/* Total Completed Jobs */}
        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Completed Jobs
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold tracking-tight text-foreground">
              {kpis.totalCompletedJobs}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              From arrival to departure
            </p>
          </CardContent>
        </Card>

        {/* Labor Revenue */}
        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Labor Revenue
            </CardTitle>
            <Wrench className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold tracking-tight text-blue-600">
              {formatLKR(kpis.totalLaborRevenue)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Technician service fees
            </p>
          </CardContent>
        </Card>

        {/* Spare Parts Revenue */}
        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Parts Revenue
            </CardTitle>
            <Package className="size-4 text-violet-600" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold tracking-tight text-violet-600">
              {formatLKR(kpis.totalPartsRevenue)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Spare parts billed
            </p>
          </CardContent>
        </Card>

        {/* Total Service Revenue */}
        <Card className="rounded-xl border-primary/20 bg-primary/5 shadow-xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-primary">
              Total After-Sales
            </CardTitle>
            <Coins className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold tracking-tight text-primary">
              {formatLKR(kpis.totalOverallServiceRevenue)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Labor + spare parts revenue
            </p>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="rounded-xl border-amber-500/20 bg-amber-500/5 shadow-xs col-span-2 lg:col-span-1">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Low-Stock Parts
            </CardTitle>
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
              {kpis.lowStockPartsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Items at or below 5 units
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 1: COMPLETED SERVICE JOBS LEDGER */}
      <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/20 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Completed Service &amp; Maintenance Jobs</CardTitle>
              <CardDescription className="text-xs">
                Detailed record of vehicle arrival, departure, mileage, technician, and parts billing
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search customer, chassis, plate..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 w-44 text-xs bg-background"
                />
              </div>

              <div className="flex items-center gap-1">
                {(["ALL", "Paid", "Free", "Warranty"] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={typeFilter === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter(t)}
                    className="h-8 text-xs px-2.5"
                  >
                    {t}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={exportJobsCSV}
                className="h-8 text-xs gap-1.5"
                disabled={filteredJobs.length === 0}
              >
                <Download className="size-3.5" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-28">Arrival (In)</TableHead>
                  <TableHead className="w-28">Departure (Out)</TableHead>
                  <TableHead>Mileage (In / Next)</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle &amp; Plate</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Spare Parts Used</TableHead>
                  <TableHead className="text-right">Labor (Rs.)</TableHead>
                  <TableHead className="text-right">Parts (Rs.)</TableHead>
                  <TableHead className="text-right font-bold text-foreground">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job) => {
                  const inFormatted = new Date(job.inDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                  const outFormatted = job.outDate
                    ? new Date(job.outDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "In Workshop"

                  return (
                    <TableRow key={job.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {inFormatted}
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {job.outDate ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            {outFormatted} {job.durationDays > 0 ? `(${job.durationDays}d)` : ""}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-amber-600">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="text-foreground">{job.inMileage ? `${job.inMileage} km` : "N/A"}</div>
                        {job.nextServiceMileage && (
                          <div className="text-[10px] text-muted-foreground">
                            Next: {job.nextServiceMileage} km
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs text-foreground">{job.customerName}</div>
                        <div className="text-[11px] text-muted-foreground">{job.customerPhone}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs text-foreground flex items-center gap-1">
                          <Bike className="size-3 text-muted-foreground shrink-0" />
                          <span>{job.vehicleSummary}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {job.registrationNumber ? (
                            <Badge variant="secondary" className="px-1 py-0 text-[10px] font-bold">
                              {job.registrationNumber}
                            </Badge>
                          ) : null}
                          <span>VIN: {job.chassisNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            job.serviceType === "Paid"
                              ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs"
                              : job.serviceType === "Free"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs"
                              : "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs"
                          }
                        >
                          {job.serviceType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {job.partsUsed.length > 0 ? (
                          <div className="space-y-0.5">
                            {job.partsUsed.map((p, idx) => (
                              <div key={idx} className="text-[11px] text-muted-foreground">
                                <span className="font-medium text-foreground">{p.partName}</span> (x{p.quantity})
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs font-mono">
                        {job.laborCost > 0 ? formatLKR(job.laborCost) : "-"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs font-mono">
                        {job.partsCost > 0 ? formatLKR(job.partsCost) : "-"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs font-bold text-foreground">
                        {formatLKR(job.totalCost)}
                      </TableCell>
                    </TableRow>
                  )
                })}

                {filteredJobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="h-32 text-center text-sm text-muted-foreground">
                      No service records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: LOW-STOCK SPARE PARTS ALERT */}
      <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-amber-500/5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Low-Stock Spare Parts Inventory Alert</CardTitle>
                <CardDescription className="text-xs">
                  Critical stock replenishment needed for workshop operations
                </CardDescription>
              </div>
            </div>

            <Link href="/dashboard/services/spare-parts">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <span>Manage Parts Inventory</span>
                <ExternalLink className="size-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Part Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Part Number / Code</TableHead>
                  <TableHead className="text-center">Current Stock</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Stock Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockParts.slice(0, 15).map((part) => (
                  <TableRow key={part.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-xs text-foreground">
                      {part.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {part.sku}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {part.partNumber || "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={part.isCritical ? "destructive" : "outline"}
                        className={
                          part.isCritical
                            ? "font-mono font-bold text-xs"
                            : "font-mono font-semibold text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10"
                        }
                      >
                        {part.stockQuantity} {part.stockQuantity === 1 ? "unit" : "units"} remaining
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs font-mono">
                      {formatLKR(part.price)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs font-bold font-mono text-foreground">
                      {formatLKR(part.totalValue)}
                    </TableCell>
                  </TableRow>
                ))}

                {lowStockParts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-sm text-emerald-600">
                      All spare parts inventory levels are healthy (above 5 units).
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
