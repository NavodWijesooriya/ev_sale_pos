"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { toast } from "sonner"
import {
  Wrench,
  Car,
  User,
  Phone,
  Calendar,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Search,
  BatteryCharging,
  Zap,
  Building,
  RotateCcw,
  Clock,
  Sparkles,
  FileText,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createServiceRecord } from "@/app/actions/services"
import { ServiceType } from "@prisma/client"

export interface SoldVehicleItem {
  id: string
  chassisNumber: string
  motorNumber?: string | null
  batterySerialNumber?: string | null
  warrantyPeriod?: string | null
  color?: string | null
  branchId: string
  branch: {
    id: string
    name: string
  }
  vehicleModel: {
    id: string
    brand: string
    modelName: string
    batteryCapacity?: string | null
    range?: string | null
  }
  saleItems?: Array<{
    sale: {
      customer: {
        id: string
        name: string
        phone: string
        nic?: string | null
        email?: string | null
        address?: string | null
      }
    }
  }>
}

export interface BranchOption {
  id: string
  name: string
  location?: string | null
}

export interface CustomerOption {
  id: string
  name: string
  phone: string
  nic?: string | null
}

interface NewServiceFormProps {
  vehicles: SoldVehicleItem[]
  branches: BranchOption[]
  customers: CustomerOption[]
  onSuccess?: () => void
}

export function NewServiceForm({
  vehicles,
  branches,
  customers,
  onSuccess,
}: NewServiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Search & Vehicle Selection
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("")
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("")

  // Form Fields
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    branches[0]?.id || ""
  )
  const [serviceType, setServiceType] = useState<ServiceType>(ServiceType.Free)
  const [description, setDescription] = useState("")
  const [totalCost, setTotalCost] = useState<number | "">("")
  const [nextServiceDueDate, setNextServiceDueDate] = useState("")

  // Find currently selected vehicle
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId) || null
  }, [vehicles, selectedVehicleId])

  // Resolve associated customer from vehicle's sale record or list
  const linkedCustomer = useMemo(() => {
    if (!selectedVehicle) return null
    const saleCust = selectedVehicle.saleItems?.[0]?.sale?.customer
    if (saleCust) return saleCust
    return null
  }, [selectedVehicle])

  // Filtered sold vehicles
  const filteredVehicles = useMemo(() => {
    if (!vehicleSearchQuery.trim()) return vehicles.slice(0, 10)
    const q = vehicleSearchQuery.toLowerCase()
    return vehicles.filter((v) => {
      const matchVin = v.chassisNumber.toLowerCase().includes(q)
      const matchMotor = v.motorNumber?.toLowerCase().includes(q)
      const matchBattery = v.batterySerialNumber?.toLowerCase().includes(q)
      const matchModel =
        v.vehicleModel.brand.toLowerCase().includes(q) ||
        v.vehicleModel.modelName.toLowerCase().includes(q)
      const cust = v.saleItems?.[0]?.sale?.customer
      const matchCustomer =
        cust &&
        (cust.name.toLowerCase().includes(q) ||
          cust.phone.toLowerCase().includes(q) ||
          cust.nic?.toLowerCase().includes(q))

      return matchVin || matchMotor || matchBattery || matchModel || matchCustomer
    })
  }, [vehicles, vehicleSearchQuery])

  // When vehicle selected, auto-select its branch
  const handleSelectVehicle = (v: SoldVehicleItem) => {
    setSelectedVehicleId(v.id)
    if (v.branchId) {
      setSelectedBranchId(v.branchId)
    }
    // Suggest default next service due date (6 months from today)
    const nextDate = new Date()
    nextDate.setMonth(nextDate.getMonth() + 6)
    setNextServiceDueDate(nextDate.toISOString().split("T")[0])
  }

  // Handle service type change
  const handleServiceTypeChange = (type: ServiceType) => {
    setServiceType(type)
    if (type === ServiceType.Free || type === ServiceType.Warranty) {
      setTotalCost(0)
    } else if (totalCost === 0) {
      setTotalCost("")
    }
  }

  // Reset form
  const handleReset = () => {
    setSelectedVehicleId("")
    setVehicleSearchQuery("")
    setServiceType(ServiceType.Free)
    setDescription("")
    setTotalCost("")
    setNextServiceDueDate("")
  }

  // Submit service job
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedVehicle) {
      toast.error("Please select a sold vehicle for service.")
      return
    }

    const customerId = linkedCustomer?.id || customers[0]?.id
    if (!customerId) {
      toast.error("No registered customer profile found for this vehicle.")
      return
    }

    if (!description.trim()) {
      toast.error("Please enter a description of work performed.")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await createServiceRecord({
        vehicleId: selectedVehicle.id,
        customerId,
        branchId: selectedBranchId || selectedVehicle.branchId,
        serviceType,
        description: description.trim(),
        totalCost: typeof totalCost === "number" ? totalCost : 0,
        nextServiceDueDate: nextServiceDueDate ? new Date(nextServiceDueDate) : null,
      })

      if (res.success) {
        toast.success(res.message || "Service job recorded successfully!")
        handleReset()
        if (onSuccess) onSuccess()
      } else {
        toast.error(res.error || "Failed to log service record.")
      }
    } catch (err) {
      toast.error((err as Error).message || "An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Details (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION 1: SOLD VEHICLE SELECTION */}
          <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Car className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">1. Select Sold Vehicle</CardTitle>
                    <CardDescription className="text-xs">
                      Search customer vehicles by VIN, Battery Serial, Customer Name, or Phone
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs bg-blue-500/5 text-blue-600 border-blue-500/20">
                  {vehicles.length} Sold Units Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {vehicles.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5">
                  <Clock className="h-8 w-8 text-amber-500 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-foreground text-sm">No Sold Vehicles Registered</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Process vehicle sales in the POS terminal first before booking service jobs.
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by Chassis VIN, Battery S/N, Customer Name, Phone, or NIC..."
                      value={vehicleSearchQuery}
                      onChange={(e) => setVehicleSearchQuery(e.target.value)}
                      className="pl-9 h-10 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {filteredVehicles.map((v) => {
                      const isSelected = v.id === selectedVehicleId
                      const cust = v.saleItems?.[0]?.sale?.customer
                      return (
                        <div
                          key={v.id}
                          onClick={() => handleSelectVehicle(v)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? "border-blue-500 bg-blue-500/5 shadow-sm ring-1 ring-blue-500"
                              : "border-border/60 hover:border-blue-500/40 hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-sm text-foreground">
                                {v.vehicleModel.brand} {v.vehicleModel.modelName}
                              </p>
                              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                VIN: <span className="text-foreground font-semibold">{v.chassisNumber}</span>
                              </p>
                            </div>
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-none font-semibold">
                              Sold
                            </Badge>
                          </div>

                          <div className="mt-2 text-xs space-y-0.5 text-muted-foreground">
                            {cust ? (
                              <p className="font-medium text-foreground flex items-center gap-1">
                                <User className="size-3 text-blue-500" />
                                {cust.name} ({cust.phone})
                              </p>
                            ) : (
                              <p className="italic text-[11px]">Direct Dealership Client</p>
                            )}

                            {v.batterySerialNumber && (
                              <p className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                                Bat S/N: {v.batterySerialNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Selected Vehicle Spec & Warranty Banner */}
              {selectedVehicle && (
                <div className="p-4 rounded-xl bg-muted/40 border border-border/70 mt-3 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        Selected EV Profile
                      </span>
                      <h4 className="font-bold text-base text-foreground mt-0.5">
                        {selectedVehicle.vehicleModel.brand} {selectedVehicle.vehicleModel.modelName}
                      </h4>
                      <p className="text-xs text-muted-foreground font-mono">
                        VIN: <span className="text-foreground font-semibold">{selectedVehicle.chassisNumber}</span>
                        {selectedVehicle.motorNumber && ` • Motor: ${selectedVehicle.motorNumber}`}
                      </p>
                    </div>

                    <div className="text-left sm:text-right text-xs space-y-1">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                        Warranty: {selectedVehicle.warrantyPeriod || "3 Years / 100,000 km"}
                      </Badge>
                      {selectedVehicle.batterySerialNumber && (
                        <p className="font-mono text-[11px] text-muted-foreground">
                          Battery S/N: {selectedVehicle.batterySerialNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  {linkedCustomer && (
                    <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Owner: <strong className="text-foreground">{linkedCustomer.name}</strong></span>
                      <span className="font-mono">Contact: {linkedCustomer.phone}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SECTION 2: SERVICE DETAILS & WORKSHOP */}
          <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">2. Service & Maintenance Job Details</CardTitle>
                  <CardDescription className="text-xs">
                    Select service category, log technician work done, and schedule next due date
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Service Type Selection Pills */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Service Type <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      id: ServiceType.Free,
                      label: "Free Service",
                      desc: "Routine Inspection / Periodic Check",
                      color: "border-emerald-500 text-emerald-600 bg-emerald-500/5",
                    },
                    {
                      id: ServiceType.Warranty,
                      label: "Warranty Claim",
                      desc: "Battery, Motor, or Parts Replacement",
                      color: "border-blue-500 text-blue-600 bg-blue-500/5",
                    },
                    {
                      id: ServiceType.Paid,
                      label: "Paid Service",
                      desc: "General Repairs / Wear & Tear",
                      color: "border-slate-500 text-slate-600 bg-slate-500/5",
                    },
                  ].map((st) => (
                    <div
                      key={st.id}
                      onClick={() => handleServiceTypeChange(st.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        serviceType === st.id
                          ? `${st.color} ring-1 ring-primary shadow-xs`
                          : "border-border/60 hover:bg-muted/40"
                      }`}
                    >
                      <p className="font-bold text-xs text-foreground">{st.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{st.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Servicing Workshop Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="branchSelect" className="text-xs font-semibold">
                    Workshop Branch <span className="text-destructive">*</span>
                  </Label>
                  <Select value={selectedBranchId} onValueChange={(val) => setSelectedBranchId(val || "")}>
                    <SelectTrigger id="branchSelect" className="h-10 text-xs">
                      <SelectValue placeholder="Select workshop branch..." />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-xs">
                          {b.name} {b.location ? `(${b.location})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nextDate" className="text-xs font-semibold">
                    Next Recommended Service Due Date
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="nextDate"
                      type="date"
                      value={nextServiceDueDate}
                      onChange={(e) => setNextServiceDueDate(e.target.value)}
                      className="pl-9 h-10 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Work Description / Diagnostic Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-xs font-semibold">
                  Work Carried Out, Parts Replaced & Diagnostic Notes <span className="text-destructive">*</span>
                </Label>
                <textarea
                  id="desc"
                  rows={3}
                  placeholder="e.g. 5,000 km periodic EV inspection completed. Battery health (SOH) checked at 99.2%. Brake fluid topped up, high-voltage coolant inspected, tire pressure balanced."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-input bg-transparent p-3 text-xs outline-none focus:ring-1 focus:ring-ring dark:bg-input/20 resize-none"
                  required
                />
              </div>

              {/* Total Cost Input */}
              <div className="p-3.5 rounded-xl bg-muted/40 border grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Service Invoice Amount ($)
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {serviceType === ServiceType.Free || serviceType === ServiceType.Warranty
                      ? "Complimentary under warranty / free service program ($0.00)"
                      : "Billable amount charged to customer for parts and labor"}
                  </p>
                </div>

                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={totalCost}
                    onChange={(e) =>
                      setTotalCost(e.target.value === "" ? "" : parseFloat(e.target.value))
                    }
                    disabled={serviceType === ServiceType.Free || serviceType === ServiceType.Warranty}
                    className="pl-9 font-bold text-base h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Job Summary & Action (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="sticky top-6 border-border/60 shadow-lg bg-card/80 backdrop-blur">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Service Job Card</span>
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  Ready to Issue
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              {/* Selected Vehicle Preview */}
              {selectedVehicle ? (
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {selectedVehicle.vehicleModel.brand}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {selectedVehicle.branch.name}
                    </span>
                  </div>
                  <h4 className="font-bold text-foreground text-sm">
                    {selectedVehicle.vehicleModel.modelName}
                  </h4>
                  <p className="font-mono text-muted-foreground text-[11px]">
                    VIN: <span className="text-foreground">{selectedVehicle.chassisNumber}</span>
                  </p>
                  {selectedVehicle.batterySerialNumber && (
                    <p className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                      Bat S/N: {selectedVehicle.batterySerialNumber}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed text-center text-muted-foreground">
                  No vehicle selected yet
                </div>
              )}

              {/* Customer Snapshot */}
              <div className="space-y-1.5">
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Customer:</span>
                  <span className="font-semibold text-foreground">
                    {linkedCustomer?.name || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Contact:</span>
                  <span className="font-mono text-foreground">
                    {linkedCustomer?.phone || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Service Category:</span>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {serviceType} Service
                  </Badge>
                </div>
                {nextServiceDueDate && (
                  <div className="flex justify-between py-1 text-muted-foreground">
                    <span>Next Due Date:</span>
                    <span className="font-semibold text-foreground">
                      {nextServiceDueDate}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Billing Summary */}
              <div className="flex justify-between items-baseline pt-1">
                <span className="font-bold text-sm text-foreground">Service Total</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  ${typeof totalCost === "number" ? totalCost.toLocaleString() : "0.00"}
                </span>
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-2 pt-2 pb-5 border-t border-border/40">
              <Button
                type="submit"
                disabled={isSubmitting || !selectedVehicle || !description.trim()}
                className="w-full h-11 text-xs font-bold bg-primary text-primary-foreground shadow-md gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Recording Service Job...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save Service Record
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isSubmitting}
                className="w-full text-xs text-muted-foreground hover:text-foreground gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                Clear Form
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </form>
  )
}
