"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  Search,
  Download,
  Calendar,
  User,
  Bike,
  Wrench,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building,
  Printer,
  FileText,
} from "lucide-react"
import { ServiceType } from "@prisma/client"

export interface ServiceRecordRow {
  id: string
  serviceDate: Date | string
  nextServiceDueDate?: Date | string | null
  serviceType: ServiceType
  description?: string | null
  totalCost: number
  customer: {
    id: string
    name: string
    phone: string
    nic?: string | null
    email?: string | null
  }
  branch: {
    id: string
    name: string
    location?: string | null
  }
  vehicle: {
    id: string
    chassisNumber: string
    motorNumber?: string | null
    batterySerialNumber?: string | null
    warrantyPeriod?: string | null
    vehicleModel: {
      brand: string
      modelName: string
    }
  }
}

interface ServiceHistoryTableProps {
  records: ServiceRecordRow[]
}

export function ServiceHistoryTable({ records }: ServiceHistoryTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("ALL")

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !q ||
        r.customer.name.toLowerCase().includes(q) ||
        r.customer.phone.toLowerCase().includes(q) ||
        (r.customer.nic && r.customer.nic.toLowerCase().includes(q)) ||
        r.vehicle.chassisNumber.toLowerCase().includes(q) ||
        (r.vehicle.batterySerialNumber &&
          r.vehicle.batterySerialNumber.toLowerCase().includes(q)) ||
        r.vehicle.vehicleModel.brand.toLowerCase().includes(q) ||
        r.vehicle.vehicleModel.modelName.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        r.branch.name.toLowerCase().includes(q)

      const matchesType = typeFilter === "ALL" || r.serviceType === typeFilter

      return matchesSearch && matchesType
    })
  }, [records, searchQuery, typeFilter])

  // Badge renderer for ServiceType
  const renderServiceTypeBadge = (type: ServiceType) => {
    switch (type) {
      case ServiceType.Free:
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold text-xs gap-1"
          >
            <CheckCircle2 className="size-3" />
            Free Service
          </Badge>
        )
      case ServiceType.Warranty:
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold text-xs gap-1"
          >
            <ShieldCheck className="size-3" />
            Warranty Claim
          </Badge>
        )
      case ServiceType.Paid:
        return (
          <Badge
            variant="outline"
            className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 font-semibold text-xs gap-1"
          >
            <Wrench className="size-3" />
            Paid Service
          </Badge>
        )
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  // Next Due Date status calculator
  const renderDueDateStatus = (dueDate?: Date | string | null) => {
    if (!dueDate) return <span className="text-muted-foreground text-xs">—</span>

    const due = new Date(dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)

    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const formattedDate = due.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })

    if (diffDays < 0) {
      return (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-foreground">{formattedDate}</span>
          <span className="text-[10px] font-bold text-destructive flex items-center gap-1">
            <AlertTriangle className="size-2.5" />
            Overdue ({Math.abs(diffDays)}d ago)
          </span>
        </div>
      )
    }

    if (diffDays <= 30) {
      return (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-foreground">{formattedDate}</span>
          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Clock className="size-2.5" />
            Due in {diffDays} days
          </span>
        </div>
      )
    }

    return (
      <div className="flex flex-col">
        <span className="font-semibold text-xs text-foreground">{formattedDate}</span>
        <span className="text-[10px] text-muted-foreground">In {diffDays} days</span>
      </div>
    )
  }

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return

    const headers = [
      "Job ID",
      "Date",
      "Customer Name",
      "Customer Phone",
      "Chassis Number (VIN)",
      "Battery Serial",
      "Vehicle Model",
      "Service Type",
      "Cost ($)",
      "Next Due Date",
      "Description",
      "Branch",
    ]

    const rows = filteredRecords.map((r) => [
      `"${r.id}"`,
      `"${new Date(r.serviceDate).toLocaleDateString()}"`,
      `"${r.customer.name}"`,
      `"${r.customer.phone}"`,
      `"${r.vehicle.chassisNumber}"`,
      `"${r.vehicle.batterySerialNumber || ""}"`,
      `"${r.vehicle.vehicleModel.brand} ${r.vehicle.vehicleModel.modelName}"`,
      `"${r.serviceType}"`,
      r.totalCost,
      `"${r.nextServiceDueDate ? new Date(r.nextServiceDueDate).toLocaleDateString() : ""}"`,
      `"${(r.description || "").replace(/"/g, '""')}"`,
      `"${r.branch.name}"`,
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `ev_service_records_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Wrench className="size-5 text-primary" />
              After-Sales & Maintenance Service History
            </CardTitle>
            <CardDescription className="text-xs">
              Complete chronological audit trail of vehicle maintenance, free inspections, and warranty claims
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredRecords.length === 0}
              className="gap-2 text-xs font-semibold h-9"
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by Chassis VIN, Battery S/N, customer, phone, or work notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            {["ALL", "Free", "Warranty", "Paid"].map((type) => (
              <Button
                key={type}
                type="button"
                variant={typeFilter === type ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(type)}
                className="h-8 text-xs font-semibold"
              >
                {type === "ALL" ? "All Types" : type}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border/60">
                <TableHead className="font-semibold text-xs">Service Date</TableHead>
                <TableHead className="font-semibold text-xs">Customer Profile</TableHead>
                <TableHead className="font-semibold text-xs">EV Bike / Battery S/N</TableHead>
                <TableHead className="font-semibold text-xs">Service Type</TableHead>
                <TableHead className="font-semibold text-xs">Work Description</TableHead>
                <TableHead className="font-semibold text-xs">Workshop Branch</TableHead>
                <TableHead className="font-semibold text-xs">Next Due Date</TableHead>
                <TableHead className="font-semibold text-xs text-right">Cost</TableHead>
                <TableHead className="font-semibold text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <Wrench className="size-8 text-muted-foreground/40 mb-1" />
                      <p className="font-semibold text-sm">No service records found</p>
                      <p className="text-xs">
                        {searchQuery || typeFilter !== "ALL"
                          ? "Try adjusting your search query or filters"
                          : "Log your first service or warranty job using the form above."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((r) => {
                  const formattedDate = new Date(r.serviceDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })

                  return (
                    <TableRow key={r.id} className="hover:bg-muted/30 transition-colors border-border/40">
                      {/* Date */}
                      <TableCell className="align-top py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-foreground">{formattedDate}</span>
                          <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                            ID: {r.id.slice(0, 8)}...
                          </span>
                        </div>
                      </TableCell>

                      {/* Customer */}
                      <TableCell className="align-top py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-foreground">{r.customer.name}</span>
                          <span className="text-xs font-mono text-muted-foreground">{r.customer.phone}</span>
                          {r.customer.nic && (
                            <span className="text-[11px] text-muted-foreground">NIC: {r.customer.nic}</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Vehicle & Battery Serial */}
                      <TableCell className="align-top py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-foreground">
                            {r.vehicle.vehicleModel.brand} {r.vehicle.vehicleModel.modelName}
                          </span>
                          <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                            {r.vehicle.chassisNumber}
                          </span>
                          {r.vehicle.batterySerialNumber && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Bat: {r.vehicle.batterySerialNumber}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Service Type */}
                      <TableCell className="align-top py-3.5">
                        {renderServiceTypeBadge(r.serviceType)}
                      </TableCell>

                      {/* Description */}
                      <TableCell className="align-top py-3.5 max-w-xs">
                        <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                          {r.description || "Routine Inspection"}
                        </p>
                      </TableCell>

                      {/* Workshop Branch */}
                      <TableCell className="align-top py-3.5">
                        <span className="text-xs text-foreground font-medium flex items-center gap-1">
                          <Building className="size-3 text-muted-foreground shrink-0" />
                          {r.branch.name}
                        </span>
                      </TableCell>

                      {/* Next Due Date */}
                      <TableCell className="align-top py-3.5">
                        {renderDueDateStatus(r.nextServiceDueDate)}
                      </TableCell>

                      {/* Cost */}
                      <TableCell className="align-top py-3.5 text-right font-mono font-bold text-sm">
                        {r.totalCost === 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                            $0.00 (Covered)
                          </span>
                        ) : (
                          `$${r.totalCost.toLocaleString()}`
                        )}
                      </TableCell>

                      {/* Action: Print Job Card */}
                      <TableCell className="align-top py-3.5 text-right whitespace-nowrap">
                        <Link href={`/dashboard/services/${r.id}/job-card`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all whitespace-nowrap"
                            title="Print Customer Service Job Card"
                          >
                            <Printer className="size-3.5" />
                            Print Job Card
                          </Button>
                        </Link>
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

