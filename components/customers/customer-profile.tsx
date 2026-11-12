"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
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
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Phone,
  Mail,
  FileText,
  MapPin,
  Bike,
  Wrench,
  Clock,
  CheckCircle2,
  FileCheck2,
  Printer,
  Receipt,
} from "lucide-react"
import { CustomerType, PaymentMethod, ServiceType, DMTStatus } from "@prisma/client"
import { formatLKR } from "@/lib/currency"
import { setVehicleFreeServiceEntitlement } from "@/app/actions/services"
import { EditCustomerDialog } from "@/components/customers/edit-customer-dialog"

export interface CustomerProfileData {
  id: string
  customerType: CustomerType
  name: string
  phone: string
  email?: string | null
  nic?: string | null
  address?: string | null
  title?: string | null
  city?: string | null
  interestedModel?: string | null
  quantity: number
  testRide: boolean
  leadSource?: string | null
  socialMediaPlatform?: string | null
  websiteSource?: string | null
  firstCallNote?: string | null
  secondCallNote?: string | null
  thirdCallNote?: string | null
  fourthCallNote?: string | null
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
        freeServiceEntitlement: number
        freeServicesUsed: number
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
    inMileage?: string | null
    nextServiceMileage?: string | null
    inDate?: Date | string | null
    outDate?: Date | string | null
    serviceType: ServiceType
    status: string
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
      freeServiceEntitlement: number
      freeServicesUsed: number
      vehicleModel: {
        brand: string
        modelName: string
      }
    }
  }>
}

interface CustomerProfileProps {
  customer: CustomerProfileData
  canManageFreeServiceEntitlement: boolean
}

export function CustomerProfile({
  customer,
  canManageFreeServiceEntitlement,
}: CustomerProfileProps) {
  const [activeTab, setActiveTab] = useState<string>("purchases")
  const [entitlementDrafts, setEntitlementDrafts] = useState<Record<string, string>>({})
  const [savingEntitlementFor, setSavingEntitlementFor] = useState<string | null>(null)
  const router = useRouter()

  const customerVehicles = Array.from(
    new Map(
      customer.sales.flatMap((sale) => sale.items.map((item) => [item.vehicle.id, item.vehicle] as const)),
    ).values(),
  )

  const handleSaveEntitlement = async (vehicleId: string, currentEntitlement: number) => {
    const rawValue = entitlementDrafts[vehicleId] ?? String(currentEntitlement)
    const value = Number(rawValue)
    if (!Number.isInteger(value) || value < 0) {
      toast.error("Enter a non-negative whole-number entitlement.")
      return
    }

    setSavingEntitlementFor(vehicleId)
    try {
      const result = await setVehicleFreeServiceEntitlement(vehicleId, value)
      if (!result.success) {
        toast.error(result.error || "Failed to save the free-service entitlement.")
        return
      }
      toast.success("Free-service entitlement updated.")
      router.refresh()
    } catch (error) {
      toast.error((error as Error).message || "Failed to save the free-service entitlement.")
    } finally {
      setSavingEntitlementFor(null)
    }
  }

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
        <EditCustomerDialog customer={customer} />
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
                    {customer.title ? `${customer.title} ${customer.name}` : customer.name}
                  </h1>
                  <Badge
                    variant="outline"
                    className={customer.customerType === CustomerType.SALE
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"}
                  >
                    {customer.customerType === CustomerType.SALE ? "Sale Customer" : "CRM Lead"}
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

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="overflow-hidden border-border/60 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-gradient-to-br from-primary/10 via-background to-background">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bike className="size-4 text-primary" />
              Vehicle Interest
            </CardTitle>
            <CardDescription>Requested vehicle and test-ride details</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 p-5">
            <div className="col-span-2 rounded-xl border border-border/60 bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">Interested model</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {customer.interestedModel || "Not specified"}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="text-xs font-medium text-muted-foreground">Quantity</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{customer.quantity}</p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="text-xs font-medium text-muted-foreground">Test ride</p>
              <Badge
                variant="outline"
                className={customer.testRide
                  ? "mt-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "mt-2"}
              >
                {customer.testRide ? "Completed" : "Not completed"}
              </Badge>
            </div>
            <div className="col-span-2 grid gap-3 rounded-xl bg-muted/30 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Lead source</p>
                <p className="mt-1 text-sm font-semibold">
                  {customer.leadSource || "Not specified"}
                  {customer.socialMediaPlatform ? ` · ${customer.socialMediaPlatform}` : ""}
                  {customer.websiteSource ? ` · ${customer.websiteSource}` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">City</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                  <MapPin className="size-3.5 text-primary" />
                  {customer.city || "Not specified"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-primary" />
              Follow-up Call Notes
            </CardTitle>
            <CardDescription>Conversation history and next steps</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
            {([
              { label: "First call", note: customer.firstCallNote },
              { label: "Second call", note: customer.secondCallNote },
              { label: "Third call", note: customer.thirdCallNote },
              { label: "Fourth call", note: customer.fourthCallNote },
            ]).map(({ label, note }, index) => (
              <div key={label} className="relative rounded-xl border border-border/60 bg-card p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{label}</p>
                  {note ? (
                    <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      Logged
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {note || "No notes recorded yet."}
                </p>
                {index < 3 && (
                  <span className="absolute -bottom-3 left-5 z-10 hidden h-3 border-l border-dashed border-border sm:block" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

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
                <Bike className="size-4 text-emerald-600" />
                Free-Service Balances by Vehicle
              </CardTitle>
              <CardDescription className="text-xs">
                Only completed free maintenance services use this balance. Paid and warranty jobs do not.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
              {customerVehicles.length === 0 ? (
                <p className="text-xs text-muted-foreground">No purchased vehicles are linked to this customer.</p>
              ) : (
                customerVehicles.map((vehicle) => {
                  const remaining = Math.max(
                    0,
                    vehicle.freeServiceEntitlement - vehicle.freeServicesUsed,
                  )
                  const draft = entitlementDrafts[vehicle.id] ?? String(vehicle.freeServiceEntitlement)

                  return (
                    <div key={vehicle.id} className="rounded-xl border border-border/60 bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">
                            {vehicle.vehicleModel.brand} {vehicle.vehicleModel.modelName}
                          </p>
                          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                            VIN: {vehicle.chassisNumber}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="shrink-0 border-emerald-500/30 bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-400"
                        >
                          {remaining} remaining
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {vehicle.freeServicesUsed} used of {vehicle.freeServiceEntitlement} included
                      </p>
                      {canManageFreeServiceEntitlement && (
                        <div className="mt-3 flex items-center gap-2">
                          <label htmlFor={`free-entitlement-${vehicle.id}`} className="text-xs font-medium">
                            Total entitlement
                          </label>
                          <Input
                            id={`free-entitlement-${vehicle.id}`}
                            type="number"
                            min={vehicle.freeServicesUsed}
                            step="1"
                            value={draft}
                            onChange={(event) =>
                              setEntitlementDrafts((current) => ({
                                ...current,
                                [vehicle.id]: event.target.value,
                              }))
                            }
                            className="h-8 w-20 text-xs"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={savingEntitlementFor === vehicle.id}
                            onClick={() =>
                              void handleSaveEntitlement(vehicle.id, vehicle.freeServiceEntitlement)
                            }
                            className="h-8 text-xs"
                          >
                            {savingEntitlementFor === vehicle.id ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                Vehicle Service Timeline
              </CardTitle>
              <CardDescription className="text-xs">
                Chronological history clearly distinguishes paid maintenance, free maintenance, and warranty claims.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {customer.serviceRecords.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No service records logged for this customer yet.
                </p>
              ) : (
                <div className="relative space-y-4 border-l border-border ml-2 pl-5">
                  {customer.serviceRecords.map((record) => (
                    <div key={record.id} className="relative rounded-lg border border-border/60 bg-background p-3">
                      <span className="absolute -left-[27px] top-4 size-3 rounded-full border-2 border-background bg-primary" />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {renderServiceTypeBadge(record.serviceType)}
                          {record.status !== "COMPLETED" && (
                            <Badge variant="outline" className="text-[10px]">
                              {record.status.replaceAll("_", " ")}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {new Date(record.serviceDate).toLocaleDateString("en-LK", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-bold text-foreground">
                        {record.vehicle.vehicleModel.brand} {record.vehicle.vehicleModel.modelName}
                      </p>
                      <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                        VIN: {record.vehicle.chassisNumber}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {record.description || "No work description recorded."}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">{record.branch.name}</span>
                        <span className="font-mono font-semibold text-foreground">
                          {formatLKR(record.totalCost)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Wrench className="size-4 text-primary" />
                After-Sales Maintenance & Warranty Logs
              </CardTitle>
              <CardDescription className="text-xs">
                History of services performed on this customer&apos;s electric bikes
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
                      <TableHead className="font-semibold text-xs">Mileage In / Next</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Cost</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.serviceRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-28 text-center text-xs text-muted-foreground">
                          No service records logged for this customer&apos;s EV bikes yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      customer.serviceRecords.map((r) => {
                        const formattedDate = new Date(r.serviceDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })

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

                            {/* Mileage In / Next */}
                            <TableCell className="align-middle py-3.5 text-xs font-mono">
                              <div>
                                <span className="text-muted-foreground text-[10px] block">In:</span>
                                <span className="font-semibold text-foreground">{r.inMileage ? `${r.inMileage} km` : "—"}</span>
                              </div>
                              {r.nextServiceMileage && (
                                <div className="mt-0.5">
                                  <span className="text-muted-foreground text-[10px] block">Next:</span>
                                  <span className="text-blue-600 dark:text-blue-400 font-medium">{r.nextServiceMileage} km</span>
                                </div>
                              )}
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
