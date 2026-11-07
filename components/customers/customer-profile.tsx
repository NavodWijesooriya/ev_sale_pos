"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  FileText,
  MapPin,
  Bike,
  Wrench,
  Clock,
  CheckCircle2,
  ShieldCheck,
  FileCheck2,
  Printer,
  Sparkles,
  Receipt,
  Building,
} from "lucide-react"
import { CustomerCategory, PaymentMethod, ServiceType, DMTStatus } from "@prisma/client"
import { formatLKR } from "@/lib/currency"

export interface CustomerProfileData {
  id: string
  category: CustomerCategory
  name: string
  phone: string
  email?: string | null
  nic?: string | null
  address?: string | null
  totalSpent: number
  sales: Array<{
    id: string
    saleDate: Date | string
    totalAmount: number
    discount: number
    additionalCharges: number
    paymentMethod: PaymentMethod
    status: string
    branch: {
      id: string
      name: string
      location?: string | null
    }
    soldBy: {
      id: string
      name?: string | null
      email: string
    }
    items: Array<{
      id: string
      price: number
      vehicle: {
        id: string
        chassisNumber: string
        motorNumber?: string | null
        color?: string | null
        vehicleModel: {
          brand: string
          modelName: string
          batteryCapacity?: string | null
          range?: string | null
        }
      }
    }>
    financeDetail?: {
      financeCompany: string
      totalFinanceAmount: number
      downPaymentPaid: number
      status: string
    } | null
    dmtRegistration?: {
      id: string
      status: DMTStatus
      registeredNumber?: string | null
    } | null
  }>
  serviceRecords: Array<{
    id: string
    serviceDate: Date | string
    nextServiceDueDate?: Date | string | null
    serviceType: ServiceType
    description?: string | null
    totalCost: number
    branch: {
      id: string
      name: string
      location?: string | null
    }
    vehicle: {
      id: string
      chassisNumber: string
      batterySerialNumber?: string | null
      vehicleModel: {
        brand: string
        modelName: string
      }
    }
  }>
}

interface CustomerProfileProps {
  customer: CustomerProfileData
}

export function CustomerProfile({ customer }: CustomerProfileProps) {
  const [activeTab, setActiveTab] = useState<string>("purchases")

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  const renderServiceTypeBadge = (type: ServiceType) => {
    switch (type) {
      case ServiceType.Free:
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold text-xs"
          >
            Free Service
          </Badge>
        )
      case ServiceType.Warranty:
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold text-xs"
          >
            Warranty Claim
          </Badge>
        )
      case ServiceType.Paid:
        return (
          <Badge
            variant="outline"
            className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 font-semibold text-xs"
          >
            Paid Service
          </Badge>
        )
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/customers">
          <Button variant="ghost" size="sm" className="gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to Customer Directory
          </Button>
        </Link>
      </div>

      {/* Customer Header Dossier Card */}
      <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left: Avatar & Personal Info */}
            <div className="flex items-start gap-4">
              <div className="size-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
                {getInitials(customer.name)}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                    {customer.name}
                  </h1>
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    {customer.category === CustomerCategory.DIRECT
                      ? "Direct Customer"
                      : "CRM Lead / Customer"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-mono text-foreground font-semibold">
                    <Phone className="size-3.5 text-blue-500 shrink-0" />
                    {customer.phone}
                  </span>

                  {customer.nic && (
                    <span className="flex items-center gap-1.5 font-mono">
                      <FileText className="size-3.5 text-muted-foreground shrink-0" />
                      NIC: <strong className="text-foreground">{customer.nic}</strong>
                    </span>
                  )}

                  {customer.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="size-3.5 text-muted-foreground shrink-0" />
                      {customer.email}
                    </span>
                  )}
                </div>

                {customer.address && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
                    <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                    {customer.address}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Key Summary Metrics */}
            <div className="grid grid-cols-3 gap-3 border-t md:border-t-0 md:border-l border-border/60 pt-4 md:pt-0 md:pl-6 text-center">
              <div className="p-2 sm:p-3 rounded-xl bg-muted/40">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Total Spent
                </p>
                <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                  {formatLKR(customer.totalSpent)}
                </p>
              </div>

              <div className="p-2 sm:p-3 rounded-xl bg-muted/40">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                  EV Bikes
                </p>
                <p className="text-lg sm:text-xl font-black text-foreground font-mono mt-0.5">
                  {customer.sales.length}
                </p>
              </div>

              <div className="p-2 sm:p-3 rounded-xl bg-muted/40">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Services
                </p>
                <p className="text-lg sm:text-xl font-black text-foreground font-mono mt-0.5">
                  {customer.serviceRecords.length}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main History Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 max-w-md h-11 bg-muted/80 p-1">
          <TabsTrigger value="purchases" className="gap-2 text-xs font-bold">
            <Bike className="size-4" />
            EV Bike Purchases
            <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 h-4">
              {customer.sales.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2 text-xs font-bold">
            <Wrench className="size-4" />
            Service History
            <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 h-4">
              {customer.serviceRecords.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PURCHASE HISTORY */}
        <TabsContent value="purchases" className="m-0 focus-visible:outline-none">
          <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Receipt className="size-4 text-primary" />
                Purchased Electric Bikes & Sales Records
              </CardTitle>
              <CardDescription className="text-xs">
                All electric bikes bought by this customer from your dealership
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-border/60">
                      <TableHead className="font-semibold text-xs">Sale Date</TableHead>
                      <TableHead className="font-semibold text-xs">EV Bike Model</TableHead>
                      <TableHead className="font-semibold text-xs">Chassis #</TableHead>
                      <TableHead className="font-semibold text-xs">Branch & Rep</TableHead>
                      <TableHead className="font-semibold text-xs">Payment Method</TableHead>
                      <TableHead className="font-semibold text-xs">Status</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Total Amount</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.sales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-28 text-center text-xs text-muted-foreground">
                          No EV bike purchases recorded for this customer yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      customer.sales.map((sale) => {
                        const item = sale.items[0]
                        const v = item?.vehicle
                        const m = v?.vehicleModel
                        const formattedDate = new Date(sale.saleDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })

                        return (
                          <TableRow key={sale.id} className="hover:bg-muted/30 transition-colors border-border/40">
                            {/* Date */}
                            <TableCell className="align-middle py-3.5 text-xs font-semibold text-foreground">
                              {formattedDate}
                            </TableCell>

                            {/* Vehicle Model */}
                            <TableCell className="align-middle py-3.5">
                              {m ? (
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm text-foreground">
                                    {m.brand} {m.modelName}
                                  </span>
                                  {v?.color && (
                                    <span className="text-[11px] text-muted-foreground capitalize">
                                      Color: {v.color}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                "—"
                              )}
                            </TableCell>

                            {/* Chassis VIN */}
                            <TableCell className="align-middle py-3.5 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {v?.chassisNumber || "—"}
                            </TableCell>

                            {/* Branch & Rep */}
                            <TableCell className="align-middle py-3.5 text-xs text-muted-foreground">
                              <p className="font-medium text-foreground">{sale.branch.name}</p>
                              <p className="text-[11px]">Rep: {sale.soldBy.name || sale.soldBy.email}</p>
                            </TableCell>

                            {/* Payment Method */}
                            <TableCell className="align-middle py-3.5">
                              <Badge variant="outline" className="text-xs">
                                {sale.paymentMethod}
                              </Badge>
                            </TableCell>

                            {/* Status */}
                            <TableCell className="align-middle py-3.5">
                              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none text-[11px] font-semibold">
                                {sale.status}
                              </Badge>
                            </TableCell>

                            {/* Amount */}
                            <TableCell className="align-middle py-3.5 text-right font-mono font-bold text-sm text-foreground">
                              {formatLKR(sale.totalAmount)}
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="align-middle py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Link href={`/dashboard/sales/${sale.id}`}>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 gap-1 text-xs font-semibold hover:bg-primary hover:text-white transition-all"
                                  >
                                    <FileCheck2 className="size-3.5 text-primary-foreground group-hover:text-white" />
                                    DMT
                                  </Button>
                                </Link>
                                <Link href={`/dashboard/sales/${sale.id}/invoice`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
                                  >
                                    <FileText className="size-3.5" />
                                    Invoice
                                  </Button>
                                </Link>
                              </div>
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
        </TabsContent>

        {/* TAB 2: SERVICE HISTORY */}
        <TabsContent value="services" className="m-0 focus-visible:outline-none">
          <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Wrench className="size-4 text-primary" />
                After-Sales Maintenance & Warranty Logs
              </CardTitle>
              <CardDescription className="text-xs">
                History of services performed on this customer's electric bikes
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-border/60">
                      <TableHead className="font-semibold text-xs">Service Date</TableHead>
                      <TableHead className="font-semibold text-xs">EV Bike (Model & Chassis #)</TableHead>
                      <TableHead className="font-semibold text-xs">Service Type</TableHead>
                      <TableHead className="font-semibold text-xs">Work Description</TableHead>
                      <TableHead className="font-semibold text-xs">Workshop Branch</TableHead>
                      <TableHead className="font-semibold text-xs">Next Due Date</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Cost</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.serviceRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-28 text-center text-xs text-muted-foreground">
                          No service records logged for this customer's EV bikes yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      customer.serviceRecords.map((r) => {
                        const formattedDate = new Date(r.serviceDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                        const dueDate = r.nextServiceDueDate
                          ? new Date(r.nextServiceDueDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"

                        return (
                          <TableRow key={r.id} className="hover:bg-muted/30 transition-colors border-border/40">
                            {/* Date */}
                            <TableCell className="align-middle py-3.5 text-xs font-semibold text-foreground">
                              {formattedDate}
                            </TableCell>

                            {/* Vehicle */}
                            <TableCell className="align-middle py-3.5">
                              <div className="flex flex-col">
                                <span className="font-bold text-xs text-foreground">
                                  {r.vehicle.vehicleModel.brand} {r.vehicle.vehicleModel.modelName}
                                </span>
                                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                                  {r.vehicle.chassisNumber}
                                </span>
                              </div>
                            </TableCell>

                            {/* Service Type */}
                            <TableCell className="align-middle py-3.5">
                              {renderServiceTypeBadge(r.serviceType)}
                            </TableCell>

                            {/* Work Description */}
                            <TableCell className="align-middle py-3.5 max-w-xs text-xs text-foreground line-clamp-2">
                              {r.description || "Routine Maintenance"}
                            </TableCell>

                            {/* Workshop */}
                            <TableCell className="align-middle py-3.5 text-xs text-muted-foreground">
                              {r.branch.name}
                            </TableCell>

                            {/* Next Due */}
                            <TableCell className="align-middle py-3.5 text-xs font-semibold text-foreground">
                              {dueDate}
                            </TableCell>

                            {/* Cost */}
                            <TableCell className="align-middle py-3.5 text-right font-mono font-bold text-sm">
                              {r.totalCost === 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                                  Rs. 0 (Covered)
                                </span>
                              ) : (
                                formatLKR(r.totalCost)
                              )}
                            </TableCell>

                            {/* Action */}
                            <TableCell className="align-middle py-3.5 text-right">
                              <Link href={`/dashboard/services/${r.id}/job-card`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1.5 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
                                >
                                  <Printer className="size-3.5" />
                                  Job Card
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
