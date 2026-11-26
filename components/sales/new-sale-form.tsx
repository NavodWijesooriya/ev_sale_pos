"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CustomerType } from "@prisma/client"
import {
  ArrowRight,
  Bike,
  Calculator,
  Check,
  ChevronsUpDown,
  CircleDollarSign,
  Info,
  LoaderCircle,
  Percent,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRound,
  Landmark,
  Users,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { createNewSale, getPendingCustomerAdvance } from "@/app/actions/sales"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { formatLKR } from "@/lib/currency"
import {
  createNewSaleSchema,
  FREE_SALE_ITEMS,
  extendedWarrantyPrice,
  salePaymentMethods,
  saleWarrantyOptions,
  commissionBasisOptions,
  FULL_INSURANCE_COMMISSION,
  DEFAULT_RMV_CHARGE_CASH,
  DEFAULT_RMV_CHARGE_FINANCE,
  DEFAULT_THIRD_PARTY_INSURANCE,
  rmvChargeFor,
  type SaleChargeSettings,
  insuranceCommissionFor,
  type CommissionBasis,
  type InsuranceTypeOption,
  type CreateNewSaleInput,
} from "@/lib/validations/new-sale"

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

export interface StaffOption {
  id: string
  name: string
  email: string
  role: string
}

export interface InStockVehicle {
  id: string
  chassisNumber: string
  unitGrnNumber?: string | null
  motorNumber?: string | null
  color?: string | null
  purchasePrice: number
  branchId: string
  grnNumber?: string | null
  branch: BranchData
  vehicleModel: VehicleModelData
}

export interface CustomerData {
  id: string
  customerType: CustomerType
  name: string
  phone: string
  email?: string | null
  nic?: string | null
  address?: string | null
}

export interface FinanceInsuranceOption {
  id: string
  name: string
  defaultCommissionRate: number | null
}

interface NewSaleFormProps {
  vehicles: InStockVehicle[]
  customers: CustomerData[]
  branches?: BranchData[]
  financeCompanies?: FinanceInsuranceOption[]
  insuranceCompanies?: FinanceInsuranceOption[]
  staff?: StaffOption[]
  /** Owner/admin only. When false, every commission field is hidden and never sent. */
  canManageCommission?: boolean
  /** Owner-configured fixed full-insurance commission (only sent to the owner). */
  fullInsuranceCommission?: number
  /** Customer-paid charges added to this sale (RMV by payment type, optional third-party insurance). */
  saleCharges?: SaleChargeSettings
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

const defaultValues: CreateNewSaleInput = {
  customerId: "",
  vehicleId: "",
  paymentType: "CASH",
  paymentMethod: "Cash",
  warrantyOption: saleWarrantyOptions[0],
  freeItems: [],
  freeServices: 3,
  advancePaymentId: "",
  financeCompanyId: "",
  financeAmount: 0,
  downPayment: 0,
  commissionBasis: "FINANCE_AMOUNT",
  commissionRate: 1,
  commissionAmount: 0,
  insuranceType: "NONE",
  insuranceCompanyId: "",
  financeCommission: null,
  insuranceCommission: null,
  commissionRecipientId: "",
  thirdPartyInsurance: false,
  tinNumber: "",
}

export function NewSaleForm({
  vehicles,
  customers,
  financeCompanies = [],
  insuranceCompanies = [],
  staff = [],
  canManageCommission = false,
  fullInsuranceCommission = FULL_INSURANCE_COMMISSION,
  saleCharges = {
    rmvChargeFinance: DEFAULT_RMV_CHARGE_FINANCE,
    rmvChargeCash: DEFAULT_RMV_CHARGE_CASH,
    thirdPartyInsurance: DEFAULT_THIRD_PARTY_INSURANCE,
  },
  onSaleComplete,
}: NewSaleFormProps) {
  const router = useRouter()
  const [customerQuery, setCustomerQuery] = React.useState("")
  const [vehicleQuery, setVehicleQuery] = React.useState("")
  const [customerPickerOpen, setCustomerPickerOpen] = React.useState(false)
  const [vehiclePickerOpen, setVehiclePickerOpen] = React.useState(false)
  const [pendingAdvance, setPendingAdvance] = React.useState<{
    id: string
    amount: number
    tinNumber?: string | null
  } | null>(null)
  const [isLoadingAdvance, setIsLoadingAdvance] = React.useState(false)
  const advanceRequestId = React.useRef(0)
  const form = useForm<CreateNewSaleInput>({
    resolver: zodResolver(createNewSaleSchema),
    defaultValues,
  })
  const customerId = useWatch({ control: form.control, name: "customerId" })
  const vehicleId = useWatch({ control: form.control, name: "vehicleId" })
  const paymentType = useWatch({ control: form.control, name: "paymentType" }) ?? "CASH"
  const financeAmount = useWatch({ control: form.control, name: "financeAmount" }) ?? 0
  const downPayment = useWatch({ control: form.control, name: "downPayment" }) ?? 0
  const advancePaymentId = useWatch({ control: form.control, name: "advancePaymentId" })
  const warrantyOption = useWatch({ control: form.control, name: "warrantyOption" })
  const financeCompanyId = useWatch({ control: form.control, name: "financeCompanyId" })
  const insuranceCompanyId = useWatch({ control: form.control, name: "insuranceCompanyId" })
  const insuranceType = (useWatch({ control: form.control, name: "insuranceType" }) ?? "NONE") as InsuranceTypeOption
  const insuranceCommission = insuranceCommissionFor(insuranceType, paymentType === "FINANCE", fullInsuranceCommission)

  const selectedCustomer = customers.find((customer) => customer.id === customerId)
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId)
  const selectedFinanceCompany = financeCompanies.find((c) => c.id === financeCompanyId)
  const selectedInsuranceCompany = insuranceCompanies.find((c) => c.id === insuranceCompanyId)

  const subtotal = selectedVehicle?.vehicleModel.defaultPrice ?? 0
  const warrantyCharge =
    warrantyOption === saleWarrantyOptions[1] ? extendedWarrantyPrice : 0
  const totalVehiclePrice = subtotal + warrantyCharge
  const thirdPartyChecked = Boolean(useWatch({ control: form.control, name: "thirdPartyInsurance" }))
  // RMV follows the payment type; third-party insurance only when ticked. These are collected from the customer
  // on top of the bike price (the finance loan and the commission basis stay on the bike price).
  const rmvCharge = rmvChargeFor(saleCharges, paymentType === "FINANCE")
  const thirdPartyAmount = thirdPartyChecked ? saleCharges.thirdPartyInsurance : 0
  const chargesTotal = rmvCharge + thirdPartyAmount
  const grandTotal = totalVehiclePrice + chargesTotal
  const advanceDeduction =
    pendingAdvance && advancePaymentId === pendingAdvance.id ? pendingAdvance.amount : 0
  const finalTotal = Math.max(0, grandTotal - advanceDeduction)

  // Auto-balance logic for Finance Sales
  const handleDownPaymentChange = (value: number) => {
    form.setValue("downPayment", value, { shouldDirty: true, shouldValidate: true })
    if (totalVehiclePrice > 0) {
      const calculatedFinance = Math.max(0, totalVehiclePrice - value)
      form.setValue("financeAmount", calculatedFinance, { shouldDirty: true, shouldValidate: true })
    }
  }

  const handleFinanceAmountChange = (value: number) => {
    form.setValue("financeAmount", value, { shouldDirty: true, shouldValidate: true })
    if (totalVehiclePrice > 0) {
      const calculatedDown = Math.max(0, totalVehiclePrice - value)
      form.setValue("downPayment", calculatedDown, { shouldDirty: true, shouldValidate: true })
    }
  }

  const handleAutoBalance = () => {
    if (totalVehiclePrice <= 0) return
    const currentDown = form.getValues("downPayment") || 0
    if (currentDown > 0 && currentDown <= totalVehiclePrice) {
      form.setValue("financeAmount", totalVehiclePrice - currentDown, { shouldDirty: true, shouldValidate: true })
    } else {
      const defaultDown = selectedVehicle?.vehicleModel.minDownPayment ?? Math.round(totalVehiclePrice * 0.3)
      form.setValue("downPayment", defaultDown, { shouldDirty: true, shouldValidate: true })
      form.setValue("financeAmount", Math.max(0, totalVehiclePrice - defaultDown), { shouldDirty: true, shouldValidate: true })
    }
    toast.success("Breakdown balanced to match Total Vehicle Price!")
  }

  React.useEffect(() => {
    if (paymentType === "FINANCE" && totalVehiclePrice > 0) {
      const curDown = form.getValues("downPayment") || 0
      const curFin = form.getValues("financeAmount") || 0
      if (curDown === 0 && curFin === 0) {
        const initDown = selectedVehicle?.vehicleModel.minDownPayment ?? Math.round(totalVehiclePrice * 0.3)
        form.setValue("downPayment", initDown, { shouldDirty: true })
        form.setValue("financeAmount", Math.max(0, totalVehiclePrice - initDown), { shouldDirty: true })
      }
    }
  }, [selectedVehicle?.id, totalVehiclePrice, paymentType])

  const financeSum = (downPayment || 0) + (financeAmount || 0)
  const isBalanced = totalVehiclePrice > 0 ? Math.abs(financeSum - totalVehiclePrice) <= 1 : true

  const [isCommissionOverridden, setIsCommissionOverridden] = React.useState(false)

  const commissionBasis = (useWatch({ control: form.control, name: "commissionBasis" }) ?? "FINANCE_AMOUNT") as CommissionBasis
  const commissionRate = useWatch({ control: form.control, name: "commissionRate" }) ?? 1
  const commissionAmount = useWatch({ control: form.control, name: "commissionAmount" }) ?? 0

  const calculatedCommission = React.useMemo(() => {
    const rate = Number(commissionRate) || 0
    if (commissionBasis === "FINANCE_AMOUNT") {
      return Math.round(((Number(financeAmount) || 0) * rate) / 100)
    } else if (commissionBasis === "VEHICLE_PRICE") {
      return Math.round(((Number(totalVehiclePrice) || 0) * rate) / 100)
    } else if (commissionBasis === "FIXED") {
      return Math.round(rate)
    }
    return 0
  }, [commissionBasis, commissionRate, financeAmount, totalVehiclePrice])

  // Auto-calculate commissionAmount when inputs change, unless staff manually overrides it
  React.useEffect(() => {
    if (canManageCommission && paymentType === "FINANCE" && !isCommissionOverridden) {
      form.setValue("commissionAmount", calculatedCommission, { shouldDirty: true })
      form.setValue("financeCommission", calculatedCommission, { shouldDirty: true })
    }
  }, [canManageCommission, paymentType, calculatedCommission, isCommissionOverridden, form])

  const handleBasisChange = (basis: CommissionBasis) => {
    form.setValue("commissionBasis", basis, { shouldDirty: true, shouldValidate: true })
    setIsCommissionOverridden(false)
    let newAmt = 0
    const rate = Number(form.getValues("commissionRate")) || 0
    if (basis === "FINANCE_AMOUNT") {
      newAmt = Math.round(((Number(financeAmount) || 0) * rate) / 100)
    } else if (basis === "VEHICLE_PRICE") {
      newAmt = Math.round(((Number(totalVehiclePrice) || 0) * rate) / 100)
    } else {
      newAmt = Math.round(rate)
    }
    form.setValue("commissionAmount", newAmt, { shouldDirty: true, shouldValidate: true })
    form.setValue("financeCommission", newAmt, { shouldDirty: true })
  }

  const handleRateChange = (rateVal: number) => {
    form.setValue("commissionRate", rateVal, { shouldDirty: true, shouldValidate: true })
    setIsCommissionOverridden(false)
    const basis = (form.getValues("commissionBasis") || "FINANCE_AMOUNT") as CommissionBasis
    let newAmt = 0
    if (basis === "FINANCE_AMOUNT") {
      newAmt = Math.round(((Number(financeAmount) || 0) * rateVal) / 100)
    } else if (basis === "VEHICLE_PRICE") {
      newAmt = Math.round(((Number(totalVehiclePrice) || 0) * rateVal) / 100)
    } else {
      newAmt = Math.round(rateVal)
    }
    form.setValue("commissionAmount", newAmt, { shouldDirty: true, shouldValidate: true })
    form.setValue("financeCommission", newAmt, { shouldDirty: true })
  }

  const handleCommissionAmountChange = (amt: number) => {
    form.setValue("commissionAmount", amt, { shouldDirty: true, shouldValidate: true })
    form.setValue("financeCommission", amt, { shouldDirty: true })
    setIsCommissionOverridden(true)
  }

  const handleResetCommissionToCalculated = () => {
    form.setValue("commissionAmount", calculatedCommission, { shouldDirty: true, shouldValidate: true })
    form.setValue("financeCommission", calculatedCommission, { shouldDirty: true })
    setIsCommissionOverridden(false)
    toast.success(`Commission reset to calculated: ${formatLKR(calculatedCommission)}`)
  }

  const filteredCustomers = customers.filter((customer) => {
    const query = customerQuery.trim().toLocaleLowerCase()
    return (
      !query ||
      customer.name.toLocaleLowerCase().includes(query) ||
      customer.phone.toLocaleLowerCase().includes(query) ||
      customer.nic?.toLocaleLowerCase().includes(query)
    )
  })
  const filteredVehicles = vehicles.filter((vehicle) => {
    const query = vehicleQuery.trim().toLocaleLowerCase()
    return (
      !query ||
      vehicle.chassisNumber.toLocaleLowerCase().includes(query) ||
      vehicle.vehicleModel.brand.toLocaleLowerCase().includes(query) ||
      vehicle.vehicleModel.modelName.toLocaleLowerCase().includes(query) ||
      vehicle.color?.toLocaleLowerCase().includes(query) ||
      vehicle.branch.name.toLocaleLowerCase().includes(query) ||
      vehicle.grnNumber?.toLocaleLowerCase().includes(query) ||
      vehicle.unitGrnNumber?.toLocaleLowerCase().includes(query)
    )
  })

  async function selectCustomer(id: string) {
    advanceRequestId.current += 1
    const requestId = advanceRequestId.current
    form.setValue("customerId", id, { shouldDirty: true, shouldValidate: true })
    form.setValue("advancePaymentId", "", { shouldDirty: true })
    setPendingAdvance(null)
    setCustomerQuery("")
    setCustomerPickerOpen(false)
    setIsLoadingAdvance(true)

    try {
      const advance = await getPendingCustomerAdvance(id)
      if (requestId !== advanceRequestId.current) return
      setPendingAdvance(advance)
      if (advance) {
        // Carry the TIN given with the advance into the sale (the cashier can still change it).
        if (advance.tinNumber && !form.getValues("tinNumber")) {
          form.setValue("tinNumber", advance.tinNumber, { shouldDirty: true, shouldValidate: true })
        }
        form.setValue("advancePaymentId", advance.id, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
    } catch (error) {
      if (requestId === advanceRequestId.current) {
        console.error("Could not check for a pending customer advance:", error)
        toast.error("Could not check this customer's pending advance.")
      }
    } finally {
      if (requestId === advanceRequestId.current) setIsLoadingAdvance(false)
    }
  }

  async function onSubmit(values: CreateNewSaleInput) {
    if (values.paymentType === "FINANCE") {
      if (!values.financeCompanyId || values.financeCompanyId === "__none__") {
        toast.error("Please select a Finance Company / Institute for this Finance Sale.")
        return
      }
      const sum = (values.downPayment ?? 0) + (values.financeAmount ?? 0)
      if (totalVehiclePrice > 0 && Math.abs(sum - totalVehiclePrice) > 1) {
        toast.error(
          `Down Payment (${formatLKR(values.downPayment ?? 0)}) + Finance Amount (${formatLKR(values.financeAmount ?? 0)}) must equal Total Vehicle Price (${formatLKR(totalVehiclePrice)}). Difference: ${formatLKR(Math.abs(totalVehiclePrice - sum))}`
        )
        return
      }
    }

    try {
      // Staff never send commission data (the server also ignores it); the server
      // computes the insurance commission from insuranceType, so it is not sent.
      const insuranceCompanyForSale = values.insuranceType === "FULL_DEALER" ? values.insuranceCompanyId : ""
      const finalValues: CreateNewSaleInput = canManageCommission
        ? {
            ...values,
            commissionAmount: values.commissionAmount ?? values.financeCommission ?? 0,
            financeCommission: values.commissionAmount ?? values.financeCommission ?? 0,
            insuranceCommission: null,
            insuranceCompanyId: insuranceCompanyForSale,
          }
        : {
            ...values,
            commissionBasis: "FINANCE_AMOUNT",
            commissionRate: 0,
            commissionAmount: 0,
            financeCommission: 0,
            insuranceCommission: null,
            commissionRecipientId: "",
            insuranceCompanyId: insuranceCompanyForSale,
          }
      const result = await createNewSale(finalValues)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(`Sale completed. Invoice ${result.invoiceNumber} is ready.`)
      form.reset(defaultValues)
      setPendingAdvance(null)
      setCustomerQuery("")
      setVehicleQuery("")
      if (onSaleComplete) {
        onSaleComplete(result.saleId)
      } else {
        router.push(`/dashboard/sales/${result.saleId}/invoice`)
        router.refresh()
      }
    } catch (error) {
      console.error("Sale submission failed:", error)
      toast.error("Unable to complete this sale. Please try again.")
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card className="overflow-visible rounded-2xl border-border/70 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UserRound className="size-5" />
                </span>
                <div>
                  <CardTitle>Customer &amp; vehicle</CardTitle>
                  <CardDescription>Select a registered customer and available EV.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sale-customer">Customer</Label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="sale-customer"
                      role="combobox"
                      aria-expanded={customerPickerOpen}
                      aria-controls="sale-customer-options"
                      aria-invalid={Boolean(form.formState.errors.customerId)}
                      autoComplete="off"
                      placeholder={selectedCustomer?.name ?? "Search by name, phone, or NIC"}
                      value={customerQuery}
                      onFocus={() => setCustomerPickerOpen(true)}
                      onBlur={() => setTimeout(() => setCustomerPickerOpen(false), 120)}
                      onChange={(event) => {
                        setCustomerQuery(event.target.value)
                        setCustomerPickerOpen(true)
                      }}
                      className="pl-9 pr-9"
                    />
                    <ChevronsUpDown className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  {customerPickerOpen && (
                    <div
                      id="sale-customer-options"
                      role="listbox"
                      aria-label="Customers"
                      className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg"
                    >
                      {filteredCustomers.length ? (
                        filteredCustomers.slice(0, 30).map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            role="option"
                            aria-selected={customer.id === customerId}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => void selectCustomer(customer.id)}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{customer.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {customer.phone}{customer.nic ? ` · ${customer.nic}` : ""}
                              </span>
                            </span>
                            {customer.id === customerId && <Check className="size-4 text-primary" />}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                          No matching customers found.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {form.formState.errors.customerId && (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.customerId.message}
                  </p>
                )}
                {selectedCustomer && (
                  <p className="text-xs text-muted-foreground">
                    {selectedCustomer.phone}
                    {selectedCustomer.nic ? ` · NIC ${selectedCustomer.nic}` : ""}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale-vehicle-search">Available vehicle</Label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="sale-vehicle-search"
                      role="combobox"
                      aria-expanded={vehiclePickerOpen}
                      aria-controls="sale-vehicle-options"
                      aria-invalid={Boolean(form.formState.errors.vehicleId)}
                      autoComplete="off"
                      placeholder={
                        selectedVehicle
                          ? `${selectedVehicle.vehicleModel.brand} ${selectedVehicle.vehicleModel.modelName} ${selectedVehicle.unitGrnNumber ? `(${selectedVehicle.unitGrnNumber})` : ""}`
                          : "Search model, Unit GRN (e.g. JM0102), chassis, batch, or showroom"
                      }
                      value={vehicleQuery}
                      onFocus={() => setVehiclePickerOpen(true)}
                      onBlur={() => setTimeout(() => setVehiclePickerOpen(false), 120)}
                      onChange={(event) => {
                        setVehicleQuery(event.target.value)
                        setVehiclePickerOpen(true)
                      }}
                      className="pl-9 pr-9"
                    />
                    <ChevronsUpDown className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  {vehiclePickerOpen && (
                    <div
                      id="sale-vehicle-options"
                      role="listbox"
                      aria-label="Available vehicles"
                      className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg"
                    >
                      {filteredVehicles.length ? (
                        filteredVehicles.slice(0, 30).map((vehicle) => (
                          <button
                            key={vehicle.id}
                            type="button"
                            role="option"
                            aria-selected={vehicle.id === vehicleId}
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              form.setValue("vehicleId", vehicle.id, {
                                shouldDirty: true,
                                shouldValidate: true,
                              })
                              setVehicleQuery("")
                              setVehiclePickerOpen(false)
                            }}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">
                                {vehicle.vehicleModel.brand} {vehicle.vehicleModel.modelName}
                                {vehicle.color ? ` · ${vehicle.color}` : ""}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {vehicle.unitGrnNumber && (
                                  <span className="font-semibold text-primary">{vehicle.unitGrnNumber} · </span>
                                )}
                                {vehicle.chassisNumber}
                                {vehicle.grnNumber ? ` · Batch: ${vehicle.grnNumber}` : ""}
                                {` · ${vehicle.branch.name}`}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs font-semibold tabular-nums">
                              {formatLKR(vehicle.vehicleModel.defaultPrice)}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                          {vehicles.length ? "No matching vehicles found." : "No available vehicles in stock."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {form.formState.errors.vehicleId && (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.vehicleId.message}
                  </p>
                )}
                {selectedVehicle && (
                  <p className="text-xs text-muted-foreground">
                    Chassis {selectedVehicle.chassisNumber} · {selectedVehicle.branch.name}
                  </p>
                )}
              </div>

              {selectedVehicle && (
                <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4 lg:col-span-2">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-background text-primary shadow-xs">
                    <Bike className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {selectedVehicle.vehicleModel.brand} {selectedVehicle.vehicleModel.modelName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedVehicle.color || "Color not specified"} · {selectedVehicle.branch.name}
                    </p>
                    {selectedVehicle.chassisNumber && (
                      <p className="text-xs text-muted-foreground">
                        Chassis: {selectedVehicle.chassisNumber}
                        {selectedVehicle.motorNumber ? ` · Motor: ${selectedVehicle.motorNumber}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 mb-1">
                      {selectedVehicle.unitGrnNumber && (
                        <Badge variant="default" className="font-mono text-xs font-bold">
                          {selectedVehicle.unitGrnNumber}
                        </Badge>
                      )}
                      {selectedVehicle.grnNumber && (
                        <Badge variant="outline" className="font-mono text-xs">
                          GRN {selectedVehicle.grnNumber}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-bold tabular-nums">
                      {formatLKR(subtotal)}
                      <span className="block text-[10px] font-normal text-muted-foreground">Vehicle price</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="sale-tin-number">
                  TIN number <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="sale-tin-number"
                  autoComplete="off"
                  maxLength={20}
                  placeholder="Customer TIN"
                  aria-invalid={Boolean(form.formState.errors.tinNumber)}
                  {...form.register("tinNumber")}
                />
                {form.formState.errors.tinNumber && (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.tinNumber.message}
                  </p>
                )}
              </div>

              {/* Pending Advance Alert */}
              {customerId && !isLoadingAdvance && pendingAdvance && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-4 lg:col-span-2">
                  <Info className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      Pending Advance: {formatLKR(pendingAdvance.amount)}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      This advance will be automatically deducted from the final payable amount when the sale is completed.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-xs h-7"
                    onClick={() => {
                      if (advancePaymentId === pendingAdvance.id) {
                        form.setValue("advancePaymentId", "", { shouldDirty: true })
                      } else {
                        form.setValue("advancePaymentId", pendingAdvance.id, { shouldDirty: true })
                      }
                    }}
                  >
                    {advancePaymentId === pendingAdvance.id ? "Remove deduction" : "Apply deduction"}
                  </Button>
                </div>
              )}
              {customerId && isLoadingAdvance && (
                <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-4 py-3 text-xs text-muted-foreground lg:col-span-2">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Checking for pending advance payments...
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Complimentary add-ons</CardTitle>
              <CardDescription>Record the items and free services included with the sale.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="space-y-3">
                <Label>Free items</Label>
                <Controller
                  name="freeItems"
                  control={form.control}
                  render={({ field }) => (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {FREE_SALE_ITEMS.map((item) => {
                        const checked = field.value.includes(item)
                        const id = `sale-addon-${item.toLowerCase().replaceAll(" ", "-")}`
                        return (
                          <div key={item} className="flex items-center gap-2.5">
                            <Checkbox
                              id={id}
                              checked={checked}
                              onCheckedChange={(nextChecked) =>
                                field.onChange(
                                  nextChecked
                                    ? [...field.value, item]
                                    : field.value.filter((selected) => selected !== item),
                                )
                              }
                            />
                            <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
                              {item}
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale-free-services">Free services</Label>
                <Input
                  id="sale-free-services"
                  type="number"
                  min={0}
                  max={20}
                  step={1}
                  {...form.register("freeServices", { valueAsNumber: true })}
                  aria-invalid={Boolean(form.formState.errors.freeServices)}
                />
                <p className="text-xs text-muted-foreground">Complimentary service visits included.</p>
                {form.formState.errors.freeServices && (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.freeServices.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Type Selection (Cash Sale vs Finance Sale) */}
          <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-muted/20">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CircleDollarSign className="size-5" />
                </span>
                <div>
                  <CardTitle>Sale &amp; Payment Type</CardTitle>
                  <CardDescription>Choose whether this is a direct cash sale or a vehicle leasing/finance sale.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    form.setValue("paymentType", "CASH", { shouldDirty: true, shouldValidate: true })
                    form.setValue("paymentMethod", "Cash", { shouldDirty: true })
                  }}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    paymentType === "CASH"
                      ? "border-primary bg-primary/[0.05] shadow-xs ring-1 ring-primary/30"
                      : "border-border/70 bg-card hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                    paymentType === "CASH" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <CircleDollarSign className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">Cash / Direct Sale</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Full vehicle payment via Cash, Card, or direct Bank Transfer.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    form.setValue("paymentType", "FINANCE", { shouldDirty: true, shouldValidate: true })
                    form.setValue("paymentMethod", "Leasing", { shouldDirty: true })
                    if (totalVehiclePrice > 0 && (!downPayment && !financeAmount)) {
                      const initDown = selectedVehicle?.vehicleModel.minDownPayment ?? Math.round(totalVehiclePrice * 0.3)
                      form.setValue("downPayment", initDown, { shouldDirty: true })
                      form.setValue("financeAmount", Math.max(0, totalVehiclePrice - initDown), { shouldDirty: true })
                    }
                  }}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    paymentType === "FINANCE"
                      ? "border-blue-600 bg-blue-500/[0.05] shadow-xs ring-1 ring-blue-500/30"
                      : "border-border/70 bg-card hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                    paymentType === "FINANCE" ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    <Landmark className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">Finance Sale (Leasing)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Vehicle loan covered by a finance institute with upfront down payment.
                    </div>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Finance Sale Breakdown & Institute Details */}
          {paymentType === "FINANCE" && (
            <Card className="rounded-2xl border-blue-500/30 bg-blue-500/[0.02] shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Landmark className="size-5" />
                    </span>
                    <div>
                      <CardTitle>Finance Sale Financial Breakdown</CardTitle>
                      <CardDescription>
                        Set the financing institute, loan amount, and customer down payment.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      isBalanced
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold"
                    }
                  >
                    {isBalanced ? "✓ Breakdown Balanced" : "⚠ Breakdown Imbalance"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Reference Vehicle Price Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl border bg-card text-xs">
                  <div>
                    <span className="text-muted-foreground">Vehicle Total Price: </span>
                    <strong className="text-sm font-bold text-foreground">{formatLKR(totalVehiclePrice)}</strong>
                    {warrantyCharge > 0 && (
                      <span className="text-muted-foreground ml-1">
                        (Includes {formatLKR(warrantyCharge)} warranty)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>
                      Down Payment: <strong className="text-emerald-600 font-semibold">{formatLKR(downPayment)}</strong>
                    </span>
                    <span>+</span>
                    <span>
                      Finance Loan: <strong className="text-blue-600 font-semibold">{formatLKR(financeAmount)}</strong>
                    </span>
                    {!isBalanced && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAutoBalance}
                        className="h-7 text-[11px] font-semibold text-primary border-primary/30 hover:bg-primary/10 ml-2"
                      >
                        Auto Balance
                      </Button>
                    )}
                  </div>
                </div>

                {/* Primary Finance Fields Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* 1. Finance Company */}
                  <div className="space-y-2">
                    <Label htmlFor="sale-finance-company" className="flex items-center gap-1.5 font-semibold text-xs">
                      <Landmark className="size-3.5 text-blue-600" />
                      Finance Company / Institute <span className="text-destructive">*</span>
                    </Label>
                    <Controller
                      name="financeCompanyId"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(value) => {
                            field.onChange(value === "__none__" ? "" : value)
                            const company = financeCompanies.find((c) => c.id === value)
                            const rate = company?.defaultCommissionRate != null ? company.defaultCommissionRate : 1
                            form.setValue("commissionRate", rate, { shouldDirty: true })
                            setIsCommissionOverridden(false)
                            const basis = (form.getValues("commissionBasis") || "FINANCE_AMOUNT") as CommissionBasis
                            const finAmt = form.getValues("financeAmount") || 0
                            let newAmt = 0
                            if (basis === "FINANCE_AMOUNT") {
                              newAmt = Math.round((finAmt * rate) / 100)
                            } else if (basis === "VEHICLE_PRICE") {
                              newAmt = Math.round((totalVehiclePrice * rate) / 100)
                            } else {
                              newAmt = Math.round(rate)
                            }
                            form.setValue("commissionAmount", newAmt, { shouldDirty: true })
                            form.setValue("financeCommission", newAmt, { shouldDirty: true })
                          }}
                        >
                          <SelectTrigger id="sale-finance-company" className="w-full bg-background">
                            <SelectValue placeholder="Select Finance Company" />
                          </SelectTrigger>
                          <SelectContent>
                            {financeCompanies.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                                {company.defaultCommissionRate != null
                                  ? ` (${company.defaultCommissionRate}%)`
                                  : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      E.g. People's Leasing, Commercial Credit, LB Finance, etc.
                    </p>
                  </div>

                  {/* 2. Down Payment */}
                  <div className="space-y-2">
                    <Label htmlFor="sale-down-payment" className="flex items-center gap-1.5 font-semibold text-xs">
                      <CircleDollarSign className="size-3.5 text-emerald-600" />
                      Down Payment (Rs.) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sale-down-payment"
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="Enter cash down payment"
                      value={downPayment || ""}
                      onChange={(e) => handleDownPaymentChange(Number(e.target.value) || 0)}
                      className="bg-background font-semibold"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Cash paid upfront by the customer.
                    </p>
                  </div>

                  {/* 3. Finance Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="sale-finance-amount" className="flex items-center gap-1.5 font-semibold text-xs">
                      <Landmark className="size-3.5 text-blue-600" />
                      Finance Amount (Rs.) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sale-finance-amount"
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="Enter loan amount"
                      value={financeAmount || ""}
                      onChange={(e) => handleFinanceAmountChange(Number(e.target.value) || 0)}
                      className="bg-background font-semibold"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Loan amount covered by finance partner.
                    </p>
                  </div>
                </div>

                {/* Advance payment notice if present */}
                {pendingAdvance && advanceDeduction > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-800 dark:text-emerald-300">
                    <div>
                      Customer Advance Payment of <strong>{formatLKR(advanceDeduction)}</strong> will be applied towards this sale.
                    </div>
                    <div className="font-semibold">
                      Net Cash Required at POS: {formatLKR(Math.max(0, downPayment - advanceDeduction))}
                    </div>
                  </div>
                )}

                {/* Secondary Section: Finance Commission Management (owner/admin only) */}
                {canManageCommission && (
                <div className="rounded-xl border border-blue-500/20 bg-card p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Calculator className="size-4" />
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Finance Commission Management</h4>
                        <p className="text-xs text-muted-foreground">
                          Auto-calculate based on finance amount or vehicle price, or type a manual override.
                        </p>
                      </div>
                    </div>
                    {isCommissionOverridden ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium">
                          Manual Override Active
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleResetCommissionToCalculated}
                          className="h-6 text-[11px] px-2 text-primary hover:bg-primary/10 gap-1"
                        >
                          <RotateCcw className="size-3" />
                          Recalculate
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium">
                        Auto-Calculated
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* 1. Commission Basis */}
                    <div className="space-y-1.5">
                      <Label htmlFor="sale-commission-basis" className="text-xs font-semibold">
                        Commission Basis
                      </Label>
                      <Select
                        value={commissionBasis}
                        onValueChange={(val) => handleBasisChange(val as CommissionBasis)}
                      >
                        <SelectTrigger id="sale-commission-basis" className="w-full bg-background h-9 text-xs">
                          <SelectValue placeholder="Select basis" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FINANCE_AMOUNT">% of Finance Amount</SelectItem>
                          <SelectItem value="VEHICLE_PRICE">% of Vehicle Total</SelectItem>
                          <SelectItem value="FIXED">Fixed Amount (Rs.)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">
                        {commissionBasis === "FINANCE_AMOUNT" && `Based on ${formatLKR(financeAmount)}`}
                        {commissionBasis === "VEHICLE_PRICE" && `Based on ${formatLKR(totalVehiclePrice)}`}
                        {commissionBasis === "FIXED" && "Fixed lump sum value"}
                      </p>
                    </div>

                    {/* 2. Commission Rate */}
                    <div className="space-y-1.5">
                      <Label htmlFor="sale-commission-rate" className="text-xs font-semibold">
                        {commissionBasis === "FIXED" ? "Fixed Base (Rs.)" : "Commission Rate (%)"}
                      </Label>
                      <div className="relative">
                        <Input
                          id="sale-commission-rate"
                          type="number"
                          min={0}
                          step={commissionBasis === "FIXED" ? 500 : 0.1}
                          placeholder={commissionBasis === "FIXED" ? "e.g. 15000" : "e.g. 1.0"}
                          value={commissionRate || ""}
                          onChange={(e) => handleRateChange(Number(e.target.value) || 0)}
                          className="bg-background h-9 text-xs pr-7 font-mono font-medium"
                        />
                        {commissionBasis !== "FIXED" && (
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                            %
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedFinanceCompany?.defaultCommissionRate != null
                          ? `Default for ${selectedFinanceCompany.name}: ${selectedFinanceCompany.defaultCommissionRate}%`
                          : "Default rate: 1.0%"}
                      </p>
                    </div>

                    {/* 3. Final Commission Amount (Editable / Override) */}
                    <div className="space-y-1.5">
                      <Label htmlFor="sale-commission-amount" className="text-xs font-semibold flex items-center justify-between">
                        <span>Commission Amount (Rs.)</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="sale-commission-amount"
                        type="number"
                        min={0}
                        step={100}
                        placeholder="Final commission (Rs.)"
                        value={commissionAmount || ""}
                        onChange={(e) => handleCommissionAmountChange(Number(e.target.value) || 0)}
                        className={`bg-background h-9 text-xs font-semibold font-mono ${
                          isCommissionOverridden ? "border-amber-500/60 ring-1 ring-amber-500/20 text-amber-950 dark:text-amber-100" : "text-foreground"
                        }`}
                      />
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Formula: {formatLKR(calculatedCommission)}</span>
                        {isCommissionOverridden && (
                          <button
                            type="button"
                            onClick={handleResetCommissionToCalculated}
                            className="text-primary hover:underline font-medium"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 4. Commission Recipient */}
                    <div className="space-y-1.5">
                      <Label htmlFor="sale-commission-recipient" className="text-xs font-semibold flex items-center gap-1">
                        <Users className="size-3 text-muted-foreground" />
                        <span>Commission Recipient</span>
                      </Label>
                      <Controller
                        name="commissionRecipientId"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            value={field.value ?? ""}
                            onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                          >
                            <SelectTrigger id="sale-commission-recipient" className="w-full bg-background h-9 text-xs">
                              <SelectValue placeholder="Select Staff / Owner" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Not specified / Dealership</SelectItem>
                              {staff.map((member) => (
                                <SelectItem key={member.id} value={member.id} label={member.name}>
                                  {member.name}
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    ({member.role})
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Staff or owner receiving commission.
                      </p>
                    </div>
                  </div>
                </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Customer-paid charges: RMV (automatic) and optional third-party insurance */}
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>RMV &amp; third-party insurance</CardTitle>
              <CardDescription>
                Added to the bike price. The RMV charge follows the payment type and cannot be edited here.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sale-rmv-charge" className="text-xs font-semibold">
                  RMV charge ({paymentType === "FINANCE" ? "Finance sale" : "Cash sale"})
                </Label>
                <Input id="sale-rmv-charge" readOnly value={formatLKR(rmvCharge)} className="bg-muted/40 font-semibold tabular-nums" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale-third-party-insurance" className="text-xs font-semibold">Third-party insurance</Label>
                <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2">
                  <Checkbox
                    id="sale-third-party-insurance"
                    checked={thirdPartyChecked}
                    onCheckedChange={(checked) =>
                      form.setValue("thirdPartyInsurance", Boolean(checked), { shouldDirty: true })
                    }
                  />
                  <Label htmlFor="sale-third-party-insurance" className="cursor-pointer text-sm font-normal">
                    Add third-party insurance ({formatLKR(saleCharges.thirdPartyInsurance)})
                  </Label>
                </div>
                {thirdPartyChecked && insuranceType !== "NONE" && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    {insuranceType === "FULL_DEALER"
                      ? "Full insurance normally already includes third-party cover."
                      : "The customer is arranging their own insurance."}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Insurance Details */}
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <CardTitle>Insurance <span className="ml-1 text-xs font-normal text-muted-foreground">(Optional)</span></CardTitle>
                  <CardDescription>Record how this vehicle will be insured.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sale-insurance-type" className="text-xs font-semibold">Insurance type</Label>
                <Controller
                  name="insuranceType"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        if (value !== "FULL_DEALER") form.setValue("insuranceCompanyId", "", { shouldDirty: true })
                      }}
                    >
                      <SelectTrigger id="sale-insurance-type" className="w-full bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">No insurance</SelectItem>
                        <SelectItem value="FULL_DEALER">Full insurance (through dealership)</SelectItem>
                        <SelectItem value="CUSTOMER_OWN">Customer&apos;s own insurance (Pitin)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {insuranceType === "FULL_DEALER" && insuranceCompanies.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="sale-insurance-company" className="text-xs font-semibold">Insurance company</Label>
                  <Controller
                    name="insuranceCompanyId"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value || "__none__"}
                        onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                      >
                        <SelectTrigger id="sale-insurance-company" className="w-full bg-background">
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Not specified</SelectItem>
                          {insuranceCompanies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                              {canManageCommission && company.defaultCommissionRate != null
                                ? ` (${company.defaultCommissionRate}%)`
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}

              {canManageCommission && (
                <div className="space-y-1 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-xs sm:col-span-2">
                  <p className="font-semibold text-foreground">
                    Insurance commission: {formatLKR(insuranceCommission)}
                  </p>
                  <p className="text-muted-foreground">
                    {insuranceType === "FULL_DEALER" && paymentType === "FINANCE"
                      ? "No insurance commission on finance sales."
                      : insuranceType === "FULL_DEALER"
                        ? `Fixed ${formatLKR(fullInsuranceCommission)} for full insurance issued through the dealership.`
                        : insuranceType === "CUSTOMER_OWN"
                          ? "No commission when the customer arranges their own insurance."
                          : "No commission without dealership insurance."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-hidden rounded-2xl border-primary/15 shadow-md">
            <CardHeader className="bg-primary/[0.04]">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CircleDollarSign className="size-5" />
                </span>
                <div>
                  <CardTitle>Checkout</CardTitle>
                  <CardDescription>Review the amount due and payment method.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="space-y-3">
                {paymentType === "FINANCE" ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Vehicle Total Price</span>
                      <span className="font-semibold tabular-nums">{formatLKR(totalVehiclePrice)}</span>
                    </div>
                    {warrantyCharge > 0 && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Includes warranty</span>
                        <span className="tabular-nums">+{formatLKR(warrantyCharge)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">RMV charge</span>
                      <span className="font-medium tabular-nums" data-testid="summary-rmv-charge">{formatLKR(rmvCharge)}</span>
                    </div>
                    {thirdPartyAmount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Third-party insurance</span>
                        <span className="font-medium tabular-nums" data-testid="summary-third-party">{formatLKR(thirdPartyAmount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>Grand total</span>
                      <span className="tabular-nums" data-testid="summary-grand-total">{formatLKR(grandTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-blue-600 dark:text-blue-400">
                      <span>Finance Loan ({selectedFinanceCompany?.name || "Leasing"})</span>
                      <span className="font-semibold tabular-nums">− {formatLKR(financeAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Customer Down Payment</span>
                      <span className="font-bold tabular-nums text-foreground">{formatLKR(downPayment)}</span>
                    </div>
                    {advanceDeduction > 0 && (
                      <div className="flex items-center justify-between text-sm text-emerald-600 dark:text-emerald-400">
                        <span>Advance deduction</span>
                        <span className="font-medium tabular-nums">− {formatLKR(advanceDeduction)}</span>
                      </div>
                    )}
                    {selectedInsuranceCompany && (
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">Insurance</span>
                        <span className="max-w-[120px] truncate text-right text-xs font-medium text-purple-600 dark:text-purple-400">
                          {selectedInsuranceCompany.name}
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <span className="text-sm font-bold block text-foreground">Net Cash Due at POS</span>
                        <span className="text-[11px] text-muted-foreground">
                          {advanceDeduction > 0 ? "Down payment after advance" : "Upfront down payment"} + RMV / insurance charges
                        </span>
                      </div>
                      <span className="text-2xl font-black tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatLKR(Math.max(0, downPayment + chargesTotal - advanceDeduction))}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium tabular-nums">{formatLKR(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Advance deduction</span>
                      <span
                        className={`text-right font-medium tabular-nums ${
                          advanceDeduction > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                        }`}
                      >
                        {isLoadingAdvance ? (
                          <LoaderCircle className="ml-auto size-4 animate-spin" />
                        ) : advanceDeduction > 0 ? (
                          `− ${formatLKR(advanceDeduction)}`
                        ) : (
                          formatLKR(0)
                        )}
                      </span>
                    </div>
                    {warrantyCharge > 0 && (
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">Extended warranty</span>
                        <span className="font-medium tabular-nums">
                          {formatLKR(warrantyCharge)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">RMV charge</span>
                      <span className="font-medium tabular-nums" data-testid="summary-rmv-charge">{formatLKR(rmvCharge)}</span>
                    </div>
                    {thirdPartyAmount > 0 && (
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">Third-party insurance</span>
                        <span className="font-medium tabular-nums" data-testid="summary-third-party">{formatLKR(thirdPartyAmount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                      <span>Grand total</span>
                      <span className="tabular-nums" data-testid="summary-grand-total">{formatLKR(grandTotal)}</span>
                    </div>
                    {pendingAdvance && advanceDeduction > 0 && (
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                        Pending customer advance will be applied to this sale.
                      </div>
                    )}
                    {!isLoadingAdvance && customerId && !pendingAdvance && (
                      <p className="text-xs text-muted-foreground">No pending advance found for this customer.</p>
                    )}
                    {selectedFinanceCompany && (
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">Finance</span>
                        <span className="max-w-[120px] truncate text-right text-xs font-medium text-blue-600 dark:text-blue-400">
                          {selectedFinanceCompany.name}
                        </span>
                      </div>
                    )}
                    {selectedInsuranceCompany && (
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">Insurance</span>
                        <span className="max-w-[120px] truncate text-right text-xs font-medium text-blue-600 dark:text-blue-400">
                          {selectedInsuranceCompany.name}
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex items-end justify-between gap-3">
                      <span className="text-sm font-semibold">Final total</span>
                      <span className="text-2xl font-bold tracking-tight tabular-nums">
                        {formatLKR(finalTotal)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale-warranty-option">Warranty options</Label>
                <Controller
                  name="warrantyOption"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          if (saleWarrantyOptions.some((option) => option === value)) {
                            field.onChange(value)
                          }
                        }}
                      >
                        <SelectTrigger
                          id="sale-warranty-option"
                          className="w-full"
                          aria-invalid={Boolean(fieldState.error)}
                          onBlur={field.onBlur}
                        >
                          <SelectValue placeholder="Choose a warranty option" />
                        </SelectTrigger>
                        <SelectContent>
                          {saleWarrantyOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error && (
                        <p role="alert" className="text-xs text-destructive">
                          {fieldState.error.message}
                        </p>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale-payment-method">
                  {paymentType === "FINANCE" ? "Down payment method" : "Payment method"}
                </Label>
                <Controller
                  name="paymentMethod"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          if (salePaymentMethods.some((method) => method === value)) field.onChange(value)
                        }}
                      >
                        <SelectTrigger
                          id="sale-payment-method"
                          className="w-full"
                          aria-invalid={Boolean(fieldState.error)}
                          onBlur={field.onBlur}
                        >
                          <SelectValue placeholder="Choose payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Leasing">Leasing</SelectItem>
                          <SelectItem value="Card">Card</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldState.error && (
                        <p role="alert" className="text-xs text-destructive">
                          {fieldState.error.message}
                        </p>
                      )}
                    </>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full gap-2 text-sm font-semibold"
                disabled={
                  form.formState.isSubmitting ||
                  isLoadingAdvance ||
                  vehicles.length === 0
                }
              >
                {form.formState.isSubmitting ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Processing sale...
                  </>
                ) : (
                  <>
                    Complete Sale
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                Vehicle stock and any selected advance are checked again before checkout.
              </p>
            </CardContent>
          </Card>

          {selectedCustomer && (
            <div className="flex items-start gap-2 rounded-xl border bg-card px-4 py-3 text-xs text-muted-foreground">
              <UserRound className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                Sale customer: <strong className="text-foreground">{selectedCustomer.name}</strong>
              </span>
              {pendingAdvance && <Badge variant="outline" className="ml-auto shrink-0">Advance</Badge>}
            </div>
          )}
        </aside>
      </div>
    </form>
  )
}
