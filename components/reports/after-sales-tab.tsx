"use client"

import * as React from "react"
import Link from "next/link"
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
  Wrench,
  Coins,
  ShieldCheck,
  Sparkles,
  Search,
  ExternalLink,
  Receipt,
  CheckCircle2,
  Calendar,
} from "lucide-react"
import { formatLKR } from "@/lib/currency"
import { AdvancedReportsData, ServiceRecordItem } from "@/app/actions/reports"

interface AfterSalesTabProps {
  data: AdvancedReportsData["afterSales"]
}

export function AfterSalesTab({ data }: AfterSalesTabProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")

  const filteredServices = React.useMemo(() => {
    return data.recentServices.filter((s) => {
      const matchesSearch =
        s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.customerPhone.includes(searchTerm) ||
        s.chassisNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.vehicleSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.branchName.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matchesSearch) return false

      if (typeFilter === "all") return true
      return s.serviceType.toLowerCase() === typeFilter.toLowerCase()
    })
  }, [data.recentServices, searchTerm, typeFilter])

  const renderServiceTypeBadge = (type: string) => {
    switch (type) {
      case "Paid":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold"
          >
            Paid Service
          </Badge>
        )
      case "Warranty":
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-semibold"
          >
            Warranty Claim
          </Badge>
        )
      default:
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs font-semibold"
          >
            Complimentary
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* 4 KPI Cards: Paid Service Revenue, Free Services, Warranty Claims, Total Orders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Paid Service Revenue */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Paid Service Revenue
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Coins className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
              {formatLKR(data.summary.totalPaidServiceRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Direct billing for routine maintenance & repairs
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Free Services Done */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-blue-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Free Services Done
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Sparkles className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400 font-mono">
              {data.summary.totalFreeServicesDone}{" "}
              <span className="text-sm font-normal text-muted-foreground">jobs</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Complimentary 5,000 / 10,000 km checkups
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Warranty Claims */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-amber-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Warranty Claims
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
              {data.summary.totalWarrantyClaims}{" "}
              <span className="text-sm font-normal text-muted-foreground">claims</span>
            </div>
            <p className="text-xs text-muted-foreground">
              OEM battery and electrical warranty repairs
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Total Workshop Volume */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-purple-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-purple-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Work Orders
            </span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Wrench className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
              {data.summary.totalServiceOrders}{" "}
              <span className="text-sm font-normal text-muted-foreground">orders</span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {formatLKR(data.summary.totalGrossCost)} combined labor & parts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Service Table Card */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary-foreground" />
                Workshop Service Records & After-Sales Ledger
              </CardTitle>
              <CardDescription className="text-xs">
                Complete audit trail of all vehicle maintenance jobs, costs, and technician job card links
              </CardDescription>
            </div>

            {/* Type Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "All Services" },
                { id: "paid", label: "Paid" },
                { id: "free", label: "Complimentary" },
                { id: "warranty", label: "Warranty" },
              ].map((filter) => (
                <Button
                  key={filter.id}
                  size="sm"
                  variant={typeFilter === filter.id ? "default" : "outline"}
                  className="h-7 px-2.5 text-xs font-medium"
                  onClick={() => setTypeFilter(filter.id)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="pt-2">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search customer, VIN, work description, or workshop..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredServices.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No service records found matching the current search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Service Date</TableHead>
                  <TableHead className="text-xs font-semibold">Customer</TableHead>
                  <TableHead className="text-xs font-semibold">Vehicle & VIN</TableHead>
                  <TableHead className="text-xs font-semibold">Workshop</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Type</TableHead>
                  <TableHead className="text-xs font-semibold">Description / Work Done</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Cost</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Out Date</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Job Card</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(service.serviceDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="font-semibold text-foreground">{service.customerName}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{service.customerPhone}</div>
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground">{service.vehicleSummary}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{service.chassisNumber}</div>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {service.branchName}
                    </TableCell>

                    <TableCell className="text-xs text-center">
                      {renderServiceTypeBadge(service.serviceType)}
                    </TableCell>

                    <TableCell className="text-xs text-foreground max-w-xs truncate" title={service.description}>
                      {service.description}
                    </TableCell>

                    <TableCell className="text-xs font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">
                      {formatLKR(service.totalCost)}
                    </TableCell>

                    <TableCell className="text-xs font-mono text-muted-foreground text-center">
                      {service.outDate ? (
                        new Date(service.outDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-center whitespace-nowrap">
                      <Link href={`/dashboard/services/${service.id}/job-card`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-primary hover:text-primary gap-1 whitespace-nowrap"
                          title="Print Customer Job Card"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>Job Card</span>
                        </Button>
                      </Link>
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
