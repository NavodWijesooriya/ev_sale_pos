"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Bike,
  CheckCircle2,
  CreditCard,
  Building,
  DollarSign,
  User,
  Phone,
  FileText,
  Mail,
  MapPin,
  Sparkles,
  Zap,
  ArrowRight,
  Search,
  PlusCircle,
  RotateCcw,
  ShieldCheck,
  Percent,
  History,
  Clock,
  ExternalLink,
  BookmarkCheck,
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
import { processSale } from "@/app/actions/sales"
import { PaymentMethod } from "@prisma/client"

interface VehicleModelData {
  id: string
  brand: string
  modelName: string
  imageUrl?: string | null
  batteryCapacity?: string | null
  range?: string | null
  defaultPrice: number
  minDownPayment?: number | null
}

interface BranchData {
  id: string
  name: string
  location?: string | null
}

export interface InStockVehicle {
  id: string
  chassisNumber: string
  motorNumber?: string | null
  color?: string | null
  purchasePrice: number
  branchId: string
  branch: BranchData
  vehicleModel: VehicleModelData
}

export interface CustomerData {
  id: string
  name: string
  phone: string
  email?: string | null
  nic?: string | null
  address?: string | null
}

interface NewSaleFormProps {
  vehicles: InStockVehicle[]
  customers: CustomerData[]
  branches: BranchData[]
  recentSales?: Array<{
    id: string
    customerName: string
    vehicleName: string
    chassisNumber?: string
    totalAmount: number
    date: string
  }>
  onSaleComplete?: (saleId?: string) => void
}

export function NewSaleForm({
  vehicles,
  customers,
  branches,
  recentSales = [],
  onSaleComplete,
}: NewSaleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("new")
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerNic, setCustomerNic] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")

  // Vehicle state
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("")
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("")
  const [salePrice, setSalePrice] = useState<number | "">("")
  const [discount, setDiscount] = useState<number | "">("")
  const [additionalCharges, setAdditionalCharges] = useState<number | "">("")

  // Financial calculations
  const baseVehiclePrice = typeof salePrice === "number" ? salePrice : 0
  const numDiscount = typeof discount === "number" ? discount : 0
  const numAdditional = typeof additionalCharges === "number" ? additionalCharges : 0
  const dynamicTotal = Math.max(0, baseVehiclePrice + numAdditional - numDiscount)

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Cash)
  const [financeCompany, setFinanceCompany] = useState("")
  const [totalFinanceAmount, setTotalFinanceAmount] = useState<number | "">("")
  const [downPaymentPaid, setDownPaymentPaid] = useState<number | "">("")
  const [dealerCommission, setDealerCommission] = useState<number | "">("")

  // Find currently selected vehicle
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId) || null
  }, [vehicles, selectedVehicleId])

  // Filtered vehicles for searchable selector
  const filteredVehicles = useMemo(() => {
    if (!vehicleSearchQuery.trim()) return vehicles
    const q = vehicleSearchQuery.toLowerCase()
    return vehicles.filter(
      (v) =>
        v.chassisNumber.toLowerCase().includes(q) ||
        v.vehicleModel.brand.toLowerCase().includes(q) ||
        v.vehicleModel.modelName.toLowerCase().includes(q) ||
        (v.color && v.color.toLowerCase().includes(q)) ||
        v.branch.name.toLowerCase().includes(q)
    )
  }, [vehicles, vehicleSearchQuery])

  // Filtered customers for search
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 8)
    const q = customerSearchQuery.toLowerCase()
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.nic && c.nic.toLowerCase().includes(q))
    )
  }, [customers, customerSearchQuery])

  // Handle vehicle selection
  const handleSelectVehicle = (vId: string) => {
    setSelectedVehicleId(vId)
    const v = vehicles.find((item) => item.id === vId)
    if (v) {
      setSalePrice(v.vehicleModel.defaultPrice)
      // If payment is finance or split, pre-calculate default down payment and finance
      if (
        paymentMethod === PaymentMethod.Finance ||
        paymentMethod === PaymentMethod.SplitPayment
      ) {
        const minDown = v.vehicleModel.minDownPayment || v.vehicleModel.defaultPrice * 0.2
        setDownPaymentPaid(minDown)
        setTotalFinanceAmount(Math.max(0, v.vehicleModel.defaultPrice - minDown))
      }
    }
  }

  // Handle existing customer pick
  const handleSelectCustomer = (cId: string | null) => {
    const id = cId || "new"
    setSelectedCustomerId(id)
    if (id === "new") {
      setCustomerName("")
      setCustomerPhone("")
      setCustomerNic("")
      setCustomerEmail("")
      setCustomerAddress("")
    } else {
      const cust = customers.find((c) => c.id === cId)
      if (cust) {
        setCustomerName(cust.name)
        setCustomerPhone(cust.phone)
        setCustomerNic(cust.nic || "")
        setCustomerEmail(cust.email || "")
        setCustomerAddress(cust.address || "")
      }
    }
  }

  // Handle payment method change
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method)
    if (method === PaymentMethod.Finance || method === PaymentMethod.SplitPayment) {
      const price = typeof salePrice === "number" ? salePrice : selectedVehicle?.vehicleModel.defaultPrice || 0
      const defaultDown = selectedVehicle?.vehicleModel.minDownPayment || price * 0.2
      setDownPaymentPaid(defaultDown)
      setTotalFinanceAmount(Math.max(0, price - defaultDown))
      if (!financeCompany) {
        setFinanceCompany("Commercial Bank Leasing")
      }
    }
  }

  // Handle down payment change to recalculate financed amount
  const handleDownPaymentChange = (val: number) => {
    setDownPaymentPaid(val)
    if (dynamicTotal > 0) {
      setTotalFinanceAmount(Math.max(0, dynamicTotal - val))
    }
  }

  // Reset form
  const handleReset = () => {
    setSelectedVehicleId("")
    setVehicleSearchQuery("")
    setSalePrice("")
    setDiscount("")
    setAdditionalCharges("")
    setSelectedCustomerId("new")
    setCustomerSearchQuery("")
    setCustomerName("")
    setCustomerPhone("")
    setCustomerNic("")
    setCustomerEmail("")
    setCustomerAddress("")
    setPaymentMethod(PaymentMethod.Cash)
    setFinanceCompany("")
    setTotalFinanceAmount("")
    setDownPaymentPaid("")
    setDealerCommission("")
  }

  // Submit sale transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedVehicleId) {
      toast.error("Please select an EV from available stock.")
      return
    }
    if (!customerName.trim()) {
      toast.error("Customer name is required.")
      return
    }
    if (!customerPhone.trim()) {
      toast.error("Customer phone number is required.")
      return
    }
    if (typeof salePrice !== "number" || salePrice <= 0) {
      toast.error("Please enter a valid sale price.")
      return
    }

    const isFinance =
      paymentMethod === PaymentMethod.Finance ||
      paymentMethod === PaymentMethod.SplitPayment

    if (isFinance) {
      if (!financeCompany.trim()) {
        toast.error("Please provide the Finance / Leasing Company name.")
        return
      }
      if (typeof downPaymentPaid !== "number" || downPaymentPaid < 0) {
        toast.error("Please enter valid down payment paid.")
        return
      }
      if (typeof totalFinanceAmount !== "number" || totalFinanceAmount < 0) {
        toast.error("Please enter valid total finance amount.")
        return
      }
    }

    try {
      setIsSubmitting(true)
      const res = await processSale({
        customerId: selectedCustomerId !== "new" ? selectedCustomerId : undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerNic: customerNic.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        vehicleId: selectedVehicleId,
        salePrice: Number(salePrice),
        discount: typeof discount === "number" ? discount : 0,
        additionalCharges: typeof additionalCharges === "number" ? additionalCharges : 0,
        paymentMethod,
        financeCompany: isFinance ? financeCompany.trim() : undefined,
        totalFinanceAmount: isFinance ? Number(totalFinanceAmount) : undefined,
        downPaymentPaid: isFinance ? Number(downPaymentPaid) : undefined,
        dealerCommission:
          isFinance && typeof dealerCommission === "number"
            ? Number(dealerCommission)
            : undefined,
      })

      if (res.success) {
        toast.success(res.message || "Sale completed successfully!")
        handleReset()
        if (onSaleComplete) {
          onSaleComplete(res.saleId)
        }
      } else {
        toast.error(res.error || "Failed to process sale.")
      }
    } catch (err) {
      toast.error((err as Error).message || "An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFinanceSelected =
    paymentMethod === PaymentMethod.Finance ||
    paymentMethod === PaymentMethod.SplitPayment

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Details (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION 1: VEHICLE SELECTION (Numbered Step 1) */}
          <Card className="border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-7 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs shrink-0 shadow-xs">
                    1
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">Select Electric Vehicle</CardTitle>
                    <CardDescription className="text-xs">
                      Choose an in-stock EV from showroom inventory
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold">
                  {vehicles.length} Units In Stock
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {vehicles.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5">
                  <Zap className="h-10 w-10 text-amber-500 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-foreground">No In-Stock EV Bikes Available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Receive new EV bike shipments via the Inventory & GRN section first.
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search stock by chassis number, model, brand, color, or branch..."
                      value={vehicleSearchQuery}
                      onChange={(e) => setVehicleSearchQuery(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                    {filteredVehicles.map((v) => {
                      const isSelected = v.id === selectedVehicleId
                      return (
                        <div
                          key={v.id}
                          onClick={() => handleSelectVehicle(v.id)}
                          className={`relative p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-500/5 shadow-sm ring-1 ring-emerald-500"
                              : "border-border/60 hover:border-emerald-500/40 hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-sm text-foreground">
                                {v.vehicleModel.brand} {v.vehicleModel.modelName}
                              </p>
                              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                VIN: <span className="text-foreground font-medium">{v.chassisNumber}</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                ${v.vehicleModel.defaultPrice.toLocaleString()}
                              </span>
                              {v.color && (
                                <p className="text-[11px] text-muted-foreground capitalize">
                                  {v.color}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {v.branch.name}
                            </span>
                            {v.vehicleModel.batteryCapacity && (
                              <span className="flex items-center gap-1 ml-auto">
                                <Zap className="h-3 w-3 text-emerald-500" />
                                {v.vehicleModel.batteryCapacity}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Selected Vehicle Spec & Negotiated Price */}
              {selectedVehicle && (
                <div className="p-4 rounded-xl bg-muted/40 border border-border/70 mt-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Selected EV Model
                      </span>
                      <h4 className="font-bold text-base text-foreground">
                        {selectedVehicle.vehicleModel.brand} {selectedVehicle.vehicleModel.modelName}
                      </h4>
                      <p className="text-xs text-muted-foreground font-mono">
                        VIN: {selectedVehicle.chassisNumber} • Branch: {selectedVehicle.branch.name}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">Agreed Base Price ($) <span className="text-destructive">*</span></Label>
                      <div className="relative mt-1">
                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          placeholder="Base Price"
                          value={salePrice}
                          onChange={(e) => {
                            const val = e.target.value === "" ? "" : parseFloat(e.target.value)
                            setSalePrice(val)
                          }}
                          className="pl-8 font-bold text-foreground"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">Additional Charges ($)</Label>
                      <div className="relative mt-1">
                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g. Registration"
                          value={additionalCharges}
                          onChange={(e) => {
                            const val = e.target.value === "" ? "" : parseFloat(e.target.value)
                            setAdditionalCharges(val)
                          }}
                          className="pl-8"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">Dealership Discount ($)</Label>
                      <div className="relative mt-1">
                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g. Seasonal Promo"
                          value={discount}
                          onChange={(e) => {
                            const val = e.target.value === "" ? "" : parseFloat(e.target.value)
                            setDiscount(val)
                          }}
                          className="pl-8 text-amber-600 dark:text-amber-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40 bg-muted/20 px-3 py-2 rounded-lg">
                    <span className="text-muted-foreground font-medium">
                      Calculated Net Total: ({baseVehiclePrice.toLocaleString()} + {numAdditional.toLocaleString()}) - {numDiscount.toLocaleString()}
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      = ${dynamicTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SECTION 2: CUSTOMER INFORMATION (Numbered Step 2) */}
          <Card className="border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-7 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs shrink-0 shadow-xs">
                    2
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">Customer Profile & Registration</CardTitle>
                    <CardDescription className="text-xs">
                      Search existing buyer or register a new customer profile
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={selectedCustomerId === "new" ? "secondary" : "outline"}
                    size="sm"
                    className="text-xs h-8 gap-1.5"
                    onClick={() => handleSelectCustomer("new")}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    New Customer
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer Selector / Autocomplete */}
              {customers.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Search / Select Registered Customer
                  </Label>
                  <Select
                    value={selectedCustomerId}
                    onValueChange={(val) => handleSelectCustomer(val)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select existing customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new" className="font-semibold text-primary">
                        + Register New Customer
                      </SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} — {c.phone} {c.nic ? `(NIC: ${c.nic})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Customer Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cust-name" className="text-xs font-medium">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cust-name"
                      placeholder="e.g. Kasun Perera"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="pl-9 h-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cust-phone" className="text-xs font-medium">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cust-phone"
                      placeholder="e.g. +94 77 123 4567"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="pl-9 h-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cust-nic" className="text-xs font-medium">
                    National ID (NIC) / Passport
                  </Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cust-nic"
                      placeholder="e.g. 199245001234 or 924501234V"
                      value={customerNic}
                      onChange={(e) => setCustomerNic(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cust-email" className="text-xs font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cust-email"
                      type="email"
                      placeholder="buyer@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="cust-address" className="text-xs font-medium">
                    Residential Address
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cust-address"
                      placeholder="e.g. 142 Galle Road, Colombo 03"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 3: PAYMENT & FINANCE CONFIGURATION (Numbered Step 3) */}
          <Card className="border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-7 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs shrink-0 shadow-xs">
                  3
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-foreground">Payment Method & Financing</CardTitle>
                  <CardDescription className="text-xs">
                    Select payment terms, leasing partner, and down payment breakdown
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Payment Method Pills */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Payment Method
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: PaymentMethod.Cash, label: "Cash" },
                    { id: PaymentMethod.Card, label: "Credit/Debit Card" },
                    { id: PaymentMethod.BankTransfer, label: "Bank Transfer" },
                    { id: PaymentMethod.Finance, label: "Finance / Lease" },
                    { id: PaymentMethod.SplitPayment, label: "Split Payment" },
                  ].map((pm) => (
                    <Button
                      key={pm.id}
                      type="button"
                      variant={paymentMethod === pm.id ? "default" : "outline"}
                      className={`h-11 text-xs font-medium transition-all ${
                        paymentMethod === pm.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:border-primary/40"
                      }`}
                      onClick={() => handlePaymentMethodChange(pm.id)}
                    >
                      {pm.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Dynamic Finance / Lease Breakdown Fields */}
              {isFinanceSelected && (
                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-4 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <Sparkles className="h-4 w-4" />
                      Leasing & Finance Parameters
                    </span>
                    <Badge variant="outline" className="text-[11px] bg-purple-500/10 text-purple-600 border-purple-500/20">
                      Pending Bank Approval
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="finance-company" className="text-xs font-medium">
                        Finance / Leasing Institution <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="finance-company"
                        placeholder="e.g. Commercial Bank Leasing, LOLC Finance"
                        value={financeCompany}
                        onChange={(e) => setFinanceCompany(e.target.value)}
                        className="h-10 bg-background"
                        required={isFinanceSelected}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="down-payment" className="text-xs font-medium">
                        Customer Down Payment Paid ($) <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="down-payment"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Down Payment"
                          value={downPaymentPaid}
                          onChange={(e) =>
                            handleDownPaymentChange(
                              e.target.value === "" ? 0 : parseFloat(e.target.value)
                            )
                          }
                          className="pl-9 h-10 bg-background font-semibold"
                          required={isFinanceSelected}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="finance-amount" className="text-xs font-medium">
                        Total Amount Financed ($) <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="finance-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Financed Balance"
                          value={totalFinanceAmount}
                          onChange={(e) =>
                            setTotalFinanceAmount(
                              e.target.value === "" ? "" : parseFloat(e.target.value)
                            )
                          }
                          className="pl-9 h-10 bg-background font-semibold text-purple-600 dark:text-purple-400"
                          required={isFinanceSelected}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dealer-commission" className="text-xs font-medium">
                        Dealer Commission ($ - Optional)
                      </Label>
                      <div className="relative">
                        <Percent className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="dealer-commission"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Optional Commission"
                          value={dealerCommission}
                          onChange={(e) =>
                            setDealerCommission(
                              e.target.value === "" ? "" : parseFloat(e.target.value)
                            )
                          }
                          className="pl-9 h-10 bg-background"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Persistent Summary & Saved Results Panel (~320px) */}
        <div className="lg:col-span-4 lg:w-[320px] xl:w-[340px] shrink-0 space-y-4">
          {/* Card 1: Real-time Invoice & Calculation Summary */}
          <Card className="sticky top-20 border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Sale Invoice Summary</span>
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
                  Live Calculator
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Vehicle Preview Card */}
              {selectedVehicle ? (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {selectedVehicle.vehicleModel.brand}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {selectedVehicle.branch.name}
                    </span>
                  </div>
                  <h4 className="font-bold text-foreground text-sm leading-tight">
                    {selectedVehicle.vehicleModel.modelName}
                  </h4>
                  <div className="text-xs font-mono text-muted-foreground">
                    VIN: <span className="text-foreground">{selectedVehicle.chassisNumber}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-muted-foreground">Color:</span>
                    <span className="font-medium text-foreground capitalize">
                      {selectedVehicle.color || "Standard"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50">
                  No vehicle selected yet
                </div>
              )}

              {/* Customer Snapshot */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Buyer:</span>
                  <span className="font-medium text-foreground">
                    {customerName || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Contact:</span>
                  <span className="font-mono text-foreground">
                    {customerPhone || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Payment Method:</span>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {paymentMethod}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Real-time Pricing Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vehicle Base Price</span>
                  <span className="font-semibold text-foreground font-mono">
                    ${baseVehiclePrice.toLocaleString()}
                  </span>
                </div>

                {numAdditional > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Additional Charges:</span>
                    <span className="font-medium text-foreground font-mono">
                      +${numAdditional.toLocaleString()}
                    </span>
                  </div>
                )}

                {numDiscount > 0 && (
                  <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400">
                    <span>Dealership Discount:</span>
                    <span className="font-medium font-mono">
                      -${numDiscount.toLocaleString()}
                    </span>
                  </div>
                )}

                {isFinanceSelected && (
                  <>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Down Payment:</span>
                      <span className="font-medium text-foreground font-mono">
                        ${typeof downPaymentPaid === "number" ? downPaymentPaid.toLocaleString() : "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-purple-600 dark:text-purple-400">
                      <span>Lease / Financed:</span>
                      <span className="font-medium font-mono">
                        ${typeof totalFinanceAmount === "number" ? totalFinanceAmount.toLocaleString() : "0.00"}
                      </span>
                    </div>
                  </>
                )}

                <Separator />

                <div className="flex justify-between items-baseline pt-1">
                  <span className="font-bold text-base text-foreground">Final Total Due</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    ${dynamicTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-2 pt-2 pb-5 border-t border-slate-200/80 dark:border-slate-800">
              <Button
                type="submit"
                disabled={isSubmitting || !selectedVehicleId || !customerName || !customerPhone}
                className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Executing POS Transaction...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm & Complete EV Sale
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

          {/* Card 2: Persistent Saved Results & Recent Finalized Sales (Requirement 4) */}
          <Card className="border border-slate-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BookmarkCheck className="size-4 text-blue-500" />
                  Saved Results
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {recentSales.length} Recent Deals
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-3 pb-3 space-y-2.5">
              {recentSales.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  Completed sales will be saved and listed here for quick review.
                </div>
              ) : (
                recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs space-y-1 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground truncate max-w-[150px]">
                        {sale.customerName}
                      </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ${sale.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="truncate max-w-[140px]">{sale.vehicleName}</span>
                      <span className="font-mono">{sale.date}</span>
                    </div>
                    <div className="pt-1.5 flex items-center justify-end gap-2 border-t border-slate-200/60 dark:border-slate-700">
                      <Link
                        href={`/dashboard/sales/${sale.id}/invoice`}
                        className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-0.5"
                      >
                        Invoice
                        <ExternalLink className="size-2.5" />
                      </Link>
                      <Link
                        href={`/dashboard/sales/${sale.id}`}
                        className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-0.5"
                      >
                        DMT
                        <ExternalLink className="size-2.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
