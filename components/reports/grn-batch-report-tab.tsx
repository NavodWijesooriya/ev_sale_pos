"use client"

import * as React from "react"
import { matchesBatch } from "@/lib/batch"
import {
  ClipboardList,
  CheckCircle2,
  Warehouse,
  Bike,
  Search,
  Download,
  Receipt,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Tag,
} from "lucide-react"
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
import type { GRNBatchReportData, GRNBatchSummaryItem } from "@/app/actions/reports"

interface GRNBatchReportTabProps {
  data: GRNBatchReportData
}

export function GRNBatchReportTab({ data }: GRNBatchReportTabProps) {
  const [search, setSearch] = React.useState("")
  const [expandedBatches, setExpandedBatches] = React.useState<Record<string, boolean>>({})

  const { kpis, batches } = data

  const toggleBatch = (batchId: string) => {
    setExpandedBatches((prev) => ({
      ...prev,
      [batchId]: !prev[batchId],
    }))
  }

  const expandAll = () => {
    const all: Record<string, boolean> = {}
    batches.forEach((b) => {
      all[b.id] = true
    })
    setExpandedBatches(all)
  }

  const collapseAll = () => {
    setExpandedBatches({})
  }

  const filteredBatches = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return batches

    return batches.filter((b) => {
      const matchBatch =
        matchesBatch(q, b.grnNumber) ||
        b.grnNumber.toLowerCase().includes(q) ||
        b.supplierName.toLowerCase().includes(q) ||
        b.branchName.toLowerCase().includes(q)

      const matchBikes = b.vehicles.some(
        (v) =>
          (v.unitGrnNumber && v.unitGrnNumber.toLowerCase().includes(q)) ||
          matchesBatch(q, v.unitGrnNumber) ||
          v.chassisNumber.toLowerCase().includes(q) ||
          v.modelName.toLowerCase().includes(q) ||
          (v.buyerName && v.buyerName.toLowerCase().includes(q)),
      )

      return matchBatch || matchBikes
    })
  }, [batches, search])

  const exportGRNCSV = () => {
    const headers = [
      "GRN Batch Number",
      "Date Received",
      "Supplier",
      "Branch",
      "Unit GRN Code",
      "Chassis Number",
      "Model Brand",
      "Model Name",
      "Color",
      "Stock Status",
      "Buyer Name",
      "Invoice Number",
    ]

    const rows: string[] = []

    batches.forEach((b) => {
      const dateStr = new Date(b.dateReceived).toLocaleDateString()
      b.vehicles.forEach((v) => {
        rows.push(
          [
            `"${b.grnNumber}"`,
            `"${dateStr}"`,
            `"${b.supplierName}"`,
            `"${b.branchName}"`,
            `"${v.unitGrnNumber || "N/A"}"`,
            `"${v.chassisNumber}"`,
            `"${v.brand}"`,
            `"${v.modelName}"`,
            `"${v.color || "N/A"}"`,
            `"${v.status}"`,
            `"${v.buyerName || "N/A"}"`,
            `"${v.invoiceNumber || "N/A"}"`,
          ].join(","),
        )
      })
    })

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `grn_batches_report_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards (Requirement 4 Part B) */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {/* Total Batches */}
        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              GRN Batches
            </CardTitle>
            <ClipboardList className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold tracking-tight text-foreground">
              {kpis.totalBatchesCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Shipments received into system
            </p>
          </CardContent>
        </Card>

        {/* Total Units Received */}
        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Total Units Received
            </CardTitle>
            <Bike className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold tracking-tight text-blue-600">
              {kpis.totalUnitsReceived}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Individual vehicles registered
            </p>
          </CardContent>
        </Card>

        {/* Total Units Sold */}
        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Units Sold
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold tracking-tight text-emerald-600">
              {kpis.totalUnitsSold}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Delivered to end customers
            </p>
          </CardContent>
        </Card>

        {/* Total Remaining in Stock */}
        <Card className="rounded-xl border-border/70 shadow-xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Remaining in Stock
            </CardTitle>
            <Warehouse className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold tracking-tight text-amber-600">
              {kpis.totalUnitsRemaining}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Currently available for sale
            </p>
          </CardContent>
        </Card>

        {/* Overall Depletion Rate */}
        <Card className="rounded-xl border-primary/20 bg-primary/5 shadow-xs col-span-2 lg:col-span-1">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-primary">
              Fleet Depletion Rate
            </CardTitle>
            <TrendingUp className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold tracking-tight text-primary">
              {kpis.overallDepletionPercent}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Inventory turnover progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border bg-card/60">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search GRN (JM 01), Unit GRN (JM0101), VIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={expandAll}
            className="h-8 text-xs"
          >
            Expand All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
            className="h-8 text-xs"
          >
            Collapse All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportGRNCSV}
            className="h-8 text-xs gap-1.5"
            disabled={batches.length === 0}
          >
            <Download className="size-3.5" />
            Export GRN CSV
          </Button>
        </div>
      </div>

      {/* GRN Batches List */}
      <div className="space-y-4">
        {filteredBatches.map((batch) => {
          const isExpanded = Boolean(expandedBatches[batch.id])
          const dateStr = new Date(batch.dateReceived).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })

          return (
            <Card key={batch.id} className="rounded-2xl border-border/70 shadow-xs overflow-hidden">
              {/* Batch Header Row */}
              <div
                onClick={() => toggleBatch(batch.id)}
                className="p-4 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-foreground font-mono">
                        {batch.grnNumber}
                      </span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        Received: {dateStr}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {batch.branchName}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Supplier: <span className="font-medium text-foreground">{batch.supplierName}</span>
                    </p>
                  </div>
                </div>

                {/* Batch Metrics & Progress */}
                <div className="flex items-center gap-6">
                  {/* Counts */}
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                        Received
                      </span>
                      <span className="font-bold text-foreground text-sm font-mono">
                        {batch.totalUnitsReceived}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                        Sold
                      </span>
                      <span className="font-bold text-emerald-600 text-sm font-mono">
                        {batch.totalUnitsSold}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                        Remaining
                      </span>
                      <span className="font-bold text-amber-600 text-sm font-mono">
                        {batch.totalUnitsRemaining}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-28 space-y-1 hidden sm:block">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                      <span>Sold</span>
                      <span>{batch.depletionPercent}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${batch.depletionPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Collapsible Vehicle Inventory Sub-Table */}
              {isExpanded && (
                <div className="border-t">
                  <div className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="w-28">Unit GRN Code</TableHead>
                          <TableHead>Chassis Number (VIN)</TableHead>
                          <TableHead>EV Model</TableHead>
                          <TableHead>Color</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Buyer / Sale Info</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batch.vehicles.map((v) => (
                          <TableRow key={v.id} className="hover:bg-muted/20">
                            <TableCell className="font-mono font-bold text-xs text-primary whitespace-nowrap">
                              {v.unitGrnNumber ? (
                                <Badge variant="outline" className="font-mono font-bold text-xs bg-muted/40">
                                  {v.unitGrnNumber}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-foreground font-medium">
                              {v.chassisNumber}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-foreground">
                              {v.brand} {v.modelName}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {v.color || "Standard"}
                            </TableCell>
                            <TableCell>
                              {v.status === "Sold" ? (
                                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-xs font-semibold">
                                  Sold
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10 text-xs font-semibold">
                                  In Stock
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {v.status === "Sold" && v.buyerName ? (
                                <div>
                                  <span className="font-medium text-foreground">{v.buyerName}</span>
                                  {v.invoiceNumber && (
                                    <span className="text-[11px] text-muted-foreground block font-mono">
                                      Inv #{v.invoiceNumber}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">Available at Showroom</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}

                        {batch.vehicles.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="h-20 text-center text-xs text-muted-foreground">
                              No vehicles linked to this GRN batch.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </Card>
          )
        })}

        {filteredBatches.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground border rounded-2xl bg-card">
            No GRN batches found matching your search.
          </div>
        )}
      </div>
    </div>
  )
}
