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
  FileCheck2,
  AlertCircle,
  Clock,
  Search,
  ExternalLink,
  ShieldAlert,
  FileText,
  User,
  Bike,
  CheckCircle2,
} from "lucide-react"
import { AdvancedReportsData, PendingDMTItem } from "@/app/actions/reports"

interface PendingDMTTabProps {
  data: AdvancedReportsData["pendingDMT"]
}

export function PendingDMTTab({ data }: PendingDMTTabProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [filterMissing, setFilterMissing] = React.useState<string>("all")

  const filteredRegistrations = React.useMemo(() => {
    return data.registrations.filter((reg) => {
      const matchesSearch =
        reg.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.customerPhone.includes(searchTerm) ||
        (reg.customerNIC && reg.customerNIC.toLowerCase().includes(searchTerm.toLowerCase())) ||
        reg.chassisNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.vehicleSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.branchName.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matchesSearch) return false

      if (filterMissing === "all") return true
      if (filterMissing === "mta2") return !reg.hasMTA2
      if (filterMissing === "nic") return !reg.hasNIC
      if (filterMissing === "photos") return !reg.hasPhotos
      if (filterMissing === "tin") return !reg.hasTIN
      if (filterMissing === "complete") return reg.missingDocuments.length === 0
      return true
    })
  }, [data.registrations, searchTerm, filterMissing])

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Processing":
        return (
          <Badge
            variant="outline"
            className="bg-primary/15 text-primary border-primary/30 text-xs font-semibold gap-1"
          >
            <Clock className="h-3 w-3 shrink-0" />
            At DMT Office
          </Badge>
        )
      case "DocumentsCollected":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs font-semibold gap-1"
          >
            <FileCheck2 className="h-3 w-3 shrink-0" />
            Docs Ready
          </Badge>
        )
      default:
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-semibold gap-1"
          >
            <AlertCircle className="h-3 w-3 shrink-0" />
            Pending
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* KPI Cards: Document Compliance & Bottlenecks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Pending */}
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Incomplete
            </span>
            <div className="text-2xl font-black text-foreground font-mono">
              {data.summary.totalPending}{" "}
              <span className="text-xs font-normal text-muted-foreground">files</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Awaiting DMT number plates & book
            </p>
          </CardContent>
        </Card>

        {/* Missing MTA2 Form */}
        <Card className="border-red-500/30 bg-red-500/5 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                Missing MTA2
              </span>
              <FileText className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">
              {data.summary.missingMTA2Count}{" "}
              <span className="text-xs font-normal text-muted-foreground">forms</span>
            </div>
            <p className="text-[11px] text-red-600/80 dark:text-red-400/80">
              Transfer document required
            </p>
          </CardContent>
        </Card>

        {/* Missing NIC Copy */}
        <Card className="border-orange-500/30 bg-orange-500/5 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                Missing NIC
              </span>
              <User className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono">
              {data.summary.missingNICCount}{" "}
              <span className="text-xs font-normal text-muted-foreground">copies</span>
            </div>
            <p className="text-[11px] text-orange-600/80 dark:text-orange-400/80">
              Identity proof needed
            </p>
          </CardContent>
        </Card>

        {/* Missing Photos / TIN */}
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Photos / TIN
              </span>
              <ShieldAlert className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {data.summary.missingPhotosCount + data.summary.missingTINCount}{" "}
              <span className="text-xs font-normal text-muted-foreground">items</span>
            </div>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
              Tax / photo compliance
            </p>
          </CardContent>
        </Card>

        {/* Processing at DMT */}
        <Card className="border-primary/30 bg-primary/5 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                Processing
              </span>
              <Clock className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="text-2xl font-black text-primary font-mono">
              {data.summary.processingCount}{" "}
              <span className="text-xs font-normal text-muted-foreground">submitted</span>
            </div>
            <p className="text-[11px] text-primary-foreground/80 dark:text-purple-400/80">
              Awaiting plate assignment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary-foreground" />
                Department of Motor Traffic (DMT) Registration Tracker
              </CardTitle>
              <CardDescription className="text-xs">
                Sri Lanka DMT electric bike registration compliance, documentation audit, and status monitoring
              </CardDescription>
            </div>

            {/* Missing Document Filter Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "All Pending" },
                { id: "mta2", label: "Missing MTA2" },
                { id: "nic", label: "Missing NIC" },
                { id: "photos", label: "Missing Photos" },
                { id: "tin", label: "Missing TIN" },
                { id: "complete", label: "Docs Ready" },
              ].map((btn) => (
                <Button
                  key={btn.id}
                  size="sm"
                  variant={filterMissing === btn.id ? "default" : "outline"}
                  className="h-7 px-2.5 text-xs font-medium"
                  onClick={() => setFilterMissing(btn.id)}
                >
                  {btn.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="pt-2">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by Customer, NIC, Phone, VIN, or Branch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredRegistrations.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500/40 mb-2" />
              <p className="font-semibold text-foreground">All DMT Registrations Clear</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mt-1">
                No incomplete DMT registration files matching this filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Sale Date</TableHead>
                  <TableHead className="text-xs font-semibold">Customer</TableHead>
                  <TableHead className="text-xs font-semibold">EV Bike & Chassis #</TableHead>
                  <TableHead className="text-xs font-semibold">Branch</TableHead>
                  <TableHead className="text-xs font-semibold">Missing Documents</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.map((reg) => (
                  <TableRow key={reg.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(reg.saleDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="font-semibold text-foreground">{reg.customerName}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {reg.customerPhone} {reg.customerNIC ? `• NIC: ${reg.customerNIC}` : ""}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground">{reg.vehicleSummary}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        {reg.chassisNumber}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {reg.branchName}
                    </TableCell>

                    <TableCell className="text-xs">
                      {reg.missingDocuments.length === 0 ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-medium gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          All Documents Collected
                        </Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {reg.missingDocuments.map((doc) => (
                            <Badge
                              key={doc}
                              variant="outline"
                              className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] font-mono"
                            >
                              Missing: {doc}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-center">
                      {renderStatusBadge(reg.status)}
                    </TableCell>

                    <TableCell className="text-xs text-right whitespace-nowrap">
                      <Link href={`/dashboard/sales/${reg.saleId}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-primary hover:text-primary gap-1 whitespace-nowrap"
                        >
                          <span>Manage</span>
                          <ExternalLink className="h-3 w-3" />
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
